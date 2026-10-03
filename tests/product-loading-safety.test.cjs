const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const script = fs.readFileSync('dist/produto.js', 'utf8');
const pricingStorefront = fs.readFileSync('dist/pricing-storefront.js', 'utf8');
const promotions = fs.readFileSync('dist/promotion-filter.js', 'utf8');

test('product details wait for the current Supabase catalog before enabling purchase', () => {
  const startup = script.slice(script.lastIndexOf('renderProductLoading();'));
  assert.match(startup, /renderProductLoading\(\);\s*if\(Number\.isSafeInteger\(productId\)&&productId>=0\)loadProductFromSupabase\(\)/);
  assert.doesNotMatch(startup, /^renderProduct\(\);/);
});

test('catalog failure shows a retry state instead of stale fallback product data', () => {
  assert.match(script, /function renderProductUnavailable\(\)[\s\S]*?role="alert"[\s\S]*?Não foi possível carregar os dados atualizados/);
  assert.match(script, /catch\(error\)\{console\.info\('Não foi possível carregar os dados atualizados do produto\.',error\);renderProductUnavailable\(\)\}/);
  assert.match(script, /addEventListener\('click',loadProductFromSupabase\)/);
});

test('catalog and promotion cards carry a stable product identity before and after catalog sync', () => {
  assert.match(promotions, /product_id=.*product_name=.*product_brand=/);
  assert.match(pricingStorefront, /select=id,brand,name,subcategory/);
  assert.match(pricingStorefront, /databaseId: product\.id/);
  assert.match(pricingStorefront, /stableId \? normalized\.findIndex\(product => product\.databaseId === stableId\)/);
  assert.match(pricingStorefront, /normalize\(product\.nome\) === normalize\(productName\).*normalize\(product\.marca\) === normalize\(productBrand\)/);
});

