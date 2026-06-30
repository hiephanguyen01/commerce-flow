import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  NotEquals,
} from 'class-validator';

export class AdjustInventoryDto {
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
    description: 'Số dương để tăng tồn kho, số âm để giảm tồn kho',
    examples: [10, -3],
  })
  @IsInt()
  @Min(-1_000_000)
  @Max(1_000_000)
  @NotEquals(0)
  quantityDelta!: number;

  @ApiProperty({
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @ApiProperty({
    example: 'Kiểm kê thực tế phát hiện thiếu 3 sản phẩm',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;

  @ApiProperty({
    example: 'inventory-adjustment-2026-00001',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  idempotencyKey!: string;

  @ApiPropertyOptional({
    example: 'STOCKTAKE-2026-06',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  referenceId?: string;
}
