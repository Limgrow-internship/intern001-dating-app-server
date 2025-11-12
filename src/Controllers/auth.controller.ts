import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from '../Services/login.service';
import { Login } from '../DTO/login.dto';
import { RefreshTokenDto } from '../DTO/refresh.dto';
import { HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';


@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: '3️⃣ Step 3: Login to get Access Token',
    description: 'Login with email and password. Copy the accessToken from response and click "Authorize" button at the top to use it!'
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful. Copy accessToken and use "Authorize" button!',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() body: Login) {
    return this.auth.login(body.email, body.password);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  refresh(@Body() body: RefreshTokenDto) {
    return this.auth.refresh(body.refreshToken);
  }
}
