import {
    WebSocketGateway, WebSocketServer, SubscribeMessage,
    MessageBody, ConnectedSocket
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
import { MessageDTO } from 'src/DTO/message.dto';
import { ChatService } from 'src/Services/chat.service';
  
  @WebSocketGateway({ cors: { origin: '*' }, namespace: '/chat' })
  export class ChatGateway {
    @WebSocketServer() server: Server;
    constructor(private readonly chatService: ChatService) {}
  
    @SubscribeMessage('join_room')
    async handleJoinRoom(
      @MessageBody() data: { matchId: string },
      @ConnectedSocket() client: Socket,
    ) {
      client.join(data.matchId);
      const history = await this.chatService.getMessages(data.matchId);
      client.emit('chat_history', history);
    }
  
    @SubscribeMessage('send_message')
async handleSendMessage(
  @MessageBody() data: { matchId: string; senderId: string; message?: string; audioPath?: string; duration?: number },
  @ConnectedSocket() client: Socket
) {
  const msgObj = {
    senderId: data.senderId,
    message: data.message,
    audioPath: data.audioPath,
    duration: data.duration,
    timestamp: new Date(),
    matchId: data.matchId,
  };
  await this.chatService.sendMessage(msgObj);
  this.server.to(data.matchId).emit('receive_message', msgObj);
}
  }