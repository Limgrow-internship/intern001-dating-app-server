import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  UseGuards,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../Guards/jwt-auth.guard';
import { MatchService } from '../Services/match.service';
import { UnmatchDto } from '../DTO/unmatch.dto';

@ApiTags('Matches')
@Controller('matches')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all matches',
    description: 'Get all your active matches with profile information',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns all matches',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMatches(@Request() req) {
    const userId = req.user.userId;
    const matches = await this.matchService.getMatches(userId);
    return { matches };
  }

  @Post('unmatch')
  @ApiOperation({
    summary: 'Unmatch with a user',
    description: 'Remove a match with another user',
  })
  @ApiResponse({
    status: 201,
    description: 'Unmatched successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Match not found' })
  async unmatch(@Request() req, @Body() unmatchDto: UnmatchDto) {
    const userId = req.user.userId;
    const result = await this.matchService.unmatch(
      userId,
      unmatchDto.targetUserId,
    );
    return result;
  }

  @Get('status/:targetUserId')
  @ApiOperation({
    summary: 'Get match status with a user',
    description: 'Check if you are matched with a user and see like status',
  })
  @ApiParam({
    name: 'targetUserId',
    description: 'ID of the target user',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns match status',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMatchStatus(@Request() req, @Param('targetUserId') targetUserId: string) {
    const userId = req.user.userId;
    const status = await this.matchService.getMatchStatus(userId, targetUserId);
    return status;
  }
}
