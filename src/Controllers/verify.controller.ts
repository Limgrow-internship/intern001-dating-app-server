import { Controller, Post, UploadedFile, UseInterceptors, Req, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VerifyService } from '../Services/verify.service';
import { JwtAuthGuard } from 'src/Guards/jwt-auth.guard';

@Controller()
export class VerifyController {
  constructor(private readonly verifyService: VerifyService) { }

  // @Post('verify-face')
  // @UseGuards(JwtAuthGuard)
  // @UseInterceptors(FileInterceptor('selfie'))
  // async verifyFace(@UploadedFile() file: any, @Req() req) {
  //   console.log("req.user", req.user);
  //   const userId = req.user.userId;
  //   return await this.verifyService.verifyFace(userId, file.buffer);
  // }
}