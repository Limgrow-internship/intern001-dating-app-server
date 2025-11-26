import { Module } from '@nestjs/common';
import { ConversationController } from '../Controllers/conversation.controller';
import { ConversationService } from '../Services/conversation.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Conversation, ConversationSchema } from '../Models/conversation.model';
import { User, UserSchema } from '../Models/user.model';
import { AuthModule } from './auth.modules';
import { ProfileSchema } from 'src/Models/profile.model';
import { PhotoSchema } from 'src/Models/photo.model';

@Module({
  imports: [
    AuthModule, 
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: 'Profile', schema: ProfileSchema }, 
      { name: 'Photo', schema: PhotoSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ConversationController],
  providers: [ConversationService],
  exports: [ConversationService]
})
export class ConversationModule {}