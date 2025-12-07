import { Module } from '@nestjs/common';
import { BlockController } from '../Controllers/block.controller';
import { BlockService } from '../Services/block.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Match, MatchSchema } from '../Models/match.model';
import { Profile, ProfileSchema } from '../Models/profile.model';
import { AuthModule } from './auth.modules'; 

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Match.name, schema: MatchSchema },
      { name: Profile.name, schema: ProfileSchema }
    ]),
    AuthModule,
  ],
  controllers: [BlockController],
  providers: [BlockService],
  exports: [BlockService],
})
export class BlockModule {}