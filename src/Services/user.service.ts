import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { EmailVerification, EmailVerificationDocument } from '../Models/email-verification.model';
import { User, UserDocument } from '../Models/user.model';

@Injectable()
export class UserService {
    constructor(
        @InjectModel(EmailVerification.name) private emailVerifyModel: Model<EmailVerificationDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
    ) { }

    // Gửi OTP
    async requestOtp(email: string, password: string) {
        // kiểm tra email đã có user chưa
        const existingUser = await this.userModel.findOne({ email });
        if (existingUser) {
            throw new BadRequestException('Email đã được đăng ký');
        }

        // Tạo OTP ngẫu nhiên
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        const hashedPassword = await bcrypt.hash(password, 10);

        // Lưu record tạm hoặc cập nhật lại
        const expiresAt = new Date(Date.now() + 60 * 1000); // 60 giây
        await this.emailVerifyModel.findOneAndUpdate(
            { email },
            { email, password: hashedPassword, otp, otpExpiresAt: expiresAt, attempts: 0 },
            { upsert: true, new: true }
        );

        // Gửi email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_PASS, // App password
            },
        });

        await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: email,
            subject: 'Mã xác thực OTP',
            text: `Mã OTP của bạn là: ${otp}. Mã có hiệu lực trong 60 giây.`,
        });

        return { message: 'Đã gửi mã xác thực đến email của bạn' };
    }

    // Xác minh OTP
    async verifyOtp(email: string, otp: string) {
        const record = await this.emailVerifyModel.findOne({ email });

        if (!record) throw new BadRequestException('Không tìm thấy yêu cầu OTP');
        if (record.otpExpiresAt.getTime() < Date.now()) {
            await this.emailVerifyModel.deleteOne({ email });
            throw new BadRequestException('Mã OTP đã hết hạn');
        }

        if (record.otp !== otp) {
            record.attempts += 1;
            await record.save();

            if (record.attempts >= 3) {
                await this.emailVerifyModel.deleteOne({ email });
                throw new BadRequestException('Bạn đã nhập sai OTP quá 3 lần. Vui lòng đăng ký lại.');
            }

            throw new BadRequestException('Mã OTP không đúng. Vui lòng thử lại.');
        }

        // OTP đúng → tạo user chính thức
        const newUser = new this.userModel({
            email: record.email,
            password: record.password,
            status: 'active',
        });
        await newUser.save();

        // Xoá bản ghi OTP
        await this.emailVerifyModel.deleteOne({ email });

        return { message: 'Xác minh thành công. Tài khoản đã được tạo.' };
    }
}
