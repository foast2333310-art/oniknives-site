const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const ADMIN_KEY = process.env.ADMIN_API_KEY;
const KV_KEY = 'oni_products';

async function redis(command, ...args) {
  const res = await fetch(`${UPSTASH_URL}/${command}/${args.map(a => encodeURIComponent(a)).join('/')}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

function isAdmin(req) {
  const key = req.headers.get('x-admin-key');
  return key && key === ADMIN_KEY;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

function cors() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,x-admin-key'
    }
  });
}

async function loadProducts() {
  try {
    const raw = await redis('GET', KV_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // Seed from products.json on first run
  try {
    const fs = require('fs');
    const path = require('path');
    const seedPath = path.join(process.cwd(), 'data', 'products.json');
    if (fs.existsSync(seedPath)) {
      const data = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
      await redis('SET', KV_KEY, JSON.stringify(data));
      return data;
    }
  } catch {}
  return [];
}

async function saveProducts(data) {
  await redis('SET', KV_KEY, JSON.stringify(data));
}

module.exports = async (req) => {
  if (req.method === 'OPTIONS') return cors();

  if (req.method === 'GET') {
    const products = await loadProducts();
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');
    if (slug) {
      const p = products.find(p => p.slug === slug);
      return json(p || { error: 'not found' }, p ? 200 : 404);
    }
    return json(products);
  }

  if (!isAdmin(req)) return json({ error: 'Non autorisé' }, 401);

  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'JSON invalide' }, 400); }
    const products = await loadProducts();
    body.id = Math.max(0, ...products.map(p => p.id)) + 1;
    products.push(body);
    await saveProducts(products);
    return json(body, 201);
  }

  if (req.method === 'PUT') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'JSON invalide' }, 400); }
    const products = await loadProducts();
    const idx = products.findIndex(p => p.id === body.id);
    if (idx < 0) return json({ error: 'Produit non trouvé' }, 404);
    products[idx] = { ...products[idx], ...body };
    await saveProducts(products);
    return json(products[idx]);
  }

  if (req.method === 'DELETE') {
    const url = new URL(req.url);
    const id = parseInt(url.searchParams.get('id'));
    if (!id) return json({ error: 'id requis' }, 400);
    const products = await loadProducts();
    const filtered = products.filter(p => p.id !== id);
    if (filtered.length === products.length) return json({ error: 'Produit non trouvé' }, 404);
    await saveProducts(filtered);
    return json({ success: true });
  }

  return json({ error: 'Méthode non supportée' }, 405);
};
