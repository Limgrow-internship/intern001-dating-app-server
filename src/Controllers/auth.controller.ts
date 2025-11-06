import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from '../Services/login.service';
import { Login } from '../DTO/login.dto';
import { RefreshTokenDto } from '../DTO/refresh.dto';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  login(@Body() body: Login) {
    return this.auth.login(body.email, body.password);
  }

//   @Post('refresh-token')
//   refresh(@Body() body: RefreshTokenDto) {
//     return this.auth.refresh(body.refreshToken);
//   }
}
