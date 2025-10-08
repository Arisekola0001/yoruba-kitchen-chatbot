import express from 'express';
import fetch from 'node-fetch';
import { readDB, writeDB } from '../db.js';

export const router = express.Router();

function nairaToKobo(naira) {
  return Math.round(Number(naira) * 100);
}

router.post('/init', async (req, res) => {
  try {
    const { orderId, email = 'customer@test.com' } = req.body;
    const { PAYSTACK_SECRET_KEY, BASE_URL } = process.env;

    const db = readDB();
    const order = db.orders[orderId];
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'paid') return res.json({ message: 'Already paid' });

    const initRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: nairaToKobo(order.total),
        email,
        reference: orderId,
        callback_url: `${BASE_URL}/pay/callback`
      })
    });
    const data = await initRes.json();
    if (!data.status) {
      return res.status(400).json({ error: data.message || 'Failed to initialize payment' });
    }
    res.json({ authorization_url: data.data.authorization_url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Payment init error' });
  }
});

router.get('/callback', async (req, res) => {
  try {
    const ref = req.query.reference;
    const { PAYSTACK_SECRET_KEY } = process.env;

    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${ref}`, {
      headers: { 'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}` }
    });
    const data = await verifyRes.json();

    const db = readDB();
    const order = db.orders[ref];

    if (data.status && data.data && data.data.status === 'success') {
      if (order) {
        order.status = 'paid';
        db.orders[ref] = order;
        for (const sid of Object.keys(db.history)) {
          db.history[sid] = db.history[sid].map(h => h.id === ref ? { ...h, status: 'paid' } : h);
        }
        writeDB(db);
      }
      return res.redirect('/?paid=1');
    } else {
      return res.redirect('/?paid=0');
    }
  } catch (e) {
    console.error(e);
    return res.redirect('/?paid=0');
  }
});
