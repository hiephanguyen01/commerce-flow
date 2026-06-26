import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import { REDIS_CLIENT } from './redis.constants.js';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly client: Redis,
  ) {}

  onModuleInit(): void {
    this.client.on('error', (error: Error) => {
      this.logger.warn(`Redis error: ${error.message}`);
    });

    this.client.on('ready', () => {
      this.logger.log('Redis connection is ready');
    });

    if (this.client.status === 'wait') {
      void this.client.connect().catch((error: unknown) => {
        this.logger.warn(
          `Redis initial connection failed: ${this.getErrorMessage(error)}`,
        );
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status === 'ready') {
      await this.client.quit();
      return;
    }

    this.client.disconnect();
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      this.logFailure('GET', key, error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    try {
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }

      return true;
    } catch (error) {
      this.logFailure('SET', key, error);
      return false;
    }
  }

  async setIfAbsent(
    key: string,
    value: string,
    ttlMilliseconds: number,
  ): Promise<boolean> {
    try {
      const result = await this.client.set(
        key,
        value,
        'PX',
        ttlMilliseconds,
        'NX',
      );

      return result === 'OK';
    } catch (error) {
      this.logFailure('SET NX', key, error);

      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      await this.client.del(key);

      return true;
    } catch (error) {
      this.logFailure('DEL', key, error);
      return false;
    }
  }

  async setMany(entries: Record<string, string>): Promise<boolean> {
    const argumentsList = Object.entries(entries).flatMap(([key, value]) => [
      key,
      value,
    ]);

    if (argumentsList.length === 0) {
      return true;
    }

    try {
      await this.client.mset(...argumentsList);

      return true;
    } catch (error) {
      this.logFailure('MSET', Object.keys(entries).join(','), error);

      return false;
    }
  }

  async getOrCreateToken(key: string): Promise<string | null> {
    const existing = await this.get(key);

    if (existing) {
      return existing;
    }

    const token = randomUUID();

    try {
      await this.client.set(key, token, 'NX');

      return (await this.client.get(key)) ?? token;
    } catch (error) {
      this.logFailure('GET_OR_CREATE_TOKEN', key, error);

      return null;
    }
  }

  async acquireLock(
    key: string,
    ttlMilliseconds: number,
  ): Promise<string | null> {
    const token = randomUUID();

    const acquired = await this.setIfAbsent(key, token, ttlMilliseconds);

    return acquired ? token : null;
  }

  async releaseLock(key: string, token: string): Promise<void> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      end

      return 0
    `;

    try {
      await this.client.eval(script, 1, key, token);
    } catch (error) {
      this.logFailure('RELEASE_LOCK', key, error);
    }
  }

  private logFailure(operation: string, key: string, error: unknown): void {
    this.logger.warn(
      `Redis ${operation} failed for "${key}": ${this.getErrorMessage(error)}`,
    );
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown Redis error';
  }
}
