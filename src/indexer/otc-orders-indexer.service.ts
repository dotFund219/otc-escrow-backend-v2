import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Interface, JsonRpcProvider, Log } from 'ethers';

import { SyncStateEntity } from '../db/entities/sync-state.entity';
import { OtcOrderEntity } from '../db/entities/otc-order.entity';
import { OtcOrderEventEntity } from '../db/entities/otc-order-event.entity';

import abi from './abi/OTCOrders.abi.json';
import escorwABI from './abi/OTCEscrow.abi.json';

function envInt(name: string, fallback: number) {
  const v = process.env[name];
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

@Injectable()
export class OtcOrdersIndexerService implements OnModuleInit {
  private readonly logger = new Logger(OtcOrdersIndexerService.name);

  private readonly chainId = envInt('CHAIN_ID', 97);
  private readonly confirmations = envInt('CONFIRMATIONS', 12);
  private readonly chunkSize = envInt('SYNC_CHUNK_SIZE', 2000);

  private readonly rpcUrl = process.env.RPC_URL || '';
  private readonly orderContract = (
    process.env.OTC_ORDERS_ADDRESS || ''
  ).toLowerCase();

  private readonly escrowContract = (
    process.env.OTC_ESCROW_ADDRESS || ''
  ).toLowerCase();

  private provider!: JsonRpcProvider;
  private readonly iface = new Interface(abi as any);
  private readonly escrowIface = new Interface(escorwABI as any);

  private readonly stateKey = `otc_orders:${this.chainId}`;

  private readonly topicOrderCreated =
    this.iface.getEvent('OrderCreated')!.topicHash;
  private readonly topicOrderCancelled =
    this.iface.getEvent('OrderCancelled')!.topicHash;
  private readonly topicOrderTaken =
    this.iface.getEvent('OrderTaken')!.topicHash;

  private readonly topicSubmitDeliveryTx =
    this.escrowIface.getEvent('DeliverySubmitted')!.topicHash;

  private readonly topicConfirmReceipt =
    this.escrowIface.getEvent('ReceiptConfirmed')!.topicHash;

  private readonly topicRejectReceipt =
    this.escrowIface.getEvent('ReceiptRejected')!.topicHash;

  private readonly topicAdminResolved =
    this.escrowIface.getEvent('AdminResolved')!.topicHash;

  constructor(
    @InjectRepository(SyncStateEntity)
    private readonly syncRepo: Repository<SyncStateEntity>,
    @InjectRepository(OtcOrderEntity)
    private readonly orderRepo: Repository<OtcOrderEntity>,
    @InjectRepository(OtcOrderEventEntity)
    private readonly eventRepo: Repository<OtcOrderEventEntity>,
  ) {}

  async onModuleInit() {
    try {
      if (!this.rpcUrl || !this.orderContract) {
        this.logger.warn(
          'Missing RPC_HTTP_URL or OTC_ORDERS_ADDRESS. Indexer disabled.',
        );
        return;
      }
      this.provider = new JsonRpcProvider(this.rpcUrl, {
        name: 'bsc-testnet',
        chainId: this.chainId,
      });

      await this.ensureStateRow();
      // await this.syncOnce(); // start with an immediate sync, then rely on cron for subsequent syncs
    } catch (e) {
      this.logger.error(
        `Failed to initialize OtcOrdersIndexerService: ${String(e)}`,
      );
    }
  }

  private async ensureStateRow() {
    const found = await this.syncRepo.findOne({
      where: { key: this.stateKey },
    });
    if (!found) {
      const latest = await this.provider.getBlockNumber();
      await this.syncRepo.save(
        this.syncRepo.create({
          key: this.stateKey,
          lastProcessedBlock: String(latest),
        }),
      );
    }
  }

  @Cron('*/5 * * * * *') // every 5seconds
  async cronSync() {
    try {
      this.logger.debug('Starting scheduled sync...');
      await this.syncOnce();
    } catch (e) {
      this.logger.error(`syncOnce failed: ${String(e)}`);
    }
  }

  async syncOnce() {
    if (!this.provider) return;

    const latest = await this.provider.getBlockNumber();
    const target = Math.max(0, latest - this.confirmations);

    const state = await this.syncRepo.findOneOrFail({
      where: { key: this.stateKey },
    });
    const last = Number(state.lastProcessedBlock || '0');

    if (target <= last) return;

    let from = last + 1;
    while (from <= target) {
      try {
        const to = Math.min(target, from + this.chunkSize - 1);
        await this.syncRange(from, to);

        state.lastProcessedBlock = String(to);
        await this.syncRepo.save(state);

        this.logger.log(
          `Synced OTCOrders logs ${from}..${to} (latest=${latest}, target=${target})`,
        );
        from = to + 1;
      } catch (e) {
        this.logger.error(
          `Error syncing range ${from}..${target}: ${String(e)}`,
        );
        break; // on error, break the loop and retry in the next cron tick
      }
    }
  }

  private async syncRange(fromBlock: number, toBlock: number) {
    // To fetch only three events, call topics[0] in OR form three times
    // (OR topics can be unstable depending on the RPC, so we call it three times for reliability)
    const logs = [
      ...(await this.getLogsByTopic(
        this.topicOrderCreated,
        this.orderContract,
        fromBlock,
        toBlock,
      )),
      ...(await this.getLogsByTopic(
        this.topicOrderCancelled,
        this.orderContract,
        fromBlock,
        toBlock,
      )),
      ...(await this.getLogsByTopic(
        this.topicOrderTaken,
        this.orderContract,
        fromBlock,
        toBlock,
      )),
      ...(await this.getLogsByTopic(
        this.topicSubmitDeliveryTx,
        this.escrowContract,
        fromBlock,
        toBlock,
      )),
      ...(await this.getLogsByTopic(
        this.topicConfirmReceipt,
        this.escrowContract,
        fromBlock,
        toBlock,
      )),
      ...(await this.getLogsByTopic(
        this.topicRejectReceipt,
        this.escrowContract,
        fromBlock,
        toBlock,
      )),
      ...(await this.getLogsByTopic(
        this.topicAdminResolved,
        this.escrowContract,
        fromBlock,
        toBlock,
      )),
    ].sort((a, b) =>
      a.blockNumber === b.blockNumber
        ? a.index - b.index
        : Number(a.blockNumber) - Number(b.blockNumber),
    );

    if (logs.length === 0) return;

    const blockTimeCache = new Map<number, Date>();

    for (const l of logs) {
      const parsed = this.safeParseLog(l);
      if (!parsed) continue;

      const bn = Number(l.blockNumber);
      let blockTime = blockTimeCache.get(bn) || null;
      if (!blockTime) {
        const b = await this.provider.getBlock(bn);
        if (b?.timestamp) {
          blockTime = new Date(Number(b.timestamp) * 1000);
          blockTimeCache.set(bn, blockTime);
        }
      }

      // 1) Save event ledger (upsert to avoid duplicates)
      await this.eventRepo.upsert(
        this.eventRepo.create({
          chainId: this.chainId,
          contract: this.orderContract,
          orderId: this.readOrderId(parsed),
          eventName: parsed.name,
          txHash: l.transactionHash,
          logIndex: l.index,
          blockNumber: String(l.blockNumber),
          blockHash: l.blockHash,
          args: this.normalizeArgs(parsed.args),
          blockTime,
        }),
        { conflictPaths: ['chainId', 'txHash', 'logIndex'] },
      );

      // 2) Reflect current order status
      await this.applyToOrderState(parsed.name, parsed.args, l);
    }
  }

  private async getLogsByTopic(
    topic0: string,
    contract: string,
    fromBlock: number,
    toBlock: number,
  ) {
    return this.provider.getLogs({
      address: contract,
      fromBlock,
      toBlock,
      topics: [topic0],
    });
  }

  private safeParseLog(l: Log): { name: string; args: any } | null {
    try {
      const desc = this.iface.parseLog({
        topics: l.topics as string[],
        data: l.data,
      });
      if (!desc) {
        const escrowDesc = this.escrowIface.parseLog({
          topics: l.topics as string[],
          data: l.data,
        });
        if (escrowDesc) {
          return { name: escrowDesc.name, args: escrowDesc.args };
        } else return null;
      }
      return { name: desc.name, args: desc.args };
    } catch {
      return null;
    }
  }

  private readOrderId(parsed: { name: string; args: any }): string {
    // args.orderId is captured as a named field
    const v = parsed.args?.orderId;
    return typeof v === 'bigint' ? v.toString() : String(v);
  }

  private normalizeArgs(args: any) {
    const out: any = {};
    for (const k of Object.keys(args)) {
      const v = args[k];
      if (typeof v === 'bigint') out[k] = v.toString();
      else if (Array.isArray(v))
        out[k] = v.map((x) => (typeof x === 'bigint' ? x.toString() : x));
      else out[k] = v;
    }
    return out;
  }

  private async applyToOrderState(eventName: string, args: any, l: Log) {
    const orderId = (
      typeof args.orderId === 'bigint'
        ? args.orderId.toString()
        : String(args.orderId)
    ) as string;

    if (eventName === 'OrderCreated') {
      const seller = String(args.seller).toLowerCase();
      const sellToken = String(args.sellToken).toLowerCase();
      const quoteToken = String(args.quoteToken).toLowerCase();

      const sellAmount =
        typeof args.sellAmount === 'bigint'
          ? args.sellAmount.toString()
          : String(args.sellAmount);
      const quoteAmount =
        typeof args.quoteAmount === 'bigint'
          ? args.quoteAmount.toString()
          : String(args.quoteAmount);

      await this.orderRepo.upsert(
        this.orderRepo.create({
          orderId,
          chainId: this.chainId,
          contract: this.orderContract,
          seller,
          sellToken,
          sellAmount,
          quoteToken,
          quoteAmount,
          status: 'OPEN',
          buyer: null,
          tradeId: null,
          createdAt: null, // not present in event (can be supplemented via contract call if desired)
          createdBlock: String(l.blockNumber),
          updatedBlock: String(l.blockNumber),
          lastTxHash: l.transactionHash,
        }),
        { conflictPaths: ['orderId'] },
      );
      return;
    }

    if (eventName === 'OrderCancelled') {
      // The order might not exist in DB yet, so create at least a row before updating its state
      await this.orderRepo
        .createQueryBuilder()
        .insert()
        .into(OtcOrderEntity)
        .values({
          orderId,
          chainId: this.chainId,
          contract: this.orderContract,
          seller: '0x0000000000000000000000000000000000000000',
          sellToken: '0x0000000000000000000000000000000000000000',
          sellAmount: '0',
          quoteToken: '0x0000000000000000000000000000000000000000',
          quoteAmount: '0',
          status: 'CANCELLED',
          buyer: null,
          tradeId: null,
          createdAt: null,
          createdBlock: null,
          updatedBlock: String(l.blockNumber),
          lastTxHash: l.transactionHash,
        })
        .orIgnore()
        .execute();

      await this.orderRepo.update(
        { orderId },
        {
          status: 'CANCELLED',
          updatedBlock: String(l.blockNumber),
          lastTxHash: l.transactionHash,
        },
      );
      return;
    }

    if (eventName === 'OrderTaken') {
      const buyer = String(args.buyer).toLowerCase();
      const tradeId =
        typeof args.tradeId === 'bigint'
          ? args.tradeId.toString()
          : String(args.tradeId);

      await this.orderRepo
        .createQueryBuilder()
        .insert()
        .into(OtcOrderEntity)
        .values({
          orderId,
          chainId: this.chainId,
          contract: this.orderContract,
          seller: '0x0000000000000000000000000000000000000000',
          sellToken: '0x0000000000000000000000000000000000000000',
          sellAmount: '0',
          quoteToken: '0x0000000000000000000000000000000000000000',
          quoteAmount: '0',
          status: 'TAKEN',
          buyer,
          tradeId,
          createdAt: null,
          createdBlock: null,
          updatedBlock: String(l.blockNumber),
          lastTxHash: l.transactionHash,
        })
        .orIgnore()
        .execute();

      await this.orderRepo.update(
        { orderId },
        {
          status: 'TAKEN',
          buyer,
          tradeId,
          updatedBlock: String(l.blockNumber),
          lastTxHash: l.transactionHash,
        },
      );
    }

    if (eventName === 'DeliverySubmitted') {
      const tradeId =
        typeof args.tradeId === 'bigint'
          ? args.tradeId.toString()
          : String(args.tradeId);
      const txId = String(args.txid);

      await this.orderRepo.update(
        { tradeId },
        {
          status: 'DELIVERED',
          txId,
          updatedBlock: String(l.blockNumber),
          lastTxHash: l.transactionHash,
        },
      );
    }

    if (eventName === 'ReceiptConfirmed') {
      const tradeId =
        typeof args.tradeId === 'bigint'
          ? args.tradeId.toString()
          : String(args.tradeId);

      await this.orderRepo.update(
        { tradeId },
        {
          status: 'FINISHED',
          updatedBlock: String(l.blockNumber),
          lastTxHash: l.transactionHash,
        },
      );
    }

    if (eventName === 'ReceiptRejected') {
      const tradeId =
        typeof args.tradeId === 'bigint'
          ? args.tradeId.toString()
          : String(args.tradeId);

      await this.orderRepo.update(
        { tradeId },
        {
          status: 'REJECTED',
          updatedBlock: String(l.blockNumber),
          lastTxHash: l.transactionHash,
        },
      );
    }

    if (eventName === 'AdminResolved') {
      const tradeId =
        typeof args.tradeId === 'bigint'
          ? args.tradeId.toString()
          : String(args.tradeId);
      const newStatus = Number(args.newStatus);

      await this.orderRepo.update(
        { tradeId },
        {
          status: newStatus == 4 ? 'RELEASED' : 'REFUNDED',
          updatedBlock: String(l.blockNumber),
          lastTxHash: l.transactionHash,
        },
      );
    }
  }
}
