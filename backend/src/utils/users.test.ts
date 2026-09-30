import { test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { AuthService } from '../services/auth.service';
import { updateUserSchema } from '../validations/auth.validation';

function setup(t: any, role = 'RECEPTIONIST', history = false, admins = 2) {
  const database = require('../config/database'); const original = database.default;
  const audits: any[] = []; const changes: any[] = []; const deletes: any[] = [];
  const user = {id:'target',name:'Equipo',email:'equipo@example.com',active:true,roleId:'role',role:{id:'role',name:role},createdAt:new Date()};
  const tx = {
    user:{findUnique:async ({select}:any)=>select._count?{_count:{payments:history?1:0,financialMovements:0,auditLogs:0}}:user,
      count:async()=>admins,update:async ({data}:any)=>{changes.push(data);return {...user,...data,password:undefined}},delete:async (args:any)=>{deletes.push(args);return user}},
    role:{upsert:async()=>({id:'new-role'})},auditLog:{create:async ({data}:any)=>{audits.push(data);return data}},
  };
  database.default={$transaction:async (fn:any,options:any)=>{assert.equal(options.isolationLevel,'Serializable');return fn(tx)}};
  t.after(()=>{database.default=original});return {audits,changes,deletes};
}

test('editar usuario y restablecer contraseña: hash sin secretos en auditoría',async t=>{
  const {audits,changes}=setup(t);const service=new AuthService();
  await service.updateUser('target',{name:'Nombre nuevo',active:false},'actor');
  assert.equal(changes[0].password,undefined);assert.equal(changes[0].active,false);
  const password='clave-nueva-123';await service.updateUser('target',{password,roleName:'ADMIN'},'actor');
  assert.equal(await bcrypt.compare(password,changes[1].password),true);assert.equal(changes[1].roleId,'new-role');
  assert.equal(audits[1].newData.passwordChanged,true);
  assert.ok(!JSON.stringify(audits).includes(changes[1].password));assert.ok(!JSON.stringify(audits).includes(password));
});
test('protege cuenta propia y último administrador activo',async t=>{
  const {changes,deletes}=setup(t,'ADMIN',false,1);const service=new AuthService();
  await assert.rejects(service.deleteUser('target','target'),/propia cuenta/);
  await assert.rejects(service.updateUser('target',{active:false},'target'),/propia cuenta/);
  await assert.rejects(service.updateUser('target',{roleName:'RECEPTIONIST'},'target'),/propia cuenta/);
  await assert.rejects(service.deleteUser('target','actor'),/administrador activo/);
  await assert.rejects(service.updateUser('target',{active:false},'actor'),/administrador activo/);
  assert.equal(changes.length,0);assert.equal(deletes.length,0);
});
test('elimina cuenta sin operaciones y registra auditoría',async t=>{
  const {audits,deletes}=setup(t);await new AuthService().deleteUser('target','actor');
  assert.equal(deletes.length,1);assert.equal(audits[0].action,'DELETE');assert.equal(audits[0].userId,'actor');
});
test('impide borrar historial pero permite desactivar la cuenta',async t=>{
  const {changes,deletes}=setup(t,'RECEPTIONIST',true);const service=new AuthService();
  await assert.rejects(service.deleteUser('target','actor'),/historial/);
  await service.updateUser('target',{active:false},'actor');assert.equal(changes[0].active,false);assert.equal(deletes.length,0);
});
test('validación usuarios: rechaza rol inválido, contraseña corta y edición vacía',()=>{
  assert.equal(updateUserSchema.safeParse({roleName:'SOCIO'}).success,false);
  assert.equal(updateUserSchema.safeParse({password:'123'}).success,false);
  assert.equal(updateUserSchema.safeParse({}).success,false);
  assert.equal(updateUserSchema.parse({email:' TEST@EXAMPLE.COM '}).email,'test@example.com');
});
