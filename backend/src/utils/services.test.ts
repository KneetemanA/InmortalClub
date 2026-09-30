import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { AuthService } from '../services/auth.service';
import { MemberService } from '../services/member.service';
import { PaymentService } from '../services/payment.service';
import { AuditService } from '../services/audit.service';
import { PaymentMethod } from '@prisma/client';

function mockDatabase(t: TestContext) {
  const module = require('../config/database');
  const original = module.default;
  const stub = async () => { throw new Error('Operación de persistencia inesperada'); };
  const db = {
    user: {findUnique:stub,create:stub}, role:{upsert:stub},
    plan:{findUnique:stub}, benefit:{findUnique:stub},
    member:{findUnique:stub,create:stub}, payment:{findFirst:stub,findUnique:stub,create:stub,update:stub},
  };
  module.default = db;
  t.after(() => { module.default = original; });
  return db as any;
}

// Tests de servicios con persistencia simulada. No conectan ni alteran una base real.
test('crear recepcionista sin rol previo: crea rol y devuelve usuario sin contraseña', async t => {
  const db = mockDatabase(t);
  t.mock.method(db.user, 'findUnique', async () => null);
  const role = t.mock.method(db.role, 'upsert', async (args: any) => ({id:'role-receptionist',name:args.create.name}));
  t.mock.method(db.user, 'create', async (args: any) => ({id:'new-user',...args.data,role:{name:'RECEPTIONIST'}}));
  const result = await new AuthService().register({name:'Recepción',email:'test@example.com',password:'test-password',roleName:'RECEPTIONIST'});
  assert.equal(role.mock.calls[0].arguments[0].create.name,'RECEPTIONIST');
  assert.equal(result.roleId,'role-receptionist');
  assert.equal('password' in result,false);
});

test('alta proporcional con beneficio y pago mixto: monto, desglose y vencimiento en un alta atómica', async t => {
  t.mock.timers.enable({apis:['Date'],now:new Date('2026-09-16T12:00:00-03:00')});
  const db = mockDatabase(t);
  t.mock.method(db.plan,'findUnique',async () => ({id:'plan',name:'Full Pass',price:55000}));
  t.mock.method(db.benefit,'findUnique',async () => ({id:'benefit',active:true,onlyFullPass:true,discountPercentage:10}));
  t.mock.method(AuditService.prototype,'logAction',async (_args: any) => null);
  const create = t.mock.method(db.member,'create',async (args: any) => ({id:'member',...args.data}));
  await new MemberService().createMember({firstName:'Ana',lastName:'Test',dni:'12345678',phone:'3446123456',planId:'plan',benefitId:'benefit',paymentMethod:PaymentMethod.MIXED,cashAmount:10000,prorated:true,userId:'admin'});
  const payment = create.mock.calls[0].arguments[0].data.payments.create;
  assert.equal(payment.finalAmount,24750);
  assert.equal(payment.priceOriginal,27500);
  assert.equal(payment.discountAmount,2750);
  assert.equal(payment.cashAmount,10000);
  assert.equal(payment.transferAmount,14750);
  assert.equal(payment.prorated,true);
  assert.equal(payment.expirationDate.toISOString(),'2026-10-01T02:59:59.999Z');
});

test('renovación usa precio vigente, conserva el vencimiento elegido y registra ambos importes', async t => {
  const db = mockDatabase(t);
  t.mock.method(db.payment,'findFirst',async () => ({planId:'plan',appliedBenefitId:null}));
  t.mock.method(db.member,'findUnique',async () => ({id:'member',status:'ACTIVE'}));
  t.mock.method(db.plan,'findUnique',async () => ({id:'plan',name:'Full Pass',price:55000}));
  t.mock.method(AuditService.prototype,'logAction',async (_args: any) => null);
  const create = t.mock.method(db.payment,'create',async (args: any) => ({id:'payment',...args.data}));
  const expirationDate = new Date('2026-11-01T02:59:59.999Z');
  await new PaymentService().renewPlan('member','admin',PaymentMethod.MIXED,20000,expirationDate);
  const payment = create.mock.calls[0].arguments[0].data;
  assert.equal(payment.finalAmount,55000);
  assert.equal(payment.cashAmount,20000);
  assert.equal(payment.transferAmount,35000);
  assert.equal(payment.expirationDate,expirationDate);
});

test('editar vencimiento registra auditoría y rechaza pagos cancelados', async t => {
  const db = mockDatabase(t);
  let status = 'PAID';
  t.mock.method(db.payment,'findUnique',async () => ({id:'payment',status,expirationDate:new Date('2026-09-01')}));
  const update = t.mock.method(db.payment,'update',async (args: any) => ({id:'payment',...args.data}));
  const audit = t.mock.method(AuditService.prototype,'logAction',async (_args: any) => null);
  const service = new PaymentService();
  await service.updateExpiration('payment',new Date('2026-09-30'),'admin');
  assert.equal(update.mock.calls.length,1);
  assert.equal(audit.mock.calls[0].arguments[0].action,'UPDATE');
  status = 'CANCELLED';
  await assert.rejects(service.updateExpiration('payment',new Date('2026-09-30'),'admin'));
  assert.equal(update.mock.calls.length,1);
});
