import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

export type AccessTokenPayload = {
  sub: string;
  sid: string;
  typ: 'access';
};

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  createRefreshToken(): string {
    return randomBytes(32).toString('base64url');
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  signAccessToken(userId: string, sessionId: string): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: userId,
      sid: sessionId,
      typ: 'access',
    };

    return this.jwtService.signAsync(payload);
  }

  getAccessTokenTtlSeconds(): number {
    return this.configService.get<number>('JWT_ACCESS_TTL_SECONDS', 900);
  }

  getRefreshTokenTtlSeconds(): number {
    const days = this.configService.get<number>('REFRESH_TOKEN_TTL_DAYS', 30);

    return days * 24 * 60 * 60;
  }

  getRefreshTokenExpiresAt(): Date {
    return new Date(Date.now() + this.getRefreshTokenTtlSeconds() * 1000);
  }
}
