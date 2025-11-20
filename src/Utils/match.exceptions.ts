import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Custom exceptions for match-related errors
 */

export class MatchException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus,
  ) {
    super({ code, message, statusCode: status }, status);
  }
}

// 400 Bad Request Errors
export class SelfLikeException extends MatchException {
  constructor() {
    super(
      'LIKE_001',
      'Bạn không thể like chính mình',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class AlreadyLikedException extends MatchException {
  constructor() {
    super('LIKE_002', 'Bạn đã like người này rồi', HttpStatus.BAD_REQUEST);
  }
}

export class AlreadyMatchedException extends MatchException {
  constructor() {
    super('LIKE_003', 'Bạn đã match với người này', HttpStatus.BAD_REQUEST);
  }
}

// 403 Forbidden Errors
export class UserBlockedException extends MatchException {
  constructor() {
    super('LIKE_005', 'Bạn không thể like người này', HttpStatus.FORBIDDEN);
  }
}

export class TierNotAllowedException extends MatchException {
  constructor(feature: string) {
    super(
      'LIKE_006',
      `Tính năng ${feature} không khả dụng cho gói của bạn`,
      HttpStatus.FORBIDDEN,
    );
  }
}

// 404 Not Found Errors
export class UserNotFoundException extends MatchException {
  constructor() {
    super('LIKE_007', 'Người dùng không tồn tại', HttpStatus.NOT_FOUND);
  }
}

export class MatchNotFoundException extends MatchException {
  constructor() {
    super('MATCH_001', 'Match không tồn tại', HttpStatus.NOT_FOUND);
  }
}

// 429 Too Many Requests Errors
export class OutOfLikesException extends MatchException {
  constructor(resetAt: Date) {
    super(
      'QUOTA_001',
      `Bạn hết lượt like hôm nay. Nâng cấp gói hoặc xem quảng cáo để có thêm likes. Reset lúc: ${resetAt.toISOString()}`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

export class OutOfSuperLikesException extends MatchException {
  constructor(resetAt: Date) {
    super(
      'QUOTA_002',
      `Bạn hết lượt SuperLike hôm nay. Reset lúc: ${resetAt.toISOString()}`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

export class OutOfRewindsException extends MatchException {
  constructor(resetAt: Date) {
    super(
      'QUOTA_003',
      `Bạn hết lượt Rewind hôm nay. Reset lúc: ${resetAt.toISOString()}`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

// 500 Server Errors
export class LockTimeoutException extends MatchException {
  constructor() {
    super(
      'SYSTEM_001',
      'Lỗi hệ thống. Vui lòng thử lại',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
