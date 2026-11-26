import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const privateDir = join(root, '.secret', 'prod-ensayo');
const envFile = join(privateDir, 'connection.env');
const project = 'ljxbkfvtbbucakkvdzmr';
const prefix = 'PROD_ENSAYO_';
const services = ['AUTH', 'CORE', 'CMS'];
const required = [...services.flatMap(s => [s + '_DB_USERNAME', s + '_DB_PASSWORD']), 'PUBLIC_KEY', 'STORAGE_KEY'].map(s => prefix + s);
const fail = message => { throw new Error(message); };

function classifyKey(value) {
  if (value.startsWith('sb_publishable_')) return 'public';
  if (value.startsWith('sb_secret_')) return 'secret';
  try {
    const parts = value.split('.');
    if (parts.length !== 3) return 'invalid';
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (payload.ref !== project) return 'other-project';
    return payload.role === 'anon' ? 'public' : payload.role === 'service_role' ? 'secret' : 'invalid';
  } catch { return 'invalid'; }
}

function validateConfig(env) {
  const missing = required.filter(k => !env[k]?.trim());
  if (missing.length) fail('Variables pendientes: ' + missing.join(', '));
  const users = services.map(s => env[prefix + s + '_DB_USERNAME']);
  if (users.some(u => !u.endsWith('.' + project) || /^(postgres|supabase_admin|service_role|anon|authenticated)\./i.test(u))) {
    fail('Las identidades JDBC deben ser cuentas técnicas autorizadas del nuevo proyecto, no administrativas.');
  }
  if (new Set(users).size !== users.length) fail('Se requieren tres identidades JDBC independientes.');
  if (classifyKey(env[prefix+'PUBLIC_KEY']) !== 'public') fail('La clave de frontend no tiene un formato público válido.');
  if (classifyKey(env[prefix+'STORAGE_KEY']) !== 'secret') fail('La clave de Storage no tiene un formato de backend válido.');
  if (env[prefix+'PUBLIC_KEY'] === env[prefix+'STORAGE_KEY']) fail('Las claves pública y de backend deben ser distintas.');
}

try {
  if (!existsSync(envFile)) fail('Falta .secret/prod-ensayo/connection.env. Utilizar la plantilla database/operations/prod-ensayo.env.example.');
  let env;
  try { env = parseEnv(readFileSync(envFile, 'utf8')); }
  catch { fail('No se pudo leer el archivo de configuración privada.'); }
  validateConfig(env);
  const keyDir = join(privateDir, 'keys');
  const files = ['jwt-private.pem', 'jwt-public.pem', 'auth-mfa.key', 'financing-mfa.env'];
  if (files.some(f => !existsSync(join(keyDir, f)))) fail('Faltan claves locales; ejecutar primero el generador de ensayo.');
  // No heredar variables de ensayo de la terminal que puedan reemplazar el archivo privado.
  const childEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith(prefix)));
  const args = ['compose', '--env-file', envFile, '-f', join(root, 'docker-compose.prod-ensayo.yml'), 'config', '--quiet'];
  const result = spawnSync('docker', args, { cwd: root, env: childEnv, stdio: 'ignore' });
  if (result.error || result.status !== 0) fail('Docker Compose no pudo validar la configuración. Revisar Docker y los archivos privados localmente.');
  console.log('Configuración local de ensayo válida. No se iniciaron contenedores ni conexiones JDBC.');
  console.log('Pendiente: comprobar identidad, proyecto y permisos efectivos de cada conexión autorizada.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
