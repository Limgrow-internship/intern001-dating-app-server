import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Profile, ProfileSchema } from '../Models/profile.model';
import { Swipe, SwipeSchema } from '../Models/swipe.model';
import { Match, MatchSchema } from '../Models/match.model';
import { Preference, PreferenceSchema } from '../Models/preference.model';
import { RecommendationService } from '../Services/recommendation.service';
import { MatchService } from '../Services/match.service';
import { PreferenceService } from '../Services/preference.service';
import { RecommendationController } from '../Controllers/recommendation.controller';
import { MatchController } from '../Controllers/match.controller';
import { PreferenceController } from '../Controllers/preference.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Profile.name, schema: ProfileSchema },
      { name: Swipe.name, schema: SwipeSchema },
      { name: Match.name, schema: MatchSchema },
      { name: Preference.name, schema: PreferenceSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    RecommendationController,
    MatchController,
    PreferenceController,
  ],
  providers: [RecommendationService, MatchService, PreferenceService],
  exports: [RecommendationService, MatchService, PreferenceService],
})
export class RecommendationModule { }
