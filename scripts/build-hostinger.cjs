const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const backend = path.join(root, 'backend');
const frontend = path.join(root, 'frontend');
const output = path.join(root, 'dist');

function run(command, args, cwd, env = process.env) {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

// Solo compila y empaqueta: no conecta ni modifica la base operativa.
run('npm', ['ci', '--include=dev'], backend);
// Prisma exige una URL para leer la configuración, aunque generate no conecta.
run('npx', ['prisma', 'generate', '--config', 'prisma7.config.ts'], backend, {
  ...process.env, DATABASE_URL: 'postgresql://build:build@localhost:5432/build',
});
run('npm', ['run', 'build'], backend);
run('npm', ['ci', '--include=dev'], frontend);
run('npm', ['run', 'build'], frontend);

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
fs.copyFileSync(path.join(root, 'app.cjs'), path.join(output, 'app.cjs'));
fs.copyFileSync(path.join(root, 'package.json'), path.join(output, 'package.json'));
for (const [from, to] of [
  [path.join(backend, 'dist'), path.join(output, 'backend', 'dist')],
  [path.join(backend, 'node_modules'), path.join(output, 'backend', 'node_modules')],
  [path.join(frontend, 'dist'), path.join(output, 'frontend', 'dist')],
]) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true, dereference: true });
}
console.log('Paquete Hostinger preparado en dist. Archivo de entrada: app.cjs');
