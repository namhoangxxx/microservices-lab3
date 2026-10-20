const express = require('express');
const app = express();
app.use(express.json());

const PORT = 4002;

const DELAY_MS = parseInt(process.env.DELAY_MS || '0', 10);
const FAIL_RATE = parseFloat(process.env.FAIL_RATE || '0');
const DROP_RATE = parseFloat(process.env.DROP_RATE || '0');

let stats = {
  connections: 0,
  requests: 0,
  charges: 0,
  duplicates: 0
};

const processedTransactions = new Map();
let chargeCounter = 1;

app.post('/charges', async (req, res) => {
  stats.requests++;
  const idempotencyKey = req.headers['idempotency-key'];
  const { reference, amount } = req.body;

  const key = idempotencyKey || reference;

  if (key && processedTransactions.has(key)) {
    stats.duplicates++;
    const existing = processedTransactions.get(key);
    return res.status(201).json(existing);
  }

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Số tiền không hợp lệ' });
  }

  if (amount > 20000000) {
    return res.status(402).json({ error: 'Số tiền vượt quá hạn mức 20.000.000đ' });
  }

  if (DELAY_MS > 0) {
    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
  }

  if (Math.random() < FAIL_RATE) {
    return res.status(500).json({ error: 'Lỗi máy chủ ngân hàng' });
  }

  const chargeId = `CHG_${chargeCounter++}`;
  const responseData = { chargeId, reference, amount, status: 'SUCCESS' };
  if (key) {
    processedTransactions.set(key, responseData);
  }
  stats.charges++;

  if (Math.random() < DROP_RATE) {
    return req.socket.destroy();
  }

  return res.status(201).json(responseData);
});

app.get('/stats', (req, res) => {
  res.json(stats);
});

const server = app.listen(PORT, () => {
  console.log(`Bank Service đang chạy tại port ${PORT}`);
});

server.keepAliveTimeout = 5000;
server.headersTimeout = 6000;

server.on('connection', () => {
  stats.connections++;
});