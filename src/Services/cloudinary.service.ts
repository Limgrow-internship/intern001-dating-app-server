import { Injectable } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadImage(imageUrl?: string): Promise<string> {
    if (!imageUrl) throw new Error('No image URL provided');

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    const formData = new FormData();
    formData.append('file', imageUrl);
    formData.append('upload_preset', uploadPreset);

        try {
        const response = await axios.post(uploadUrl, formData, {
        headers: formData.getHeaders(),
        });
          
        return (response.data as any).secure_url;
          } catch (err) {
            console.error('Cloudinary upload error:', err?.response?.data || err?.message);
            throw err;
          }
  }

  async uploadFile(file: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'dating-app/photos',
          resource_type: 'image',
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      throw error;
    }
  }
}



  //  async uploadImage(imageUrl?: string): Promise<string> {
  //       if (!imageUrl) throw new Error("No image URL provided");

  //       const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  //       const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
  //       const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  //       const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  //       const imageBuffer = Buffer.from(new Uint8Array(imageResponse.data as ArrayBuffer));

  //       const formData = new FormData();
  //       formData.append('file', imageBuffer, { filename: 'avatar.jpg',
  //           contentType: 'image/jpeg',});
  //       formData.append('upload_preset', uploadPreset);

  //       try {
  //           const response = await axios.post(uploadUrl, formData, {
  //             headers: formData.getHeaders(),
  //           });
          
  //           return (response.data as any).secure_url;
  //         } catch (err) {
  //           console.error('Cloudinary upload error:', err?.response?.data || err?.message);
  //           throw err;
  //         }