import {
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../Guards/jwt-auth.guard';
import { AIRouterService } from '../Services/ai-router.service';
import { AIFeaturesService } from '../Services/ai-features.service';

@ApiTags('AI Features')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AIController {
  constructor(
    private readonly aiRouter: AIRouterService,
    private readonly aiFeatures: AIFeaturesService,
  ) {}

  @Get('health')
  @ApiOperation({
    summary: 'Check AI providers health',
    description: 'Check availability and latency of all AI providers',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns health status of all AI providers',
  })
  async healthCheck() {
    const status = await this.aiRouter.healthCheck();
    return { status };
  }

  @Post('conversation-starter/:matchedUserId')
  @ApiOperation({
    summary: 'Generate conversation starter',
    description: 'AI generates a personalized conversation starter for a match',
  })
  @ApiParam({
    name: 'matchedUserId',
    description: 'ID of the matched user',
  })
  @ApiResponse({
    status: 201,
    description: 'Returns AI-generated conversation starter',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async generateConversationStarter(
    @Request() req,
    @Param('matchedUserId') matchedUserId: string,
  ) {
    const userId = req.user.userId;
    const result = await this.aiFeatures.generateConversationStarter(
      userId,
      matchedUserId,
    );
    return result;
  }

  @Get('profile-tips')
  @ApiOperation({
    summary: 'Get AI profile improvement tips',
    description: 'AI analyzes your profile and suggests improvements',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns AI-generated profile tips',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfileTips(@Request() req) {
    const userId = req.user.userId;
    const result = await this.aiFeatures.generateProfileTips(userId);
    return result;
  }

  @Get('compatibility-insight/:matchedUserId')
  @ApiOperation({
    summary: 'Get compatibility explanation',
    description: 'AI explains why you matched with someone',
  })
  @ApiParam({
    name: 'matchedUserId',
    description: 'ID of the matched user',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns AI-generated compatibility insight',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCompatibilityInsight(
    @Request() req,
    @Param('matchedUserId') matchedUserId: string,
  ) {
    const userId = req.user.userId;
    const result = await this.aiFeatures.generateCompatibilityInsight(
      userId,
      matchedUserId,
    );
    return result;
  }

  @Post('enhance-bio')
  @ApiOperation({
    summary: 'Enhance bio with AI',
    description: 'AI rewrites your bio to be more engaging',
  })
  @ApiResponse({
    status: 201,
    description: 'Returns enhanced bio',
  })
  @ApiResponse({ status: 400, description: 'No bio to enhance' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async enhanceBio(@Request() req) {
    const userId = req.user.userId;
    const result = await this.aiFeatures.enhanceBio(userId);
    return result;
  }

  @Get('date-ideas/:matchedUserId')
  @ApiOperation({
    summary: 'Get AI-generated date ideas',
    description: 'AI suggests date ideas based on common interests',
  })
  @ApiParam({
    name: 'matchedUserId',
    description: 'ID of the matched user',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns AI-generated date ideas',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDateIdeas(
    @Request() req,
    @Param('matchedUserId') matchedUserId: string,
  ) {
    const userId = req.user.userId;
    const result = await this.aiFeatures.generateDateIdeas(
      userId,
      matchedUserId,
    );
    return result;
  }
}
