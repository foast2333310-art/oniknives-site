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
    return `
    <div class="product-card" style="position:relative">
      <a href="produit.html?slug=${p.slug}" style="display:block;text-decoration:none;color:inherit;">
        ${badge}
        ${parseFloat(p.price) === 0 ? '<span class="badge badge-promo" style="background:#27ae60;">GRATUIT</span>' : ''}
        <img src="${imgSrc(p.image)}" alt="${p.name}" class="product-card-img" loading="lazy"
             onerror="this.src='images/placeholder.svg'">
        <div class="product-card-body">
          <div class="product-card-title">${p.name}</div>
          <div class="product-card-price">${priceHtml(p.price, p.promo)}</div>
          ${features}
        </div>
      </a>
      <button class="cart-btn" style="margin:0 12px 10px;width:calc(100% - 24px);" onclick="addToCart({id:${p.id},name:'${p.name.replace(/'/g, "\\'")}',price:${p.price},promo:${p.promo || 0},image:'${p.image || ''}',slug:'${p.slug}'})">Ajouter au panier</button>
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
    document.getElementById('product-image').src = imgSrc(product.image);
    document.getElementById('product-image').onerror = function() { this.src = 'images/placeholder.svg'; };
    document.getElementById('product-image').style.display = '';
    document.getElementById('product-name').textContent = product.name;

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
