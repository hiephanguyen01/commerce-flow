import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateWarehouseDto {
  @ApiProperty({
    example: 'HCM-01',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]*$/)
  code!: string;

  @ApiProperty({
    example: 'Kho Hồ Chí Minh',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;
}
