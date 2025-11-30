export interface MessageDTO {
    matchId: string;
    senderId: string;
    message?: string;
    audioPath?: string;
    duration?: number;
    timestamp?: Date;
  }