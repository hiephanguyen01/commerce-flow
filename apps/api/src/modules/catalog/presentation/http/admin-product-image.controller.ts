import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserRole } from '../../../../generated/prisma/client.js';
import { Roles } from '../../../identity/presentation/decorators/roles.decorator.js';
import { CreateProductImageDto } from '../../application/dto/image/create-product-image.dto.js';
import { DeleteProductImageQueryDto } from '../../application/dto/image/delete-product-image-query.dto.js';
import { ProductImageVersionDto } from '../../application/dto/image/product-image-version.dto.js';
import { ReorderProductImagesDto } from '../../application/dto/image/reorder-product-images.dto.js';
import { UpdateProductImageDto } from '../../application/dto/image/update-product-image.dto.js';
import { ProductImageService } from '../../application/services/product-image.service.js';
import { PRODUCT_IMAGE_MAX_SIZE_BYTES } from '../../application/validators/product-image-file.validator.js';

@ApiTags('admin-product-images')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/products/:productId/images')
export class AdminProductImageController {
  constructor(private readonly productImageService: ProductImageService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),

      limits: {
        files: 1,

        fileSize: PRODUCT_IMAGE_MAX_SIZE_BYTES,
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',

      required: ['file', 'expectedProductVersion'],

      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },

        altText: {
          type: 'string',
          nullable: true,
        },

        isPrimary: {
          type: 'boolean',
          default: false,
        },

        sortOrder: {
          type: 'integer',
          minimum: 0,
          default: 0,
        },

        expectedProductVersion: {
          type: 'integer',
          minimum: 1,
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Upload a product image',
  })
  upload(
    @Param('productId', ParseUUIDPipe)
    productId: string,

    @UploadedFile()
    file: Express.Multer.File | undefined,

    @Body()
    dto: CreateProductImageDto,
  ) {
    return this.productImageService.upload(productId, file, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get product images',
  })
  findMany(
    @Param('productId', ParseUUIDPipe)
    productId: string,
  ) {
    return this.productImageService.findAdminImages(productId);
  }

  /*
   * Static route phải khai báo trước :imageId.
   */
  @Put('reorder')
  @ApiOperation({
    summary: 'Reorder every image of a product',
  })
  reorder(
    @Param('productId', ParseUUIDPipe)
    productId: string,

    @Body()
    dto: ReorderProductImagesDto,
  ) {
    return this.productImageService.reorder(productId, dto);
  }

  @Patch(':imageId')
  @ApiOperation({
    summary: 'Update product image metadata',
  })
  update(
    @Param('productId', ParseUUIDPipe)
    productId: string,

    @Param('imageId', ParseUUIDPipe)
    imageId: string,

    @Body()
    dto: UpdateProductImageDto,
  ) {
    return this.productImageService.update(productId, imageId, dto);
  }

  @Post(':imageId/primary')
  @ApiOperation({
    summary: 'Set product primary image',
  })
  setPrimary(
    @Param('productId', ParseUUIDPipe)
    productId: string,

    @Param('imageId', ParseUUIDPipe)
    imageId: string,

    @Body()
    dto: ProductImageVersionDto,
  ) {
    return this.productImageService.setPrimary(
      productId,
      imageId,
      dto.expectedProductVersion,
    );
  }

  @Delete(':imageId')
  @ApiOperation({
    summary: 'Delete a product image',
  })
  remove(
    @Param('productId', ParseUUIDPipe)
    productId: string,

    @Param('imageId', ParseUUIDPipe)
    imageId: string,

    @Query()
    query: DeleteProductImageQueryDto,
  ) {
    return this.productImageService.remove(
      productId,
      imageId,
      query.expectedProductVersion,
    );
  }
}
