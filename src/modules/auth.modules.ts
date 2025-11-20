// src/Modules/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from '../Controllers/auth.controller';
import { AuthService } from '../Services/login.service';
import { UserModule } from '../modules/user.modules';
import { CloudinaryModule } from '../modules/cloudinary.module';

@Module({
  imports: [
    UserModule,
    CloudinaryModule,
    JwtModule.register({})
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule { }
