import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Profile } from '../Models/profile.model';
import { PhotoService } from '../Services/photo.service';
import { PhotoType, PhotoSource } from '../Models/photo.model';

async function migratePhotos() {
  console.log('🔄 Starting photo migration...\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  const profileModel = app.get<Model<Profile>>(getModelToken(Profile.name));
  const photoService = app.get(PhotoService);

  try {
    const profiles = await profileModel.find().exec();
    console.log(`Found ${profiles.length} profiles to migrate\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const profile of profiles) {
      try {
        console.log(`\n📸 Migrating photos for user: ${profile.userId}`);

        let photosCreated = 0;

        // Cast to any to access legacy fields from database
        const profileAny = profile as any;

        // 1. Migrate profilePicture (highest priority)
        if (profileAny.profilePicture) {
          try {
            await photoService.uploadFromUrl(
              profile.userId,
              profileAny.profilePicture,
              PhotoSource.UPLOAD,
              PhotoType.AVATAR,
            );
            console.log('  ✅ Migrated profilePicture as primary avatar');
            photosCreated++;
          } catch (error) {
            console.error('  ❌ Error migrating profilePicture:', error.message);
          }
        }

        // 2. Migrate avatar (if different from profilePicture)
        if (profileAny.avatar && profileAny.avatar !== profileAny.profilePicture) {
          try {
            const photo = await photoService.uploadFromUrl(
              profile.userId,
              profileAny.avatar,
              PhotoSource.UPLOAD,
              PhotoType.AVATAR,
            );

            // Ensure we can read the id from the returned photo and set as primary if no profilePicture
            const photoId = String((photo as any)._id);

            // Set as primary if no profilePicture
            if (!profileAny.profilePicture) {
              await photoService.setPrimaryPhoto(profile.userId, photoId);
              console.log('  ✅ Migrated avatar as primary');
            } else {
              console.log('  ✅ Migrated avatar');
            }
            photosCreated++;
          } catch (error) {
            console.error('  ❌ Error migrating avatar:', error.message);
          }
        }

        // 3. Migrate photos array
        if (profileAny.photos && profileAny.photos.length > 0) {
          console.log(`  📷 Migrating ${profileAny.photos.length} gallery photos...`);

          for (const [index, photoUrl] of profileAny.photos.entries()) {
            // Skip if already migrated
            if (
              photoUrl === profileAny.profilePicture ||
              photoUrl === profileAny.avatar
            ) {
              console.log(`  ⏭️  Skipping photo ${index + 1} (already migrated)`);
              continue;
            }

            try {
              await photoService.uploadFromUrl(
                profile.userId,
                photoUrl,
                PhotoSource.UPLOAD,
                PhotoType.GALLERY,
              );
              console.log(`  ✅ Migrated gallery photo ${index + 1}`);
              photosCreated++;
            } catch (error) {
              console.error(`  ❌ Error migrating photo ${index + 1}:`, error.message);
            }
          }
        }

        // 4. Migrate selfieImage (if exists)
        if (profileAny.selfieImage) {
          try {
            await photoService.uploadFromUrl(
              profile.userId,
              profileAny.selfieImage,
              PhotoSource.UPLOAD,
              PhotoType.SELFIE,
            );
            console.log('  ✅ Migrated selfie image');
            photosCreated++;
          } catch (error) {
            console.error('  ❌ Error migrating selfie:', error.message);
          }
        }

        if (photosCreated > 0) {
          console.log(`  ✨ Total photos migrated: ${photosCreated}`);
          successCount++;
        } else {
          console.log('  ℹ️  No photos to migrate');
        }
      } catch (error) {
        console.error(`  ❌ Error processing user ${profile.userId}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRATION COMPLETED!');
    console.log('='.repeat(60));
    console.log(`Total profiles processed: ${profiles.length}`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('='.repeat(60) + '\n');

    console.log('💡 Next steps:');
    console.log('1. Verify photos in database: db.photos.find()');
    console.log('2. Test photo endpoints: GET /api/photos');
    console.log('3. (Optional) Remove old photo fields from Profile model');
    console.log('4. (Optional) Update response DTOs to use new Photos collection\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

// Run migration
migratePhotos()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
