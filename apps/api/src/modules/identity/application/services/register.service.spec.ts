import { vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { Prisma } from '../../../../generated/prisma/client.js';
import type { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { AuthService } from './auth.service.js';
import type { PasswordService } from './password.service.js';
import type { TokenService } from './token.service.js';

describe(AuthService.name, () => {
  type TransactionClientMock = {
    user: {
      create: ReturnType<
        typeof vi.fn<
          (args: { data: Record<string, unknown> }) => Promise<typeof user>
        >
      >;
    };
    refreshSession: {
      create: ReturnType<
        typeof vi.fn<
          (args: { data: Record<string, unknown> }) => Promise<undefined>
        >
      >;
    };
    authAuditLog: {
      create: ReturnType<
        typeof vi.fn<
          (args: { data: Record<string, unknown> }) => Promise<undefined>
        >
      >;
    };
  };

  const user = {
    id: '7a7e5732-8c20-4ca5-8835-64e9cd73e5c9',
    email: 'lucas@example.com',
    displayName: 'Lucas',
    role: 'CUSTOMER' as const,
  };

  const passwordService = {
    hash: vi.fn<(password: string) => Promise<string>>(),
  };
  const tokenService = {
    createRefreshToken: vi.fn<() => string>(),
    hashRefreshToken: vi.fn<(token: string) => string>(),
    signAccessToken:
      vi.fn<(userId: string, sessionId: string) => Promise<string>>(),
    getAccessTokenTtlSeconds: vi.fn<() => number>(),
    getRefreshTokenTtlSeconds: vi.fn<() => number>(),
    getRefreshTokenExpiresAt: vi.fn<() => Date>(),
  };
  const prisma = {
    $transaction:
      vi.fn<
        (
          callback: (client: TransactionClientMock) => Promise<unknown>,
        ) => Promise<unknown>
      >(),
  };
  const configService = {};

  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    passwordService.hash.mockResolvedValue('password-hash');
    tokenService.createRefreshToken.mockReturnValue('refresh-token');
    tokenService.hashRefreshToken.mockReturnValue('refresh-token-hash');
    tokenService.signAccessToken.mockResolvedValue('access-token');
    tokenService.getAccessTokenTtlSeconds.mockReturnValue(900);
    tokenService.getRefreshTokenTtlSeconds.mockReturnValue(2_592_000);
    tokenService.getRefreshTokenExpiresAt.mockReturnValue(
      new Date('2026-07-21T00:00:00.000Z'),
    );

    service = new AuthService(
      prisma as unknown as PrismaService,
      passwordService as unknown as PasswordService,
      tokenService as unknown as TokenService,
      configService as unknown as ConfigService,
    );
  });

  it('creates the user, refresh session, and audit log in one transaction', async () => {
    const tx: TransactionClientMock = {
      user: {
        create: vi
          .fn<
            (args: { data: Record<string, unknown> }) => Promise<typeof user>
          >()
          .mockResolvedValue(user),
      },
      refreshSession: {
        create: vi
          .fn<(args: { data: Record<string, unknown> }) => Promise<undefined>>()
          .mockResolvedValue(undefined),
      },
      authAuditLog: {
        create: vi
          .fn<(args: { data: Record<string, unknown> }) => Promise<undefined>>()
          .mockResolvedValue(undefined),
      },
    };
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    );

    const result = await service.register(
      {
        email: '  Lucas@Example.com ',
        password: 'a-long-secure-password',
        displayName: '  Lucas  ',
      },
      { ip: '127.0.0.1', userAgent: 'test-agent' },
    );

    expect(passwordService.hash).toHaveBeenCalledWith('a-long-secure-password');
    expect(tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          email: 'lucas@example.com',
          displayName: 'Lucas',
          passwordHash: 'password-hash',
        },
      }),
    );
    expect(tx.refreshSession.create.mock.calls[0]?.[0].data).toMatchObject({
      userId: user.id,
      tokenHash: 'refresh-token-hash',
      createdByIp: '127.0.0.1',
      userAgent: 'test-agent',
    });
    const sessionId = tx.refreshSession.create.mock.calls[0]?.[0].data.id;

    expect(typeof sessionId).toBe('string');
    expect(tx.authAuditLog.create).toHaveBeenCalledWith({
      data: {
        userId: user.id,
        sessionId,
        action: 'REGISTERED',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      },
    });
    expect(tokenService.signAccessToken).toHaveBeenCalledWith(
      user.id,
      sessionId,
    );
    expect(result).toEqual({
      user,
      tokens: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresIn: 900,
        refreshTokenExpiresIn: 2_592_000,
      },
    });
  });

  it('maps a unique constraint violation to EMAIL_ALREADY_EXISTS', async () => {
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.8.0',
        meta: { modelName: 'User', target: ['email'] },
      }),
    );

    await expect(
      service.register(
        {
          email: 'lucas@example.com',
          password: 'a-long-secure-password',
          displayName: 'Lucas',
        },
        {},
      ),
    ).rejects.toMatchObject({
      response: {
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Email is already registered',
      },
      status: 409,
    });
  });
});
