import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { EmailVerification, EmailVerificationDocument } from '../Models/email-verification.model';
import { User, UserDocument } from '../Models/user.model';

@Injectable()
export class UserService {
    constructor(
        @InjectModel(EmailVerification.name)
        private emailVerifyModel: Model<EmailVerificationDocument>,
        @InjectModel(User.name)
        private userModel: Model<UserDocument>,
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
                if (existingRecord.lockedUntil && existingRecord.lockedUntil > now) {
                    const minutesLeft = Math.ceil((existingRecord.lockedUntil.getTime() - now.getTime()) / 60000);
                    throw new BadRequestException(`Too many OTP requests. Try again after ${minutesLeft} minutes`);
                } else {
                    existingRecord.lockedUntil = new Date(now.getTime() + 15 * 60 * 1000);
                    await existingRecord.save();
                    throw new BadRequestException('Too many OTP requests. You are locked for 15 minutes.');
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
            console.error('❌ Email send failed:', err);
            throw new InternalServerErrorException('Unable to send OTP email. Please check your email settings.');
        }

        return { message: 'OTP has been sent to your email.' };
    }

    async verifyOtp(email: string, otp: string) {
        const record = await this.emailVerifyModel.findOne({ email });
        if (!record) throw new BadRequestException('No OTP request found for this email.');

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
        await newUser.save();

        await this.emailVerifyModel.deleteOne({ email });

        return { message: 'Verification successful. Account created.' };
    }

    async changePassword(
        email: string,
        oldPassword: string,
        newPassword: string,
        confirmPassword: string,
        deviceInfo: string,
    ) {
        try {
            const user = await this.userModel.findOne({ email });
            if (!user) {
                throw new BadRequestException('User not found');
            }

            if (newPassword !== confirmPassword) {
                throw new BadRequestException(
                    'Mật khẩu mới và xác nhận mật khẩu không trùng khớp'
                );
            }

            if (newPassword.length < 8) {
                throw new BadRequestException('Mật khẩu mới quá ngắn');
            }

            const isOldPasswordCorrect = await bcrypt.compare(oldPassword, user.password);
            if (!isOldPasswordCorrect) {
                throw new BadRequestException('Mật khẩu cũ không chính xác');
            }

            const sameAsOld = await bcrypt.compare(newPassword, user.password);
            if (sameAsOld) {
                throw new BadRequestException('Mật khẩu mới không được trùng với mật khẩu cũ');
            }

            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedNewPassword;

            user.deviceTokens = [];

            user.passwordHistory.push({
                changedAt: new Date(),
                device: deviceInfo,
            });

            await user.save();

            return { message: 'Đổi mật khẩu thành công' };

        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            if (error.name === 'MongoNetworkError' || error.name === 'MongooseServerSelectionError') {
                throw new InternalServerErrorException('Không thể kết nối tới máy chủ');
            }

            console.error('❌ Lỗi đổi mật khẩu:', error);
            throw new InternalServerErrorException('Đã xảy ra lỗi, vui lòng thử lại');
        }
    }
}
