import { Entity, Column, Index, PrimaryColumn } from 'typeorm';

@Entity()
export class Process {
  @PrimaryColumn()
  id: string;

  @Column()
  contract: number;

  @Column()
  user_id: number;

  @Column()
  transaction_hash: string;

  @Column()
  document_hash: string;

  @Column({type: 'jsonb', nullable: true})
  public_meta: any

  @Column({type: 'jsonb', nullable: true})
  private_meta: any

  @Column()
  status: 'pending' | 'completed';
}
