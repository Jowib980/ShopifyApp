(async function() {
  // Try to detect Shopify product ID element
  const productElement = document.querySelector('[data-product-id]');
  if (!productElement) return;

  const productId = productElement.getAttribute('data-product-id');

  // Fetch offer from Laravel API
  try {
    const res = await fetch(`https://emporium.cardiacambulance.com/api/offers/${productId}`);
    const data = await res.json();

    if (data.status === 'success' && data.product_offer && data.product_offer.offer) {
      const offer = data.product_offer.offer;

      const badge = document.createElement('div');
      badge.innerText = `Offer: ${offer.discount_percent}% OFF when you buy ${offer.buy_quantity}`;
      badge.style = 'color:red;font-weight:bold;margin-top:5px;';
      productElement.appendChild(badge);
    } else {
      console.warn('No offer found for product', productId);
    }
  } catch (error) {
    console.error('Error fetching offer:', error);
  }
})();
