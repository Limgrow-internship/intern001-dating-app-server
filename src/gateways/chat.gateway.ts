import {
    WebSocketGateway, WebSocketServer, SubscribeMessage,
    MessageBody, ConnectedSocket
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
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
      @MessageBody() data: { matchId: string; sender: string; message: string },
      @ConnectedSocket() client: Socket
    ) {
      const msgObj = {
        senderId: data.sender,
        message: data.message,
        timestamp: new Date(),
        matchId: data.matchId,
      };
      await this.chatService.sendMessage(msgObj);
      this.server.to(data.matchId).emit('receive_message', msgObj);
    }
  }