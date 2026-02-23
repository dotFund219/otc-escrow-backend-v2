import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

export type OrderStatus =
  | 'OPEN'
  | 'CANCELLED'
  | 'TAKEN'
  | 'DELIVERED'
  | 'REJECTED'
  | 'FINISHED';

@Entity('otc_orders')
@Index(['chainId', 'seller'])
@Index(['chainId', 'status'])
export class OtcOrderEntity {
  @PrimaryColumn({ type: 'bigint' })
  orderId!: string; // uint256 -> string

  @Column({ type: 'int' })
  chainId!: number;

  @Column({ type: 'varchar', length: 42 })
  contract!: string;

  @Column({ type: 'varchar', length: 42 })
  seller!: string;

  @Column({ type: 'varchar', length: 42 })
  sellToken!: string;

  @Column({ type: 'numeric', precision: 65, scale: 0 })
  sellAmount!: string;

  @Column({ type: 'varchar', length: 42 })
  quoteToken!: string;

  @Column({ type: 'numeric', precision: 65, scale: 0 })
  quoteAmount!: string;

  @Column({ type: 'varchar', length: 16, default: 'OPEN' })
  status!: OrderStatus;

  @Column({ type: 'varchar', length: 42, nullable: true })
  buyer!: string | null;

  @Column({ type: 'numeric', precision: 65, scale: 0, nullable: true })
  tradeId!: string | null;

  @Column({ type: 'varchar', length: 256, nullable: true })
  txId!: string | null;

  @Column({ type: 'bigint', nullable: true })
  createdAt!: string | null; // consider using Date if you want to store as timestamp

  @Column({ type: 'bigint', nullable: true })
  createdBlock!: string | null;

  @Column({ type: 'bigint', nullable: true })
  updatedBlock!: string | null;

  @Column({ type: 'varchar', length: 66, nullable: true })
  lastTxHash!: string | null;
}
