import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ContinueConversationDto } from './dto/continue-conversation.dto';
import { AiProviderService } from './ai/ai-provider.service';
import { TravelPlan } from './interfaces/travel-plan.interface';
import { CONVERSATION_STATUS, MESSAGE_ROLE, MESSAGE_TYPE } from 'src/common/constants/common.constant';

@Injectable()
export class TravelOrchestratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProvider: AiProviderService,
  ) {}

  async handleUserMessage(userId: number, dto: ContinueConversationDto) {
    let conv =
      dto.conversationId != null
        ? await this.prisma.conversation.findFirst({
            where: {
              id: BigInt(dto.conversationId),
              userId: BigInt(userId),
            },
          })
        : null;

    if (!conv) {
      conv = await this.prisma.conversation.create({
        data: {
          userId: BigInt(userId),
          status: CONVERSATION_STATUS.COLLECTING_INFO,
        },
      });
    }

    const conversationId = conv.id;

    await this.prisma.message.create({
      data: {
        conversationId,
        role: MESSAGE_ROLE.USER,
        type: MESSAGE_TYPE.NORMAL,
        content: dto.message,
      },
    });

    const recentMessages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });

    const llmMessages = recentMessages.map((m) => ({
      role: m.role.toLowerCase() as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    const intent = await this.aiProvider.analyzeIntent(llmMessages);

    const normalizedIntent = intent.normalizedIntent ?? {};
    if (normalizedIntent.destination && normalizedIntent.country) {
      const validation = await this.aiProvider.validateDestinationCountry(
        normalizedIntent.destination,
        normalizedIntent.country,
      );

      if (!validation.isValid) {
        const missingFields = [...(intent.missingFields ?? []), 'destination'];

        const assistantMessage = await this.prisma.message.create({
          data: {
            conversationId,
            role: MESSAGE_ROLE.ASSISTANT,
            type: MESSAGE_TYPE.FOLLOWUP_QUESTION,
            content: validation.messageForUser,
            metadata: {
              missingFields,
              invalidDestination: normalizedIntent.destination,
              suggestedDestination: validation.correctedDestination ?? null,
              country: normalizedIntent.country,
            },
          },
        });

        return {
          status: CONVERSATION_STATUS.ASKING_MORE_INFO,
          conversationId: conversationId.toString(),
          question: assistantMessage.content,
          missingFields,
          invalidDestination: normalizedIntent.destination,
          suggestedDestination: validation.correctedDestination ?? null,
        };
      }

      if (validation.correctedDestination) {
        normalizedIntent.destination = validation.correctedDestination;
        intent.normalizedIntent = normalizedIntent;
      }
    }

    if (intent.needsMoreInfo && intent.followupQuestion) {
      const assistantMessage = await this.prisma.message.create({
        data: {
          conversationId,
          role: MESSAGE_ROLE.ASSISTANT,
          type: MESSAGE_TYPE.FOLLOWUP_QUESTION,
          content: intent.followupQuestion,
          metadata: {
            missingFields: intent.missingFields ?? [],
          },
        },
      });

      return {
        status: CONVERSATION_STATUS.ASKING_MORE_INFO,
        conversationId: conversationId.toString(),
        question: assistantMessage.content,
        missingFields: intent.missingFields ?? [],
      };
    }

    if (!intent.readyForPlan) {
      return {
        status: CONVERSATION_STATUS.PENDING,
        conversationId: conversationId.toString(),
      };
    }

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: CONVERSATION_STATUS.PLANNING },
    });

    const plan = await this.generatePlanForConversation(
      conversationId,
      intent.normalizedIntent ?? {},
    );

    return {
      status: CONVERSATION_STATUS.PLAN_READY,
      conversationId: conversationId.toString(),
      plan,
    };
  }

  private async generatePlanForConversation(
    conversationId: bigint,
    context: Record<string, any>,
  ): Promise<TravelPlan> {
    const plan = await this.aiProvider.generatePlan(context);

    const savedPlan = await this.prisma.plan.create({
      data: {
        conversationId,
        planJson: plan as any,
        isFinal: true,
      },
    });

    await this.prisma.message.create({
      data: {
        conversationId,
        role: MESSAGE_ROLE.ASSISTANT,
        type: MESSAGE_TYPE.PLAN_SUMMARY,
        content: `Đã tạo lịch trình du lịch cho điểm đến ${plan.trip.destination} trong ${plan.trip.days} ngày.`,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: CONVERSATION_STATUS.COMPLETED },
    });

    return savedPlan.planJson as unknown as TravelPlan;
  }

  async getPlan(conversationId: string, userId: number): Promise<TravelPlan> {
    const conv = await this.prisma.conversation.findFirst({
      where: {
        id: BigInt(conversationId),
        userId: BigInt(userId),
      },
    });

    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }

    const plan = await this.prisma.plan.findFirst({
      where: {
        conversationId: conv.id,
        isFinal: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found for this conversation');
    }

    return plan.planJson as unknown as TravelPlan;
  }
}

