import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { OtcOrderEntity } from '../db/entities/otc-order.entity';
import { ListOrdersQueryDto } from '../db/dto/list-orders.query.dto';
import { PublicOrderBookQueryDto } from '../db/dto/public-orderbook.query.dto';
import { OtcOrderEventEntity } from '../db/entities/otc-order-event.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(OtcOrderEntity)
    private readonly repo: Repository<OtcOrderEntity>,
    @InjectRepository(OtcOrderEventEntity)
    private readonly eventRepo: Repository<OtcOrderEventEntity>,
  ) {}

  async listBySeller(seller: string, q: ListOrdersQueryDto) {
    const limit = q.limit ?? 50;

    const where: [any, any] = [
      {
        seller: seller.toLowerCase(),
      },
      {
        buyer: seller.toLowerCase(),
      },
    ];

    // chainId / status filter
    if (typeof q.chainId === 'number') {
      where[0].chainId = q.chainId;
      where[1].chainId = q.chainId;
    }
    if (q.status) {
      where[0].status = q.status;
      where[1].status = q.status;
    }

    // cursor pagination: orderId < cursor
    if (q.cursor) {
      where[0].orderId = LessThan(q.cursor);
      where[1].orderId = LessThan(q.cursor);
    }

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

  async getSummary(seller: string) {
    const totalOrders = await this.repo.count({
      where: [{ seller: seller }, { buyer: seller }],
    });
    const openOrders = await this.repo.count({
      where: [
        { seller, status: 'OPEN' },
        { buyer: seller, status: 'OPEN' },
      ],
    });
    const cancelledOrders = await this.repo.count({
      where: [
        { seller, status: 'CANCELLED' },
        { buyer: seller, status: 'CANCELLED' },
      ],
    });
    const takenOrders = await this.repo.count({
      where: [
        { seller, status: 'TAKEN' },
        { buyer: seller, status: 'TAKEN' },
      ],
    });
    const deliveredOrders = await this.repo.count({
      where: [
        { seller, status: 'DELIVERED' },
        { buyer: seller, status: 'DELIVERED' },
      ],
    });
    const finishedOrders = await this.repo.count({
      where: [
        { seller, status: 'FINISHED' },
        { buyer: seller, status: 'FINISHED' },
      ],
    });

    return {
      total: totalOrders,
      open: openOrders,
      cancelled: cancelledOrders,
      taken: takenOrders,
      delivered: deliveredOrders,
      finished: finishedOrders,
    };
  }

  async findByTxId(txId: string) {
    return await this.eventRepo.findOne({ where: { txHash: txId } });
  }
}
