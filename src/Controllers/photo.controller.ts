import {
  Controller,
  Post,
  Get,
  Delete,
  Put,
  Body,
  Param,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBearerAuth,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../Guards/jwt-auth.guard';
import { PhotoService } from '../Services/photo.service';
import { PhotoType } from '../Models/photo.model';

@ApiTags('Photos')
@Controller('photos')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PhotoController {
  constructor(private readonly photoService: PhotoService) { }

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload a photo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        type: {
          type: 'string',
          enum: ['avatar', 'gallery', 'selfie'],
          default: 'gallery',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Photo uploaded successfully',
  })
  @ApiResponse({ status: 400, description: 'No file uploaded' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadPhoto(
    @Request() req,
    @UploadedFile() file: any,
    @Body('type') type?: PhotoType,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const userId = req.user.userId;
    const photo = await this.photoService.uploadPhoto(
      userId,
      file,
      type || PhotoType.GALLERY,
    );

    return {
      message: 'Photo uploaded successfully',
      photo: {
        id: photo._id,
        url: photo.url,
        type: photo.type,
        source: photo.source,
        isPrimary: photo.isPrimary,
        order: photo.order,
        createdAt: photo.createdAt,
      },
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all my photos' })
  @ApiResponse({
    status: 200,
    description: 'Returns all user photos',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyPhotos(@Request() req) {
    const userId = req.user.userId;
    const photos = await this.photoService.getUserPhotos(userId);

    return {
      photos: photos.map((photo) => ({
        id: photo._id,
        url: photo.url,
        type: photo.type,
        source: photo.source,
        isPrimary: photo.isPrimary,
        order: photo.order,
        isVerified: photo.isVerified,
        width: photo.width,
        height: photo.height,
        createdAt: photo.createdAt,
      })),
    };
  }

  @Get('primary')
  @ApiOperation({ summary: 'Get primary photo (avatar)' })
  @ApiResponse({
    status: 200,
    description: 'Returns primary photo',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPrimaryPhoto(@Request() req) {
    const userId = req.user.userId;
    const photo = await this.photoService.getPrimaryPhoto(userId);

    if (!photo) {
      return { photo: null };
    }

    return {
      photo: {
        id: photo._id,
        url: photo.url,
        type: photo.type,
        source: photo.source,
        isPrimary: photo.isPrimary,
      },
    };
  }

  @Get('count')
  @ApiOperation({ summary: 'Get photo count' })
  @ApiResponse({
    status: 200,
    description: 'Returns photo count',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPhotoCount(@Request() req) {
    const userId = req.user.userId;
    const total = await this.photoService.getPhotoCount(userId);
    const avatarCount = await this.photoService.getPhotoCount(
      userId,
      PhotoType.AVATAR,
    );
    const galleryCount = await this.photoService.getPhotoCount(
      userId,
      PhotoType.GALLERY,
    );

    return {
      total,
      byType: {
        avatar: avatarCount,
        gallery: galleryCount,
      },
    };
  }

  @Put(':photoId/set-primary')
  @ApiOperation({ summary: 'Set a photo as primary (avatar)' })
  @ApiParam({ name: 'photoId', description: 'Photo ID' })
  @ApiResponse({
    status: 200,
    description: 'Primary photo updated',
  })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async setPrimaryPhoto(@Request() req, @Param('photoId') photoId: string) {
    const userId = req.user.userId;
    const photo = await this.photoService.setPrimaryPhoto(userId, photoId);

    return {
      message: 'Primary photo updated',
      photo: {
        id: photo._id,
        url: photo.url,
        isPrimary: photo.isPrimary,
      },
    };
  }

  @Delete(':photoId')
  @ApiOperation({ summary: 'Delete a photo' })
  @ApiParam({ name: 'photoId', description: 'Photo ID' })
  @ApiResponse({
    status: 200,
    description: 'Photo deleted successfully',
  })
  @ApiResponse({ status: 400, description: 'Cannot delete primary photo' })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deletePhoto(@Request() req, @Param('photoId') photoId: string) {
    const userId = req.user.userId;
    await this.photoService.deletePhoto(userId, photoId);

    return {
      message: 'Photo deleted successfully',
    };
  }

  @Put('reorder')
  @ApiOperation({ summary: 'Reorder photos' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        orders: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              photoId: { type: 'string' },
              order: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Photos reordered successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async reorderPhotos(
    @Request() req,
    @Body() body: { orders: { photoId: string; order: number }[] },
  ) {
    const userId = req.user.userId;
    await this.photoService.reorderPhotos(userId, body.orders);

    return {
      message: 'Photos reordered successfully',
    };
  }
}
