// auth.service.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { User, UserDocument } from '../Models/user.model';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwt: JwtService
  ) {}

  private async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async login(email: string, password: string) {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Email không tồn tại');
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw new UnauthorizedException('Mật khẩu không đúng');
    }

    const accessToken = this.jwt.sign(
      { id: user._id, email: user.email },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' }
    );

    const refreshToken = this.jwt.sign(
      { id: user._id, email: user.email },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' }
    );

    const userInfo = {
      id: user._id,
      email: user.email
    };

    return {
      user: userInfo,
      accessToken,
      refreshToken,
      message: 'Đăng nhập thành công'
    };
  }
}