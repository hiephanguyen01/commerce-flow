import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class InventoryAvailabilityQueryDto {
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
}
