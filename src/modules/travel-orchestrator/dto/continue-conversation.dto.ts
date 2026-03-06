import { IsNumber, IsOptional, IsString } from 'class-validator';

export class ContinueConversationDto {
  @IsOptional()
  @IsNumber()
  conversationId?: string;

  @IsString()
  message: string;
}