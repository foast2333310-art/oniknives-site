const { kv } = require('@vercel/kv');

const ADMIN_KEY = process.env.ADMIN_API_KEY;
const KV_KEY = 'oni_products';

function isAdmin(req) {
  const key = req.headers.get('x-admin-key');
  return key && key === ADMIN_KEY;
}

function json(res, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

function cors(res) {
  return new Response(null, {
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,x-admin-key' }
  });
}

async function loadProducts() {
  let data = await kv.get(KV_KEY);
  if (!data) {
    // Seed from products.json on first run
    try {
      const fs = require('fs');
      const path = require('path');
      const seedPath = path.join(process.cwd(), 'data', 'products.json');
      if (fs.existsSync(seedPath)) {
        const raw = fs.readFileSync(seedPath, 'utf-8');
        data = JSON.parse(raw);
        await kv.set(KV_KEY, data);
      }
    } catch {}
  }
  return data || [];
}

module.exports = async (req) => {
  if (req.method === 'OPTIONS') return cors();

  if (req.method === 'GET') {
    const products = await loadProducts();
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');
    if (slug) return json(res, products.find(p => p.slug === slug) || { error: 'not found' }, slug ? 200 : 404);
    return json(res, products);
  }

  if (!isAdmin(req)) return json(res, { error: 'Non autorisé' }, 401);

  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { return json(res, { error: 'JSON invalide' }, 400); }
    const products = await loadProducts();
    body.id = Math.max(0, ...products.map(p => p.id)) + 1;
    products.push(body);
    await kv.set(KV_KEY, products);
    return json(res, body, 201);
  }

  if (req.method === 'PUT') {
    let body;
    try { body = await req.json(); } catch { return json(res, { error: 'JSON invalide' }, 400); }
    const products = await loadProducts();
    const idx = products.findIndex(p => p.id === body.id);
    if (idx < 0) return json(res, { error: 'Produit non trouvé' }, 404);
    products[idx] = { ...products[idx], ...body };
    await kv.set(KV_KEY, products);
    return json(res, products[idx]);
  }

  if (req.method === 'DELETE') {
    const url = new URL(req.url);
    const id = parseInt(url.searchParams.get('id'));
    if (!id) return json(res, { error: 'id requis' }, 400);
    const products = await loadProducts();
    const filtered = products.filter(p => p.id !== id);
    if (filtered.length === products.length) return json(res, { error: 'Produit non trouvé' }, 404);
    await kv.set(KV_KEY, filtered);
    return json(res, { success: true });
  }

  return json(res, { error: 'Méthode non supportée' }, 405);
};
