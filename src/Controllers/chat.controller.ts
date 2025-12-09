import { Controller, Get, Post, Body, Param, Inject, forwardRef } from '@nestjs/common';
import { ChatGateway } from 'src/gateways/chat.gateway';
import { ChatService } from 'src/Services/chat.service';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('history/:matchId')
  async getHistory(@Param('matchId') matchId: string) {
    return await this.chatService.getMessages(matchId);
  }

  @Post('send')
  async sendMessage(
    @Body()
    messageDto: {
      message?: string;
      matchId: string;
      senderId: string;
      imgChat: string;
      audioPath?: string;
      duration?: number;
      clientMessageId?: string;
    },
  ) {
    const msg = await this.chatService.sendMessage(messageDto);
    this.chatGateway.emitMessageToRoom(messageDto.matchId, {
      ...msg,
      matchId: messageDto.matchId,
      senderId: messageDto.senderId,
      clientMessageId: messageDto.clientMessageId,
    });
    return msg;
  }

  @Get('rooms/:matchId/last-message')
  async getLastMessage(@Param('matchId') matchId: string) {
    return this.chatService.getLastMessageBymatchId(matchId);
  }
}