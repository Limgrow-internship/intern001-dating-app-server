import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { databaseConfig } from './config/database.config';

import { AuthModule } from './modules/auth.modules';
import { UserModule } from './modules/user.modules';
import { ProfileModule } from './modules/profile.module';
import { RecommendationModule } from './modules/recommendation.module';
import { AIModule } from './modules/ai.module';
import { PhotoModule } from './modules/photo.module';
import { ConversationModule } from './modules/conversation.module';
import { ChatModule } from './modules/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({ useFactory: databaseConfig }),

    ChatModule,
    AuthModule,
    UserModule,
    ProfileModule,
    PhotoModule,
    RecommendationModule,
    AIModule,
    ConversationModule,
  ],
})
export class AppModule { }
