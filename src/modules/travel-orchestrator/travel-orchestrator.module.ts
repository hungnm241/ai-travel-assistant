import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TravelOrchestratorController } from './travel-orchestrator.controller';
import { TravelOrchestratorService } from './travel-orchestrator.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AiProviderService } from './ai/ai-provider.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  controllers: [TravelOrchestratorController],
  providers: [TravelOrchestratorService, PrismaService, AiProviderService],
  exports: [TravelOrchestratorService],
})
export class TravelOrchestratorModule {}