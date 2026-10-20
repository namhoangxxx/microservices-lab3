const axios = require('axios');

async function runSituation2Test() {

  const paymentRequests = [];
  for (let i = 0; i < 20; i++) {
    paymentRequests.push(
      axios.post('http://localhost:4001/students/1/payments', { amount: 1000 })
        .then(res => ({ type: 'payment', status: res.status, data: res.data }))
        .catch(err => ({ type: 'payment', status: err.response?.status || 504, data: err.response?.data }))
    );
  }

  const startGet = Date.now();
  const getFeeRequest = axios.get('http://localhost:4001/students/1/fees')
    .then(res => {
      const getTime = Date.now() - startGet;
      return getTime;
    })
    .catch(err => {
    });
  const results = await Promise.all([...paymentRequests, getFeeRequest]);
}

runSituation2Test();