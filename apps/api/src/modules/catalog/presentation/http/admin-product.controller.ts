import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../../../generated/prisma/client.js';
import { Roles } from '../../../identity/presentation/decorators/roles.decorator.js';
import { AdminProductQueryDto } from '../../application/dto/product/admin-product-query.dto.js';
import { CreateProductDto } from '../../application/dto/product/create-product.dto.js';
import { ProductVersionDto } from '../../application/dto/product/product-version.dto.js';
import { UpdateProductDto } from '../../application/dto/product/update-product.dto.js';
import { ProductService } from '../../application/services/product.service.js';

@ApiTags('admin-products')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/products')
export class AdminProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a draft product',
  })
  create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get paginated admin products',
  })
  findMany(
    @Query()
    query: AdminProductQueryDto,
  ) {
    return this.productService.findAdminProducts(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get admin product detail',
  })
  findOne(
    @Param('id', ParseUUIDPipe)
    productId: string,
  ) {
    return this.productService.findAdminProductById(productId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update product using optimistic version',
  })
  update(
    @Param('id', ParseUUIDPipe)
    productId: string,

    @Body()
    dto: UpdateProductDto,
  ) {
    return this.productService.update(productId, dto);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Publish a draft product',
  })
  publish(
    @Param('id', ParseUUIDPipe)
    productId: string,

    @Body()
    dto: ProductVersionDto,
  ) {
    return this.productService.publish(productId, dto.expectedVersion);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Return a published product to draft',
  })
  unpublish(
    @Param('id', ParseUUIDPipe)
    productId: string,

    @Body()
    dto: ProductVersionDto,
  ) {
    return this.productService.unpublish(productId, dto.expectedVersion);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Archive a product',
  })
  archive(
    @Param('id', ParseUUIDPipe)
    productId: string,

    @Body()
    dto: ProductVersionDto,
  ) {
    return this.productService.archive(productId, dto.expectedVersion);
  }
}
