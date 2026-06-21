import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class ProductImageVersionDto {
  @ApiProperty({
    example: 4,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedProductVersion!: number;
}
