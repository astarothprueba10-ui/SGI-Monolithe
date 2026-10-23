import assert from 'node:assert/strict';
import test from 'node:test';
import type { SecurityRole } from '../src/services/securityApi';
import type { Permission, RoleName } from '../src/types';
import { puedeAdministrarCuentas } from '../src/lib/securityAccess.ts';
import { motivoBloqueoDesactivacion, validarNombreRol } from '../src/components/users/roleManagementPolicy.ts';

function rol(codigo: string, nombre = codigo, esSistema = false): SecurityRole {
  return {
    idRol: codigo.length,
    codigo,
    nombre,
    descripcion: null,
    esSistema,
    activo: true,
    asignableRrhh: false,
    cantidadPermisos: 0,
    cantidadUsuarios: 0
  };
}

test('rechaza nombres duplicados ignorando mayúsculas y espacios extremos', () => {
  const roles = [rol('RRHH', 'Recursos Humanos'), rol('GERENCIA', 'Gerencia')];

  assert.equal(validarNombreRol('  recursos humanos ', 'GERENCIA', roles), 'Ya existe un rol con ese nombre.');
  assert.equal(validarNombreRol('Recursos Humanos', 'RRHH', roles), null);
  assert.equal(validarNombreRol('X', 'RRHH', roles), 'El nombre debe tener entre 2 y 100 caracteres.');
});

test('protege roles del sistema y códigos críticos contra desactivación', () => {
  assert.notEqual(motivoBloqueoDesactivacion(rol('ADMINISTRADOR')), null);
  assert.notEqual(motivoBloqueoDesactivacion(rol('GERENCIA')), null);
  assert.notEqual(motivoBloqueoDesactivacion(rol('CLIENTE')), null);
  assert.notEqual(motivoBloqueoDesactivacion(rol('PERSONALIZADO', 'Personalizado', true)), null);
  assert.equal(motivoBloqueoDesactivacion(rol('PERSONALIZADO')), null);
});

test('bloquea desactivar roles personalizados con usuarios activos asignados', () => {
  const asignadoActivo = { ...rol('PERSONALIZADO'), cantidadUsuarios: 1 };
  const sinUsuariosActivos = { ...rol('PERSONALIZADO'), cantidadUsuarios: 0 };

  assert.equal(
    motivoBloqueoDesactivacion(asignadoActivo),
    'No se puede desactivar un rol asignado a usuarios activos.'
  );
  assert.equal(motivoBloqueoDesactivacion(sinUsuariosActivos), null);
});

test('la gestión de roles requiere ADMINISTRADOR o GERENCIA y el permiso específico', () => {
  const permisos = new Set<Permission>(['roles.edit', 'roles.deactivate', 'roles.activate']);

  assert.equal(puedeAdministrarCuentas(['Administrador'], permisos, 'roles.edit'), true);
  assert.equal(puedeAdministrarCuentas(['Gerencia'], permisos, 'roles.deactivate'), true);
  assert.equal(puedeAdministrarCuentas(['RRHH' as RoleName], permisos, 'roles.activate'), false);
  assert.equal(
    puedeAdministrarCuentas(['Administrador'], new Set<Permission>(['roles.edit']), 'roles.deactivate'),
    false
  );
});
