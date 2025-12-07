import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from 'src/Services/chat.service';
import { AIRouterService } from 'src/Services/ai-router.service';
import { AI_ASSISTANT_USER_ID } from 'src/common/constants';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@WebSocketGateway({
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? ['https://intern001-dating-app-server.limgrow.com', 'https://*.limgrow.com']
      : '*',
    credentials: true
  },
  namespace: '/chat',
  transports: ['websocket', 'polling'],
  allowEIO3: true
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly aiRouter: AIRouterService,
    @InjectModel('Profile')
    private readonly profileModel: Model<any>,
  ) {}

  afterInit(server: Server) {
  }

  handleConnection(client: Socket) {
  }

  handleDisconnect(client: Socket) {
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @MessageBody() data: { matchId: string, userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      client.join(data.matchId);
      const history = await this.chatService.getMessages(data.matchId, data.userId);
      client.emit('chat_history', history);
    } catch (error) {
      console.error('Error in join_room:', error.message);
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody()
    data: {
      matchId: string;
      senderId: string;
      message?: string;
      audioPath?: string;
      duration?: number;
      imgChat?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    let delivered = true;
  const match = await this.chatService.getMatchById(data.matchId);
  if (match && match.status === 'blocked') {
    if (match.blockerId !== data.senderId) {
      delivered = false;
    }
  }
    const msgObj = {
      senderId: data.senderId,
      message: data.message,
      audioPath: data.audioPath,
      duration: data.duration,
      imgChat: data.imgChat,
      timestamp: new Date(),
      matchId: data.matchId,
      delivered,
    };

    try {
      const result = await this.chatService.sendMessage(msgObj);
      const match = await this.chatService.getMatchById(data.matchId);

      if (match && match.status === 'blocked') {
        if (match.blockerId !== data.senderId) {
          client.emit('receive_message', msgObj); // chỉ gửi về cho sender
          return;
        }
      
        return;
      }

      this.server.to(data.matchId).emit('receive_message', msgObj);

      const isAI = await this.chatService.isAIConversation(data.matchId);
      if (isAI && data.message && data.senderId !== AI_ASSISTANT_USER_ID) {
        this.generateAIResponse(data.matchId, data.senderId, data.message).catch(
          (error) => {
            console.error('Error generating AI response:', error.message);
          }
        );
      }
    } catch (error) {
      console.error('Error in send_message:', error.message);
    }
  }

  /**
   * Generate and send AI response
   */
  private async generateAIResponse(
    matchId: string,
    userId: string,
    userMessage: string,
  ): Promise<void> {
    try {
      const aiProfile = await this.profileModel.findOne({ 
        userId: AI_ASSISTANT_USER_ID 
      }).lean() as any;
      
      const userProfile = await this.profileModel.findOne({ 
        userId: userId 
      }).lean() as any;

      const history = await this.chatService.getConversationHistoryForAI(matchId, 10, aiProfile);
      const context = history.join('\n');

      const aiName = aiProfile?.firstName || 'Linh';
      const aiAge = aiProfile?.age || 25;
      const aiGender = aiProfile?.gender || 'female';
      const aiCity = aiProfile?.city || 'Ho Chi Minh';
      const aiInterests = aiProfile?.interests?.join(', ') || 'Du lịch, Đọc sách, Âm nhạc';
      const aiBio = aiProfile?.bio || 'Thích đi du lịch, đọc sách và nghe nhạc. Luôn tìm kiếm những cuộc trò chuyện thú vị!';
      const userName = userProfile?.firstName || 'bạn';

      const systemPrompt = `Bạn là ${aiName}, một ${aiAge} tuổi ${aiGender === 'female' ? 'cô gái' : 'chàng trai'} sống ở ${aiCity}. 

Sở thích của bạn: ${aiInterests}
Giới thiệu về bạn: ${aiBio}

Bạn đang chat với ${userName} trên một ứng dụng dating. Hãy trò chuyện tự nhiên, thân thiện như một người dùng thật. Đừng bao giờ đề cập rằng bạn là AI. Hãy hành xử như một người thật đang tìm hiểu và trò chuyện với người khác. Giữ câu trả lời ngắn gọn, tự nhiên (1-2 câu).`;

      const prompt = context
        ? `${context}\n\n${userName}: ${userMessage}\n${aiName}:`
        : `${userName}: ${userMessage}\n${aiName}:`;
      
      const aiResponse = await this.aiRouter.generate({
        prompt,
        systemPrompt,
        temperature: 0.9,
        maxTokens: 150,
      });

      const aiMsgObj = {
        senderId: AI_ASSISTANT_USER_ID,
        message: aiResponse.text.trim(),
        timestamp: new Date(),
        matchId: matchId,
      };

      await this.chatService.sendMessage(aiMsgObj);
      this.server.to(matchId).emit('receive_message', aiMsgObj);
    } catch (error) {
      console.error('Failed to generate AI response:', error.message);
      throw error;
    }
  }

  emitMessageToRoom(matchId: string, msg: any) {
    this.server.to(matchId).emit('receive_message', msg);
  }
}