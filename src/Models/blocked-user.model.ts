import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BlockedUserDocument = BlockedUser & Document;

@Schema({ timestamps: true })
export class BlockedUser {
  @Prop({ required: true, index: true })
  blockerUserId: string;

  @Prop({ required: true, index: true })
  blockedUserId: string;

  @Prop()
  reason?: string;

  @Prop({ default: Date.now })
  blockedAt: Date;
}

export const BlockedUserSchema = SchemaFactory.createForClass(BlockedUser);

// Compound index to ensure one user can't block another multiple times
BlockedUserSchema.index({ blockerUserId: 1, blockedUserId: 1 }, { unique: true });
