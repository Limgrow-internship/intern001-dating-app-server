import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ChatService } from 'src/Services/chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('history/:roomId')
  async getHistory(@Param('roomId') roomId: string) {
    return await this.chatService.getMessages(roomId);
  }

  @Post('send')
  async sendMessage(@Body() messageDto: { message: string; roomId: string; senderId: string }) {

    return await this.chatService.sendMessage(messageDto);
  }

  @Get('rooms/:roomId/last-message')
  async getLastMessage(@Param('roomId') roomId: string) {
  return this.chatService.getLastMessageByRoomId(roomId);
}
}