import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { AuthService } from '../services/auth.service';
import { PaymentService } from '../services/payment.service';
import { MemberService } from '../services/member.service';
import paymentRoutes from '../routes/payment.routes';
import memberRoutes from '../routes/member.routes';
import financialRoutes from '../routes/financial.routes';
import dashboardRoutes from '../routes/dashboard.routes';
import auditRoutes from '../routes/audit.routes';
import authRoutes from '../routes/auth.routes';
import planRoutes from '../routes/plan.routes';
import benefitRoutes from '../routes/benefit.routes';

// Requests HTTP reales; usuarios y persistencia simulados, sin base operativa.
test('permisos HTTP: recepción opera socios/pagos; solo admin modifica o elimina pagos', async t => {
  const database = require('../config/database');
  const original = database.default;
  database.default = { user: {findUnique:async ({where}: any) => ({id:where.id,name:'Prueba',email:'test@example.com',active:true,roleId:'role',role:{name:where.id==='admin'?'ADMIN':'RECEPTIONIST'}})} };
  t.after(() => {database.default=original});
  // Aunque el token diga ADMIN, se usa el rol vigente de la cuenta.
  t.mock.method(AuthService.prototype,'verifyToken',(token: string) => ({id:token,roleName:'ADMIN'}));
  const deletion = t.mock.method(PaymentService.prototype,'deletePayment',async () => ({id:'deleted'}));
  const edit = t.mock.method(PaymentService.prototype,'updateExpiration',async () => ({} as any));
  t.mock.method(PaymentService.prototype,'createPayment',async () => ({} as any));
  t.mock.method(PaymentService.prototype,'renewPlan',async () => ({} as any));
  t.mock.method(PaymentService.prototype,'getPayments',async () => []);
  t.mock.method(MemberService.prototype,'getActiveMembers',async () => []);
  const app = express(); app.use(express.json());
  app.use('/payments',paymentRoutes); app.use('/members',memberRoutes);
  app.use('/financial',financialRoutes); app.use('/dashboard',dashboardRoutes);
  app.use('/audit',auditRoutes); app.use('/auth',authRoutes);
  app.use('/plans',planRoutes); app.use('/benefits',benefitRoutes);
  const server = app.listen(0,'127.0.0.1');
  await new Promise<void>(resolve => server.once('listening',resolve));
  t.after(() => new Promise<void>((resolve,reject) => server.close(err => err?reject(err):resolve())));
  const address = server.address() as {port:number};
  const id='11111111-1111-4111-8111-111111111111';
  async function request(method: string, path: string, user?: string, body?: object) {
    return fetch(`http://127.0.0.1:${address.port}${path}`,{method,headers:{'Content-Type':'application/json',...(user?{Authorization:`Bearer ${user}`}:{})},...(body && method!=='GET'?{body:JSON.stringify(body)}:{})});
  }
  for (const [method,path] of [
    ['DELETE',`/payments/${id}`],['PATCH',`/payments/${id}/expiration`],['PATCH',`/payments/${id}/cancel`],
    ['GET','/financial/summary'],['POST','/financial/income'],['GET','/dashboard'],['GET','/audit'],
    ['GET','/auth/users'],['POST','/auth/register'],['POST','/plans'],['POST','/benefits'],
  ]) {
    assert.equal((await request(method,path,'receptionist',{})).status,403,`${method} ${path}`);
  }
  assert.equal(deletion.mock.calls.length,0); assert.equal(edit.mock.calls.length,0);
  assert.equal((await request('DELETE',`/payments/${id}`)).status,401);
  assert.equal((await request('DELETE',`/payments/${id}`,'admin')).status,200);
  assert.equal((await request('PATCH',`/payments/${id}/expiration`,'admin',{expirationDate:'2026-10-30'})).status,200);
  assert.equal(deletion.mock.calls.length,1); assert.equal(edit.mock.calls.length,1);
  assert.equal((await request('GET','/members','receptionist')).status,200);
  assert.equal((await request('GET','/payments','receptionist')).status,200);
  assert.equal((await request('POST','/payments','receptionist',{memberId:id,planId:id,paymentMethod:'CASH'})).status,201);
  assert.equal((await request('POST',`/payments/${id}/renew`,'receptionist',{paymentMethod:'TRANSFER'})).status,200);
});
