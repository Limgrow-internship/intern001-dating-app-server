import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { Profile, ProfileSchema } from '../Models/profile.model';
import { Swipe, SwipeSchema } from '../Models/swipe.model';
import { Match, MatchSchema } from '../Models/match.model';
import { Conversation, ConversationSchema } from '../Models/conversation.model';
import { BlockedUser, BlockedUserSchema } from '../Models/blocked-user.model';
import { DailyLimit, DailyLimitSchema } from '../Models/daily-limit.model';
import { Preference, PreferenceSchema } from '../Models/preference.model';
import { ProfileService } from '../Services/profile.service';
import { ProfileController } from '../Controllers/profile.controller';
import { JwtAuthGuard } from '../Guards/jwt-auth.guard';
// import { VerifyController } from '../Controllers/verify.controller';
// import { VerifyService } from '../Services/verify.service';
import { PhotoModule } from './photo.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Profile.name, schema: ProfileSchema },
      { name: Swipe.name, schema: SwipeSchema },
      { name: Match.name, schema: MatchSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: BlockedUser.name, schema: BlockedUserSchema },
      { name: DailyLimit.name, schema: DailyLimitSchema },
      { name: Preference.name, schema: PreferenceSchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    PhotoModule,
  ],
  controllers: [ProfileController,
    // VerifyController
  ],
  providers: [ProfileService, JwtAuthGuard,
    // VerifyService
  ],
  exports: [ProfileService, MongooseModule],
})
export class ProfileModule { }