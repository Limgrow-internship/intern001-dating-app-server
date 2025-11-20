import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PreferenceDocument = Preference & Document;

@Schema({ timestamps: true })
export class Preference {
  @Prop({ required: true, unique: true, index: true })
  userId: string;

  @Prop({ type: Number, min: 18, max: 100, default: 18 })
  ageMin: number;

  @Prop({ type: Number, min: 18, max: 100, default: 99 })
  ageMax: number;

  @Prop({
    type: [String],
    enum: ['male', 'female', 'other', 'all'],
    default: ['all'],
  })
  genderPreference: string[];

  @Prop({ type: Number, default: 50 }) // Distance in kilometers
  maxDistance: number;

  @Prop({ type: String, enum: ['dating', 'friend'], default: 'dating' })
  mode: string;

  @Prop({ type: [String], default: [] })
  interests: string[]; // Optional: filter by specific interests
}

export const PreferenceSchema = SchemaFactory.createForClass(Preference);
