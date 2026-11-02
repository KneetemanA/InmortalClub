import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { FinancialService } from '../services/financial.service';

function fixture(t: TestContext) {
  const module = require('../config/database');
  const original = module.default;
  t.after(()=>{module.default=original});
  const payments = [{id:'p',finalAmount:'198500.00',paymentDate:new Date('2026-11-02T03:00:00Z'),member:{firstName:'Ana',lastName:'Prueba',dni:'123'},plan:{name:'Full Pass'},user:{id:'admin',name:'Admin'}}];
  const movements = [
    {id:'m1',categoryId:'cat-1',category:{name:'Extra'},type:'INCOME',amount:'100.50',description:'Venta de agua',movementDate:new Date('2026-11-02T04:00:00Z'),user:{id:'admin',name:'Admin'}},
    {id:'m2',categoryId:'cat-2',category:{name:'Extra'},type:'EXPENSE',amount:'20.25',description:'Compra de insumos',movementDate:new Date('2026-11-02T05:00:00Z'),user:{id:'admin',name:'Admin'}},
  ];
  const db={payment:{findMany:async (_args:any)=>payments},financialMovement:{findMany:async (args:any)=>movements.filter(m=>!args.where.categoryId||m.categoryId===args.where.categoryId)}};
  module.default=db;
  return db;
}
const start=new Date('2026-11-01T03:00:00Z'), end=new Date('2026-12-01T02:59:59.999Z');
test('desglose de cuotas y movimientos coincide con el resumen y selecciona usuarios sin contraseñas',async t=>{
  const db=fixture(t);
  const paymentQuery=t.mock.method(db.payment,'findMany',db.payment.findMany);
  const movementQuery=t.mock.method(db.financialMovement,'findMany',db.financialMovement.findMany);
  const summary=await new FinancialService().getFinancialSummary(start,end);
  assert.equal(summary.summary.totalIncome,198600.5);
  assert.equal(summary.summary.totalExpense,20.25);
  assert.equal(summary.summary.balance,198580.25);
  assert.equal(summary.payments.reduce((sum,p)=>sum+Number(p.finalAmount),0),summary.summary.membershipIncome);
  assert.deepEqual(summary.movements.map(m=>m.id),['m2','m1']);
  const categories=summary.byCategory as {categoryId:string;total:number;count:number}[];
  assert.equal(categories.length,3); // Nombres iguales no fusionan ingreso y egreso.
  assert.equal(categories.find(c=>c.categoryId==='MEMBERSHIP')!.count,1);
  assert.equal(categories.find(c=>c.categoryId==='cat-1')!.total,100.5);
  const query=paymentQuery.mock.calls[0].arguments[0];
  assert.deepEqual(query.where,{paymentDate:{gte:start,lte:end},status:'PAID'});
  assert.deepEqual(query.include.user,{select:{id:true,name:true}});
  assert.deepEqual(movementQuery.mock.calls[0].arguments[0].include.user,{select:{id:true,name:true}});
});
test('desglose respeta filtro de cuotas y filtro de categoría manual',async t=>{
  const db=fixture(t);
  const paymentQuery=t.mock.method(db.payment,'findMany',db.payment.findMany);
  const movementQuery=t.mock.method(db.financialMovement,'findMany',db.financialMovement.findMany);
  const service=new FinancialService();
  const membership=await service.getFinancialSummary(start,end,'MEMBERSHIP');
  assert.equal(membership.payments.length,1); assert.equal(membership.movements.length,0);
  assert.equal(movementQuery.mock.calls.length,0);
  const expenses=await service.getFinancialSummary(start,end,'cat-2');
  assert.equal(paymentQuery.mock.calls.length,1);
  assert.equal(expenses.payments.length,0); assert.equal(expenses.movements.length,1);
  assert.equal(expenses.summary.balance,-20.25);
});
