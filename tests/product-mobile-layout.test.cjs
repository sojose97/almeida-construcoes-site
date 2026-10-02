const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const css = fs.readFileSync('dist/style.css', 'utf8');
const productPage = fs.readFileSync('dist/produto.html', 'utf8');
const productScript = fs.readFileSync('dist/produto.js', 'utf8');
const serviceWorker = fs.readFileSync('dist/sw.js', 'utf8');

test('product page keeps the product image left and its details right on mobile', () => {
  assert.match(css, /@media\(max-width:760px\)\{\.product-page\{padding-inline:10px\}\.product-detail-page\{grid-template-columns:minmax\(0,\.78fr\) minmax\(0,1\.22fr\);gap:10px/);
  assert.match(css, /\.product-image\{max-height:none;padding:7px/);
  assert.match(css, /\.product-information section\{padding:9px/);
});

test('product page requests the new stylesheet and the PWA cache includes it', () => {
  assert.match(productPage, /style\.css\?v=31/);
  assert.match(productPage, /produto\.js\?v=30/);
  assert.match(serviceWorker, /style\.css\?v=31/);
  assert.match(serviceWorker, /produto\.js\?v=30/);
  assert.match(serviceWorker, /almeida-catalogo-v57/);
});

test('product details omit the generic intro but preserve descriptions entered for a product', () => {
  assert.match(productScript, /p\.descricao\?'<p class="product-description">'\+escapeHtml\(p\.descricao\)/);
  assert.doesNotMatch(productScript, /Produto '\+p\.marca\+' da categoria/);
});

test('mobile purchase controls appear before the benefits and usage cards', () => {
  assert.match(css, /\.product-content>\.field\{order:3\}\.product-content>#product-bulk-notice\{order:4\}\.product-content>#product-price\{order:5\}\.product-content>#product-add\{order:6\}/);
  assert.match(css, /\.product-content>\.product-information\{order:8\}/);
});

