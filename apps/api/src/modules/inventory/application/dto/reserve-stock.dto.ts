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

export class ReserveStockDto {
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
    example: 2,
  })
  @IsInt()
  @Min(1)
  @Max(1000)
  quantity!: number;

  @ApiProperty({
    example: 'checkout-session-id:item-id',
  })
  @IsString()
  @MaxLength(120)
  idempotencyKey!: string;

  @ApiPropertyOptional({
    example: 'checkout-session-id',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  referenceId?: string;

  @ApiPropertyOptional({
    default: 900,
    minimum: 60,
    maximum: 3600,
  })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(3600)
  ttlSeconds = 900;
}
