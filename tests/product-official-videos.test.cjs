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
    "'nobrecar|creamyx wax':{id:'cuPUgavf3TQ',channel:'Nobrecar'}",
    "'nobrecar|apc orange':{id:'6X44X21HhfY',channel:'Nobrecar'}",
    "'nobrecar|aroma':{id:'BI36RCoK1WI',channel:'Nobrecar'}",
    "'nobrecar|boina de espuma branca refino':{id:'_S71zFV6mjA',channel:'Nobrecar'}",
    "'nobrecar|boina de espuma laranja corte':{id:'_S71zFV6mjA',channel:'Nobrecar'}",
    "'nobrecar|boina la gold roto orbital':{id:'7HP_yo62ENU',channel:'Nobrecar'}",
    "'nobrecar|boina la hibrida rotativa':{id:'7HP_yo62ENU',channel:'Nobrecar'}",
    "'nobrecar|boina la hibrida roto orbital':{id:'7HP_yo62ENU',channel:'Nobrecar'}",
    "'nobrecar|carnauba plastic':{id:'wRLjY_zs2q4',channel:'Nobrecar'}",
    "'nobrecar|clay bar':{id:'-icC1gBvcL8',channel:'Nobrecar'}",
    "'nobrecar|couro premium':{id:'SIWEQpRjboo',channel:'Nobrecar'}",
    "'nobrecar|cristal flex':{id:'OxjBuRH05x8',channel:'Nobrecar'}",
    "'nobrecar|detail finish':{id:'Lj4QxTY0hmE',channel:'Nobrecar'}",
    "'nobrecar|dropper':{id:'8slQzct69Lc',channel:'Nobrecar'}",
    "'nobrecar|espuma aplicadora':{id:'sxrMoKEaJZA',channel:'Nobrecar'}",
    "'nobrecar|gel car':{id:'GNYAnQg4ghA',channel:'Nobrecar'}",
    "'nobrecar|graphene coating 9h':{id:'qtmgc9mpCyg',channel:'Nobrecar'}",
    "'nobrecar|green removedor':{id:'DzDXkfOffEM',channel:'Nobrecar'}",
    "'nobrecar|plastic protection':{id:'gWFagw8somg',channel:'Nobrecar'}",
    "'nobrecar|nc solution':{id:'XGM4M4qqUZc',channel:'Nobrecar'}",
    "'nobrecar|nc fast':{id:'o_9R01E3S1U',channel:'Nobrecar'}",
    "'nobrecar|nc technology':{id:'soivvbdcX2k',channel:'Nobrecar'}",
    "'nobrecar|metal polish':{id:'xxF5Hri_iZg',channel:'Nobrecar'}",
    "'nobrecar|remox':{id:'Is0i4iYrivI',channel:'Nobrecar'}",
    "'nobrecar|off road cleaner':{id:'L6-cXcm44BQ',channel:'Nobrecar'}",
    "'nobrecar|nc cut select':{id:'DHbk_jJEOdc',channel:'Nobrecar'}",
    "'nobrecar|nc polish select':{id:'DHbk_jJEOdc',channel:'Nobrecar'}",
    "'nobrecar|boina la gold rotativa':{id:'DHbk_jJEOdc',channel:'Nobrecar'}",
    "'nobrecar|synthetic coating 5h':{id:'YkCVAgx9BV8',channel:'Nobrecar'}",
    "'nobrecar|vision':{id:'ZNwS48pyJb4',channel:'Nobrecar'}",
    "'nobrecar|restored plastic':{id:'VH1f_nG1zbU',channel:'Nobrecar'}",
    "'nobrecar|super pretinho':{id:'jgxqzCP61zo',channel:'Nobrecar'}",
    "'nobrecar|shampoo camaleao':{id:'0CFeM8qMc8Y',channel:'Nobrecar'}",
    "'nobrecar|sm condicionador de pneus':{id:'mY7Eoz-Gld8',channel:'Nobrecar'}",
    "'nobrecar|tira cola':{id:'c2N-yZl25po',channel:'Nobrecar'}",
    "'nobrecar|visible glass':{id:'j4X9UYeebQE',channel:'Nobrecar'}",
    "'lincoln|hcf':{id:'m3lT0hi-Hj8',channel:'Lincoln Polidores'}",
    "'lincoln|hgf':{id:'u765QW5SuWY',channel:'Lincoln Polidores'}",
    "'lincoln|hpf':{id:'QmE-A1UQqtc',channel:'Lincoln Polidores'}",
    "'lincoln|boina de la ninja corte pesado':{id:'FFnado-77mo',channel:'Lincoln Polidores'}",
    "'lincoln|luva de lavagem verde premium':{id:'8cfRK0uA7Oc',channel:'Lincoln Polidores'}",
    "'adelbras|fita crepe amarela 765':{id:'kHCr8GPsvRI',channel:'Adelbras Fitas Adesivas'}",
    "'adelbras|fita crepe verde 766':{id:'kHCr8GPsvRI',channel:'Adelbras Fitas Adesivas'}",
    "'lincoln|boina pirulito com interface corte pesado':{id:'tc3kWx8HWGA',channel:'Lincoln Polidores'}",
    "'lincoln|boina espuma corte laranja':{id:'tc3kWx8HWGA',channel:'Lincoln Polidores'}"
  ];
  for (const entry of expected) assert.ok(productScript.includes(entry), entry);
  assert.equal(expected.length, 48);
  assert.doesNotMatch(productScript, /'nobrecar\\|plp':/);
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
  assert.ok(productPage.includes('style.css?v=32'));
  assert.ok(productPage.includes('produto.js?v=31'));
  assert.ok(serviceWorker.includes("const CACHE='almeida-catalogo-v62'"));
  assert.ok(serviceWorker.includes("'style.css?v=32'"));
  assert.ok(serviceWorker.includes("'produto.js?v=31'"));
});

