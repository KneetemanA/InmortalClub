import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import prisma, { closeDatabase } from '../src/config/database';
import { importMembers } from '../src/services/member-import.service';

async function main() {
  const args=process.argv.slice(2);
  const fileIndex=args.indexOf('--file');
  if(fileIndex<0 || !args[fileIndex+1]) throw new Error('Uso: npm run members:import -- --file ruta.json [--apply]');
  const input=JSON.parse(await readFile(args[fileIndex+1],'utf8'));
  const email=process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if(!email || !process.env.DATABASE_URL)throw new Error('Configurá DATABASE_URL y ADMIN_EMAIL en backend/.env');
  const admin=await prisma.user.findUnique({where:{email},include:{role:true}});
  if(!admin?.active || admin.role.name!=='ADMIN')throw new Error('ADMIN_EMAIL debe corresponder a un administrador activo de esta base');
  const url=new URL(process.env.DATABASE_URL);
  console.log(`Destino: ${url.hostname}:${url.port || '5432'}${url.pathname}`);
  const apply=args.includes('--apply');
  console.log(apply?'Importación: crear socios sin pagos':'Simulación: no se modificarán datos');
  console.log(JSON.stringify(await importMembers(input,admin.id,apply),null,2));
}
main().catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1;}).finally(closeDatabase);
