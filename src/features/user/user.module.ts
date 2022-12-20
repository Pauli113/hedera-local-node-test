import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { APIKeyAuth } from './api-key.auth';
import { User } from './user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APIKey } from './api-key.entity';
import { Web3Module } from '../web3/web3.module';

@Module({
  imports: [
    ConfigModule,
    Web3Module,
    TypeOrmModule.forFeature([User, APIKey]),
  ],
  controllers: [],
  providers: [
    UserService,
    APIKeyAuth,
  ],
})
export class UserModule {}
