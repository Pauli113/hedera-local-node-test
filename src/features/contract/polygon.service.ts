import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllContracts, compileAllContracts, deployContract } from '../../lib/contract';
import { Web3Service } from '../web3/web3.service';
import { Contract } from './contract.entity';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ContractService } from './contract.service';
import * as MUUID from 'uuid-mongodb';
import web3 from 'web3';
import { ContractDataService } from './contract.data.service';

@Injectable()
export class PolygonService {

  constructor(
    private readonly configService: ConfigService,
    private readonly web3Service: Web3Service,
    private readonly contractDataService: ContractDataService,
  ) {
  }

  async deployContract(params: {
    userId: number,
    name: string,
    type: string,
    abi: any,
    bytecode: any
  }) {
    const ROOT_ACCOUNT = this.configService.getOrThrow('ROOT_ACCOUNT')

    const newAddress = await deployContract(
      this.web3Service.getWeb3(),
      ROOT_ACCOUNT,
      params.abi,
      params.bytecode,
      []
    );

    /**
     * Register the new contract in the registry
     */
    const contractRegistry = this.contractDataService.getContractRegistry();

    const contractNameHex = web3.utils.asciiToHex(params.name);
    const contractTypeHex = web3.utils.asciiToHex(params.type);

    const receipt = await contractRegistry.methods.registerContract(
      params.userId,
      contractNameHex,
      contractTypeHex,
      newAddress
    ).send({
      from: ROOT_ACCOUNT,
      gasLimit: 130000,
      gasPrice: web3.utils.toWei('0.00003', 'ether')
    });

    return newAddress;
  }

  async createProcess(params: {
    contractType: string,
    address: string,
    documentHash: string,
    signers: string[]
  }) {
    const ROOT_ACCOUNT = this.configService.getOrThrow('ROOT_ACCOUNT')

    const contract = this.contractDataService.getContractType(params.contractType);
    if(!contract) {
      throw new HttpException({
        error: 'Not found'
      }, 404);
    }

    if(!contract.flags.includes('process/create')) {
      throw new HttpException({
        error: `Contract type ${params.contractType} does not support process creation`
      }, 400);
    }

    const web3Link = this.web3Service.getWeb3();
    web3Link.eth.handleRevert = true;
    const deployedContract = new web3Link.eth.Contract(contract.abi, params.address);

    // need a processId on this end
    const processId = JSON.stringify(MUUID.v4()).replace(/(^\"|\"$)/g, '');

    if (!web3.utils.isHexStrict(params.documentHash)) {
      throw new HttpException({
        error: 'Invalid document hash',
      }, 400);
    }

    const hexId = web3.utils.asciiToHex(processId);
    const hexSigner = params.signers.map((s: string) => (web3.utils.asciiToHex(s)));

    try {
      const receipt = await deployedContract.methods.createProcess(
        hexId,
        params.documentHash,
        hexSigner
      ).send({
        from: ROOT_ACCOUNT,
        gasLimit: 130000,
        gasPrice: web3.utils.toWei('0.00003', 'ether')
      });
  
      return {
        processId,
        transactionHash: receipt.transactionHash,
        completed: false,
      };
    } catch (e) {
      throw new HttpException({
        error: e.reason
      }, 400);
    }    
  }

  async signProcessV2(params: {
    abi: any,
    address: string,
    //
    processId: string,
    signer: string,
    signature: string,
    fromHash: string,
    toHash: string,
    publicMeta: any
  }) {
    const ROOT_ACCOUNT = this.configService.getOrThrow('ROOT_ACCOUNT');

    const hexId = web3.utils.asciiToHex(params.processId);
    const hexSigner = web3.utils.asciiToHex(params.signer);
    const hexSig = web3.utils.asciiToHex(params.signature);

    const web3Link = this.web3Service.getWeb3();
    web3Link.eth.handleRevert = true;
    const deployedContract = new web3Link.eth.Contract(params.abi, params.address);

    try {
      const receipt = await deployedContract.methods.sign(
        hexId,
        hexSigner,
        hexSig,
        params.fromHash,
        params.toHash,
        JSON.stringify(params.publicMeta || {})
      ).send({
        from: ROOT_ACCOUNT,
        gasLimit: 130000,
        gasPrice: web3.utils.toWei('0.00003', 'ether')
      });

      return {
        transactionHash: receipt.transactionHash,
        completed: false,
      };
    } catch (e) {
      console.error(e);
      throw new HttpException({
        error: e.reason
      }, 400);
    }
  }

  async signProcessV1(params: {
    abi: any,
    address: string,
    //
    processId: string,
    signer: string,
    fromHash: string,
    toHash: string,
  }) {
    const ROOT_ACCOUNT = this.configService.getOrThrow('ROOT_ACCOUNT');

    const web3Link = this.web3Service.getWeb3();
    web3Link.eth.handleRevert = true;
    const deployedContract = new web3Link.eth.Contract(params.abi, params.address);

    const hexId = web3.utils.asciiToHex(params.processId);
    const hexSigner = web3.utils.asciiToHex(params.signer);

    try {
      const receipt = await deployedContract.methods.sign(
        hexId,
        hexSigner,
        params.fromHash,
        params.toHash
      ).send({
        from: ROOT_ACCOUNT,
        gasLimit: 130000,
        gasPrice: web3.utils.toWei('0.00003', 'ether')
      });

      return {
        transactionHash: receipt.transactionHash,
        completed: false,
      };
    } catch (e) {
      console.error(e);
      throw new HttpException({
        error: e.reason
      }, 400);
    }
  }

  async storeBreadcrumb(params: {
    abi: any,
    address: string,
    //    
    signer: string,
    publicMeta: any

  }) {
    const web3Link = this.web3Service.getWeb3();
    const ROOT_ACCOUNT = this.configService.get('ROOT_ACCOUNT');

    web3Link.eth.handleRevert = true;
    const deployedContract = new web3Link.eth.Contract(params.abi, params.address);

    const hexSigner = web3.utils.asciiToHex(params.signer);
      
    try {
      const receipt = await deployedContract.methods.record(
        hexSigner,
        JSON.stringify(params.publicMeta || {})
      ).send({
        from: ROOT_ACCOUNT,
        gasLimit: 130000,
        gasPrice: web3.utils.toWei('0.00003', 'ether')
      });

      return {
        transactionHash: receipt.transactionHash,
        completed: false,
      };
    } catch (e) {
      console.error(e);
      throw new HttpException({
        error: e.reason
      }, 400);
    }
  }  
}

