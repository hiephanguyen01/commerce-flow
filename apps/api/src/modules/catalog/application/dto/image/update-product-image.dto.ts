import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateProductImageDto {
  @ApiPropertyOptional({
    nullable: true,
    maxLength: 250,
  })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  altText?: string | null;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiProperty({
    example: 4,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedProductVersion!: number;
}
