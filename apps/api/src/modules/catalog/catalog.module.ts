import { Module } from '@nestjs/common';
import { CategoryService } from './application/services/category.service.js';
import { ProductImageService } from './application/services/product-image.service.js';
import { ProductVariantService } from './application/services/product-variant.service.js';
import { ProductService } from './application/services/product.service.js';
import { ProductImageFileValidator } from './application/validators/product-image-file.validator.js';
import { ProductImageStorageService } from './infrastructure/storage/product-image-storage.service.js';
import { AdminCategoryController } from './presentation/http/admin-category.controller.js';
import { AdminProductImageController } from './presentation/http/admin-product-image.controller.js';
import { AdminProductVariantController } from './presentation/http/admin-product-variant.controller.js';
import { AdminProductController } from './presentation/http/admin-product.controller.js';
import { CatalogController } from './presentation/http/catalog.controller.js';

@Module({
  controllers: [
    AdminCategoryController,
    AdminProductController,
    AdminProductVariantController,
    AdminProductImageController,
    CatalogController,
  ],

  providers: [
    CategoryService,
    ProductService,
    ProductVariantService,
    ProductImageService,
    ProductImageFileValidator,
    ProductImageStorageService,
  ],

  exports: [
    CategoryService,
    ProductService,
    ProductVariantService,
    ProductImageService,
  ],
})
export class CatalogModule {}
