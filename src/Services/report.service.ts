import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Report, ReportDocument } from '../Models/report.model';
import { CreateReportDto } from '../DTO/create-report.dto';

@Injectable()
export class ReportService {
    constructor(
        @InjectModel(Report.name)
        private readonly reportModel: Model<ReportDocument>,
    ) { }

    async create(data: {
        userIdReport: string
        userIdIsReported: string
        reason: string
    }) {
        const doc = new this.reportModel({
            userIdReport: data.userIdReport,
            userIdIsReported: data.userIdIsReported,
            reason: data.reason,
        });

        return doc.save();
    }

    async findAll() {
        return this.reportModel
            .find()
            .sort({ createdAt: -1 })
            .populate('userIdReport userIdIsReported', 'name avatar')
            .lean();
    }

    async findByReportedUser(userId: string) {
        return this.reportModel
            .find({ userIdIsReported: new Types.ObjectId(userId) })
            .sort({ createdAt: -1 })
            .lean();
    }
}
