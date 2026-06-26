import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Redis } from 'ioredis';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import {
  ProductStatus,
  ProductVariantStatus,
} from '../src/generated/prisma/client.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';
import { CatalogCacheService } from '../src/modules/catalog/infrastructure/cache/catalog-cache.service.js';
import { ProductImageStorageService } from '../src/modules/catalog/infrastructure/storage/product-image-storage.service.js';

type ProductDetailResponse = {
  name: string;
};

describe('Catalog cache integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cache: CatalogCacheService;
  let redis: Redis;
  let server: Parameters<typeof request>[0];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ProductImageStorageService)
      .useValue({
        uploadObject: () =>
          Promise.resolve({
            objectKey: 'test-object',
            publicUrl: 'http://localhost/test-object',
            etag: null,
          }),
        deleteObject: () => Promise.resolve(undefined),
      })
      .compile();

    app = moduleRef.createNestApplication();

    app.setGlobalPrefix('api/v1');

    await app.init();

    server = app.getHttpServer() as Parameters<typeof request>[0];

    prisma = app.get(PrismaService);

    cache = app.get(CatalogCacheService);

    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      throw new Error('REDIS_URL is required for catalog cache integration');
    }

    redis = new Redis(redisUrl, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });

    redis.on('error', () => undefined);

    await redis.connect();
  });

  beforeEach(async () => {
    await redis.flushdb();

    await prisma.productImage.deleteMany();

    await prisma.productVariant.deleteMany();

    await prisma.product.deleteMany();

    await prisma.category.deleteMany();
  });

  afterAll(async () => {
    if (redis) {
      await redis.quit();
    }

    if (app) {
      await app.close();
    }
  });

  it('serves cached detail until generation is invalidated', async () => {
    const product = await prisma.product.create({
      data: {
        name: 'Initial name',
        slug: 'cached-product',

        status: ProductStatus.PUBLISHED,

        publishedAt: new Date(),

        variants: {
          create: {
            name: 'Default',
            sku: 'CACHE-001',
            priceAmount: 100_000,

            currency: 'VND',

            status: ProductVariantStatus.ACTIVE,
          },
        },
      },
    });

    const first = await request(server)
      .get('/api/v1/catalog/products/cached-product')
      .expect(200);

    const firstBody = first.body as ProductDetailResponse;

    expect(firstBody.name).toBe('Initial name');

    await prisma.product.update({
      where: {
        id: product.id,
      },

      data: {
        name: 'Updated name',
      },
    });

    const cached = await request(server)
      .get('/api/v1/catalog/products/cached-product')
      .expect(200);

    const cachedBody = cached.body as ProductDetailResponse;

    expect(cachedBody.name).toBe('Initial name');

    await cache.invalidateProducts();

    const refreshed = await request(server)
      .get('/api/v1/catalog/products/cached-product')
      .expect(200);

    const refreshedBody = refreshed.body as ProductDetailResponse;

    expect(refreshedBody.name).toBe('Updated name');
  });
});
