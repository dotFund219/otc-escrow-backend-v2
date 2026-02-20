import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/auth.guard';
import { OrdersService } from './otc-orders.service';
import { ListOrdersQueryDto } from '../db/dto/list-orders.query.dto';
import { PublicOrderBookQueryDto } from 'src/db/dto/public-orderbook.query.dto';
import { Public } from '../auth/public.decorator';

type AuthedRequest = Request & { user?: any };

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async listMyOrders(
    @Req() req: AuthedRequest,
    @Query() q: ListOrdersQueryDto,
  ) {
    // ✅ jwt.strategy validate()
    const address =
      req.user?.address ??
      req.user?.wallet ??
      req.user?.sub ??
      req.user?.seller;

    const { rows, nextCursor } = await this.orders.listBySeller(address, q);

    return {
      ok: true,
      seller: address,
      nextCursor,
      orders: rows,
    };
  }

  @Public()
  @Get('public')
  async publicBook(@Query() q: PublicOrderBookQueryDto) {
    const { rows, nextCursor } = await this.orders.publicOrderBook(q);
    return {
      ok: true,
      nextCursor,
      orders: rows,
    };
  }
}
