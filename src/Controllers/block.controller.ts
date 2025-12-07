import { Controller, Post, Body, Request, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../Guards/jwt-auth.guard';
import { BlockService } from '../Services/block.service';

@ApiTags('Block')
@Controller('block')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BlockController {
  constructor(private readonly blockService: BlockService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Block a user (status "blocked" in match)' })
  async blockUser(@Request() req, @Body('targetUserId') targetUserId: string) {
    const userId = req.user.userId;
    await this.blockService.blockUser(userId, targetUserId);
    return { success: true };
  }

  @Post('unblock')
  @ApiOperation({ summary: 'Unblock user (restore match status to "active")' })
  async unblockUser(@Request() req, @Body('targetUserId') targetUserId: string) {
    const userId = req.user.userId;
    await this.blockService.unblockUser(userId, targetUserId);
    return { success: true };
  }
}