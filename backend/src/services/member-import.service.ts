import prisma from '../config/database';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { importedMemberData, importFileSchema } from '../utils/member-import';

export async function importMembers(input: unknown, userId: string, apply = false) {
  const file=importFileSchema.parse(input);
  async function run(db: Prisma.TransactionClient, write: boolean) {
    const keys=file.members.map(row=>row.importKey);
    const dni=file.members.flatMap(row=>row.dni?[row.dni]:[]);
    const existing=await db.member.findMany({where:{OR:[{importKey:{in:keys}},...(dni.length?[{dni:{in:dni}}]:[])]},select:{importKey:true,dni:true}});
    const existingKeys=new Set(existing.flatMap(m=>m.importKey?[m.importKey]:[]));
    const existingDni=new Set(existing.flatMap(m=>m.dni?[m.dni]:[]));
    const omitted=file.members.filter(row=>existingKeys.has(row.importKey) || row.dni && existingDni.has(row.dni));
    const pending=file.members.filter(row=>!existingKeys.has(row.importKey) && !(row.dni && existingDni.has(row.dni)));
    const result={total:file.members.length,created:0,wouldCreate:pending.length,skipped:omitted.length,existingRows:omitted.map(row=>row.sourceRow)};
    if(!write || !pending.length)return result;
    // Dos escrituras en lote: evita cientos de viajes a la base remota.
    const records=pending.map(row=>({id:randomUUID(),...importedMemberData(row)}));
    await db.member.createMany({data:records});
    await db.auditLog.createMany({data:records.map((member,i)=>({userId,action:'CREATE' as const,entity:'MEMBER',entityId:member.id,
      newData:{source:file.source,sourceRow:pending[i].sourceRow,importKey:member.importKey,withoutPayment:true}}))});
    result.created=records.length;
    return result;
  }
  // El lote completo y su auditoría se confirman juntos. Nunca crea pagos.
  return apply ? prisma.$transaction(tx=>run(tx,true),{timeout:60000}) : run(prisma,false);
}
