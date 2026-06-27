document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.querySelector('.hamburger');
  const nav = document.querySelector('.nav');
  if (hamburger) {
    hamburger.addEventListener('click', () => nav.classList.toggle('open'));
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  if (window.updateCartCount) {
    const orig = window.updateCartCount;
    window.updateCartCount = function() {
      const prev = parseInt((document.querySelector('.cart-count')?.textContent) || '0');
      orig();
      const curr = parseInt((document.querySelector('.cart-count')?.textContent) || '0');
      if (curr > prev) {
        document.querySelectorAll('.cart-count').forEach(el => { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); });
      }
    };
  }
});

// Hero particles
function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, particles = [];
  function resize() { w = canvas.width = canvas.offsetWidth; h = canvas.height = canvas.offsetHeight; }
  resize(); window.addEventListener('resize', resize);
  const count = 50;
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
      r: Math.random() * 2 + 1, a: Math.random() * 0.5 + 0.1
    });
  }
  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 168, 124, ${p.a})`; ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();
}

// Typewriter
function typeWriter(el, text, speed, cb) {
  let i = 0;
  function type() {
    if (i < text.length) {
      el.textContent += text.charAt(i);
      i++;
      setTimeout(type, speed);
    } else if (cb) cb();
  }
  el.textContent = '';
  type();
}

function initHeroTyping() {
  const titleEl = document.getElementById('hero-title');
  const subEl = document.getElementById('hero-subtitle');
  if (!titleEl || !subEl) return;
  typeWriter(subEl, 'Boutique digitale', 60, () => {
    setTimeout(() => {
      typeWriter(titleEl, 'Bienvenue chez LaCorpo', 50);
    }, 200);
  });
}

initParticles();
initHeroTyping();

const API = '/api/products';

async function loadProducts() {
  try {
    const res = await fetch(API + '?v=' + Date.now());
    if (!res.ok) throw new Error();
    return await res.json();
  } catch { return []; }
}

function imgSrc(name) {
  if (!name) return 'images/placeholder.svg';
  if (name.startsWith('data:') || name.startsWith('http')) return name;
  return '/api/images/' + name;
}

function renderProducts(products, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = products.map(p => {
    const features = p.features && p.features.length ? `<ul class="product-card-features">${p.features.map(f => '<li>' + f + '</li>').join('')}</ul>` : '';
    const badge = p.badge ? `<span class="badge badge-promo">${p.badge}</span>` : '';
    const firstImg = p.images?.[0] || p.image;
    return `
    <div class="product-card" style="position:relative">
      <a href="produit.html?slug=${p.slug}" style="display:block;text-decoration:none;color:inherit;">
        ${badge}
        ${parseFloat(p.price) === 0 ? '<span class="badge badge-promo" style="background:#27ae60;">GRATUIT</span>' : ''}
        <img src="${imgSrc(firstImg)}" alt="${p.name}" class="product-card-img" loading="lazy"
             onerror="this.src='images/placeholder.svg'">
        <div class="product-card-body">
          <div class="product-card-title">${p.name}</div>
          <div class="product-card-price">${priceHtml(p.price, p.promo)}</div>
          ${features}
        </div>
      </a>
      <button class="cart-btn" style="margin:0 12px 10px;width:calc(100% - 24px);" onclick="addToCart({id:${p.id},name:'${p.name.replace(/'/g, "\\'")}',price:${p.price},promo:${p.promo || 0},image:'${firstImg || ''}',slug:'${p.slug}'})">Ajouter au panier</button>
    </div>`;
  }).join('');
}

function priceHtml(price, promo) {
  const p = String(price).replace('.', ',');
  if (promo) {
    const reduced = (price * (100 - promo) / 100).toFixed(2).replace('.', ',');
    return `<span style="text-decoration:line-through;color:#888;font-size:12px;">${p} €</span> <span style="color:#e74c3c;font-size:16px;font-weight:700;">${reduced} €</span>`;
  }
  return `${p} €`;
}

async function initProductPage() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  if (!slug) { document.getElementById('product-name').textContent = 'Produit non trouvé'; return; }
  const products = await loadProducts();
  const product = products.find(p => p.slug === slug);
  if (product) {
    document.title = `${product.name} — LaCorpo`;
    document.getElementById('product-name').textContent = product.name;

    const images = product.images && product.images.length > 0 ? product.images : (product.image ? [product.image] : []);
    const gallery = document.getElementById('product-gallery');
    const mainImg = document.getElementById('gallery-main');
    const thumbs = document.getElementById('gallery-thumbs');
    const prevBtn = document.getElementById('gallery-prev');
    const nextBtn = document.getElementById('gallery-next');
    let currentIdx = 0;
    const validImgs = images.map(src => imgSrc(src)).filter(s => s && s !== 'images/placeholder.svg');
    if (validImgs.length > 0) {
      gallery.style.display = '';
      function showImage(idx) {
        currentIdx = idx;
        mainImg.style.opacity = '0';
        setTimeout(() => {
          mainImg.src = validImgs[currentIdx];
          mainImg.style.opacity = '1';
        }, 150);
        prevBtn.disabled = currentIdx === 0;
        nextBtn.disabled = currentIdx === validImgs.length - 1;
        thumbs.querySelectorAll('img').forEach((t,i) => t.classList.toggle('active', i === currentIdx));
      }
      mainImg.onerror = function() { this.src = 'images/placeholder.svg'; };
      showImage(0);
      prevBtn.onclick = () => showImage(currentIdx - 1);
      nextBtn.onclick = () => showImage(currentIdx + 1);
      document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' && currentIdx > 0) showImage(currentIdx - 1);
        if (e.key === 'ArrowRight' && currentIdx < validImgs.length - 1) showImage(currentIdx + 1);
      });
      thumbs.innerHTML = validImgs.map((src, i) =>
        `<img src="${src}" onerror="this.style.display='none'" class="${i===0?'active':''}">`
      ).join('');
      thumbs.querySelectorAll('img').forEach((t, i) => {
        t.addEventListener('click', () => showImage(i));
      });
      if (validImgs.length <= 1) { prevBtn.style.display = 'none'; nextBtn.style.display = 'none'; }
    }

    const badges = [];
    if (product.badge) badges.push(`<span class="badge badge-promo" style="position:static;display:inline-block;margin-right:8px;">${product.badge}</span>`);
    if (product.epuise) badges.push(`<span class="badge badge-epuise" style="position:static;display:inline-block;">ÉPUISÉ</span>`);
    document.getElementById('product-badges').innerHTML = badges.join('');

    const descEl = document.getElementById('tab-desc');
    if (descEl) descEl.innerHTML = product.description || 'Aucune description disponible.';

    const detailsEl = document.getElementById('tab-details');
    if (detailsEl && product.features && product.features.length) {
      detailsEl.innerHTML = '<ul>' + product.features.map(f => '<li>' + f + '</li>').join('') + '</ul>';
    }

    document.getElementById('product-price').innerHTML = priceHtml(product.price, product.promo);

    const cartBtn = document.getElementById('product-cart-btn');
    const cartLink = document.getElementById('product-cart-link');
    if (cartBtn) {
      cartBtn.textContent = 'Ajouter au panier';
      cartBtn.onclick = function() { addToCart(product); };
    }
    if (cartLink) cartLink.style.display = '';
  } else {
    document.getElementById('product-name').textContent = 'Produit non trouvé';
  }
}

/* Theme toggle */
function toggleTheme() {
  const b = document.body;
  b.classList.toggle('light-mode');
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = b.classList.contains('light-mode') ? '🌙' : '☀️';
  localStorage.setItem('oni_theme', b.classList.contains('light-mode') ? 'light' : 'dark');
}
(function() {
  if (localStorage.getItem('oni_theme') === 'light') {
    document.body.classList.add('light-mode');
    const btn = document.getElementById('themeBtn');
    if (btn) btn.textContent = '🌙';
  }
})();

async function subscribeNotify() {
  const email = document.getElementById('notifEmail')?.value?.trim();
  if (!email) { alert('Entre ton email'); return; }
  try {
    const r = await fetch('/api/subscribers', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email })
    });
    if (!r.ok) throw Error();
    document.getElementById('notifEmail').value = '';
    alert('✓ Inscrit ! Tu seras prévenu des nouveaux produits.');
  } catch { alert('Erreur'); }
}
