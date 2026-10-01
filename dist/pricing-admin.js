const pricingAdminState = { newId: '__new_product__' };
const pricingMoney = cents => (Number(cents || 0) / 100).toFixed(2);

function bulkRowsHtml(tiers) {
  return (Array.isArray(tiers) ? tiers : []).map(tier => { const legacy = tier?.price_cents; const card = tier?.card_price_cents ?? legacy; const cash = tier?.cash_price_cents ?? legacy; return `<div class="bulk-pricing-row"><label>A partir de<input class="bulk-min-quantity" type="number" min="2" step="1" value="${Math.max(2, Math.floor(Number(tier?.min_quantity) || 2))}"><small>unidades</small></label><label>Preço no cartão (R$)<input class="bulk-card-price" type="number" min="0.01" step="0.01" value="${pricingMoney(card)}"></label><label>Preço PIX/dinheiro (R$)<input class="bulk-cash-price" type="number" min="0.01" step="0.01" value="${pricingMoney(cash)}"></label><button type="button" class="remove-bulk" aria-label="Remover faixa de venda múltipla">×</button></div>`; }).join('');
}

function bulkSectionHtml(tiers) {
  return `<section class="bulk-pricing"><div class="bulk-pricing-heading"><div><b>Venda múltipla</b><small>Defina o preço unitário quando o cliente comprar várias unidades da mesma variação.</small></div><button type="button" class="secondary add-bulk" data-add-bulk>Adicionar faixa</button></div><div class="bulk-pricing-rows" data-bulk-rows>${bulkRowsHtml(tiers)}</div></section>`;
}

function enhancePricingRows() {
  const editor = document.querySelector('#product-editor');
  if (!editor) return;
  editor.querySelectorAll('.variant-row').forEach(row => {
    if (row.dataset.pricingReady) return;
    const saved = adminState.selected?.product_variants?.find(variant => variant.id && variant.id === row.dataset.id);
    const full = Number(saved?.price_cents || (Number(row.querySelector('.variant-price')?.value || 0) * 100));
    const cash = Number(saved?.cash_price_cents ?? full);
    const promo = saved?.promo_price_cents == null ? '' : Number(saved.promo_price_cents) / 100;
    const stock = row.querySelector('.variant-stock')?.closest('label');
    stock?.insertAdjacentHTML('beforebegin', `<label>Preço à vista (R$)<input class="variant-cash-price" type="number" min="0" step="0.01" required value="${pricingMoney(cash)}"></label><label>Promoção à vista (R$)<input class="variant-promo-price" type="number" min="0" step="0.01" value="${promo}"><small>Opcional</small></label>`);
    row.insertAdjacentHTML('beforeend', bulkSectionHtml(saved?.quantity_prices || []));
    row.dataset.pricingReady = 'true';
  });
}

function readBulkTiers(row) {
  const seen = new Set();
  return [...row.querySelectorAll('.bulk-pricing-row')].map(tierRow => {
    const minQuantity = Math.floor(Number(tierRow.querySelector('.bulk-min-quantity')?.value));
    const cardPriceCents = Math.round(Number(tierRow.querySelector('.bulk-card-price')?.value) * 100);
    const cashPriceCents = Math.round(Number(tierRow.querySelector('.bulk-cash-price')?.value) * 100);
    if (!Number.isInteger(minQuantity) || minQuantity < 2) throw new Error('A quantidade mínima da venda múltipla deve ser pelo menos 2.');
    if (seen.has(minQuantity)) throw new Error('Não repita a mesma quantidade mínima na venda múltipla.');
    if (!Number.isFinite(cardPriceCents) || cardPriceCents <= 0 || !Number.isFinite(cashPriceCents) || cashPriceCents <= 0) throw new Error('Informe os preços de cartão e PIX/dinheiro para cada faixa.');
    seen.add(minQuantity);
    return { min_quantity: minQuantity, card_price_cents: cardPriceCents, cash_price_cents: cashPriceCents };
  }).sort((a, b) => a.min_quantity - b.min_quantity);
}

const originalPricingLoad = loadProducts;
loadProducts = async function () {
  const select = 'id,brand,name,subcategory,description,image_url,image_override_url,active,product_variants(id,name,price_cents,cash_price_cents,promo_price_cents,quantity_prices,stock_quantity,active)';
  adminState.products = await request('/rest/v1/products?select=' + encodeURIComponent(select) + '&order=name.asc');
  renderList();
  if (adminState.selected) {
    const fresh = adminState.products.find(item => item.id === adminState.selected.id);
    if (fresh) selectProduct(fresh);
  }
  enhancePricingRows();
};

const pricingObserver = new MutationObserver(enhancePricingRows);
pricingObserver.observe(document.querySelector('#product-editor'), { childList: true, subtree: true });

const pricingButton = document.querySelector('#new-product');
if (pricingButton) pricingButton.onclick = () => selectProduct({ id: pricingAdminState.newId, brand: '', name: '', subcategory: adminState.products.find(product => product.active)?.subcategory || '', description: '', image_url: null, image_override_url: null, active: true, product_variants: [] });

document.querySelector('#product-editor').addEventListener('click', event => {
  const add = event.target.closest('[data-add-bulk]');
  if (add) {
    const row = add.closest('.variant-row');
    row.querySelector('[data-bulk-rows]').insertAdjacentHTML('beforeend', bulkRowsHtml([{ min_quantity: 2, card_price_cents: 0, cash_price_cents: 0 }]));
    return;
  }
  const remove = event.target.closest('.remove-bulk');
  if (remove) remove.closest('.bulk-pricing-row')?.remove();
});

document.querySelector('#product-editor').addEventListener('submit', async event => {
  const product = adminState.selected;
  if (!product || product.id !== pricingAdminState.newId) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const form = event.currentTarget, note = document.querySelector('#editor-message');
  note.className = 'admin-message';
  note.textContent = 'Criando produto...';
  try {
    const productPayload = { brand: document.querySelector('#product-brand').value.trim(), name: document.querySelector('#product-name').value.trim(), category: 'Estética Automotiva', subcategory: document.querySelector('#product-category').value.trim(), description: document.querySelector('#product-description').value.trim() || null, active: document.querySelector('#product-active').checked };
    const rows = [...form.querySelectorAll('.variant-row')];
    if (!productPayload.brand || !productPayload.name || !productPayload.subcategory || !rows.length) throw new Error('Preencha marca, nome, categoria e pelo menos uma variação.');
    const variants = rows.map(row => ({ name: row.querySelector('.variant-name').value.trim(), price_cents: Math.round(Number(row.querySelector('.variant-price').value) * 100), cash_price_cents: Math.round(Number(row.querySelector('.variant-cash-price').value) * 100), promo_price_cents: row.querySelector('.variant-promo-price').value === '' ? null : Math.round(Number(row.querySelector('.variant-promo-price').value) * 100), quantity_prices: readBulkTiers(row), stock_quantity: row.querySelector('.variant-stock').value === '' ? null : Math.max(0, Math.floor(Number(row.querySelector('.variant-stock').value))), active: row.querySelector('.variant-active').checked }));
    if (variants.some(variant => !variant.name || Number.isNaN(variant.price_cents) || Number.isNaN(variant.cash_price_cents) || variant.price_cents < 0 || variant.cash_price_cents < 0 || (variant.promo_price_cents != null && (Number.isNaN(variant.promo_price_cents) || variant.promo_price_cents < 0 || variant.promo_price_cents >= variant.cash_price_cents)))) throw new Error('Confira os preços: a promoção deve ser menor que o preço à vista.');
    const created = await request('/rest/v1/products', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(productPayload) });
    const createdProduct = Array.isArray(created) ? created[0] : created;
    if (!createdProduct?.id) throw new Error('O produto foi criado, mas não foi possível obter seu identificador.');
    const imageUrl = await uploadPhoto(document.querySelector('#product-image').files[0], createdProduct.id);
    if (imageUrl) await request('/rest/v1/products?id=eq.' + encodeURIComponent(createdProduct.id), { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ image_override_url: imageUrl }) });
    for (const variant of variants) await request('/rest/v1/product_variants', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ ...variant, product_id: createdProduct.id }) });
    note.textContent = 'Produto criado com sucesso.';
    await loadProducts();
    selectProduct(adminState.products.find(item => item.id === createdProduct.id));
  } catch (error) { note.classList.add('error'); note.textContent = error.message; }
}, true);

document.querySelector('#product-editor').addEventListener('submit', async event => {
  const product = adminState.selected;
  if (!product || product.id === pricingAdminState.newId) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const form = event.currentTarget, note = document.querySelector('#editor-message');
  note.className = 'admin-message';
  note.textContent = 'Salvando...';
  try {
    const imageUrl = await uploadPhoto(document.querySelector('#product-image').files[0], product.id);
    const update = { brand: document.querySelector('#product-brand').value.trim(), name: document.querySelector('#product-name').value.trim(), subcategory: document.querySelector('#product-category').value.trim(), description: document.querySelector('#product-description').value.trim() || null, active: document.querySelector('#product-active').checked };
    if (imageUrl) update.image_override_url = imageUrl;
    for (const removedId of adminState.removedVariantIds) await request('/rest/v1/product_variants?id=eq.' + encodeURIComponent(removedId), { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ active: false }) });
    await request('/rest/v1/products?id=eq.' + encodeURIComponent(product.id), { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(update) });
    for (const row of form.querySelectorAll('.variant-row')) {
      const payload = { product_id: product.id, name: row.querySelector('.variant-name').value.trim(), price_cents: Math.round(Number(row.querySelector('.variant-price').value) * 100), cash_price_cents: Math.round(Number(row.querySelector('.variant-cash-price').value) * 100), promo_price_cents: row.querySelector('.variant-promo-price').value === '' ? null : Math.round(Number(row.querySelector('.variant-promo-price').value) * 100), quantity_prices: readBulkTiers(row), stock_quantity: row.querySelector('.variant-stock').value === '' ? null : Math.max(0, Math.floor(Number(row.querySelector('.variant-stock').value))), active: row.querySelector('.variant-active').checked };
      if (!payload.name || Number.isNaN(payload.price_cents) || Number.isNaN(payload.cash_price_cents) || payload.price_cents < 0 || payload.cash_price_cents < 0 || (payload.promo_price_cents != null && (Number.isNaN(payload.promo_price_cents) || payload.promo_price_cents < 0 || payload.promo_price_cents >= payload.cash_price_cents))) throw new Error('Confira os preços: a promoção deve ser menor que o preço à vista.');
      const id = row.dataset.id;
      if (id) await request('/rest/v1/product_variants?id=eq.' + encodeURIComponent(id), { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(payload) });
      else await request('/rest/v1/product_variants?on_conflict=product_id,name', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(payload) });
    }
    note.textContent = 'Alterações salvas com sucesso.';
    await loadProducts();
  } catch (error) { note.classList.add('error'); note.textContent = error.message; }
}, true);

if (adminState.session) loadProducts();
