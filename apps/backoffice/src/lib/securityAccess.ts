import type { Permission, RoleName } from '../types';

export function tieneRolAdministradorDeCuentas(roles: readonly RoleName[]): boolean {
  return roles.includes('Administrador') || roles.includes('Gerencia');
}

export function puedeAdministrarCuentas(
  roles: readonly RoleName[],
  permisos: ReadonlySet<Permission>,
  permisosRequeridos: Permission | readonly Permission[]
): boolean {
  const requeridos = Array.isArray(permisosRequeridos)
    ? permisosRequeridos
    : [permisosRequeridos];

  return tieneRolAdministradorDeCuentas(roles) &&
    requeridos.every((permiso) => permisos.has(permiso));
}
