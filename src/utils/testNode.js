const {
    Client,
    PrivateKey,
    AccountCreateTransaction,
    AccountBalanceQuery,
    Hbar,
    AccountId,
    TransactionId,
    CreateHTSToken
    
} = require("@hashgraph/sdk");
const { exit } = require("process");
require('dotenv').config({ path:'../../.env' })

async function main() {
    const myAccountId = String(process.env.MY_ACCOUNT_ID)
    const myPrivateKey = String(process.env.MY_PRIVATE_KEY)

    if (myAccountId == null || myPrivateKey == null) {
      throw new Error(
        "Environment variables myAccountId and myPrivateKey must be present"
      );
    }
    const node = { "127.0.0.1:50211": new AccountId(3) };
    const client = Client.forNetwork(node).setMirrorNetwork("127.0.0.1:5600");
    //const client = Client.forTestnet()
    client.setOperator(myAccountId, myPrivateKey);

    const newAccount = await new AccountCreateTransaction()
    .setKey(PrivateKey.fromString(myPrivateKey))
    .setInitialBalance(new Hbar(10000))
    .execute(client)   

    console.log(newAccount)

    // Get the new account ID
    const getReceipt = await newAccount.getReceipt(client);
    const newAccountId = getReceipt.accountId;

    console.log("The new account ID is: " +newAccountId);

    //Verify the account balance
    const accountBalance = await new AccountBalanceQuery()
        .setAccountId(newAccountId)
        .execute(client);

    console.warn("The new account balance is: " +accountBalance.hbars +" hbar.");
    
    console.warn(`- Mirror Node Explorer URL: http://localhost:9090/#/devnet/transaction/`);

    exit()
}



/*
const { Client, PrivateKey, AccountCreateTransaction, AccountBalanceQuery, Hbar} = require("@hashgraph/sdk");
require("dotenv").config();
async function main() {
    //Grab your Hedera testnet account ID and private key from your .env file
    const myAccountId = '0.0.2';
    const myPrivateKey = '302e020100300506032b65700422042091132178e72057a1d7528025956fe39b0b847f200ab59b2fdd367017f3087137';
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
}*/

main();