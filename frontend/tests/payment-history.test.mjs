import test from 'node:test';
import assert from 'node:assert/strict';
import { filterPayments } from '../src/payment-history.ts';
const base = { query:'', fromDate:'', toDate:'', dateField:'paymentDate', order:'date-desc' };
const payments = [
  { id:'a', member:{firstName:'Ángela',lastName:'Zárate',dni:null}, paymentDate:'2026-11-02T02:59:59.999Z', expirationDate:'2026-12-01T02:59:59.999Z', finalAmount:'9000' },
  { id:'b', member:{firstName:'Bruno',lastName:'Álvarez',dni:'1234'}, paymentDate:'2026-11-02T03:00:00.000Z', expirationDate:'2026-12-02T03:00:00.000Z', finalAmount:'10000' },
  { id:'c', member:{firstName:'Carla',lastName:'Pérez',dni:'5678'}, paymentDate:'2026-11-03T02:59:59.999Z', expirationDate:'2026-12-02T02:59:59.999Z', finalAmount:'500' },
];
const ids = options => filterPayments(payments,{...base,...options}).map(p=>p.id);
test('rango incluye todo el día argentino, límites abiertos y vencimiento independiente',()=>{
  assert.deepEqual(ids({fromDate:'2026-11-02',toDate:'2026-11-02'}),['c','b']);
  assert.deepEqual(ids({toDate:'2026-11-01'}),['a']);
  assert.deepEqual(ids({fromDate:'2026-11-02'}),['c','b']);
  assert.deepEqual(ids({dateField:'expirationDate',fromDate:'2026-12-01',toDate:'2026-12-01'}),['c']);
  assert.deepEqual(ids({fromDate:'2026-11-03',toDate:'2026-11-01'}),[]);
});
test('ordena importes numéricos y apellidos con acentos sin modificar el historial',()=>{
  assert.deepEqual(ids({order:'amount-desc'}),['b','a','c']);
  assert.deepEqual(ids({order:'amount-asc'}),['c','a','b']);
  assert.deepEqual(ids({order:'name-asc'}),['b','c','a']);
  assert.deepEqual(ids({order:'name-desc'}),['a','c','b']);
  assert.deepEqual(ids({order:'date-asc'}),['a','b','c']);
  assert.deepEqual(payments.map(p=>p.id),['a','b','c']);
});
test('combina búsqueda de nombre o DNI con rango de fechas',()=>{
  assert.deepEqual(ids({query:' angela zarate '}),['a']);
  assert.deepEqual(ids({query:'1234',fromDate:'2026-11-02'}),['b']);
  assert.deepEqual(ids({query:'1234',toDate:'2026-11-01'}),[]);
});
