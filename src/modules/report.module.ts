import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Report, ReportSchema } from '../Models/report.model';
import { ReportController } from '../Controllers/report.controller';
import { ReportService } from '../Services/report.service';
import { AuthModule } from '../modules/auth.modules';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Report.name, schema: ReportSchema },
        ]),
        AuthModule,
    ],
    controllers: [ReportController],
    providers: [ReportService],
    exports: [ReportService]
})
export class ReportModule { }
