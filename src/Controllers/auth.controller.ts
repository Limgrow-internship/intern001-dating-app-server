import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from '../Services/login.service';
import { Login } from '../DTO/login.dto';
import { RefreshTokenDto } from '../DTO/refresh.dto';
import { HttpCode } from '@nestjs/common';
import { LoginWithGoogleDto } from 'src/DTO/login-with-google.dto';


@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) { }

  @Post('login')
  @HttpCode(200)
  login(@Body() body: Login) {
    return this.auth.login(body.email, body.password);
  }

  @Post('google')
  async loginWithGoogle(@Body() body: { idToken: string }) {
    const result = await this.auth.verifyGoogleToken(body.idToken);

    return {
      message: 'Login successful',
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    };
  }

  //   @Post('refresh-token')
  //   refresh(@Body() body: RefreshTokenDto) {
  //     return this.auth.refresh(body.refreshToken);
  //   }
}
