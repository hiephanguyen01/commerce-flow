import { Inject, Injectable } from '@nestjs/common';

export const CATALOG_CACHE_STORE = Symbol('CATALOG_CACHE_STORE');

export interface CatalogCacheStore {
  delete(key: string): Promise<void>;
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
}

@Injectable()
export class CatalogCacheService {
  constructor(
    @Inject(CATALOG_CACHE_STORE)
    private readonly cache: CatalogCacheStore,
  ) {}

  productBySlugKey(slug: string) {
    return `catalog:product:slug:${slug}:v1`;
  }

  productByIdKey(id: string) {
    return `catalog:product:id:${id}:v1`;
  }

  async invalidateProduct(id: string, slug: string): Promise<void> {
    await Promise.all([
      this.cache.delete(this.productByIdKey(id)),
      this.cache.delete(this.productBySlugKey(slug)),
    ]);

    /*
     * Sprint 3 có thể dùng namespace version cho list:
     * tăng version thay vì scan và delete nhiều key.
     */
    await this.bumpProductListVersion();
  }

  private async bumpProductListVersion(): Promise<void> {
    const key = 'catalog:product:list:version';
    const currentVersion = (await this.cache.get<number>(key)) ?? 0;

    await this.cache.set(key, currentVersion + 1);
  }
}
