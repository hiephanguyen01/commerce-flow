import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { CreateProductDto } from './create-product.dto.js';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiProperty({
    example: 1,
    description:
      'Current product version used for optimistic concurrency control',
  })
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}
