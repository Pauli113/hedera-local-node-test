import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class APIKey {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user: number;

  @Column()
  api_key: string;
}
