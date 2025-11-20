import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MatchDocument = Match & Document;

@Schema({ timestamps: true })
export class Match {
  @Prop({ required: true, index: true })
  userId: string; // First user in the match

  @Prop({ required: true, index: true })
  targetUserId: string; // Second user in the match

  @Prop({
    required: true,
    enum: ['pending', 'matched', 'unmatched'],
    default: 'matched',
  })
  status: string;

  @Prop({ type: Date })
  matchedAt: Date; // When both users liked each other

  @Prop({ type: Date })
  unmatchedAt?: Date; // When either user unmatched
}

export const MatchSchema = SchemaFactory.createForClass(Match);

// Compound indexes for efficient queries
MatchSchema.index({ userId: 1, targetUserId: 1 });
MatchSchema.index({ userId: 1, status: 1 });
MatchSchema.index({ targetUserId: 1, status: 1 });
