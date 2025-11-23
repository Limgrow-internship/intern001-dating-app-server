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
    // Đảm bảo có ít nhất 1 trong 2 trường
    if (!profile || (!profile.profilePicture && !profile.avatar)) {
      return { verified: false, message: 'No profile image found' };
    }

    // Load selfie
    // @ts-ignore
    const selfieImg: any = await canvas.loadImage(selfieBuffer);

    // @ts-ignore
    const selfieDesc = await faceapi
      .detectSingleFace(selfieImg)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!selfieDesc) {
      return { verified: false, message: 'Could not detect a face from selfie.' };
    }

    let verified = false;
    let compareResults: { source: string; distance: number }[] = [];

    // So sánh với avatar nếu có
    if (profile.avatar) {
      // @ts-ignore
      const avatarImg: any = await canvas.loadImage(profile.avatar);
      // @ts-ignore
      const avatarDesc = await faceapi
        .detectSingleFace(avatarImg)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (avatarDesc) {
        const distance = faceapi.euclideanDistance(
          selfieDesc.descriptor,
          avatarDesc.descriptor
        );
        compareResults.push({ source: "avatar", distance });
        if (distance < 0.5) verified = true;
      }
    }

    // So sánh với profilePicture nếu có
    if (profile.profilePicture) {
      // @ts-ignore
      const profileImg: any = await canvas.loadImage(profile.profilePicture);
      // @ts-ignore
      const profileDesc = await faceapi
        .detectSingleFace(profileImg)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (profileDesc) {
        const distance = faceapi.euclideanDistance(
          selfieDesc.descriptor,
          profileDesc.descriptor
        );
        compareResults.push({ source: "profilePicture", distance });
        if (distance < 0.5) verified = true;
      }
    }

    if (verified) {
      await this.profileModel.updateOne(
        { userId },
        {
          isVerified: true,
          verifiedAt: new Date(),
          selfieImage: selfieBuffer.toString('base64'),
          verifiedBadge: true,
        }
      );
      return {
        verified: true,
        message: 'Verification successful!',
        compareResults
      };
    } else {
      return {
        verified: false,
        message: 'Face did not match, please try again.',
        compareResults
      };
    }
  }
}