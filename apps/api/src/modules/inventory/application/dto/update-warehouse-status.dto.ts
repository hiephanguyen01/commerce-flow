import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, Min } from 'class-validator';
import { WarehouseStatus } from '../../../../generated/prisma/client.js';

export class UpdateWarehouseStatusDto {
  @ApiProperty({
    enum: WarehouseStatus,
  })
  @IsEnum(WarehouseStatus)
  status!: WarehouseStatus;

  @ApiProperty({
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}
