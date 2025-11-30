import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../Services/cloudinary.service';

@Controller('upload')
export class UploadAudioController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('audio')
  @UseInterceptors(FileInterceptor('audio'))
  async uploadAudio(@UploadedFile() file: Express.Multer.File){
    const result = await this.cloudinaryService.uploadAudioFile(file);
    return {
      url: result.secure_url,
      public_id: result.public_id,
      duration: result.duration,
      resource_type: result.resource_type,
    };
  }
}