import express from 'express';
import { v4 as uuid } from 'uuid';
import { readDB, writeDB, getUser, setUser, pushHistory, getHistory } from '../db.js';

export const router = express.Router();

// Expanded Yoruba/Nigerian dishes
const MENU = {
  1: { name: 'Rice & Beans', price: 2200, img: '/img/rice_beans.svg', options: { protein: ['Beef', 'Chicken', 'Fish'], pepper: ['Mild', 'Medium', 'Hot'] } },
  2: { name: 'Moin-Moin (Steamed Bean Cake)', price: 1200, img: '/img/moinmoin.svg', options: { addOns: ['Egg', 'Fish', 'Plain'] } },
  3: { name: 'Amala + Gbegiri & Ewedu', price: 2800, img: '/img/amala.svg', options: { size: ['Small', 'Regular', 'Large'], protein: ['Goat meat', 'Beef', 'Ponmo'] } },
  4: { name: 'Eba + Egusi Soup', price: 2600, img: '/img/eba_egusi.svg', options: { size: ['Small', 'Regular', 'Large'], protein: ['Assorted', 'Beef', 'Fish'] } },
  5: { name: 'Ikokore (Water-Yam Pottage)', price: 3000, img: '/img/ikokore.svg', options: { protein: ['Snail', 'Fish', 'Assorted'], pepper: ['Mild', 'Hot'] } },
  6: { name: 'Ofada Rice + Ayamase', price: 3200, img: '/img/ofada_ayamase.svg', options: { protein: ['Assorted', 'Beef', 'Egg'], pepper: ['Mild', 'Hot'] } },
  7: { name: 'Fufu + Okro Soup', price: 2500, img: '/img/fufu_okro.svg', options: { size: ['Small', 'Regular', 'Large'], protein: ['Assorted', 'Beef', 'Fish'] } },
  8: { name: 'Semo + Ogbono Soup', price: 2500, img: '/img/semo_ogbono.svg', options: { size: ['Small', 'Regular', 'Large'], protein: ['Assorted', 'Goat', 'Fish'] } },
  9: { name: 'Pounded Yam + Egusi', price: 3200, img: '/img/pounded_yam_egusi.svg', options: { size: ['Small', 'Regular', 'Large'], protein: ['Assorted', 'Beef', 'Fish'] } },
  10:{ name: 'Efo Riro + Swallow', price: 2800, img: '/img/efo_riro.svg', options: { swallow: ['Eba', 'Amala', 'Semo'], protein: ['Assorted', 'Beef', 'Fish'] } },
  11:{ name: 'Jollof Rice + Chicken', price: 3000, img: '/img/jollof_chicken.svg', options: { piece: ['Quarter', 'Half'], pepper: ['Mild', 'Hot'] } },
  12:{ name: 'Fried Rice + Turkey', price: 3200, img: '/img/fried_rice_turkey.svg', options: { piece: ['Small', 'Large'], pepper: ['Mild', 'Medium', 'Hot'] } },
  13:{ name: 'Boli (Roasted Plantain) + Groundnut', price: 1500, img: '/img/boli.svg', options: { ripeness: ['Ripe', 'Semi-ripe'], size: ['Small', 'Regular', 'Large'] } },
  14:{ name: 'Suya Platter', price: 3500, img: '/img/suya.svg', options: { type: ['Beef', 'Chicken', 'Mixed'], pepper: ['Mild', 'Hot'] } }
};

const WELCOME = [
  'Ẹ káàbọ̀! Welcome to ByteBites Yorùbá Kitchen 🍲✨',
  'Select 1 to Place an order',
  'Select 99 to checkout order',
  'Select 98 to see order history',
  'Select 97 to see current order',
  'Select 0 to cancel order',
].join('\n');

function formatMenu() {
  const lines = Object.entries(MENU).map(([key, item]) => `${key}. ${item.name} — ₦${item.price.toLocaleString()}`);
  return ['Our Menu:', ...lines, '', 'Reply with item number to add to order.'].join('\n');
}

function formatOrder(order) {
  if (!order || order.length === 0) return 'Your cart is empty.';
  let total = 0;
  const lines = order.map((it, i) => {
    const lineTotal = it.price * it.qty;
    total += lineTotal;
    const opts = it.choices ? ` [${Object.entries(it.choices).map(([k,v])=>`${k}:${v}`).join(', ')}]` : '';
    return `${i+1}. ${it.name} x${it.qty}${opts} — ₦${lineTotal.toLocaleString()}`;
  });
  return [...lines, ``, `Subtotal: ₦${total.toLocaleString()}`].join('\n');
}

router.post('/message', (req, res) => {
  const { text } = req.body || {};
  const sessionId = req.cookies.sessionId;
  const user = getUser(sessionId);
  const input = String(text || '').trim();

  if (input === '' || (user.stage === 'idle' && !['1','99','98','97','0'].includes(input))) {
    return res.json({ reply: WELCOME, menu: null });
  }

  if (input === '1') {
    user.stage = 'menu';
    setUser(sessionId, user);
    return res.json({ reply: formatMenu(), menu: MENU });
  }

  if (input === '99') {
    if (!user.currentOrder.length) {
      return res.json({ reply: 'No order to place. Select 1 to place a new order.', menu: null });
    }
    const orderId = uuid();
    const total = user.currentOrder.reduce((a,c)=>a + c.price * c.qty, 0);
    const orderObj = { id: orderId, items: user.currentOrder, total, status: 'pending_payment', createdAt: Date.now() };
    const db = readDB();
    db.orders[orderId] = orderObj;
    writeDB(db);
    pushHistory(sessionId, { ...orderObj });

    user.currentOrder = [];
    user.stage = 'idle';
    setUser(sessionId, user);

    return res.json({ reply: `Order placed ✅\nOrder ID: ${orderId}\nTotal: ₦${total.toLocaleString()}\nTap "Pay" to complete payment.`, orderId });
  }

  if (input === '98') {
    const history = getHistory(sessionId);
    if (!history.length) return res.json({ reply: 'No past orders yet.', menu: null });
    const lines = history.map(h => `#${h.id} — ₦${h.total.toLocaleString()} — ${h.status}`);
    return res.json({ reply: ['Order History:', ...lines].join('\n'), menu: null });
  }

  if (input === '97') {
    return res.json({ reply: formatOrder(user.currentOrder), menu: null });
  }

  if (input === '0') {
    if (!user.currentOrder.length) return res.json({ reply: 'No active order to cancel.', menu: null });
    user.currentOrder = [];
    user.stage = 'idle';
    setUser(sessionId, user);
    return res.json({ reply: 'Order canceled.', menu: null });
  }

  if (user.stage === 'menu') {
    if (/^\d+$/.test(input) && MENU[input]) {
      const base = MENU[input];
      user.stage = 'configuring';
      user.pendingItem = { key: input, name: base.name, price: base.price, qty: 1, choices: {} };
      setUser(sessionId, user);

      const optKeys = Object.keys(base.options || {});
      if (optKeys.length) {
        const first = optKeys[0];
        const values = base.options[first];
        return res.json({ reply: `Selected: ${base.name} (₦${base.price.toLocaleString()})\nChoose ${first}: ${values.map((v,i)=>`\n${i+1}. ${v}`).join('')}`, expect: { type: 'option', key: first, values } });
      } else {
        return res.json({ reply: `Selected: ${base.name}. Send quantity (e.g., 2).` });
      }
    }
    return res.json({ reply: 'Invalid selection. Send a menu number or 97/98/99/0.' });
  }

  if (user.stage === 'configuring') {
    const base = MENU[user.pendingItem.key];
    const pending = user.pendingItem;
    const optKeys = Object.keys(base.options || {});
    const chosenKeys = Object.keys(pending.choices || {});
    const nextKey = optKeys.find(k => !chosenKeys.includes(k));

    if (nextKey) {
      const values = base.options[nextKey];
      if (/^\d+$/.test(input) && values[Number(input)-1]) {
        pending.choices[nextKey] = values[Number(input)-1];
        user.pendingItem = pending;
        setUser(sessionId, user);
        const remaining = optKeys.find(k => !Object.keys(pending.choices).includes(k));
        if (remaining) {
          const vals = base.options[remaining];
          return res.json({ reply: `Choose ${remaining}: ${vals.map((v,i)=>`\n${i+1}. ${v}`).join('')}`, expect: { type: 'option', key: remaining, values: vals } });
        } else {
          return res.json({ reply: 'Send quantity (e.g., 2).' });
        }
      } else {
        return res.json({ reply: `Invalid. Choose ${nextKey}: ${values.map((v,i)=>`\n${i+1}. ${v}`).join('')}` });
      }
    } else {
      if (/^\d+$/.test(input) && Number(input) > 0) {
        pending.qty = Number(input);
        user.currentOrder.push(pending);
        user.stage = 'menu';
        delete user.pendingItem;
        setUser(sessionId, user);
        return res.json({ reply: `Added to cart: ${pending.name} x${pending.qty}.\n${formatOrder(user.currentOrder)}\n\nSend another item number, or 99 to checkout.` });
      } else {
        return res.json({ reply: 'Invalid quantity. Send a positive number.' });
      }
    }
  }

  return res.json({ reply: 'Sorry, I did not get that. Send 1, 99, 98, 97, or 0.' });
});
