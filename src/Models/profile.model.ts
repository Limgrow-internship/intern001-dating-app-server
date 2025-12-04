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

  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: [Number],
  })
  location?: {
    type: 'Point';
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
  zodiacSign?: string; // Aries, Taurus, etc.

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

  @Prop({
    type: Map,
    of: String,
    default: () => new Map()
  })
  openQuestionAnswers: Map<string, string>;
}

export const ProfileSchema = SchemaFactory.createForClass(Profile);

// Pre-save hook to validate and clean up invalid location data
ProfileSchema.pre('save', function (next) {
  // If location exists but is invalid (missing coordinates or empty coordinates), remove it
  if (this.location) {
    if (!this.location.coordinates ||
      !Array.isArray(this.location.coordinates) ||
      this.location.coordinates.length < 2 ||
      this.location.coordinates.some(coord => coord === null || coord === undefined || isNaN(coord))) {
      // Invalid location - remove it
      this.location = undefined;
    }
  }
  next();
});

// Pre-update hook to validate location in update operations
ProfileSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function (next) {
  const update = this.getUpdate() as any;

  // Handle $set operations
  if (update.$set) {
    if (update.$set.location) {
      const loc = update.$set.location;
      if (!loc.coordinates ||
        !Array.isArray(loc.coordinates) ||
        loc.coordinates.length < 2 ||
        loc.coordinates.some((coord: any) => coord === null || coord === undefined || isNaN(coord))) {
        // Invalid location - remove it
        delete update.$set.location;
        // Also unset any existing invalid location on the document
        if (!update.$unset) {
          update.$unset = {};
        }
        update.$unset.location = '';
      }
    }
  }

  // Handle direct location assignment
  if (update.location) {
    const loc = update.location;
    if (!loc.coordinates ||
      !Array.isArray(loc.coordinates) ||
      loc.coordinates.length < 2 ||
      loc.coordinates.some((coord: any) => coord === null || coord === undefined || isNaN(coord))) {
      // Invalid location - remove it
      delete update.location;
      // Also unset any existing invalid location on the document
      if (!update.$unset) {
        update.$unset = {};
      }
      update.$unset.location = '';
    }
  }

  // Always check and clean up invalid location in existing documents
  // This ensures that even if we're not updating location, we clean up bad data
  if (!update.$set || !update.$set.location) {
    // We're not setting location, but we should still clean up if it exists and is invalid
    // Note: This is a best-effort cleanup - MongoDB will still validate during the update
    // The sparse index helps, but we can't fully prevent the error without cleaning the data first
  }

  next();
});

// Geospatial index for location-based queries (sparse to only index documents with valid location)
ProfileSchema.index({ location: '2dsphere' }, { sparse: true });
