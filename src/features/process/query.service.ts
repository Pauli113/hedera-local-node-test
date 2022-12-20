import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Contract } from '../contract/contract.entity';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Process } from './process.entity';
import { ContractService } from '../contract/contract.service';
import { Signature } from './signature.entity';
import { ApolloClient, gql, NormalizedCacheObject } from '@apollo/client/core';
import { graphQLClient } from '../../lib/graphql';
import { Web3Service } from '../web3/web3.service';


const GET_PROCESSES = gql`
  query GetProcesses($processIds: [String!]!) {
    processes(where: {id_in: $processIds}) {
      id
      signatures {
        id
        fromHash
        toHash
      }
    }
  }
`;

@Injectable()
export class QueryService {

  private client: ApolloClient<NormalizedCacheObject> | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly web3Service: Web3Service,
  ) {
    // TODO: fix this
    if (this.configService.get('GRAPHQL_URL')) {
      this.client = graphQLClient(this.configService.getOrThrow('GRAPHQL_URL'));
    }
  }

  async getPublicProcessBatch(processIds: string[]) {
    if (!this.client) {
      return [];
    }

    const res = await this.client.query({
      query: GET_PROCESSES,
      variables: {
        processIds
      },
      fetchPolicy: "no-cache"
    });

    return res.data.processes;
  }
}
