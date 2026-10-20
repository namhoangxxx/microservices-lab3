const axios = require('axios');

async function test4a() {
  let paidCount = 0;
  let pendingCount = 0;

  for (let i = 1; i <= 60; i++) {
    try {
      const res = await axios.post('http://localhost:4001/students/1/payments', { amount: 1000 });
      if (res.data.status === 'PAID') paidCount++;
    } catch (err) {
      if (err.response?.status === 504 && err.response?.data?.status === 'PENDING') {
        pendingCount++;
      }
    }
  }
}

test4a();