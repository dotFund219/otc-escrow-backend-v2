import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity({ name: 'siwe_nonces' })
@Index(['walletAddress', 'nonce'], { unique: true })
export class SiweNonce {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 42 })
  walletAddress: string;

  @Column({ type: 'varchar', length: 64 })
  nonce: string;

  @Column({ type: 'boolean', default: false })
  used: boolean;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
