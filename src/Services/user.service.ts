import { Injectable, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { EmailVerification, EmailVerificationDocument } from '../Models/email-verification.model';
import { User, UserDocument } from '../Models/user.model';
import { Profile, ProfileDocument } from '../Models/profile.model';
import { JwtService } from '@nestjs/jwt';


@Injectable()
export class UserService {
    constructor(
        @InjectModel(EmailVerification.name)
        private emailVerifyModel: Model<EmailVerificationDocument>,
        @InjectModel(User.name)
        private userModel: Model<UserDocument>,
        @InjectModel(Profile.name)
        private profileModel: Model<ProfileDocument>,
        private readonly jwtService: JwtService,
    ) { }

    async requestOtp(email: string, password: string) {
        if (!email.endsWith('@gmail.com')) {
            throw new BadRequestException('Email must end with @gmail.com');
        }

        const existingUser = await this.userModel.findOne({ email });
        if (existingUser) {
            throw new BadRequestException('This email has already been registered');
        }

        const existingRecord = await this.emailVerifyModel.findOne({ email });
        const now = new Date();

        if (existingRecord) {
            if (existingRecord.lastOtpSentAt && now.getTime() - existingRecord.lastOtpSentAt.getTime() < 60 * 1000) {
                const secondsLeft = 60 - Math.floor((now.getTime() - existingRecord.lastOtpSentAt.getTime()) / 1000);
                throw new BadRequestException(`Please wait ${secondsLeft}s before requesting a new OTP`);
            }

            if (existingRecord.resendCount >= 5) {
                const now = new Date();

                if (existingRecord.lockedUntil && existingRecord.lockedUntil.getTime() > now.getTime()) {
                    const minutesLeft = Math.ceil((existingRecord.lockedUntil.getTime() - now.getTime()) / 60000);
                    throw new BadRequestException(`Too many OTP requests. Try again after ${minutesLeft} minutes`);
                } else {
                    existingRecord.resendCount = 0;
                    existingRecord.lockedUntil = null;
                    await existingRecord.save();
                }

            }

        }

        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        const hashedPassword = await bcrypt.hash(password, 10);
        const expiresAt = new Date(Date.now() + 90 * 1000);

        await this.emailVerifyModel.findOneAndUpdate(
            { email },
            {
                email,
                password: hashedPassword,
                otp,
                otpExpiresAt: expiresAt,
                attempts: 0,
                lastOtpSentAt: now,
                resendCount: (existingRecord?.resendCount ?? 0) + 1,
            },
            { upsert: true, new: true },
        );

        try {
            if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
                throw new InternalServerErrorException('Email configuration is missing. Please check environment variables.');
            }

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.GMAIL_USER,
                    pass: process.env.GMAIL_PASS,
                },
            });

            await transporter.sendMail({
                from: `"OTP Verification" <${process.env.GMAIL_USER}>`,
                to: email,
                subject: 'Your OTP Code',
                text: `Your OTP code is: ${otp}. It will expire in 90 seconds.`,
            });
        } catch (err) {
            console.error('Email send failed:', err);
            throw new InternalServerErrorException('Unable to send OTP email. Please check your email settings.');
        }

        return { message: 'OTP has been sent to your email.' };
    }

    async verifyOtp(email: string, otp: string) {
        try {
            const record = await this.emailVerifyModel.findOne({ email });
            if (!record) {
                throw new BadRequestException('No OTP request found for this email.');
            }

            if (!record.otpExpiresAt) {
                await this.emailVerifyModel.deleteOne({ email });
                throw new BadRequestException('Invalid OTP record. Please request a new OTP.');
            }

            if (record.otpExpiresAt.getTime() < Date.now()) {
                await this.emailVerifyModel.deleteOne({ email });
                throw new BadRequestException('OTP has expired. Please request a new one.');
            }

            if (record.otp !== otp) {
                record.attempts += 1;
                await record.save();

                if (record.attempts >= 3) {
                    await this.emailVerifyModel.deleteOne({ email });
                    throw new BadRequestException('Too many incorrect attempts. Please register again.');
                }

                throw new BadRequestException('Incorrect OTP. Please try again.');
            }

            const newUser = new this.userModel({
                email: record.email,
                password: record.password,
                status: 'active',
            });

            try {
                await newUser.save();

                // Automatically create profile for the new user
                const newProfile = new this.profileModel({
                    userId: newUser.id,
                    interests: [],
                    mode: 'dating',
                });
                await newProfile.save();
            } catch (saveErr) {
                console.error('Error saving user or profile:', saveErr);
                throw new InternalServerErrorException('Database error while creating user.');
            }

            await this.emailVerifyModel.deleteOne({ email });

            return { message: 'Verification successful. Account created.' };

        } catch (err) {
            console.error('verifyOtp() error:', err);
            if (err instanceof BadRequestException || err instanceof InternalServerErrorException) {
                throw err;
            }
            throw new InternalServerErrorException('Unexpected error while verifying OTP.');
        }
    }

    /**
     * Get User Authentication Info (not profile data)
     * For profile data, use ProfileService
     */
    async getUserProfile(userId: string) {
        const user = await this.userModel.findOne({ id: userId }).select('-password -otp -otpExpires -otpAttempts');

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async deleteAccount(userId: string): Promise<void> {
        await this.userModel.deleteOne({ id: userId });
    }
    async changePassword(
        userId: string,
        newPassword: string,
        confirmPassword: string,
        deviceInfo: string,
    ) {
        try {
            const user = await this.userModel.findOne({ id: userId });
            if (!user) {
                throw new BadRequestException('User not found');
            }

            if (!user.password) {
                throw new BadRequestException('User password not found');
            }

            if (newPassword !== confirmPassword) {
                throw new BadRequestException(
                    'New password and confirmation password do not match'
                );
            }

            if (newPassword.length < 8) {
                throw new BadRequestException('New password is too short');
            }

            const sameAsOld = await bcrypt.compare(newPassword, user.password);
            if (sameAsOld) {
                throw new BadRequestException('New password cannot be the same as the old password');
            }

            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedNewPassword;

            user.deviceTokens = [];

            user.passwordHistory.push({
                changedAt: new Date(),
                device: deviceInfo,
            });

            await user.save();

            return { message: 'Password changed successfully' };

        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            if (error.name === 'MongoNetworkError' || error.name === 'MongooseServerSelectionError') {
                throw new InternalServerErrorException('Cannot connect to server');
            }

            console.error('Error changing password:', error);
            throw new InternalServerErrorException('An error occurred, please try again');
        }
    }

    async findByEmail(email: string): Promise<UserDocument | null> {
        return this.userModel.findOne({ email }).exec();
    }

    async create(userData: Partial<User>): Promise<UserDocument> {
        const newUser = new this.userModel(userData);
        return newUser.save();
    }

    async updateFcmToken(userId: string, fcmToken: string) {
        const user = await this.userModel.findOne({ id: userId });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        await this.userModel.updateOne(
            { id: userId },
            {
                $set: {
                    fcmToken,
                    fcmTokenUpdatedAt: new Date(),
                },
            },
        ).exec();

        return { message: 'FCM token updated successfully', fcmToken };
    }

    async getFcmToken(userId: string) {
        const user = await this.userModel.findOne({ id: userId }).select('fcmToken');
        if (!user) {
            throw new NotFoundException('User not found');
        }

        return { fcmToken: user.fcmToken || null };
    }


    private async sendOtpEmail(email: string, otp: string) {
        if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
            throw new InternalServerErrorException('Email config missing');
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_PASS,
            },
        });

        await transporter.sendMail({
            from: `"OTP Verification" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: 'Your OTP Code',
            text: `Your OTP code is: ${otp}. It will expire in 5 minutes.`,
        });
    }

    async requestResetOtp(email: string) {
        const user = await this.userModel.findOne({ email });
        if (!user) {
            throw new BadRequestException('Email not found.');
        }

        const now = new Date();
        const record = await this.emailVerifyModel.findOne({ email });

        if (record?.lastOtpSentAt && now.getTime() - record.lastOtpSentAt.getTime() < 60_000) {
            const left = 60 - Math.floor((now.getTime() - record.lastOtpSentAt.getTime()) / 1000);
            throw new BadRequestException(`Please wait ${left}s before requesting new OTP.`);
        }

        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        const hashedOtp = await bcrypt.hash(otp, 10);

        await this.emailVerifyModel.findOneAndUpdate(
            { email },
            {
                email,
                otp: hashedOtp,
                otpExpiresAt: new Date(Date.now() + 5 * 60_000),
                attempts: 0,
                resendCount: (record?.resendCount ?? 0) + 1,
                lastOtpSentAt: now,
                isForReset: true,
            },
            { upsert: true }
        );

        await this.sendOtpEmail(email, otp);

        return { message: 'OTP sent to email.' };
    }

    async verifyResetOtp(email: string, otp: string) {
        const record = await this.emailVerifyModel.findOne({ email });

        if (!record || !record.isForReset) {
            throw new BadRequestException('No reset request found.');
        }

        if (!record.otpExpiresAt || record.otpExpiresAt < new Date()) {
            await this.emailVerifyModel.deleteOne({ email });
            throw new BadRequestException('OTP expired.');
        }

        const valid = await bcrypt.compare(otp, record.otp);
        if (!valid) {
            record.attempts += 1;
            await record.save();

            if (record.attempts >= 3) {
                await this.emailVerifyModel.deleteOne({ email });
                throw new BadRequestException('Too many incorrect attempts.');
            }

            throw new BadRequestException('Incorrect OTP.');
        }

        const otpToken = this.jwtService.sign(
            { email, type: 'RESET_PASSWORD' },
            { expiresIn: '10m' }
        );

        await this.emailVerifyModel.deleteOne({ email });

        return { otpToken };
    }

    async resetPassword(
        token: string,
        newPassword: string,
        confirmPassword: string
    ) {
        let payload: any;
        try {
            payload = this.jwtService.verify(token);
        } catch {
            throw new BadRequestException('Invalid or expired token.');
        }

        if (payload.type !== 'RESET_PASSWORD') {
            throw new BadRequestException('Invalid token.');
        }

        if (newPassword !== confirmPassword) {
            throw new BadRequestException('Passwords do not match.');
        }

        if (newPassword.length < 8) {
            throw new BadRequestException('Password must be at least 8 characters.');
        }

        const user = await this.userModel.findOne({ email: payload.email });
        if (!user) {
            throw new BadRequestException('User not found.');
        }

        const same = await bcrypt.compare(newPassword, user.password);
        if (same) {
            throw new BadRequestException('New password must be different.');
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        return { message: 'Password reset successfully.' };
    }
}
