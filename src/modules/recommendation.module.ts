import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Profile, ProfileSchema } from '../Models/profile.model';
import { Swipe, SwipeSchema } from '../Models/swipe.model';
import { Match, MatchSchema } from '../Models/match.model';
import { Preference, PreferenceSchema } from '../Models/preference.model';
import { BlockedUser, BlockedUserSchema } from '../Models/blocked-user.model';
import { DailyLimit, DailyLimitSchema } from '../Models/daily-limit.model';
import { Conversation, ConversationSchema } from '../Models/conversation.model';
import { User, UserSchema } from '../Models/user.model';
import { RecommendationService } from '../Services/recommendation.service';
import { MatchService } from '../Services/match.service';
import { MatchActionService } from '../Services/match-action.service';
import { DiscoveryService } from '../Services/discovery.service';
import { PreferenceService } from '../Services/preference.service';
import { RecommendationController } from '../Controllers/recommendation.controller';
import { MatchController } from '../Controllers/match.controller';
import { DiscoveryController } from '../Controllers/discovery.controller';
import { PreferenceController } from '../Controllers/preference.controller';
import { PhotoModule } from './photo.module';
import { FcmService } from '../Services/fcm.service';
import { Message, MessageSchema } from 'src/Models/message.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Profile.name, schema: ProfileSchema },
      { name: Swipe.name, schema: SwipeSchema },
      { name: Match.name, schema: MatchSchema },
      { name: Preference.name, schema: PreferenceSchema },
      { name: BlockedUser.name, schema: BlockedUserSchema },
      { name: DailyLimit.name, schema: DailyLimitSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: User.name, schema: UserSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
    PhotoModule,
  ],
  controllers: [
    RecommendationController,
    MatchController,
    DiscoveryController,
    PreferenceController,
  ],
  providers: [
    RecommendationService,
    MatchService,
    MatchActionService,
    DiscoveryService,
    PreferenceService,
    FcmService,
  ],
  exports: [
    RecommendationService,
    MatchService,
    MatchActionService,
    DiscoveryService,
    PreferenceService,
    FcmService,
  ],
})
export class RecommendationModule { }
