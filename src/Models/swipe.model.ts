import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SwipeDocument = Swipe & Document;

@Schema({ timestamps: true })
export class Swipe {
  @Prop({ required: true, index: true })
  userId: string; // User who performed the swipe

  @Prop({ required: true, index: true })
  targetUserId: string; // User who was swiped on

  @Prop({ required: true, enum: ['like', 'pass'] })
  action: string; // 'like' or 'pass'

  @Prop({ default: Date.now })
  timestamp: Date;

  @Prop({ type: Number })
  score?: number; // Recommendation score at time of swipe (for ML feedback)
}

export const SwipeSchema = SchemaFactory.createForClass(Swipe);

// Compound index for efficient queries
SwipeSchema.index({ userId: 1, targetUserId: 1 }, { unique: true });
SwipeSchema.index({ userId: 1, timestamp: -1 }); // For recent swipes query
