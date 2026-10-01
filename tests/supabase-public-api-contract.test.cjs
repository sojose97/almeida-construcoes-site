const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const pricing = fs.readFileSync('dist/pricing-storefront.js', 'utf8');
const product = fs.readFileSync('dist/produto.js', 'utf8');
const auth = fs.readFileSync('dist/auth-storefront.js', 'utf8');
const account = fs.readFileSync('dist/conta.js', 'utf8');
const site = fs.readFileSync('dist/site.js', 'utf8');

test('public catalog requests send the publishable key only as apikey', () => {
  assert.match(pricing, /headers:\s*\{\s*apikey:\s*ALMEIDA_SUPABASE_KEY\s*\}/);
  assert.doesNotMatch(pricing, /Authorization:\s*['"]Bearer ['"]\s*\+\s*ALMEIDA_SUPABASE_KEY/);
  assert.match(product, /headers:\s*\{\s*apikey:\s*ALMEIDA_SUPABASE_KEY\s*\}/);
  assert.doesNotMatch(product, /Authorization:\s*['"]Bearer ['"]\s*\+\s*ALMEIDA_SUPABASE_KEY/);
});

test('account REST requests attach Bearer only for a real signed-in access token', () => {
  for (const source of [auth, account]) {
    assert.match(source, /session\?\.access_token\s*\?\s*\{Authorization:/);
    assert.doesNotMatch(source, /session\?\.access_token\s*\|\|\s*ALMEIDA_SUPABASE_KEY/);
  }
});

test('the legacy page does not race the pricing-aware catalog request', () => {
  assert.doesNotMatch(site, /loadCatalogFromSupabase\(\);/);
});
