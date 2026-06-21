import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

function transformMultipartBoolean(value: unknown): unknown {
  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  return value;
}

export class CreateProductImageDto {
  @ApiPropertyOptional({
    nullable: true,
    maxLength: 250,
  })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  altText?: string | null;

  @ApiPropertyOptional({
    default: false,
  })
  @Transform(({ value }) => transformMultipartBoolean(value))
  @IsOptional()
  @IsBoolean()
  isPrimary = false;

  @ApiPropertyOptional({
    default: 0,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder = 0;

  @ApiProperty({
    example: 3,
    description: 'Current product version',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedProductVersion!: number;
}
