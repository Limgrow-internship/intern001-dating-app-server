import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as admin from 'firebase-admin';
import { Profile, ProfileDocument } from '../Models/profile.model';

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private initialized = false;
  private chatCooldown = new Map<string, number>();

  constructor(
    @InjectModel(Profile.name)
    private profileModel: Model<ProfileDocument>,
  ) {}

  onModuleInit() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      this.logger.log('Initializing Firebase Admin SDK...');

      // Check if already initialized
      if (admin.apps.length > 0) {
        this.logger.log('Firebase already initialized, reusing existing app');
        this.initialized = true;
        return;
      }

      // Option 1: Using service account JSON (recommended for production)
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        this.logger.log(
          `Firebase service account from FIREBASE_SERVICE_ACCOUNT env (project=${serviceAccount.project_id}, email=${serviceAccount.client_email}, key_id=${serviceAccount.private_key_id ?? 'n/a'})`,
        );
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        this.initialized = true;
        return;
      }

      // Option 2: Using service account file path
      if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        this.logger.log(
          `Firebase service account from path ${process.env.FIREBASE_SERVICE_ACCOUNT_PATH}`,
        );
        const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        this.logger.log(
          `Loaded service account (project=${serviceAccount.project_id}, email=${serviceAccount.client_email}, key_id=${serviceAccount.private_key_id ?? 'n/a'})`,
        );
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        this.initialized = true;
        return;
      }

      // Option 3: Using default credentials (for Google Cloud environments)
      try {
        this.logger.log('Trying default application credentials for Firebase');
        admin.initializeApp();
        this.initialized = true;
      } catch (error) {
        this.logger.warn('Firebase Admin SDK initialization skipped - no credentials found');
        this.logger.warn('Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH environment variable');
      }
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK:', error);
      this.initialized = false;
    }
  }

  /**
   * Generate deeplink for notifications
   */
  private getDeeplink(navigateTo: string, params: { 
    likerId?: string; 
    matchId?: string;
  }): string {
    const baseUrl = process.env.APP_DEEPLINK_BASE_URL || 'datingapp://';
    
    if (navigateTo === 'dating_mode' && params.likerId) {
      return `${baseUrl}dating/${params.likerId}`;
    }
    
    if (navigateTo === 'profile' && params.likerId) {
      return `${baseUrl}profile/${params.likerId}`;
    }
    
    if (navigateTo === 'chat' && params.matchId) {
      return `${baseUrl}chat/${params.matchId}`;
    }
    
    return `${baseUrl}home`;
  }

  /**
   * Determine navigate_to based on user mode
   */
  private getNavigateTo(userMode: string | null | undefined): 'dating_mode' | 'profile' {
    if (userMode === 'dating') {
      return 'dating_mode';
    }
    // If mode is 'friend' or null/undefined, use 'profile'
    return 'profile';
  }

  /**
   * Get click action name for Android notification
   * Sử dụng action name cố định thay vì URL
   */
  private getClickAction(type: 'like' | 'match', navigateTo?: string): string {
    if (type === 'match') {
      return 'com.intern001.dating.OPEN_CHAT';
    }
    
    // For like notification
    if (navigateTo === 'dating_mode') {
      return 'com.intern001.dating.OPEN_DATING_MODE';
    }
    
    return 'com.intern001.dating.OPEN_PROFILE';
  }

  private getChatCooldownMs(): number {
    const envVal = process.env.CHAT_FCM_COOLDOWN_MS;
    const parsed = envVal ? Number(envVal) : NaN;
    return !isNaN(parsed) && parsed >= 0 ? parsed : 30000; // default 30s
  }

  async sendChatMessageNotification(params: {
    targetUserId: string;
    targetFcmToken: string;
    senderId: string;
    senderName: string;
    matchId: string;
    messagePreview?: string;
  }): Promise<void> {
    if (!this.initialized) {
      this.logger.warn('FCM not initialized, skipping notification');
      return;
    }

    const {
      targetUserId,
      targetFcmToken,
      senderId,
      senderName,
      matchId,
      messagePreview,
    } = params;

    if (!targetFcmToken) {
      this.logger.warn(`No FCM token for user ${targetUserId}`);
      return;
    }

    try {
      const key = `${targetUserId}:${matchId}`;
      const now = Date.now();
      const cooldownMs = this.getChatCooldownMs();
      const lastSent = this.chatCooldown.get(key) || 0;
      if (now - lastSent < cooldownMs) {
        return; // within cooldown window, skip
      }

      const targetProfile = await this.profileModel.findOne({ userId: targetUserId }).select('mode');
      const userMode = targetProfile?.mode || null;

      const deeplink = this.getDeeplink('chat', { matchId });

      const message: admin.messaging.Message = {
        token: targetFcmToken,
        data: {
          type: 'chat',
          matchId,
          senderId,
          senderName,
          navigate_to: 'chat',
          userMode: userMode || 'dating',
          title: senderName,
          message: messagePreview || '[New message]',
          deeplink,
        },
        notification: {
          title: senderName,
          body: messagePreview || 'Bạn có tin nhắn mới',
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'chat',
            clickAction: 'com.intern001.dating.OPEN_CHAT',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      await admin.messaging().send(message);
      this.chatCooldown.set(key, now);
    } catch (error: any) {
      if (
        error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered'
      ) {
        this.logger.warn(`Invalid FCM token for user ${targetUserId}, should be removed`);
      } else {
        this.logger.error(`Failed to send chat message notification to ${targetUserId}:`, error);
      }
    }
  }

  async sendLikeNotification(
    targetUserId: string,
    targetFcmToken: string,
    likerId: string,
    likerName: string,
    likerPhotoUrl?: string,
  ): Promise<void> {
    if (!this.initialized) {
      this.logger.warn('FCM not initialized, skipping notification');
      return;
    }

    if (!targetFcmToken) {
      this.logger.warn(`No FCM token for user ${targetUserId}`);
      return;
    }

    try {
      // Get target user's profile to check mode
      const targetProfile = await this.profileModel.findOne({ userId: targetUserId }).select('mode');
      const userMode = targetProfile?.mode || null;
      
      // Determine navigate_to based on mode
      const navigateTo = this.getNavigateTo(userMode);
      
      // Generate deeplink
      const deeplink = this.getDeeplink(navigateTo, { likerId });

      const message: admin.messaging.Message = {
        token: targetFcmToken,
        data: {
          type: 'like',
          targetUserId: targetUserId,
          likerId: likerId, // REQUIRED - ID của user A (người like)
          likerName: likerName,
          navigate_to: navigateTo, // 'dating_mode' hoặc 'profile'
          userMode: userMode || 'dating', // Optional: để app xác nhận
          title: 'New Like!',
          message: `${likerName} liked you`,
          deeplink: deeplink,
          ...(likerPhotoUrl && { likerPhotoUrl }),
        },
        notification: {
          title: 'New Like!',
          body: `${likerName} liked you`,
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'likes',
            clickAction: this.getClickAction('like', navigateTo), // Action name cố định, không phải URL
            ...(likerPhotoUrl && {
              imageUrl: likerPhotoUrl,
            }),
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
          ...(likerPhotoUrl && {
            fcmOptions: {
              imageUrl: likerPhotoUrl,
            },
          }),
        },
        // Web push: App sẽ xử lý navigation từ data payload, không dùng link trong fcmOptions
      };

      await admin.messaging().send(message);
    } catch (error: any) {
      // Handle invalid/expired tokens gracefully
      if (
        error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered'
      ) {
        this.logger.warn(`Invalid FCM token for user ${targetUserId}, should be removed`);
        // You might want to clear the token from database here
      } else {
        this.logger.error(`Failed to send like notification to ${targetUserId}:`, error);
      }
      // Don't throw - we don't want to fail the like operation
    }
  }

  async sendMatchNotification(
    userId1: string,
    fcmToken1: string | null,
    userId2: string,
    fcmToken2: string | null,
    matchId: string,
    userName1: string,
    userName2: string,
    user1PhotoUrl?: string,
    user2PhotoUrl?: string,
  ): Promise<void> {
    if (!this.initialized) {
      this.logger.warn('FCM not initialized, skipping notification');
      return;
    }

    const notifications: Promise<void>[] = [];

    // Send to user 1
    if (fcmToken1) {
      notifications.push(
        this.sendMatchNotificationToUser(
          userId1,
          fcmToken1,
          userId2,
          userName2,
          matchId,
          user2PhotoUrl,
        ),
      );
    }

    // Send to user 2
    if (fcmToken2) {
      notifications.push(
        this.sendMatchNotificationToUser(
          userId2,
          fcmToken2,
          userId1,
          userName1,
          matchId,
          user1PhotoUrl,
        ),
      );
    }

    await Promise.allSettled(notifications);
  }

  private async sendMatchNotificationToUser(
    targetUserId: string,
    targetFcmToken: string,
    matchedUserId: string,
    matchedUserName: string,
    matchId: string,
    matchedUserPhotoUrl?: string,
  ): Promise<void> {
    try {
      // Generate deeplink to conversation
      const deeplink = this.getDeeplink('chat', { matchId });

      const message: admin.messaging.Message = {
        token: targetFcmToken,
        data: {
          type: 'match',
          targetUserId: targetUserId,
          matchId: matchId,
          conversationId: matchId, // Dùng matchId làm conversationId
          matchedUserId: matchedUserId, // REQUIRED
          matchedUserName: matchedUserName,
          navigate_to: 'chat', // REQUIRED - luôn navigate đến chat
          title: "It's a Match! 💕",
          message: `You and ${matchedUserName} liked each other — now it's time to say hi. Start your first chat!`,
          deeplink: deeplink,
          ...(matchedUserPhotoUrl && { matchedUserPhotoUrl: matchedUserPhotoUrl }),
        },
        notification: {
          title: "It's a Match!",
          body: `You and ${matchedUserName} liked each other — now it's time to say hi. Start your first chat!`,
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'matches',
            clickAction: this.getClickAction('match'), // Action name cố định, không phải URL
            ...(matchedUserPhotoUrl && {
              imageUrl: matchedUserPhotoUrl,
            }),
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
          ...(matchedUserPhotoUrl && {
            fcmOptions: {
              imageUrl: matchedUserPhotoUrl,
            },
          }),
        },
        // Web push: App sẽ xử lý navigation từ data payload, không dùng link trong fcmOptions
      };

      await admin.messaging().send(message);
    } catch (error: any) {
      if (
        error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered'
      ) {
        this.logger.warn(`Invalid FCM token for user ${targetUserId}`);
      } else {
        this.logger.error(`Failed to send match notification to ${targetUserId}:`, error);
      }
    }
  }
}

