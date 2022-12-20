import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity()
@Index(['user_id', 'name'], { unique: true })
export class Contract {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column({nullable: true})
  name: string;

  @Column()
  chain: 'polygon' | 'hedera';

  @Column()
  type: string;

  @Column()
  address: string;

}
