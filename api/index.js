const fs = require('fs');
const path = require('path');
const DATA = path.join(process.cwd(), 'data', 'products.json');
const CACHE = '/tmp/oni_products.json';
const IMGDIR = '/tmp/oni_images';

if (!fs.existsSync(IMGDIR)) fs.mkdirSync(IMGDIR, { recursive: true });

function load() {
  if (fs.existsSync(CACHE)) return JSON.parse(fs.readFileSync(CACHE, 'utf-8'));
  if (fs.existsSync(DATA)) return JSON.parse(fs.readFileSync(DATA, 'utf-8'));
  return [];
}

function save(data) {
  fs.writeFileSync(CACHE, JSON.stringify(data));
}

async function syncGit(data) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return;
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
  const url = 'https://api.github.com/repos/foast2333310-art/oniknives-site/contents/data/products.json';
  const h = { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' };
  const r = await fetch(url + '?ref=master', { headers: h });
  let sha = null;
  if (r.ok) { const d = await r.json(); sha = d.sha; }
  await fetch(url, { method: 'PUT', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Update products', content, sha, branch: 'master' }) });
}

function json(res, data, status = 200) { res.status(status).json(data); }

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-admin-key');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const url = req.url.split('?')[0];
  const ADMIN_KEY = process.env.ADMIN_API_KEY || 'admin123';

  try {
    // --- IMAGES ---
    if (url.startsWith('/api/images/')) {
      const name = path.basename(url.replace('/api/images/', ''));
      const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };
      const ext = path.extname(name).toLowerCase().replace('.', '');
      const upload = path.join(IMGDIR, name);
      const local = path.join(process.cwd(), 'images', name);
      const file = fs.existsSync(upload) ? upload : (fs.existsSync(local) ? local : null);
      if (!file) { res.status(404).end(); return; }
      res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(fs.readFileSync(file));
      return;
    }

    // --- UPLOAD ---
    if (url === '/api/upload' && req.method === 'POST') {
      if (req.headers['x-admin-key'] !== ADMIN_KEY) { json(res, { error: 'Non autorisé' }, 401); return; }
      const { filename, data: b64 } = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
      if (!filename || !b64) { json(res, { error: 'filename et data requis' }, 400); return; }
      const safe = path.basename(filename);
      fs.writeFileSync(path.join(IMGDIR, safe), Buffer.from(b64, 'base64'));
      // Try GitHub sync (async, don't wait)
      const token = process.env.GITHUB_TOKEN;
      if (token) {
        const imgUrl = `https://api.github.com/repos/foast2333310-art/oniknives-site/contents/images/${safe}`;
        const h = { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' };
        const r = await fetch(imgUrl + '?ref=master', { headers: h });
        let sha = null;
        if (r.ok) { const d = await r.json(); sha = d.sha; }
        await fetch(imgUrl, { method: 'PUT', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Add image ' + safe, content: b64, sha, branch: 'master' }) });
      }
      json(res, { filename: safe });
      return;
    }

    // --- PRODUCTS ---
    if (url === '/api/products' || url === '/api/products/') {
      if (req.method === 'GET') {
        const products = load();
        if (req.query.slug) {
          const p = products.find(p => p.slug === req.query.slug);
          if (!p) { json(res, { error: 'not found' }, 404); return; }
          json(res, p); return;
        }
        json(res, products); return;
      }

      if (req.headers['x-admin-key'] !== ADMIN_KEY) { json(res, { error: 'Non autorisé' }, 401); return; }

      let products = load();

      if (req.method === 'POST') {
        const body = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
        body.id = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
        products.push(body);
        save(products);
        await syncGit(products);
        json(res, body, 201); return;
      }

      if (req.method === 'PUT') {
        const body = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
        const idx = products.findIndex(p => p.id === body.id);
        if (idx < 0) { json(res, { error: 'not found' }, 404); return; }
        products[idx] = { ...products[idx], ...body };
        save(products);
        await syncGit(products);
        json(res, products[idx]); return;
      }

      if (req.method === 'DELETE') {
        const id = parseInt(req.query.id);
        if (!id) { json(res, { error: 'id requis' }, 400); return; }
        products = products.filter(p => p.id !== id);
        save(products);
        await syncGit(products);
        json(res, { success: true }); return;
      }
    }

    json(res, { error: 'Not found' }, 404);
  } catch (e) {
    json(res, { error: e.message }, 500);
  }
};
