import {test} from 'node:test';
import assert from 'node:assert/strict';
import {importFileSchema,importedMemberData} from './member-import';
import {importMembers} from '../services/member-import.service';
import {MemberService} from '../services/member.service';
import {AuditService} from '../services/audit.service';
import {memberExpiration} from './member-coverage';

const row={importKey:'sep26-row-2',sourceRow:2,firstName:'Ana',lastName:'Prueba',dni:'12345678',phone:'3446123456',birthDate:'1990-03-02',importedExpirationDate:'2026-10-04',notes:'Datos importados',sourceData:{method:'Transferencia',cashAmount:0,transferAmount:45000,birthDate:'02/03/1990',lastName:'Prueba',dni:'12345678',expirationDate:'04/10/2026',warnings:[]}};
const file=(rows=[row])=>({version:1,source:'Sep26',members:rows});

test('datos importados: conserva vencimiento argentino, no inventa DNI ni crea campos de pago/plan',()=>{
  const parsed=importFileSchema.parse(file());
  const data=importedMemberData({...parsed.members[0],dni:null,lastName:'',phone:''});
  assert.equal(data.dni,null); assert.equal(data.lastName,'');assert.equal(data.phone,'');
  assert.equal(data.importedExpirationDate?.toISOString(),'2026-10-05T02:59:59.999Z');
  assert.equal(data.birthDate?.toISOString(),'1990-03-02T15:00:00.000Z');
  for(const key of ['payments','benefits','currentPlanId','paymentDate'])assert.equal(key in data,false);
});
test('archivo: rechaza DNI y referencias duplicados, fechas inválidas y versiones desconocidas',()=>{
  assert.equal(importFileSchema.safeParse(file([row,{...row,importKey:'other',sourceRow:3}])).success,false);
  assert.equal(importFileSchema.safeParse(file([{...row,importedExpirationDate:'2026-02-30'}])).success,false);
  assert.equal(importFileSchema.safeParse({...file(),version:2}).success,false);
});
test('carga: simulación no escribe, ejecución no genera cobros y repetir no duplica ni sobrescribe',async t=>{
  const module=require('../config/database');const original=module.default;
  const stored:any[]=[];const audits:any[]=[];
  const db:any={member:{
    findMany:async ({where}:any)=>stored.filter(m=>where.OR.some((c:any)=>c.importKey?c.importKey.in.includes(m.importKey):c.dni.in.includes(m.dni))),
    createMany:async ({data}:any)=>{stored.push(...data);return {count:data.length};},
  },auditLog:{createMany:async ({data}:any)=>{audits.push(...data);return {count:data.length};}}};
  db.$transaction=async (callback:any)=>callback(db);
  module.default=db;t.after(()=>{module.default=original});
  const preview=await importMembers(file(),'admin');assert.equal(preview.wouldCreate,1);assert.equal(stored.length,0);
  const result=await importMembers(file(),'admin',true);assert.equal(result.created,1);assert.equal(audits.length,1);
  assert.equal('payments' in stored[0],false);
  stored[0].dni='87654321';stored[0].phone='corrected';
  const again=await importMembers(file(),'admin',true);assert.equal(again.skipped,1);assert.equal(stored.length,1);assert.equal(stored[0].phone,'corrected');
});
test('datos existentes con mismo DNI: se omiten y se informan, sin sobrescribir',async t=>{
  const module=require('../config/database');const original=module.default;
  module.default={member:{findMany:async()=>[{id:'existing',dni:row.dni,importKey:null}]}};t.after(()=>{module.default=original});
  const result=await importMembers(file(),'admin');assert.equal(result.skipped,1);assert.deepEqual(result.existingRows,[2]);assert.equal(result.wouldCreate,0);
});
test('vigencia: usa referencia importada, ignora cancelados y conserva una renovación posterior',()=>{
  const reference=new Date('2026-10-05T02:59:59.999Z');
  assert.equal(memberExpiration({importedExpirationDate:reference})?.getTime(),reference.getTime());
  const future=new Date('2026-11-01');
  assert.equal(memberExpiration({importedExpirationDate:reference,payments:[{status:'CANCELLED',expirationDate:future}]})?.getTime(),reference.getTime());
  assert.equal(memberExpiration({importedExpirationDate:reference,payments:[{status:'PAID',expirationDate:future}]})?.getTime(),future.getTime());
  assert.equal(memberExpiration({}),null);
});
test('completar plan y beneficio de importado guarda membresía sin generar pago',async t=>{
  const module=require('../config/database');const original=module.default;let saved:any;
  const db:any={member:{findUnique:async()=>({id:'member',importKey:'source',currentPlanId:null,payments:[],benefits:[]}),update:async ({data}:any)=>{saved=data;return {id:'member',...data};}},
    plan:{findUnique:async()=>({id:'plan',name:'Full Pass',active:true})},benefit:{findUnique:async()=>({id:'benefit',active:true,onlyFullPass:true})},memberBenefit:{updateMany:async()=>({count:0}),upsert:async()=>({id:'relation'})}};
  db.$transaction=async (callback:any)=>callback(db);module.default=db;t.after(()=>{module.default=original});
  t.mock.method(AuditService.prototype,'logAction',async()=>null);
  await new MemberService().updateMember('member',{currentPlanId:'plan',benefitId:'benefit',dni:null,phone:''},'admin');
  assert.equal(saved.currentPlanId,'plan');assert.equal(saved.dni,null);assert.equal('payments' in saved,false);
});
