import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('otc_order_events')
@Index(['chainId', 'txHash', 'logIndex'], { unique: true })
@Index(['chainId', 'orderId'])
export class OtcOrderEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int' })
  chainId!: number;

  @Column({ type: 'varchar', length: 42 })
  contract!: string;

  @Column({ type: 'bigint' })
  orderId!: string;

  @Column({ type: 'varchar', length: 48 })
  eventName!: string;

  @Column({ type: 'varchar', length: 66 })
  txHash!: string;

  @Column({ type: 'int' })
  logIndex!: number;

  @Column({ type: 'bigint' })
  blockNumber!: string;

  @Column({ type: 'varchar', length: 66 })
  blockHash!: string;

  @Column({ type: 'json' })
  args!: any;

  @Column({ type: 'datetime', nullable: true })
  blockTime!: Date | null;
}
