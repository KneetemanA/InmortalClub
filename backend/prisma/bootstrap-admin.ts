import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

// Crea únicamente la cuenta inicial cuando el email aún no existe.
// No modifica contraseñas ni otros datos de una cuenta existente.
async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !email || !password || password.length < 6) {
    throw new Error('Configurá DATABASE_URL, ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 6 caracteres) en backend/.env');
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    await prisma.role.upsert({ where: { name: 'RECEPTIONIST' }, update: {}, create: { name: 'RECEPTIONIST' } });
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      console.log(`La cuenta ${email} ya existe. No se modificó su contraseña.`);
      return;
    }
    const role = await prisma.role.upsert({ where: { name: 'ADMIN' }, update: {}, create: { name: 'ADMIN' } });
    await prisma.user.create({ data: {
      name: process.env.ADMIN_NAME?.trim() || 'Administrador',
      email,
      password: await bcrypt.hash(password, 10),
      roleId: role.id,
      active: true,
    } });
    console.log(`Administrador ${email} creado. Ya podés iniciar sesión.`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
