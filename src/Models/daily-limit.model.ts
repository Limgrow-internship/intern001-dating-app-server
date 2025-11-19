import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DailyLimitDocument = DailyLimit & Document;

@Schema()
export class DailyLimit {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  date: string; // Format: YYYY-MM-DD

  @Prop({ default: 0 })
  likesCount: number;

  @Prop({ default: 0 })
  superLikesCount: number;

  @Prop({ default: 50 }) // Default 50 likes for free users
  maxLikes: number;

  @Prop({ default: 1 }) // Default 1 super like for free users
  maxSuperLikes: number;
}

export const DailyLimitSchema = SchemaFactory.createForClass(DailyLimit);

// Compound unique index for userId + date
DailyLimitSchema.index({ userId: 1, date: 1 }, { unique: true });
