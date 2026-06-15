const fs = require('fs');
const path = require('path');
const urlMod = require('url');
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const SITE_URL = 'https://lacorpo.vercel.app';

function qs(url) {
  const q = urlMod.parse(url, true).query;
  return { slug: q.slug || null, id: q.id ? parseInt(q.id) : null, seed: q.seed ? parseInt(q.seed) : 0 };
}

function loadOrders() {
  try {
    const f = '/tmp/oni_orders.json';
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf-8'));
  } catch {}
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
  if (token) await syncToGitHub(data, token, 'data/orders.json');
}

function load(force) {
  if (!force) {
    try {
      const c = '/tmp/oni_products.json';
      if (fs.existsSync(c)) return JSON.parse(fs.readFileSync(c, 'utf-8'));
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
  if (token) await syncToGitHub(data, token);
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
    await ghApi(ghPath, token, 'PUT', { message: 'sync ' + (filePath || 'products'), content, sha: info.sha });
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

const CT = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };

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

    // Upload image
    if (url === '/api/upload' && req.method === 'POST') {
      if (req.headers['x-admin-key'] !== key) { res.status(401).json({ error: 'Non autorisé' }); return; }
      const b = await getBody(req);
      const safe = path.basename(b.filename);
      const dir = '/tmp/oni_images';
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, safe), Buffer.from(b.data, 'base64'));
      res.json({ filename: safe }); return;
    }

    // Products CRUD
    if (url.startsWith('/api/products')) {
      if (req.method === 'GET') {
        const force = query.seed === 1;
        const products = load(force);
        if (query.slug) {
          const p = products.find(p => p.slug === query.slug);
          if (!p) { res.status(404).json({ error: 'not found' }); return; }
          res.json(p); return;
        }
        res.json(products); return;
      }

      if (req.headers['x-admin-key'] !== key) { res.status(401).json({ error: 'Non autorisé' }); return; }

      const body = await getBody(req);
      let products = load();

      if (req.method === 'POST') {
        body.id = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
        products.push(body);
        await save(products);
        res.status(201).json(body); return;
      }

      if (req.method === 'PUT') {
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
      if (!stripe) { res.status(500).json({ error: 'Stripe non configuré' }); return; }
      const body = await getBody(req);

      let orders = loadOrders();
      const orderId = orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 1;
      const order = {
        id: orderId,
        items: body.items,
        customer: body.customer,
        total: body.total,
        status: 'pending_payment',
        createdAt: new Date().toISOString(),
      };
      orders.push(order);
      await saveOrders(orders);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: body.items.map(item => ({
          price_data: {
            currency: 'eur',
            product_data: { name: item.name },
            unit_amount: Math.round(parseFloat(item.price || item.amount) * 100),
          },
          quantity: item.quantity,
        })),
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
      if (!stripe) { res.status(500).json({ error: 'Stripe non configuré' }); return; }
      const parsedUrl = urlMod.parse(req.url, true);
      const sid = parsedUrl.query.session_id;
      if (!sid) { res.status(400).json({ error: 'session_id requis' }); return; }

      try {
        const session = await stripe.checkout.sessions.retrieve(sid);
        if (session.payment_status !== 'paid') {
          res.json({ status: 'not_paid' }); return;
        }

        const orderId = parseInt(session.metadata.orderId);
        let orders = loadOrders();
        const idx = orders.findIndex(o => o.id === orderId);
        if (idx >= 0 && orders[idx].status !== 'payé') {
          orders[idx].status = 'payé';
          orders[idx].paidAt = new Date().toISOString();
          await saveOrders(orders);
        }

        res.json({ status: 'paid', orderId });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
      return;
    }

    // Orders
    if (url === '/api/orders') {
      if (req.method === 'POST') {
        const body = await getBody(req);
        let orders = loadOrders();
        body.id = orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 1;
        body.status = 'pending';
        body.createdAt = new Date().toISOString();
        orders.push(body);
        await saveOrders(orders);
        res.status(201).json({ success: true, id: body.id }); return;
      }
      if (req.method === 'GET') {
        if (req.headers['x-admin-key'] !== key) { res.status(401).json({ error: 'Non autorisé' }); return; }
        res.json(loadOrders()); return;
      }
      if (req.method === 'PUT') {
        if (req.headers['x-admin-key'] !== key) { res.status(401).json({ error: 'Non autorisé' }); return; }
        const body = await getBody(req);
        let orders = loadOrders();
        const idx = orders.findIndex(o => o.id === body.id);
        if (idx < 0) { res.status(404).json({ error: 'not found' }); return; }
        orders[idx] = { ...orders[idx], ...body };
        await saveOrders(orders);
        res.json(orders[idx]); return;
      }
      if (req.method === 'DELETE') {
        if (req.headers['x-admin-key'] !== key) { res.status(401).json({ error: 'Non autorisé' }); return; }
        if (!query.id) { res.status(400).json({ error: 'id requis' }); return; }
        let orders = loadOrders().filter(o => o.id !== query.id);
        await saveOrders(orders);
        res.json({ success: true }); return;
      }
    }

    res.status(404).json({ error: 'Not found' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
