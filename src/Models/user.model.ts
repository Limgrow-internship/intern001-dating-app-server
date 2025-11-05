import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
    @Prop({ required: true, unique: true })
    email: string;

    @Prop({ unique: true })
    phoneNumber?: string;

    @Prop({ required: true })
    password: string;

    // 🟢 Dùng để xác thực email
    @Prop()
    otp?: string;

    // 🕐 Thời điểm hết hạn của mã OTP (vd: 60 giây sau khi gửi)
    @Prop()
    otpExpires?: Date;

    // 🔢 Số lần người dùng nhập sai OTP
    @Prop({ default: 0 })
    otpAttempts?: number;

    // ⏱️ Lần cuối cùng hệ thống gửi OTP (để chặn spam gửi lại trong 60s)
    @Prop()
    lastOtpSentAt?: Date;

    @Prop({ type: [String], default: [] })
    authMethods: string[];

    @Prop({ type: Object, default: {} })
    socialAccounts: Record<string, any>;

    @Prop({ type: String, default: 'active' })
    status: string;

    @Prop({ type: Date, default: null })
    lastLogin: Date | null;

    @Prop({ type: [String], default: [] })
    deviceTokens: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);
