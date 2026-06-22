import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma, ProductStatus } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { ProductImageStorageService } from '../../infrastructure/storage/product-image-storage.service.js';
import { CreateProductImageDto } from '../dto/image/create-product-image.dto.js';
import { ReorderProductImagesDto } from '../dto/image/reorder-product-images.dto.js';
import { UpdateProductImageDto } from '../dto/image/update-product-image.dto.js';
import { ProductImageFileValidator } from '../validators/product-image-file.validator.js';
const productMutationSelect = {
  id: true,
  status: true,
  version: true,
} satisfies Prisma.ProductSelect;
type ProductForMutation = Prisma.ProductGetPayload<{
  select: typeof productMutationSelect;
}>;
@Injectable()
export class ProductImageService {
  private readonly logger = new Logger(ProductImageService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ProductImageStorageService,
    private readonly fileValidator: ProductImageFileValidator,
  ) {}
  async upload(
    productId: string,
    file: Express.Multer.File | undefined,
    dto: CreateProductImageDto,
  ) {
    const validatedFile = this.fileValidator.validate(file);
    const objectKey = [
      'products',
      productId,
      `${randomUUID()}.${validatedFile.extension}`,
    ].join('/');
    /* * Upload object trước. * * Nếu transaction DB thất bại, object vừa upload * sẽ được cleanup trong catch. */ const uploadedObject =
      await this.storage.uploadObject({
        objectKey,
        contentType: validatedFile.mimeType,
        buffer: validatedFile.buffer,
      });
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const product = await this.getProductForMutation(tx, productId);
          this.assertProductCanBeModified(product);
          this.assertProductVersion(product, dto.expectedProductVersion);
          const imageCount = await tx.productImage.count({
            where: { productId },
          });
          /* * Ảnh đầu tiên luôn trở thành primary. */ const shouldBecomePrimary =
            imageCount === 0 || dto.isPrimary;
          const productVersion = await this.claimProductVersion(
            tx,
            productId,
            dto.expectedProductVersion,
          );
          if (shouldBecomePrimary) {
            await tx.productImage.updateMany({
              where: { productId, isPrimary: true },
              data: { isPrimary: false },
            });
          }
          const image = await tx.productImage.create({
            data: {
              productId,
              objectKey: uploadedObject.objectKey,
              publicUrl: uploadedObject.publicUrl,
              contentType: validatedFile.mimeType,
              sizeBytes: validatedFile.sizeBytes,
              etag: uploadedObject.etag,
              altText: this.normalizeAltText(dto.altText),
              isPrimary: shouldBecomePrimary,
              sortOrder: dto.sortOrder,
            },
            select: this.getImageSelect(),
          });
          return { image, productVersion };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      /* * Database transaction thất bại sau khi object * đã upload. Cố gắng xóa object để tránh orphan. */ await this.cleanupUploadedObject(
        uploadedObject.objectKey,
      );
      this.rethrowImageWriteError(error);
    }
  }
  async findAdminImages(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) {
      throw this.productNotFound();
    }
    return this.prisma.productImage.findMany({
      where: { productId },
      orderBy: [
        {
          sortOrder: 'asc',
        },
        {
          createdAt: 'asc',
        },
        {
          id: 'asc',
        },
      ],
      select: this.getImageSelect(),
    });
  }
  async update(productId: string, imageId: string, dto: UpdateProductImageDto) {
    if (dto.altText === undefined && dto.sortOrder === undefined) {
      throw new BadRequestException({
        code: 'PRODUCT_IMAGE_UPDATE_EMPTY',
        message: 'At least one image field must be updated',
      });
    }
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const product = await this.getProductForMutation(tx, productId);
          this.assertProductCanBeModified(product);
          this.assertProductVersion(product, dto.expectedProductVersion);
          const image = await this.getImageForMutation(tx, productId, imageId);
          const productVersion = await this.claimProductVersion(
            tx,
            productId,
            dto.expectedProductVersion,
          );
          const updatedImage = await tx.productImage.update({
            where: { id: image.id },
            data: {
              ...(dto.altText !== undefined
                ? { altText: this.normalizeAltText(dto.altText) }
                : {}),
              ...(dto.sortOrder !== undefined
                ? { sortOrder: dto.sortOrder }
                : {}),
            },
            select: this.getImageSelect(),
          });
          return { image: updatedImage, productVersion };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      this.rethrowImageWriteError(error);
    }
  }
  async setPrimary(
    productId: string,
    imageId: string,
    expectedProductVersion: number,
  ) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const product = await this.getProductForMutation(tx, productId);
          this.assertProductCanBeModified(product);
          this.assertProductVersion(product, expectedProductVersion);
          const image = await this.getImageForMutation(tx, productId, imageId);
          /* * Idempotent: ảnh đã là primary thì không * tăng product version. */ if (
            image.isPrimary
          ) {
            return { image, productVersion: product.version };
          }
          const productVersion = await this.claimProductVersion(
            tx,
            productId,
            expectedProductVersion,
          );
          await tx.productImage.updateMany({
            where: { productId, isPrimary: true },
            data: { isPrimary: false },
          });
          const primaryImage = await tx.productImage.update({
            where: { id: imageId },
            data: { isPrimary: true },
            select: this.getImageSelect(),
          });
          return { image: primaryImage, productVersion };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      this.rethrowImageWriteError(error);
    }
  }
  async reorder(productId: string, dto: ReorderProductImagesDto) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const product = await this.getProductForMutation(tx, productId);
          this.assertProductCanBeModified(product);
          this.assertProductVersion(product, dto.expectedProductVersion);
          const currentImages = await tx.productImage.findMany({
            where: { productId },
            select: { id: true },
          });
          const currentImageIds = new Set(
            currentImages.map((image) => image.id),
          );
          const containsEveryImage =
            currentImages.length === dto.imageIds.length &&
            dto.imageIds.every((imageId) => currentImageIds.has(imageId));
          if (!containsEveryImage) {
            throw new BadRequestException({
              code: 'PRODUCT_IMAGE_REORDER_SET_INVALID',
              message:
                'Reorder request must contain every product image exactly once',
            });
          }
          const productVersion = await this.claimProductVersion(
            tx,
            productId,
            dto.expectedProductVersion,
          );
          for (let index = 0; index < dto.imageIds.length; index += 1) {
            await tx.productImage.update({
              where: { id: dto.imageIds[index] },
              data: { sortOrder: index },
            });
          }
          const images = await tx.productImage.findMany({
            where: { productId },
            orderBy: [
              {
                sortOrder: 'asc',
              },
              {
                createdAt: 'asc',
              },
              {
                id: 'asc',
              },
            ],
            select: this.getImageSelect(),
          });
          return { images, productVersion };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      this.rethrowImageWriteError(error);
    }
  }
  async remove(
    productId: string,
    imageId: string,
    expectedProductVersion: number,
  ): Promise<{ productVersion: number }> {
    let deletedObjectKey: string | null = null;
    try {
      const result = await this.prisma.$transaction(
        async (tx) => {
          const product = await this.getProductForMutation(tx, productId);
          this.assertProductCanBeModified(product);
          this.assertProductVersion(product, expectedProductVersion);
          const image = await this.getImageForMutation(tx, productId, imageId);
          const productVersion = await this.claimProductVersion(
            tx,
            productId,
            expectedProductVersion,
          );
          await tx.productImage.delete({ where: { id: imageId } });
          /* * Khi xóa primary image, chọn ảnh đầu tiên * còn lại làm primary. */ if (
            image.isPrimary
          ) {
            const nextPrimaryImage = await tx.productImage.findFirst({
              where: { productId },
              orderBy: [
                { sortOrder: 'asc' },
                { createdAt: 'asc' },
                { id: 'asc' },
              ],
              select: { id: true },
            });
            if (nextPrimaryImage) {
              await tx.productImage.update({
                where: { id: nextPrimaryImage.id },
                data: { isPrimary: true },
              });
            }
          }
          return { objectKey: image.objectKey, productVersion };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      deletedObjectKey = result.objectKey;
      /* * Xóa metadata DB trước rồi mới xóa object. * Không để storage failure rollback database * về URL đã không còn đáng tin cậy. */ try {
        await this.storage.deleteObject(result.objectKey);
      } catch (error) {
        /* * Production nên ghi một durable cleanup task * để worker thử xóa object lại. */ this.logger.error(
          `Product image object requires cleanup: ${result.objectKey}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
      return { productVersion: result.productVersion };
    } catch (error) {
      this.rethrowImageWriteError(error);
    } finally {
      void deletedObjectKey;
    }
  }
  private async getProductForMutation(
    tx: Prisma.TransactionClient,
    productId: string,
  ): Promise<ProductForMutation> {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: productMutationSelect,
    });
    if (!product) {
      throw this.productNotFound();
    }
    return product;
  }
  private async getImageForMutation(
    tx: Prisma.TransactionClient,
    productId: string,
    imageId: string,
  ) {
    const image = await tx.productImage.findFirst({
      where: { id: imageId, productId },
      select: this.getImageSelect(),
    });
    if (!image) {
      throw this.imageNotFound();
    }
    return image;
  }
  private assertProductCanBeModified(product: ProductForMutation): void {
    if (product.status === ProductStatus.ARCHIVED) {
      throw new ConflictException({
        code: 'ARCHIVED_PRODUCT_CANNOT_BE_MODIFIED',
        message: 'Images of an archived product cannot be modified',
      });
    }
  }
  private assertProductVersion(
    product: ProductForMutation,
    expectedVersion: number,
  ): void {
    if (product.version !== expectedVersion) {
      throw this.productVersionConflict();
    }
  }
  private async claimProductVersion(
    tx: Prisma.TransactionClient,
    productId: string,
    expectedVersion: number,
  ): Promise<number> {
    const result = await tx.product.updateMany({
      where: {
        id: productId,
        version: expectedVersion,
        status: { not: ProductStatus.ARCHIVED },
      },
      data: { version: { increment: 1 } },
    });
    if (result.count !== 1) {
      throw this.productVersionConflict();
    }
    return expectedVersion + 1;
  }
  private normalizeAltText(value: string | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }
  private async cleanupUploadedObject(objectKey: string): Promise<void> {
    try {
      await this.storage.deleteObject(objectKey);
    } catch (cleanupError) {
      this.logger.error(
        `Failed to cleanup uploaded object ${objectKey}`,
        cleanupError instanceof Error ? cleanupError.stack : undefined,
      );
    }
  }
  private productNotFound(): NotFoundException {
    return new NotFoundException({
      code: 'PRODUCT_NOT_FOUND',
      message: 'Product was not found',
    });
  }
  private imageNotFound(): NotFoundException {
    return new NotFoundException({
      code: 'PRODUCT_IMAGE_NOT_FOUND',
      message: 'Product image was not found',
    });
  }
  private productVersionConflict(): ConflictException {
    return new ConflictException({
      code: 'PRODUCT_VERSION_CONFLICT',
      message: 'Product was modified by another request',
    });
  }
  private rethrowImageWriteError(error: unknown): never {
    if (error instanceof HttpException) {
      throw error;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          throw new ConflictException({
            code: 'PRODUCT_IMAGE_CONFLICT',
            message: 'Product image conflicts with existing data',
          });
        case 'P2003':
          throw new ConflictException({
            code: 'PRODUCT_IMAGE_RELATION_CONFLICT',
            message:
              'Product or product image relationship changed during the request',
          });
        case 'P2025':
          throw this.imageNotFound();
        case 'P2034':
          throw new ConflictException({
            code: 'PRODUCT_IMAGE_CONCURRENT_UPDATE',
            message:
              'Product images were modified by another request. Reload and try again.',
          });
        default:
          throw error;
      }
    }
    throw error;
  }
  private getImageSelect() {
    return {
      id: true,
      productId: true,
      objectKey: true,
      publicUrl: true,
      sizeBytes: true,
      etag: true,
      altText: true,
      isPrimary: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
      contentType: true,
    } satisfies Prisma.ProductImageSelect;
  }
}
