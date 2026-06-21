import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { AccessTokenPayload } from '../../application/services/token.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration: false,

      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),

      issuer: configService.getOrThrow<string>('JWT_ISSUER'),

      audience: configService.getOrThrow<string>('JWT_AUDIENCE'),
    });
  }

  async validate(payload: AccessTokenPayload) {
    if (payload.typ !== 'access') {
      throw new UnauthorizedException();
    }

    const session = await this.prisma.refreshSession.findFirst({
      where: {
        id: payload.sid,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
        user: {
          status: 'ACTIVE',
        },
      },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
          },
        },
      },
    });

    if (!session) {
      throw new UnauthorizedException({
        code: 'INVALID_SESSION',
        message: 'Session is invalid or expired',
      });
    }

    return {
      id: session.user.id,
      email: session.user.email,
      displayName: session.user.displayName,
      role: session.user.role,
      sessionId: session.id,
    };
  }
}
