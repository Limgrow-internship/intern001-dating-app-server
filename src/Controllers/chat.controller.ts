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

  @Post('react')
  async reactMessage(
    @Body()
    body: {
      matchId: string;
      messageId?: string;
      clientMessageId?: string;
      reaction?: string;
    },
    @Req() req,
  ) {
    const userId = req.user?.userId;
    const msg = await this.chatService.reactMessage({
      matchId: body.matchId,
      messageId: body.messageId,
      clientMessageId: body.clientMessageId,
      reaction: body.reaction,
    });
    this.chatGateway.emitMessageReaction(body.matchId, msg);
    return msg;
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
      replyToMessageId?: string;
      replyToClientMessageId?: string;
      replyToTimestamp?: string;
      replyPreview?: string;
      replySenderName?: string;
    },
  ) {
    const msg = await this.chatService.sendMessage(messageDto);
    this.chatGateway.emitMessageToRoom(messageDto.matchId, {
      ...msg,
      matchId: messageDto.matchId,
      senderId: messageDto.senderId,
      clientMessageId: messageDto.clientMessageId,
      replyToMessageId: messageDto.replyToMessageId,
      replyToClientMessageId: messageDto.replyToClientMessageId,
      replyToTimestamp: messageDto.replyToTimestamp,
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