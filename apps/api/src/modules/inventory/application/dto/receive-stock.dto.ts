import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ReceiveStockDto {
  @ApiProperty({
    format: 'uuid',
  })
  @IsUUID()
  warehouseId!: string;

  @ApiProperty({
    format: 'uuid',
  })
  @IsUUID()
  variantId!: string;

  @ApiProperty({
    example: 100,
  })
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  quantity!: number;

  @ApiProperty({
    example: 'goods-receipt-2026-00001',
  })
  @IsString()
  @MaxLength(120)
  idempotencyKey!: string;

  @ApiPropertyOptional({
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  referenceId?: string;

  @ApiPropertyOptional({
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
