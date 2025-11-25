import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private initialized = false;

  onModuleInit() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      // Check if already initialized
      if (admin.apps.length > 0) {
        this.initialized = true;
        this.logger.log('Firebase Admin SDK already initialized');
        return;
      }

      // Option 1: Using service account JSON (recommended for production)
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        this.initialized = true;
        this.logger.log('Firebase Admin SDK initialized with service account JSON');
        return;
      }

      // Option 2: Using service account file path
      if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        this.initialized = true;
        this.logger.log('Firebase Admin SDK initialized with service account file');
        return;
      }

      // Option 3: Using default credentials (for Google Cloud environments)
      try {
        admin.initializeApp();
        this.initialized = true;
        this.logger.log('Firebase Admin SDK initialized with default credentials');
      } catch (error) {
        this.logger.warn('Firebase Admin SDK initialization skipped - no credentials found');
        this.logger.warn('Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH environment variable');
      }
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK:', error);
      this.initialized = false;
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
      const message: admin.messaging.Message = {
        token: targetFcmToken,
        data: {
          type: 'like',
          likerId: likerId,
          likerName: likerName,
          title: 'New Like!',
          message: `${likerName} liked you`,
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
      };

      const response = await admin.messaging().send(message);
      this.logger.log(`Like notification sent successfully: ${response}`);
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
      const message: admin.messaging.Message = {
        token: targetFcmToken,
        data: {
          type: 'match',
          matchId: matchId,
          matchedUserId: matchedUserId,
          matchedUserName: matchedUserName,
          title: "It's a Match! 💕",
          message: `You and ${matchedUserName} liked each other`,
          ...(matchedUserPhotoUrl && { matchedUserPhotoUrl: matchedUserPhotoUrl }),
        },
        notification: {
          title: "It's a Match! 💕",
          body: `You and ${matchedUserName} liked each other`,
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'matches',
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
      };

      const response = await admin.messaging().send(message);
      this.logger.log(`Match notification sent to ${targetUserId}: ${response}`);
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

