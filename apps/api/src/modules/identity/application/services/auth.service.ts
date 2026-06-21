import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import {
  Prisma,
  SessionRevocationReason,
  UserStatus,
} from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import type { LoginDto } from '../dto/login.dto.js';
import type { RegisterDto } from '../dto/register.dto.js';
import type { AuthResponse } from '../types/auth-response.js';
import type { RequestContext } from '../types/request-context.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {}

  async register(
    dto: RegisterDto,
    context: RequestContext,
  ): Promise<AuthResponse> {
    const email = this.normalizeEmail(dto.email);
    const displayName = dto.displayName.trim();

    const passwordHash = await this.passwordService.hash(dto.password);

    const sessionId = randomUUID();
    const familyId = randomUUID();

    const refreshToken = this.tokenService.createRefreshToken();

    const refreshTokenHash = this.tokenService.hashRefreshToken(refreshToken);

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            email,
            displayName,
            passwordHash,
          },
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
          },
        });

        await tx.refreshSession.create({
          data: {
            id: sessionId,
            userId: createdUser.id,
            familyId,
            tokenHash: refreshTokenHash,
            expiresAt: this.tokenService.getRefreshTokenExpiresAt(),
            createdByIp: context.ip,
            userAgent: context.userAgent,
          },
        });

        await tx.authAuditLog.create({
          data: {
            userId: createdUser.id,
            sessionId,
            action: 'REGISTERED',
            ipAddress: context.ip,
            userAgent: context.userAgent,
          },
        });

        return createdUser;
      });

      const accessToken = await this.tokenService.signAccessToken(
        user.id,
        sessionId,
      );

      return {
        user,
        tokens: {
          accessToken,
          refreshToken,
          accessTokenExpiresIn: this.tokenService.getAccessTokenTtlSeconds(),

          refreshTokenExpiresIn: this.tokenService.getRefreshTokenTtlSeconds(),
        },
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'Email is already registered',
        });
      }

      throw error;
    }
  }

  async login(dto: LoginDto, context: RequestContext): Promise<AuthResponse> {
    const email = this.normalizeEmail(dto.email);
    const now = new Date();

    let user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      await this.passwordService.fakeVerify(dto.password);

      throw this.invalidCredentials();
    }

    if (user.status === UserStatus.DISABLED) {
      await this.passwordService.fakeVerify(dto.password);

      throw this.invalidCredentials();
    }

    if (user.lockedUntil && user.lockedUntil > now) {
      throw new HttpException(
        {
          code: 'ACCOUNT_TEMPORARILY_LOCKED',
          message: 'Account is temporarily locked',
          lockedUntil: user.lockedUntil,
        },
        HttpStatus.LOCKED,
      );
    }

    if (user.lockedUntil && user.lockedUntil <= now) {
      user = await this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          status: UserStatus.ACTIVE,
        },
      });
    }

    const passwordValid = await this.passwordService.verify(
      user.passwordHash,
      dto.password,
    );

    if (!passwordValid) {
      await this.recordFailedLogin(user.id, context);

      throw this.invalidCredentials();
    }

    const sessionId = randomUUID();
    const familyId = randomUUID();

    const refreshToken = this.tokenService.createRefreshToken();

    const refreshTokenHash = this.tokenService.hashRefreshToken(refreshToken);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          status: UserStatus.ACTIVE,
        },
      });

      await tx.refreshSession.create({
        data: {
          id: sessionId,
          userId: user.id,
          familyId,
          tokenHash: refreshTokenHash,
          expiresAt: this.tokenService.getRefreshTokenExpiresAt(),
          createdByIp: context.ip,
          userAgent: context.userAgent,
        },
      });

      await tx.authAuditLog.create({
        data: {
          userId: user.id,
          sessionId,
          action: 'LOGIN_SUCCEEDED',
          ipAddress: context.ip,
          userAgent: context.userAgent,
        },
      });
    });

    const accessToken = await this.tokenService.signAccessToken(
      user.id,
      sessionId,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
      tokens: {
        accessToken,
        refreshToken,
        accessTokenExpiresIn: this.tokenService.getAccessTokenTtlSeconds(),

        refreshTokenExpiresIn: this.tokenService.getRefreshTokenTtlSeconds(),
      },
    };
  }
  private async recordFailedLogin(
    userId: string,
    context: RequestContext,
  ): Promise<void> {
    const maxAttempts = this.configService.get<number>(
      'AUTH_MAX_FAILED_ATTEMPTS',
      5,
    );

    const lockMinutes = this.configService.get<number>(
      'AUTH_LOCK_DURATION_MINUTES',
      15,
    );

    await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          failedLoginAttempts: {
            increment: 1,
          },
        },
      });

      const shouldLock = updatedUser.failedLoginAttempts >= maxAttempts;

      if (shouldLock) {
        await tx.user.update({
          where: {
            id: userId,
          },
          data: {
            status: UserStatus.LOCKED,
            lockedUntil: new Date(Date.now() + lockMinutes * 60 * 1000),
          },
        });
      }

      await tx.authAuditLog.create({
        data: {
          userId,
          action: shouldLock ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED',
          ipAddress: context.ip,
          userAgent: context.userAgent,
        },
      });
    });
  }

  async refresh(
    rawRefreshToken: string,
    context: RequestContext,
  ): Promise<AuthResponse> {
    const tokenHash = this.tokenService.hashRefreshToken(rawRefreshToken);

    const currentSession = await this.prisma.refreshSession.findUnique({
      where: {
        tokenHash,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
            status: true,
          },
        },
      },
    });

    if (!currentSession) {
      throw this.invalidRefreshToken();
    }

    if (currentSession.revokedAt) {
      if (this.isRecentRotation(currentSession)) {
        throw new ConflictException({
          code: 'REFRESH_TOKEN_ALREADY_ROTATED',
          message: 'Refresh token was already rotated',
        });
      }

      await this.revokeTokenFamily(
        currentSession.familyId,
        currentSession.userId,
        context,
      );

      throw new UnauthorizedException({
        code: 'REFRESH_TOKEN_REUSED',
        message: 'Refresh token reuse was detected',
      });
    }

    if (currentSession.expiresAt <= new Date()) {
      throw new UnauthorizedException({
        code: 'REFRESH_TOKEN_EXPIRED',
        message: 'Refresh token has expired',
      });
    }

    if (currentSession.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException({
        code: 'ACCOUNT_NOT_ACTIVE',
        message: 'Account is not active',
      });
    }

    const nextSessionId = randomUUID();

    const nextRefreshToken = this.tokenService.createRefreshToken();

    const nextTokenHash = this.tokenService.hashRefreshToken(nextRefreshToken);

    const rotationTime = new Date();

    try {
      await this.prisma.$transaction(
        async (tx) => {
          const claimResult = await tx.refreshSession.updateMany({
            where: {
              id: currentSession.id,
              revokedAt: null,
            },
            data: {
              revokedAt: rotationTime,
              revokedReason: SessionRevocationReason.ROTATED,
              lastUsedAt: rotationTime,
            },
          });

          if (claimResult.count !== 1) {
            throw new Error('REFRESH_SESSION_ALREADY_CLAIMED');
          }

          await tx.refreshSession.create({
            data: {
              id: nextSessionId,
              userId: currentSession.userId,
              familyId: currentSession.familyId,
              tokenHash: nextTokenHash,
              expiresAt: this.tokenService.getRefreshTokenExpiresAt(),
              createdByIp: context.ip,
              userAgent: context.userAgent,
            },
          });

          await tx.refreshSession.update({
            where: {
              id: currentSession.id,
            },
            data: {
              replacedById: nextSessionId,
            },
          });

          await tx.authAuditLog.create({
            data: {
              userId: currentSession.userId,
              sessionId: nextSessionId,
              action: 'TOKEN_REFRESHED',
              ipAddress: context.ip,
              userAgent: context.userAgent,
            },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'REFRESH_SESSION_ALREADY_CLAIMED'
      ) {
        throw new ConflictException({
          code: 'REFRESH_TOKEN_ALREADY_ROTATED',
          message: 'Refresh token was already rotated',
        });
      }

      throw error;
    }

    const accessToken = await this.tokenService.signAccessToken(
      currentSession.userId,
      nextSessionId,
    );

    return {
      user: {
        id: currentSession.user.id,
        email: currentSession.user.email,
        displayName: currentSession.user.displayName,
        role: currentSession.user.role,
      },
      tokens: {
        accessToken,
        refreshToken: nextRefreshToken,
        accessTokenExpiresIn: this.tokenService.getAccessTokenTtlSeconds(),

        refreshTokenExpiresIn: this.tokenService.getRefreshTokenTtlSeconds(),
      },
    };
  }

  private isRecentRotation(session: {
    revokedReason: SessionRevocationReason | null;
    lastUsedAt: Date | null;
  }): boolean {
    if (
      session.revokedReason !== SessionRevocationReason.ROTATED ||
      !session.lastUsedAt
    ) {
      return false;
    }

    const graceSeconds = this.configService.get<number>(
      'REFRESH_REUSE_GRACE_SECONDS',
      5,
    );

    return Date.now() - session.lastUsedAt.getTime() <= graceSeconds * 1000;
  }

  private async revokeTokenFamily(
    familyId: string,
    userId: string,
    context: RequestContext,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.refreshSession.updateMany({
        where: {
          familyId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          revokedReason: SessionRevocationReason.TOKEN_REUSE,
        },
      });

      await tx.authAuditLog.create({
        data: {
          userId,
          action: 'TOKEN_REUSE_DETECTED',
          ipAddress: context.ip,
          userAgent: context.userAgent,
        },
      });
    });
  }

  async logout(
    rawRefreshToken: string,
    context: RequestContext,
  ): Promise<void> {
    const tokenHash = this.tokenService.hashRefreshToken(rawRefreshToken);

    const session = await this.prisma.refreshSession.findUnique({
      where: {
        tokenHash,
      },
    });

    if (!session) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.refreshSession.updateMany({
        where: {
          id: session.id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          revokedReason: SessionRevocationReason.LOGOUT,
        },
      });

      await tx.authAuditLog.create({
        data: {
          userId: session.userId,
          sessionId: session.id,
          action: 'LOGGED_OUT',
          ipAddress: context.ip,
          userAgent: context.userAgent,
        },
      });
    });
  }

  async logoutAll(userId: string, context: RequestContext): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.refreshSession.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          revokedReason: SessionRevocationReason.LOGOUT_ALL,
        },
      });

      await tx.authAuditLog.create({
        data: {
          userId,
          action: 'LOGGED_OUT_ALL',
          ipAddress: context.ip,
          userAgent: context.userAgent,
        },
      });
    });
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'INVALID_CREDENTIALS',
      message: 'Email or password is incorrect',
    });
  }

  private invalidRefreshToken(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'INVALID_REFRESH_TOKEN',
      message: 'Refresh token is invalid',
    });
  }
}
