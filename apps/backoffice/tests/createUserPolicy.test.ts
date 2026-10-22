import assert from 'node:assert/strict';
import test from 'node:test';
import type { SecurityRole } from '../src/services/securityApi';
import type { Permission, RoleName } from '../src/types';
import { puedeAdministrarCuentas } from '../src/lib/securityAccess.ts';
import {
  alternarRolSeleccionado,
  correoPrincipalValido,
  debeMostrarAdvertenciaCorreoFaltante,
  evaluarRolesIniciales,
  personaElegibleParaSeleccion,
  personasUnicasPorId,
  puedeAsignarRolesInternosProtegidos
} from '../src/components/users/createUserPolicy.ts';

function rol(codigo: string, asignableRrhh = true): SecurityRole {
  return {
    idRol: codigo.length,
    codigo,
    nombre: codigo,
    descripcion: '',
    esSistema: false,
    activo: true,
    asignableRrhh,
    cantidadPermisos: 0,
    cantidadUsuarios: 0
  };
}

test('selecciona trabajador elegible aunque su documento no esté verificado', () => {
  const trabajador = {
    elegible: true,
    relaciones: ['TRABAJADOR' as const]
  };

  assert.equal(personaElegibleParaSeleccion(trabajador), true);
  assert.equal(
    evaluarRolesIniciales(trabajador.relaciones, [], [rol('RRHH')]).rolesValidos,
    false,
    'el trabajador debe marcar al menos un rol interno'
  );
  assert.equal(
    evaluarRolesIniciales(trabajador.relaciones, ['RRHH'], [rol('RRHH')]).rolesValidos,
    true
  );
});

test('deduplica el selector por idPersona', () => {
  const personas = personasUnicasPorId([
    { idPersona: 25, nombre: 'Persona' },
    { idPersona: 25, nombre: 'Duplicado' },
    { idPersona: 26, nombre: 'Otra' }
  ]);

  assert.deepEqual(personas.map((persona) => persona.idPersona), [25, 26]);
});

test('cliente recibe CLIENTE automáticamente y no requiere un rol interno', () => {
  const politica = evaluarRolesIniciales(['CLIENTE'], [], [rol('CLIENTE')]);

  assert.equal(politica.rolesValidos, true);
  assert.deepEqual(politica.codigosRolesEfectivos, ['CLIENTE']);
});

test('relación doble exige CLIENTE y admite múltiples roles internos opcionales', () => {
  const relaciones = ['TRABAJADOR', 'CLIENTE'] as const;
  const roles = [rol('CLIENTE'), rol('RRHH'), rol('AUDITOR')];

  const sinRolesInternos = evaluarRolesIniciales([...relaciones], [], roles);
  assert.equal(sinRolesInternos.rolesValidos, true);
  assert.deepEqual(sinRolesInternos.codigosRolesEfectivos, ['CLIENTE']);

  const conVariosInternos = evaluarRolesIniciales([...relaciones], ['RRHH', 'AUDITOR'], roles);
  assert.equal(conVariosInternos.rolesValidos, true);
  assert.deepEqual(conVariosInternos.codigosRolesEfectivos, ['CLIENTE', 'RRHH', 'AUDITOR']);
});

test('no ofrece ni permite asignar roles protegidos sin autorización', () => {
  const politica = evaluarRolesIniciales(
    ['TRABAJADOR'],
    ['ADMIN_PROTEGIDO'],
    [rol('ADMIN_PROTEGIDO', false)]
  );

  assert.deepEqual(politica.rolesInternosDisponibles, []);
  assert.equal(politica.rolesValidos, false);
});

test('administrador y gerencia con permisos efectivos pueden asignar roles internos activos del backend', () => {
  const permisos = new Set<Permission>([
    'users.create',
    'users.assign_role',
    'roles.assign_permissions'
  ]);
  const roles = [
    rol('ADMINISTRADOR', false),
    rol('GERENCIA', false),
    rol('LOGISTICA', false),
    rol('OPERACIONES', false),
    rol('RRHH', true),
    rol('CLIENTE', false),
    { ...rol('INACTIVO', false), activo: false }
  ];

  const rolesActuales: RoleName[] = ['Administrador', 'Gerencia'];
  for (const rolActual of rolesActuales) {
    const puedeAsignarProtegidos = puedeAsignarRolesInternosProtegidos([rolActual], permisos);
    assert.equal(puedeAsignarProtegidos, true);
    const politica = evaluarRolesIniciales(['TRABAJADOR'], [], roles, puedeAsignarProtegidos);
    assert.deepEqual(
      politica.rolesInternosDisponibles.map((disponible) => disponible.codigo),
      ['ADMINISTRADOR', 'GERENCIA', 'LOGISTICA', 'OPERACIONES', 'RRHH']
    );
  }
});

test('el bypass requiere rol privilegiado y todos los permisos efectivos', () => {
  const permisos = new Set<Permission>([
    'users.create',
    'users.assign_role',
    'roles.assign_permissions'
  ]);

  assert.equal(
    puedeAsignarRolesInternosProtegidos(['RRHH' as RoleName], permisos),
    false
  );
  assert.equal(
    puedeAsignarRolesInternosProtegidos(['Administrador'], new Set(['users.create', 'users.assign_role'] as Permission[])),
    false
  );
  const politica = evaluarRolesIniciales(
    ['TRABAJADOR'],
    ['ADMINISTRADOR'],
    [rol('ADMINISTRADOR', false)],
    false
  );
  assert.deepEqual(politica.rolesInternosDisponibles, []);
  assert.equal(politica.rolesValidos, false);
});

test('Usuarios y roles exige ADMINISTRADOR o GERENCIA además del permiso efectivo', () => {
  const permisosAdministrativos = new Set<Permission>([
    'users.view',
    'users.create',
    'users.assign_role',
    'users.activate',
    'users.deactivate'
  ]);

  assert.equal(
    puedeAdministrarCuentas(['RRHH' as RoleName], permisosAdministrativos, 'users.view'),
    false
  );
  assert.equal(
    puedeAdministrarCuentas(['Administrador'], permisosAdministrativos, 'users.view'),
    true
  );
  assert.equal(
    puedeAdministrarCuentas(['Gerencia'], permisosAdministrativos, ['users.create', 'users.assign_role']),
    true
  );
  assert.equal(
    puedeAdministrarCuentas(['Gerencia'], new Set(['users.create'] as Permission[]), ['users.create', 'users.assign_role']),
    false
  );
});

test('CLIENTE solo aparece como rol obligatorio con relación CRM y rol activo autorizado', () => {
  const roles = [rol('CLIENTE', false), rol('LOGISTICA', false)];
  const conVinculoCrm = evaluarRolesIniciales(['CLIENTE'], [], roles, true);
  const sinVinculoCrm = evaluarRolesIniciales(['TRABAJADOR'], ['CLIENTE'], roles, true);

  assert.equal(conVinculoCrm.rolClienteDisponible, true);
  assert.deepEqual(conVinculoCrm.codigosRolesEfectivos, ['CLIENTE']);
  assert.equal(sinVinculoCrm.codigosRolesEfectivos.includes('CLIENTE'), false);
  assert.equal(sinVinculoCrm.rolesValidos, false);
});

test('selección múltiple de roles conserva selecciones y permite quitarlas', () => {
  const seleccionados = alternarRolSeleccionado([], 'RRHH');
  const varios = alternarRolSeleccionado(seleccionados, 'AUDITOR');

  assert.deepEqual(varios, ['RRHH', 'AUDITOR']);
  assert.deepEqual(alternarRolSeleccionado(varios, 'RRHH'), ['AUDITOR']);
});

test('correo principal requiere formato, pero no verificación inicial', () => {
  assert.equal(correoPrincipalValido('principal@example.test'), true);
  assert.equal(correoPrincipalValido(null), false);
  assert.equal(correoPrincipalValido('correo-invalido'), false);
});

test('la advertencia de correo faltante solo aparece para una persona seleccionada', () => {
  assert.equal(debeMostrarAdvertenciaCorreoFaltante(false, undefined), false);
  assert.equal(debeMostrarAdvertenciaCorreoFaltante(true, undefined), true);
  assert.equal(debeMostrarAdvertenciaCorreoFaltante(true, ''), true);
  assert.equal(debeMostrarAdvertenciaCorreoFaltante(true, 'persona@example.test'), false);
});
