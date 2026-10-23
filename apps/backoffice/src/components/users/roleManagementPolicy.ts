import type { SecurityRole } from '../../services/securityApi';

const ROLE_CODES_PROTECTED_FROM_DEACTIVATION = new Set([
  'ADMINISTRADOR',
  'GERENCIA',
  'CLIENTE'
]);

/** Valida el nombre del rol y detecta duplicados por código estable. */
export function validarNombreRol(
  nombre: string,
  codigoActual: string,
  roles: readonly SecurityRole[]
): string | null {
  const limpio = nombre.trim();
  if (limpio.length < 2 || limpio.length > 100) {
    return 'El nombre debe tener entre 2 y 100 caracteres.';
  }

  const duplicado = roles.some((rol) =>
    rol.codigo !== codigoActual && rol.nombre.trim().toLowerCase() === limpio.toLowerCase()
  );
  return duplicado ? 'Ya existe un rol con ese nombre.' : null;
}

/** Devuelve el motivo por el que un rol activo no puede desactivarse desde Backoffice. */
export function motivoBloqueoDesactivacion(rol: SecurityRole): string | null {
  if (rol.esSistema || ROLE_CODES_PROTECTED_FROM_DEACTIVATION.has(rol.codigo.toUpperCase())) {
    return 'Los roles del sistema y los roles protegidos no se pueden desactivar.';
  }
  if (rol.cantidadUsuarios > 0) {
    return 'No se puede desactivar un rol asignado a usuarios activos.';
  }
  return null;
}
