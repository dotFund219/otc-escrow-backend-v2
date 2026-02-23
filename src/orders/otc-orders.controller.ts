import { Controller, Get, Query, Req, UseGuards, Param } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/auth.guard';
import { OrdersService } from './otc-orders.service';
import { ListOrdersQueryDto } from '../db/dto/list-orders.query.dto';
import { PublicOrderBookQueryDto } from '../db/dto/public-orderbook.query.dto';
import { Public } from '../auth/public.decorator';
import { sleep } from '../common/funcs';

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

  @UseGuards(JwtAuthGuard)
  @Get('summary')
  async summary(@Req() req: AuthedRequest) {
    // ✅ jwt.strategy validate()
    const address =
      req.user?.address ??
      req.user?.wallet ??
      req.user?.sub ??
      req.user?.seller;

    const summary = await this.orders.getSummary(address);
    return {
      ok: true,
      summary,
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

  @Public()
  @Get('tx/:txId')
  async getByTxId(
    @Param('txId') txId: string,
    @Query('waitMs') waitMs?: string, // optional: client can request waiting
  ) {
    const maxWait = Math.min(Number(waitMs ?? 5000) || 10000, 10000); // cap at 5s
    const interval = 500; // 0.5s polling
    const start = Date.now();

    // quick first check
    let order = await this.orders.findByTxId(txId);
    if (order) {
      return { ok: true, order, waitedMs: 0 };
    }

    // wait up to maxWait (<= 5s)
    while (Date.now() - start < maxWait) {
      await sleep(interval);

      order = await this.orders.findByTxId(txId);
      if (order) {
        return { ok: true, order, waitedMs: Date.now() - start };
      }
    }

    // not found after waiting
    return {
      ok: false,
      order: null,
      waitedMs: Date.now() - start,
      message: 'Order not indexed yet. Please retry.',
    };
  }
}
