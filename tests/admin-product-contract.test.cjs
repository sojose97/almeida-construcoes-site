const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const admin = fs.readFileSync('dist/admin.js', 'utf8');
const pricing = fs.readFileSync('dist/pricing-admin.js', 'utf8');

test('new product editor uses one sentinel across admin and pricing handlers', () => {
  const adminSentinel = admin.match(/id\s*:\s*['"](__new_product__)['"]/);
  const pricingSentinel = pricing.match(/newId\s*:\s*['"](__new_product__)['"]/);
  assert.ok(adminSentinel, 'base editor must expose its new-product sentinel');
  assert.ok(pricingSentinel, 'pricing handler must intercept the same new-product editor');
  assert.equal(adminSentinel[1], pricingSentinel[1]);
});

test('admin product editor persists separate prices and quantity tiers', () => {
  assert.match(pricing, /cash_price_cents/);
  assert.match(pricing, /promo_price_cents/);
  assert.match(pricing, /quantity_prices/);
  assert.match(pricing, /on_conflict=product_id,name/);
});
