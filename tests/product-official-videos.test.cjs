const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const productScript = fs.readFileSync('dist/produto.js', 'utf8');
const productPage = fs.readFileSync('dist/produto.html', 'utf8');
const css = fs.readFileSync('dist/style.css', 'utf8');
const serviceWorker = fs.readFileSync('dist/sw.js', 'utf8');

test('only verified official brand videos are mapped to matching products', () => {
  const expected = [
    "'nobrecar|viper':{id:'o9LbABOuOuI',channel:'Nobrecar'}",
    "'nobrecar|feroz':{id:'pBxAHFD9Cjs',channel:'Nobrecar'}",
    "'nobrecar|ceramic coating 7h':{id:'uOKh6Kw0Ldw',channel:'Nobrecar'}",
    "'lincoln|hpf':{id:'QmE-A1UQqtc',channel:'Lincoln Polidores'}",
    "'adelbras|fita crepe amarela 765':{id:'kHCr8GPsvRI',channel:'Adelbras Fitas Adesivas'}",
    "'adelbras|fita crepe verde 766':{id:'kHCr8GPsvRI',channel:'Adelbras Fitas Adesivas'}"
  ];
  for (const entry of expected) assert.ok(productScript.includes(entry), entry);
  assert.doesNotMatch(productScript, /Artwax|By Deni|youtube.com\/embed/);
});

test('official video is lazy, privacy-enhanced, and omitted when no verified match exists', () => {
  assert.ok(productScript.includes('function renderOfficialProductVideo(product)'));
  assert.ok(productScript.includes('if(!video||!/^[A-Za-z0-9_-]{11}$/.test(video.id))return'));
  assert.ok(productScript.includes('https://www.youtube-nocookie.com/embed/'));
  assert.ok(productScript.includes('loading="lazy" referrerpolicy="strict-origin-when-cross-origin"'));
  const add = productScript.indexOf('id="product-add"');
  const embed = productScript.indexOf("'+videoSection+'");
  const info = productScript.indexOf('class="product-information"');
  assert.ok(add >= 0 && embed > add && info >= 0);
});

test('video follows add-to-cart and precedes product information at every viewport', () => {
  assert.ok(css.includes('.product-content{display:flex;flex-direction:column}'));
  assert.ok(css.includes('.product-content>#product-add{order:6}'));
  assert.ok(css.includes('.product-content>.product-video{order:7}'));
  assert.ok(css.includes('.product-content>.product-information{order:9}'));
  assert.ok(css.includes('.product-video-frame{width:100%;aspect-ratio:16/9'));
  assert.ok(css.includes('.product-video-frame iframe{display:block;width:100%;height:100%;border:0}'));
});

test('product HTML and service-worker cache use matching updated asset versions', () => {
  assert.ok(productPage.includes('style.css?v=31'));
  assert.ok(productPage.includes('produto.js?v=29'));
  assert.ok(serviceWorker.includes("const CACHE='almeida-catalogo-v56'"));
  assert.ok(serviceWorker.includes("'style.css?v=31'"));
  assert.ok(serviceWorker.includes("'produto.js?v=29'"));
});
