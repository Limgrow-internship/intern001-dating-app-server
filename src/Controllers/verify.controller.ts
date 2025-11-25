// Face verification feature is temporarily disabled due to TensorFlow.js native module issues
// Uncomment when Visual Studio Build Tools are installed and TensorFlow.js is properly configured

/*
import { Controller, Post, UploadedFile, UseInterceptors, Req, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VerifyService } from '../Services/verify.service';
import { JwtAuthGuard } from 'src/Guards/jwt-auth.guard';

@Controller()
export class VerifyController {
  constructor(private readonly verifyService: VerifyService) { }

  @Post('verify-face')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('selfie'))
  async verifyFace(@UploadedFile() file: any, @Req() req) {
    console.log("req.user", req.user);
    const userId = req.user.userId;
    return await this.verifyService.verifyFace(userId, file.buffer);
  }
}
*/

// Temporary stub implementation to prevent module errors
import { Controller, Post, UploadedFile, UseInterceptors, Req, UseGuards, HttpStatus, HttpException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VerifyService } from '../Services/verify.service';
import { JwtAuthGuard } from 'src/Guards/jwt-auth.guard';

@Controller()
export class VerifyController {
  constructor(private readonly verifyService: VerifyService) { }

  @Post('verify-face')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('selfie'))
  async verifyFace(@UploadedFile() file: any, @Req() req) {
    throw new HttpException(
      'Face verification is temporarily disabled. Please install Visual Studio Build Tools and rebuild TensorFlow.js to enable this feature.',
      HttpStatus.SERVICE_UNAVAILABLE
    );
  }
}