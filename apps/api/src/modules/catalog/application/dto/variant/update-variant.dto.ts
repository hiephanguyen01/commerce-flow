import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { CreateVariantDto } from './create-variant.dto.js';

export class UpdateVariantDto extends PartialType(CreateVariantDto) {
  @ApiProperty({
    example: 1,
    description: 'Current variant version for optimistic concurrency',
  })
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}
