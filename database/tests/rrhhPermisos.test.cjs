const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

const fixtures = name => readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
const snapshot = JSON.parse(fixtures('rrhh_export_20261029.json'));
const migration = readFileSync(path.join(__dirname, '../migrations/31_rrhh_gestion_integral_trabajadores.sql'), 'utf8');
const verification = readFileSync(path.join(__dirname, '../verification/31_rrhh_gestion_integral_trabajadores_verificar.sql'), 'utf8');
const rollback = readFileSync(path.join(__dirname, '../rollback/31_rrhh_gestion_integral_trabajadores_revertir.sql'), 'utf8');
const updatedNames = ['sp_rrhh_actualizar_trabajador', 'sp_rrhh_cesar_trabajador', 'sp_rrhh_programar_suspension',
  'sp_rrhh_resolver_reincorporacion', 'sp_rrhh_solicitar_cambio_correo',
  'sp_rrhh_solicitar_correccion_documento', 'sp_rrhh_solicitar_reincorporacion'];
let db;
let initialMetadata;

/** Instala las rutinas exportadas sobre un esquema aislado y mínimo. */
async function databaseWithSnapshot() {
  const instance = new PGlite();
  await instance.exec(fixtures('rrhh_schema.sql'));
  await instance.exec(fixtures('rrhh_seed.sql'));
  for (const routine of snapshot) await instance.exec(routine.definicion + ';');
  await instance.exec(`CREATE ROLE test_anon NOLOGIN;
    CREATE TRIGGER rrhh_sync AFTER UPDATE OF id_estado_trabajador ON rrhh_trabajadores
      FOR EACH ROW EXECUTE FUNCTION fn_rrhh_sincronizar_estado_laboral_usuario();
    CREATE TRIGGER rrhh_tokens AFTER UPDATE OF id_estado_trabajador ON rrhh_trabajadores
      FOR EACH ROW EXECUTE FUNCTION fn_rrhh_invalidar_sesiones_cambio_estado();`);
  return instance;
}

/** Captura metadatos que la migración debe conservar. */
async function metadata(instance) {
  const result = await instance.query(`SELECT proname, proargtypes::text, proowner, proacl::text, prosecdef, proconfig
    FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname = ANY($1::text[])
    ORDER BY proname LIMIT 20`, [updatedNames]);
  return result.rows;
}

/** Aísla cada operación laboral mediante rollback. */
async function isolated(action) {
  await db.exec('BEGIN');
  try { await action(); } finally { await db.exec('ROLLBACK'); }
}

/** Ejecuta el procedimiento real de actualización. */
async function update(actor, worker, payload) {
  const result = await db.query('CALL sp_rrhh_actualizar_trabajador($1,$2,$3::jsonb,NULL,NULL,NULL)',
    [actor, worker, JSON.stringify(payload)]);
  return result.rows[0];
}

/** Obtiene el resultado de una única consulta. */
async function one(sql, parameters = []) {
  const result = await db.query(sql, parameters);
  return result.rows[0];
}

/** Comprueba la respuesta de negocio con su mensaje completo. */
function status(result, expected = 'OK') {
  assert.equal(result.p_estado, expected, JSON.stringify(result));
}

/** Ejecuta el cese validado del expediente. */
async function cease(worker, yesterday = false) {
  return one(`CALL sp_rrhh_cesar_trabajador(1,$1,CURRENT_DATE-$2::integer,
    'Cese solicitado para una prueba controlada.',NULL,NULL,NULL)`, [worker, yesterday ? 1 : 0]);
}

/** Solicita el reingreso siguiendo el flujo exportado. */
async function requestReentry(actor, worker) {
  return one(`CALL sp_rrhh_solicitar_reincorporacion($1,$2,CURRENT_DATE,
    'Solicitud de reincorporación para una prueba.',NULL,NULL,NULL)`, [actor, worker]);
}

before(async () => {
  db = await databaseWithSnapshot();
  initialMetadata = await metadata(db);
  await db.exec(migration);
});
after(async () => { if (db) await db.close(); });

test('la migración conserva firmas, propietario, ACL, SECURITY DEFINER y search_path', async () => {
  assert.deepEqual(await metadata(db), initialMetadata);
});

test('solo RRHH activo y con hr.edit obtiene la gestión integral', async () => {
  const row = await one(`SELECT fn_rrhh_actor_gestion_integral(1) AS rrhh,
    fn_rrhh_actor_gestion_integral(2) AS delegado, fn_rrhh_actor_gestion_integral(3) AS administrador,
    fn_rrhh_actor_gestion_integral(NULL) AS ausente`);
  assert.deepEqual(row, { rrhh: true, delegado: false, administrador: false, ausente: false });
});

for (const sql of [
  "UPDATE seg_roles_permisos SET activo=false WHERE id_rol=1 AND id_permiso=1",
  "UPDATE seg_usuarios_roles SET activo=false WHERE id_usuario=1",
  "UPDATE seg_roles SET activo=false WHERE id_rol=1",
  "UPDATE seg_usuarios SET id_estado_usuario=2 WHERE id_usuario=1",
  "UPDATE seg_usuarios SET bloqueado_hasta=now()+interval '1 hour' WHERE id_usuario=1",
  "UPDATE core_personas SET activo=false WHERE id_persona=101"
]) {
  test(`deniega actor sin autorización vigente: ${sql.split(' SET ')[0]}`, () => isolated(async () => {
    await db.exec(sql);
    assert.equal((await one('SELECT fn_rrhh_actor_gestion_integral(1) AS permitido')).permitido, false);
    status(await update(1, 10, { informacionPersonal: { nombres: 'Cambio' } }), 'DENEGADO');
  }));
}

test('no amplía la administración global de Usuarios y roles', async () => {
  const row = await one(`SELECT fn_usuario_objetivo_gestionable(1,11) AS gestionable,
    fn_usuario_tiene_permiso_seguridad(1,'roles.assign_permissions') AS roles`);
  assert.deepEqual(row, { gestionable: false, roles: false });
});

test('las funciones auxiliares no quedan ejecutables para anon por PUBLIC', async () => {
  const row = await one(`SELECT has_function_privilege('test_anon','fn_rrhh_actor_gestion_integral(bigint)','EXECUTE') AS general,
    has_function_privilege('test_anon','fn_rrhh_puede_cambiar_estado(bigint,bigint)','EXECUTE') AS estado`);
  assert.deepEqual(row, { general: false, estado: false });
});

test('la verificación devuelve siete procedimientos y dos auxiliares en OK', async () => {
  const result = await db.query(verification);
  assert.equal(result.rows.length, 9);
  assert.ok(result.rows.every(row => row.estado === 'OK'));
});

for (const [installName, installNewline] of [['LF', '\n'], ['CRLF', '\r\n']]) {
  for (const [checkName, checkNewline] of [['LF', '\n'], ['CRLF', '\r\n']]) {
    test(`instalación, verificación, repetición y reversión con saltos ${installName}/${checkName}`, async () => {
      const instance = await databaseWithSnapshot();
      try {
        const initial = await metadata(instance);
        const installSql = migration.replace(/\r?\n/g, installNewline);
        const checkSql = verification.replace(/\r?\n/g, checkNewline);
        await instance.exec(installSql);
        assert.ok((await instance.query(checkSql)).rows.every(row => row.estado === 'OK'));
        await instance.exec(installSql);
        assert.deepEqual(await metadata(instance), initial);
        await instance.exec(rollback.replace(/\r?\n/g, installNewline));
        assert.deepEqual(await metadata(instance), initial);
        assert.equal((await instance.query("SELECT to_regprocedure('fn_rrhh_actor_gestion_integral(bigint)') AS helper")).rows[0].helper, null);
      } finally { await instance.close(); }
    });
  }
}

for (const [option, expectedDetail] of [
  ['SECURITY DEFINER', 'Debe usar SECURITY INVOKER'],
  ['VOLATILE', 'Debe estar declarada STABLE']
]) {
  test(`la verificación rechaza auxiliares con ${option}`, () => isolated(async () => {
    await db.exec(`ALTER FUNCTION fn_rrhh_actor_gestion_integral(bigint) ${option};
      ALTER FUNCTION fn_rrhh_puede_cambiar_estado(bigint,bigint) ${option}`);
    const rows = (await db.query(verification.replace(/\r?\n/g, '\r\n'))).rows;
    assert.equal(rows.filter(row => row.estado === 'OK').length, 7);
    assert.equal(rows.filter(row => row.estado === 'REVISAR' && row.detalle === expectedDetail).length, 2);
  }));
}

test('la normalización de saltos de línea sigue rechazando cuerpos auxiliares alterados', () => isolated(async () => {
  const changes = [
    ['fn_rrhh_actor_gestion_integral(bigint)', 'SELECT COALESCE', 'SELECT NOT COALESCE'],
    ['fn_rrhh_puede_cambiar_estado(bigint,bigint)', 'SELECT p_id_persona IS NOT NULL', 'SELECT p_id_persona IS NULL']
  ];
  for (const [signature, beforeText, afterText] of changes) {
    const ddl = (await db.query('SELECT pg_get_functiondef($1::regprocedure) AS ddl', [signature])).rows[0].ddl;
    assert.ok(ddl.includes(beforeText));
    await db.exec(ddl.replace(beforeText, afterText));
  }
  const rows = (await db.query(verification.replace(/\r?\n/g, '\r\n'))).rows;
  assert.equal(rows.filter(row => row.estado === 'OK').length, 7);
  assert.equal(rows.filter(row => row.estado === 'REVISAR' && row.detalle === 'El cuerpo de la función auxiliar no coincide').length, 2);
}));

for (const position of [1, 2]) {
  test(`RRHH crea un expediente para el cargo ${position}`, () => isolated(async () => {
    const today = (await one('SELECT CURRENT_DATE::text AS fecha')).fecha;
    const payload = { informacionPersonal: { idTipoDocumento: 1, numeroDocumento: '98765432',
      nombres: 'Nueva Persona', apellidoPaterno: 'Prueba', apellidoMaterno: 'Ejemplo',
      fechaNacimiento: '1990-01-01', correoElectronico: 'nueva@empresa.pe', telefono: '987654321',
      direccion: 'Calle de prueba 123', departamento: 'Lambayeque', provincia: 'Chiclayo', distrito: 'Ciudad Eten' },
    informacionLaboral: { idCargo: position, idHorario: 1, idTipoVinculoLaboral: 1, fechaIngreso: today } };
    const result = await one('CALL sp_rrhh_registrar_trabajador(1,$1::jsonb,NULL,NULL,NULL)', [JSON.stringify(payload)]);
    status(result);
    assert.equal((await one('SELECT id_cargo AS cargo FROM rrhh_trabajadores WHERE id_trabajador=$1', [result.p_resultado.idTrabajador])).cargo, position);
  }));
}

for (const worker of [10, 20, 30, 40, 50]) {
  test(`RRHH edita datos personales del expediente ${worker}`, () => isolated(async () => {
    status(await update(1, worker, { informacionPersonal: { nombres: 'Nombre Corregido', telefono: '999888777' } }));
    const row = await one(`SELECT p.nombres FROM core_personas p JOIN rrhh_trabajadores t USING(id_persona)
      WHERE t.id_trabajador=$1`, [worker]);
    assert.equal(row.nombres, 'Nombre Corregido');
    assert.equal((await one('SELECT count(*)::integer AS total FROM test_auditoria')).total, 1);
  }));

  test(`RRHH inactiva y reactiva el expediente ${worker}`, () => isolated(async () => {
    status(await update(1, worker, { informacionLaboral: { idEstadoTrabajador: 2, motivoCambioEstado: 'Inactivación documentada.' } }));
    status(await update(1, worker, { informacionLaboral: { idEstadoTrabajador: 1, motivoCambioEstado: 'Reactivación documentada.' } }));
    assert.equal((await one('SELECT id_estado_trabajador AS estado FROM rrhh_trabajadores WHERE id_trabajador=$1', [worker])).estado, 1);
    assert.equal((await one('SELECT count(*)::integer AS total FROM rrhh_trabajadores_historial_laboral')).total, 2);
    if (worker !== 50) {
      const user = await one(`SELECT u.id_estado_usuario AS estado,u.version_sesiones AS version
        FROM seg_usuarios u JOIN rrhh_trabajadores t USING(id_persona) WHERE t.id_trabajador=$1`, [worker]);
      assert.deepEqual(user, { estado: 1, version: 2 });
    }
  }));

  test(`RRHH registra una suspensión inmediata del expediente ${worker}`, () => isolated(async () => {
    status(await one(`CALL sp_rrhh_programar_suspension(1,$1,now()-interval '1 minute',now()+interval '1 hour',
      'Suspensión registrada para una prueba controlada.',NULL,NULL,NULL)`, [worker]));
    assert.equal((await one('SELECT id_estado_trabajador AS estado FROM rrhh_trabajadores WHERE id_trabajador=$1', [worker])).estado, 3);
    assert.equal((await one("SELECT estado FROM rrhh_suspensiones_laborales WHERE id_trabajador=$1", [worker])).estado, 'VIGENTE');
  }));

  test(`RRHH aplica el cese del expediente ${worker} y notifica`, () => isolated(async () => {
    status(await cease(worker));
    assert.equal((await one('SELECT id_estado_trabajador AS estado FROM rrhh_trabajadores WHERE id_trabajador=$1', [worker])).estado, 4);
    assert.ok((await one('SELECT count(*)::integer AS total FROM not_notificaciones')).total > 0);
  }));

  test(`RRHH solicita reincorporar el expediente ${worker} y el Administrador resuelve`, () => isolated(async () => {
    status(await cease(worker, true));
    const request = await requestReentry(1, worker);
    status(request);
    const approved = await one(`CALL sp_rrhh_resolver_reincorporacion(3,$1,'APROBAR',NULL,NULL,NULL,NULL)`,
      [request.p_resultado.idSolicitud]);
    status(approved);
    assert.equal((await one('SELECT id_estado_trabajador AS estado FROM rrhh_trabajadores WHERE id_trabajador=$1', [worker])).estado, 1);
  }));
}

test('otros roles con hr.edit conservan el bloqueo de Gerencia', () => isolated(async () => {
  status(await update(2, 10, { informacionPersonal: { nombres: 'Cambio' } }), 'USUARIO_PROTEGIDO');
  status(await update(2, 40, { informacionPersonal: { nombres: 'Cambio' } }));
}));

test('RRHH conserva la prohibición de bloquear su propia cuenta', () => isolated(async () => {
  status(await update(1, 60, { informacionLaboral: { idEstadoTrabajador: 2 } }), 'USUARIO_PROTEGIDO');
  assert.equal((await one('SELECT id_estado_usuario AS estado FROM seg_usuarios WHERE id_usuario=1')).estado, 1);
}));

test('la reactivación laboral conserva una restricción manual de Seguridad', () => isolated(async () => {
  await db.exec('INSERT INTO seg_restricciones_acceso_manual VALUES(11,true); UPDATE seg_usuarios SET id_estado_usuario=3 WHERE id_usuario=11;');
  status(await update(1, 10, { informacionLaboral: { idEstadoTrabajador: 2 } }));
  status(await update(1, 10, { informacionLaboral: { idEstadoTrabajador: 1 } }));
  assert.equal((await one('SELECT id_estado_usuario AS estado FROM seg_usuarios WHERE id_usuario=11')).estado, 3);
}));

test('un cambio de estado sigue revocando sesiones y recuperaciones pendientes', () => isolated(async () => {
  status(await update(1, 10, { informacionLaboral: { idEstadoTrabajador: 2 } }));
  assert.equal((await one('SELECT fecha_revocacion IS NOT NULL AS revocada FROM seg_sesiones WHERE id_usuario=11')).revocada, true);
  assert.equal((await one('SELECT fecha_uso IS NOT NULL AS usada FROM seg_tokens_recuperacion WHERE id_usuario=11')).usada, true);
}));

test('el cambio de correo de Gerencia queda pendiente y conserva el correo actual', () => isolated(async () => {
  status(await one(`CALL sp_rrhh_solicitar_cambio_correo(1,10,'institucional@utp.edu.pe'::text,
    'Corrección de correo solicitada por RRHH.'::text,NULL,NULL,NULL)`));
  assert.equal((await one("SELECT estado FROM core_solicitudes_correccion_identidad WHERE tipo_dato='CONTACTO'")).estado, 'PENDIENTE');
  assert.equal((await one('SELECT valor FROM core_personas_contactos WHERE id_persona=201 AND id_tipo_contacto=1 AND principal')).valor, 'persona201@example.com');
}));

for (const [scenario, sql] of [
  ['sin contacto', 'DELETE FROM core_personas_contactos WHERE id_persona=201 AND id_tipo_contacto=1'],
  ['correo nulo', 'UPDATE core_personas_contactos SET valor=NULL WHERE id_persona=201 AND id_tipo_contacto=1'],
  ['contacto inactivo', 'UPDATE core_personas_contactos SET activo=false WHERE id_persona=201 AND id_tipo_contacto=1']
]) {
  test(`conserva la validación actual al solicitar cambio de correo: ${scenario}`, () => isolated(async () => {
    await db.exec(sql);
    const result = await one(`CALL sp_rrhh_solicitar_cambio_correo(1,10,'nuevo@empresa.pe'::text,
      'Corrección de correo solicitada por RRHH.'::text,NULL,NULL,NULL)`);
    status(result, 'CONTACTO_NO_REGISTRADO');
    assert.equal(result.p_mensaje, 'Registra primero un correo inicial para este trabajador.');
    assert.equal((await one("SELECT COUNT(*)::int AS total FROM core_solicitudes_correccion_identidad WHERE tipo_dato='CONTACTO'")).total, 0);
  }));
}

test('la corrección documental de Gerencia exige el flujo de evidencia y aprobación', () => isolated(async () => {
  status(await one(`CALL sp_rrhh_solicitar_correccion_documento(1,10,2,'123456789',
    'Cambio de identidad solicitado con evidencia.',NULL,NULL,NULL)`));
  assert.equal((await one("SELECT estado FROM core_solicitudes_correccion_identidad WHERE tipo_dato='DOCUMENTO'")).estado, 'PENDIENTE');
  assert.equal((await one('SELECT id_estado_trabajador AS estado FROM rrhh_trabajadores WHERE id_trabajador=10')).estado, 5);
  assert.equal((await one('SELECT id_tipo_documento AS tipo FROM core_personas_documentos WHERE id_persona=201 AND principal')).tipo, 1);
}));

test('RRHH no obtiene la aprobación administrativa de reincorporaciones', () => isolated(async () => {
  status(await cease(10, true));
  const request = await requestReentry(1, 10);
  status(request);
  status(await one("CALL sp_rrhh_resolver_reincorporacion(1,$1,'APROBAR',NULL,NULL,NULL,NULL)",
    [request.p_resultado.idSolicitud]), 'DENEGADO');
}));

test('el Administrador no puede resolver una solicitud presentada por sí mismo', () => isolated(async () => {
  status(await cease(40, true));
  const request = await requestReentry(3, 40);
  status(request);
  status(await one("CALL sp_rrhh_resolver_reincorporacion(3,$1,'APROBAR',NULL,NULL,NULL,NULL)",
    [request.p_resultado.idSolicitud]), 'AUTOAPROBACION_DENEGADA');
}));

test('la autorización de RRHH conserva los motivos y fechas obligatorios', () => isolated(async () => {
  status(await one(`CALL sp_rrhh_programar_suspension(1,10,now(),now()-interval '1 hour',
    'Motivo suficiente pero fecha inválida.',NULL,NULL,NULL)`), 'DATOS_INVALIDOS');
  status(await one(`CALL sp_rrhh_cesar_trabajador(1,10,CURRENT_DATE-200,
    'Motivo suficiente pero cese anterior al ingreso.',NULL,NULL,NULL)`), 'FECHAS_INVALIDAS');
  assert.equal((await one('SELECT id_estado_trabajador AS estado FROM rrhh_trabajadores WHERE id_trabajador=10')).estado, 1);
}));

test('el parche es idempotente y mantiene los metadatos', async () => {
  await db.exec(migration);
  assert.deepEqual(await metadata(db), initialMetadata);
});

for (const [signature, beforeText, afterText] of [
  ['sp_rrhh_actualizar_trabajador(bigint,bigint,jsonb)', 'Expediente actualizado correctamente.', 'Cambio posterior al CSV.'],
  ['sp_rrhh_solicitar_cambio_correo(bigint,bigint,text,text)', 'IF v_id_contacto IS NULL OR v_correo_actual IS NULL THEN', 'IF FALSE THEN']
]) {
test(`una definición distinta del CSV revierte toda la migración: ${signature}`, async () => {
  const instance = await databaseWithSnapshot();
  try {
    const result = await instance.query('SELECT pg_get_functiondef($1::regprocedure) AS ddl', [signature]);
    assert.ok(result.rows[0].ddl.includes(beforeText));
    await instance.exec(result.rows[0].ddl.replace(beforeText, afterText));
    await assert.rejects(instance.exec(migration), /definición cambió desde el CSV/);
    await instance.exec('ROLLBACK');
    const helper = await instance.query("SELECT to_regprocedure('fn_rrhh_actor_gestion_integral(bigint)') AS helper");
    assert.equal(helper.rows[0].helper, null);
  } finally { await instance.close(); }
});
}

test('la reversión restaura los bloqueos del CSV y permite reaplicar el cambio', async () => {
  await db.exec(rollback);
  assert.deepEqual(await metadata(db), initialMetadata);
  const check = await one("SELECT to_regprocedure('fn_rrhh_actor_gestion_integral(bigint)') AS helper");
  assert.equal(check.helper, null);
  status(await update(1, 10, { informacionPersonal: { nombres: 'Cambio' } }), 'USUARIO_PROTEGIDO');
  await isolated(async () => {
    await db.exec('DELETE FROM core_personas_contactos WHERE id_persona=204 AND id_tipo_contacto=1');
    status(await one(`CALL sp_rrhh_solicitar_cambio_correo(1,40,'nuevo@empresa.pe'::text,
      'Corrección de correo solicitada por RRHH.'::text,NULL,NULL,NULL)`), 'CONTACTO_NO_REGISTRADO');
  });
  await db.exec(migration);
  const result = await db.query(verification);
  assert.ok(result.rows.every(row => row.estado === 'OK'));
});
