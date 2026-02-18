import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 42 })
  walletAddress: string; // 0x... (lowercase for consistency)

  @Column({ 
    type: 'int', 
    default: 1, 
    comment: '1 = tier 1 (basic), 2 = tier 2 (verified), etc.' })
  kycTier: number;

  @Column({ type: 'varchar', length: 30, nullable: true })
  role: string; // e.g., 'ADMIN', 'TRADER', etc.

  @Column({ type: 'varchar', length: 255, nullable: false })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  companyName: string;

  @CreateDateColumn()
  createdAt: Date;
}