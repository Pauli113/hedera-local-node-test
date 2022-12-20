


const axios = require('axios')

describe('hedera localnode', () => {


  beforeEach(async () => {
    
  });

  it('checks if node is running', async()=> {
   
   
    await(axios
      .get('http://localhost:5551/api/v1/transactions',{
        responseType: "json",
      })
      .then(function (response) {
        console.log(response.data)
      })
      )


    
    
    
  })
});
