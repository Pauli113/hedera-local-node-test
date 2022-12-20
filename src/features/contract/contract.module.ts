import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ContractService } from '../contract/contract.service';
import { ContractController } from '../contract/contract.controller';
import { UserModule } from '../user/user.module';
import { Web3Module } from '../web3/web3.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract } from '../contract/contract.entity';
import { PolygonService } from './polygon.service';
import { HederaService } from './hedera.service';
import { ContractDataService } from './contract.data.service';

@Module({
  imports: [
    ConfigModule,
    Web3Module,
    UserModule,
    TypeOrmModule.forFeature([Contract]),
  ],
  controllers: [
    ContractController,
  ],
  providers: [
    ContractDataService,
    ContractService,
    PolygonService,
    HederaService,
  ],
  exports: [
    ContractService,
    ContractDataService,
  ]
})
export class ContractModule {}
