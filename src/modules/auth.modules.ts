// src/Modules/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from '../Controllers/auth.controller';
import { AuthService } from '../Services/login.service';
import { UserModule } from '../modules/user.modules';

@Module({
  imports: [
    UserModule, // ✅ Inject UserModel vào AuthService
    JwtModule.register({}) // để sign/verify token
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
