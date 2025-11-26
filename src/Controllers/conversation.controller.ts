import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ConversationService } from '../Services/conversation.service';
import { JwtAuthGuard } from 'src/Guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Get('matched-users')
  async listMatchedUsers(@Req() req) {
    console.log('req.user:', req.user);
  console.log('req.query:', req.query);
    const currentUserId = req.user?.userId || req.query.userId;
    return this.conversationService.listMatchedUsers(currentUserId);
  }
}