import { Body, Controller, Get, HttpCode, HttpException, Param, Post, Query, UseGuards, Request } from '@nestjs/common';
import { ContractService } from './contract.service';
import { APIKeyAuthGuard } from '../user/api-key.guard';
import { PolygonService } from './polygon.service';
import { HederaService } from './hedera.service';
import { ContractDataService } from './contract.data.service';

@Controller()
export class ContractController {
  constructor(
    private readonly contractService: ContractService,
    private readonly contractDataService: ContractDataService,
  ) {}

  @Post('/v2/contracts/managed')
  @HttpCode(200)
  @UseGuards(APIKeyAuthGuard)
  async deployProcessContract(@Request() req, @Body() body) {
    const userId = req.user.id;
    const contractType = this.contractDataService.getContractType(body.type);
    if (!contractType) {
      throw new HttpException({
        error: `Invalid contract type ${body.type}`,
      }, 400);
    }

    const contractName = body.name;
    const chain = body.chain;

    if (!contractName) {
      throw new HttpException({
        error: `Need name for contract`,
      }, 400);
    }

    if (!chain || !['polygon', 'hedera'].includes(chain)) {
      throw new HttpException({
        error: `Need valid chain for contract`,
      }, 400);
    }

    /**
     * Check if already deployed
     */
    const existingContract = await this.contractDataService.getManaged(userId, contractName);
    if (existingContract) {
      if (existingContract.chain !== chain) {
        throw new HttpException({
          message: `Cannot deploy contract ${contractName} on chain ${chain} because it is already deployed on chain ${existingContract.chain}`
        }, 400);
      }

      const existingContractType = this.contractDataService.getContractType(existingContract.type);
      if (!contractType) {
        throw new HttpException(`Invalid contract type on existing contract ${existingContract.type} ${existingContract.id}`, 500);
      }

      if (existingContractType.name !== contractType.name) {
        throw new HttpException({
          message: `Cannot deploy contract type ${contractType.name} on existing contract ${existingContract.name}`
        }, 400);
      }
    }

    const newAddress = await this.contractService.deployContract({
      chain,
      userId: req.user.id,
      name: contractName,
      type: body.type,
      abi: contractType.abi,
      bytecode: contractType.bytecode,
    });

    /**
     * Write the contract to the database
     */
    const contractId = await this.contractDataService.storeManaged({
      userId: req.user.id, 
      chain,
      name: contractName, 
      type: body.type, 
      address: newAddress
    });

    return {
      id: contractId,
      address: newAddress
    };
  }
}
