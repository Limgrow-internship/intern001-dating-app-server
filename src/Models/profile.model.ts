import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProfileDocument = Profile & Document;

@Schema({ timestamps: true })
export class Profile {
    @Prop({ required: true, unique: true })
    userId: string;

    @Prop()
    firstName?: string;

    @Prop()
    lastName?: string;

    @Prop()
    dateOfBirth?: Date;

    @Prop({ type: String, enum: ['male', 'female', 'other'] })
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

    @Prop({ type: String, enum: ['dating', 'friend'], default: 'dating' })
    mode?: string;

    @Prop({ default: false })
    isVerified?: boolean;

    @Prop()
    verifiedAt?: Date;

    @Prop()
    selfieImage?: string; 

    @Prop({ default: false })
    verifiedBadge?: boolean;
}

export const ProfileSchema = SchemaFactory.createForClass(Profile);