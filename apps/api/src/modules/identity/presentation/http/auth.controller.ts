import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { minutes, Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { LoginDto } from '../../application/dto/login.dto.js';
import { RefreshTokenDto } from '../../application/dto/refresh-token.dto.js';
import { RegisterDto } from '../../application/dto/register.dto.js';
import { AuthService } from '../../application/services/auth.service.js';
import type { AuthenticatedUser } from '../../application/types/authenticated-user.js';
import type { RequestContext } from '../../application/types/request-context.js';
import { CurrentUser } from '../decorators/current-user.decorator.js';
import { Public } from '../decorators/public.decorator.js';

@ApiTags('authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({
    auth: {
      limit: 3,
      ttl: minutes(1),
    },
  })
  @Post('register')
  @ApiOperation({
    summary: 'Register a new account',
  })
  register(@Body() dto: RegisterDto, @Req() request: Request) {
    return this.authService.register(dto, this.getRequestContext(request));
  }

  @Public()
  @Throttle({
    auth: {
      limit: 5,
      ttl: minutes(1),
    },
  })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({
    summary: 'Login using email and password',
  })
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.authService.login(dto, this.getRequestContext(request));
  }

  @Public()
  @Throttle({
    auth: {
      limit: 20,
      ttl: minutes(1),
    },
  })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({
    summary: 'Rotate refresh token',
  })
  refresh(@Body() dto: RefreshTokenDto, @Req() request: Request) {
    return this.authService.refresh(
      dto.refreshToken,
      this.getRequestContext(request),
    );
  }

  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  logout(@Body() dto: RefreshTokenDto, @Req() request: Request) {
    return this.authService.logout(
      dto.refreshToken,
      this.getRequestContext(request),
    );
  }

  @ApiBearerAuth()
  @Get('me')
  me(
    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return {
      user,
    };
  }

  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout-all')
  logoutAll(
    @CurrentUser()
    user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.authService.logoutAll(user.id, this.getRequestContext(request));
  }

  private getRequestContext(request: Request): RequestContext {
    return {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      requestId: request.headers['x-request-id']?.toString(),
    };
  }
}
