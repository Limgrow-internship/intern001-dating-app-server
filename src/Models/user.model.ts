import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
    @Prop({ type: String, default: () => uuid(), unique: true })
    id: string;

    @Prop({ required: true, unique: true })
    email: string;

    @Prop({ unique: true, sparse: true })
    phoneNumber?: string;

    @Prop({ required: true })
    password: string;

    @Prop()
    otp?: string;

    @Prop()
    otpExpires?: Date;

    @Prop({ default: 0 })
    otpAttempts?: number;

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

    @Prop({ type: Array, default: [] })
    passwordHistory: Array<{
        changedAt: Date;
        device: string;
    }>;

    @Prop()
    firstName?: string;

    @Prop()
    lastName?: string;

    @Prop()
    dateOfBirth?: Date;

    @Prop()
    gender?: string;

    @Prop()
    bio?: string;

    @Prop()
    profilePicture?: string;

    @Prop({ type: [String], default: [] })
    interests: string[];

    @Prop()
    location?: string;

    @Prop({ type: Number, min: 18, max: 100 })
    age?: number;
}

export const UserSchema = SchemaFactory.createForClass(User);
