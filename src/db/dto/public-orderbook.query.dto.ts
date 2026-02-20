import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
  Length,
  Matches,
} from 'class-validator';

export class PublicOrderBookQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  chainId?: number;

  // 기본은 OPEN만 내려주게 할 거라 optional
  @IsOptional()
  @IsIn(['OPEN', 'CANCELLED', 'TAKEN'])
  status?: 'OPEN' | 'CANCELLED' | 'TAKEN';

  // 특정 pair만 보고 싶을 때
  @IsOptional()
  @Matches(/^0x[a-fA-F0-9]{40}$/)
  sellToken?: string;

  @IsOptional()
  @Matches(/^0x[a-fA-F0-9]{40}$/)
  quoteToken?: string;

  // cursor pagination (orderId DESC)
  @IsOptional()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}
