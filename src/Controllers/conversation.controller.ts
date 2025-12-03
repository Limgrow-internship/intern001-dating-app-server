import { Controller, Delete, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ConversationService } from '../Services/conversation.service';
import { JwtAuthGuard } from 'src/Guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Get('matched-users')
  async listMatchedUsers(@Req() req) {
    const currentUserId = req.user?.userId || req.query.userId;
    return this.conversationService.listMatchedUsers(currentUserId);
  }

  @Delete(':matchId')
  async deleteConversation(@Param('matchId') matchId: string, @Req() req) {
    const currentUserId = req.user?.userId || req.body.userId;
    return this.conversationService.deleteForUser(matchId, currentUserId);
  }
}