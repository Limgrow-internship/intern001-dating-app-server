import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../Guards/jwt-auth.guard';
import { RecommendationService } from '../Services/recommendation.service';
import { MatchService } from '../Services/match.service';
import { SwipeDto } from '../DTO/swipe.dto';

@ApiTags('Recommendations')
@Controller('recommendations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RecommendationController {
  constructor(
    private readonly recommendationService: RecommendationService,
    private readonly matchService: MatchService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get personalized recommendations',
    description: 'Get AI-powered dating recommendations based on hybrid scoring algorithm',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of recommendations to return (default: 10)',
  })
  @ApiQuery({
    name: 'showBreakdown',
    required: false,
    type: Boolean,
    description: 'Include score breakdown in response (default: false)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns personalized recommendations',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRecommendations(
    @Request() req,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('showBreakdown') showBreakdown?: string,
  ) {
    const userId = req.user.userId;
    const recommendations = await this.recommendationService.getRecommendations(
      userId,
      limit || 10,
    );

    // Remove breakdown if not requested
    const includeBreakdown = showBreakdown === 'true';
    if (!includeBreakdown) {
      return recommendations.map(({ profile, score }) => ({
        profile,
        score,
      }));
    }

    return recommendations;
  }

  @Post('swipe')
  @ApiOperation({
    summary: 'Swipe on a profile',
    description: 'Like or pass on a profile. Creates a match if both users have liked each other.',
  })
  @ApiResponse({
    status: 201,
    description: 'Swipe recorded successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request (already swiped or invalid action)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Target profile not found' })
  async swipe(@Request() req, @Body() swipeDto: SwipeDto) {
    const userId = req.user.userId;
    const result = await this.matchService.handleSwipe(
      userId,
      swipeDto.targetUserId,
      swipeDto.action,
      swipeDto.score,
    );

    return {
      success: true,
      action: swipeDto.action,
      matched: result.matched,
      match: result.match || null,
    };
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get swipe history',
    description: 'Get your recent swipe history',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of swipes to return (default: 50)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns swipe history',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSwipeHistory(
    @Request() req,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const userId = req.user.userId;
    const history = await this.matchService.getSwipeHistory(userId, limit || 50);
    return { history };
  }
}
