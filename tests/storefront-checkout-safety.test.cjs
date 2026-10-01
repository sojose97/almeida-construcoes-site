const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const site = fs.readFileSync('dist/site.js', 'utf8');
const pricing = fs.readFileSync('dist/pricing-storefront.js', 'utf8');

test('checkout cannot fall back to a direct WhatsApp order outside the authenticated flow', () => {
  assert.doesNotMatch(site, /wa\.me\//);
  assert.doesNotMatch(pricing, /wa\.me\//);
  assert.match(pricing, /window\.almeidaSendOrder\(\)/);
});

test('account and order buttons do not show the old backend-disabled placeholder', () => {
  assert.doesNotMatch(site, /Cadastro, pedidos e cashback precisam do backend Supabase/);
  assert.doesNotMatch(site, /info\('Minha conta'\)|info\('Meus pedidos'\)/);
});

test('empty cart cleanup does not try to render a removed delivery-address field', () => {
  assert.match(site, /function address\(\)\{const fields=\$\('#address-fields'\);if\(!fields\)return;/);
});
