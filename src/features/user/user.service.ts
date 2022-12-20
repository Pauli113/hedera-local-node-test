import { HttpException, Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import path from 'path';
import { ConfigService } from '@nestjs/config';
import Web3 from 'web3';
import crypto from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from './user.entity';
import { APIKey } from './api-key.entity';
import { Web3Service } from '../web3/web3.service';
import EJSWallet from 'ethereumjs-wallet';

@Injectable()
export class UserService {
  constructor(
    private readonly configService: ConfigService,
    private readonly web3Service: Web3Service,
    @InjectRepository(User) private usersRepository: Repository<User>,
    @InjectRepository(APIKey) private apiKeyRepository: Repository<APIKey>,
    private dataSource: DataSource
  ) {}

  async createUser(email: string) {

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await this.dataSource
        .createQueryBuilder()
        .insert()
        .into(User)
        .values({
          email
        })
        .returning("id")
        .execute()
      
      const userId = user.identifiers[0].id;

      const apiKey = await this.dataSource
        .createQueryBuilder()
        .insert()
        .into(APIKey)
        .values({
          user: userId,
          api_key: crypto.randomBytes(16).toString('hex')
        })
        .returning("api_key")
        .execute()

      return {
        apiKey: apiKey.raw[0]['api_key'],
        // user: userCreated,
      };
    } catch (e)  {
      await queryRunner.rollbackTransaction();

      throw new HttpException(e, 500)
    }
  }

  async validateAPIKey(key: string) {
    const apiKey = await this.apiKeyRepository.findOne({
      where: {
        api_key: key
      }
    });

    if (!apiKey) {
      return null
    } else {
      return this.usersRepository.findOne({
        where: {
          id: apiKey.user
        }
      })
    }
  }

  // TODO: cycle api keys

  // wallet is 1-1 with user/platform

  // create managed wallet

  // upload unmanaged wallet
}
