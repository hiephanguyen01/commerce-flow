import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../identity/presentation/decorators/public.decorator.js';
import { PublicProductQueryDto } from '../../application/dto/product/public-product-query.dto.js';
import { CategoryService } from '../../application/services/category.service.js';
import { ProductService } from '../../application/services/product.service.js';

@ApiTags('catalog')
@Public()
@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly categoryService: CategoryService,

    private readonly productService: ProductService,
  ) {}

  @Get('categories')
  @ApiOperation({
    summary: 'Get active category tree',
  })
  categories() {
    return this.categoryService.findPublicCategories();
  }

  @Get('products')
  @ApiOperation({
    summary: 'Get published products',
  })
  products(
    @Query()
    query: PublicProductQueryDto,
  ) {
    return this.productService.findPublicProducts(query);
  }

  @Get('products/:slug')
  @ApiOperation({
    summary: 'Get published product by slug',
  })
  product(
    @Param('slug')
    slug: string,
  ) {
    return this.productService.findPublicProductBySlug(slug);
  }
}
