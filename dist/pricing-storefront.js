const storefrontEsc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function quantityTiers(variant) {
  const raw = Array.isArray(variant?.quantity_prices) ? variant.quantity_prices : [];
  return raw.map(item => ({
    min_quantity: Math.floor(Number(item?.min_quantity)),
    card_price_cents: Math.round(Number(item?.card_price_cents ?? item?.price_cents)),
    cash_price_cents: Math.round(Number(item?.cash_price_cents ?? item?.price_cents))
  })).filter(item => item.min_quantity >= 2 && item.card_price_cents > 0 && item.cash_price_cents > 0)
    .sort((a, b) => a.min_quantity - b.min_quantity);
}

function quantityTier(variant, quantity = 1) {
  let selected = null;
  for (const tier of quantityTiers(variant)) {
    if (tier.min_quantity <= quantity) selected = tier;
  }
  return selected;
}

function priceData(variant, quantity = 1) {
  const baseFull = Math.max(0, Number(variant?.preco) || 0);
  const baseCash = Math.max(0, Number(variant?.cash_preco ?? baseFull) || baseFull);
  const basePromoValue = Number(variant?.promo_preco);
  const basePromo = Number.isFinite(basePromoValue) && basePromoValue > 0 && basePromoValue < baseCash ? basePromoValue : null;
  const tier = quantityTier(variant, quantity);
  const full = tier ? tier.card_price_cents : baseFull;
  const cash = tier ? tier.cash_price_cents : baseCash;
  const promo = tier ? null : basePromo;
  const effectiveCash = promo ?? cash;
  const card = tier ? tier.card_price_cents : (promo ? Math.round(full * promo / cash) : full);
  return { full, cash, promo, effectiveCash, card, tier };
}

function quantityLabel(variant) {
  const tiers = quantityTiers(variant);
  if (!tiers.length) return '';
  return `<div class="bulk-price">${tiers.map(tier => `A partir de ${tier.min_quantity} unidades · cartão ${money(tier.card_price_cents)} · PIX/dinheiro ${money(tier.cash_price_cents)}`).join(' · ')}</div>`;
}

function promoPercent(variant, quantity = 1) {
  const data = priceData(variant, quantity);
  return data.promo ? Math.floor((1 - data.promo / data.full) * 100) : 0;
}

function priceLabel(variant, quantity = 1, includeBulk = true) {
  const data = priceData(variant, quantity);
  const bulk = includeBulk ? quantityLabel(variant) : '';
  if (data.promo) return `<strong>${money(data.promo)}</strong><div class="cash">${money(data.promo)} no PIX/dinheiro</div><div class="promotion">PROMOÇÃO · ${promoPercent(variant, quantity)}% abaixo do preço padrão</div><div class="price-reference"><s>${money(data.full)}</s> no cartão: ${money(data.card)}</div>${bulk}`;
  return `<strong>${money(data.full)}</strong><div class="cash">${money(data.cash)} no PIX/dinheiro</div><div class="installments">Cartão: ${money(data.card)} em até 4x sem juros</div>${bulk}`;
}

function normalizedVariant(variant) {
  return { id: variant.id, nome: variant.name, preco: variant.price_cents, cash_preco: variant.cash_price_cents, promo_preco: variant.promo_price_cents, quantity_prices: variant.quantity_prices || [] };
}

if (document.querySelector('#grid')) {
  loadCatalogFromSupabase = async function () {
    try {
      const response = await fetch(ALMEIDA_SUPABASE_URL + '/rest/v1/products?active=eq.true&select=brand,name,subcategory,image_url,image_override_url,product_variants(id,name,price_cents,cash_price_cents,promo_price_cents,quantity_prices,active)&order=name.asc', { headers: { apikey: ALMEIDA_SUPABASE_KEY } });
      if (!response.ok) throw new Error('Catalog status ' + response.status);
      const remote = await response.json();
      const normalized = remote.map((product, id) => ({ id, marca: product.brand, nome: product.name, grupo: product.subcategory, imagem: product.image_override_url || localProductImage(product.brand, product.name, product.image_url), variacoes: (product.product_variants || []).filter(variant => variant.active).map(normalizedVariant) })).filter(product => product.variacoes.length);
      if (normalized.length) { produtos = normalized; render(); }
    } catch (error) { console.info('Catálogo local usado enquanto o banco não está disponível.', error); }
  };
  cardPrice = (product, variantIndex = 0) => priceLabel(product.variacoes[variantIndex]);
  openCart = () => {
    const subtotal = cart.reduce((total, item) => total + priceData(produtos[item.id].variacoes[item.vi], item.qty).full * item.qty, 0);
    const cashTotal = cart.reduce((total, item) => total + priceData(produtos[item.id].variacoes[item.vi], item.qty).effectiveCash * item.qty, 0);
    const cardTotal = cart.reduce((total, item) => total + priceData(produtos[item.id].variacoes[item.vi], item.qty).card * item.qty, 0);
    $('#cart-items').innerHTML = cart.map((item, index) => {
      const product = produtos[item.id], variant = product.variacoes[item.vi], data = priceData(variant, item.qty);
      return `<div class="row"><div><strong>${storefrontEsc(product.nome)}</strong><br><small>${storefrontEsc(variant.nome)} · ${storefrontEsc(item.qty)} × ${money(data.full)}${data.tier ? ` · venda múltipla: cartão ${money(data.card)} · PIX/dinheiro ${money(data.effectiveCash)}` : ''}</small></div><label class="cart-quantity"><span class="sr-only">Quantidade de ${storefrontEsc(product.nome)}</span><input data-cart-quantity="${index}" type="number" min="1" step="1" value="${storefrontEsc(item.qty)}" aria-label="Quantidade de ${storefrontEsc(product.nome)}"></label><button class="secondary" data-remove="${index}" aria-label="Remover">×</button></div>`;
    }).join('');
    $('#checkout').innerHTML = cart.length ? `<div class="totals">Preço cheio: <strong>${money(subtotal)}</strong><br>PIX/dinheiro: <strong>${money(cashTotal)}</strong><br>Cartão: <strong>${money(cardTotal)}</strong> em até 4x</div><label class="field">Pagamento<select id="payment"><option value="pix">PIX</option><option value="dinheiro">Dinheiro</option><option value="cartao">Cartão</option></select></label><label class="field">Recebimento<select id="fulfillment"><option value="retirada">Retirada na loja</option><option value="entrega">Entrega</option></select></label><label class="field">Usar cashback (R$)<input id="cashback-use" type="number" min="0" step="0.01" value="0" placeholder="Consultando saldo..." disabled></label><div id="address-fields"></div><p class="notice">Entre na sua conta para registrar o pedido, reservar cashback e acompanhar a confirmação.</p><label class="checkout-confirmation"><input id="confirm-cart-items" type="checkbox"> Confirmo que revisei os itens, quantidades, pagamento e forma de recebimento.</label><button class="primary" id="send" disabled>Finalizar pedido</button>` : '';
    $('#fulfillment')?.addEventListener('change', address);
    address();
    const confirmation = $('#confirm-cart-items'), sendButton = $('#send');
    confirmation?.addEventListener('change', () => { if (sendButton) sendButton.disabled = !confirmation.checked; });
    sendButton?.addEventListener('click', () => { if (typeof window.almeidaSendOrder === 'function') window.almeidaSendOrder(); else { sendButton.disabled = true; sendButton.textContent = 'Aguarde o acesso da conta'; } });
    $('#cart-dialog').showModal();
    window.refreshCashbackField?.();
  };
  send = () => {
    if (typeof window.almeidaSendOrder === 'function') return window.almeidaSendOrder();
    const button = $('#send');
    if (button) { button.disabled = true; button.textContent = 'Aguarde o acesso da conta'; }
  };
  $('#cart-button').onclick = openCart;
  $('#cart-items').onclick = event => { if (event.target.dataset.remove !== undefined) { cart.splice(Number(event.target.dataset.remove), 1); saveCart(); $('#cart-dialog').close(); render(); openCart(); } };
  $('#cart-items').onchange = event => { const raw = event.target.dataset.cartQuantity; if (raw === undefined) return; const index = Number(raw); if (!Number.isInteger(index) || !cart[index]) return; cart[index].qty = Math.max(1, Math.floor(Number(event.target.value) || 1)); saveCart(); $('#cart-dialog').close(); openCart(); };
  loadCatalogFromSupabase();
}

if (document.querySelector('#product-page-content')) {
  loadProductFromSupabase = async function () {
    try {
      const response = await fetch(ALMEIDA_SUPABASE_URL + '/rest/v1/products?active=eq.true&select=brand,name,subcategory,description,image_url,image_override_url,source_url,product_variants(id,name,price_cents,cash_price_cents,promo_price_cents,quantity_prices,active)&order=name.asc', { headers: { apikey: ALMEIDA_SUPABASE_KEY } });
      if (!response.ok) throw new Error('Catalog status ' + response.status);
      const remote = await response.json();
      const normalized = remote.map((product, id) => ({ id, marca: product.brand, nome: product.name, grupo: product.subcategory, descricao: product.description, imagem: product.image_override_url || localProductImage(product.brand, product.name, product.image_url), fonte: product.source_url, variacoes: (product.product_variants || []).filter(variant => variant.active).map(normalizedVariant) })).filter(product => product.variacoes.length);
      if (normalized.length) { produtos = normalized; renderProduct(); }
    } catch (error) { console.info('Detalhes locais usados enquanto o banco não está disponível.', error); }
  };
  const originalProductRender = renderProduct;
  renderProduct = () => {
    originalProductRender();
    const select = document.querySelector('#product-variant'), price = document.querySelector('#product-price');
    if (!select || !price) return;
    const quantityInput = document.querySelector('#product-quantity'), bulkNotice = document.querySelector('#product-bulk-notice');
    const update = () => { const quantity = Math.max(1, Math.floor(Number(quantityInput?.value) || 1)); if (quantityInput) quantityInput.value = quantity; const variant = produtos[productId].variacoes[Number(select.value)], data = priceData(variant, quantity); price.innerHTML = priceLabel(variant, quantity, false) + (data.tier ? `<small class="bulk-applied">Venda múltipla aplicada: cartão ${money(data.card)} · PIX/dinheiro ${money(data.effectiveCash)} por unidade</small>` : `<small>Preço no cartão: ${money(data.card)} em até 4x sem juros</small>`); if (bulkNotice) { const tiers = quantityTiers(variant); bulkNotice.innerHTML = tiers.length ? `${tiers.map(tier => `A partir de ${tier.min_quantity} unidades · cartão ${money(tier.card_price_cents)} · PIX/dinheiro ${money(tier.cash_price_cents)}`).join(' · ')}` : ''; bulkNotice.hidden = !tiers.length; } document.querySelector('.product-policy').textContent = data.tier ? `A quantidade selecionada ativou a venda múltipla a partir de ${data.tier.min_quantity} unidades.` : (data.promo ? 'Promoção aplicada no PIX/dinheiro. No cartão, o valor é recalculado proporcionalmente.' : 'Preço à vista definido pela loja. No cartão, o valor cheio é mantido.'); };
    select.onchange = update;
    quantityInput?.addEventListener('input', update);
    update();
  };
  loadProductFromSupabase();
}
