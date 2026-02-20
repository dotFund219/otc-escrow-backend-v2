import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { OtcOrderEntity } from '../db/entities/otc-order.entity';
import { ListOrdersQueryDto } from '../db/dto/list-orders.query.dto';
import { PublicOrderBookQueryDto } from 'src/db/dto/public-orderbook.query.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(OtcOrderEntity)
    private readonly repo: Repository<OtcOrderEntity>,
  ) {}

  async listBySeller(seller: string, q: ListOrdersQueryDto) {
    const limit = q.limit ?? 50;

    const where: any = {
      seller: seller.toLowerCase(),
    };

    // chainId / status filter
    if (typeof q.chainId === 'number') where.chainId = q.chainId;
    if (q.status) where.status = q.status;

    // cursor pagination: orderId < cursor
    if (q.cursor) where.orderId = LessThan(q.cursor);

    const rows = await this.repo.find({
      where,
      order: { orderId: 'DESC' },
      take: limit,
    });

    const nextCursor = rows.length ? rows[rows.length - 1].orderId : null;

    return { rows, nextCursor };
  }

  async publicOrderBook(q: PublicOrderBookQueryDto) {
    const limit = q.limit ?? 50;

    const where: any = {};

    // ✅ By default show only OPEN: orderbook typically shows only unsettled orders
    if (q.status) {
      where.status = q.status;
    }

    if (typeof q.chainId === 'number') where.chainId = q.chainId;

    if (q.sellToken) where.sellToken = q.sellToken.toLowerCase();
    if (q.quoteToken) where.quoteToken = q.quoteToken.toLowerCase();

    if (q.cursor) where.orderId = LessThan(q.cursor);

    const rows = await this.repo.find({
      where,
      order: { orderId: 'DESC' },
      take: limit,
    });

    const nextCursor = rows.length ? rows[rows.length - 1].orderId : null;
    return { rows, nextCursor };
  }
}
