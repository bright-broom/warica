import { strict as assert } from 'node:assert';
import test from 'node:test';
import { normalizeYenInput } from '../src/lib/input';
import { validateAmount } from '../src/lib/validation';

test('Japanese digits and correctly grouped pasted amounts are accepted exactly', () => {
  for (const value of ['１２，８００', '12,800', '１２８００', ' 12800 ']) {
    assert.equal(normalizeYenInput(value), '12800');
  }
  assert.equal(normalizeYenInput('1,000,000'), '1000000');
});
test('ambiguous separators and decimals are not silently changed into another amount', () => {
  for (const value of ['1,5', '12,80', '1.5', '１．５', '1000001', '-10']) {
    assert.equal(validateAmount(Number(normalizeYenInput(value))), false);
  }
});
