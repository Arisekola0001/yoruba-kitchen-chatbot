const feed = document.getElementById('feed');
const form = document.getElementById('form');
const input = document.getElementById('input');

function addBot(text, html=null) {
  const el = document.createElement('div');
  el.className = 'msg bot';
  if (html) { el.innerHTML = html; } else { el.innerText = text; }
  feed.appendChild(el);
  feed.scrollTop = feed.scrollHeight;
}

function addUser(text) {
  const el = document.createElement('div');
  el.className = 'msg user';
  el.innerText = text;
  feed.appendChild(el);
  feed.scrollTop = feed.scrollHeight;
}

const params = new URLSearchParams(location.search);
if (params.has('paid')) {
  const ok = params.get('paid') === '1';
  addBot(ok ? 'Payment successful 🎉 Your order is confirmed.' : 'Payment failed or cancelled.');
}
fetch('/api/chat/message', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text: ''})})
.then(r=>r.json())
.then(d=> addBot(d.reply));

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  addUser(text);
  input.value = '';
  const r = await fetch('/api/chat/message', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ text }) });
  const data = await r.json();
  renderReply(data);
});

function renderReply(data) {
  if (data.menu) {
    const items = Object.entries(data.menu).map(([k, v]) => {
      return `<div class="card menu-item"><img src="${v.img}" alt="${v.name}"/><div><div class="strong">${k}. ${v.name}</div><div>₦${v.price.toLocaleString?.() || v.price}</div></div></div>`;
    }).join('');
    addBot('', `<div>${data.reply}</div><div class="menu-grid">${items}</div>`);
    return;
  }
  if (data.orderId) {
    const payHtml = `<div>${data.reply}</div><div class="pay"><a href="#" id="payBtn">Pay with Paystack</a></div>`;
    addBot('', payHtml);
    const btn = feed.querySelector('#payBtn');
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = prompt('Enter email for receipt (test):', 'customer@test.com') || 'customer@test.com';
      const r = await fetch('/pay/init', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ orderId: data.orderId, email }) });
      const d = await r.json();
      if (d.authorization_url) {
        window.location.href = d.authorization_url;
      } else {
        alert(d.error || 'Payment init failed');
      }
    });
    return;
  }
  addBot(data.reply);
}
