import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatController } from 'src/Controllers/chat.controller';
import { Message, MessageSchema } from 'src/Models/message.model';
import { ChatService } from 'src/Services/chat.service';


@Module({
  imports: [
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }])
  ],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}