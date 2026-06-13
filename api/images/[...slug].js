const fs = require('fs');
const path = require('path');
const IMG_DIR = '/tmp/oni_images';
const STATIC_DIR = path.join(process.cwd(), 'images');

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

module.exports = async (req, res) => {
  if (req.method !== 'GET') { res.status(405).end(); return; }

  const name = req.url.split('/api/images/')[1]?.split('?')[0];
  if (!name) { res.status(400).end(); return; }

  const safe = path.basename(name);
  const uploadPath = path.join(IMG_DIR, safe);
  if (fs.existsSync(uploadPath)) {
    const ext = path.extname(safe).toLowerCase();
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(fs.readFileSync(uploadPath)); return;
  }

  const staticPath = path.join(STATIC_DIR, safe);
  if (fs.existsSync(staticPath)) {
    const ext = path.extname(safe).toLowerCase();
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.send(fs.readFileSync(staticPath)); return;
  }

  res.status(404).end();
};
