import { Injectable } from '@nestjs/common';
import * as faceapi from '@vladmandic/face-api';
import * as canvas from 'canvas';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Profile, ProfileDocument } from '../Models/profile.model';

@Injectable()
export class VerifyService {
  constructor(
    @InjectModel(Profile.name)
    private readonly profileModel: Model<ProfileDocument>,
  ) {

    faceapi.env.monkeyPatch({
        Canvas: canvas.Canvas as any,
        Image: canvas.Image as any,
        ImageData: canvas.ImageData as any,
      });
  }

  async verifyFace(userId: string, selfieBuffer: Buffer) {
    // Nên optimize: chỉ load từ disk một lần ở app khởi tạo, demo thì load mỗi lần cho dễ debug
    await faceapi.nets.tinyFaceDetector.loadFromDisk('./models');
    await faceapi.nets.ssdMobilenetv1.loadFromDisk('./models');
    await faceapi.nets.faceRecognitionNet.loadFromDisk('./models');
    await faceapi.nets.faceLandmark68Net.loadFromDisk('./models');

    const profile = await this.profileModel.findOne({ userId });
    console.log("Querying profile", userId);
console.log("Result profile:", profile);
    if (!profile || !profile.profilePicture) {
      return { verified: false, message: 'No profile image found' };
    }

    // Có thể định nghĩa selfieImg/profileImg là any hoặc dùng @ts-ignore
    // @ts-ignore
    const profileImg: any = await canvas.loadImage(profile.profilePicture);
    // @ts-ignore
    const selfieImg: any = await canvas.loadImage(selfieBuffer);

    // @ts-ignore
    const selfieDesc = await faceapi
      .detectSingleFace(selfieImg)
      .withFaceLandmarks()
      .withFaceDescriptor();

    // @ts-ignore
    const profileDesc = await faceapi
      .detectSingleFace(profileImg)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!selfieDesc || !profileDesc) {
      return { verified: false, message: 'Could not detect a face from image.' };
    }

    const distance = faceapi.euclideanDistance(
      selfieDesc.descriptor,
      profileDesc.descriptor
    );
    if (distance < 0.5) {
      await this.profileModel.updateOne(
        { userId },
        {
          isVerified: true,
          verifiedAt: new Date(),
          selfieImage: selfieBuffer.toString('base64'),
          verifiedBadge: true,
        }
      );
      return { verified: true, message: 'Verification successful!' };
    } else {
      return { verified: false, message: 'Face did not match, please try again.' };
    }
  }
}