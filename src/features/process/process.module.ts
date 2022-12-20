import { forwardRef, Module } from '@nestjs/common';
import { ProcessController } from './process.controller';
import { ConfigModule } from '@nestjs/config';
import { ContractService } from '../contract/contract.service';
import { ContractController } from '../contract/contract.controller';
import { UserModule } from '../user/user.module';
import { Web3Module } from '../web3/web3.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract } from '../contract/contract.entity';
import { Process } from './process.entity';
import { ProcessService } from './process.service';
import { Signature } from './signature.entity';
import { QueryService } from './query.service';
import { QueryController } from './query.controller';
import { ContractModule } from '../contract/contract.module';

@Module({
  imports: [
    ConfigModule,
    Web3Module,
    UserModule,
    ContractModule,
    TypeOrmModule.forFeature([Process, Signature]),
  ],
  controllers: [
    ProcessController,
    QueryController
  ],
  providers: [
    ProcessService,
    QueryService,
  ],
})
export class ProcessModule {}
