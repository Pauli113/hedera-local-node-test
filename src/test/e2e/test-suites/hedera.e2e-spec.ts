

const axios = require('axios');

describe('hedera localnode', () => {
  it('checks if node is running', async()=> {
    console.log('test running')
    console.log(axios.get('http://localhost:9090/testnet/transaction/1671515683.934103865?tid=0.0.902-1671515673-477495630'))
    
  })
});
