// email-verification.model.ts
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

    @Prop({ default: 0 })
    resendCount: number;

    @Prop({ type: Date, default: null })
    lastOtpSentAt: Date | null;

    @Prop({ type: Date, default: null })
    lockedUntil: Date | null;

    @Prop({ default: false })
    isForReset: boolean;
}

export const EmailVerificationSchema = SchemaFactory.createForClass(EmailVerification);
