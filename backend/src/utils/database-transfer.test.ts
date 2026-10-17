import test from 'node:test';
import assert from 'node:assert/strict';
import { models, normalized, digest } from '../../prisma/transfer-database';

test('transferencia: conserva decimales grandes, fechas UTC, JSON y campos nulos', () => {
  const model = models.find(m => m.name === 'Payment')!;
  const source = { id: 'p1', finalAmount: '123456789012345678901234567890.123456789012345678901234567890', paymentDate: '2026-10-01T02:59:59.999Z' };
  const normalizedRow = normalized(model, [source])[0];
  assert.equal(normalizedRow.finalAmount, source.finalAmount.replace(/0$/, ''));
  assert.equal(normalizedRow.paymentDate, source.paymentDate);
  assert.equal(normalizedRow.cancellationReason, null);
  const member = models.find(m => m.name === 'Member')!;
  assert.equal(digest(normalized(member, [{ id: 'm', importedData: { z: 1, a: [false, null, 'Ñ'] } }])),
    digest(normalized(member, [{ id: 'm', importedData: { a: [false, null, 'Ñ'], z: 1 } }])));
});

test('transferencia: comparación detecta alteraciones y tolera orden de filas', () => {
  const model = models.find(m => m.name === 'Payment')!;
  const original = [{ id: 'a', finalAmount: '10.000' }, { id: 'b', finalAmount: '20' }];
  assert.equal(digest(normalized(model, original)), digest(normalized(model, [...original].reverse())));
  assert.notEqual(digest(normalized(model, original)), digest(normalized(model, [{ id: 'a', finalAmount: '10.01' }, original[1]])));
});
