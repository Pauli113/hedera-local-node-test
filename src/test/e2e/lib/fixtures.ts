import { StartedTestContainer, GenericContainer, StartedNetwork, Network } from 'testcontainers'
import { TestingModule, Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { resolve } from 'path';
import Web3 from 'web3';
import { ProcessModule } from '../../../src/features/process/process.module';
import { UserModule } from '../../../src/features/user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { compileAllContracts, deployContract, dumpABI } from '../../../src/lib/contract';
import { deployEmptySubgraph, deploySubgraph } from '../../../src/subgraph/lib';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createSubgraph } from '../../../src/lib/graph-protocol';
import { deployRegistry } from '../../../src/registry/lib';
import { ContractModule } from '../../../src/features/contract/contract.module';

const GANACHE_PORT = 8545;
const POSTGRES_PORT = 5432;
const GRAPHQL_PORT = 8000;
const GRAPH_NODE_PORT = 8020;
const IPFS_PORT = 5001;

const CONTRACT_BASE = resolve('./contracts');

export class TrustEngineFixture {
  private network: StartedNetwork;

  private registryAddress: string;

  ganache: StartedTestContainer;
  postgres: StartedTestContainer;
  postgresGraph: StartedTestContainer;
  graphNode: StartedTestContainer;
  ipfs: StartedTestContainer;

  app: INestApplication;
  moduleFixture: TestingModule;

  get web3() {
    return new Web3(`ws://${this.ganache.getHost()}:${this.ganache.getMappedPort(GANACHE_PORT)}`);
  }

  get graphQLURL() {
    return `${this.graphNode.getHost()}:${this.graphNode.getMappedPort(GRAPHQL_PORT)}/subgraphs/name/dedoco-tech/trust-engine`;
  }

  get nodeURL() {
    return `http://${this.graphNode.getHost()}:${this.graphNode.getMappedPort(GRAPH_NODE_PORT)}`;
  }

  get ipfsURL() {
    return `http://${this.ipfs.getHost()}:${this.ipfs.getMappedPort(IPFS_PORT)}`;
  } 

  async start(params: { deployGraph: boolean}) {
    /**
     * Start datastore
     */
    console.warn('STARTING POSTGRES');
    const containerP = new GenericContainer("postgres:12.4")
      .withExposedPorts(POSTGRES_PORT)
      .withEnvironment({
        POSTGRES_USER: 'trust',
        POSTGRES_PASSWORD: 'trust',
        POSTGRES_DB: 'trust',
      })
      .start()
 
     /**
      * Start Ganache
      */
    this.network = await new Network().start();

    console.warn('STARTING GANACHE');
    const containerG = new GenericContainer("trufflesuite/ganache")
      .withExposedPorts(GANACHE_PORT)
      .withNetwork(this.network)
      .withNetworkAliases('ganache')
      .start();

    console.warn('STARTING GRAPH POSTGRES')
    const containerGP = new GenericContainer("postgres:11")
      .withEnvironment({
        POSTGRES_USER: 'graph-node',
        POSTGRES_PASSWORD: 'let-me-in',
        POSTGRES_DB: 'graph-node',
        POSTGRES_INITDB_ARGS: "-E UTF8 --locale=C"                
      })
      .withNetwork(this.network)
      .withNetworkAliases('graph_postgres')
      .start()

    console.warn('STARTING IPFS');
    const containerI = new GenericContainer("ipfs/go-ipfs:v0.10.0")
      .withNetwork(this.network)
      .withNetworkAliases('ipfs')
      .withExposedPorts(IPFS_PORT)      
      .start()

    console.warn('STARTING GRAPH NODE');
    const containerN = new GenericContainer("graphprotocol/graph-node")
      .withNetwork(this.network)
      .withEnvironment({
        postgres_host: 'graph_postgres',
        postgres_user: 'graph-node',
        postgres_pass: 'let-me-in',
        postgres_db: 'graph-node',
        ipfs: 'ipfs:5001',
        ethereum: 'matic:http://ganache:8545',
        GRAPH_LOG: 'info'
      })
      .withExposedPorts(GRAPHQL_PORT, GRAPH_NODE_PORT)
      .start()

    this.ganache = await containerG
    console.warn('GANACHE STARTED. DEPLOYING REGISTRY...')
 
     /**
      * Registry Deployment
      */
    const web3 = this.web3;

    const allContracts = await compileAllContracts(CONTRACT_BASE);

    const {
      rootAccount,
      registryAddress
    } = await deployRegistry(web3, allContracts);

    this.registryAddress = registryAddress;

    this.postgres = await containerP;

    console.warn('DATASTORES STARTED. STARTING APP...');
 
     /**
      * Create app
      */
    this.graphNode = await containerN

    this.moduleFixture = await Test.createTestingModule({
      imports: [
        ProcessModule,
        UserModule,
        ContractModule,
        TypeOrmModule.forRootAsync({
          useFactory: (configService: ConfigService) => ({
            type: 'postgres' as 'postgres',
            host: this.postgres.getHost(),
            port: this.postgres.getMappedPort(POSTGRES_PORT),
            username: 'trust',
            password: 'trust',
            database: 'trust',
            autoLoadEntities: true,
            synchronize: true,
            // ------------
            // logging: true,
          }),
        }),
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.test.env', // IGNORE
          load: [
            () => ({
              HEDERA_NETWORK: 'testnet',
              GANACHE_HOST: this.ganache.getHost(),
              GANACHE_PORT: this.ganache.getMappedPort(GANACHE_PORT),
              CONTRACT_BASE,
              REGISTRY_ADDRESS: this.registryAddress,
              ROOT_ACCOUNT: rootAccount,
              GRAPHQL_URL: this.graphQLURL,
            })
          ]
        })
      ],
    }).compile();
   
    this.app = await this.moduleFixture.createNestApplication().init();
 
    /**
    * Graph
    */
    this.postgresGraph = await containerGP
    this.ipfs = await containerI;   

    console.warn('GRAPH STARTED. DEPLOYING SUBGRAPH...');

    /**
      * Subgraph
    */
    // Create subgraph
    await createSubgraph(this.nodeURL);

    /**
      * Register Docker logs
      */
     const logs = await this.graphNode.logs();
     logs
       .on("data", line => console.log(line))
       .on("err", line => console.error(line))
       .on("end", () => console.log("Stream closed"));    

    // Compile and write out ABIs
    // TODO: Should we be doing this?
    console.warn('DUMPING ABIS to subgraph directory');
    const OUTPUT_BASE = resolve('./subgraph/abis');
    dumpABI(allContracts, OUTPUT_BASE);
    
    if(params.deployGraph) {
      await deploySubgraph({
        install: false,
        registryAddress: this.registryAddress,
        nodeURL: this.nodeURL,
        ipfsURL: this.ipfsURL,        
      });
    } else {
      await deployEmptySubgraph({
        install: false,
        registryAddress: this.registryAddress,
        nodeURL: this.nodeURL,
        ipfsURL: this.ipfsURL,
      });
    }
  }

  async deployGraph() {
    await deploySubgraph({
      install: false,
      registryAddress: this.registryAddress,
      nodeURL: this.nodeURL,
      ipfsURL: this.ipfsURL,
    })
  }

  async stop() {
    if (this.app) {
      await this.app.close();
    }

    if (this.ganache) {
      await this.ganache.stop();
    }

    if (this.ipfs) {
      await this.ipfs.stop();
    }

    if (this.graphNode) {
      await this.graphNode.stop();
    }

    if (this.postgres) {
      await this.postgres.stop();
    }

    if (this.postgresGraph) {
      await this.postgresGraph.stop();
    }    

    if (this.network) {
      await this.network.stop();
    }    
  }
}

export class HederaFixture {
  postgres: StartedTestContainer;

  app: INestApplication;
  moduleFixture: TestingModule;

  async start() {
    /**
     * Start datastore
     */
    console.warn('STARTING POSTGRES');
    const containerP = new GenericContainer("postgres:12.4")
      .withExposedPorts(POSTGRES_PORT)
      .withEnvironment({
        POSTGRES_USER: 'trust',
        POSTGRES_PASSWORD: 'trust',
        POSTGRES_DB: 'trust',
      })
      .start();

    this.postgres = await containerP;

    console.warn('DATASTORES STARTED. STARTING APP...');
 
     /**
      * Create app
      */
    this.moduleFixture = await Test.createTestingModule({
      imports: [
        ProcessModule,
        UserModule,
        ContractModule,
        TypeOrmModule.forRootAsync({
          useFactory: (configService: ConfigService) => ({
            type: 'postgres' as 'postgres',
            host: this.postgres.getHost(),
            port: this.postgres.getMappedPort(POSTGRES_PORT),
            username: 'trust',
            password: 'trust',
            database: 'trust',
            autoLoadEntities: true,
            synchronize: true,
            // ------------
            // logging: true,
          }),
        }),
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.test.env', // IGNORE
          load: [
            () => ({
              HEDERA_NETWORK: 'testnet',
              CONTRACT_BASE,
              // Stubbed
              GANACHE_HOST: 'localhost',
              GANACHE_PORT: 8545,
              // GRAPHQL_URL: `localhost:1234/subgraphs/name/dedoco-tech/trust-engine`,
              // REGISTRY_ADDRESS: this.registryAddress,
              // ROOT_ACCOUNT: rootAccount,
            })
          ]
        })
      ],
    }).compile();
   
    this.app = await this.moduleFixture.createNestApplication().init();
  }

  async stop() {
    if (this.app) {
      await this.app.close();
    }

    if (this.postgres) {
      await this.postgres.stop();
    }
  }
}
