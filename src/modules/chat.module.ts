import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatController } from 'src/Controllers/chat.controller';
import { UploadAudioController } from 'src/Controllers/upload-audio.controller';
import { MediaController } from 'src/Controllers/upload-img.controller';
import { Message, MessageSchema } from 'src/Models/message.model';
import { ChatService } from 'src/Services/chat.service';
import { CloudinaryService } from 'src/Services/cloudinary.service';


@Module({
  imports: [
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }])
  ],
  controllers: [ChatController, UploadAudioController,MediaController],
  providers: [ChatService, CloudinaryService],
  exports: [ChatService, CloudinaryService],
})
export class ChatModule {}