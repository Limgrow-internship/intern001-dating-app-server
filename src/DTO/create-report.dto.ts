import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class CreateReportDto {
    @IsString()
    userIdIsReported: string

    @IsString()
    reason: string
}
