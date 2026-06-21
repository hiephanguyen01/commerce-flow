import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './application/services/auth.service.js';
import { PasswordService } from './application/services/password.service.js';
import { TokenService } from './application/services/token.service.js';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy.js';
import { JwtAuthGuard } from './presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from './presentation/guards/roles.guard.js';
import { AuthController } from './presentation/http/auth.controller.js';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),

    JwtModule.registerAsync({
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),

        signOptions: {
          expiresIn: configService.get<number>('JWT_ACCESS_TTL_SECONDS', 900),

          issuer: configService.getOrThrow<string>('JWT_ISSUER'),

          audience: configService.getOrThrow<string>('JWT_AUDIENCE'),
        },
      }),
    }),
  ],

  controllers: [AuthController],

  providers: [
    AuthService,
    PasswordService,
    TokenService,
    JwtStrategy,

    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },

    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],

  exports: [AuthService, TokenService],
})
export class IdentityModule {}
