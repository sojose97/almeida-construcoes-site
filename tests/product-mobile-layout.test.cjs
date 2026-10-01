const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const css = fs.readFileSync('dist/style.css', 'utf8');
const productPage = fs.readFileSync('dist/produto.html', 'utf8');
const serviceWorker = fs.readFileSync('dist/sw.js', 'utf8');

test('product page keeps the product image left and its details right on mobile', () => {
  assert.match(css, /@media\(max-width:760px\)\{\.product-page\{padding-inline:10px\}\.product-detail-page\{grid-template-columns:minmax\(0,\.78fr\) minmax\(0,1\.22fr\);gap:10px/);
  assert.match(css, /\.product-image\{max-height:none;padding:7px/);
  assert.match(css, /\.product-information section\{padding:9px/);
});

test('product page requests the new stylesheet and the PWA cache includes it', () => {
  assert.match(productPage, /style\.css\?v=29/);
  assert.match(serviceWorker, /style\.css\?v=29/);
  assert.match(serviceWorker, /almeida-catalogo-v54/);
});
