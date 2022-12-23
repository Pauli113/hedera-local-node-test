
const axios = require('axios')
const fetch = require('cross-fetch')
const {
  PrivateKey,
  Hbar,
  AccountId,
  TokenFreezeTransaction,
  Client,
  AccountCreateTransaction,
  FileCreateTransaction
} = require("@hashgraph/sdk")

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

  it('should sign transactions', async() => {
    
  })

   

  
});
