import { Controller, Get, Post, Body, Param, Inject, forwardRef, Delete, Req, UseGuards } from '@nestjs/common';
import { ChatGateway } from 'src/gateways/chat.gateway';
import { JwtAuthGuard } from 'src/Guards/jwt-auth.guard';
import { ChatService } from 'src/Services/chat.service';

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('history/:matchId')
async getHistory(@Param('matchId') matchId: string, @Req() req) {
  const userId = req.user?.userId;
  return await this.chatService.getMessages(matchId, userId);
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
async getLastMessage(@Param('matchId') matchId: string, @Req() req) {
  const userId = req.user?.userId;
  return await this.chatService.getLastMessageBymatchId(matchId, userId);
}

  @Delete(':matchId/clear')
  async clearMessages(@Param('matchId') matchId: string, @Req() req) {
    const userId = req.user.userId;
    return this.chatService.clearMessagesForUser(matchId, userId);
  }
}