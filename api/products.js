const fs = require('fs');
const path = require('path');
const DATA_PATH = path.join(process.cwd(), 'data', 'products.json');
const CACHE_PATH = '/tmp/oni_products.json';
const IMG_DIR = '/tmp/oni_images';

if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

function readLocal() {
  if (fs.existsSync(CACHE_PATH)) return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
  if (fs.existsSync(DATA_PATH)) return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  return [];
}

function writeLocal(data) {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(data));
}

function imgPath(name) { return path.join(IMG_DIR, name); }

function isImage(name) { return /\.(png|jpg|jpeg|gif|webp)$/i.test(name); }

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

async function uploadImageToGitHub(filename, buffer) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return;
  const content = buffer.toString('base64');
  const url = `https://api.github.com/repos/foast2333310-art/oniknives-site/contents/images/${filename}`;
  const opts = { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } };
  const getRes = await fetch(url + '?ref=master', opts);
  let sha = null;
  if (getRes.ok) { const d = await getRes.json(); sha = d.sha; }
  await fetch(url, {
    method: 'PUT', headers: { ...opts.headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `Ajout image ${filename}`, content, sha, branch: 'master' })
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-admin-key');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    // GET /api/images/filename -> sert l'image uploadée
    if (req.method === 'GET' && req.url.includes('/api/images/')) {
      const name = path.basename(req.url.split('/api/images/')[1].split('?')[0]);
      const filePath = imgPath(name);
      if (fs.existsSync(filePath)) {
        const ext = path.extname(name).toLowerCase();
        const ct = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };
        res.setHeader('Content-Type', ct[ext] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.send(fs.readFileSync(filePath)); return;
      }
      const repoPath = path.join(process.cwd(), 'images', name);
      if (fs.existsSync(repoPath)) {
        const ext = path.extname(name).toLowerCase();
        const ct = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };
        res.setHeader('Content-Type', ct[ext] || 'application/octet-stream');
        res.send(fs.readFileSync(repoPath)); return;
      }
      res.status(404).end(); return;
    }

    // GET /api/products
    if (req.method === 'GET') {
      const products = readLocal();
      if (req.query.slug) {
        const p = products.find(p => p.slug === req.query.slug);
        if (!p) { res.status(404).json({ error: 'not found' }); return; }
        res.json(p); return;
      }
      res.json(products); return;
    }

    // POST /api/upload (upload image)
    if (req.method === 'POST' && req.url.includes('/api/upload')) {
      const ADMIN_KEY = process.env.ADMIN_API_KEY || 'admin123';
      if (!req.headers['x-admin-key'] || req.headers['x-admin-key'] !== ADMIN_KEY) {
        res.status(401).json({ error: 'Non autorisé' }); return;
      }
      const { filename, data: b64data } = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
      if (!filename || !b64data) { res.status(400).json({ error: 'filename et data requis' }); return; }
      const buffer = Buffer.from(b64data, 'base64');
      fs.writeFileSync(imgPath(filename), buffer);
      uploadImageToGitHub(filename, buffer); // async, ne bloque pas
      res.json({ filename, url: '/api/images/' + filename }); return;
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
