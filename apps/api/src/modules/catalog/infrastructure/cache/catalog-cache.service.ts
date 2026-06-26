import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import { RedisService } from '../../../../infrastructure/redis/redis.service.js';
import type { PublicProductQueryDto } from '../../application/dto/product/public-product-query.dto.js';

type CacheEnvelope<T> = {
  version: 1;
  value: T;
};

type CacheLookup<T> =
  | {
      hit: true;
      value: T;
    }
  | {
      hit: false;
    };

@Injectable()
export class CatalogCacheService {
  private readonly logger = new Logger(CatalogCacheService.name);

  private readonly enabled: boolean;

  private readonly categoryTtl: number;

  private readonly productListTtl: number;

  private readonly productDetailTtl: number;

  private readonly lockTtl: number;

  /*
   * Chống nhiều request cùng process gọi loader
   * cho cùng một cache key.
   */
  private readonly localFlights = new Map<string, Promise<unknown>>();

  private static readonly CATEGORY_GENERATION_KEY =
    'catalog:generation:categories';

  private static readonly PRODUCT_GENERATION_KEY =
    'catalog:generation:products';

  constructor(
    private readonly redis: RedisService,

    configService: ConfigService,
  ) {
    this.enabled = configService.get<boolean>('CATALOG_CACHE_ENABLED', true);

    this.categoryTtl = configService.get<number>(
      'CATALOG_CATEGORY_CACHE_TTL_SECONDS',
      300,
    );

    this.productListTtl = configService.get<number>(
      'CATALOG_PRODUCT_LIST_CACHE_TTL_SECONDS',
      60,
    );

    this.productDetailTtl = configService.get<number>(
      'CATALOG_PRODUCT_DETAIL_CACHE_TTL_SECONDS',
      300,
    );

    this.lockTtl = configService.get<number>(
      'CATALOG_CACHE_LOCK_TTL_MS',
      5_000,
    );
  }

  async getPublicCategories<T>(loader: () => Promise<T>): Promise<T> {
    if (!this.enabled) {
      return loader();
    }

    const generation = await this.getGeneration(
      CatalogCacheService.CATEGORY_GENERATION_KEY,
    );

    const cacheKey = `catalog:v1:categories:${generation}`;

    return this.getOrSet(
      cacheKey,
      this.withJitter(this.categoryTtl, 30),
      loader,
    );
  }

  async getPublicProductList<T>(
    query: PublicProductQueryDto,
    loader: () => Promise<T>,
  ): Promise<T> {
    if (!this.enabled) {
      return loader();
    }

    const generation = await this.getGeneration(
      CatalogCacheService.PRODUCT_GENERATION_KEY,
    );

    const queryHash = this.createProductQueryHash(query);

    const cacheKey = ['catalog:v1:products:list', generation, queryHash].join(
      ':',
    );

    return this.getOrSet(
      cacheKey,
      this.withJitter(this.productListTtl, 15),
      loader,
    );
  }

  async getPublicProductDetail<T>(
    slug: string,
    loader: () => Promise<T>,
  ): Promise<T> {
    if (!this.enabled) {
      return loader();
    }

    const generation = await this.getGeneration(
      CatalogCacheService.PRODUCT_GENERATION_KEY,
    );

    const normalizedSlug = slug.trim().toLowerCase();

    const cacheKey = [
      'catalog:v1:products:detail',
      generation,
      normalizedSlug,
    ].join(':');

    return this.getOrSet(
      cacheKey,
      this.withJitter(this.productDetailTtl, 30),
      loader,
    );
  }

  async invalidateProducts(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const invalidated = await this.redis.set(
      CatalogCacheService.PRODUCT_GENERATION_KEY,
      randomUUID(),
    );

    if (!invalidated) {
      this.logger.warn('Product catalog cache invalidation failed');
    }
  }

  async invalidateCategoriesAndProducts(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const invalidated = await this.redis.setMany({
      [CatalogCacheService.CATEGORY_GENERATION_KEY]: randomUUID(),

      [CatalogCacheService.PRODUCT_GENERATION_KEY]: randomUUID(),
    });

    if (!invalidated) {
      this.logger.warn(
        'Category and product catalog cache invalidation failed',
      );
    }
  }

  private async getOrSet<T>(
    cacheKey: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    const initial = await this.read<T>(cacheKey);

    if (initial.hit) {
      return initial.value;
    }

    const existingFlight = this.localFlights.get(cacheKey) as
      | Promise<T>
      | undefined;

    if (existingFlight) {
      return existingFlight;
    }

    const flight = this.loadAndCache(cacheKey, ttlSeconds, loader);

    this.localFlights.set(cacheKey, flight);

    try {
      return await flight;
    } finally {
      this.localFlights.delete(cacheKey);
    }
  }

  private async loadAndCache<T>(
    cacheKey: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    /*
     * Double-check sau khi request đầu tiên
     * có thể đã ghi cache.
     */
    const secondLookup = await this.read<T>(cacheKey);

    if (secondLookup.hit) {
      return secondLookup.value;
    }

    const lockKey = `${cacheKey}:lock`;

    const lockToken = await this.redis.acquireLock(lockKey, this.lockTtl);

    if (!lockToken) {
      const valueFromOtherRequest = await this.waitForCachedValue<T>(cacheKey);

      if (valueFromOtherRequest.hit) {
        return valueFromOtherRequest.value;
      }

      /*
       * Redis không khả dụng hoặc lock holder quá chậm.
       * Fail-open bằng cách query database.
       */
      return loader();
    }

    try {
      const afterLock = await this.read<T>(cacheKey);

      if (afterLock.hit) {
        return afterLock.value;
      }

      const value = await loader();

      const envelope: CacheEnvelope<T> = {
        version: 1,
        value,
      };

      await this.redis.set(cacheKey, JSON.stringify(envelope), ttlSeconds);

      return value;
    } finally {
      await this.redis.releaseLock(lockKey, lockToken);
    }
  }

  private async waitForCachedValue<T>(
    cacheKey: string,
  ): Promise<CacheLookup<T>> {
    const delays = [40, 80, 120, 160];

    for (const delay of delays) {
      await this.sleep(delay);

      const lookup = await this.read<T>(cacheKey);

      if (lookup.hit) {
        return lookup;
      }
    }

    return {
      hit: false,
    };
  }

  private async read<T>(cacheKey: string): Promise<CacheLookup<T>> {
    const raw = await this.redis.get(cacheKey);

    if (raw === null) {
      return {
        hit: false,
      };
    }

    try {
      const parsed = JSON.parse(raw) as CacheEnvelope<T>;

      if (parsed.version !== 1) {
        await this.redis.delete(cacheKey);

        return {
          hit: false,
        };
      }

      return {
        hit: true,
        value: parsed.value,
      };
    } catch {
      await this.redis.delete(cacheKey);

      return {
        hit: false,
      };
    }
  }

  private async getGeneration(generationKey: string): Promise<string> {
    return (
      (await this.redis.getOrCreateToken(generationKey)) ?? 'redis-unavailable'
    );
  }

  private createProductQueryHash(query: PublicProductQueryDto): string {
    const normalized = {
      page: query.page,
      limit: query.limit,

      search: query.search?.trim().toLowerCase() ?? '',

      categorySlug: query.categorySlug?.trim().toLowerCase() ?? '',

      sort: query.sort ?? 'newest',
    };

    return createHash('sha256')
      .update(JSON.stringify(normalized))
      .digest('base64url')
      .slice(0, 24);
  }

  private withJitter(ttlSeconds: number, maximumJitter: number): number {
    const jitter = Math.floor(Math.random() * (maximumJitter + 1));

    return ttlSeconds + jitter;
  }

  private sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }
}
