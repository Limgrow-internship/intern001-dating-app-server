import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Photo, PhotoSchema } from '../Models/photo.model';
import { PhotoService } from '../Services/photo.service';
import { PhotoController } from '../Controllers/photo.controller';
import { CloudinaryModule } from './cloudinary.module';
// Face verification temporarily disabled - uncomment when TensorFlow.js is properly configured
import { VerifyService } from 'src/Services/verify.service';
import { VerifyController } from 'src/Controllers/verify.controller';
import { Profile, ProfileSchema } from 'src/Models/profile.model';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Photo.name, schema: PhotoSchema }, { name: Profile.name, schema: ProfileSchema },]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
    CloudinaryModule,
  ],
  controllers: [PhotoController, VerifyController], // VerifyController is temporarily disabled but kept to prevent module errors
  providers: [PhotoService, VerifyService], // VerifyService is temporarily disabled but kept to prevent module errors
  exports: [PhotoService], // VerifyService removed from exports since it's disabled
})
export class PhotoModule {}
