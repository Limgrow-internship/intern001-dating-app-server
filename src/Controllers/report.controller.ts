import {
    Body, Controller, Post, Get, UseGuards, Req, Param
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../Guards/jwt-auth.guard';
import { ReportService } from '../Services/report.service';
import { CreateReportDto } from '../DTO/create-report.dto';

@ApiTags('Report')
@Controller('report')
export class ReportController {
    constructor(private readonly reportService: ReportService) { }

    @Post('create')
    @UseGuards(JwtAuthGuard)
    async create(
        @Req() req,
        @Body() dto: CreateReportDto,
    ) {
        return this.reportService.create({
            userIdReport: req.user.userId,
            userIdIsReported: dto.userIdIsReported,
            reason: dto.reason,
        });
    }

    @Get('list')
    @ApiOperation({
        summary: 'Get all reports',
        description: 'Admin can view all reports'
    })
    async findAll() {
        return this.reportService.findAll();
    }

    @Get('user/:userId')
    @ApiOperation({
        summary: 'Get reports for a specific user',
        description: 'View all reports against this user'
    })
    async getUserReports(
        @Param('userId') userId: string
    ) {
        return this.reportService.findByReportedUser(userId);
    }
}
