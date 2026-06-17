const fs = require('fs');
const path = require('path');
const urlMod = require('url');
const SITE_URL = 'https://lacorpo.vercel.app';
let _stripe = null;
function getStripe() {
  if (!_stripe && process.env.STRIPE_SECRET_KEY) {
    try { _stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); } catch {}
  }
  return _stripe;
}

function qs(url) {
  const q = urlMod.parse(url, true).query;
  return { slug: q.slug || null, id: q.id ? parseInt(q.id) : null, seed: q.seed ? parseInt(q.seed) : 0, oid: q.oid ? parseInt(q.oid) : null };
}

async function loadOrders() {
  try {
    const f = '/tmp/oni_orders.json';
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf-8'));
  } catch {}
  const token = process.env.GH_TOKEN;
  if (token) {
    try {
      const res = await fetch('https://api.github.com/repos/foast2333310-art/oniknives-site/contents/data/orders.json', {
        headers: { 'Authorization': 'token ' + token, 'User-Agent': 'oniknives-api', 'Accept': 'application/vnd.github.raw' }
      });
      if (res.ok) {
        const data = await res.json();
        fs.writeFileSync('/tmp/oni_orders.json', JSON.stringify(data, null, 2));
        return data;
      }
    } catch {}
  }
  try {
    const f = path.join(process.cwd(), 'data', 'orders.json');
    if (fs.existsSync(f)) {
      const d = JSON.parse(fs.readFileSync(f, 'utf-8'));
      fs.writeFileSync('/tmp/oni_orders.json', JSON.stringify(d, null, 2));
      return d;
    }
  } catch {}
  return [];
}

async function saveOrders(data) {
  const dir = '/tmp';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync('/tmp/oni_orders.json', JSON.stringify(data, null, 2));
  const token = process.env.GH_TOKEN;
  if (token) syncToGitHub(data, token, 'data/orders.json').catch(() => {});
}

async function load(force) {
  if (!force) {
    try {
      const c = '/tmp/oni_products.json';
      if (fs.existsSync(c)) return JSON.parse(fs.readFileSync(c, 'utf-8'));
    } catch {}
  }
  const token = process.env.GH_TOKEN;
  if (token) {
    try {
      const res = await fetch('https://api.github.com/repos/foast2333310-art/oniknives-site/contents/data/products.json', {
        headers: { 'Authorization': 'token ' + token, 'User-Agent': 'oniknives-api', 'Accept': 'application/vnd.github.raw' }
      });
      if (res.ok) {
        const data = await res.json();
        const dir = '/tmp';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync('/tmp/oni_products.json', JSON.stringify(data, null, 2));
        return data;
      }
    } catch {}
  }
  try {
    const d = path.join(process.cwd(), 'data', 'products.json');
    if (fs.existsSync(d)) {
      const data = JSON.parse(fs.readFileSync(d, 'utf-8'));
      const dir = '/tmp';
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync('/tmp/oni_products.json', JSON.stringify(data, null, 2));
      return data;
    }
  } catch {}
  return [];
}

async function save(data) {
  const dir = '/tmp';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync('/tmp/oni_products.json', JSON.stringify(data, null, 2));
  const token = process.env.GH_TOKEN;
  if (token) syncToGitHub(data, token).catch(() => {});
}

function ghApi(path, token, method, body) {
  const opts = { headers: { 'Authorization': 'token ' + token, 'User-Agent': 'oniknives-api' } };
  if (body) { opts.method = method || 'PUT'; opts.body = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json'; }
  return fetch('https://api.github.com' + path, opts).then(r => r.json());
}

async function syncToGitHub(data, token, filePath) {
  try {
    const ghPath = '/repos/foast2333310-art/oniknives-site/contents/' + (filePath || 'data/products.json');
    const json = JSON.stringify(data, null, 2);
    const content = Buffer.from(json).toString('base64');
    const info = await ghApi(ghPath, token);
    await ghApi(ghPath, token, 'PUT', { message: '📦 [skip vercel]', content, sha: info.sha });
  } catch (e) {
    console.error('GitHub sync failed:', e.message);
  }
}

function getBody(req) {
  return new Promise((res, rej) => {
    let raw = '';
    req.on('data', c => raw += c);
    req.on('end', () => { try { res(JSON.parse(raw)); } catch(e) { rej(new Error('Corps JSON invalide')); } });
    req.on('error', rej);
  });
}
function getRawBody(req) {
  return new Promise((res, rej) => {
    let raw = '';
    req.on('data', c => raw += c);
    req.on('end', () => res(raw));
    req.on('error', rej);
  });
}

async function loadReviews() {
  try {
    const f = '/tmp/oni_reviews.json';
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf-8'));
  } catch {}
  const token = process.env.GH_TOKEN;
  if (token) {
    try {
      const res = await fetch('https://api.github.com/repos/foast2333310-art/oniknives-site/contents/data/reviews.json', {
        headers: { 'Authorization': 'token ' + token, 'User-Agent': 'oniknives-api', 'Accept': 'application/vnd.github.raw' }
      });
      if (res.ok) {
        const data = await res.json();
        fs.writeFileSync('/tmp/oni_reviews.json', JSON.stringify(data, null, 2));
        return data;
      }
    } catch {}
  }
  try {
    const f = path.join(process.cwd(), 'data', 'reviews.json');
    if (fs.existsSync(f)) {
      const d = JSON.parse(fs.readFileSync(f, 'utf-8'));
      fs.writeFileSync('/tmp/oni_reviews.json', JSON.stringify(d, null, 2));
      return d;
    }
  } catch {}
  return [];
}
async function saveReviews(data) {
  const dir = '/tmp';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync('/tmp/oni_reviews.json', JSON.stringify(data, null, 2));
  const token = process.env.GH_TOKEN;
  if (token) syncToGitHub(data, token, 'data/reviews.json').catch(() => {});
}

async function sendDiscordNotification(o) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  const items = o.items.map(i => `${i.quantity}x ${i.name}${i.amount ? ' — ' + parseFloat(i.amount).toFixed(2).replace('.', ',') + '€' : ''} — ${(i.price * i.quantity).toFixed(2).replace('.', ',')}€`).join('\n');
  const total = parseFloat(o.total || 0).toFixed(2).replace('.', ',');
  const customer = o.customer || {};
  const fields = [
    { name: '📦 Articles', value: items || '—', inline: false },
    { name: '💰 Total', value: total + ' €', inline: true },
    { name: '👤 Client', value: customer.discord || customer.name || '—', inline: true },
    { name: '📧 Email', value: customer.email || '—', inline: true },
    { name: '📝 Projet', value: customer.description || '—', inline: false },
  ];
  if (o.parrainCode) {
    fields.push({ name: '🎟 Code parrainage', value: '`' + o.parrainCode + '` (-5€ pour le prochain client)', inline: false });
  }
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: '🛒 Commande #' + o.id + ' — Payée !',
          color: 0x27ae60,
          fields,
          timestamp: new Date().toISOString(),
        }]
      }),
    });
  } catch {}
}

const CT = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };

function genParrainCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'PARRAIN-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-admin-key');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const url = req.url.split('?')[0];
  const query = qs(req.url);
  const key = process.env.ADMIN_API_KEY || 'admin123';

  try {
    // Serve images
    if (url.startsWith('/api/images/')) {
      const name = path.basename(url.replace('/api/images/', ''));
      const dirs = ['/tmp/oni_images', path.join(process.cwd(), 'images')];
      for (const dir of dirs) {
        const fp = path.join(dir, name);
        if (fs.existsSync(fp)) {
          const ext = path.extname(name).toLowerCase().replace('.', '');
          res.setHeader('Content-Type', CT[ext] || 'application/octet-stream');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          res.end(fs.readFileSync(fp)); return;
        }
      }
      res.status(404).end(); return;
    }

    // Products CRUD
    if (url.startsWith('/api/products')) {
      if (req.method === 'GET') {
        const force = query.seed === 1;
        const products = await load(force);
        if (query.slug) {
          const p = products.find(p => p.slug === query.slug);
          if (!p) { res.status(404).json({ error: 'not found' }); return; }
          res.json(p); return;
        }
        res.json(products); return;
      }

      if (req.headers['x-admin-key'] !== key) { res.status(401).json({ error: 'Non autorisé' }); return; }

      let products = await load();

      if (req.method === 'POST') {
        const body = await getBody(req);
        body.id = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
        products.push(body);
        await save(products);
        res.status(201).json(body); return;
      }

      if (req.method === 'PUT') {
        const body = await getBody(req);
        const idx = products.findIndex(p => p.id === body.id);
        if (idx < 0) { res.status(404).json({ error: 'not found' }); return; }
        products[idx] = { ...products[idx], ...body };
        await save(products);
        res.json(products[idx]); return;
      }

      if (req.method === 'DELETE') {
        if (!query.id) { res.status(400).json({ error: 'id requis' }); return; }
        products = products.filter(p => p.id !== query.id);
        await save(products);
        res.json({ success: true }); return;
      }
    }

    // Stripe Checkout
    if (url === '/api/create-checkout-session' && req.method === 'POST') {
      if (!getStripe()) { res.status(500).json({ error: 'Stripe non configuré' }); return; }
      const body = await getBody(req);

      const products = await load();
      for (const item of (body.items || [])) {
        const prod = products.find(p => p.slug === item.slug || p.name === item.name);
        if (prod && prod.epuise) {
          res.status(400).json({ error: `"${prod.name}" est épuisé et ne peut pas être acheté.` });
          return;
        }
      }

      const lineItems = [];
      for (const item of (body.items || [])) {
        const rawPrice = item.price ?? item.amount ?? 0;
        const unit = parseFloat(rawPrice);
        if (isNaN(unit) || unit < 0) {
          res.status(400).json({ error: `Prix invalide pour "${item.name}". Vide ton panier et réessaie.` });
          return;
        }
        if (unit === 0) continue;
        lineItems.push({
          price_data: {
            currency: 'eur',
            product_data: { name: item.name },
            unit_amount: Math.round(unit * 100),
          },
          quantity: item.quantity,
        });
      }

      let orders = await loadOrders();
      const orderId = orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 1;
      const order = {
        id: orderId,
        items: body.items,
        customer: body.customer,
        total: parseFloat(body.total) || 0,
        status: 'pending_payment',
        createdAt: new Date().toISOString(),
      };
      orders.push(order);
      await saveOrders(orders);

      if (lineItems.length === 0) {
        orders[orders.length - 1].status = 'payé';
        orders[orders.length - 1].paidAt = new Date().toISOString();
        orders[orders.length - 1].parrainCode = genParrainCode();
        await saveOrders(orders);
        await sendDiscordNotification(orders[orders.length - 1]);
        res.json({ url: SITE_URL + '/success.html?free=1&orderId=' + orderId });
        return;
      }

      const session = await getStripe().checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: SITE_URL + '/success.html?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: SITE_URL + '/panier.html',
        metadata: { orderId: String(orderId) },
      });

      orders[orders.length - 1].stripeSessionId = session.id;
      await saveOrders(orders);

      res.json({ url: session.url });
      return;
    }

    // Confirm payment after redirect
    if (url === '/api/confirm-payment' && req.method === 'GET') {
      if (!getStripe()) { res.status(500).json({ error: 'Stripe non configuré' }); return; }
      const parsedUrl = urlMod.parse(req.url, true);
      const sid = parsedUrl.query.session_id;
      if (!sid) { res.status(400).json({ error: 'session_id requis' }); return; }

      try {
        const session = await getStripe().checkout.sessions.retrieve(sid);
        if (session.payment_status !== 'paid') {
          res.json({ status: 'not_paid' }); return;
        }

        const orderId = parseInt(session.metadata.orderId);
        let orders = await loadOrders();
        const idx = orders.findIndex(o => o.id === orderId);
        if (idx >= 0 && orders[idx].status !== 'payé') {
          orders[idx].status = 'payé';
          orders[idx].paidAt = new Date().toISOString();
          if (!orders[idx].parrainCode) orders[idx].parrainCode = genParrainCode();
          await saveOrders(orders);
          await sendDiscordNotification(orders[idx]);
        }

        const products = await load();
        const items = orders[idx]?.items || [];
        const downloads = items.map(item => {
          const prod = products.find(p => p.slug === item.slug || p.name === item.name);
          return prod && prod.downloadUrl ? { name: prod.name, url: prod.downloadUrl } : null;
        }).filter(Boolean);

        res.json({ status: 'paid', orderId, downloads, parrainCode: orders[idx].parrainCode || null });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
      return;
    }

    // Stripe Webhook
    if (url === '/api/webhook' && req.method === 'POST') {
      if (!getStripe()) { res.status(500).json({ error: 'Stripe non configuré' }); return; }
      const raw = await getRawBody(req);
      const sig = req.headers['stripe-signature'];

      let event;
      try {
        event = getStripe().webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
      } catch (err) {
        res.status(400).send('Webhook Error: ' + err.message);
        return;
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const orderId = parseInt(session.metadata.orderId);
        let orders = await loadOrders();
        const idx = orders.findIndex(o => o.id === orderId);
        if (idx >= 0 && orders[idx].status !== 'payé') {
          orders[idx].status = 'payé';
          orders[idx].paidAt = new Date().toISOString();
          if (!orders[idx].parrainCode) orders[idx].parrainCode = genParrainCode();
          await saveOrders(orders);
          await sendDiscordNotification(orders[idx]);
        }
      }

      res.json({ received: true });
      return;
    }

    // Public stats
    if (url === '/api/stats' && req.method === 'GET') {
      const orders = await loadOrders();
      const paid = orders.filter(o => o.status === 'payé');
      const totalVentes = paid.length;
      const reviews = await loadReviews();
      const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0;
      res.json({ totalVentes, avgRating: Math.round(avgRating * 10) / 10, reviewCount: reviews.length });
      return;
    }

    // Reviews
    if (url === '/api/reviews' && req.method === 'GET') {
      const reviews = await loadReviews();
      const all = query.all === '1';
      res.json(all ? reviews : reviews.slice(-10).reverse());
      return;
    }
    if (url === '/api/reviews' && req.method === 'POST') {
      const body = await getBody(req);
      if (!body.name || !body.rating || !body.comment) {
        res.status(400).json({ error: 'name, rating et comment requis' });
        return;
      }
      let reviews = await loadReviews();
      const review = {
        id: reviews.length > 0 ? Math.max(...reviews.map(r => r.id)) + 1 : 1,
        name: body.name,
        rating: Math.min(5, Math.max(1, parseInt(body.rating))),
        comment: body.comment,
        product: body.product || null,
        createdAt: new Date().toISOString(),
      };
      reviews.push(review);
      await saveReviews(reviews);
      res.status(201).json(review);
      return;
    }
    if (url === '/api/reviews' && req.method === 'DELETE') {
      if (req.headers['x-admin-key'] !== key) { res.status(401).json({ error: 'Non autorisé' }); return; }
      const body = await getBody(req);
      let reviews = (await loadReviews()).filter(r => r.id !== body.id);
      await saveReviews(reviews);
      res.json({ success: true });
      return;
    }

    // Orders
    if (url === '/api/orders') {
      if (req.method === 'POST') {
        const body = await getBody(req);
        let orders = await loadOrders();
        body.id = orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 1;
        body.status = 'pending';
        body.createdAt = new Date().toISOString();
        orders.push(body);
        await saveOrders(orders);
        res.status(201).json({ success: true, id: body.id }); return;
      }
      if (req.method === 'GET') {
        if (req.headers['x-admin-key'] !== key) { res.status(401).json({ error: 'Non autorisé' }); return; }
        const orders = await loadOrders();
        res.json(orders); return;
      }
      if (req.method === 'PUT') {
        if (req.headers['x-admin-key'] !== key) { res.status(401).json({ error: 'Non autorisé' }); return; }
        const body = await getBody(req);
        let orders = await loadOrders();
        const idx = orders.findIndex(o => o.id === body.id);
        if (idx < 0) { res.status(404).json({ error: 'not found' }); return; }
        const wasPaid = orders[idx].status === 'payé';
        orders[idx] = { ...orders[idx], ...body };
        await saveOrders(orders);
        if (!wasPaid && orders[idx].status === 'payé') {
          sendDiscordNotification(orders[idx]);
        }
        res.json(orders[idx]); return;
      }
      if (req.method === 'DELETE') {
        if (req.headers['x-admin-key'] !== key) { res.status(401).json({ error: 'Non autorisé' }); return; }
        if (!query.id) { res.status(400).json({ error: 'id requis' }); return; }
        let orders = (await loadOrders()).filter(o => o.id !== query.id);
        await saveOrders(orders);
        res.json({ success: true }); return;
      }
    }

    // Public order downloads (for free orders)
    if (url === '/api/order-downloads' && req.method === 'GET') {
      const oid = query.oid ? parseInt(query.oid) : null;
      if (!oid) { res.status(400).json({ error: 'oid requis' }); return; }
      const orders = await loadOrders();
      const order = orders.find(o => o.id === oid);
      if (!order || order.status !== 'payé') { res.json({ downloads: [] }); return; }
      const products = await load();
      const items = order.items || [];
      const downloads = items.map(item => {
        const prod = products.find(p => p.slug === item.slug || p.name === item.name);
        return prod && prod.downloadUrl ? { name: prod.name, url: prod.downloadUrl } : null;
      }).filter(Boolean);
      res.json({ downloads, parrainCode: order.parrainCode || null });
      return;
    }

    // Contact
    if (url === '/api/contact' && req.method === 'POST') {
      const body = await getBody(req);
      const webhook = process.env.DISCORD_WEBHOOK_URL;
      if (webhook) {
        fetch(webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: '',
            embeds: [{
              title: '📬 Nouveau message de contact',
              color: 0xc8a87c,
              fields: [
                { name: 'Nom', value: body.name || '—', inline: true },
                { name: 'Email', value: body.email ? `[${body.email}](mailto:${body.email})` : '—', inline: true },
                { name: 'Message', value: body.message || '—' }
              ],
              timestamp: new Date().toISOString()
            }]
          })
        }).catch(() => {});
      }
      res.status(200).json({ success: true });
      return;
    }

    res.status(404).json({ error: 'Not found' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
