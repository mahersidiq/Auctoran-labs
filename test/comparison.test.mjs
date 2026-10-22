import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BENCHMARKS, buildComparison } from '../public/src/comparison.js';

const product = {
  servings: 25, labelVerified: false,
  formula: [
    { name: 'L-Citrulline', amountMg: 8000 },
    { name: 'Beta-Alanine', amountMg: 3200 },
    { name: 'Betaine Anhydrous', amountMg: 2500 }
  ]
};

test('homepage comparison claims come from the current product amounts', () => {
  const comparison = buildComparison(product);
  assert.deepEqual(comparison.advantages, { citrullineVsGhostPercent: 33, betaineVsC4Multiple: 2 });
  assert.equal(comparison.products[0].proposed, true);
  const changed = buildComparison({ ...product, formula: product.formula.map(f => ({ ...f, amountMg: f.amountMg / 2 })) });
  assert.deepEqual(changed.advantages, { citrullineVsGhostPercent: null, betaineVsC4Multiple: null });
});

test('comparison preserves the competitor maximum dose and missing-ingredient distinction', () => {
  const gorilla = BENCHMARKS.find(p => p.id === 'gorilla');
  assert.equal(gorilla.scoops, 2);
  assert.equal(gorilla.citrullineMg, 10000);
  assert.equal(gorilla.betaineMg, 4000);
  assert.equal(gorilla.betaAlanineMg, null);
  assert.equal(gorilla.dosesPerTub, 20);
  assert.equal(gorilla.smallerDose.dosesPerTub, 40);
  assert.ok(BENCHMARKS.every(p => p.productUrl.startsWith('https://') && p.labelUrl.startsWith('https://')));
});

test('missing or invalid public highlights do not create comparative wins', () => {
  for (const formula of [undefined, [], [{ name: 'L-Citrulline', amountMg: -1 }], [{ name: 'Betaine Anhydrous', amountMg: '2500' }]]) {
    const comparison = buildComparison({ formula });
    assert.deepEqual(comparison.advantages, { citrullineVsGhostPercent: null, betaineVsC4Multiple: null });
  }
});
