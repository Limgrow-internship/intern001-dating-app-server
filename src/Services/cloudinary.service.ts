import { Injectable } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';
@Injectable()
export class CloudinaryService {
    async uploadImage(imageUrl?: string): Promise<string> {
        if (!imageUrl) throw new Error("No image URL provided");

        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
        const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

        const formData = new FormData();
        formData.append('file', imageUrl);
        formData.append('upload_preset', uploadPreset);

        const response = await axios.post(uploadUrl, formData, {
            headers: formData.getHeaders(),
        });

        return (response.data as any).secure_url;

    }
}

