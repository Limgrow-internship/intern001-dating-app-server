import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

// Models
import { Profile, ProfileSchema } from '../Models/profile.model';
import { Match, MatchSchema } from '../Models/match.model';

// Services
import { AIRouterService } from '../Services/ai-router.service';
import { AIFeaturesService } from '../Services/ai-features.service';

// Controllers
import { AIController } from '../Controllers/ai.controller';
import { PhotoModule } from './photo.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Profile.name, schema: ProfileSchema },
      { name: Match.name, schema: MatchSchema },
    ]),
    JwtModule.register({}),
    PhotoModule,
  ],
  controllers: [AIController],
  providers: [AIRouterService, AIFeaturesService],
  exports: [AIRouterService, AIFeaturesService],
})
export class AIModule {}
