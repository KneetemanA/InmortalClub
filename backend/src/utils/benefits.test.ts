import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BenefitService } from '../services/benefit.service';
import { updateBenefitSchema } from '../validations/benefit.validation';

test('beneficios: edición y baja conservan relaciones y auditan; eliminación rechaza historial',async t=>{
  const module=require('../config/database');const original=module.default;t.after(()=>module.default=original);
  let used=true;let active=true;let exists=true;const changes:any[]=[];const audits:any[]=[];let deleted=0;
  const tx={benefit:{findUnique:async()=>exists?{id:'benefit',name:'LIFA',type:'LIFA',active,_count:{memberBenefits:used?1:0,appliedPayments:used?1:0}}:null,
    update:async({data}:any)=>{changes.push(data);active=data.active??active;return{id:'benefit',...data}},
    delete:async()=>{deleted++;return{id:'benefit'}}},auditLog:{create:async({data}:any)=>audits.push(data)}};
  module.default={$transaction:async(fn:any)=>fn(tx)};const service=new BenefitService();
  await service.updateBenefit('benefit',{name:'Convenio LIFA',discountPercentage:15},'admin');
  assert.equal(changes[0].type,undefined);assert.equal(audits[0].action,'UPDATE');
  await service.updateBenefit('benefit',{active:false},'admin');assert.equal(active,false);
  await assert.rejects(service.deleteBenefit('benefit','admin'),/socios o pagos/);assert.equal(deleted,0);
  await service.updateBenefit('benefit',{active:true},'admin');assert.equal(active,true);
  used=false;await service.deleteBenefit('benefit','admin');assert.equal(deleted,1);assert.equal(audits[audits.length-1].action,'DELETE');
  exists=false;await assert.rejects(service.updateBenefit('benefit',{active:false},'admin'),/no encontrado/);
});
test('beneficios: valida porcentaje, estado y cambios parciales',()=>{
  assert.equal(updateBenefitSchema.safeParse({discountPercentage:101}).success,false);
  assert.equal(updateBenefitSchema.safeParse({discountPercentage:0}).success,false);
  assert.equal(updateBenefitSchema.safeParse({active:'false'}).success,false);
  assert.equal(updateBenefitSchema.safeParse({}).success,false);
  assert.equal(updateBenefitSchema.safeParse({active:false}).success,true);
});
