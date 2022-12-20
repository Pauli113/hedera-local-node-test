import { Entity, Column, Index, PrimaryColumn, ManyToOne } from 'typeorm';
import { Process } from './process.entity';

@Entity()
export class Signature {
  @PrimaryColumn()
  hash: string;

  @Column()
  user_id: number;

  @Column()
  process_id: string;

  @Column({type: 'jsonb', nullable: true})
  public_meta: any

  @Column({type: 'jsonb', nullable: true})
  private_meta: any

  @Column()
  from_hash: string

  @Column({nullable: false})
  to_hash: string
  
  @Column()
  status: 'pending' | 'completed';
}
