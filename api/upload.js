const fs = require('fs');
const path = require('path');
const IMG_DIR = '/tmp/oni_images';

if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-admin-key');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST requis' }); return; }

  const ADMIN_KEY = process.env.ADMIN_API_KEY || 'admin123';
  if (!req.headers['x-admin-key'] || req.headers['x-admin-key'] !== ADMIN_KEY) {
    res.status(401).json({ error: 'Non autorisé' }); return;
  }

  try {
    const { filename, data: b64data } = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
    if (!filename || !b64data) { res.status(400).json({ error: 'filename et data requis' }); return; }
    const buffer = Buffer.from(b64data, 'base64');
    const safe = path.basename(filename);
    fs.writeFileSync(path.join(IMG_DIR, safe), buffer);
    uploadImageToGitHub(safe, buffer);
    res.json({ filename: safe, url: '/api/images/' + safe });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
