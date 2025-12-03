import { Controller, Post, UseInterceptors, UploadedFile, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from 'src/Services/cloudinary.service';

@Controller('media')
export class MediaController {
  constructor(private readonly cloudinary: CloudinaryService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    const url = await this.cloudinary.uploadFile(file);
    return { url };
  }

  @Post('image-from-url')
  async uploadImageFromUrl(@Body('url') url: string) {
    const uploadedUrl = await this.cloudinary.uploadImageFromUrl(url);
    return { url: uploadedUrl };
  }
}