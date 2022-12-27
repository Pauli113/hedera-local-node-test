
const axios = require('axios')
const fetch = require('cross-fetch')
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


  it('checks if node is running', async()=> {
   
      await(axios
        .get('http://localhost:9090/testnet/dashboard?p1=1&k1=1671520505.063039003&p2=1&k2=1671520505.540006594&p3=1&k3=1671520496.265415003',{
          responseType: "json",
        })
        .then(function (response) {
          console.warn('node is running')
          if(response.data=''){
            throw 'No transactions'
          }
        })
        .catch(error => console.log(error))
        )     
  })

  it('checks if there are any transactions', async() => {
    await(axios
      .get('http://localhost:5551/api/v1/transactions',{
        responseType: "json",
      })
      .then(function (response) {
       
        console.warn(response.data)
        if(response.data=''){
          throw 'No transactions'
        }
      })
      .catch(error => console.log(error))
      )
  })

  it('should check key generation tool',async () => {
    const filePrivateKey = PrivateKey.generateED25519(); 
    console.warn(String(filePrivateKey))
    const filePublicKey = filePrivateKey.publicKey;
    console.warn(String(filePublicKey))
    //compares if pvt and pub key are not equal
    console.warn(filePrivateKey==filePublicKey)
  })

  it('should create an account', async() => {
    const myAccountId = process.env.MY_ACCOUNT_ID;
    const myPrivateKey = process.env.MY_PRIVATE_KEY;
    // If we weren't able to grab it, we should throw a new error
    if (myAccountId == null ||
      myPrivateKey == null ) {
      throw new Error("Environment variables myAccountId and myPrivateKey must be present");
  }

  // Create our connection to the Hedera network
  // The Hedera JS SDK makes this really easy!
  const client = Client.forTestnet();

  client.setOperator(myAccountId, myPrivateKey);

  //Create new keys
  const newAccountPrivateKey = PrivateKey.generateED25519(); 
  const newAccountPublicKey = newAccountPrivateKey.publicKey;
  console.warn(String(newAccountPrivateKey))
  console.warn(String(newAccountPublicKey))


  //Create a new account with 1,000 tinybar starting balance
  const newAccount = await new AccountCreateTransaction()
      .setKey(newAccountPublicKey)
      .setInitialBalance(Hbar.fromTinybars(1000))
      .execute(client);

  // Get the new account ID
  const getReceipt = await newAccount.getReceipt(client);
  const newAccountId = getReceipt.accountId;

  console.log("The new account ID is: " +newAccountId);

  //Verify the account balance
  const accountBalance = await new AccountBalanceQuery()
      .setAccountId(newAccountId)
      .execute(client);

  console.log("The new account balance is: " +accountBalance.hbars.toTinybars() +" tinybar.");
  })

  it('should sign a transaction', async() => {
    const  accountId = process.env.MY_ACCOUNT_ID;
    const privateKey = process.env.MY_PRIVATE_KEY;

    const client = Client.forTestnet();

    client.setOperator(accountId, privateKey);
    const transaction = await new AccountUpdateTransaction()
     .setAccountId(accountId)
     .setKey(privateKey)
     .execute(client)
     //.freezeWith(client)


     
     const signedTransaction = transaction
      PrivateKey.fromString(privateKey)

    console.log(signedTransaction)
     
  })

  it('should create an unsigned transaction', async()=> {

  })
});
