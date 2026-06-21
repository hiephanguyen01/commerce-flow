import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'customer@example.com',
  })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({
    minLength: 10,
    maxLength: 128,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  password!: string;

  @ApiProperty({
    example: 'Lucas',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  displayName!: string;
}
