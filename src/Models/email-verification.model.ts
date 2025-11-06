//Tạo bảng tạm để lưu OTP và thời hạn hiệu lực
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EmailVerificationDocument = EmailVerification & Document;

@Schema({ timestamps: true })
export class EmailVerification {
    @Prop({ required: true, unique: true })
    email: string;

    @Prop({ required: true })
    password: string;

    @Prop({ required: true })
    otp: string;

    @Prop({ required: true })
    otpExpiresAt: Date;

    @Prop({ default: 0 })
    attempts: number;
}

export const EmailVerificationSchema = SchemaFactory.createForClass(EmailVerification);
