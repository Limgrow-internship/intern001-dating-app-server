import { Module } from '@nestjs/common';
import { CloudinaryService } from '../Services/cloudinary.service';

@Module({
    providers: [CloudinaryService],
    exports: [CloudinaryService],
})
export class CloudinaryModule { }
