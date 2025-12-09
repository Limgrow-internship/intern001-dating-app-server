import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../Models/user.model';

export type ReportDocument = Report & Document;

@Schema({
    timestamps: { createdAt: 'createdAt', updatedAt: false },
})
export class Report {
    @Prop({ required: true, unique: true })
    userIdReport: string;

    @Prop({ required: true, unique: true })
    userIdIsReported: string;

    @Prop({ type: String, required: true })
    reason: string;

    @Prop({ type: Date })
    createdAt: Date;
}

export const ReportSchema = SchemaFactory.createForClass(Report);
