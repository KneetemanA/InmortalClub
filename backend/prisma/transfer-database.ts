import 'dotenv/config';
import { Prisma } from '@prisma/client';
import { Client, types } from 'pg';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// El orden respeta las claves foráneas. Nunca se escribe en PostgreSQL.
const names = ['Role', 'User', 'Plan', 'Benefit', 'Member', 'MemberBenefit', 'Payment', 'FinancialCategory', 'FinancialMovement', 'AuditLog'];
const models = names.map(name => Prisma.dmmf.datamodel.models.find(m => m.name === name)!);
const fields = (model: typeof models[number]) => model.fields.filter(f => f.kind !== 'object');
const shape = models.map(m => ({ name: m.name, table: m.dbName, fields: fields(m).map(f => [f.name, f.type, f.isRequired]) }));
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const quote = (s: string) => '"' + s.replace(/"/g, '""') + '"';
const stable = (v: any): any => Array.isArray(v) ? v.map(stable) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, stable(v[k])])) : v;
const delegate = (model: typeof models[number]) => model.name[0].toLowerCase() + model.name.slice(1);

function normalized(model: typeof models[number], rows: any[]) {
  return rows.map(row => Object.fromEntries(fields(model).map(f => {
    const value = row[f.name];
    return [f.name, value == null ? null : f.type === 'DateTime' ? new Date(value).toISOString()
      : f.type === 'Decimal' ? new Prisma.Decimal(String(value)).toFixed() : stable(value)];
  }))).sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

async function main() {
  const [command, file, flag] = process.argv.slice(2);
  if (!['export', 'import', 'verify'].includes(command) || !file || (flag && flag !== '--apply')) {
    throw new Error('Uso: npm run database:transfer -- export|import|verify archivo.json [--apply]');
  }
  if (command === 'export') {
    const source = process.env.SOURCE_DATABASE_URL;
    if (!source || !/^postgres(ql)?:/.test(source)) throw new Error('Configurá SOURCE_DATABASE_URL con la URL externa de Render.');
    // Prisma almacena DateTime de PostgreSQL como timestamp UTC sin zona.
    types.setTypeParser(1114, value => new Date(value.replace(' ', 'T') + 'Z'));
    const client = new Client({ connectionString: source, connectionTimeoutMillis: 15000 });
    try {
      await client.connect();
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const tables: Record<string, any[]> = {};
      for (const m of models) {
        const columns = await client.query('SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2', ['public', m.dbName]);
        const expected = fields(m).map(f => f.dbName || f.name).sort();
        if (JSON.stringify(columns.rows.map(r => r.column_name).sort()) !== JSON.stringify(expected)) {
          throw new Error(`El esquema de ${m.name} no coincide con esta versión. No se exportó el respaldo.`);
        }
        const result = await client.query(`SELECT ${fields(m).map(f => quote(f.dbName || f.name) + ' AS ' + quote(f.name)).join(', ')} FROM ${quote(m.dbName!)} ORDER BY id`);
        tables[m.name] = normalized(m, result.rows);
      }
      await client.query('COMMIT');
      const payload = { version: 1, schema: digest(shape), createdAt: new Date().toISOString(), tables };
      // wx evita sobrescribir un respaldo; no contiene URLs ni secretos de conexión.
      await writeFile(file, JSON.stringify({ ...payload, checksum: digest(payload) }), { flag: 'wx', mode: 0o600 });
      console.log('Exportación consistente creada. Contiene datos personales y hashes de contraseñas: guardala fuera de Git.');
      console.table(Object.fromEntries(models.map(m => [m.name, { total: tables[m.name].length }])));
    } finally { await client.end(); }
    return;
  }
  const { checksum, ...payload } = JSON.parse(await readFile(file, 'utf8'));
  if (payload.version !== 1 || payload.schema !== digest(shape) || checksum !== digest(payload)) throw new Error('Archivo incompatible o alterado.');
  for (const m of models) {
    const rows = payload.tables[m.name];
    if (!Array.isArray(rows) || new Set(rows.map((r: any) => r.id)).size !== rows.length
      || rows.some((r: any) => JSON.stringify(Object.keys(r).sort()) !== JSON.stringify(fields(m).map(f => f.name).sort()))) throw new Error(`Datos inválidos en ${m.name}.`);
  }
  const { default: prisma, closeDatabase } = await import('../src/config/database');
  try {
    const compare = async (tx: any) => {
      for (const m of models) {
        const actual = normalized(m, await tx[delegate(m)].findMany());
        if (digest(actual) !== digest(payload.tables[m.name])) throw new Error(`La verificación falló en ${m.name}.`);
      }
    };
    if (command === 'verify') {
      await prisma.$transaction(compare, { isolationLevel: 'RepeatableRead', timeout: 300000 });
      console.log('Verificación completa: todos los campos, importes, fechas, IDs e historiales coinciden con el respaldo.');
      return;
    }
    await prisma.$transaction(async tx => {
      for (const m of models) {
        if (await (tx as any)[delegate(m)].count()) throw new Error(`Destino no vacío (${m.name}). No se importó ningún dato.`);
      }
      console.table(Object.fromEntries(models.map(m => [m.name, { total: payload.tables[m.name].length }])));
      if (flag !== '--apply') { console.log('Simulación: destino vacío, sin cambios. Usá --apply para importar.'); return; }
      for (const m of models) {
        for (const row of payload.tables[m.name]) {
          const data = Object.fromEntries(fields(m).map(f => [f.name, f.type === 'DateTime' && row[f.name] != null ? new Date(row[f.name])
            : f.type === 'Json' && row[f.name] === null ? Prisma.DbNull : row[f.name]]));
          try { await (tx as any)[delegate(m)].create({ data }); }
          catch (error) {
            const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'VALIDACION';
            throw new Error(`No se pudo importar ${m.name} (${code}). Se revierte la transacción; revisar compatibilidad y relaciones del respaldo.`);
          }
        }
      }
      await compare(tx);
    }, { isolationLevel: 'Serializable', maxWait: 30000, timeout: 300000 });
    if (flag === '--apply') console.log('Importación confirmada después de verificar todos los registros.');
  } finally { await closeDatabase(); }
}
if (require.main === module) main().catch(error => { console.error(error instanceof Error ? error.message : 'Error de transferencia'); process.exitCode = 1; });

export { models, normalized, digest };
