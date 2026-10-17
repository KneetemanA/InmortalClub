import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { env } from './env';

const url = new URL(env.DATABASE_URL);
if (url.protocol !== 'mysql:') throw new Error('DATABASE_URL debe usar mysql:// para Hostinger');
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: decodeURIComponent(url.pathname.slice(1)),
  connectionLimit: 5,
  timezone: 'Z',
});
const prisma = new PrismaClient({ adapter });
export async function closeDatabase() { await prisma.$disconnect(); }
export default prisma;
