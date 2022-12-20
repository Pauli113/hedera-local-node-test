import { HttpException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllContracts, compileAllContracts, deployContract } from '../../lib/contract';
import { Web3Service } from '../web3/web3.service';
import { Contract } from './contract.entity';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { 
  Client,
  AccountId,
  AccountBalanceQuery,
  AccountCreateTransaction,
  ContractCreateTransaction,
  FileCreateTransaction,
  FileAppendTransaction,
  FileId,
  Key,
  PrivateKey,
  Hbar,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  Status,
} from '@hashgraph/sdk';
import web3 from 'web3';
import * as MUUID from 'uuid-mongodb';

function convHex(hexString: string) {
  const cleanHexString = hexString.length % 2 === 0 ? hexString : '0' + hexString;

  const base = Uint8Array.from(Buffer.from(cleanHexString, 'hex'));
  if (base.length > 32) {
    throw new Error("too large")
  }

  const fill = new Uint8Array(32 - base.length).fill(0);
  const merged = new Uint8Array(32);
  merged.set(fill);
  merged.set(base, fill.length);

  return merged;
}

@Injectable()
export class HederaService implements OnModuleDestroy {

  client: Client

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.client = Client.forNetwork(this.configService.getOrThrow('HEDERA_NETWORK'));
  }

  onModuleDestroy() {
    this.client.close();
  }  

  async deployContract(params: {
    bytecode: any
  }) {
    const ACCOUNT_ID = this.configService.getOrThrow('HEDERA_ACCOUNT');
    const BASE_KEY = this.configService.getOrThrow('HEDERA_KEY');

    const client = this.client;
    client.setOperator(ACCOUNT_ID, BASE_KEY);

    const balance = await new AccountBalanceQuery()
        .setAccountId(ACCOUNT_ID)
        .execute(client);

    console.log("The hbar account balance for this account is " + balance.hbars);

    const filePrivateKey = PrivateKey.generateED25519();
    const contractBytecode = params.bytecode;

    // Split contractBytecode into fixed size chunks of 4000 bytes
    let chunks: string[] = [];
    for (let i = 0; i < contractBytecode.length; i += 4000) {
      chunks.push(contractBytecode.slice(i, i + 4000));
    }

    const fileCreateTx = new FileCreateTransaction()
        .setKeys([filePrivateKey.publicKey])
        //Set the bytecode of the contract
        .setContents(chunks[0])
        .freezeWith(client)

    const fileCreateSign = await fileCreateTx.sign(filePrivateKey);
    const fileCreateSubmit = await fileCreateSign.execute(client);
    const fileReceipt = await fileCreateSubmit.getReceipt(client);    

    const fileId = fileReceipt.fileId;
    if (!fileId) {
      throw new Error("fileID is null")
    }

    console.log("The smart contract byte code file ID is " + fileId);

    for (const chunk of chunks.slice(1)) {
      const fileAppendTx = new FileAppendTransaction()
        .setFileId(fileId)
        // .setMaxTransactionFee(new Hbar(0.75))
        .setContents(chunk)
        .freezeWith(client);
      const fileAppendSign = await fileAppendTx.sign(filePrivateKey);
      await fileAppendSign.execute(client);
    }

    // // create contract from file
    const contractInstantiateTx = new ContractCreateTransaction()
      .setBytecodeFileId(fileId)
      .setGas(100000)
      // .setConstructorParameters(new ContractFunctionParameters().addString("Alice").addUint256(111111));
    const contractInstantiateSubmit = await contractInstantiateTx.execute(client);
    const contractInstantiateRx = await contractInstantiateSubmit.getReceipt(client);
    const contractId = contractInstantiateRx.contractId;
    if (!contractId) {
      throw new Error("Error creating contract");
    }
    const contractAddress = contractId?.toSolidityAddress();
    console.log(`- The smart contract ID is: ${contractId} \n`);
    console.log(`- Smart contract ID in Solidity format: ${contractAddress} \n`);

    return contractId.toString();
  }

  async createProcess(params: {
    contractType: string,
    address: string,
    documentHash: string,
    signers: string[]
  }) {
    const processId = JSON.stringify(MUUID.v4()).replace(/(^\"|\"$)/g, '');

    const hexSigners = params.signers.map((s: string) => {
      return convHex(web3.utils.asciiToHex(s).slice(2))
    });

    const contractExecuteTx = new ContractExecuteTransaction()
      .setContractId(params.address)
      .setGas(1000000)
      .setFunction(
        "createProcess",
        new ContractFunctionParameters()
          .addBytes32(convHex(web3.utils.asciiToHex(processId).slice(2)))
          .addBytes32(convHex(params.documentHash.slice(2)))
          .addBytes32Array(hexSigners)
      )
      .setMaxTransactionFee(new Hbar(0.75));

    try {

      const contractExecuteSubmit = await contractExecuteTx.execute(this.client);

      const receipt = await contractExecuteSubmit.getReceipt(this.client);

      return {
        processId,
        transactionHash: contractExecuteSubmit.transactionId.toString(),
        completed: receipt.status === Status.Success
      };
    } catch (e) {
      console.error(e);
      throw new HttpException({
        error: e.name === 'StatusError' ? e.status.toString() : e.name,
        message: e.message,
      }, 500);
    }
  }

  async signProcessV2(params: {
    address: string,
    //
    processId: string,
    signer: string,
    signature: string,
    fromHash: string,
    toHash: string,
    publicMeta: any
  }) {
    const contractExecuteTx = new ContractExecuteTransaction()
      .setContractId(params.address)
      .setGas(1000000)
      .setFunction(
        "sign",
        new ContractFunctionParameters()
          .addBytes32(convHex(web3.utils.asciiToHex(params.processId).slice(2)))
          .addBytes32(convHex(web3.utils.asciiToHex(params.signer).slice(2)))
          .addBytes32(convHex(web3.utils.asciiToHex(params.signature).slice(2)))
          .addBytes32(convHex(params.fromHash.slice(2)))
          .addBytes32(convHex(params.toHash.slice(2)))
          .addString(JSON.stringify(params.publicMeta || {}))
      )
      .setMaxTransactionFee(new Hbar(0.75));

    try {
      const contractExecuteSubmit = await contractExecuteTx.execute(this.client);
      const receipt = await contractExecuteSubmit.getReceipt(this.client);

      return {
        transactionHash: contractExecuteSubmit.transactionId.toString(),
        completed: receipt.status === Status.Success,
      }
    } catch(e) {
      console.error(e);
      throw new HttpException({
        error: e.name === 'StatusError' ? e.status.toString() : e.name,
        message: e.message,
      }, 500);
    }
  }

  async signProcessV1(params: {
    address: string,
    //
    processId: string,
    signer: string,
    fromHash: string,
    toHash: string,
  }) {
    const contractExecuteTx = new ContractExecuteTransaction()
      .setContractId(params.address)
      .setGas(1000000)
      .setFunction(
        "sign",
        new ContractFunctionParameters()
          .addBytes32(convHex(web3.utils.asciiToHex(params.processId).slice(2)))
          .addBytes32(convHex(web3.utils.asciiToHex(params.signer).slice(2)))
          .addBytes32(convHex(params.fromHash.slice(2)))
          .addBytes32(convHex(params.toHash.slice(2)))
      )
      .setMaxTransactionFee(new Hbar(0.75));

    try {
      const contractExecuteSubmit = await contractExecuteTx.execute(this.client);
      const receipt = await contractExecuteSubmit.getReceipt(this.client);

      return {
        transactionHash: contractExecuteSubmit.transactionId.toString(),
        completed: receipt.status === Status.Success
      }
    } catch (e) {
      console.error(e);
      throw new HttpException({
        error: e.name === 'StatusError' ? e.status.toString() : e.name,
        message: e.message,
      }, 500);      
    }
  }  

  async storeBreadcrumb(params: {
    address: string,
    //
    signer: string,
    publicMeta: any
  }) {
    const contractExecuteTx = new ContractExecuteTransaction()
      .setContractId(params.address)
      .setGas(1000000)
      .setFunction(
        "sign",
        new ContractFunctionParameters()
          .addBytes32(convHex(web3.utils.asciiToHex(params.signer).slice(2)))
          .addString(JSON.stringify(params.publicMeta || {}))
      )
      .setMaxTransactionFee(new Hbar(0.75));

    try {
      const contractExecuteSubmit = await contractExecuteTx.execute(this.client);
      const receipt = await contractExecuteSubmit.getReceipt(this.client);

      return {
        transactionHash: contractExecuteSubmit.transactionId.toString(),
        completed: receipt.status === Status.Success
      }
    } catch(e) {
      console.error(e);
      throw new HttpException({
        error: e.name === 'StatusError' ? e.status.toString() : e.name,
        message: e.message,
      }, 500);      
    }
  }    
}
