document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.querySelector('.hamburger');
  const nav = document.querySelector('.nav');
  if (hamburger) {
    hamburger.addEventListener('click', () => nav.classList.toggle('open'));
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
  if (name.startsWith('data:')) return name;
  return '/api/images/' + name;
}

function renderProducts(products, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = products.map(p => {
    const isSpecial = p.category === 'Carte cadeau';
    return `
    <a href="produit.html?slug=${p.slug}" class="product-card${isSpecial ? ' product-card-special' : ''}" style="position:relative">
      ${p.promo ? `<span class="badge badge-promo">-${p.promo}%</span>` : ''}
      ${p.epuise ? `<span class="badge badge-epuise">ÉPUISÉ</span>` : ''}
      ${isSpecial
        ? `<div class="product-card-gift">🎁</div>`
        : `<img src="${imgSrc(p.image)}" alt="${p.name}" class="product-card-img" loading="lazy"
             onerror="this.src='images/placeholder.svg'">`}
      <div class="product-card-body">
        <div class="product-card-title">${p.name}</div>
        ${isSpecial && p.amounts && p.amounts.length
          ? `<div class="product-card-amounts">${p.amounts.map(a => '<span class="amount-tag">' + a.toFixed(2).replace('.', ',') + ' €</span>').join('')}</div>`
          : `<div class="product-card-price">${priceHtml(p.price, p.promo)}</div>`}
      </div>
    </a>`;
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
    const isSpecial = product.category === 'Carte cadeau';
    document.title = `${product.name} — Oni Knives`;
    document.getElementById('product-image').src = isSpecial ? '' : imgSrc(product.image);
    document.getElementById('product-image').onerror = function() { this.src = 'images/placeholder.svg'; };
    document.getElementById('product-image').style.display = isSpecial ? 'none' : '';
    document.getElementById('product-name').textContent = product.name;

    const badges = [];
    if (product.promo) badges.push(`<span class="badge badge-promo" style="position:static;display:inline-block;margin-right:8px;">-${product.promo}%</span>`);
    if (product.epuise) badges.push(`<span class="badge badge-epuise" style="position:static;display:inline-block;">ÉPUISÉ</span>`);
    document.getElementById('product-badges').innerHTML = badges.join('');

    if (isSpecial && product.amounts && product.amounts.length) {
      document.getElementById('product-price').innerHTML = `<span style="color:#888;font-size:14px;">Montants disponibles</span><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">${product.amounts.map(a => `<span class="amount-tag amount-tag-lg">${a.toFixed(2).replace('.', ',')} €</span>`).join('')}</div>`;
    } else {
      document.getElementById('product-price').innerHTML = priceHtml(product.price, product.promo);
    }
    document.getElementById('product-description').textContent = product.description || '';
    const btn = document.getElementById('product-btn');
    if (btn) {
      const effectivePrice = product.promo ? (product.price * (100 - product.promo) / 100).toFixed(2) : product.price;
      const amtStr = isSpecial && product.amounts && product.amounts.length ? ` (montants disponibles : ${product.amounts.join(', ')} €)` : '';
      btn.href = `mailto:oni.knives33@gmail.com?subject=Commande : ${product.name}&body=Bonjour, je souhaite commander : ${encodeURIComponent(product.name)} ${encodeURIComponent(amtStr)}(à partir de ${effectivePrice} €)`;
      if (product.epuise) {
        btn.textContent = 'Produit épuisé';
        btn.style.pointerEvents = 'none';
        btn.style.opacity = '0.5';
      } else {
        btn.textContent = 'Commander par email';
        btn.style.pointerEvents = '';
        btn.style.opacity = '';
      }
    }
  } else {
    document.getElementById('product-name').textContent = 'Produit non trouvé';
  }
}
