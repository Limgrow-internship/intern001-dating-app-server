import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  UseGuards,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../Guards/jwt-auth.guard';
import { MatchService } from '../Services/match.service';
import { MatchActionService } from '../Services/match-action.service';
import { UnmatchDto } from '../DTO/unmatch.dto';
import {
  MatchActionRequestDto,
  BlockUserRequestDto,
} from '../DTO/match-action-request.dto';
import {
  LikeResponseDto,
  SuperLikeResponseDto,
  DislikeResponseDto,
  QuotaResponseDto,
} from '../DTO/match-action-response.dto';

@ApiTags('Matches')
@Controller('matches')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MatchController {
  constructor(
    private readonly matchService: MatchService,
    private readonly matchActionService: MatchActionService,
  ) { }

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
  async getMatchStatus(
    @Request() req,
    @Param('targetUserId') targetUserId: string,
  ) {
    const userId = req.user.userId;
    const status = await this.matchService.getMatchStatus(userId, targetUserId);
    return status;
  }

  @Post('actions/like')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Like a user',
    description:
      'Send a like to another user. If they already liked you, a match will be created.',
  })
  @ApiResponse({
    status: 200,
    description: 'Like recorded successfully',
    type: LikeResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request (self-like, already liked, etc.)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'User blocked' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 429, description: 'Out of likes quota' })
  async like(
    @Request() req,
    @Body() body: MatchActionRequestDto,
  ): Promise<LikeResponseDto> {
    const userId = req.user.userId;
    return this.matchActionService.handleLike(userId, body.targetUserId);
  }

  @Post('actions/superlike')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'SuperLike a user',
    description:
      'Send a SuperLike to another user. They will be notified immediately. If they already liked you, a match will be created.',
  })
  @ApiResponse({
    status: 200,
    description: 'SuperLike sent successfully',
    type: SuperLikeResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Feature not available for tier or user blocked' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 429, description: 'Out of SuperLikes quota' })
  async superlike(
    @Request() req,
    @Body() body: MatchActionRequestDto,
  ): Promise<SuperLikeResponseDto> {
    const userId = req.user.userId;
    return this.matchActionService.handleSuperLike(userId, body.targetUserId);
  }

  @Post('actions/dislike')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Dislike/Pass a user',
    description: 'Pass on a user. They will not be shown in your recommendations again.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dislike recorded successfully',
    type: DislikeResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async dislike(
    @Request() req,
    @Body() body: MatchActionRequestDto,
  ): Promise<DislikeResponseDto> {
    const userId = req.user.userId;
    return this.matchActionService.handleDislike(userId, body.targetUserId);
  }

  @Get('quota')
  @ApiOperation({
    summary: 'Get daily action quota',
    description: 'Get remaining likes, SuperLikes, and rewinds for today',
  })
  @ApiResponse({
    status: 200,
    description: 'Quota information',
    type: QuotaResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getQuota(@Request() req): Promise<QuotaResponseDto> {
    const userId = req.user.userId;
    return this.matchActionService.getQuota(userId);
  }

  @Post('block')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Block a user',
    description: 'Block another user. If matched, the match will be marked as blocked.',
  })
  @ApiResponse({
    status: 200,
    description: 'User blocked successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async blockUser(@Request() req, @Body() body: BlockUserRequestDto) {
    const userId = req.user.userId;
    return this.matchService.blockUser(userId, body.targetUserId, body.reason);
  }
}
