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
import { CloudinaryService } from '../Services/cloudinary.service';
import { PhotoService } from '../Services/photo.service';
import { PhotoType, PhotoSource } from '../Models/photo.model';
import * as admin from 'firebase-admin';

@Injectable()
export class AuthService {
  private googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,

    private jwt: JwtService,
    private userService: UserService,
    private jwtService: JwtService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly photoService: PhotoService,
  ) { }

  private async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async login(email: string, password: string, deviceToken?: string) {
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

    // Update last login and FCM token if deviceToken is provided
    const updateData: any = {
      lastLogin: new Date()
    };

    if (deviceToken) {
      updateData.fcmToken = deviceToken;
      updateData.fcmTokenUpdatedAt = new Date();
    }

    if (Object.keys(updateData).length > 1 || updateData.lastLogin) {
      await this.userModel.updateOne({ id: user.id }, { $set: updateData }).exec();
    }

    // Ensure profile exists (create if it doesn't)
    const existingProfile = await this.profileModel.findOne({ userId: user.id }).exec();
    if (!existingProfile) {
      await this.profileModel.create({
        userId: user.id,
        interests: [],
        mode: 'dating',
      });
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
    let payload: admin.auth.DecodedIdToken;
    try {
      payload = await admin.auth().verifyIdToken(idToken);
    } catch (err) {
      throw new UnauthorizedException('Invalid Google token');
    }


    const googleId = payload.uid;
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

    // Create or update profile (without photo fields)
    if (isNewUser) {
      await this.profileModel.create({
        userId: user.id,
        firstName,
        lastName,
      });
    } else {
      await this.profileModel.updateOne(
        { userId: user.id },
        {
          $set: {
            firstName,
            lastName,
          }
        },
        { upsert: true }
      );
    }

    // Upload avatar to Photos collection using PhotoService
    let photoUrl: string | null = null;
    if (picture) {
      try {
        const photo = await this.photoService.uploadFromUrl(
          user.id,
          picture,
          PhotoSource.GOOGLE,
          PhotoType.AVATAR,
        );
        photoUrl = photo.url;
      } catch (err) {
        // Photo upload failed, continue without photo
      }
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

    // Get primary photo URL for response
    const primaryPhoto = await this.photoService.getPrimaryPhoto(user.id);
    const avatarUrl = primaryPhoto?.url || photoUrl;

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      profile: profile
        ? {
          firstName: profile.firstName,
          lastName: profile.lastName,
          avatar: avatarUrl,
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
          fields: 'id,email,name,picture.type(large)'
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

    let cloudinaryAvatar: string | null = null;
    const pictureUrl = fbData.picture?.data?.url;
    if (pictureUrl) {
      try {
        cloudinaryAvatar = await this.cloudinaryService.uploadImage(pictureUrl);
      } catch (err) {
      }
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
      });
    } else {
      await this.profileModel.updateOne(
        { userId: user.id },
        {
          $set: {
            firstName, lastName,
          }
        },
        { upsert: true }
      );
    }

    // Upload avatar to Photos collection if available
    if (cloudinaryAvatar) {
      try {
        await this.photoService.uploadFromUrl(
          user.id,
          cloudinaryAvatar,
          PhotoSource.FACEBOOK,
          PhotoType.AVATAR,
        );
      } catch (err) {
        // Photo upload failed, continue without photo
      }
    }

    const profile = await this.profileModel.findOne({ userId: user.id }).exec();
    const primaryPhoto = await this.photoService.getPrimaryPhoto(user.id);
    const avatarUrl = primaryPhoto?.url || cloudinaryAvatar;

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
        avatar: avatarUrl,
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