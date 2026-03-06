import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  @IsOptional()
  fullName?: string;

  @IsIn(['MALE', 'FEMALE', 'OTHER'])
  @IsOptional()
  gender?: 'MALE' | 'FEMALE' | 'OTHER';

  @IsString()
  @MaxLength(20)
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  city?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  department?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  address?: string;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  birthDate?: Date;
}