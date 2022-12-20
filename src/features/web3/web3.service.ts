import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Web3 from 'web3';

@Injectable()
export class Web3Service {

  web3: Web3

  constructor(
    private readonly configService: ConfigService,
  ) {
    const host = this.configService.getOrThrow('GANACHE_HOST');
    const port = this.configService.getOrThrow('GANACHE_PORT');    

    this.web3 = new Web3(`http://${host}:${port}`);
  }

  getWeb3() {
    return this.web3;
  }
}
