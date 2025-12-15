export interface MessageDTO {
    matchId: string;
    senderId: string;
    message?: string;
    audioPath?: string;
    imgChat?: string;
    duration?: number;
    timestamp?: Date;
    delivered?: boolean;
    clientMessageId?: string;
  replyToMessageId?: string;
  replyToClientMessageId?: string;
  replyToTimestamp?: Date | string;
  replyPreview?: string;
  replySenderId?: string;
  replySenderName?: string;
  reaction?: string;
  }