import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ChatService } from 'src/Services/chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('history/:matchId')
  async getHistory(@Param('matchId') matchId: string) {
    return await this.chatService.getMessages(matchId);
  }

  @Post('send')
  async sendMessage(@Body() messageDto: { message: string; matchId: string; senderId: string }) {

    return await this.chatService.sendMessage(messageDto);
  }

  @Get('rooms/:matchId/last-message')
  async getLastMessage(@Param('matchId') matchId: string) {
  return this.chatService.getLastMessageBymatchId(matchId);
}
}