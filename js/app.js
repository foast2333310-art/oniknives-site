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
  container.innerHTML = products.map(p => `
    <a href="produit.html?slug=${p.slug}" class="product-card">
      <img src="${imgSrc(p.image)}" alt="${p.name}" class="product-card-img" loading="lazy"
           onerror="this.src='images/placeholder.svg'">
      <div class="product-card-body">
        <div class="product-card-title">${p.name}</div>
        <div class="product-card-price">${String(p.price).replace('.', ',')} €</div>
      </div>
    </a>
  `).join('');
}

async function initProductPage() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  if (!slug) { document.getElementById('product-name').textContent = 'Produit non trouvé'; return; }
  const products = await loadProducts();
  const product = products.find(p => p.slug === slug);
  if (product) {
    document.title = `${product.name} — Oni Knives`;
    document.getElementById('product-image').src = imgSrc(product.image);
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
