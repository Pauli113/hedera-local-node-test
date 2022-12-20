import { Body, Controller, Get, HttpCode, HttpException, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'
import { ContractService } from '../contract/contract.service';
import { APIKeyAuthGuard } from '../user/api-key.guard';
import { Web3Service } from '../web3/web3.service';
import { ProcessService } from './process.service';
import { PolygonService } from '../contract/polygon.service';
import { HederaService } from '../contract/hedera.service';
import { ContractDataService } from '../contract/contract.data.service';
import Web3 from 'web3';

@Controller()
export class ProcessController {
  constructor(
    private readonly configService: ConfigService,
    private readonly contractDataService: ContractDataService,
    private readonly contractService: ContractService,
    private readonly processService: ProcessService,

    private readonly web3Service: Web3Service,
    // @InjectModel('Process') private readonly processModel: Model<Process>
  ) {}

  @Post('/v2/processes')
  @HttpCode(200)
  @UseGuards(APIKeyAuthGuard)
  async createProcess(@Req() req, @Body() body) {  
    const { contract, documentHash, signers, publicMeta, privateMeta } = body;
    const userId = req.user.id;

    const managed = await this.contractDataService.getManaged(userId, contract);

    if(!managed) {
      throw new HttpException({
        error: 'Not found'
      }, 404);      
    }

    // managed.chain
    const { processId, transactionHash, completed } = await this.contractService.createProcess({
      chain: managed.chain,
      type: managed.type,
      address: managed.address,
      documentHash,
      signers      
    });

    await this.processService.storeProcess({
      userId,
      processId,
      contractId: managed.id, 
      transactionHash,
      documentHash,
      publicMeta,
      privateMeta,
      completed
    });

    return {
      id: processId,
      hash: transactionHash,
    };
  }

  @Post('/v2/processes/:id/sign')
  @HttpCode(200)
  @UseGuards(APIKeyAuthGuard)
  async sign(@Param('id') processId: string, @Req() req, @Body() body) {
    const { signer, signature, fromHash, toHash, publicMeta, privateMeta } = body;

    const userId = req.user.id;

    if (!Web3.utils.isHexStrict(fromHash)) {
      throw new HttpException({
        error: 'Invalid fromHash',
      }, 400);
    }

    if (!Web3.utils.isHexStrict(toHash)) {
      throw new HttpException({
        error: 'Invalid toHash',
      }, 400);
    }

    const managed = await this.processService.getContractForProcess(userId, processId); // TODO: need to lock down by user id
    if (!managed) {
      throw new HttpException({
        error: 'Not found',
      }, 404);
    }

    const { transactionHash, completed } = await this.contractService.signProcess({
      chain: managed.chain,
      type: managed.type,
      address: managed.address,
      processId,
      signer,
      signature,
      fromHash,
      toHash,
      publicMeta,
    });

    await this.processService.storeSignature({
      userId,
      processId,
      transactionHash,
      fromHash,
      toHash,
      publicMeta,
      privateMeta,
      completed,
    });

    return {
      hash: transactionHash
    };
  }

  /**
   * Fake Audit trail stuff
   */
  @Post('/v2/breadcrumbs')
  @HttpCode(200)
  @UseGuards(APIKeyAuthGuard)
  async breadcrumbs(@Req() req, @Body() body) {
    const { signer, contract, publicMeta } = body;

    const managed = await this.contractDataService.getManaged(req.user.id, contract);

    if(!managed) {
      throw new HttpException({
        error: 'Not found'
      }, 404);      
    }

    const { transactionHash } = await this.contractService.storeBreadcrumb({
      chain: managed.chain,
      type: managed.type,
      address: managed.address,
      signer,
      publicMeta,
    })

    return {
      hash: transactionHash
    };
  }
}
