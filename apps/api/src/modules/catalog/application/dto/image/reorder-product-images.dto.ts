import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsUUID,
  Min,
} from 'class-validator';

export class ReorderProductImagesDto {
  @ApiProperty({
    type: [String],
    example: [
      '4e9eb25a-d08f-4311-bb06-c23de8a6eddb',
      '164b9f20-269c-48dd-9e47-e5b4afe30f83',
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', {
    each: true,
  })
  imageIds!: string[];

  @ApiProperty({
    example: 4,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedProductVersion!: number;
}
