import { StartedTestContainer, GenericContainer, StartedNetwork, Network } from 'testcontainers'
import { TestingModule, Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const POSTGRES_PORT = 5432;
import { ProcessModule } from 'src/features/process/process.module';
import { UserModule } from 'src/features/user/user.module';
import { ContractModule } from 'src/features/contract/contract.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';







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
  