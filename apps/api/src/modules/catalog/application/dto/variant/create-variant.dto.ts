import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateVariantDto {
  @ApiProperty({
    example: 'Natural Titanium / 256GB',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @ApiProperty({
    example: 'IP16P-NT-256',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, {
    message:
      'sku may contain letters, numbers, dots, underscores and hyphens only',
  })
  sku!: string;

  @ApiProperty({
    example: 28_990_000,
    description: 'Price in the smallest supported currency unit',
  })
  @IsInt()
  @Min(0)
  priceAmount!: number;

  @ApiPropertyOptional({
    example: 30_990_000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  compareAtPrice?: number | null;

  @ApiPropertyOptional({
    example: 'VND',
    default: 'VND',
  })
  @IsOptional()
  @IsString()
  @IsIn(['VND'])
  currency?: string;

  @ApiPropertyOptional({
    example: {
      color: 'Natural Titanium',
      storage: '256GB',
    },
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, string>;

  @ApiPropertyOptional({
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
