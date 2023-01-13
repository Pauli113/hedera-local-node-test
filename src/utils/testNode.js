const {
    Client,
    PrivateKey,
    AccountCreateTransaction,
    AccountBalanceQuery,
    Hbar,
    AccountId
    
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

main();