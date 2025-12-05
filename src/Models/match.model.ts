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
    enum: ['active', 'unmatched', 'blocked'],
    default: 'active',
  })
  status: string;

  @Prop({ type: Date, default: Date.now })
  matchedAt: Date; // When both users liked each other

  @Prop({ type: Date })
  unmatchedAt?: Date; // When either user unmatched

  @Prop({ required: false, type: String })
  blockerId?: string;

  @Prop({ type: Date })
  lastMessageAt?: Date; // Last message timestamp in conversation
}

export const MatchSchema = SchemaFactory.createForClass(Match);

// Compound indexes for efficient queries
MatchSchema.index({ userId: 1, targetUserId: 1 });
MatchSchema.index({ userId: 1, status: 1 });
MatchSchema.index({ targetUserId: 1, status: 1 });
