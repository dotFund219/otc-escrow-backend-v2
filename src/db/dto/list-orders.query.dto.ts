import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import type { OrderStatus } from '../entities/otc-order.entity';

export class ListOrdersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  chainId?: number;

  @IsOptional()
  @IsIn(['OPEN', 'CANCELLED', 'TAKEN'])
  status?: OrderStatus;

  // cursor pagination: orderId of the last item from previous page
  @IsOptional()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}
