// src/Modules/user.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { User, UserSchema } from '../Models/user.model';
import { UserService } from '../Services/user.service';
import { UsersController } from '../Controllers/user.controller';
import { EmailVerification, EmailVerificationSchema } from '../Models/email-verification.model';
import { JwtAuthGuard } from '../Guards/jwt-auth.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: EmailVerification.name, schema: EmailVerificationSchema }
    ]),
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [UsersController],
  providers: [UserService, JwtAuthGuard],
  exports: [UserService, MongooseModule]
})
export class UserModule {}