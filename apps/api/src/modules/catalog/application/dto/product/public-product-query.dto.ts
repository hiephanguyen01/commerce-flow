import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum PublicProductSort {
  NEWEST = 'newest',
  NAME_ASC = 'name_asc',
  NAME_DESC = 'name_desc',
}

export class PublicProductQueryDto {
  @ApiPropertyOptional({
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    default: 20,
    maximum: 60,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  limit = 20;

  @ApiPropertyOptional({
    example: 'iphone',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 'dien-thoai',
  })
  @IsOptional()
  @IsString()
  categorySlug?: string;

  @ApiPropertyOptional({
    enum: PublicProductSort,
    default: PublicProductSort.NEWEST,
  })
  @IsOptional()
  @IsEnum(PublicProductSort)
  sort: PublicProductSort = PublicProductSort.NEWEST;
}
