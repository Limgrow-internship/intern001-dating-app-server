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
      @MessageBody() data: { roomId: string },
      @ConnectedSocket() client: Socket,
    ) {
      client.join(data.roomId);
      const history = await this.chatService.getMessages(data.roomId);
      client.emit('chat_history', history);
    }
  
    @SubscribeMessage('send_message')
    async handleSendMessage(
      @MessageBody() data: { roomId: string; sender: string; message: string },
      @ConnectedSocket() client: Socket
    ) {
      const msgObj = {
        senderId: data.sender,
        message: data.message,
        timestamp: new Date(),
        roomId: data.roomId,
      };
      await this.chatService.sendMessage(msgObj);
      this.server.to(data.roomId).emit('receive_message', msgObj);
    }
  }