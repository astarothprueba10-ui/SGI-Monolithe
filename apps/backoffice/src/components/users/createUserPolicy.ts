import type { AvailablePerson, PersonaRelacion, SecurityRole } from '../../services/securityApi';
import type { Permission, RoleName } from '../../types';
import { puedeAdministrarCuentas } from '../../lib/securityAccess.ts';

export const CODIGO_ROL_CLIENTE = 'CLIENTE';

export interface InitialRolePolicy {
  esTrabajador: boolean;
  esCliente: boolean;
  relacionesValidas: boolean;
  rolesInternosDisponibles: SecurityRole[];
  rolesInternosSeleccionados: string[];
  rolClienteDisponible: boolean;
  codigosRolesEfectivos: string[];
  rolesValidos: boolean;
}

export function personasUnicasPorId<T extends Pick<AvailablePerson, 'idPersona'>>(
  personas: T[]
): T[] {
  return [...new Map(personas.map((persona) => [persona.idPersona, persona])).values()];
}

export function alternarRolSeleccionado(seleccionados: string[], codigo: string): string[] {
  return seleccionados.includes(codigo)
    ? seleccionados.filter((actual) => actual !== codigo)
    : [...seleccionados, codigo];
}

export function puedeAsignarRolesInternosProtegidos(
  rolesActuales: readonly RoleName[],
  permisos: ReadonlySet<Permission>
): boolean {
  return puedeAdministrarCuentas(rolesActuales, permisos, [
    'users.create',
    'users.assign_role',
    'roles.assign_permissions'
  ]);
}

export function personaElegibleParaSeleccion(
  persona: Pick<AvailablePerson, 'elegible' | 'relaciones'>
): boolean {
  const relaciones = persona.relaciones ?? [];
  const relacionesValidas = relaciones.some((relacion) =>
    relacion === 'TRABAJADOR' || relacion === 'CLIENTE'
  );

  return persona.elegible && relacionesValidas;
}

export function evaluarRolesIniciales(
  relaciones: PersonaRelacion[] | undefined,
  seleccionados: string[],
  roles: SecurityRole[],
  puedeAsignarRolesProtegidos = false
): InitialRolePolicy {
  const tiene = (relacion: PersonaRelacion) => (relaciones ?? []).includes(relacion);
  const esTrabajador = tiene('TRABAJADOR');
  const esCliente = tiene('CLIENTE');
  const relacionesValidas = esTrabajador || esCliente;
  const rolesInternosDisponibles = roles.filter((rol) =>
    rol.activo &&
    (puedeAsignarRolesProtegidos || rol.asignableRrhh) &&
    rol.codigo.toUpperCase() !== CODIGO_ROL_CLIENTE
  );
  const rolClienteDisponible = roles.some((rol) =>
    rol.codigo.toUpperCase() === CODIGO_ROL_CLIENTE &&
    rol.activo &&
    (puedeAsignarRolesProtegidos || rol.asignableRrhh)
  );
  const rolesInternosSeleccionados = seleccionados.filter((codigo) =>
    codigo.toUpperCase() !== CODIGO_ROL_CLIENTE &&
    rolesInternosDisponibles.some((rol) => rol.codigo === codigo)
  );
  const codigosRolesEfectivos = [
    ...(esCliente ? [CODIGO_ROL_CLIENTE] : []),
    ...rolesInternosSeleccionados
  ];
  const rolesValidos = relacionesValidas &&
    (!esCliente || rolClienteDisponible) &&
    (!esTrabajador || esCliente || rolesInternosSeleccionados.length > 0);

  return {
    esTrabajador,
    esCliente,
    relacionesValidas,
    rolesInternosDisponibles,
    rolesInternosSeleccionados,
    rolClienteDisponible,
    codigosRolesEfectivos,
    rolesValidos
  };
}

export function correoPrincipalValido(correo: string | null | undefined): boolean {
  return Boolean(
    correo &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())
  );
}

export function debeMostrarAdvertenciaCorreoFaltante(
  personaSeleccionada: boolean,
  correo: string | null | undefined
): boolean {
  return personaSeleccionada && !correo;
}
