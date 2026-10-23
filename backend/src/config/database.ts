import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import mariadb, { type Connection } from 'mariadb';
import { databaseErrorDetails } from '../utils/database-diagnostic';
import { env } from './env';

const url = new URL(env.DATABASE_URL);
if (url.protocol !== 'mysql:') throw new Error('DATABASE_URL debe usar mysql:// para Hostinger');
const databaseOptions = {
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: decodeURIComponent(url.pathname.slice(1)),
  timezone: 'Z',
};
const adapter = new PrismaMariaDb({ ...databaseOptions, connectionLimit: 5 });
const prisma = new PrismaClient({ adapter });
// Una conexión directa revela la causa que puede ocultar el timeout del pool.
// Solo SELECT 1; nunca imprime URL, contraseña ni mensajes crudos del driver.
export async function diagnoseDatabaseConnection() {
  const destination = { host: databaseOptions.host, port: databaseOptions.port,
    database: databaseOptions.database, user: databaseOptions.user,
    passwordConfigured: Boolean(databaseOptions.password) };
  let connection: Connection | undefined;
  try {
    connection = await mariadb.createConnection({ ...databaseOptions, connectTimeout: 5000, socketTimeout: 5000 });
    await connection.query('SELECT 1');
    console.info('[MYSQL_OK]', destination);
    return true;
  } catch (error) {
    console.error('[MYSQL_ERROR_CONEXION]', { ...destination, ...databaseErrorDetails(error) });
    return false;
  } finally {
    if (connection) {
      try { await connection.end(); }
      catch (error) { console.error('[MYSQL_ERROR_CIERRE]', databaseErrorDetails(error)); }
    }
  }
}
export async function closeDatabase() { await prisma.$disconnect(); }
export default prisma;
