import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatController } from 'src/Controllers/chat.controller';
import { UploadAudioController } from 'src/Controllers/upload-audio.controller';
import { MediaController } from 'src/Controllers/upload-img.controller';
import { ChatGateway } from 'src/gateways/chat.gateway';
import { Message, MessageSchema } from 'src/Models/message.model';
import { Conversation, ConversationSchema } from 'src/Models/conversation.model';
import { Profile, ProfileSchema } from 'src/Models/profile.model';
import { ChatService } from 'src/Services/chat.service';
import { CloudinaryService } from 'src/Services/cloudinary.service';
import { AIModule } from './ai.module';
import { Match, MatchSchema } from 'src/Models/match.model';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: Profile.name, schema: ProfileSchema },
      { name: Match.name, schema: MatchSchema },
    ]),
    AIModule,
  ],
  controllers: [ChatController, UploadAudioController, MediaController],
  providers: [ChatService, CloudinaryService, ChatGateway],
  exports: [ChatService, CloudinaryService, ChatGateway],
})
export class ChatModule {}