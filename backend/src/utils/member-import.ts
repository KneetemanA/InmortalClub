import { z } from 'zod';
export const importFileSchema = z.object({
  version: z.literal(1), source: z.string().min(1), members: z.array(z.object({
    importKey:z.string().min(1), sourceRow:z.number().int().positive(),
    firstName:z.string().min(1), lastName:z.string(), dni:z.string().regex(/^\d{7,8}$/).nullable(),
    phone:z.string(), birthDate:z.iso.date().nullable(), importedExpirationDate:z.iso.date().nullable(), notes:z.string(),
    sourceData:z.object({method:z.string(),cashAmount:z.number().nonnegative(),transferAmount:z.number().nonnegative(),
      birthDate:z.string(),lastName:z.string(),dni:z.string(),expirationDate:z.string(),warnings:z.array(z.string())}),
  })).min(1).max(5000),
}).superRefine((data, ctx) => {
  const keys=new Set<string>(); const ids=new Set<string>();
  for(const member of data.members) {
    if(keys.has(member.importKey) || member.dni && ids.has(member.dni)) ctx.addIssue({code:'custom',message:`Registro duplicado en fila ${member.sourceRow}`});
    keys.add(member.importKey); if(member.dni)ids.add(member.dni);
  }
});
export type MemberImportFile = z.infer<typeof importFileSchema>;
export function importedMemberData(row: MemberImportFile['members'][number]) {
  return {
    firstName:row.firstName,lastName:row.lastName,dni:row.dni,phone:row.phone,
    birthDate:row.birthDate ? new Date(`${row.birthDate}T12:00:00-03:00`) : null,
    importedExpirationDate:row.importedExpirationDate ? new Date(`${row.importedExpirationDate}T23:59:59.999-03:00`) : null,
    importKey:row.importKey,importedData:row.sourceData,notes:row.notes,status:'ACTIVE' as const,
  };
}
