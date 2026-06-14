document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.querySelector('.hamburger');
  const nav = document.querySelector('.nav');
  if (hamburger) {
    hamburger.addEventListener('click', () => nav.classList.toggle('open'));
  }
  // Scroll reveal
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  // Cart count pop animation
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
  if (name.startsWith('data:')) return name;
  return '/api/images/' + name;
}

function renderProducts(products, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = products.map(p => {
    const isSpecial = p.category === 'Carte cadeau';
    const effectivePrice = p.promo ? (p.price * (100 - p.promo) / 100).toFixed(2) : p.price;
    return `
    <div class="product-card${isSpecial ? ' product-card-special' : ''}" style="position:relative">
      <a href="produit.html?slug=${p.slug}" style="display:block;text-decoration:none;color:inherit;">
        ${p.promo ? `<span class="badge badge-promo">-${p.promo}%</span>` : ''}
        ${p.epuise ? `<span class="badge badge-epuise">ÉPUISÉ</span>` : ''}
        <img src="${imgSrc(p.image)}" alt="${p.name}" class="product-card-img" loading="lazy"
             onerror="this.src='images/placeholder.svg'">
        <div class="product-card-body">
          <div class="product-card-title">${p.name}</div>
          ${isSpecial && p.amounts && p.amounts.length
            ? `<div class="product-card-amounts">${p.amounts.map(a => '<span class="amount-tag">' + a.toFixed(2).replace('.', ',') + ' €</span>').join('')}</div>`
            : `<div class="product-card-price">${priceHtml(p.price, p.promo)}</div>`}
        </div>
      </a>
      ${!p.epuise && !isSpecial ? `<button class="cart-btn" style="margin:0 12px 10px;width:calc(100% - 24px);" onclick="addToCart({id:${p.id},name:'${p.name.replace(/'/g, "\\'")}',price:${p.price},promo:${p.promo || 0},image:'${p.image || ''}',slug:'${p.slug}'})">Ajouter au panier</button>` : ''}
      ${!p.epuise && isSpecial && p.amounts && p.amounts.length ? `<button class="cart-btn" style="margin:0 12px 10px;width:calc(100% - 24px);" onclick="window.location.href='produit.html?slug=${p.slug}'">Choisir le montant</button>` : ''}
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
    const isSpecial = product.category === 'Carte cadeau';
    document.title = `${product.name} — Oni Knives`;
    document.getElementById('product-image').src = imgSrc(product.image);
    document.getElementById('product-image').onerror = function() { this.src = 'images/placeholder.svg'; };
    document.getElementById('product-image').style.display = '';
    document.getElementById('product-name').textContent = product.name;

    const badges = [];
    if (product.promo) badges.push(`<span class="badge badge-promo" style="position:static;display:inline-block;margin-right:8px;">-${product.promo}%</span>`);
    if (product.epuise) badges.push(`<span class="badge badge-epuise" style="position:static;display:inline-block;">ÉPUISÉ</span>`);
    document.getElementById('product-badges').innerHTML = badges.join('');

    const btn = document.getElementById('product-btn');
    const descEl = document.getElementById('tab-desc');
    if (descEl) descEl.innerHTML = product.description || 'Aucune description disponible.';
    const cartBtn = document.getElementById('product-cart-btn');
    const cartLink = document.getElementById('product-cart-link');
    if (isSpecial && product.amounts && product.amounts.length) {
      const fmt = a => a.toFixed(2).replace('.', ',');
      let selected = product.amounts[0];
      const amtHtml = product.amounts.map(a => `<span class="amount-tag amount-tag-lg${a === selected ? ' amount-selected' : ''}" data-amount="${a}" onclick="selectAmount(this, ${a})">${fmt(a)} €</span>`).join('');
      document.getElementById('product-price').innerHTML = `<span style="color:#888;font-size:14px;">Choisissez un montant</span><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">${amtHtml}</div>`;
      const selDiv = document.createElement('div');
      selDiv.id = 'selected-amount';
      selDiv.style.cssText = 'color:#d4a853;font-size:1.1rem;font-weight:500;margin-top:6px;';
      document.getElementById('product-price').appendChild(selDiv);
      if (btn) btn.style.display = 'none';
      if (cartBtn) {
        if (!product.epuise) {
          cartBtn.textContent = 'Ajouter au panier';
          cartBtn.onclick = function() { addToCart(product, selected); };
        } else {
          cartBtn.textContent = 'Produit épuisé';
          cartBtn.disabled = true;
        }
      }
      window.selectAmount = function(el, amount) {
        document.querySelectorAll('.amount-tag-lg').forEach(t => t.classList.remove('amount-selected'));
        el.classList.add('amount-selected');
        selected = amount;
        document.getElementById('selected-amount').textContent = fmt(amount) + ' €';
        if (cartBtn && !product.epuise) {
          cartBtn.onclick = function() { addToCart(product, amount); };
        }
      };
      document.getElementById('selected-amount').textContent = fmt(selected) + ' €';
    } else {
      document.getElementById('product-price').innerHTML = priceHtml(product.price, product.promo);
      if (btn) btn.style.display = 'none';
      if (cartBtn) {
        if (!product.epuise) {
          cartBtn.textContent = 'Ajouter au panier';
          cartBtn.onclick = function() { addToCart(product); };
        } else {
          cartBtn.textContent = 'Produit épuisé';
          cartBtn.disabled = true;
        }
      }
    }
    if (cartLink) cartLink.style.display = '';
  } else {
    document.getElementById('product-name').textContent = 'Produit non trouvé';
  }
}
