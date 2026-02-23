import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

export type KycUploadStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

@Entity({ name: 'kyc_uploads' })
export class KycUploadEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  user!: User;

  @Column({ type: 'varchar', length: 255 })
  originalName!: string;

  @Column({ type: 'varchar', length: 255 })
  filename!: string;

  @Column({ type: 'varchar', length: 120 })
  mimeType!: string;

  @Column({ type: 'int' })
  size!: number;

  @Column({ type: 'varchar', length: 255 })
  relativePath!: string; // e.g. "kyc/abc.png"

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status!: KycUploadStatus;

  @CreateDateColumn()
  createdAt!: Date;
}
