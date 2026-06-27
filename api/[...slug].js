const fs = require('fs');
const path = require('path');
const urlMod = require('url');
const bcrypt = require('bcryptjs');
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
  return { slug: q.slug || null, id: q.id ? parseInt(q.id) : null, seed: q.seed ? parseInt(q.seed) : 0, oid: q.oid ? parseInt(q.oid) : null, code: q.code || null };
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

async function loadAccounts() {
  try {
    const f = '/tmp/oni_accounts.json';
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf-8'));
  } catch {}
  const token = process.env.GH_TOKEN;
  if (token) {
    try {
      const res = await fetch('https://api.github.com/repos/foast2333310-art/oniknives-site/contents/data/accounts.json', {
        headers: { 'Authorization': 'token ' + token, 'User-Agent': 'oniknives-api', 'Accept': 'application/vnd.github.raw' }
      });
      if (res.ok) {
        const data = await res.json();
        const dir = '/tmp';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync('/tmp/oni_accounts.json', JSON.stringify(data, null, 2));
        return data;
      }
    } catch {}
  }
  try {
    const f = path.join(process.cwd(), 'data', 'accounts.json');
    if (fs.existsSync(f)) {
      const d = JSON.parse(fs.readFileSync(f, 'utf-8'));
      fs.writeFileSync('/tmp/oni_accounts.json', JSON.stringify(d, null, 2));
      return d;
    }
  } catch {}
  return [];
}

async function saveAccounts(data) {
  const dir = '/tmp';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync('/tmp/oni_accounts.json', JSON.stringify(data, null, 2));
  const token = process.env.GH_TOKEN;
  if (token) syncToGitHub(data, token, 'data/accounts.json').catch(() => {});
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
    const sha = info && info.sha ? info.sha : undefined;
    const body = { message: '📦 [skip vercel]', content };
    if (sha) body.sha = sha;
    const res = await ghApi(ghPath, token, 'PUT', body);
    if (res && res.content) return;
    console.error('GitHub sync failed:', JSON.stringify(res));
  } catch (e) {
    console.error('GitHub sync error:', e.message);
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
  const items = o.items.map(i => `${i.quantity}x ${i.name}${i.amount ? ' — ' + parseFloat(i.amount).toFixed(2).replace('.', ',') + '€' : ''}`).join('\n');
  const total = parseFloat(o.total || 0).toFixed(2).replace('.', ',');
  const afterDiscount = o.totalAfterDiscount && parseFloat(o.totalAfterDiscount) !== parseFloat(o.total) ? ' → ' + parseFloat(o.totalAfterDiscount).toFixed(2).replace('.', ',') + ' €' : '';
  const customer = o.customer || {};
  const fields = [
    { name: '📦 Articles', value: items || '—', inline: false },
    { name: '💰 Total', value: total + ' €' + afterDiscount, inline: false },
    { name: '👤 Client', value: customer.discord || customer.name || '—', inline: false },
    { name: '📧 Email', value: customer.email || '—', inline: false },
    { name: '📝 Projet', value: customer.description || '—', inline: false },
  ];
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

async function loadCodes() {
  try {
    const f = '/tmp/oni_codes.json';
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf-8'));
  } catch {}
  const token = process.env.GH_TOKEN;
  if (token) {
    try {
      const res = await fetch('https://api.github.com/repos/foast2333310-art/oniknives-site/contents/data/codes.json', {
        headers: { 'Authorization': 'token ' + token, 'User-Agent': 'oniknives-api', 'Accept': 'application/vnd.github.raw' }
      });
      if (res.ok) {
        const data = await res.json();
        fs.writeFileSync('/tmp/oni_codes.json', JSON.stringify(data, null, 2));
        return data;
      }
    } catch {}
  }
  try {
    const f = path.join(process.cwd(), 'data', 'codes.json');
    if (fs.existsSync(f)) {
      const d = JSON.parse(fs.readFileSync(f, 'utf-8'));
      fs.writeFileSync('/tmp/oni_codes.json', JSON.stringify(d, null, 2));
      return d;
    }
  } catch {}
  return [];
}
async function saveCodes(data) {
  const dir = '/tmp';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync('/tmp/oni_codes.json', JSON.stringify(data, null, 2));
  const token = process.env.GH_TOKEN;
  if (token) syncToGitHub(data, token, 'data/codes.json').catch(() => {});
}

async function loadNotifications() {
  try {
    const f = '/tmp/oni_notifications.json';
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf-8'));
  } catch {}
  const token = process.env.GH_TOKEN;
  if (token) {
    try {
      const res = await fetch('https://api.github.com/repos/foast2333310-art/oniknives-site/contents/data/notifications.json', {
        headers: { 'Authorization': 'token ' + token, 'User-Agent': 'oniknives-api', 'Accept': 'application/vnd.github.raw' }
      });
      if (res.ok) {
        const data = await res.json();
        fs.writeFileSync('/tmp/oni_notifications.json', JSON.stringify(data, null, 2));
        return data;
      }
    } catch {}
  }
  try {
    const f = path.join(process.cwd(), 'data', 'notifications.json');
    if (fs.existsSync(f)) {
      const d = JSON.parse(fs.readFileSync(f, 'utf-8'));
      fs.writeFileSync('/tmp/oni_notifications.json', JSON.stringify(d, null, 2));
      return d;
    }
  } catch {}
  return [];
}
async function saveNotifications(data) {
  const dir = '/tmp';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync('/tmp/oni_notifications.json', JSON.stringify(data, null, 2));
  const token = process.env.GH_TOKEN;
  if (token) syncToGitHub(data, token, 'data/notifications.json').catch(() => {});
}

async function loadTiers() {
  const def = [
    { name: 'Bronze', minSales: 0, commission: 5, color: '#cd7f32', icon: '🥉' },
    { name: 'Argent', minSales: 5, commission: 8, color: '#c0c0c0', icon: '🥈' },
    { name: 'Or', minSales: 20, commission: 12, color: '#ffd700', icon: '🥇' },
    { name: 'Diamant', minSales: 50, commission: 15, color: '#b9f2ff', icon: '💎' },
  ];
  try {
    const f = '/tmp/oni_tiers.json';
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf-8'));
  } catch {}
  const token = process.env.GH_TOKEN;
  if (token) {
    try {
      const res = await fetch('https://api.github.com/repos/foast2333310-art/oniknives-site/contents/data/tiers.json', {
        headers: { 'Authorization': 'token ' + token, 'User-Agent': 'oniknives-api', 'Accept': 'application/vnd.github.raw' }
      });
      if (res.ok) {
        const data = await res.json();
        fs.writeFileSync('/tmp/oni_tiers.json', JSON.stringify(data, null, 2));
        return data;
      }
    } catch {}
  }
  try {
    const f = path.join(process.cwd(), 'data', 'tiers.json');
    if (fs.existsSync(f)) {
      const d = JSON.parse(fs.readFileSync(f, 'utf-8'));
      fs.writeFileSync('/tmp/oni_tiers.json', JSON.stringify(d, null, 2));
      return d;
    }
  } catch {}
  return def;
}
async function saveTiers(data) {
  const dir = '/tmp';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync('/tmp/oni_tiers.json', JSON.stringify(data, null, 2));
  const token = process.env.GH_TOKEN;
  if (token) syncToGitHub(data, token, 'data/tiers.json').catch(() => {});
}
async function getTier(sales, overrideTier) {
  const tiers = await loadTiers();
  if (overrideTier) {
    const found = tiers.find(t => t.name === overrideTier);
    if (found) return found;
  }
  let t = tiers[0];
  for (const tier of tiers) { if (sales >= tier.minSales) t = tier; }
  return t;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-admin-key,x-session-token');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const url = req.url.split('?')[0];
  const query = qs(req.url);
  const key = process.env.ADMIN_API_KEY || '123Mat123';

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
        res.setHeader('Cache-Control', 'public, max-age=60');
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
        const wh = process.env.DISCORD_WEBHOOK_URL;
        if (wh) {
          const price = parseFloat(body.price || 0).toFixed(2).replace('.', ',');
          fetch(wh, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ content:'📦 **Nouveau produit ajouté**\n**' + body.name + '** — ' + price + ' €\n🔗 ' + (process.env.VERCEL_URL || 'lacorpo.vercel.app') + '/produit.html?slug=' + body.slug }) }).catch(()=>{});
        }
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
      let promoDiscount = 0;
      if (body.promoCode) {
        const codes = await loadCodes();
        const found = codes.find(c => c.code === body.promoCode.toUpperCase().trim());
        if (found) promoDiscount = found.discount;
      }

      let remainingDiscount = promoDiscount;
      for (const item of (body.items || [])) {
        const rawPrice = item.price ?? item.amount ?? 0;
        let unit = parseFloat(rawPrice);
        if (isNaN(unit) || unit < 0) {
          res.status(400).json({ error: `Prix invalide pour "${item.name}". Vide ton panier et réessaie.` });
          return;
        }
        if (remainingDiscount > 0 && unit > 0) {
          const itemDiscount = Math.min(remainingDiscount, unit);
          unit = parseFloat((unit - itemDiscount).toFixed(2));
          remainingDiscount = parseFloat((remainingDiscount - itemDiscount).toFixed(2));
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

      const discountedTotal = Math.max(0, (parseFloat(body.total) || 0) - promoDiscount);
      const order = {
        id: orderId,
        items: body.items,
        customer: body.customer,
        total: parseFloat(body.total) || 0,
        totalAfterDiscount: discountedTotal,
        promoCode: (body.promoCode || '').toUpperCase().trim() || null,
        promoDiscount,
        status: 'pending_payment',
        createdAt: new Date().toISOString(),
      };
      orders.push(order);
      await saveOrders(orders);

      if (lineItems.length === 0) {
        orders[orders.length - 1].status = 'payé';
        orders[orders.length - 1].paidAt = new Date().toISOString();
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
          await saveOrders(orders);

          // Track promo code usage for ambassador commissions
          if (orders[idx].promoCode) {
            let codes = await loadCodes();
            const codeIdx = codes.findIndex(c => c.code === (orders[idx].promoCode || '').toUpperCase().trim());
            if (codeIdx >= 0) {
              codes[codeIdx].usedCount = (codes[codeIdx].usedCount || 0) + 1;
              if (!codes[codeIdx].usedBy) codes[codeIdx].usedBy = [];
              const customerEmail = orders[idx].email || (orders[idx].customer && orders[idx].customer.email) || 'anonyme';
              codes[codeIdx].usedBy.push(customerEmail);
              await saveCodes(codes);

              if (codes[codeIdx].ambassadorEmail) {
                const total = parseFloat(orders[idx].totalAfterDiscount || orders[idx].total || 0);
                const commission = total * (codes[codeIdx].ambassadorPercent || 0) / 100;
                const notif = { id: Date.now(), ambassadorEmail: codes[codeIdx].ambassadorEmail, orderId: orders[idx].id, message: 'Commande #' + orders[idx].id + ' avec le code ' + codes[codeIdx].code + ' — +' + commission.toFixed(2).replace('.', ',') + ' €', commission, read: false, createdAt: new Date().toISOString() };
                let notifs = await loadNotifications();
                notifs.push(notif);
                await saveNotifications(notifs);
              }
            }
          }

          await sendDiscordNotification(orders[idx]);
        }

        const products = await load();
        const items = orders[idx]?.items || [];
        const downloads = items.map(item => {
          const prod = products.find(p => p.slug === item.slug || p.name === item.name);
          return prod && prod.downloadUrl ? { name: prod.name, url: prod.downloadUrl } : null;
        }).filter(Boolean);

        res.json({ status: 'paid', orderId, downloads });
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
          await saveOrders(orders);

          if (orders[idx].promoCode) {
            let codes = await loadCodes();
            const codeIdx = codes.findIndex(c => c.code === (orders[idx].promoCode || '').toUpperCase().trim());
            if (codeIdx >= 0) {
              codes[codeIdx].usedCount = (codes[codeIdx].usedCount || 0) + 1;
              if (!codes[codeIdx].usedBy) codes[codeIdx].usedBy = [];
              const customerEmail = orders[idx].email || (orders[idx].customer && orders[idx].customer.email) || 'anonyme';
              codes[codeIdx].usedBy.push(customerEmail);
              await saveCodes(codes);

              // Ambassador notification
              if (codes[codeIdx].ambassadorEmail) {
                const total = parseFloat(orders[idx].totalAfterDiscount || orders[idx].total || 0);
                const commission = total * (codes[codeIdx].ambassadorPercent || 0) / 100;
                const notif = { id: Date.now(), ambassadorEmail: codes[codeIdx].ambassadorEmail, orderId: orders[idx].id, message: 'Commande #' + orders[idx].id + ' avec le code ' + codes[codeIdx].code + ' — +' + commission.toFixed(2).replace('.', ',') + ' €', commission, read: false, createdAt: new Date().toISOString() };
                let notifs = await loadNotifications();
                notifs.push(notif);
                await saveNotifications(notifs);
              }
            }
          }

          await sendDiscordNotification(orders[idx]);
        }
      }

      res.json({ received: true });
      return;
    }

    // Public stats
    if (url === '/api/stats' && req.method === 'GET') {
      res.setHeader('Cache-Control', 'public, max-age=60');
      const orders = await loadOrders();
      const paid = orders.filter(o => o.status === 'payé');
      const totalVentes = paid.length;
      const reviews = await loadReviews();
      const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0;
      res.json({ totalVentes, avgRating: Math.round(avgRating * 10) / 10, reviewCount: reviews.length });
      return;
    }

    // Admin analytics dashboard
    if (url === '/api/admin/analytics') {
      if (req.headers['x-admin-key'] !== key) { res.status(401).json({ error: 'Non autorisé' }); return; }
      const orders = await loadOrders();
      const paid = orders.filter(o => o.status === 'payé');
      const totalRevenue = paid.reduce((s, o) => s + parseFloat(o.totalAfterDiscount || o.total || 0), 0);
      const totalOrders = paid.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Orders by month (last 12)
      const months = {};
      const now = new Date();
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        months[key] = { month: key, count: 0, revenue: 0 };
      }
      paid.forEach(o => {
        const d = new Date(o.paidAt || o.createdAt);
        const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        if (months[key]) {
          months[key].count++;
          months[key].revenue += parseFloat(o.totalAfterDiscount || o.total || 0);
        }
      });
      const ordersByMonth = Object.values(months).reverse();

      // Top products
      const productMap = {};
      paid.forEach(o => {
        (o.items || []).forEach(item => {
          const name = item.name || 'Produit';
          if (!productMap[name]) productMap[name] = { name, count: 0, revenue: 0 };
          productMap[name].count += item.quantity || 1;
          productMap[name].revenue += parseFloat(item.price || item.amount || 0) * (item.quantity || 1);
        });
      });
      const topProducts = Object.values(productMap).sort((a, b) => b.count - a.count).slice(0, 10);

      // Recent orders
      const recentOrders = paid.slice(-5).reverse().map(o => ({
        id: o.id, total: parseFloat(o.totalAfterDiscount || o.total || 0), email: o.email || (o.customer ? o.customer.email : null), date: o.paidAt || o.createdAt, items: (o.items || []).map(i => i.name).join(', ')
      }));

      const revenueByMonth = ordersByMonth.map(m => ({ month: m.month, revenue: Math.round(m.revenue * 100) / 100 }));

      res.json({ totalRevenue: Math.round(totalRevenue * 100) / 100, totalOrders, avgOrderValue: Math.round(avgOrderValue * 100) / 100, ordersByMonth, revenueByMonth, topProducts, recentOrders });
      return;
    }

    // Admin tiers config
    if (url === '/api/admin/tiers') {
      if (req.headers['x-admin-key'] !== key) { res.status(401).json({ error: 'Non autorisé' }); return; }
      if (req.method === 'GET') {
        res.json(await loadTiers());
        return;
      }
      if (req.method === 'POST') {
        const body = await getBody(req);
        if (!body || !Array.isArray(body)) { res.status(400).json({ error: 'Tableau de paliers requis' }); return; }
        await saveTiers(body);
        res.json({ success: true });
        return;
      }
    }

    // Reviews
    if (url === '/api/reviews' && req.method === 'GET') {
      res.setHeader('Cache-Control', 'public, max-age=60');
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
        if (body.status) {
          orders[idx].status = body.status;
          orders[idx].updatedAt = new Date().toISOString();
        }
        if (body.addNote) {
          if (!orders[idx].notes) orders[idx].notes = [];
          orders[idx].notes.push({
            text: body.addNote,
            author: body.author || 'Admin',
            createdAt: new Date().toISOString()
          });
          orders[idx].updatedAt = new Date().toISOString();
        }
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
      res.json({ downloads });
      return;
    }

    // Promo codes
    if (url === '/api/codes') {
      if (req.method === 'GET') {
        if (req.headers['x-admin-key'] !== key) { res.status(401).json({ error: 'Non autorisé' }); return; }
        res.json(await loadCodes()); return;
      }
      if (req.method === 'POST') {
        if (req.headers['x-admin-key'] !== key) { res.status(401).json({ error: 'Non autorisé' }); return; }
        const body = await getBody(req);
        let codes = await loadCodes();
        const code = { id: codes.length > 0 ? Math.max(...codes.map(c => c.id)) + 1 : 1, code: body.code.toUpperCase().trim(), discount: parseFloat(body.discount) || 0, createdAt: new Date().toISOString(), usedBy: null, ambassadorEmail: body.ambassadorEmail || null, ambassadorPercent: parseFloat(body.ambassadorPercent) || 0 };
        codes.push(code);
        await saveCodes(codes);
        res.status(201).json(code); return;
      }
      if (req.method === 'DELETE') {
        if (req.headers['x-admin-key'] !== key) { res.status(401).json({ error: 'Non autorisé' }); return; }
        if (!query.id) { res.status(400).json({ error: 'id requis' }); return; }
        await saveCodes((await loadCodes()).filter(c => c.id !== query.id));
        res.json({ success: true }); return;
      }
    }

    // Suggestions
    if (url === '/api/suggestions') {
      if (req.method === 'GET') {
        if (req.headers['x-admin-key'] !== key) { res.status(401).json({ error: 'Non autorisé' }); return; }
        try { res.json(JSON.parse(fs.readFileSync('/tmp/oni_suggestions.json', 'utf8') || '[]')); return; }
        catch { res.json([]); return; }
      }
      if (req.method === 'POST') {
      const body = await getBody(req);
      if (!body.name || !body.message) { res.status(400).json({ error: 'name and message required' }); return; }
      let suggs = [];
      try { suggs = JSON.parse(fs.readFileSync('/tmp/oni_suggestions.json', 'utf8') || '[]'); } catch { suggs = []; }
      suggs.push({ id: suggs.length + 1, name: body.name, email: body.email || '', message: body.message, createdAt: new Date().toISOString() });
      fs.writeFileSync('/tmp/oni_suggestions.json', JSON.stringify(suggs, null, 2));
      const token = process.env.GH_TOKEN;
      if (token) syncToGitHub(suggs, token, 'data/suggestions.json').catch(() => {});
      const wh = process.env.DISCORD_WEBHOOK_URL;
      if (wh) fetch(wh, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ content:'💡 **Nouvelle suggestion**\n**' + body.name + '** : ' + body.message + (body.email ? '\n📧 ' + body.email : '') }) }).catch(()=>{});
      res.status(201).json({ success: true }); return;
    }
    if (req.method === 'DELETE') {
      if (req.headers['x-admin-key'] !== key) { res.status(401).json({ error: 'Non autorisé' }); return; }
      fs.writeFileSync('/tmp/oni_suggestions.json', '[]');
      const token = process.env.GH_TOKEN;
      if (token) syncToGitHub([], token, 'data/suggestions.json').catch(() => {});
      res.json({ success: true }); return;
    }
    }

    // Subscribers
    if (url === '/api/subscribers' && req.method === 'POST') {
      const body = await getBody(req);
      if (!body.email) { res.status(400).json({ error: 'email required' }); return; }
      let subs = [];
      try { subs = JSON.parse(fs.readFileSync('/tmp/oni_subscribers.json', 'utf8') || '[]'); } catch { subs = []; }
      if (subs.find(s => s.email === body.email)) { res.json({ success: true, already: true }); return; }
      subs.push({ email: body.email, createdAt: new Date().toISOString() });
      fs.writeFileSync('/tmp/oni_subscribers.json', JSON.stringify(subs, null, 2));
      const token = process.env.GH_TOKEN;
      if (token) syncToGitHub(subs, token, 'data/subscribers.json').catch(() => {});
      const wh = process.env.DISCORD_WEBHOOK_URL;
      if (wh) fetch(wh, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ content:'🔔 **Nouvel inscrit notifications**\n📧 ' + body.email }) }).catch(()=>{});
      res.status(201).json({ success: true }); return;
    }

    // Validate promo code (public)
    if (url === '/api/validate-code' && req.method === 'GET') {
      const codeStr = query.code ? query.code.toUpperCase().trim() : null;
      if (!codeStr) { res.json({ valid: false }); return; }
      const codes = await loadCodes();
      const found = codes.find(c => c.code === codeStr);
      if (found) {
        res.json({ valid: true, discount: found.discount, codeId: found.id });
      } else {
        res.json({ valid: false });
      }
      return;
    }

    // Auth
    if (url === '/api/auth/register' && req.method === 'POST') {
      const body = await getBody(req);
      if (!body.email || !body.password) { res.status(400).json({ error: 'email et password requis' }); return; }
      const email = body.email.trim().toLowerCase();
      let accounts = await loadAccounts();
      if (accounts.find(a => a.email === email)) { res.status(409).json({ error: 'Cet email est déjà utilisé' }); return; }
      const token = require('crypto').randomUUID();
      const hash = await bcrypt.hash(body.password, 10);
      accounts.push({ email, password: hash, token, createdAt: new Date().toISOString() });
      await saveAccounts(accounts);
      res.status(201).json({ token }); return;
    }

    if (url === '/api/auth/login' && req.method === 'POST') {
      const body = await getBody(req);
      if (!body.email || !body.password) { res.status(400).json({ error: 'email et password requis' }); return; }
      const email = body.email.trim().toLowerCase();
      const accounts = await loadAccounts();
      const account = accounts.find(a => a.email === email);
      if (!account) { res.status(401).json({ error: 'Email ou mot de passe incorrect' }); return; }
      let isMatch = false;
      if ((account.password || '').startsWith('$2')) {
        isMatch = await bcrypt.compare(body.password, account.password);
      } else {
        isMatch = body.password === account.password;
        if (isMatch) {
          account.password = await bcrypt.hash(body.password, 10);
          await saveAccounts(accounts);
        }
      }
      if (!isMatch) { res.status(401).json({ error: 'Email ou mot de passe incorrect' }); return; }
      res.json({ token: account.token }); return;
    }

    if (url === '/api/account/orders') {
      if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return; }
      const token = req.headers['x-session-token'];
      if (!token) { res.status(401).json({ error: 'Non connecté' }); return; }
      const accounts = await loadAccounts();
      const account = accounts.find(a => a.token === token);
      if (!account) { res.status(401).json({ error: 'Session invalide' }); return; }
      const orders = await loadOrders();
      const userOrders = orders.filter(o => o.email && o.email.toLowerCase() === account.email && o.status === 'payé');
      const products = await load();
      res.json(userOrders.map(o => ({
        id: o.id,
        date: o.createdAt,
        total: o.total,
        items: (o.items || []).map(item => {
          const prod = (products || []).find(p => p.id === item.id || p.slug === item.slug);
          return { name: item.name || (prod ? prod.name : 'Produit'), downloadUrl: item.downloadUrl || (prod ? prod.downloadUrl : null) || null };
        })
      })));
      return;
    }

    // Account downloads (all purchased files)
    if (url === '/api/account/downloads') {
      const token = req.headers['x-session-token'];
      if (!token) { res.status(401).json({ error: 'Non connecté' }); return; }
      const accounts = await loadAccounts();
      const account = accounts.find(a => a.token === token);
      if (!account) { res.status(401).json({ error: 'Session invalide' }); return; }
      const orders = await loadOrders();
      const paidOrders = orders.filter(o => o.email && o.email.toLowerCase() === account.email && o.status === 'payé');
      const products = await load();
      const downloads = [];
      const seen = new Set();
      for (const o of paidOrders) {
        for (const item of (o.items || [])) {
          const prod = (products || []).find(p => p.id === item.id || p.slug === item.slug);
          const url = item.downloadUrl || (prod ? prod.downloadUrl : null);
          if (url && !seen.has(url)) {
            seen.add(url);
            downloads.push({ name: item.name || (prod ? prod.name : 'Produit'), downloadUrl: url, orderId: o.id, date: o.createdAt });
          }
        }
      }
      res.json(downloads);
      return;
    }

    // Ambassador stats
    if (url === '/api/ambassador/stats') {
      const token = req.headers['x-session-token'];
      if (!token) { res.status(401).json({ error: 'Non connecté' }); return; }
      const accounts = await loadAccounts();
      const account = accounts.find(a => a.token === token);
      if (!account) { res.status(401).json({ error: 'Session invalide' }); return; }
      if (account.role !== 'ambassadeur') { res.status(403).json({ error: 'Accès réservé aux ambassadeurs' }); return; }
      const codes = await loadCodes();
      const myCodes = codes.filter(c => c.ambassadorEmail === account.email);
      const orders = await loadOrders();
      const paidOrders = orders.filter(o => o.status === 'payé');
      const myOrders = paidOrders.filter(o => myCodes.some(c => c.code === (o.promoCode || '').toUpperCase().trim()));
      const stats = myOrders.map(o => {
        const code = myCodes.find(c => c.code === (o.promoCode || '').toUpperCase().trim());
        const commission = code ? ((o.totalAfterDiscount || o.total || 0) * (code.ambassadorPercent || 0) / 100) : 0;
        return {
          orderId: o.id,
          date: o.createdAt,
          customerEmail: o.email || (o.customer ? o.customer.email : null),
          total: parseFloat(o.total || 0),
          totalAfterDiscount: parseFloat(o.totalAfterDiscount || o.total || 0),
          promoCode: o.promoCode,
          commissionPercent: code ? (code.ambassadorPercent || 0) : 0,
          commission
        };
      });
      const totalCommission = stats.reduce((s, o) => s + o.commission, 0);
      const tiers = await loadTiers();
      const tier = await getTier(stats.length, account.tierOverride);
      const nextTier = tiers.find(t => t.minSales > stats.length);
      const nextTierSales = nextTier ? nextTier.minSales - stats.length : 0;
      const curIdx = tiers.findIndex(t => t.name === tier.name);
      const nextIdx = tiers.findIndex(t => t.minSales > stats.length);
      const progress = nextTier && curIdx >= 0 && nextIdx >= 0 ? Math.round((stats.length - tiers[curIdx].minSales) / (tiers[nextIdx].minSales - tiers[curIdx].minSales) * 100) : 100;
      res.json({ codes: myCodes, orders: stats, totalOrders: stats.length, totalCommission, commissionPercent: tier.commission, tier: { name: tier.name, icon: tier.icon, color: tier.color }, nextTier: nextTier ? { name: nextTier.name, icon: nextTier.icon, salesNeeded: nextTierSales } : null, progress });
      return;
    }

    // Ambassador admin stats (for admin comptes page)
    if (url === '/api/ambassador/admin-stats') {
      if (req.headers['x-admin-key'] !== key) { res.status(401).json({ error: 'Non autorisé' }); return; }
      const email = urlMod.parse(req.url, true).query.email;
      if (!email) { res.status(400).json({ error: 'email requis' }); return; }
      const acc = (await loadAccounts()).find(a => a.email === email);
      const codes = await loadCodes();
      const myCodes = codes.filter(c => c.ambassadorEmail === email);
      const orders = await loadOrders();
      const paidOrders = orders.filter(o => o.status === 'payé');
      const myOrders = paidOrders.filter(o => myCodes.some(c => c.code === (o.promoCode || '').toUpperCase().trim()));
      const stats = myOrders.map(o => {
        const code = myCodes.find(c => c.code === (o.promoCode || '').toUpperCase().trim());
        const commission = code ? ((o.totalAfterDiscount || o.total || 0) * (code.ambassadorPercent || 0) / 100) : 0;
        return { orderId: o.id, date: o.createdAt, customerEmail: o.email || (o.customer ? o.customer.email : null), total: parseFloat(o.total || 0), totalAfterDiscount: parseFloat(o.totalAfterDiscount || o.total || 0), promoCode: o.promoCode, commissionPercent: code ? (code.ambassadorPercent || 0) : 0, commission };
      });
      const totalCommission = stats.reduce((s, o) => s + o.commission, 0);
      const tier = await getTier(stats.length, acc ? acc.tierOverride : null);
      res.json({ codes: myCodes, orders: stats, totalOrders: stats.length, totalCommission, tier: { name: tier.name, icon: tier.icon, color: tier.color } });
      return;
    }

    // Ambassador leaderboard (admin)
    if (url === '/api/ambassador/leaderboard') {
      if (req.headers['x-admin-key'] !== key) { res.status(401).json({ error: 'Non autorisé' }); return; }
      const accounts = (await loadAccounts()).filter(a => a.role === 'ambassadeur');
      const codes = await loadCodes();
      const orders = (await loadOrders()).filter(o => o.status === 'payé');
      const leaderboard = [];
      for (const acc of accounts) {
        const myCodes = codes.filter(c => c.ambassadorEmail === acc.email);
        const myOrders = orders.filter(o => myCodes.some(c => c.code === (o.promoCode || '').toUpperCase().trim()));
        let totalCommission = 0;
        for (const o of myOrders) {
          const code = myCodes.find(c => c.code === (o.promoCode || '').toUpperCase().trim());
          totalCommission += code ? ((o.totalAfterDiscount || o.total || 0) * (code.ambassadorPercent || 0) / 100) : 0;
        }
        const tier = await getTier(myOrders.length, acc.tierOverride);
        leaderboard.push({ email: acc.email, sales: myOrders.length, totalCommission: Math.round(totalCommission * 100) / 100, tier: { name: tier.name, icon: tier.icon, color: tier.color }, tierOverride: acc.tierOverride || null, joinedAt: acc.createdAt });
      }
      leaderboard.sort((a, b) => b.totalCommission - a.totalCommission);
      res.json(leaderboard);
      return;
    }

    // Ambassador set tier override (admin)
    if (url === '/api/ambassador/set-tier') {
      if (req.headers['x-admin-key'] !== key) { res.status(401).json({ error: 'Non autorisé' }); return; }
      const body = await getBody(req);
      if (!body.email) { res.status(400).json({ error: 'email requis' }); return; }
      let accounts = await loadAccounts();
      const idx = accounts.findIndex(a => a.email === body.email);
      if (idx < 0) { res.status(404).json({ error: 'Compte introuvable' }); return; }
      accounts[idx].tierOverride = body.tier || null;
      await saveAccounts(accounts);
      res.json({ success: true, tierOverride: accounts[idx].tierOverride });
      return;
    }

    // Ambassador reset commissions
    if (url === '/api/ambassador/reset') {
      if (req.headers['x-admin-key'] !== key) { res.status(401).json({ error: 'Non autorisé' }); return; }
      const email = urlMod.parse(req.url, true).query.email;
      if (!email) { res.status(400).json({ error: 'email requis' }); return; }
      let codes = await loadCodes();
      codes.forEach(c => {
        if (c.ambassadorEmail === email) {
          c.usedCount = 0;
          c.usedBy = [];
        }
      });
      await saveCodes(codes);
      res.json({ success: true });
      return;
    }

    // Ambassador notifications
    if (url === '/api/ambassador/notifications') {
      if (req.method === 'GET') {
        const token = req.headers['x-session-token'];
        if (!token) { res.status(401).json({ error: 'Non connecté' }); return; }
        const accounts = await loadAccounts();
        const account = accounts.find(a => a.token === token);
        if (!account) { res.status(401).json({ error: 'Session invalide' }); return; }
        if (account.role !== 'ambassadeur') { res.status(403).json({ error: 'Accès réservé aux ambassadeurs' }); return; }
        const notifs = await loadNotifications();
        const myNotifs = notifs.filter(n => n.ambassadorEmail === account.email).sort((a, b) => b.createdAt > a.createdAt ? 1 : -1);
        const unread = myNotifs.filter(n => !n.read).length;
        res.json({ notifications: myNotifs, unread });
        return;
      }
      if (req.method === 'POST') {
        const token = req.headers['x-session-token'];
        if (!token) { res.status(401).json({ error: 'Non connecté' }); return; }
        const accounts = await loadAccounts();
        const account = accounts.find(a => a.token === token);
        if (!account) { res.status(401).json({ error: 'Session invalide' }); return; }
        if (account.role !== 'ambassadeur') { res.status(403).json({ error: 'Accès réservé aux ambassadeurs' }); return; }
        const body = await getBody(req);
        let notifs = await loadNotifications();
        if (body.markAll) {
          notifs.forEach(n => { if (n.ambassadorEmail === account.email) n.read = true; });
        } else if (body.id) {
          const n = notifs.find(n => n.id === body.id && n.ambassadorEmail === account.email);
          if (n) n.read = true;
        }
        await saveNotifications(notifs);
        res.json({ success: true });
        return;
      }
    }

    // Admin accounts
    if (url === '/api/accounts') {
      if (req.headers['x-admin-key'] !== key) { res.status(401).json({ error: 'Non autorisé' }); return; }
      if (req.method === 'GET') {
        const accounts = await loadAccounts();
        res.json(accounts.map(a => ({ email: a.email, role: a.role || null, createdAt: a.createdAt })));
        return;
      }
      if (req.method === 'PUT') {
        const body = await getBody(req);
        if (!body.email) { res.status(400).json({ error: 'email requis' }); return; }
        let accounts = await loadAccounts();
        const idx = accounts.findIndex(a => a.email === body.email);
        if (idx < 0) { res.status(404).json({ error: 'Compte introuvable' }); return; }
        if (body.role !== undefined) accounts[idx].role = body.role || null;
        if (body.password) accounts[idx].password = await bcrypt.hash(body.password, 10);
        await saveAccounts(accounts);
        res.json({ email: accounts[idx].email, role: accounts[idx].role });
        return;
      }
      if (req.method === 'DELETE') {
        const delEmail = urlMod.parse(req.url, true).query.email;
        if (!delEmail) { res.status(400).json({ error: 'email requis' }); return; }
        let accounts = await loadAccounts();
        accounts = accounts.filter(a => a.email !== delEmail);
        await saveAccounts(accounts);
        res.json({ success: true });
        return;
      }
      res.status(405).json({ error: 'Method not allowed' }); return;
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

    // Discord updates notification
    if (url === '/api/notify-update' && req.method === 'POST') {
      const body = await getBody(req);
      const message = body.message || '';
      const title = body.title || '🚀 Mise à jour LaCorpo';
      const wh = process.env.DISCORD_UPDATES_WEBHOOK || 'https://discord.com/api/webhooks/1520157082597195936/Uz021n2pX5uxrFRqMq9xO81zEW6OpG9a9DQFDyaxwOQlhtZBxaqkI_aS6wb5rrh_gIh3';
      if (wh) {
        fetch(wh, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'LaCorpo Updates',
            avatar_url: 'https://i.goopics.net/k2n1sq.png',
            embeds: [{
              title,
              color: 0xc8a87c,
              description: message,
              timestamp: new Date().toISOString()
            }]
          })
        }).catch(() => {});
      }
      res.json({ success: true });
      return;
    }

    res.status(404).json({ error: 'Not found' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
