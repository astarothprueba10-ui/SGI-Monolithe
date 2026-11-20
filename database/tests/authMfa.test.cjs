const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { test } = require('node:test');
const { createHash } = require('node:crypto');
const { PGlite } = require('@electric-sql/pglite');

const migration = readFileSync(resolve(__dirname, '../migrations/106_auth_totp_dos_factores.sql'), 'utf8');
const issue = readFileSync(resolve(__dirname, '../operations/emitir_codigo_activacion_mfa.sql'), 'utf8');
const reset = readFileSync(resolve(__dirname, '../operations/restablecer_factor_mfa.sql'), 'utf8');

async function database() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE sgi_backend_user;
    CREATE ROLE authenticated;
    CREATE ROLE anon;
    CREATE ROLE service_role BYPASSRLS;
    CREATE TABLE public.seg_usuarios (id_usuario bigint PRIMARY KEY, usuario_login text, version_sesiones bigint NOT NULL);
    CREATE TABLE public.seg_sesiones (id_usuario bigint, fecha_revocacion timestamptz, motivo_revocacion text);
    INSERT INTO public.seg_usuarios VALUES (1, 'prueba', 2), (2, 'otra', 0);
    INSERT INTO public.seg_sesiones VALUES (1, NULL, NULL), (2, NOW(), 'LOGOUT');
  `);
  await db.exec(migration);
  return db;
}

test('la migración de MFA invalida los tokens y sesiones anteriores', async () => {
  const db = await database();
  try {
    const versions = await db.query('SELECT version_sesiones FROM public.seg_usuarios ORDER BY id_usuario');
    const sessions = await db.query('SELECT motivo_revocacion, fecha_revocacion FROM public.seg_sesiones ORDER BY id_usuario');
    assert.deepEqual(versions.rows.map(row => Number(row.version_sesiones)), [3, 1]);
    assert.deepEqual(sessions.rows.map(row => row.motivo_revocacion), ['ACTIVACION_MFA', 'LOGOUT']);
    assert.ok(sessions.rows.every(row => row.fecha_revocacion));
  } finally { await db.close(); }
});

test('el estado del segundo factor solo está disponible al backend autorizado', async () => {
  const db = await database();
  try {
    for (const role of ['authenticated', 'anon', 'service_role']) {
      await db.exec('SET ROLE ' + role);
      await assert.rejects(db.query('SELECT id_usuario FROM auth_mfa.estado'), { code: '42501' });
    }
    await db.exec('SET ROLE sgi_backend_user');
    await db.exec('INSERT INTO auth_mfa.estado (id_usuario) VALUES (1)');
    const { rows } = await db.query('SELECT id_usuario FROM auth_mfa.estado');
    assert.equal(Number(rows[0].id_usuario), 1);
    await assert.rejects(db.query('DELETE FROM auth_mfa.estado WHERE id_usuario = 1'), { code: '42501' });
  } finally { await db.close(); }
});

test('la invitación solo guarda SHA-256 y no se emite para factores activos', async () => {
  const db = await database();
  try {
    const sql = issue.replace('REEMPLAZA_POR_EL_USUARIO_LOGIN', 'prueba');
    const first = (await db.query(sql)).rows[0];
    const next = (await db.query(sql)).rows[0];
    assert.notEqual(first.codigo_activacion, next.codigo_activacion);
    const stored = (await db.query("SELECT encode(activacion_hash,'hex') AS digest FROM auth_mfa.estado")).rows[0];
    assert.equal(stored.digest, createHash('sha256').update(next.codigo_activacion.replaceAll('-', '')).digest('hex'));
    await db.exec("UPDATE auth_mfa.estado SET secreto_cifrado = decode('ab','hex'), ultimo_paso=1, recuperacion_hash=sha256('test'::bytea) WHERE id_usuario = 1");
    assert.deepEqual((await db.query(sql)).rows, []);
    await assert.rejects(db.query('UPDATE auth_mfa.estado SET ultimo_paso = NULL WHERE id_usuario = 1'), { code: '23514' });
  } finally { await db.close(); }
});

test('el restablecimiento de soporte afecta solo a la cuenta elegida', async () => {
  const db = await database();
  try {
    await db.exec(`
      INSERT INTO auth_mfa.estado(id_usuario, secreto_cifrado, ultimo_paso, recuperacion_hash)
        VALUES (1, decode('ab','hex'), 1, sha256('test'::bytea)), (2, decode('cd','hex'), 2, sha256('test2'::bytea));
      INSERT INTO public.seg_sesiones VALUES (1, NULL, NULL), (2, NULL, NULL);
    `);
    const { rows } = await db.query(reset.replace('REEMPLAZA_POR_EL_USUARIO_LOGIN', 'prueba'));
    assert.equal(rows[0].usuario_login, 'prueba');
    assert.equal(Number(rows[0].sesiones_revocadas), 1);
    const factors = await db.query('SELECT id_usuario FROM auth_mfa.estado ORDER BY id_usuario');
    const versions = await db.query('SELECT version_sesiones FROM public.seg_usuarios ORDER BY id_usuario');
    assert.deepEqual(factors.rows.map(row => Number(row.id_usuario)), [2]);
    assert.deepEqual(versions.rows.map(row => Number(row.version_sesiones)), [4, 1]);
  } finally { await db.close(); }
});
