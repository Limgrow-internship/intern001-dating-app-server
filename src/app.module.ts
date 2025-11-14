import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { databaseConfig } from './config/database.config';

import { AuthModule } from './modules/auth.modules';
import { UserModule } from './modules/user.modules';
import { ProfileModule } from './modules/profile.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({ useFactory: databaseConfig }),

    AuthModule,
    UserModule,
    ProfileModule,
  ],
})
export class AppModule { }
