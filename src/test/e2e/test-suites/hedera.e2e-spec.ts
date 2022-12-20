import { curl } from '../lib/curl';
import { UserService } from '../../../src/features/user/user.service';
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
} from '@hashgraph/sdk';

import { HederaFixture } from '../lib/fixtures';

const HEDERA_PORT = 50211;
const MIRROR_PORT = 5600;

// yarn test:e2e -i test/e2e/test-suites/hedera.e2e-spec.ts
describe('Trust Engine', () => {

  let fixture: HederaFixture

  jest.setTimeout(30000)
  
  beforeEach(async () => {
    fixture = new HederaFixture();
    await fixture.start()
  });
  
  afterEach(async () => {
    await fixture.stop()
  });

  // yarn test:e2e -i test/e2e/test-suites/hedera.e2e-spec.ts -t 'breadcrumbs'
  it('breadcrumbs', async() => {
    /**
     * Managed process
     */
    const app = fixture.app;

    // Set up users
    const userService = app.get(UserService);
    const user1 = await userService.createUser('jieren@lychee.ai');

    await curl(app).post(
      {
        url: `/v2/contracts/managed`,
        basicAuth: [user1.apiKey, '_'],
        json: {
          chain: 'hedera',
          name: 'audit',
          type: 'audit/v1'
        },
      },
      (_, resp) => {
        console.warn(resp);
      }
    );

    const signer = '123';

    await curl(app).post(
      {
        url: `/v2/breadcrumbs`,
        basicAuth: [user1.apiKey, '_'],
        json: {
          contract: 'audit',
          signer,
          publicMeta: {
            test: 'test'
          }
        },
      },
      (_, resp) => {
        console.warn(resp);
      }
    );
  })

  // yarn test:e2e -i test/e2e/test-suites/hedera.e2e-spec.ts -t 'process'
  it('process', async() => {
    /**
     * Managed process
     */
    const app = fixture.app;

    // Set up users
    const userService = app.get(UserService);
    const user1 = await userService.createUser('jieren@lychee.ai');

    await curl(app).post(
      {
        url: `/v2/contracts/managed`,
        basicAuth: [user1.apiKey, '_'],
        json: {
          chain: 'hedera',
          name: 'test/v1',
          type: 'process/v2',
        },
      },
      (_, resp) => {
        console.warn(resp);
      }
    );

    const DHASH_1 = '0x123';
    const DHASH_2 = '0x124';
    const signer = '123';
    const signature = '123.sig';    
    const processId = await curl(app).post(
      {
        url: `/v2/processes`,
        basicAuth: [user1.apiKey, '_'],
        json: {
          contract: 'test/v1',
          signers: [
            signer
          ],
          documentHash: DHASH_1,
          publicMeta: {
            name: 'test',
          },
          privateMeta: {
            nric: '123123'
          }
        },
      },
      (_, resp) => {
        return resp.id;
      },
    );

    await curl(app).post(
      {
        url: `/v2/processes/${encodeURIComponent(processId)}/sign`,
        basicAuth: [user1.apiKey, '_'],
        json: {
          signer,
          signature,
          fromHash: DHASH_1,
          toHash: DHASH_2,
          publicMeta: {
            description: 'testing signatures',
            name: 'test2',
          },
          privateMeta: {
            email: 'jieren.chen@gmail.com',
          }
        }
      },
      (_, resp) => {
        console.warn(resp)
      }
    );

    await curl(app).get(
      {
        url: `/v2/query?processId=${encodeURIComponent(processId)}`,
        basicAuth: [user1.apiKey, '_'],
      },
      (_, resp) => {
        console.warn(JSON.stringify(resp, null, 2));
      }
    );

    // query
  })

  // yarn test:e2e -i test/e2e/test-suites/hedera.e2e-spec.ts -t 'localnet'
  // LOCALNET doesn't work RN
  // it('localnet', async() => {
  //   const ACCOUNT_ID = '0.0.1032';
  //   const BASE_KEY = 'ab2ca606fb4a844c5fb6c64f747de3bfd763aff285409d97d197661c78d1316e';

  //   const client = Client.forLocalNode();
  //   client.setOperator(ACCOUNT_ID, BASE_KEY);

  //   const privateKey = PrivateKey.fromStringECDSA(BASE_KEY)

  //   const transaction = new AccountCreateTransaction()
  //     .setKey(privateKey.publicKey)
  //     .setInitialBalance(new Hbar(1000));
    
  //   const txResponse = await transaction.execute(client);
  //   const receipt = await txResponse.getReceipt(client);

  //   const newAccountId = receipt.accountId;

  //   console.log("The new account ID is " +newAccountId);
  // });
});
