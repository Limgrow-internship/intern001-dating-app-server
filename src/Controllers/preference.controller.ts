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
}
