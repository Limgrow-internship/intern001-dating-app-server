import { Body, Controller, Post, Put } from '@nestjs/common';
import { UserService } from '../Services/user.service';
import { CreateUserDto } from '../DTO/create-user.dto';
import { VerifyOtpDto } from '../DTO/verify-otp.dto';
import { ChangePasswordDto } from '../DTO/change-password.dto';

@Controller('user')
export class UsersController {
    constructor(private readonly userService: UserService) { }

    @Post('request-otp')
    async requestOtp(@Body() dto: CreateUserDto) {
        return this.userService.requestOtp(dto.email, dto.password);
    }

    @Post('verify-otp')
    async verifyOtp(@Body() dto: VerifyOtpDto) {
        return this.userService.verifyOtp(dto.email, dto.otp);
    }

    @Put('change-password')
    changePassword(@Body() dto: ChangePasswordDto) {
        return this.userService.changePassword(
            dto.email,
            dto.oldPassword,
            dto.newPassword,
            dto.confirmPassword,
            dto.deviceInfo,
        );
    }
}
