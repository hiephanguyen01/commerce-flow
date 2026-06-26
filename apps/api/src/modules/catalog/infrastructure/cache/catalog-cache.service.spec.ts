import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RedisService } from '../../../../infrastructure/redis/redis.service.js';
import { PublicProductSort } from '../../application/dto/product/public-product-query.dto.js';
import { CatalogCacheService } from './catalog-cache.service.js';

describe('CatalogCacheService', () => {
  const redisMock = {
    get: vi.fn<(key: string) => Promise<string | null>>(),
    set: vi.fn<
      (key: string, value: string, ttlSeconds?: number) => Promise<boolean>
    >(),
    setMany: vi.fn<(entries: Record<string, string>) => Promise<boolean>>(),
    delete: vi.fn<(key: string) => Promise<boolean>>(),
    getOrCreateToken: vi.fn<(key: string) => Promise<string | null>>(),
    acquireLock:
      vi.fn<(key: string, ttlMilliseconds: number) => Promise<string | null>>(),
    releaseLock: vi.fn<(key: string, token: string) => Promise<void>>(),
  };

  const configMock = {
    get: vi.fn((key: string, fallback: unknown) => fallback),
  };

  let service: CatalogCacheService;

  beforeEach(() => {
    vi.clearAllMocks();

    redisMock.getOrCreateToken.mockResolvedValue('generation-1');

    redisMock.acquireLock.mockResolvedValue('lock-token');

    redisMock.set.mockResolvedValue(true);

    redisMock.setMany.mockResolvedValue(true);

    service = new CatalogCacheService(
      redisMock as unknown as RedisService,

      configMock as unknown as ConfigService,
    );
  });

  it('returns cached categories without calling loader', async () => {
    redisMock.get.mockResolvedValueOnce(null).mockResolvedValueOnce(
      JSON.stringify({
        version: 1,

        value: [
          {
            id: 'category-1',
          },
        ],
      }),
    );

    const loader = vi.fn<() => Promise<unknown>>();

    const result = await service.getPublicCategories(loader);

    expect(result).toEqual([
      {
        id: 'category-1',
      },
    ]);

    expect(loader).not.toHaveBeenCalled();
  });

  it('loads and caches a cache miss', async () => {
    redisMock.get.mockResolvedValue(null);

    const loader = vi
      .fn<() => Promise<{ items: unknown[] }>>()
      .mockResolvedValue({
        items: [],
      });

    const result = await service.getPublicProductList(
      {
        page: 1,
        limit: 20,
        sort: PublicProductSort.NEWEST,
      },
      loader,
    );

    expect(result).toEqual({
      items: [],
    });

    expect(loader).toHaveBeenCalledTimes(1);

    expect(redisMock.set).toHaveBeenCalledWith(
      expect.stringContaining('catalog:v1:products:list'),

      expect.stringContaining('"version":1'),

      expect.any(Number),
    );
  });

  it('caches null product detail', async () => {
    redisMock.get.mockResolvedValue(null);

    const loader = vi.fn<() => Promise<null>>().mockResolvedValue(null);

    const result = await service.getPublicProductDetail(
      'missing-product',
      loader,
    );

    expect(result).toBeNull();

    expect(redisMock.set).toHaveBeenCalledWith(
      expect.any(String),

      JSON.stringify({
        version: 1,
        value: null,
      }),

      expect.any(Number),
    );
  });

  it('runs one loader for concurrent requests in the same process', async () => {
    redisMock.get.mockResolvedValue(null);

    let resolveLoader: ((value: string) => void) | undefined;

    const loader = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveLoader = resolve;
        }),
    );

    const first = service.getPublicProductDetail('iphone', loader);

    const second = service.getPublicProductDetail('iphone', loader);

    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });

    expect(loader).toHaveBeenCalledTimes(1);

    resolveLoader?.('product');

    await expect(first).resolves.toBe('product');

    await expect(second).resolves.toBe('product');

    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('rotates product generation during invalidation', async () => {
    await service.invalidateProducts();

    expect(redisMock.set).toHaveBeenCalledWith(
      'catalog:generation:products',
      expect.any(String),
    );
  });

  it('rotates both generations for a category mutation', async () => {
    await service.invalidateCategoriesAndProducts();

    const [entries] = redisMock.setMany.mock.calls[0] ?? [];

    expect(typeof entries?.['catalog:generation:categories']).toBe('string');

    expect(typeof entries?.['catalog:generation:products']).toBe('string');
  });

  it('queries loader when Redis is unavailable', async () => {
    redisMock.getOrCreateToken.mockResolvedValue(null);

    redisMock.get.mockResolvedValue(null);

    redisMock.acquireLock.mockResolvedValue(null);

    const loader = vi.fn<() => Promise<string>>().mockResolvedValue('database');

    const result = await service.getPublicProductDetail('iphone', loader);

    expect(result).toBe('database');
  });
});
