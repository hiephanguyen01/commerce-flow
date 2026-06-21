import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../../../generated/prisma/client.js';
import { Roles } from '../../../identity/presentation/decorators/roles.decorator.js';
import { CreateVariantDto } from '../../application/dto/variant/create-variant.dto.js';
import { UpdateVariantDto } from '../../application/dto/variant/update-variant.dto.js';
import { VariantVersionDto } from '../../application/dto/variant/variant-version.dto.js';
import { ProductVariantService } from '../../application/services/product-variant.service.js';

@ApiTags('admin-product-variants')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/products/:productId/variants')
export class AdminProductVariantController {
  constructor(private readonly variantService: ProductVariantService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a product variant',
  })
  create(
    @Param('productId', ParseUUIDPipe)
    productId: string,

    @Body()
    dto: CreateVariantDto,
  ) {
    return this.variantService.create(productId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get product variants',
  })
  findMany(
    @Param('productId', ParseUUIDPipe)
    productId: string,
  ) {
    return this.variantService.findAdminVariants(productId);
  }

  @Get(':variantId')
  @ApiOperation({
    summary: 'Get product variant detail',
  })
  findOne(
    @Param('productId', ParseUUIDPipe)
    productId: string,

    @Param('variantId', ParseUUIDPipe)
    variantId: string,
  ) {
    return this.variantService.findAdminVariantById(productId, variantId);
  }

  @Patch(':variantId')
  @ApiOperation({
    summary: 'Update a product variant',
  })
  update(
    @Param('productId', ParseUUIDPipe)
    productId: string,

    @Param('variantId', ParseUUIDPipe)
    variantId: string,

    @Body()
    dto: UpdateVariantDto,
  ) {
    return this.variantService.update(productId, variantId, dto);
  }

  @Post(':variantId/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Activate a product variant',
  })
  activate(
    @Param('productId', ParseUUIDPipe)
    productId: string,

    @Param('variantId', ParseUUIDPipe)
    variantId: string,

    @Body()
    dto: VariantVersionDto,
  ) {
    return this.variantService.activate(
      productId,
      variantId,
      dto.expectedVersion,
    );
  }

  @Post(':variantId/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deactivate a product variant',
  })
  deactivate(
    @Param('productId', ParseUUIDPipe)
    productId: string,

    @Param('variantId', ParseUUIDPipe)
    variantId: string,

    @Body()
    dto: VariantVersionDto,
  ) {
    return this.variantService.deactivate(
      productId,
      variantId,
      dto.expectedVersion,
    );
  }

  @Delete(':variantId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a product variant',
  })
  remove(
    @Param('productId', ParseUUIDPipe)
    productId: string,

    @Param('variantId', ParseUUIDPipe)
    variantId: string,

    @Query('expectedVersion', ParseIntPipe)
    expectedVersion: number,
  ) {
    return this.variantService.remove(productId, variantId, expectedVersion);
  }
}
