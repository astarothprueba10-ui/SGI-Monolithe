import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
const storage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key), clear: () => values.clear() };
};
globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
globalThis.window = new EventTarget();
const code = transformSync(readFileSync(new URL('../src/lib/authSession.ts', import.meta.url), 'utf8'),
  { loader: 'ts', format: 'esm' }).code;
const auth = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
assert.deepEqual(auth.getSessionRoles(['ROLE_LOGISTICA', 'lots.view']), ['LOGISTICA']);
assert.deepEqual(auth.getSessionRoles(['ROLE_OTRO_NUEVO', 'ROLE_OTRO_NUEVO']), ['OTRO_NUEVO']);
assert.deepEqual(auth.getSessionRoles(['ROLE_ASESOR']), ['Asesor']);
assert.deepEqual([...auth.getSessionPermissions(['ROLE_LOGISTICA', 'lots.view'])], ['lots.view']);
let notifications = 0;
const unsubscribe = auth.subscribeAuthSession(() => notifications++);
const user = { idUsuario: 10, usuario: 'diego', autoridades: ['ROLE_LOGISTICA', 'lots.view'],
  requiereCambioPassword: false, accesoBackoffice: true, accessToken: 'must-not-be-in-user' };
for (const selected of [localStorage, sessionStorage]) {
  localStorage.clear(); sessionStorage.clear();
  selected.setItem('monolithe_refresh_token', 'old');
  assert.equal(auth.updateStoredTokens('new-access', 'new-refresh'), true);
  auth.updateStoredAuthUser(user);
  assert.equal(selected.getItem('monolithe_refresh_token'), 'new-refresh');
  assert.equal(auth.getStoredAuthUser().accesoBackoffice, true);
  assert.equal(auth.getStoredAuthUser().accessToken, undefined);
  auth.updateStoredAuthUser({ ...user, autoridades: ['ROLE_LOGISTICA'], accesoBackoffice: false });
  assert.equal(auth.getStoredAuthUser().accesoBackoffice, false);
  assert.deepEqual([...auth.getSessionPermissions(auth.getStoredAuthUser().autoridades)], []);
}
assert.equal(notifications, 4);
unsubscribe();
auth.clearStoredSession();
assert.equal(auth.getStoredAuthUser(), null);
assert.equal(auth.updateStoredTokens('access', 'refresh'), false);
console.log('Pruebas de roles personalizados, permisos y renovación en ambos almacenamientos: OK');
