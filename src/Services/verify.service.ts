// Face verification feature is temporarily disabled due to TensorFlow.js native module issues
// Uncomment when Visual Studio Build Tools are installed and TensorFlow.js is properly configured

/*
import { Injectable } from '@nestjs/common';
import * as faceapi from '@vladmandic/face-api';
import * as canvas from 'canvas';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Photo, PhotoDocument, PhotoType } from '../Models/photo.model';
import { Profile, ProfileDocument } from '../Models/profile.model';

@Injectable()
export class VerifyService {
  private modelsLoaded = false;

  constructor(
    @InjectModel(Photo.name)
    private readonly photoModel: Model<PhotoDocument>,
    @InjectModel(Profile.name)
    private readonly profileModel: Model<ProfileDocument>,
  ) {
    faceapi.env.monkeyPatch({
      Canvas: canvas.Canvas as any,
      Image: canvas.Image as any,
      ImageData: canvas.ImageData as any,
    });
    this.loadModels(); // Đảm bảo load model 1 lần
  }

  async loadModels() {
    if (this.modelsLoaded) return;
    await faceapi.nets.ssdMobilenetv1.loadFromDisk('./models');
    await faceapi.nets.faceRecognitionNet.loadFromDisk('./models');
    await faceapi.nets.faceLandmark68Net.loadFromDisk('./models');
    this.modelsLoaded = true;
  }

  // Hàm align + resize khuôn mặt về 150x150 rồi lấy descriptor
  private async getAlignedDescriptor(img: any): Promise<Float32Array | null> {
    const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
    if (!detection) return null;
    const faceBox = detection.detection.box;
    const c = canvas.createCanvas(150, 150);
    const ctx = c.getContext('2d');
    ctx.drawImage(
      img,
      faceBox.x, faceBox.y, faceBox.width, faceBox.height,
      0, 0, 150, 150
    );
    // Ép kiểu as any để tránh lỗi TNetInput
    const alignedDesc = await faceapi.detectSingleFace(c as any).withFaceLandmarks().withFaceDescriptor();
    if (!alignedDesc) return null;
    return alignedDesc.descriptor;
  }

  async verifyFace(userId: string, selfieBuffer: Buffer) {
    await this.loadModels();

    // Lấy ảnh của user
    const candidatePhotos = await this.photoModel.find({
      userId,
      type: { $in: [PhotoType.AVATAR, PhotoType.GALLERY] },
      isActive: true,
    });

    if (!candidatePhotos.length) {
      return { verified: false, message: 'No matching photo found (avatar/gallery)' };
    }

    // Load và align ảnh selfie
    const selfieImg: any = await canvas.loadImage(selfieBuffer);
    const selfieDesc = await this.getAlignedDescriptor(selfieImg);
    if (!selfieDesc) {
      return { verified: false, message: 'Could not detect a face from selfie.' };
    }

    let minDistance = 1;
    let verifiedPhotoId: any = null;

    for (const photo of candidatePhotos) {
      try {
        const profileImg: any = await canvas.loadImage(photo.url);
        const profileDesc = await this.getAlignedDescriptor(profileImg);
        if (!profileDesc) continue;
        const distance = faceapi.euclideanDistance(selfieDesc, profileDesc);
        if (distance < minDistance) {
          minDistance = distance;
          verifiedPhotoId = photo._id;
        }
      } catch (err) {
        // Ignore lỗi từng ảnh gallery
        continue;
      }
    }

    const THRESHOLD = 0.45; // Bạn nên tune lại ngưỡng này cho phù hợp ảnh thật tế

    if (minDistance < THRESHOLD && verifiedPhotoId) {
      await this.photoModel.updateOne(
        { _id: verifiedPhotoId },
        { isVerified: true }
      );
      await this.profileModel.updateOne(
        { userId },
        { isVerified: true, verifiedBadge: true, verifiedAt: new Date() }
      );
      return {
        verified: true,
        message: `Verification successful! (distance: ${minDistance.toFixed(3)})`
      };
    }

    return {
      verified: false,
      message: `Face did not match with any photo, min distance: ${minDistance.toFixed(3)}, please try again.`
    };
  }
}
*/

// Temporary stub implementation to prevent module errors
import { Injectable } from '@nestjs/common';

@Injectable()
export class VerifyService {
  async verifyFace(userId: string, selfieBuffer: Buffer) {
    return {
      verified: false,
      message: 'Face verification is temporarily disabled. Please install Visual Studio Build Tools and rebuild TensorFlow.js to enable this feature.'
    };
  }
}
// import { Injectable } from '@nestjs/common';
// import * as faceapi from '@vladmandic/face-api';
// import * as canvas from 'canvas';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model } from 'mongoose';
// import { Photo, PhotoDocument, PhotoType } from '../Models/photo.model';
// import { Profile, ProfileDocument } from '../Models/profile.model';

// // @Injectable()
// // export class VerifyService {
// //   constructor(
// //     @InjectModel(Profile.name)
// //     private readonly profileModel: Model<ProfileDocument>,
// //   ) {

// // faceapi.env.monkeyPatch({
// //   Canvas: canvas.Canvas as any,
// //   Image: canvas.Image as any,
// //   ImageData: canvas.ImageData as any,
// // });
// // }

// // async verifyFace(userId: string, selfieBuffer: Buffer) {
// //   // Nên optimize: chỉ load từ disk một lần ở app khởi tạo, demo thì load mỗi lần cho dễ debug
// //   await faceapi.nets.tinyFaceDetector.loadFromDisk('./models');
// //   await faceapi.nets.ssdMobilenetv1.loadFromDisk('./models');
// //   await faceapi.nets.faceRecognitionNet.loadFromDisk('./models');
// //   await faceapi.nets.faceLandmark68Net.loadFromDisk('./models');

// //   const profile = await this.profileModel.findOne({ userId });
// //   console.log("Querying profile", userId);
// //   console.log("Result profile:", profile);
// //   if (!profile || !profile.profilePicture) {
// //     return { verified: false, message: 'No profile image found' };
// //   }

// //   // Có thể định nghĩa selfieImg/profileImg là any hoặc dùng @ts-ignore
// //   // @ts-ignore
// //   const profileImg: any = await canvas.loadImage(profile.profilePicture);
// //   // @ts-ignore
// //   const selfieImg: any = await canvas.loadImage(selfieBuffer);

// //   // @ts-ignore
// //   const selfieDesc = await faceapi
// //     .detectSingleFace(selfieImg)
// //     .withFaceLandmarks()
// //     .withFaceDescriptor();

// //   // @ts-ignore
// //   const profileDesc = await faceapi
// //     .detectSingleFace(profileImg)
// //     .withFaceLandmarks()
// //     .withFaceDescriptor();

// //   if (!selfieDesc || !profileDesc) {
// //     return { verified: false, message: 'Could not detect a face from image.' };
// //   }

// //   const distance = faceapi.euclideanDistance(
// //     selfieDesc.descriptor,
// //     profileDesc.descriptor
// //   );
// //   if (distance < 0.5) {
// //     await this.profileModel.updateOne(
// //       { userId },
// //       {
// //         isVerified: true,
// //         verifiedAt: new Date(),
// //         selfieImage: selfieBuffer.toString('base64'),
// //         verifiedBadge: true,
// //       }
// //     );
// //     return { verified: true, message: 'Verification successful!' };
// //   } else {
// //     return { verified: false, message: 'Face did not match, please try again.' };
// //   }
// // }
// //}
// @Injectable()
// export class VerifyService {
//   private modelsLoaded = false;

//   constructor(
//     @InjectModel(Photo.name)
//     private readonly photoModel: Model<PhotoDocument>,
//     @InjectModel(Profile.name)
//     private readonly profileModel: Model<ProfileDocument>,
//   ) {
//     faceapi.env.monkeyPatch({
//       Canvas: canvas.Canvas as any,
//       Image: canvas.Image as any,
//       ImageData: canvas.ImageData as any,
//     });
//     this.loadModels(); // Đảm bảo load model 1 lần
//   }

//   async loadModels() {
//     if (this.modelsLoaded) return;
//     await faceapi.nets.ssdMobilenetv1.loadFromDisk('./models');
//     await faceapi.nets.faceRecognitionNet.loadFromDisk('./models');
//     await faceapi.nets.faceLandmark68Net.loadFromDisk('./models');
//     this.modelsLoaded = true;
//   }

//   // Hàm align + resize khuôn mặt về 150x150 rồi lấy descriptor
//   private async getAlignedDescriptor(img: any): Promise<Float32Array | null> {
//     const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
//     if (!detection) return null;
//     const faceBox = detection.detection.box;
//     const c = canvas.createCanvas(150, 150);
//     const ctx = c.getContext('2d');
//     ctx.drawImage(
//       img,
//       faceBox.x, faceBox.y, faceBox.width, faceBox.height,
//       0, 0, 150, 150
//     );
//     // Ép kiểu as any để tránh lỗi TNetInput
//     const alignedDesc = await faceapi.detectSingleFace(c as any).withFaceLandmarks().withFaceDescriptor();
//     if (!alignedDesc) return null;
//     return alignedDesc.descriptor;
//   }

//   async verifyFace(userId: string, selfieBuffer: Buffer) {
//     await this.loadModels();

//     // Lấy ảnh của user
//     const candidatePhotos = await this.photoModel.find({
//       userId,
//       type: { $in: [PhotoType.AVATAR, PhotoType.GALLERY] },
//       isActive: true,
//     });

//     if (!candidatePhotos.length) {
//       return { verified: false, message: 'No matching photo found (avatar/gallery)' };
//     }

//     // Load và align ảnh selfie
//     const selfieImg: any = await canvas.loadImage(selfieBuffer);
//     const selfieDesc = await this.getAlignedDescriptor(selfieImg);
//     if (!selfieDesc) {
//       return { verified: false, message: 'Could not detect a face from selfie.' };
//     }

//     let minDistance = 1;
//     let verifiedPhotoId: any = null;

//     for (const photo of candidatePhotos) {
//       try {
//         const profileImg: any = await canvas.loadImage(photo.url);
//         const profileDesc = await this.getAlignedDescriptor(profileImg);
//         if (!profileDesc) continue;
//         const distance = faceapi.euclideanDistance(selfieDesc, profileDesc);
//         if (distance < minDistance) {
//           minDistance = distance;
//           verifiedPhotoId = photo._id;
//         }
//       } catch (err) {
//         // Ignore lỗi từng ảnh gallery
//         continue;
//       }
//     }

//     const THRESHOLD = 0.45; // Bạn nên tune lại ngưỡng này cho phù hợp ảnh thật tế

//     if (minDistance < THRESHOLD && verifiedPhotoId) {
//       await this.photoModel.updateOne(
//         { _id: verifiedPhotoId },
//         { isVerified: true }
//       );
//       await this.profileModel.updateOne(
//         { userId },
//         { isVerified: true, verifiedBadge: true, verifiedAt: new Date() }
//       );
//       return {
//         verified: true,
//         message: `Verification successful! (distance: ${minDistance.toFixed(3)})`
//       };
//     }

//     return {
//       verified: false,
//       message: `Face did not match with any photo, min distance: ${minDistance.toFixed(3)}, please try again.`
//     };
//   }
// }
// // import { Injectable } from '@nestjs/common';
// // import * as faceapi from '@vladmandic/face-api';
// // import * as canvas from 'canvas';
// // import { InjectModel } from '@nestjs/mongoose';
// // import { Model } from 'mongoose';
// // import { Photo, PhotoDocument, PhotoType } from '../Models/photo.model';
// // import { Profile, ProfileDocument } from '../Models/profile.model';

// // @Injectable()
// // export class VerifyService {
// //   constructor(
// //     @InjectModel(Photo.name)
// //     private readonly photoModel: Model<PhotoDocument>,
// //     @InjectModel(Profile.name)
// //   private readonly profileModel: Model<ProfileDocument>,
// //   ) {
// //     faceapi.env.monkeyPatch({
// //       Canvas: canvas.Canvas as any,
// //       Image: canvas.Image as any,
// //       ImageData: canvas.ImageData as any,
// //     });
// //   }

// //   async verifyFace(userId: string, selfieBuffer: Buffer) {
// //     // Load face-api models
// //     await faceapi.nets.tinyFaceDetector.loadFromDisk('./models');
// //     await faceapi.nets.ssdMobilenetv1.loadFromDisk('./models');
// //     await faceapi.nets.faceRecognitionNet.loadFromDisk('./models');
// //     await faceapi.nets.faceLandmark68Net.loadFromDisk('./models');
  
// //     // Lấy tất cả ảnh phù hợp (avatar hoặc gallery, active, primary)
// //     const candidatePhotos = await this.photoModel.find({
// //       userId,
// //       type: { $in: [PhotoType.AVATAR, PhotoType.GALLERY] },
// //     });
  
// //     if (!candidatePhotos.length) {
// //       return { verified: false, message: 'No matching photo found (avatar/gallery)' };
// //     }
  
// //     // Nạp ảnh selfie
// //     // @ts-ignore
// //     const selfieImg: any = await canvas.loadImage(selfieBuffer);
// //     // @ts-ignore
// //     const selfieDesc = await faceapi
// //       .detectSingleFace(selfieImg)
// //       .withFaceLandmarks()
// //       .withFaceDescriptor();
// //     if (!selfieDesc) {
// //       return { verified: false, message: 'Could not detect a face from selfie.' };
// //     }
  
// //     for (const photo of candidatePhotos) {
// //       try {
// //         // @ts-ignore
// //         const profileImg: any = await canvas.loadImage(photo.url);
// //         // @ts-ignore
// //         const profileDesc = await faceapi
// //           .detectSingleFace(profileImg)
// //           .withFaceLandmarks()
// //           .withFaceDescriptor();
// //         if (!profileDesc) continue;
    
// //         const distance = faceapi.euclideanDistance(
// //           selfieDesc.descriptor,
// //           profileDesc.descriptor
// //         );
// //         if (distance < 0.3) {
// //           await this.photoModel.updateOne(
// //             { _id: photo._id },
// //             { isVerified: true }
// //           );
// //           await this.profileModel.updateOne(
// //             { userId: userId },
// //             { isVerified: true, verifiedBadge: true, verifiedAt: new Date() }
// //           );
// //           return { verified: true, message: 'Verification successful!' };
// //         }
// //       } catch (err) {
// //         continue;
// //       }
// //     }
  
// //     return { verified: false, message: 'Face did not match with any photo, please try again.' };
// //   }
// // }


// // import { Injectable } from '@nestjs/common';
// // import * as faceapi from '@vladmandic/face-api';
// // import * as canvas from 'canvas';
// // import { InjectModel } from '@nestjs/mongoose';
// // import { Model } from 'mongoose';
// // import { Profile, ProfileDocument } from '../Models/profile.model';

// // @Injectable()
// // export class VerifyService {
// //   constructor(
// //     @InjectModel(Profile.name)
// //     private readonly profileModel: Model<ProfileDocument>,
// //   ) {
// //     faceapi.env.monkeyPatch({
// //       Canvas: canvas.Canvas as any,
// //       Image: canvas.Image as any,
// //       ImageData: canvas.ImageData as any,
// //     });
// //   }

// //   async verifyFace(userId: string, selfieBuffer: Buffer) {
// //     // Nên optimize: chỉ load từ disk một lần ở app khởi tạo, demo thì load mỗi lần cho dễ debug
// //     await faceapi.nets.tinyFaceDetector.loadFromDisk('./models');
// //     await faceapi.nets.ssdMobilenetv1.loadFromDisk('./models');
// //     await faceapi.nets.faceRecognitionNet.loadFromDisk('./models');
// //     await faceapi.nets.faceLandmark68Net.loadFromDisk('./models');

// //     const profile = await this.profileModel.findOne({ userId });
// //     console.log("Querying profile", userId);
// //     console.log("Result profile:", profile);
// //     // Đảm bảo có ít nhất 1 trong 2 trường
// //     if (!profile || (!profile.profilePicture && !profile.avatar)) {
// //       return { verified: false, message: 'No profile image found' };
// //     }

// //     // Load selfie
// //     // @ts-ignore
// //     const selfieImg: any = await canvas.loadImage(selfieBuffer);

// //     // @ts-ignore
// //     const selfieDesc = await faceapi
// //       .detectSingleFace(selfieImg)
// //       .withFaceLandmarks()
// //       .withFaceDescriptor();

// //     if (!selfieDesc) {
// //       return { verified: false, message: 'Could not detect a face from selfie.' };
// //     }

// //     let verified = false;
// //     let compareResults: { source: string; distance: number }[] = [];

// //     // So sánh với avatar nếu có
// //     if (profile.avatar) {
// //       // @ts-ignore
// //       const avatarImg: any = await canvas.loadImage(profile.avatar);
// //       // @ts-ignore
// //       const avatarDesc = await faceapi
// //         .detectSingleFace(avatarImg)
// //         .withFaceLandmarks()
// //         .withFaceDescriptor();

// //       if (avatarDesc) {
// //         const distance = faceapi.euclideanDistance(
// //           selfieDesc.descriptor,
// //           avatarDesc.descriptor
// //         );
// //         compareResults.push({ source: "avatar", distance });
// //         if (distance < 0.5) verified = true;
// //       }
// //     }

// //     // So sánh với profilePicture nếu có
// //     if (profile.profilePicture) {
// //       // @ts-ignore
// //       const profileImg: any = await canvas.loadImage(profile.profilePicture);
// //       // @ts-ignore
// //       const profileDesc = await faceapi
// //         .detectSingleFace(profileImg)
// //         .withFaceLandmarks()
// //         .withFaceDescriptor();

// //       if (profileDesc) {
// //         const distance = faceapi.euclideanDistance(
// //           selfieDesc.descriptor,
// //           profileDesc.descriptor
// //         );
// //         compareResults.push({ source: "profilePicture", distance });
// //         if (distance < 0.5) verified = true;
// //       }
// //     }

// //     if (verified) {
// //       await this.profileModel.updateOne(
// //         { userId },
// //         {
// //           isVerified: true,
// //           verifiedAt: new Date(),
// //           selfieImage: selfieBuffer.toString('base64'),
// //           verifiedBadge: true,
// //         }
// //       );
// //       return {
// //         verified: true,
// //         message: 'Verification successful!',
// //         compareResults
// //       };
// //     } else {
// //       return {
// //         verified: false,
// //         message: 'Face did not match, please try again.',
// //         compareResults
// //       };
// //     }
// //   }
// // }