import { Injectable, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { EmailVerification, EmailVerificationDocument } from '../Models/email-verification.model';
import { User, UserDocument } from '../Models/user.model';
import { UpdateProfileDto } from '../DTO/update-profile.dto';

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
        try {
            console.log('🟢 Verify OTP called with:', { email, otp });

            const record = await this.emailVerifyModel.findOne({ email });
            if (!record) {
                console.warn('⚠️ No OTP record found for email:', email);
                throw new BadRequestException('No OTP request found for this email.');
            }

            console.log('✅ OTP record found:', {
                email: record.email,
                otp: record.otp,
                otpExpiresAt: record.otpExpiresAt,
                attempts: record.attempts,
                passwordExists: !!record.password,
            });

            if (!record.otpExpiresAt) {
                console.error('❌ Missing otpExpiresAt in record for:', email);
                await this.emailVerifyModel.deleteOne({ email });
                throw new BadRequestException('Invalid OTP record. Please request a new OTP.');
            }

            if (record.otpExpiresAt.getTime() < Date.now()) {
                console.warn('⏰ OTP expired for:', email);
                await this.emailVerifyModel.deleteOne({ email });
                throw new BadRequestException('OTP has expired. Please request a new one.');
            }

            if (record.otp !== otp) {
                record.attempts += 1;
                await record.save();

                console.warn(`❌ Incorrect OTP for ${email}. Attempt ${record.attempts}/3`);

                if (record.attempts >= 3) {
                    await this.emailVerifyModel.deleteOne({ email });
                    throw new BadRequestException('Too many incorrect attempts. Please register again.');
                }

                throw new BadRequestException('Incorrect OTP. Please try again.');
            }

            console.log('🔐 OTP verified successfully, creating user...');

            const newUser = new this.userModel({
                email: record.email,
                password: record.password,
                status: 'active',
            });

            try {
                await newUser.save();
                console.log('✅ User created successfully:', record.email);
            } catch (saveErr) {
                console.error('❌ Error saving user:', saveErr);
                throw new InternalServerErrorException('Database error while creating user.');
            }

            await this.emailVerifyModel.deleteOne({ email });
            console.log('🧹 Deleted email verification record for:', email);

            return { message: 'Verification successful. Account created.' };

        } catch (err) {
            console.error('🔥 verifyOtp() error:', err);
            if (err instanceof BadRequestException || err instanceof InternalServerErrorException) {
                throw err;
            }
            throw new InternalServerErrorException('Unexpected error while verifying OTP.');
        }
    }

    async getUserProfile(userId: string) {
        const user = await this.userModel.findOne({ id: userId }).select('-password -otp -otpExpires -otpAttempts');

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async updateUserProfile(userId: string, updateProfileDto: UpdateProfileDto) {
        const user = await this.userModel.findOne({ id: userId });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const updatedUser = await this.userModel.findOneAndUpdate(
            { id: userId },
            { $set: updateProfileDto },
            { new: true }
        ).select('-password -otp -otpExpires -otpAttempts');

        return updatedUser;
    }
}
