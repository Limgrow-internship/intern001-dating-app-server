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
  ) {}

  afterInit(server: Server) {
    console.log('========================================');
    console.log('WebSocket Gateway initialized');
    console.log('Namespace: /chat');
    console.log('CORS origins:', process.env.NODE_ENV === 'production' 
      ? ['https://intern001-dating-app-server.limgrow.com']
      : '*');
    console.log('Transports: websocket, polling');
    console.log('========================================');
  }

  handleConnection(client: Socket) {
    console.log('========================================');
    console.log(`Client connected: ${client.id}`);
    console.log(`Origin: ${client.handshake.headers.origin || 'N/A'}`);
    console.log(`Transport: ${client.conn.transport.name}`);
    console.log(`User-Agent: ${client.handshake.headers['user-agent'] || 'N/A'}`);
    console.log(`Query:`, client.handshake.query);
    console.log(`Auth:`, client.handshake.auth);
    console.log('========================================');
  }

  handleDisconnect(client: Socket) {
    console.log('========================================');
    console.log(`Client disconnected: ${client.id}`);
    console.log(`Transport was: ${client.conn.transport.name}`);
    console.log('========================================');
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @MessageBody() data: { matchId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log('========================================');
    console.log(`join_room event received`);
    console.log(`Client ID: ${client.id}`);
    console.log(`Match ID: ${data.matchId}`);
    
    try {
      client.join(data.matchId);
      console.log(`Client ${client.id} joined room: ${data.matchId}`);
      
      const history = await this.chatService.getMessages(data.matchId);
      console.log(`Found ${history.length} messages in history`);
      
      client.emit('chat_history', history);
      console.log(`Sent chat_history to client ${client.id}`);
    } catch (error) {
      console.error('Error in join_room:', error);
    }
    console.log('========================================');
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
    console.log('========================================');
    console.log(`send_message event received`);
    console.log(`Client ID: ${client.id}`);
    console.log(`Sender ID: ${data.senderId}`);
    console.log(`Match ID: ${data.matchId}`);
    console.log(`Message: ${data.message || '[No text]'}`);
    console.log(`Image: ${data.imgChat || '[No image]'}`);
    console.log(`Audio: ${data.audioPath || '[No audio]'}`);
    
    const msgObj = {
      senderId: data.senderId,
      message: data.message,
      audioPath: data.audioPath,
      duration: data.duration,
      imgChat: data.imgChat,
      timestamp: new Date(),
      matchId: data.matchId,
    };
    
    try {
      // Save user message
      await this.chatService.sendMessage(msgObj);
      console.log(`Message saved to database`);
      
      this.server.to(data.matchId).emit('receive_message', msgObj);
      console.log(`Message broadcasted to room: ${data.matchId}`);

      // Check if this is an AI conversation and user sent a text message
      const isAI = await this.chatService.isAIConversation(data.matchId);
      console.log(`Is AI conversation: ${isAI}`);
      
      if (isAI && data.message && data.senderId !== AI_ASSISTANT_USER_ID) {
        console.log(`Triggering AI response generation...`);
        // Generate AI response asynchronously
        this.generateAIResponse(data.matchId, data.senderId, data.message).catch(
          (error) => {
            console.error('Error generating AI response:', error);
          }
        );
      } else {
        console.log(`Skipping AI response (isAI: ${isAI}, hasMessage: ${!!data.message}, isFromAI: ${data.senderId === AI_ASSISTANT_USER_ID})`);
      }
    } catch (error) {
      console.error('Error in send_message:', error);
    }
    console.log('========================================');
  }

  /**
   * Generate and send AI response
   */
  private async generateAIResponse(
    matchId: string,
    userId: string,
    userMessage: string,
  ): Promise<void> {
    console.log('========================================');
    console.log(`Generating AI response`);
    console.log(`Match ID: ${matchId}`);
    console.log(`User ID: ${userId}`);
    console.log(`User message: ${userMessage}`);
    
    try {
      // Get conversation history for context
      const history = await this.chatService.getConversationHistoryForAI(matchId, 10);
      const context = history.join('\n');
      console.log(`Context history (${history.length} messages):`);
      console.log(context.substring(0, 200) + (context.length > 200 ? '...' : ''));

      // Build prompt for AI
      const systemPrompt = `You are a friendly AI assistant in a dating app. Help users with dating advice, conversation tips, profile improvement, and general questions. Be warm, supportive, and conversational. Keep responses concise (2-3 sentences max).`;

      const prompt = context
        ? `${context}\n\nUser: ${userMessage}\nAI:`
        : `User: ${userMessage}\nAI:`;

      console.log(`Calling AI router...`);
      
      // Generate AI response
      const aiResponse = await this.aiRouter.generate({
        prompt,
        systemPrompt,
        temperature: 0.8,
        maxTokens: 200,
      });

      // Log AI provider and model information
      console.log('========================================');
      console.log('AI Response received');
      console.log('AI Provider used:', aiResponse.provider);
      console.log('AI Model used:', aiResponse.model);
      console.log('AI Response latency:', aiResponse.latency, 'ms');
      if (aiResponse.tokensUsed) {
        console.log('AI Tokens used:', aiResponse.tokensUsed);
      }
      console.log('Response:', aiResponse.text.substring(0, 100) + (aiResponse.text.length > 100 ? '...' : ''));

      // Save and send AI response
      const aiMsgObj = {
        senderId: AI_ASSISTANT_USER_ID,
        message: aiResponse.text.trim(),
        timestamp: new Date(),
        matchId: matchId,
      };

      await this.chatService.sendMessage(aiMsgObj);
      console.log(`AI message saved to database`);
      
      this.server.to(matchId).emit('receive_message', aiMsgObj);
      console.log(`AI message broadcasted to room: ${matchId}`);
      console.log('========================================');
    } catch (error) {
      console.error('========================================');
      console.error('Failed to generate AI response:', error);
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
      console.error('========================================');
      throw error;
    }
  }
  
  emitMessageToRoom(matchId: string, msg: any) {
    console.log(`Emitting message to room: ${matchId}`);
    this.server.to(matchId).emit('receive_message', msg);
  }
} 