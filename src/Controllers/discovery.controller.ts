import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  UseGuards,
  Query,
  Param,
  HttpCode,
  HttpException,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../Guards/jwt-auth.guard';
import { DiscoveryService } from '../Services/discovery.service';
import {
  MatchActionRequestDto,
  BlockUserRequestDto,
  UnmatchRequestDto,
} from '../DTO/match-action-request.dto';
import { MatchCardResponseDto } from '../DTO/match-card-response.dto';
import { MatchResultResponseDto } from '../DTO/match-result-response.dto';
import {
  MatchesListResponseDto,
  MatchResponseDto,
  MatchCardsListResponseDto,
} from '../DTO/match-list-response.dto';

@ApiTags('Discovery')
@Controller('discovery')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get('next')
  @ApiOperation({
    summary: 'Get next match card',
    description: 'Get the next recommended profile card for swiping',
  })
  @ApiQuery({
    name: 'latitude',
    required: false,
    type: Number,
    description: 'User current latitude from GPS',
  })
  @ApiQuery({
    name: 'longitude',
    required: false,
    type: Number,
    description: 'User current longitude from GPS',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns next match card',
    type: MatchCardResponseDto,
  })
  @ApiResponse({ status: 204, description: 'No more cards available' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNextMatchCard(
    @Request() req,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
  ): Promise<MatchCardResponseDto> {
    const userId = req.user.userId;

    // Parse location from query params if provided
    let userLocation: { coordinates: number[] } | undefined;
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        // GeoJSON format: [longitude, latitude]
        userLocation = { coordinates: [lng, lat] };
      }
    }

    const card = await this.discoveryService.getNextMatchCard(userId, userLocation);

    if (!card) {
      throw new HttpException('', HttpStatus.NO_CONTENT);
    }

    return card;
  }

  @Get('cards')
  @ApiOperation({
    summary: 'Get batch of match cards',
    description: 'Get multiple match cards at once',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of cards to return (default: 10, max: 20)',
  })
  @ApiQuery({
    name: 'latitude',
    required: false,
    type: Number,
    description: 'User current latitude from GPS',
  })
  @ApiQuery({
    name: 'longitude',
    required: false,
    type: Number,
    description: 'User current longitude from GPS',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns batch of match cards',
    type: MatchCardsListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMatchCards(
    @Request() req,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
  ): Promise<MatchCardsListResponseDto> {
    const userId = req.user.userId;
    const requestedLimit = Math.min(limit || 10, 20); // Max 20 cards

    // Parse location from query params if provided
    let userLocation: { coordinates: number[] } | undefined;
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        // GeoJSON format: [longitude, latitude]
        userLocation = { coordinates: [lng, lat] };
        console.log(`[DiscoveryController] getMatchCards: Received location from query params - lat: ${lat}, lng: ${lng}`);
      } else {
        console.log(`[DiscoveryController] getMatchCards: Invalid location params - latitude: ${latitude}, longitude: ${longitude}`);
      }
    } else {
      console.log(`[DiscoveryController] getMatchCards: No location in query params - latitude: ${latitude}, longitude: ${longitude}`);
    }

    return this.discoveryService.getMatchCards(userId, requestedLimit, userLocation);
  }

  @Post('like')
  @ApiOperation({
    summary: 'Like a user',
    description: 'Swipe right / like a user profile',
  })
  @ApiResponse({
    status: 200,
    description: 'Like recorded, returns match status',
    type: MatchResultResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid target user ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Target user not found' })
  async likeUser(
    @Request() req,
    @Body() body: MatchActionRequestDto,
  ): Promise<MatchResultResponseDto> {
    const userId = req.user.userId;
    return this.discoveryService.likeUser(userId, body.targetUserId);
  }

  @Post('pass')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Pass on a user',
    description: 'Swipe left / pass on a user profile',
  })
  @ApiResponse({ status: 200, description: 'Pass recorded' })
  @ApiResponse({ status: 400, description: 'Invalid target user ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async passUser(
    @Request() req,
    @Body() body: MatchActionRequestDto,
  ): Promise<void> {
    const userId = req.user.userId;
    await this.discoveryService.passUser(userId, body.targetUserId);
  }

  @Post('superlike')
  @ApiOperation({
    summary: 'Super like a user',
    description: 'Send a super like (limited per day)',
  })
  @ApiResponse({
    status: 200,
    description: 'Super like sent, returns match status',
    type: MatchResultResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid target user ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Target user not found' })
  @ApiResponse({
    status: 429,
    description: 'Daily super like limit exceeded',
    schema: {
      example: {
        error: 'daily_limit_exceeded',
        message: "You've used all super likes for today",
        resetAt: '2025-01-19T00:00:00.000Z',
      },
    },
  })
  async superLikeUser(
    @Request() req,
    @Body() body: MatchActionRequestDto,
  ): Promise<MatchResultResponseDto> {
    const userId = req.user.userId;
    return this.discoveryService.superLikeUser(userId, body.targetUserId);
  }

  @Post('block')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Block a user',
    description: 'Block a user (removes existing match if any)',
  })
  @ApiResponse({ status: 200, description: 'User blocked successfully' })
  @ApiResponse({ status: 400, description: 'Invalid target user ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async blockUser(
    @Request() req,
    @Body() body: BlockUserRequestDto,
  ): Promise<void> {
    const userId = req.user.userId;
    await this.discoveryService.blockUser(
      userId,
      body.targetUserId,
      body.reason,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get all matches (paginated)',
    description: 'Get list of all matches with pagination',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20)',
  })
  @ApiQuery({
    name: 'latitude',
    required: false,
    type: Number,
    description: 'User current latitude from GPS',
  })
  @ApiQuery({
    name: 'longitude',
    required: false,
    type: Number,
    description: 'User current longitude from GPS',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated matches',
    type: MatchesListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMatches(
    @Request() req,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
  ): Promise<MatchesListResponseDto> {
    const userId = req.user.userId;

    // Parse location from query params if provided
    let userLocation: { coordinates: number[] } | undefined;
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        // GeoJSON format: [longitude, latitude]
        userLocation = { coordinates: [lng, lat] };
      }
    }

    return this.discoveryService.getMatchesPaginated(
      userId,
      page || 1,
      limit || 20,
      userLocation,
    );
  }

  @Get('match/:matchId')
  @ApiOperation({
    summary: 'Get match by ID',
    description: 'Get details of a specific match',
  })
  @ApiParam({
    name: 'matchId',
    description: 'Match ID',
    example: 'match_789',
  })
  @ApiQuery({
    name: 'latitude',
    required: false,
    type: Number,
    description: 'User current latitude from GPS',
  })
  @ApiQuery({
    name: 'longitude',
    required: false,
    type: Number,
    description: 'User current longitude from GPS',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns match details',
    type: MatchResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Match not found' })
  async getMatchById(
    @Request() req,
    @Param('matchId') matchId: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
  ): Promise<MatchResponseDto> {
    const userId = req.user.userId;

    // Parse location from query params if provided
    let userLocation: { coordinates: number[] } | undefined;
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        // GeoJSON format: [longitude, latitude]
        userLocation = { coordinates: [lng, lat] };
      }
    }

    return this.discoveryService.getMatchById(matchId, userId, userLocation);
  }

  @Post('unmatch')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Unmatch with a user',
    description: 'Remove a match with another user',
  })
  @ApiResponse({ status: 200, description: 'Unmatched successfully' })
  @ApiResponse({ status: 400, description: 'Invalid match ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Match not found' })
  async unmatch(
    @Request() req,
    @Body() body: UnmatchRequestDto,
  ): Promise<void> {
    const userId = req.user.userId;
    await this.discoveryService.unmatchByMatchId(body.matchId, userId);
  }
}
