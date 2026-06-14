const CART_KEY = 'oni_cart';

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function addToCart(product, amount) {
  let cart = getCart();
  const key = amount ? product.id + '_a' + amount : String(product.id);
  const existing = cart.find(item => item.key === key);
  if (existing) {
    existing.quantity++;
  } else {
    const price = amount
      ? parseFloat(amount)
      : product.promo
        ? parseFloat((product.price * (100 - product.promo) / 100).toFixed(2))
        : parseFloat(product.price);
    cart.push({ key, productId: product.id, name: product.name, price, originalPrice: parseFloat(product.price), promo: product.promo || 0, image: product.image, slug: product.slug, amount: amount || null, quantity: 1 });
  }
  saveCart(cart);
  showToast('✓ Ajouté au panier');
}

function removeFromCart(key) {
  saveCart(getCart().filter(item => item.key !== key));
}

function updateQuantity(key, qty) {
  let cart = getCart();
  const item = cart.find(i => i.key === key);
  if (item) {
    qty = parseInt(qty);
    if (qty <= 0) {
      cart = cart.filter(i => i.key !== key);
    } else {
      item.quantity = qty;
    }
    saveCart(cart);
  }
}

function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

function getCartTotal() {
  return getCart().reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function updateCartCount() {
  const count = getCartCount();
  document.querySelectorAll('.cart-count').forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}

function showToast(msg) {
  let t = document.getElementById('cart-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'cart-toast';
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#2a2a2a;color:#e5e5e5;padding:14px 24px;border-radius:8px;font-size:14px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.5);border:1px solid #333;opacity:0;transform:translateY(10px);transition:all 0.3s;';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  t.style.transform = 'translateY(0)';
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(10px)'; }, 2000);
}

document.addEventListener('DOMContentLoaded', updateCartCount);
