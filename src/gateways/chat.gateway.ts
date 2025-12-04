import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from 'src/Services/chat.service';
import { AIRouterService } from 'src/Services/ai-router.service';
import { AI_ASSISTANT_USER_ID } from 'src/common/constants';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/chat' })
export class ChatGateway {
  @WebSocketServer() server: Server;
  constructor(
    private readonly chatService: ChatService,
    private readonly aiRouter: AIRouterService,
  ) {}

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
    const msgObj = {
      senderId: data.senderId,
      message: data.message,
      audioPath: data.audioPath,
      duration: data.duration,
      imgChat: data.imgChat,
      timestamp: new Date(),
      matchId: data.matchId,
    };
    
    // Save user message
    await this.chatService.sendMessage(msgObj);
    this.server.to(data.matchId).emit('receive_message', msgObj);

    // Check if this is an AI conversation and user sent a text message
    const isAI = await this.chatService.isAIConversation(data.matchId);
    if (isAI && data.message && data.senderId !== AI_ASSISTANT_USER_ID) {
      // Generate AI response asynchronously
      this.generateAIResponse(data.matchId, data.senderId, data.message).catch(
        (error) => {
          console.error('Error generating AI response:', error);
        }
      );
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
      // Get conversation history for context
      const history = await this.chatService.getConversationHistoryForAI(matchId, 10);
      const context = history.join('\n');

      // Build prompt for AI
      const systemPrompt = `You are a friendly AI assistant in a dating app. Help users with dating advice, conversation tips, profile improvement, and general questions. Be warm, supportive, and conversational. Keep responses concise (2-3 sentences max).`;

      const prompt = context
        ? `${context}\n\nUser: ${userMessage}\nAI:`
        : `User: ${userMessage}\nAI:`;

      // Generate AI response
      const aiResponse = await this.aiRouter.generate({
        prompt,
        systemPrompt,
        temperature: 0.8,
        maxTokens: 200,
      });

      // Log AI provider and model information
      console.log('🤖 AI Provider used:', aiResponse.provider);
      console.log('🤖 AI Model used:', aiResponse.model);
      console.log('🤖 AI Response latency:', aiResponse.latency, 'ms');
      if (aiResponse.tokensUsed) {
        console.log('🤖 AI Tokens used:', aiResponse.tokensUsed);
      }

      // Save and send AI response
      const aiMsgObj = {
        senderId: AI_ASSISTANT_USER_ID,
        message: aiResponse.text.trim(),
        timestamp: new Date(),
        matchId: matchId,
      };

      await this.chatService.sendMessage(aiMsgObj);
      this.server.to(matchId).emit('receive_message', aiMsgObj);
    } catch (error) {
      console.error('Failed to generate AI response:', error);
      throw error;
    }
  }
  emitMessageToRoom(matchId: string, msg: any) {
    this.server.to(matchId).emit('receive_message', msg);
  }
  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }
} 