import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { DestinationValidationResult, IntentAnalysisResult, TravelPlan } from '../interfaces/travel-plan.interface';

@Injectable()
export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly apiUrl: string;
  private readonly osmSearchUrl = 'https://nominatim.openstreetmap.org/search';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') ?? '';
    this.model =
    this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash';
    this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;

    if (!this.apiKey) {
      this.logger.warn('GEMINI_API_KEY is not set. AI features will fail.');
    }
  }

  async analyzeIntent(
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
  ): Promise<IntentAnalysisResult> {
    const systemInstruction = `
Bạn là AI Travel Orchestrator, làm nhiệm vụ phân tích ý định du lịch của người dùng.
Nhiệm vụ của bạn:
- Đọc toàn bộ lịch sử hội thoại (user và assistant).
- ƯU TIÊN tin nhắn mới nhất của User: Nếu User muốn thay đổi địa điểm hoặc nhắc tới địa điểm mới, bạn PHẢI cập nhật lại field destination/country và reset các field khác nếu chúng không còn phù hợp.
- Quyết định đã đủ thông tin để tạo lịch trình du lịch hay chưa.
- Nếu User đã nêu địa điểm tỉnh hoặc thành phố bạn PHẢI điền nó vào field destination.
- Nếu User có nhắc tới quốc gia (ví dụ: "ở Nhật", "ở Việt Nam", "in France") bạn PHẢI điền nó vào field country (tiếng Việt hoặc tiếng Anh đều được, ưu tiên tiếng Việt nếu có).
- Nếu THIẾU thông tin (bao gồm cả thiếu preferences): trả về needsMoreInfo = true và gợi ý CÂU HỎI duy nhất, rõ ràng để hỏi tiếp.
- Nếu ĐỦ thông tin: trả về readyForPlan = true và normalizedIntent với các field đã chuẩn hóa (destination, days, budget, preferences...).

YÊU CẦU BẮT BUỘC:
- Trả về DUY NHẤT một JSON hợp lệ với dạng:
{
  "needsMoreInfo": boolean,
  "missingFields": string[] | null,
  "followupQuestion": string | null,
  "readyForPlan": boolean,
  "normalizedIntent": object | null
}
- Không thêm giải thích, không thêm text bên ngoài JSON.
`;

    const userContent = messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');

    const prompt = `${systemInstruction}\n\n---\nHỘI THOẠI:\n${userContent}\n\nTRẢ VỀ JSON:`;

    const raw = await this.callGemini(prompt, true);

    let parsed: any;
    try {
      parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
      this.logger.error('Failed to parse intent JSON from Gemini', e as Error);
      throw new InternalServerErrorException('LLM intent analysis failed');
    }

    const result: IntentAnalysisResult = {
      needsMoreInfo: Boolean(parsed.needsMoreInfo),
      missingFields: parsed.missingFields ?? undefined,
      followupQuestion: parsed.followupQuestion ?? undefined,
      readyForPlan: Boolean(parsed.readyForPlan),
      normalizedIntent: parsed.normalizedIntent ?? undefined,
    };

    return result;
  }

  async generatePlan(
    context: Record<string, any>,
  ): Promise<TravelPlan> {
    const systemInstruction = `
Bạn là AI Travel Planner.
Bạn phải tạo một kế hoạch du lịch chi tiết dựa trên ý định đã được chuẩn hóa của người dùng.

YÊU CẦU BẮT BUỘC:
- Trả về DUY NHẤT một JSON hợp lệ, KHÔNG markdown, KHÔNG giải thích.
- JSON phải match đúng interface TravelPlan:
 - JSON phải match đúng interface TravelPlan (đã có thêm field country):
{
  "trip": {
    "destination": string,
    "country"?: string,
    "days": number,
    "budget"?: { "currency": string, "total": number },
    "preferences"?: { "food"?: string[], "activities"?: string[] }
  },
  "itinerary": [
    {
      "day": number,
      "title": string,
      "morning"?: { "activities": Activity[] },
      "afternoon"?: { "activities": Activity[] },
      "evening"?: { "activities": Activity[] },
      "hotel"?: {
        "name": string,
        "address"?: string,
        "price_per_night"?: number
      },
      "meals"?: [
        {
          "name": string,
          "address"?: string,
          "type"?: string
        }
      ]
    }
  ]
}

Trong đó Activity:
{
  "name": string,
  "location"?: string,
  "type"?: string,
  "estimated_cost"?: number
}

- Các địa điểm nên là có thật (hoặc rất gần với địa điểm có thật) để có thể kiểm tra bằng Google Maps sau này.
`;

    const intentSummary = JSON.stringify(context, null, 2);
    const prompt = `${systemInstruction}\n\nĐÂY LÀ Ý ĐỊNH ĐÃ CHUẨN HÓA CỦA NGƯỜI DÙNG:\n${intentSummary}\n\nTRẢ VỀ JSON TravelPlan:`;

    const raw = await this.callGemini(prompt, true);

    let parsed: any;
    try {
      parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
      this.logger.error('Failed to parse plan JSON from Gemini', e as Error);
      throw new InternalServerErrorException('LLM plan generation failed');
    }

    return parsed as TravelPlan;
  }

  private async callGemini(
    prompt: string,
    expectJson: boolean,
  ): Promise<string> {
    if (!this.apiKey) {
      throw new InternalServerErrorException('GEMINI_API_KEY is not configured');
    }

    try {
      const body: any = {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      };

      // response_mime_type JSON mode (nếu được hỗ trợ)
      if (expectJson) {
        body.generationConfig = {
          response_mime_type: 'application/json',
        };
      }

      const response$ = this.httpService.post(this.apiUrl, body, {
        params: {
          key: this.apiKey,
        },
      });

      const response = await firstValueFrom(response$);
      const candidates = response.data?.candidates;
      const text =
        candidates?.[0]?.content?.parts?.[0]?.text ??
        candidates?.[0]?.output_text ??
        '';

      if (!text) {
        this.logger.error(
          'Empty response from Gemini',
          JSON.stringify(response.data),
        );
        throw new InternalServerErrorException('Empty response from LLM');
      }

      return text.trim();
    } catch (error: any) {
      this.logger.error(
        `Error calling Gemini: ${error?.message}`,
        error?.response?.data ?? error,
      );
      throw new InternalServerErrorException('Failed to call LLM provider');
    }
  }

  private async checkDestinationWithOsm(
    destination: string,
    country: string,
  ): Promise<{ isValid: boolean; normalizedName?: string | null }> {
    const q = `${destination}, ${country}`;

    try {
      const response$ = this.httpService.get(this.osmSearchUrl, {
        params: {
          q,
          format: 'json',
          addressdetails: 1,
          limit: 5,
          'accept-language': 'vi',
        },
        headers: {
          'User-Agent': 'TravelOrchestrator/1.0 (contact@ai-assistant.com)',
        },
      });

      const response = await firstValueFrom(response$);
      const results: any[] = Array.isArray(response.data)
        ? response.data
        : [];

      if (!results.length) {
        return { isValid: false, normalizedName: null };
      }

      const countryLower = country.toLowerCase();      
      const matched = results.find((r) => {
        const address = r.address ?? {};
        const countryName = String(address.country ?? '').toLowerCase();

        const isCorrectCountry = countryName.includes(countryLower) || countryLower.includes(countryName);
        const validTypes = ['city', 'town', 'village', 'administrative', 'state', 'region'];
        const isValidType = validTypes.includes(r.addresstype) || validTypes.includes(r.type);
        
        return isCorrectCountry && isValidType;
      });

      if (!matched) {
        return { isValid: false, normalizedName: null };
      }

      const name =
        matched.name ??
        matched.display_name ??
        destination;

      return {
        isValid: true,
        normalizedName: String(name),
      };
    } catch (error: any) {
      this.logger.error(
        `Error calling OpenStreetMap Nominatim: ${error?.message}`,
        error?.response?.data ?? error,
      );

      return {
        isValid: true,
        normalizedName: destination,
      };
    }
  }

  private async suggestDestinationWithAi(
    destination: string,
    country: string,
  ): Promise<Omit<DestinationValidationResult, 'isValid'>> {
    const systemInstruction = `
Bạn là trợ lý gợi ý địa điểm du lịch.

NHIỆM VỤ:
- Người dùng muốn đi tới một địa điểm (thành phố/tỉnh) trong một quốc gia nhưng có thể gõ sai hoặc địa điểm không tồn tại.
- Hãy:
  1. Gợi ý một địa điểm thực tế, hợp lý, phổ biến trong quốc gia đó (ví dụ: thủ đô hoặc thành phố du lịch nổi tiếng) dựa trên tên người dùng nhập.
  2. Viết một câu tiếng Việt hỏi lại người dùng, ví dụ:
     "Ở ${country} mình không tìm thấy địa điểm tên X. Bạn muốn đi Y hay nhập lại địa điểm khác?"

YÊU CẦU:
- Chỉ trả về DUY NHẤT một JSON hợp lệ, KHÔNG giải thích thêm, KHÔNG markdown.
- JSON phải có dạng:
{
  "correctedDestination": string | null,
  "messageForUser": string
}
`;

    const prompt = `${systemInstruction}

ĐỊA ĐIỂM NGƯỜI DÙNG NHẬP (destination): "${destination}"
QUỐC GIA (country): "${country}"

TRẢ VỀ JSON:`;

    const raw = await this.callGemini(prompt, true);

    let parsed: any;
    try {
      parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
      this.logger.error(
        'Failed to parse destination suggestion JSON from Gemini',
        e as Error,
      );

      return {
        correctedDestination: null,
        messageForUser: `Mình chưa chắc "${destination}" có thuộc ${country} hay không. Bạn có thể nhập lại thành phố/tỉnh và quốc gia bạn muốn đi được không?`,
      };
    }

    return {
      correctedDestination:
        parsed.correctedDestination !== undefined
          ? parsed.correctedDestination
          : null,
      messageForUser: String(
        parsed.messageForUser ??
          `Mình chưa chắc "${destination}" có thuộc ${country} hay không. Bạn có thể nhập lại thành phố/tỉnh và quốc gia bạn muốn đi được không?`,
      ),
    };
  }

  async validateDestinationCountry(
    destination: string | string[],
    country: string,
  ): Promise<DestinationValidationResult> {
    const rawCountry = (country || '').trim();

    const destinations = Array.isArray(destination)
      ? destination
          .map((d) => (d ?? '').toString().trim())
          .filter((d) => d.length > 0)
      : [(destination || '').trim()];

    const rawDestination = destinations[0] ?? '';

    if (!destinations.length || !rawCountry) {
      return {
        isValid: false,
        correctedDestination: null,
        messageForUser:
          'Mình chưa rõ địa điểm và quốc gia bạn muốn đi. Bạn có thể cho mình biết rõ thành phố/tỉnh và quốc gia được không?',
      };
    }

    if (destinations.length > 1) {
      const validResults: { original: string; name: string }[] = [];

      for (const d of destinations) {
        const osm = await this.checkDestinationWithOsm(d, rawCountry);
        if (osm.isValid) {
          validResults.push({
            original: d,
            name: osm.normalizedName ?? d,
          });
        }
      }

      if (validResults.length === destination.length) {
        const primary = validResults[0];
        const others = validResults.slice(1).map((r) => r.name);
        const othersText =
          others.length > 0 ? ` (các địa điểm khác: ${others.join(', ')})` : '';

        return {
          isValid: true,
          correctedDestination: primary.name,
          messageForUser: `Mình tìm thấy nhiều địa điểm hợp lệ trong ${rawCountry}: ${validResults
            .map((r) => r.name)
            .join(
              ', ',
            )}. Hiện tại mình sẽ lập kế hoạch chính cho ${primary.name}${othersText}. Nếu bạn muốn một hành trình nhiều thành phố, hãy nói rõ thêm nhé.`,
        };
      }

      const suggestions: Array<{
        original: string;
      } & Omit<DestinationValidationResult, 'isValid'>> = [];
      for (const d of destinations) {
        const s = await this.suggestDestinationWithAi(d, rawCountry);
        suggestions.push({ original: d, ...s });
      }

      const primarySuggestion = suggestions[0];
      const hasRealSuggestion = suggestions.some(
        (s) =>
          s.correctedDestination &&
          s.correctedDestination !== s.original,
      );
      const mappingText = suggestions
        .map((s) =>
          s.correctedDestination && s.correctedDestination !== s.original
            ? `${s.original} → ${s.correctedDestination}`
            : s.original,
        )
        .join(', ');

      const message =
        `Mình chưa tìm thấy các địa điểm sau trong ${rawCountry}: ${destinations.join(
          ', ',
        )}. ` +
        (hasRealSuggestion
          ? `Gợi ý: ${mappingText}. Bạn muốn chọn ${
              primarySuggestion.correctedDestination ??
              primarySuggestion.original
            } hay nhập lại địa điểm khác?`
          : 'Bạn có thể chọn một thành phố cụ thể hoặc nhập lại địa điểm rõ ràng hơn không?');

      return {
        isValid: false,
        correctedDestination: hasRealSuggestion
          ? primarySuggestion.correctedDestination ?? null
          : null,
        messageForUser: message,
      };
    }

    const osmResult = await this.checkDestinationWithOsm(
      rawDestination,
      rawCountry,
    );

    if (osmResult.isValid) {
      const finalName = osmResult.normalizedName ?? rawDestination;
      return {
        isValid: true,
        correctedDestination: finalName,
        messageForUser: `Mình sẽ lập kế hoạch cho chuyến đi đến ${finalName}, ${rawCountry}.`,
      };
    }

    const suggestion = await this.suggestDestinationWithAi(
      rawDestination,
      rawCountry,
    );

    return {
      isValid: false,
      correctedDestination: suggestion.correctedDestination,
      messageForUser: suggestion.messageForUser,
    };
  }
}

