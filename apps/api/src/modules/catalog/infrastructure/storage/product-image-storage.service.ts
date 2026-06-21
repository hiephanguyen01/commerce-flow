import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type UploadProductImageInput = {
  objectKey: string;
  contentType: string;
  buffer: Buffer;
};

export type UploadedProductImage = {
  objectKey: string;
  publicUrl: string;
  etag: string | null;
};

@Injectable()
export class ProductImageStorageService implements OnModuleInit {
  private readonly logger = new Logger(ProductImageStorageService.name);

  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;
  private readonly autoCreateBucket: boolean;

  constructor(configService: ConfigService) {
    const endpoint = configService.getOrThrow<string>('MINIO_ENDPOINT');

    const region = configService.get<string>('MINIO_REGION', 'us-east-1');

    this.bucket = configService.getOrThrow<string>('MINIO_BUCKET');

    this.publicBaseUrl = configService
      .getOrThrow<string>('MINIO_PUBLIC_URL')
      .replace(/\/+$/, '');

    this.autoCreateBucket = configService.get<boolean>(
      'MINIO_AUTO_CREATE_BUCKET',
      false,
    );

    this.client = new S3Client({
      endpoint,
      region,

      /*
       * MinIO thường sử dụng path-style URL:
       * endpoint/bucket/object-key
       */
      forcePathStyle: true,

      credentials: {
        accessKeyId: configService.getOrThrow<string>('MINIO_ACCESS_KEY'),

        secretAccessKey: configService.getOrThrow<string>('MINIO_SECRET_KEY'),
      },
    });
  }

  async onModuleInit(): Promise<void> {
    if (!this.autoCreateBucket) {
      return;
    }

    await this.ensureBucketExists();
  }

  async uploadObject(
    input: UploadProductImageInput,
  ): Promise<UploadedProductImage> {
    try {
      const result = await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: input.objectKey,
          Body: input.buffer,

          ContentType: input.contentType,

          ContentLength: input.buffer.length,

          ContentDisposition: 'inline',

          /*
           * Object key dùng UUID nên nội dung
           * tại URL này là immutable.
           */
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );

      return {
        objectKey: input.objectKey,

        publicUrl: this.buildPublicUrl(input.objectKey),

        etag: result.ETag?.replaceAll('"', '') ?? null,
      };
    } catch (error) {
      this.logger.error(
        `Failed to upload object ${input.objectKey}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new ServiceUnavailableException({
        code: 'PRODUCT_IMAGE_STORAGE_UPLOAD_FAILED',

        message: 'Product image storage is temporarily unavailable',
      });
    }
  }

  async deleteObject(objectKey: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: objectKey,
        }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete object ${objectKey}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new ServiceUnavailableException({
        code: 'PRODUCT_IMAGE_STORAGE_DELETE_FAILED',

        message: 'Product image storage is temporarily unavailable',
      });
    }
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      await this.client.send(
        new HeadBucketCommand({
          Bucket: this.bucket,
        }),
      );

      return;
    } catch (error) {
      if (!this.isMissingBucket(error)) {
        throw error;
      }
    }

    await this.client.send(
      new CreateBucketCommand({
        Bucket: this.bucket,
      }),
    );

    this.logger.log(`Created MinIO bucket ${this.bucket}`);
  }

  private buildPublicUrl(objectKey: string): string {
    const encodedKey = objectKey
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');

    return [
      this.publicBaseUrl,
      encodeURIComponent(this.bucket),
      encodedKey,
    ].join('/');
  }

  private isMissingBucket(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const possibleError = error as {
      name?: string;

      $metadata?: {
        httpStatusCode?: number;
      };
    };

    return (
      possibleError.name === 'NotFound' ||
      possibleError.name === 'NoSuchBucket' ||
      possibleError.$metadata?.httpStatusCode === 404
    );
  }
}
