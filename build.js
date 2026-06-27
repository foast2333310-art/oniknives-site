const fs = require('fs');
const path = require('path');
const { minify: minifyHtml } = require('html-minifier-terser');
const Terser = require('terser');
const CleanCSS = require('clean-css');

const dist = path.join(__dirname, 'dist');
const skipDirs = new Set(['node_modules', '.vercel', 'data', 'api', 'dist']);

if (fs.existsSync(dist)) fs.rmSync(dist, { recursive: true });

function copy(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) {
        fs.mkdirSync(d, { recursive: true });
        copy(s, d);
      }
    } else if (entry.name !== 'build.js' && entry.name !== 'package.json' && entry.name !== 'package-lock.json') {
      fs.copyFileSync(s, d);
    }
  }
}

fs.mkdirSync(dist, { recursive: true });
copy(__dirname, dist);

async function minifyDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await minifyDir(full);
    } else if (entry.name.endsWith('.html')) {
      const code = fs.readFileSync(full, 'utf-8');
      const result = await minifyHtml(code, {
        removeComments: true,
        collapseWhitespace: true,
        minifyCSS: true,
        minifyJS: true,
      });
      fs.writeFileSync(full, result);
    } else if (entry.name.endsWith('.css') && !entry.name.endsWith('.min.css')) {
      const code = fs.readFileSync(full, 'utf-8');
      const result = new CleanCSS().minify(code);
      if (result.styles) fs.writeFileSync(full, result.styles);
    } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.min.js') && !entry.name.startsWith('[...')) {
      const code = fs.readFileSync(full, 'utf-8');
      const result = await Terser.minify(code, { compress: true, mangle: { reserved: ['addToCart', 'loadProducts', 'renderProducts', 'initProductPage', 'toggleTheme', 'switchTab'] } });
      if (result.code) fs.writeFileSync(full, result.code);
    }
  }
}

console.log('Minification...');
minifyDir(dist).then(() => console.log('Terminé.'));
