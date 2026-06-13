const fs = require('fs');
const path = require('path');
const DATA_PATH = path.join(process.cwd(), 'data', 'products.json');
const CACHE_PATH = '/tmp/oni_products.json';

function readLocal() {
  if (fs.existsSync(CACHE_PATH)) return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
  if (fs.existsSync(DATA_PATH)) return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  return [];
}

function writeLocal(data) {
  try { fs.writeFileSync(CACHE_PATH, JSON.stringify(data)); } catch {}
}

async function writeGitHub(data) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return;
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
  const url = 'https://api.github.com/repos/foast2333310-art/oniknives-site/contents/data/products.json';
  const opts = { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } };
  const getRes = await fetch(url + '?ref=master', opts);
  let sha = null;
  if (getRes.ok) { const d = await getRes.json(); sha = d.sha; }
  await fetch(url, {
    method: 'PUT', headers: { ...opts.headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Mise à jour produits', content, sha, branch: 'master' })
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-admin-key');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    if (req.method === 'GET') {
      const products = readLocal();
      if (req.query.slug) {
        const p = products.find(p => p.slug === req.query.slug);
        if (!p) { res.status(404).json({ error: 'not found' }); return; }
        res.json(p); return;
      }
      res.json(products); return;
    }

    const ADMIN_KEY = process.env.ADMIN_API_KEY || 'admin123';
    if (!req.headers['x-admin-key'] || req.headers['x-admin-key'] !== ADMIN_KEY) {
      res.status(401).json({ error: 'Non autorisé' }); return;
    }

    let products = readLocal();

    if (req.method === 'POST') {
      const body = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
      body.id = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
      products.push(body);
      writeLocal(products);
      await writeGitHub(products);
      res.status(201).json(body); return;
    }

    if (req.method === 'PUT') {
      const body = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
      const idx = products.findIndex(p => p.id === body.id);
      if (idx < 0) { res.status(404).json({ error: 'Produit non trouvé' }); return; }
      products[idx] = { ...products[idx], ...body };
      writeLocal(products);
      await writeGitHub(products);
      res.json(products[idx]); return;
    }

    if (req.method === 'DELETE') {
      const id = parseInt(req.query.id);
      if (!id) { res.status(400).json({ error: 'id requis' }); return; }
      const filtered = products.filter(p => p.id !== id);
      if (filtered.length === products.length) { res.status(404).json({ error: 'Produit non trouvé' }); return; }
      writeLocal(filtered);
      await writeGitHub(filtered);
      res.json({ success: true }); return;
    }

    res.status(405).json({ error: 'Méthode non supportée' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
