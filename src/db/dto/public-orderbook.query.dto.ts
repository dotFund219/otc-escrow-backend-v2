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

  // By default we'll return only OPEN, so this is optional
  @IsOptional()
  @IsIn(['OPEN', 'CANCELLED', 'TAKEN'])
  status?: 'OPEN' | 'CANCELLED' | 'TAKEN';

  // When you want to filter by a specific token pair
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
