import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllContracts, compileAllContracts } from '../../lib/contract';
import { Web3Service } from '../web3/web3.service';
import { Contract } from './contract.entity';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { deprecate } from 'util';


@Injectable()
export class ContractDataService {

  private allContracts: AllContracts;

  constructor(
    private readonly configService: ConfigService,
    private readonly web3Service: Web3Service,
    private readonly dataSource: DataSource,
    @InjectRepository(Contract) private contractsRepository: Repository<Contract>,
  ) {
    this.allContracts = compileAllContracts(this.configService.getOrThrow('CONTRACT_BASE'))
  }

  // this is polygon specific...
  getContractRegistry() {
    const web3 = this.web3Service.getWeb3();

    return new web3.eth.Contract(
      this.allContracts.registry.abi,
      this.configService.getOrThrow('REGISTRY_ADDRESS'),
    );
  }

  getContractType(contractType: string) {
    return this.allContracts.contracts[contractType]
  }

  /**
   * DB
   */
  async storeManaged(params: {
    userId: number,
    chain: 'polygon' | 'hedera',
    name: string,
    type: string,
    address: string,
  }) {
    const contract = await this.dataSource.transaction(async (manager) => {
      // clear name for existing contract with name
      await manager.
        createQueryBuilder()
        .update(Contract)
        .set({
          name: null
        })
        .where({
          user_id: params.userId,
          name: params.name
        })
        .execute()

      return manager
        .createQueryBuilder()
        .insert()
        .into(Contract)
        .values({
          user_id: params.userId,
          name: params.name,
          type: params.type,
          address: params.address,
          chain: params.chain,
        })
        .returning("id")
        .execute()
    });

    return contract.raw[0].id;
  }

  async getManaged(userId: number, contractName: string) {
    return this.contractsRepository.findOne({
      where: {
        user_id: userId,
        name: contractName,
      }
    })
  }

  async getById(userId: number, contractId: number) {
    return this.contractsRepository.findOne({
      where: {
        id: contractId,
        user_id: userId
      }
    });
  }    

}