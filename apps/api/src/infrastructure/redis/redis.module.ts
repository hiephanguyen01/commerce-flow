import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis.constants.js';
import { RedisService } from './redis.service.js';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,

      inject: [ConfigService],

      useFactory(configService: ConfigService): Redis {
        return new Redis(configService.getOrThrow<string>('REDIS_URL'), {
          lazyConnect: true,

          enableOfflineQueue: false,

          maxRetriesPerRequest: 1,

          retryStrategy(times) {
            return Math.min(times * 200, 2_000);
          },
        });
      },
    },

    RedisService,
  ],

  exports: [RedisService],
})
export class RedisModule {}
