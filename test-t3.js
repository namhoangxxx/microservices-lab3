const axios = require('axios');

async function testSituation3() {
  const start = Date.now();
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < 20; i++) {
    const promises = [];
    for (let j = 0; j < 10; j++) {
      promises.push(
        axios.post('http://localhost:4001/students/1/payments', { amount: 1000 })
          .then(() => successCount++)
          .catch((err) => {
            failCount++;
          })
      );
    }
    await Promise.all(promises);
  }
}

testSituation3();