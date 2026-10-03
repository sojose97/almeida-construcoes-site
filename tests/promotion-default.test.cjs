const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const promotionFilter = fs.readFileSync('dist/promotion-filter.js', 'utf8');
const index = fs.readFileSync('dist/index.html', 'utf8');
const serviceWorker = fs.readFileSync('dist/sw.js', 'utf8');

function loadPromotionFilter(fallbackProducts) {
  const nodes = Object.fromEntries(['#grid', '#filters', '#result-count', '#cart-count'].map(selector => [selector, { innerHTML: '', textContent: '' }]));
  const context = {
    document: { querySelector: selector => selector === '#grid' ? nodes[selector] : null },
    $: selector => nodes[selector],
    esc: value => String(value ?? ''),
    cardPrice: () => 'price',
    priceData: variant => ({ promo: variant.promo_preco, cash: variant.cash_preco }),
    AlmeidaImageCleanup: { watch() {} },
    cart: [],
    produtos: fallbackProducts
  };
  vm.createContext(context);
  vm.runInContext(`let group='Todos', query='', render=()=>{}, produtosSeed=produtos;`, context);
  vm.runInContext(promotionFilter, context);
  return { context, nodes };
}

test('promotion is the first selected tab on every page load and remains selected after catalog hydration', () => {
  const { context, nodes } = loadPromotionFilter([
    { id: 'fallback', marca: 'Marca', nome: 'Catálogo local', grupo: 'Tintas', variacoes: [{ nome: 'Padrão', promo_preco: 0, cash_preco: 100 }] }
  ]);
  assert.match(nodes['#filters'].innerHTML, /^<button class="active promotion-tab" data-group="Promoção">/);

  vm.runInContext(`produtos=[
    {id:'sale',marca:'Marca',nome:'Em promoção',grupo:'Tintas',variacoes:[{nome:'Padrão',promo_preco:80,cash_preco:100}]},
    {id:'regular',marca:'Marca',nome:'Preço normal',grupo:'Tintas',variacoes:[{nome:'Padrão',promo_preco:0,cash_preco:100}]}
  ]; render();`, context);

  assert.match(nodes['#filters'].innerHTML, /^<button class="active promotion-tab" data-group="Promoção">/);
  assert.match(nodes['#grid'].innerHTML, /Em promoção/);
  assert.doesNotMatch(nodes['#grid'].innerHTML, /Preço normal/);
});

test('PWA cache and page reference the same current promotion-filter script', () => {
  const version = index.match(/promotion-filter\.js\?v=(\d+)/)?.[1];
  assert.equal(version, '4');
  assert.match(serviceWorker, new RegExp(`promotion-filter\\.js\\?v=${version}(?=['"])`));
  assert.match(serviceWorker, /almeida-catalogo-v64/);
});

