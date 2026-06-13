const fs = require('fs');
const path = require('path');
const DATA_PATH = path.join(process.cwd(), 'data', 'products.json');
const CACHE_PATH = '/tmp/oni_products.json';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GIT_OWNER = 'foast2333310-art';
const GIT_REPO = 'oniknives-site';
const GIT_BRANCH = 'master';

function readLocal() {
  const p = fs.existsSync(CACHE_PATH) ? CACHE_PATH : DATA_PATH;
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function writeLocal(data) {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(data));
}

async function writeGitHub(data) {
  if (!GITHUB_TOKEN) return;
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
  const getRes = await fetch(`https://api.github.com/repos/${GIT_OWNER}/${GIT_REPO}/contents/data/products.json?ref=${GIT_BRANCH}`, {
    headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' }
  });
  let sha = null;
  if (getRes.ok) { const d = await getRes.json(); sha = d.sha; }
  await fetch(`https://api.github.com/repos/${GIT_OWNER}/${GIT_REPO}/contents/data/products.json`, {
    method: 'PUT',
    headers: { Authorization: `token ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Mise à jour produits', content, sha, branch: GIT_BRANCH })
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

function cors() {
  return new Response(null, {
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,x-admin-key' }
  });
}

module.exports = async (req) => {
  if (req.method === 'OPTIONS') return cors();

  if (req.method === 'GET') {
    try {
      const products = readLocal();
      const url = new URL(req.url);
      const slug = url.searchParams.get('slug');
      if (slug) return json(products.find(p => p.slug === slug) || { error: 'not found' });
      return json(products);
    } catch { return json([], 200); }
  }

  const ADMIN_KEY = process.env.ADMIN_API_KEY || 'admin123';
  const key = req.headers.get('x-admin-key');
  if (!key || key !== ADMIN_KEY) return json({ error: 'Non autorisé' }, 401);

  try {
    let products = readLocal();

    if (req.method === 'POST') {
      const body = await req.json();
      body.id = Math.max(0, ...products.map(p => p.id)) + 1;
      products.push(body);
      writeLocal(products);
      await writeGitHub(products);
      return json(body, 201);
    }

    if (req.method === 'PUT') {
      const body = await req.json();
      const idx = products.findIndex(p => p.id === body.id);
      if (idx < 0) return json({ error: 'Produit non trouvé' }, 404);
      products[idx] = { ...products[idx], ...body };
      writeLocal(products);
      await writeGitHub(products);
      return json(products[idx]);
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const id = parseInt(url.searchParams.get('id'));
      if (!id) return json({ error: 'id requis' }, 400);
      products = products.filter(p => p.id !== id);
      writeLocal(products);
      await writeGitHub(products);
      return json({ success: true });
    }

    return json({ error: 'Méthode non supportée' }, 405);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
};
