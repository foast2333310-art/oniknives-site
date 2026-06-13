const fs = require('fs');
const path = require('path');

function load() {
  const c = '/tmp/oni_products.json';
  if (fs.existsSync(c)) return JSON.parse(fs.readFileSync(c, 'utf-8'));
  const d = path.join(process.cwd(), 'data', 'products.json');
  if (fs.existsSync(d)) return JSON.parse(fs.readFileSync(d, 'utf-8'));
  return [];
}

function save(data) { fs.writeFileSync('/tmp/oni_products.json', JSON.stringify(data)); }

const CT = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-admin-key');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const url = req.url.split('?')[0];
  const key = process.env.ADMIN_API_KEY || 'admin123';

  try {
    // === SERVE IMAGES ===
    if (url.startsWith('/api/images/')) {
      const name = path.basename(url.replace('/api/images/', ''));
      for (const dir of ['/tmp/oni_images', path.join(process.cwd(), 'images')]) {
        const fp = path.join(dir, name);
        if (fs.existsSync(fp)) {
          const ext = path.extname(name).toLowerCase().replace('.', '');
          res.setHeader('Content-Type', CT[ext] || 'application/octet-stream');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          res.send(fs.readFileSync(fp)); return;
        }
      }
      res.status(404).end(); return;
    }

    // === UPLOAD IMAGE ===
    if (url === '/api/upload' && req.method === 'POST') {
      if (req.headers['x-admin-key'] !== key) { res.status(401).json({ error: 'Non autorisé' }); return; }
      let raw = '';
      await new Promise(r => { req.on('data', c => raw += c); req.on('end', r); });
      const b = JSON.parse(raw);
      const safe = path.basename(b.filename);
      const dir = '/tmp/oni_images';
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, safe), Buffer.from(b.data, 'base64'));
      res.json({ filename: safe }); return;
    }

    // === PRODUCTS CRUD ===
    if (url.startsWith('/api/products')) {
      // GET
      if (req.method === 'GET') {
        const products = load();
        if (req.query.slug) {
          const p = products.find(p => p.slug === req.query.slug);
          if (!p) { res.status(404).json({ error: 'not found' }); return; }
          res.json(p); return;
        }
        res.json(products); return;
      }

      // Auth check for writes
      if (req.headers['x-admin-key'] !== key) { res.status(401).json({ error: 'Non autorisé' }); return; }

      let raw = '';
      await new Promise(r => { req.on('data', c => raw += c); req.on('end', r); });
      const body = JSON.parse(raw);
      let products = load();

      // POST
      if (req.method === 'POST') {
        body.id = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
        products.push(body);
        save(products);
        res.status(201).json(body); return;
      }

      // PUT
      if (req.method === 'PUT') {
        const idx = products.findIndex(p => p.id === body.id);
        if (idx < 0) { res.status(404).json({ error: 'not found' }); return; }
        products[idx] = { ...products[idx], ...body };
        save(products);
        res.json(products[idx]); return;
      }

      // DELETE
      if (req.method === 'DELETE') {
        const id = parseInt(req.query.id);
        if (!id) { res.status(400).json({ error: 'id requis' }); return; }
        products = products.filter(p => p.id !== id);
        save(products);
        res.json({ success: true }); return;
      }
    }

    res.status(404).json({ error: 'Not found' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
