import { strict as assert } from 'node:assert';
import test from 'node:test';
import { normalizeYenInput } from '../../src/lib/domain/input';
import { validateAmount } from '../../src/lib/domain/validation';

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

test('only plain decimal digits become an amount (WAR-001)', async () => {
  const { parseYenAmount } = await import('../../src/lib/domain/input');
  for (const value of [
    '1e3',
    '0x10',
    '0b11',
    '0o7',
    '+100',
    '-100',
    '1.5',
    '1 000',
    'Infinity',
    '',
    ' ',
  ]) {
    assert.equal(parseYenAmount(value), null, value);
  }
  assert.equal(parseYenAmount('１２，８００'), 12800);
  assert.equal(parseYenAmount('3000'), 3000);
  assert.equal(parseYenAmount('007'), 7);
});

test('very long pastes are truncated so the draft can always be restored (WAR-002)', async () => {
  const { MAX_AMOUNT_INPUT_LENGTH } = await import('../../src/lib/domain/input');
  assert.equal(normalizeYenInput('9'.repeat(10_001)).length, MAX_AMOUNT_INPUT_LENGTH);
});
