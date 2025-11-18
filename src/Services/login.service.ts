// auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { User, UserDocument } from '../Models/user.model';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { UserService } from '../Services/user.service';
import { Profile, ProfileDocument } from '../Models/profile.model';
import axios from 'axios';

@Injectable()
export class AuthService {
  private googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,

    private jwt: JwtService,
    private userService: UserService,
    private jwtService: JwtService,
  ) { }

  private async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async login(email: string, password: string) {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Email không tồn tại');
    }

    if (!user.password) {
      throw new UnauthorizedException('User password not found');
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw new UnauthorizedException('Mật khẩu không đúng');
    }

    const accessToken = this.jwt.sign(
      { userId: user.id, email: user.email },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' }
    );

    const refreshToken = this.jwt.sign(
      { userId: user.id, email: user.email },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' }
    );

    const userInfo = {
      id: user.id,
      email: user.email
    };

    return {
      user: userInfo,
      accessToken,
      refreshToken,
      message: 'Đăng nhập thành công'
    };
  }

  async googleLogin(idToken: string) {
    let payload;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
      console.log("[GoogleLogin] payload:", payload);
      if (!payload) throw new UnauthorizedException('Invalid Google token');
    } catch (err) {
      console.error("[GoogleLogin] verifyIdToken error:", err);
      throw new UnauthorizedException('Invalid Google token');
    }

    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name || '';
    const picture = payload.picture || null;

    let firstName = '';
    let lastName = '';
    if (name) {
      const parts = name.split(' ');
      firstName = parts[0];
      lastName = parts.slice(1).join(' ');
    }

    let user = await this.userModel.findOne({ googleId }).exec();
    if (!user && email) {
      user = await this.userModel.findOne({ email }).exec();
    }

    let isNewUser = false;

    if (!user) {
      user = await this.userModel.create({
        googleId,
        email: email || `google_${googleId}@gmail.com`,
        authMethods: ['google'],
        status: 'active',
      });
      isNewUser = true;
    }

    if (isNewUser) {
      await this.profileModel.create({
        userId: user.id,
        firstName,
        lastName,
        profilePicture: picture,
      });
    } else {
      const updateResult = await this.profileModel.updateOne(
        { userId: user.id },
        { $set: { firstName, lastName, profilePicture: picture } },
        { upsert: true },
      );
      console.log("[GoogleLogin] profile update result:", updateResult);
    }

    const profile = await this.profileModel.findOne({ userId: user.id }).exec();

    const accessTokenJwt = this.jwt.sign(
      { userId: user.id, email: user.email },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' },
    );

    const refreshTokenJwt = this.jwt.sign(
      { userId: user.id, email: user.email },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' },
    );

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      profile: profile
        ? {
          firstName: profile.firstName,
          lastName: profile.lastName,
          profilePicture: profile.profilePicture,
        }
        : {},
      accessToken: accessTokenJwt,
      refreshToken: refreshTokenJwt,
      message: 'Login with Google successfully!',
    };
  }
  async facebookLogin(accessToken: string) {
    let fbRes: any = null;
    try {
      fbRes = await axios.get('https://graph.facebook.com/me', {
        params: {
          access_token: accessToken,
          fields: 'id,email,name,picture'
        }
      });
    } catch {
      fbRes = null;
    }

    if (!fbRes || !fbRes.data || !fbRes.data.id) {
      throw new UnauthorizedException('Invalid Facebook token');
    }
    const fbData = fbRes.data;

    let firstName = '';
    let lastName = '';
    if (fbData.name) {
      const parts = fbData.name.split(' ');
      firstName = parts[0];
      lastName = parts.slice(1).join(' ');
    }

    let user = await this.userModel.findOne({ facebookId: fbData.id }).exec();
    if (!user && fbData.email) {
      user = await this.userModel.findOne({ email: fbData.email }).exec();
    }
    let isNewUser = false;
    if (!user) {
      user = await this.userModel.create({
        facebookId: fbData.id,
        email: fbData.email || `${fbData.id}@facebook.com`, 
        authMethods: ['facebook'],
        status: 'active'
      });
      isNewUser = true;
    }

    if (isNewUser) {
      await this.profileModel.create({
        userId: user.id,
        firstName,
        lastName,
        // profilePicture: fbData.picture?.data?.url
      });
    } else {
      await this.profileModel.updateOne(
        { userId: user.id },
        { $set: { firstName, lastName, 
          // 
           } },
        { upsert: true }
      );
    }

    const profile = await this.profileModel.findOne({ userId: user.id }).exec();

    const accessTokenJwt = this.jwt.sign(
      { userId: user.id, email: user.email },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' }
    );
    const refreshTokenJwt = this.jwt.sign(
      { userId: user.id, email: user.email },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' }
    );

    return {
      user: {
        id: user.id,
        email: user.email
      },
      profile: profile ? {
        firstName: profile.firstName,
        lastName: profile.lastName,
        // profilePicture: profile.profilePicture
      } : {},
      accessToken: accessTokenJwt,
      refreshToken: refreshTokenJwt,
      message: 'Login with Facebook thành công'
    };
  }
  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET
      });

      const user = await this.userModel.findOne({ id: payload.userId }).exec();
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const newAccessToken = this.jwt.sign(
        { userId: user.id, email: user.email },
        { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' }
      );

      const newRefreshToken = this.jwt.sign(
        { userId: user.id, email: user.email },
        { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' }
      );

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        message: 'Token refreshed successfully'
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}