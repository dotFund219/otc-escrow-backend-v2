import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('sync_state')
export class SyncStateEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  key!: string; // e.g., 'block_sync'

  @Column({ type: 'bigint', default: 0 })
  lastProcessedBlock!: string; // Store as string to avoid JS number precision issues

  @UpdateDateColumn()
  updatedAt!: Date;
}
