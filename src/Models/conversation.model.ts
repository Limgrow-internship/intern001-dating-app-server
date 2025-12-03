import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ required: true, unique: true, index: true })
  matchId: string; // Reference to the match

  @Prop({ required: true, index: true })
  userId1: string; // First user in conversation

  @Prop({ required: true, index: true })
  userId2: string; // Second user in conversation

  @Prop({ type: Date })
  lastActivityAt?: Date; // Last message timestamp

  @Prop({
    type: String,
    enum: ['active', 'deleted_for_one', 'deleted_for_both', 'archived'],
    default: 'active',
  })
  status: string;

  @Prop({ type: [String], default: [] })
  deletedBy: string[];

}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.index({ userId1: 1, lastActivityAt: -1 });
ConversationSchema.index({ userId2: 1, lastActivityAt: -1 });
ConversationSchema.index({ status: 1 });
ConversationSchema.index({ deletedBy: 1 });
