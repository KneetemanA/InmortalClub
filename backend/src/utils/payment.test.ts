import { test } from 'node:test';
import assert from 'node:assert/strict';
import { argentinaDate, monthRange, proratedMonth, splitPayment } from './payment';
import { createPaymentSchema, renewPlanSchema, updateExpirationSchema } from '../validations/payment.validation';
import { updateMemberSchema } from '../validations/member.validation';

test('proporcional: meses de 30 y 31 días, febrero bisiesto y último día incluido', () => {
  assert.equal(proratedMonth(55000, new Date('2026-09-16T12:00:00-03:00')).amount, 27500);
  assert.equal(proratedMonth(55000, new Date('2026-09-29T12:00:00-03:00')).amount, 3666.67);
  assert.equal(proratedMonth(49000, new Date('2026-10-31T12:00:00-03:00')).amount, 1580.65);
  assert.equal(proratedMonth(29000, new Date('2028-02-16T12:00:00-03:00')).amount, 14000);
  assert.equal(proratedMonth(55000, new Date('2026-09-16T12:00:00-03:00')).expirationDate.toISOString(), '2026-10-01T02:59:59.999Z');
  assert.throws(() => proratedMonth(55000, new Date('2026-09-15T12:00:00-03:00')));
});
test('Argentina: cambio de día y límites mensuales', () => {
  assert.deepEqual(argentinaDate(new Date('2026-10-01T02:00:00Z')), {year:2026,month:9,day:30});
  assert.equal(monthRange('2026-09').end.toISOString(), '2026-10-01T03:00:00.000Z');
  assert.throws(() => monthRange('2026-13'));
});
test('pagos: reparto exacto en centavos y rechazo de divisiones inválidas', () => {
  assert.deepEqual(splitPayment(55000,'MIXED',20000), {cashAmount:20000,transferAmount:35000});
  assert.deepEqual(splitPayment(3666.67,'MIXED',1000), {cashAmount:1000,transferAmount:2666.67});
  assert.deepEqual(splitPayment(50000,'CASH'), {cashAmount:50000,transferAmount:0});
  assert.deepEqual(splitPayment(49000,'TRANSFER'), {cashAmount:0,transferAmount:49000});
  for (const cash of [undefined,0,-1,55000,60000,NaN,Infinity]) assert.throws(() => splitPayment(55000,'MIXED',cash));
});
test('fechas: rechaza fechas inexistentes y guarda fin del día argentino', () => {
  assert.equal(updateExpirationSchema.parse({expirationDate:'2026-09-30'}).expirationDate.toISOString(), '2026-10-01T02:59:59.999Z');
  for (const expirationDate of ['2026-02-30','invalid','']) assert.equal(updateExpirationSchema.safeParse({expirationDate}).success,false);
  assert.equal(renewPlanSchema.parse({paymentMethod:'MIXED',cashAmount:'20000'}).cashAmount,20000);
  assert.equal(createPaymentSchema.safeParse({memberId:'bad',planId:'bad',paymentMethod:'CASH'}).success,false);
});
test('edición: permite DNI y borrar campos opcionales', () => {
  assert.deepEqual(updateMemberSchema.parse({dni:'12345678',email:'',birthDate:''}), {dni:'12345678',email:'',birthDate:null});
  assert.equal(updateMemberSchema.safeParse({dni:'123'}).success,false);
});
