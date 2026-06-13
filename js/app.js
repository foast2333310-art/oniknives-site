// Mobile nav
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
    if (!res.ok) throw new Error('Erreur');
    return await res.json();
  } catch (e) {
    console.error('Failed to load products:', e);
    return [];
  }
}

function renderProducts(products, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = products.map(p => `
    <a href="produit.html?slug=${p.slug}" class="product-card">
      <img src="images/${p.image || 'placeholder.svg'}" alt="${p.name}" class="product-card-img" loading="lazy"
           onerror="this.src='images/placeholder.svg'">
      <div class="product-card-body">
        <div class="product-card-title">${p.name}</div>
        <div class="product-card-price">${String(p.price).replace('.', ',')} €</div>
      </div>
    </a>
  `).join('');
}

async function loadSingleProduct(slug) {
  try {
    const res = await fetch(API + '?slug=' + encodeURIComponent(slug));
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function initProductPage() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  if (!slug) { document.getElementById('product-name').textContent = 'Produit non trouvé'; return; }
  const product = await loadSingleProduct(slug);
  if (product && !product.error) {
    document.title = `${product.name} — Oni Knives`;
    document.getElementById('product-image').src = 'images/' + (product.image || 'placeholder.svg');
    document.getElementById('product-image').onerror = function() { this.src = 'images/placeholder.svg'; };
    document.getElementById('product-name').textContent = product.name;
    document.getElementById('product-price').textContent = String(product.price).replace('.', ',') + ' €';
    document.getElementById('product-description').textContent = product.description || '';
    const btn = document.getElementById('product-btn');
    if (btn) {
      btn.href = `mailto:contact@oniknives.com?subject=Commande : ${product.name}&body=Bonjour, je souhaite commander : ${encodeURIComponent(product.name)} (${product.price} €)`;
    }
  } else {
    document.getElementById('product-name').textContent = 'Produit non trouvé';
  }
}
