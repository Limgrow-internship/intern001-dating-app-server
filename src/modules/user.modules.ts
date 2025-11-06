// src/Modules/user.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../Models/user.model';
import { UserService } from '../Services/user.service';
import { UsersController } from '../Controllers/user.controller';
import { EmailVerification, EmailVerificationSchema } from '../Models/email-verification.model';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: EmailVerification.name, schema: EmailVerificationSchema }
    ])
  ],
  controllers: [UsersController],
  providers: [UserService],
  exports: [UserService, MongooseModule] 
})
export class UserModule {}