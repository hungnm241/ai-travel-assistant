import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { TravelOrchestratorService } from './travel-orchestrator.service';
import { ContinueConversationDto } from './dto/continue-conversation.dto';

@Controller('travel')
export class TravelOrchestratorController {
  constructor(
    private readonly travelOrchestratorService: TravelOrchestratorService,
  ) {}

  @Post('conversation')
  async continueConversation(
    @Req() req: any,
    @Body() body: ContinueConversationDto,
  ) {
    const user = (req as any).user;
    const userId = Number(user?.userId || user?.id);

    return this.travelOrchestratorService.handleUserMessage(userId, body);
  }

  @Get('plan')
  async getPlan(@Req() req: any, @Query('conversationId') conversationId: string) {
    const user = (req as any).user;
    const userId = Number(user?.userId || user?.id);

    return this.travelOrchestratorService.getPlan(conversationId, userId);
  }
}

