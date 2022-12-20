import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllContracts, compileAllContracts } from '../../lib/contract';
import { Web3Service } from '../web3/web3.service';
import { Contract } from './contract.entity';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PolygonService } from './polygon.service';
import { HederaService } from './hedera.service';
import { ContractDataService } from './contract.data.service';


@Injectable()
export class ContractService {

  constructor(
    private readonly contractDataService: ContractDataService,
    private readonly polygonService: PolygonService,
    private readonly hederaService: HederaService,
  ) {}

  async deployContract(params: {
    chain: string,
    userId: number,
    name: string,
    type: string,
    abi: any,
    bytecode: any
  }): Promise<string> {
    if(params.chain === 'polygon') {
      return this.polygonService.deployContract(params);
    } else if (params.chain === 'hedera') {
      return this.hederaService.deployContract(params);
    } else {
      throw new HttpException({
        error: `Invalid chain ${params.chain} for contract`,
      }, 500);
    }
  }

  async createProcess(params: {
    chain: string,
    type: string,
    address: string,
    documentHash: string,
    signers: string[]
  }): Promise<{ processId: string, transactionHash: string, completed: boolean }> {
    if (params.chain === 'polygon') {
      return this.polygonService.createProcess({
        contractType: params.type,
        address: params.address,
        documentHash: params.documentHash,
        signers: params.signers
      });
    } else if (params.chain === 'hedera') {
      return this.hederaService.createProcess({
        contractType: params.type,
        address: params.address,
        documentHash: params.documentHash,
        signers: params.signers
      });
    } else {
      throw new HttpException({
        error: `Invalid chain ${params.chain}`
      }, 500);
    }    
  }

  async signProcess(params: {
    chain: string,
    type: string,
    address: string,
    //
    processId: string,
    signer: string,
    signature: string,
    fromHash: string,
    toHash: string,
    publicMeta: any,    
  }): Promise<{ transactionHash: string, completed: boolean }> {
    const contract = this.contractDataService.getContractType(params.type);

    if(contract.flags.includes('process/sign/v2')) {
      if (params.chain === 'polygon') {
        return this.polygonService.signProcessV2({
          abi: contract.abi,
          address: params.address,
          //
          processId: params.processId,
          signer: params.signer,
          signature: params.signature,
          fromHash: params.fromHash,
          toHash: params.toHash,
          publicMeta: params.publicMeta
        });
      } else if (params.chain === 'hedera') {
        return this.hederaService.signProcessV2({
          address: params.address,
          //
          processId: params.processId,
          signer: params.signer,
          signature: params.signature,
          fromHash: params.fromHash,
          toHash: params.toHash,
          publicMeta: params.publicMeta
        });
      } else {
        throw new HttpException({
          error: `Chain ${params.chain} does not support v2 signing`
        }, 400);
      }
    } else if (contract.flags.includes('process/sign/v1')) {
      if (params.publicMeta) {
        throw new HttpException({
          error: `Public metadata not supported for contract type ${contract.key}`
        }, 400);
      }

      if (params.signature) {
        throw new HttpException({
          error: `Signature field not supported for contract type ${contract.key}`
        }, 400);
      }

      if (params.chain === 'polygon') {
        return this.polygonService.signProcessV1({
          abi: contract.abi,
          address: params.address,
          //
          processId: params.processId,
          signer: params.signer,
          fromHash: params.fromHash,
          toHash: params.toHash
        });
      } else if (params.chain === 'hedera') {
        return this.hederaService.signProcessV1({
          address: params.address,
          //
          processId: params.processId,
          signer: params.signer,
          fromHash: params.fromHash,
          toHash: params.toHash,
        });
      } else {
        throw new HttpException({
          error: `Chain ${params.chain} does not support v1 signing`
        }, 400);
      }
    } else {
      throw new HttpException({
        error: `Contract type ${contract.key} does not support process signing`
      }, 400);
    }
  }

  async storeBreadcrumb(params: {
    chain: string,
    type: string,
    address: string,
    //
    signer: string,
    publicMeta: any,
  }): Promise<{ transactionHash: string, completed: boolean }> {

    const contract = this.contractDataService.getContractType(params.type);    

    if(!contract) {
      throw new HttpException({
        error: 'Not found'
      }, 404);      
    }

    if(!contract.flags.includes('audit/breadcrumbs')) {
      throw new HttpException({
        error: `Contract type ${params.type} does not support breadcrumbs`
      }, 400);
    }

    if (params.chain === 'polygon') {
      return this.polygonService.storeBreadcrumb({
        abi: contract.abi,
        address: params.address,
        //
        signer: params.signer,
        publicMeta: params.publicMeta
      });
    } else if (params.chain === 'hedera') {
      return this.hederaService.storeBreadcrumb({
        address: params.address,
        //
        signer: params.signer,
        publicMeta: params.publicMeta
      });
    } else {
      throw new HttpException({
        error: `Chain ${params.chain} does not support breadcrumbs`
      }, 400);      
    }
  }
}
