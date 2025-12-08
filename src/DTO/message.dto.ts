export interface MessageDTO {
    matchId: string;
    senderId: string;
    message?: string;
    audioPath?: string;
    imgChat?: string;
    duration?: number;
    timestamp?: Date;
    delivered?: boolean;
  }