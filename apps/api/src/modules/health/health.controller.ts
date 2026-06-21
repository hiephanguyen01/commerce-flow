import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { Public } from '../identity/presentation/decorators/public.decorator.js';
import { SkipThrottle } from '@nestjs/throttler/dist/throttler.decorator.js';

@ApiTags('health')
@Controller('health')
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('live')
  @ApiOperation({ summary: 'Check whether the API process is alive' })
  checkLiveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Check whether API dependencies are ready' })
  async checkReadiness() {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      status: 'ready',
      dependencies: {
        database: 'up',
      },
      timestamp: new Date().toISOString(),
    };
  }
}
