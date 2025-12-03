import {
  Controller,
  Get,
  Put,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../Guards/jwt-auth.guard';
import { PreferenceService } from '../Services/preference.service';
import { UpdatePreferenceDto } from '../DTO/update-preference.dto';
import {
  RecommendationCriteriaResponseDto,
  RecommendationCriteriaRequestDto,
} from '../DTO/recommendation-criteria.dto';

@ApiTags('Preferences')
@Controller('preferences')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PreferenceController {
  constructor(private readonly preferenceService: PreferenceService) {}

  @Get()
  @ApiOperation({
    summary: 'Get your preferences',
    description: 'Get your dating/matching preferences',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns user preferences',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPreferences(@Request() req) {
    const userId = req.user.userId;
    const preferences = await this.preferenceService.getPreferences(userId);
    return { preferences };
  }

  @Put()
  @ApiOperation({
    summary: 'Update your preferences',
    description: 'Update your dating/matching preferences',
  })
  @ApiResponse({
    status: 200,
    description: 'Preferences updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request (invalid preference values)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updatePreferences(
    @Request() req,
    @Body() updatePreferenceDto: UpdatePreferenceDto,
  ) {
    const userId = req.user.userId;
    const preferences = await this.preferenceService.updatePreferences(
      userId,
      updatePreferenceDto,
    );
    return {
      success: true,
      preferences,
    };
  }

  // ===== Android-compatible endpoints =====

  @Get('criteria')
  @ApiOperation({
    summary: 'Get recommendation criteria (Android)',
    description: "Get user's recommendation filter preferences in Android-compatible format",
  })
  @ApiResponse({
    status: 200,
    description: 'Returns recommendation criteria',
    type: RecommendationCriteriaResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRecommendationCriteria(
    @Request() req,
  ): Promise<RecommendationCriteriaResponseDto> {
    const userId = req.user.userId;
    return this.preferenceService.getCriteriaForAndroid(userId);
  }

  @Put('criteria')
  @ApiOperation({
    summary: 'Update recommendation criteria (Android)',
    description: 'Update recommendation filter preferences',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns updated criteria',
    type: RecommendationCriteriaResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid criteria data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateRecommendationCriteria(
    @Request() req,
    @Body() criteriaDto: RecommendationCriteriaRequestDto,
  ): Promise<RecommendationCriteriaResponseDto> {
    const userId = req.user.userId;
    return this.preferenceService.updateCriteriaForAndroid(userId, criteriaDto);
  }
}
