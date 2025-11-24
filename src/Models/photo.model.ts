import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum PhotoType {
  AVATAR = 'avatar',
  GALLERY = 'gallery',
  SELFIE = 'selfie',
}

export enum PhotoSource {
  UPLOAD = 'upload',
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  APPLE = 'apple',
}

@Schema({ timestamps: true })
export class Photo extends Document {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  url: string;

  @Prop()
  cloudinaryPublicId?: string;

  @Prop({ required: true, enum: PhotoType, default: PhotoType.GALLERY })
  type: PhotoType;

  @Prop({ enum: PhotoSource, default: PhotoSource.UPLOAD })
  source: PhotoSource;

  @Prop({ default: false })
  isPrimary: boolean;

  @Prop({ default: 0 })
  order: number;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop()
  width?: number;

  @Prop()
  height?: number;

  @Prop()
  fileSize?: number;

  @Prop()
  format?: string;

  @Prop({ default: true })
  isActive: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export type PhotoDocument = Photo & Document;

export const PhotoSchema = SchemaFactory.createForClass(Photo);

PhotoSchema.index({ userId: 1, isPrimary: 1 });
PhotoSchema.index({ userId: 1, order: 1 });
PhotoSchema.index({ userId: 1, type: 1 });
PhotoSchema.index({ userId: 1, isActive: 1 });
