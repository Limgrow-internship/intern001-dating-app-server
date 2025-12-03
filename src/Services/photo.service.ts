import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Photo, PhotoType, PhotoSource } from '../Models/photo.model';
import { CloudinaryService } from './cloudinary.service';

@Injectable()
export class PhotoService {
  constructor(
    @InjectModel(Photo.name) private photoModel: Model<Photo>,
    private cloudinaryService: CloudinaryService,
  ) { }
  async uploadPhoto(
    userId: string,
    file: Express.Multer.File,
    type: PhotoType = PhotoType.GALLERY,
    source: PhotoSource = PhotoSource.UPLOAD,
  ): Promise<Photo> {
    const uploadResult = await this.cloudinaryService.uploadFile(file);

    const maxOrder = await this.getMaxOrder(userId);

    const photo = await this.photoModel.create({
      userId,
      url: uploadResult.secure_url,
      cloudinaryPublicId: uploadResult.public_id,
      type,
      source,
      isPrimary: false,
      order: maxOrder + 1,
      width: uploadResult.width,
      height: uploadResult.height,
      fileSize: uploadResult.bytes,
      format: uploadResult.format,
      isActive: true,
      isVerified: false,
    });

    return photo;
  }

  async uploadFromUrl(
    userId: string,
    imageUrl: string,
    source: PhotoSource,
    type: PhotoType = PhotoType.AVATAR,
  ): Promise<Photo> {
    const cloudinaryUrl = await this.cloudinaryService.uploadImage(imageUrl);

    const publicId = this.extractPublicId(cloudinaryUrl);

    const maxOrder = await this.getMaxOrder(userId);

    const photo = await this.photoModel.create({
      userId,
      url: cloudinaryUrl,
      cloudinaryPublicId: publicId,
      type,
      source,
      isPrimary: type === PhotoType.AVATAR,
      order: maxOrder + 1,
      isActive: true,
    });

    if (photo.isPrimary) {
      await this.unsetOtherPrimary(userId, (photo._id as Types.ObjectId).toString());
    }

    return photo;
  }

  async getUserPhotos(userId: string, type?: PhotoType): Promise<Photo[]> {
    const query: any = { userId, isActive: true };
    if (type) {
      query.type = type;
    }

    return this.photoModel.find(query).sort({ order: 1 }).exec();
  }

  async getPrimaryPhoto(userId: string): Promise<Photo | null> {
    return this.photoModel
      .findOne({ userId, isPrimary: true, isActive: true })
      .exec();
  }

  async setPrimaryPhoto(userId: string, photoId: string): Promise<Photo> {
    const photo = await this.photoModel.findOne({
      _id: photoId,
      userId,
      isActive: true,
    });

    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    await this.photoModel.updateMany(
      { userId, isPrimary: true },
      { $set: { isPrimary: false } },
    );

    photo.isPrimary = true;
    await photo.save();

    return photo;
  }

  async deletePhoto(userId: string, photoId: string): Promise<void> {
    const photo = await this.photoModel.findOne({
      _id: photoId,
      userId,
      isActive: true,
    });

    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    if (photo.isPrimary) {
      throw new BadRequestException(
        'Cannot delete primary photo. Set another photo as primary first.',
      );
    }

    photo.isActive = false;
    await photo.save();

    if (photo.cloudinaryPublicId) {
      try {
        await this.cloudinaryService.deleteImage(photo.cloudinaryPublicId);
      } catch (error) {
        console.error('Failed to delete from Cloudinary:', error);
      }
    }
  }

  async deleteAllUserPhotos(userId: string): Promise<void> {
    // Get all active photos for the user
    const photos = await this.photoModel.find({ userId, isActive: true });

    // Delete from Cloudinary and mark as inactive
    const deletePromises = photos.map(async (photo) => {
      if (photo.cloudinaryPublicId) {
        try {
          await this.cloudinaryService.deleteImage(photo.cloudinaryPublicId);
        } catch (error) {
          console.error(`Failed to delete photo ${photo._id} from Cloudinary:`, error);
        }
      }
      photo.isActive = false;
      return photo.save();
    });

    await Promise.all(deletePromises);
  }

  async reorderPhotos(
    userId: string,
    photoOrders: { photoId: string; order: number }[],
  ): Promise<void> {
    const bulkOps = photoOrders.map(({ photoId, order }) => ({
      updateOne: {
        filter: { _id: photoId, userId, isActive: true },
        update: { $set: { order } },
      },
    }));

    await this.photoModel.bulkWrite(bulkOps);
  }

  async getPhotoCount(userId: string, type?: PhotoType): Promise<number> {
    const query: any = { userId, isActive: true };
    if (type) {
      query.type = type;
    }
    return this.photoModel.countDocuments(query);
  }

  async getPhotoById(userId: string, photoId: string): Promise<Photo | null> {
    return this.photoModel.findOne({
      _id: photoId,
      userId,
      isActive: true,
    });
  }

  private async getMaxOrder(userId: string): Promise<number> {
    const lastPhoto = await this.photoModel
      .findOne({ userId, isActive: true })
      .sort({ order: -1 })
      .exec();

    return lastPhoto ? lastPhoto.order : -1;
  }

  private async unsetOtherPrimary(
    userId: string,
    excludeId: string,
  ): Promise<void> {
    await this.photoModel.updateMany(
      { userId, _id: { $ne: excludeId }, isPrimary: true },
      { $set: { isPrimary: false } },
    );
  }

  private extractPublicId(cloudinaryUrl: string): string {
    try {
      const parts = cloudinaryUrl.split('/');
      const uploadIndex = parts.indexOf('upload');
      if (uploadIndex !== -1 && uploadIndex + 2 < parts.length) {
        const pathParts = parts.slice(uploadIndex + 2);
        const filename = pathParts.join('/').split('.')[0];
        return filename;
      }
    } catch (error) {
      console.error('Failed to extract public ID:', error);
    }
    return '';
  }
}
