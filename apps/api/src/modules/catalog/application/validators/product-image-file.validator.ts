import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export const PRODUCT_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export type SupportedImageType = {
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  extension: 'jpg' | 'png' | 'webp';
};
export type ValidatedProductImageFile = {
  buffer: Buffer;
  sizeBytes: number;
  mimeType: SupportedImageType['mimeType'];
  extension: SupportedImageType['extension'];
};
@Injectable()
export class ProductImageFileValidator {
  constructor(private readonly configService: ConfigService) {}
  validate(file: Express.Multer.File | undefined): ValidatedProductImageFile {
    if (!file) {
      throw new BadRequestException({
        code: 'PRODUCT_IMAGE_FILE_REQUIRED',
        message: 'Product image file is required',
      });
    }
    const maximumSize = this.configService.get<number>(
      'PRODUCT_IMAGE_MAX_SIZE_BYTES',
      PRODUCT_IMAGE_MAX_SIZE_BYTES,
    );
    if (file.size <= 0 || file.buffer.length === 0) {
      throw new BadRequestException({
        code: 'PRODUCT_IMAGE_FILE_EMPTY',
        message: 'Product image file is empty',
      });
    }
    if (file.size > maximumSize) {
      throw new PayloadTooLargeException({
        code: 'PRODUCT_IMAGE_FILE_TOO_LARGE',
        message: `Product image cannot exceed ${maximumSize} bytes`,
      });
    }
    const detected = this.detectImageType(file.buffer);
    if (!detected) {
      throw new BadRequestException({
        code: 'PRODUCT_IMAGE_TYPE_NOT_SUPPORTED',
        message: 'Only JPEG, PNG and WebP images are supported',
      });
    }
    const declaredMimeType = this.normalizeMimeType(file.mimetype);
    if (!declaredMimeType || declaredMimeType !== detected.mimeType) {
      throw new BadRequestException({
        code: 'PRODUCT_IMAGE_CONTENT_TYPE_MISMATCH',
        message: 'Uploaded file content does not match its declared MIME type',
      });
    }
    return {
      buffer: file.buffer,
      sizeBytes: file.size,
      mimeType: detected.mimeType,
      extension: detected.extension,
    };
  }
  private detectImageType(buffer: Buffer): SupportedImageType | null {
    if (this.isJpeg(buffer)) {
      return { mimeType: 'image/jpeg', extension: 'jpg' };
    }
    if (this.isPng(buffer)) {
      return { mimeType: 'image/png', extension: 'png' };
    }
    if (this.isWebp(buffer)) {
      return { mimeType: 'image/webp', extension: 'webp' };
    }
    return null;
  }
  private isJpeg(buffer: Buffer): boolean {
    return (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }
  private isPng(buffer: Buffer): boolean {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return (
      buffer.length >= signature.length &&
      signature.every((byte, index) => buffer[index] === byte)
    );
  }
  private isWebp(buffer: Buffer): boolean {
    if (buffer.length < 12) {
      return false;
    }
    return (
      buffer.subarray(0, 4).toString() === 'RIFF' &&
      buffer.subarray(8, 12).toString() === 'WEBP'
    );
  }
  private normalizeMimeType(
    mimeType: string | undefined,
  ): SupportedImageType['mimeType'] | null {
    switch (mimeType?.trim().toLowerCase()) {
      case 'image/jpeg':
      case 'image/jpg':
        return 'image/jpeg';
      case 'image/png':
        return 'image/png';
      case 'image/webp':
        return 'image/webp';
      default:
        return null;
    }
  }
}
