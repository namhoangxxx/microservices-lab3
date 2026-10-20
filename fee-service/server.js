const express = require('express');
const axios = require('axios');
const http = require('http');

const app = express();
app.use(express.json());

const PORT = 4001;
const BANK_URL = process.env.BANK_URL || 'http://localhost:4002';

const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 20
});

const bankClient = axios.create({
  baseURL: BANK_URL,
  timeout: 4500, 
  httpAgent: httpAgent
});

const students = {
  1: { debt: 50000000 },
  2: { debt: 0 },
  3: { debt: 3200000 }
};

let paymentCounter = 1;

app.get('/students/:id/fees', (req, res) => {
  const student = students[req.params.id];
  if (!student) {
    return res.status(404).json({ error: 'Không tìm thấy sinh viên' });
  }
  return res.json({ studentId: req.params.id, debt: student.debt });
});

app.post('/students/:id/payments', async (req, res) => {
  const student = students[req.params.id];
  const { amount } = req.body;

  if (!student) {
    return res.status(404).json({ error: 'Không tìm thấy sinh viên' });
  }
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Số tiền không hợp lệ' });
  }
  if (amount > student.debt) {
    return res.status(400).json({ error: 'Số tiền vượt quá công nợ' });
  }

  const paymentId = `P${paymentCounter++}`;

  async function sendToBank(retriesLeft = 2) {
    try {
      const response = await bankClient.post('/charges', 
        { reference: paymentId, amount },
        { headers: { 'Idempotency-Key': paymentId } }
      );
      return { success: true, data: response.data };
    } catch (err) {
      if (err.response && err.response.status >= 400 && err.response.status < 500) {
        return { success: false, status: err.response.status, error: err.response.data?.error };
      }

      if (err.code === 'ECONNABORTED') {
        return { success: false, isTimeout: true, err };
      }

      if (retriesLeft > 0) {
        return await sendToBank(retriesLeft - 1);
      }

      return { success: false, err };
    }
  }

  const result = await sendToBank(2);

  if (result.success) {
    student.debt -= amount;
    return res.status(201).json({ paymentId, status: 'PAID', charge: result.data });
  }

  if (result.status) {
    return res.status(result.status).json({ paymentId, status: 'FAILED', error: result.error });
  }

  if (result.isTimeout) {
    return res.status(504).json({ paymentId, status: 'PENDING', error: 'Hết thời gian chờ phản hồi từ ngân hàng' });
  }

  const errCode = result.err?.code;
  if (errCode === 'ECONNREFUSED' || errCode === 'ENOTFOUND') {
    return res.status(503).json({ paymentId, status: 'FAILED', error: 'Không thể kết nối ngân hàng' });
  }

  return res.status(504).json({ paymentId, status: 'PENDING', error: 'Hết thời gian chờ hoặc đứt kết nối' });
});

app.listen(PORT, () => console.log(`Fee Service đang chạy tại port ${PORT}`));