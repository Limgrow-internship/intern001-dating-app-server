import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { Profile, ProfileSchema } from '../Models/profile.model';
import { ProfileService } from '../Services/profile.service';
import { ProfileController } from '../Controllers/profile.controller';
import { JwtAuthGuard } from '../Guards/jwt-auth.guard';
import { VerifyController } from '../Controllers/verify.controller';
import { VerifyService } from '../Services/verify.service';
import { PhotoModule } from './photo.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Profile.name, schema: ProfileSchema }]),
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    PhotoModule,
  ],
  controllers: [ProfileController, VerifyController],
  providers: [ProfileService, JwtAuthGuard, VerifyService],
  exports: [ProfileService, MongooseModule],
})
export class ProfileModule { }