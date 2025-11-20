import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Profile, ProfileDocument } from '../Models/profile.model';

/**
 * Migration script to sync profilePicture to photos array
 * Run this once to migrate existing data
 */
export class ProfilePictureMigration {
  constructor(
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
  ) {}

  async migrate() {
    console.log('Starting profile picture migration...');

    // Find all users with profilePicture but empty/missing photos array
    const usersToMigrate = await this.profileModel.find({
      profilePicture: { $exists: true, $ne: null },
      $or: [
        { photos: { $exists: false } },
        { photos: { $size: 0 } },
        { photos: null },
      ],
    });

    console.log(`Found ${usersToMigrate.length} users to migrate`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const user of usersToMigrate) {
      try {
        // Set photos array to contain profilePicture
        if (user.profilePicture) {
          user.photos = [user.profilePicture];
          await user.save();
          migratedCount++;

          if (migratedCount % 100 === 0) {
            console.log(`Migrated ${migratedCount}/${usersToMigrate.length} users...`);
          }
        }
      } catch (error) {
        console.error(`Error migrating user ${user.userId}:`, error);
        errorCount++;
      }
    }

    console.log('\n=== Migration Complete ===');
    console.log(`Successfully migrated: ${migratedCount} users`);
    console.log(`Errors: ${errorCount} users`);
    console.log(`Total processed: ${usersToMigrate.length} users`);
  }
}

// Bootstrap and run migration
async function runMigration() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const profileModel = app.get('ProfileModel');
  const migration = new ProfilePictureMigration(profileModel);

  await migration.migrate();

  await app.close();
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  runMigration().catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}
