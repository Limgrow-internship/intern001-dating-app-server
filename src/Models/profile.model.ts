import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';


export type ProfileDocument = Profile & Document & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ timestamps: true })
export class Profile {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop()
  firstName?: string;

  @Prop()
  lastName?: string;

  @Prop()
  displayName?: string; // Custom display name

  @Prop()
  dateOfBirth?: Date;

  @Prop({ type: String, enum: ['male', 'female', 'other'] })
  gender?: string;

  @Prop()
  bio?: string;

  @Prop({ type: [String], default: [] })
  interests: string[];

  @Prop({ type: { type: String, coordinates: [Number] } })
  location?: {
    type: string;
    coordinates: number[]; // [longitude, latitude] - GeoJSON format
  };

  @Prop()
  city?: string;

  @Prop()
  country?: string;

  @Prop({ type: Number, min: 18, max: 100 })
  age?: number;

  @Prop({ type: String, enum: ['dating', 'friend'], default: 'dating' })
  mode?: string;

  @Prop()
  verifiedAt?: Date;

  @Prop({ default: false })
  verifiedBadge?: boolean;

  // New fields for Android compatibility
  @Prop()
  occupation?: string;

  @Prop()
  company?: string;

  @Prop()
  education?: string;

  @Prop({ type: String, enum: ['serious', 'casual', 'friendship'] })
  relationshipMode?: string;

  @Prop({ type: Number, min: 120, max: 220 })
  height?: number; // in centimeters

  @Prop({ type: Number, min: 30, max: 300 })
  weight?: number; // in kilograms

  @Prop()
  zodiac?: string; // Aries, Taurus, etc.

  @Prop({ default: false })
  isVerified?: boolean;

  @Prop({ type: Number, min: 0, max: 100, default: 0 })
  profileCompleteness?: number;

  @Prop({ type: Number, default: 0 })
  profileViews?: number;

  @Prop({ type: [String], default: [] })
  goals?: string[]; // Goals/objectives

  @Prop()
  job?: string; // Job title

  @Prop({ type: Object })
  openQuestionAnswers?: Record<string, string>;

}

export const ProfileSchema = SchemaFactory.createForClass(Profile);

// Geospatial index for location-based queries
ProfileSchema.index({ location: '2dsphere' });
