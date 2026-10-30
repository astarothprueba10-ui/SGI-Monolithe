const assert = require('node:assert/strict');
const test = require('node:test');
const { webcrypto } = require('node:crypto');
const { INACTIVITY_TIMEOUT_MS, InactivityTimer, remainingInactivity } = require('../src/lib/inactivityTimer.ts');
const session = require('../src/lib/inactivitySession.ts');
const { clearStoredSession, getAccessToken, updateStoredTokens } = require('../src/lib/authSession.ts');

function clock() {
  let time = 1_800_000_000_000;
  let next = 0;
  const tasks = new Map();
  return {
    now: () => time,
    advance: duration => { time += duration; },
    schedule: (callback, delay) => { const id = ++next; tasks.set(id, { callback, at: time + delay }); return id; },
    cancel: id => tasks.delete(id),
    flush: () => {
      for (const [id, task] of [...tasks]) if (task.at <= time) { tasks.delete(id); task.callback(); }
    },
    pending: () => tasks.size
  };
}

function timerFixture(shared = { activity: null }, time = clock()) {
  let expired = 0;
  const timer = new InactivityTimer({ now: time.now, read: () => shared.activity,
    write: activity => { shared.activity = activity; }, schedule: time.schedule,
    cancel: time.cancel, expire: () => { expired += 1; } });
  return { timer, shared, time, expired: () => expired };
}

function eventSurface() {
  const listeners = new Map();
  return {
    addEventListener: (name, callback) => { const set = listeners.get(name) ?? new Set(); set.add(callback); listeners.set(name, set); },
    removeEventListener: (name, callback) => listeners.get(name)?.delete(callback),
    emit: (name, properties = {}) => {
      const event = { type: name, isTrusted: true, preventDefault() {}, stopImmediatePropagation() {}, ...properties };
      for (const callback of [...(listeners.get(name) ?? [])]) callback(event);
    },
    count: () => [...listeners.values()].reduce((total, set) => total + set.size, 0)
  };
}

function storage() {
  const values = new Map();
  return { values, getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
}

function installGlobal(context, name, value) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  context.after(() => descriptor ? Object.defineProperty(globalThis, name, descriptor) : delete globalThis[name]);
}

function browserFixture(context, remember = true) {
  const time = clock();
  const local = storage(); const temporary = storage();
  const window = eventSurface(); const document = eventSurface(); const redirects = [];
  Object.assign(window, { setTimeout: time.schedule, clearTimeout: time.cancel,
    location: { replace: path => redirects.push(path), reload: () => redirects.push('reload') } });
  document.hidden = false;
  for (const [name, value] of Object.entries({ window, document, localStorage: local, sessionStorage: temporary, crypto: webcrypto })) {
    installGlobal(context, name, value);
  }
  context.mock.method(Date, 'now', time.now);
  const auth = remember ? local : temporary;
  auth.setItem('monolithe_access_token', 'access-test'); auth.setItem('monolithe_refresh_token', 'refresh-test');
  auth.setItem('monolithe_user', JSON.stringify({ idUsuario: 1, autoridades: ['ROLE_RRHH'] }));
  return { time, local, temporary, auth, window, document, redirects };
}

test('el límite es exactamente diez minutos y respeta su frontera', () => {
  assert.equal(INACTIVITY_TIMEOUT_MS, 600_000);
  assert.equal(remainingInactivity(1000, 600_999), 1);
  assert.equal(remainingInactivity(1000, 601_000), 0);
  for (const value of [0, -1, NaN, Infinity, 2000]) assert.equal(remainingInactivity(value, 1000), 0);
});

test('cierra al cumplirse diez minutos sin actividad y lo hace una sola vez', () => {
  const f = timerFixture(); f.timer.start();
  f.time.advance(599_999); f.time.flush(); assert.equal(f.expired(), 0);
  f.time.advance(1); f.time.flush(); assert.equal(f.expired(), 1);
  f.timer.check(); f.timer.activity(); assert.equal(f.expired(), 1);
});

test('una interacción anterior al límite reinicia el plazo completo', () => {
  const f = timerFixture(); f.timer.start();
  f.time.advance(599_999); assert.equal(f.timer.activity(), true);
  f.time.advance(599_999); f.time.flush(); assert.equal(f.expired(), 0);
  f.time.advance(1); f.time.flush(); assert.equal(f.expired(), 1);
});

test('una interacción posterior al límite no revive la sesión', () => {
  const f = timerFixture(); f.timer.start(); f.time.advance(600_001);
  assert.equal(f.timer.activity(), false); assert.equal(f.expired(), 1);
  assert.equal(f.shared.activity.closed, true);
});

test('recargar conserva el plazo de actividad que ya estaba guardado', () => {
  const f = timerFixture(); f.timer.start(); f.time.advance(540_000); f.timer.stop();
  const reloaded = timerFixture(f.shared, f.time); reloaded.timer.start();
  f.time.advance(60_000); f.time.flush(); assert.equal(reloaded.expired(), 1);
});

test('la actividad de otra pestaña de la misma sesión mantiene el plazo compartido', () => {
  const first = timerFixture(); first.timer.start();
  const second = timerFixture(first.shared, first.time); second.timer.start();
  first.time.advance(540_000); second.timer.activity();
  first.time.advance(60_000); first.time.flush(); assert.equal(first.expired(), 0);
  first.time.advance(540_000); first.time.flush(); assert.equal(first.expired(), 1); assert.equal(second.expired(), 1);
});

test('la actividad de una sesión independiente no mantiene abierta otra sesión', () => {
  const first = timerFixture(); first.timer.start();
  const second = timerFixture({ activity: null }, first.time); second.timer.start();
  first.time.advance(540_000); second.timer.activity();
  first.time.advance(60_000); first.time.flush(); assert.equal(first.expired(), 1); assert.equal(second.expired(), 0);
});

test('desmontar el observador cancela el temporizador sin cerrar la sesión', () => {
  const f = timerFixture(); f.timer.start(); f.timer.stop();
  f.time.advance(700_000); f.time.flush(); assert.equal(f.expired(), 0); assert.equal(f.time.pending(), 0);
});

for (const remember of [true, false]) {
  test(`limpia credenciales y redirige con recordar sesión=${remember}`, context => {
    const f = browserFixture(context, remember); const revoked = [];
    session.beginSessionActivity(f.auth);
    session.watchSessionInactivity(token => { revoked.push(token); return new Promise(() => {}); });
    f.time.advance(600_000); f.time.flush();
    assert.equal(getAccessToken(), null); assert.equal(session.getInactivitySessionId(), null);
    assert.deepEqual(revoked, ['refresh-test']); assert.deepEqual(f.redirects, ['/login?motivo=inactividad']);
  });
}

test('el cierre local y la redirección funcionan aunque falle la revocación remota', async context => {
  const f = browserFixture(context); context.mock.method(console, 'warn', () => {});
  session.beginSessionActivity(f.auth);
  session.watchSessionInactivity(() => Promise.reject(new Error('sin conexión')));
  f.time.advance(600_000); f.time.flush(); await Promise.resolve();
  assert.equal(getAccessToken(), null); assert.deepEqual(f.redirects, ['/login?motivo=inactividad']);
});

for (const type of ['pointerdown', 'pointermove', 'keydown', 'click', 'wheel', 'touchstart', 'input']) {
  test(`la interacción real ${type} renueva el plazo`, context => {
    const f = browserFixture(context); const id = session.beginSessionActivity(f.auth);
    const stop = session.watchSessionInactivity(async () => {});
    f.time.advance(540_000); f.window.emit(type);
    assert.equal(session.readSessionActivity(id).lastActivity, f.time.now());
    f.time.advance(60_000); f.time.flush(); assert.deepEqual(f.redirects, []); stop();
  });
}

test('los eventos sintéticos y los de una pestaña oculta no renuevan el plazo', context => {
  const f = browserFixture(context); const id = session.beginSessionActivity(f.auth);
  session.watchSessionInactivity(async () => {}); const original = session.readSessionActivity(id).lastActivity;
  f.time.advance(540_000); f.window.emit('pointermove', { isTrusted: false });
  f.document.hidden = true; f.window.emit('input');
  assert.equal(session.readSessionActivity(id).lastActivity, original);
  f.time.advance(60_000); f.time.flush(); assert.equal(f.redirects.length, 1);
});

test('un desplazamiento automático del documento no renueva el plazo', context => {
  const f = browserFixture(context); const id = session.beginSessionActivity(f.auth);
  session.watchSessionInactivity(async () => {}); const original = session.readSessionActivity(id).lastActivity;
  f.time.advance(540_000); f.window.emit('scroll');
  assert.equal(session.readSessionActivity(id).lastActivity, original);
  f.time.advance(60_000); f.time.flush(); assert.equal(f.redirects.length, 1);
});

for (const event of ['focus', 'pageshow', 'visibilitychange']) {
  test(`al volver mediante ${event} comprueba un vencimiento con el temporizador suspendido`, context => {
    const f = browserFixture(context); session.beginSessionActivity(f.auth);
    session.watchSessionInactivity(async () => {}); f.time.advance(600_001);
    (event === 'visibilitychange' ? f.document : f.window).emit(event);
    assert.equal(getAccessToken(), null); assert.deepEqual(f.redirects, ['/login?motivo=inactividad']);
  });
}

test('las peticiones autenticadas vencidas pueden bloquearse antes de enviarse', context => {
  const f = browserFixture(context); session.beginSessionActivity(f.auth); f.time.advance(600_000);
  assert.equal(session.expireSessionIfInactive(async () => {}), true); assert.equal(getAccessToken(), null);
});

test('renovar tokens no renueva el plazo de interacción', context => {
  const f = browserFixture(context); const id = session.beginSessionActivity(f.auth);
  const original = session.readSessionActivity(id).lastActivity; f.time.advance(500_000);
  assert.equal(updateStoredTokens('access-new', 'refresh-new', 'refresh-test'), true);
  assert.equal(session.getInactivitySessionId(), id); assert.equal(session.readSessionActivity(id).lastActivity, original);
});

test('una renovación tardía no restaura las credenciales tras cerrar la sesión', context => {
  const f = browserFixture(context); session.beginSessionActivity(f.auth); clearStoredSession();
  assert.equal(updateStoredTokens('access-new', 'refresh-new', 'refresh-test'), false); assert.equal(getAccessToken(), null);
});

test('una respuesta antigua no sobrescribe las credenciales de otra sesión nueva', context => {
  const f = browserFixture(context); const oldId = session.beginSessionActivity(f.auth);
  f.auth.setItem('monolithe_refresh_token', 'otra-sesion'); const newId = session.beginSessionActivity(f.auth);
  assert.notEqual(oldId, newId); assert.equal(updateStoredTokens('incorrecto', 'incorrecto', 'refresh-test'), false);
  session.expireInactiveSession(oldId, async () => assert.fail('no debe revocar otra sesión'));
  assert.equal(f.auth.getItem('monolithe_refresh_token'), 'otra-sesion'); assert.deepEqual(f.redirects, []);
});

test('un cambio de cuenta en otra pestaña recarga el contexto sin borrar la sesión nueva', context => {
  const f = browserFixture(context); session.beginSessionActivity(f.auth); session.watchSessionInactivity(async () => {});
  f.auth.setItem('monolithe_refresh_token', 'otra-sesion'); const newId = session.beginSessionActivity(f.auth);
  f.window.emit('storage', { key: session.SESSION_ID_KEY });
  assert.deepEqual(f.redirects, ['reload']); assert.equal(session.getInactivitySessionId(), newId);
});

test('el cierre manual de otra pestaña redirige sin atribuirlo a inactividad', context => {
  const f = browserFixture(context); session.beginSessionActivity(f.auth); session.watchSessionInactivity(async () => {});
  clearStoredSession(); f.window.emit('storage', { key: session.SESSION_ID_KEY });
  assert.deepEqual(f.redirects, ['/login']);
});

test('desmontar retira todos los observadores y permite el montaje de StrictMode', context => {
  const f = browserFixture(context); const id = session.beginSessionActivity(f.auth);
  const first = session.watchSessionInactivity(async () => {}); first();
  assert.equal(f.window.count(), 0); assert.equal(f.document.count(), 0); assert.equal(f.time.pending(), 0);
  const second = session.watchSessionInactivity(async () => {}); assert.equal(session.getInactivitySessionId(), id); second();
});

test('el formulario de login sin credenciales no crea un temporizador', context => {
  const f = browserFixture(context); clearStoredSession();
  assert.equal(session.watchSessionInactivity(async () => {}), undefined); assert.equal(f.time.pending(), 0);
});

test('un registro inválido no prolonga una sesión al cargar la página', context => {
  const f = browserFixture(context); f.auth.setItem(session.SESSION_ID_KEY, 'registro-invalido');
  f.local.setItem(session.ACTIVITY_PREFIX + 'registro-invalido', '{"lastActivity":"incorrecta","closed":false}');
  session.watchSessionInactivity(async () => {}); assert.deepEqual(f.redirects, ['/login?motivo=inactividad']);
});

test('el registro de actividad no contiene credenciales ni información del trabajador', context => {
  const f = browserFixture(context); const id = session.beginSessionActivity(f.auth);
  const record = JSON.parse(f.local.getItem(session.ACTIVITY_PREFIX + id));
  assert.deepEqual(Object.keys(record).sort(), ['closed', 'lastActivity']);
});

test('una sesión anterior a la actualización recibe el control sin exigir otro login', context => {
  const f = browserFixture(context); assert.equal(session.getInactivitySessionId(), null);
  const stop = session.watchSessionInactivity(async () => {});
  assert.ok(session.getInactivitySessionId()); assert.equal(getAccessToken(), 'access-test');
  f.time.advance(600_000); f.time.flush(); assert.equal(getAccessToken(), null); stop();
});

test('el temporizador mantiene el cierre local cuando se bloquea el almacenamiento de actividad', context => {
  const f = browserFixture(context, false); const originalGet = f.local.getItem; const originalSet = f.local.setItem;
  context.mock.method(f.local, 'getItem', key => {
    if (key.startsWith(session.ACTIVITY_PREFIX)) throw new Error('almacenamiento limitado');
    return originalGet(key);
  });
  context.mock.method(f.local, 'setItem', (key, value) => {
    if (key.startsWith(session.ACTIVITY_PREFIX)) throw new Error('almacenamiento limitado');
    return originalSet(key, value);
  });
  session.beginSessionActivity(f.auth); session.watchSessionInactivity(async () => {});
  f.time.advance(600_000); f.time.flush(); assert.deepEqual(f.redirects, ['/login?motivo=inactividad']);
});

test('una notificación de cierre de la misma sesión cierra la pestaña receptora', context => {
  const f = browserFixture(context); const id = session.beginSessionActivity(f.auth);
  session.watchSessionInactivity(async () => {});
  session.writeSessionActivity(id, { lastActivity: f.time.now(), closed: true });
  f.window.emit('storage', { key: session.ACTIVITY_PREFIX + id });
  assert.equal(getAccessToken(), null); assert.deepEqual(f.redirects, ['/login?motivo=inactividad']);
});

test('el identificador también funciona cuando randomUUID no está disponible en HTTP', context => {
  const f = browserFixture(context);
  installGlobal(context, 'crypto', { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) });
  const first = session.beginSessionActivity(f.auth); const second = session.beginSessionActivity(f.auth);
  assert.match(first, /^[a-f0-9]{32}$/); assert.notEqual(first, second);
});

test('renovar una sesión temporal conserva su almacenamiento y admite el contrato anterior', context => {
  const f = browserFixture(context, false); const id = session.beginSessionActivity(f.auth);
  assert.equal(updateStoredTokens('access-private', 'refresh-private'), true);
  assert.equal(f.temporary.getItem('monolithe_access_token'), 'access-private');
  assert.equal(f.local.getItem('monolithe_access_token'), null); assert.equal(session.getInactivitySessionId(), id);
});

test('una renovación no crea una sesión cuando ya no existe un refresh token', context => {
  const f = browserFixture(context); clearStoredSession();
  assert.equal(updateStoredTokens('access-private', 'refresh-private'), false);
  assert.equal(getAccessToken(), null); assert.equal(f.local.getItem('monolithe_refresh_token'), null);
});
