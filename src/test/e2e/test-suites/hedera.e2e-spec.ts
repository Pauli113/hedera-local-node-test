
const axios = require('axios')
const {
  PrivateKey,
  Hbar,
  AccountId,
  TokenFreezeTransaction,
  Client,
  AccountCreateTransaction,
  FileCreateTransaction,
  Key,
  AccountUpdateTransaction,
  AccountBalanceQuery
} = require("@hashgraph/sdk")
require("dotenv").config();

describe('hedera localnode', () => {
    jest.setTimeout(1250000)

  it('should check key generation tool',async () => {
    const filePrivateKey = PrivateKey.generateED25519(); 
    console.warn(String(filePrivateKey))
    const filePublicKey = filePrivateKey.publicKey;
    console.warn(String(filePublicKey))
    //compares if pvt and pub key are not equal
    console.warn(filePrivateKey==filePublicKey)
  })

  it('should create an account', async() => {
    const myAccountId = '0.0.1032';
    const myPrivateKey = 'ab2ca606fb4a844c5fb6c64f747de3bfd763aff285409d97d197661c78d1316e';
    // If we weren't able to grab it, we should throw a new error
    if (myAccountId == null ||
      myPrivateKey == null ) {
      throw new Error("Environment variables myAccountId and myPrivateKey must be present");
  }

  //need to switch to localnet
  //const client = Client.forTestnet()
  //const node = {"127.0.0.1:50211": new AccountId(3)};
  //const client = Client.forNetwork(node).setMirrorNetwork("127.0.0.1:5600");
  const node = {"127.0.0.1:50211": new AccountId(3)};
  const client = Client.forNetwork(node).setMirrorNetwork("127.0.0.1:5600");

  const newAccountPrivateKey = PrivateKey.generateED25519(); 
  const newAccountPublicKey = newAccountPrivateKey.publicKey;
  
  //Create a new account with 1,000 tinybar starting balance
  const newAccount = new AccountCreateTransaction()
  .setKey(myPrivateKey)
  .setInitialBalance(Hbar.fromTinybars(1000));

  // Get the new account ID
//const getReceipt = await newAccount.getReceipt(client);
//const newAccountId = getReceipt.accountId;

//Log the account ID
//console.log("The new account ID is: " +newAccountId);

  })

  it('should create a signed transaction', async() => {
    const myAccountId = process.env.MY_ACCOUNT_ID;
    const myPrivateKey = process.env.MY_PRIVATE_KEY;
    const newAccountPrivateKey = PrivateKey.generateED25519(); 
    const newAccountPublicKey = newAccountPrivateKey.publicKey;

    const node = {"127.0.0.1:50211": new AccountId(3)};
    const client = Client.forNetwork(node).setMirrorNetwork("127.0.0.1:5600");
    client.setOperator(myAccountId, myPrivateKey);
   
    const transaction = await new AccountUpdateTransaction()
    .setAccountId(myAccountId)
    .setKey(newAccountPublicKey)
    .freezeWith(client)

    //Sign the transaction with a private key
    const signedTransaction = await transaction.sign(PrivateKey.fromString(myPrivateKey))
    console.warn(signedTransaction)
  })
/*
  it('should create an unsigned transaction - fails?', async()=> {

    const myAccountId = process.env.MY_ACCOUNT_ID;
    const myPrivateKey = process.env.MY_PRIVATE_KEY;
    const newAccountPrivateKey = PrivateKey.generateED25519(); 
    const newAccountPublicKey = newAccountPrivateKey.publicKey;

    const node = {"127.0.0.1:50211": new AccountId(3)};
    const client = Client.forNetwork(node).setMirrorNetwork("127.0.0.1:5600");

    client.setOperator(myAccountId, myPrivateKey);

    const transaction = new AccountCreateTransaction()
    .setKey(newAccountPublicKey)
    .setInitialBalance(Hbar.fromTinybars(1000))
    .execute(client)  

    //Freeze the transaction for signing
    //The transaction cannot be modified after this point

    const freezeTransaction = await transaction.freezeWith(client);

    const txResponse = await freezeTransaction.execute(client);

    const receipt = await txResponse.getReceipt(client);
    const newAccountId = receipt.accountId;
    console.log("The new account ID is " +newAccountId);
  })*/
  
  it('should create an unsigned transaction', async()=> {
    const myAccountId = process.env.MY_ACCOUNT_ID;
    const myPrivateKey = process.env.MY_PRIVATE_KEY;
    const newAccountPrivateKey = PrivateKey.generateED25519(); 
    const newAccountPublicKey = newAccountPrivateKey.publicKey;

    const node = {"127.0.0.1:50211": new AccountId(3)};
    const client = Client.forNetwork(node).setMirrorNetwork("127.0.0.1:5600");

    client.setOperator(myAccountId, myPrivateKey);

    const transaction = new AccountCreateTransaction()
    .setKey(newAccountPublicKey)
    .setInitialBalance(Hbar.fromTinybars(1000));

    //Freeze the transaction for signing
    //The transaction cannot be modified after this point
    const freezeTransaction = transaction.freezeWith(client);

  })

  it('paul localnet - unsigned', async() => {
    const ACCOUNT_ID = '0.0.1032';
    const BASE_KEY = 'ab2ca606fb4a844c5fb6c64f747de3bfd763aff285409d97d197661c78d1316e';

    const node = {"127.0.0.1:50211": new AccountId(3)};
    const client = Client.forNetwork(node).setMirrorNetwork("127.0.0.1:5600");
    const privateKey = PrivateKey.fromStringECDSA(BASE_KEY)
    const publicKey = privateKey.publicKey;

    client.setOperator(ACCOUNT_ID, privateKey);

    const transaction = new AccountCreateTransaction()
    .setKey(publicKey)
    .setInitialBalance(Hbar.fromTinybars(1000));

    const freezeTransaction = transaction.freezeWith(client);
    console.warn(freezeTransaction)

  })

  it('paul localnet - signed', async() => {
    const myAccountId = '0.0.1032';
    const myPrivateKey = 'ab2ca606fb4a844c5fb6c64f747de3bfd763aff285409d97d197661c78d1316e';
    const newAccountPrivateKey = PrivateKey.generateED25519(); 
    const newAccountPublicKey = newAccountPrivateKey.publicKey;

    const node = {"127.0.0.1:50211": new AccountId(3)};
    const client = Client.forNetwork(node).setMirrorNetwork("127.0.0.1:5600");
    client.setOperator(myAccountId, myPrivateKey);
   
    const transaction = await new AccountUpdateTransaction()
    .setAccountId(myAccountId)
    .setKey(newAccountPublicKey)
    .freezeWith(client)
    //const txResponse = transaction.execute(client);

    const signedTransaction = await transaction.sign(PrivateKey.fromString(myPrivateKey))
    console.warn(signedTransaction)
  })

})