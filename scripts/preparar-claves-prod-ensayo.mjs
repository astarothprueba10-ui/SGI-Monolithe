import { generateKeyPairSync, randomBytes, createPrivateKey, createPublicKey, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dir = join(root, '.secret', 'prod-ensayo', 'keys');
const paths = ['jwt-private.pem', 'jwt-public.pem', 'auth-mfa.key', 'financing-mfa.env'].map(name => join(dir, name));
const write = (path, value) => writeFileSync(path, value, { flag: 'wx', mode: 0o600 });
const read = path => readFileSync(path, 'utf8').trim();
const validBase64 = value => /^[A-Za-z0-9+/]{43}=$/.test(value) && Buffer.from(value, 'base64').length === 32;
function validate() {
  const privateKey = createPrivateKey(read(paths[0]));
  const publicKey = createPublicKey(read(paths[1]));
  const derived = createPublicKey(privateKey).export({ type: 'spki', format: 'der' });
  const actual = publicKey.export({ type: 'spki', format: 'der' });
  if (privateKey.asymmetricKeyType !== 'rsa' || privateKey.asymmetricKeyDetails.modulusLength < 2048 ||
      actual.length !== derived.length || !timingSafeEqual(actual, derived)) throw new Error('Par RSA inválido');
  const mfa = read(paths[2]);
  const prefix = 'FINANCING_MFA_ENCRYPTION_KEY_BASE64=';
  const financingEnv = read(paths[3]);
  if (!financingEnv.startsWith(prefix)) throw new Error('Formato financiero inválido');
  const financing = financingEnv.slice(prefix.length);
  if (!validBase64(mfa) || !validBase64(financing) || mfa === financing) throw new Error('Claves MFA inválidas');
}
try {
  const existing = paths.map(existsSync);
  if (existing.some(Boolean)) {
    if (!existing.every(Boolean)) throw new Error('Conjunto incompleto; no se modifica ningún archivo existente');
    validate();
    console.log('Claves existentes verificadas; no se modificaron.');
  } else {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    write(paths[0], privateKey);
    write(paths[1], publicKey);
    write(paths[2], randomBytes(32).toString('base64') + '\n');
    write(paths[3], 'FINANCING_MFA_ENCRYPTION_KEY_BASE64=' + randomBytes(32).toString('base64') + '\n');
    validate();
    console.log('Claves de ensayo generadas y verificadas en .secret/prod-ensayo/keys.');
  }
} catch {
  console.error('No fue posible preparar o verificar las claves. No se sobrescriben archivos; revisar el directorio privado local.');
  process.exitCode = 1;
}
