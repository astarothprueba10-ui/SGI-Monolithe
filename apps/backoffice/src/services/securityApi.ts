import { getAccessToken } from '../lib/authSession';

const BASE_URL = '/api/security';

export interface SecurityUserRole {
  idRol: number;
  codigo: string;
  nombre: string;
}

export interface SecurityUser {
  idUsuario: number;
  idPersona: number;
  nombreCompleto: string;
  usuarioLogin: string;
  correo: string | null;
  estado: string;
  estadoNombre: string;
  ultimoAcceso: string | null;
  requiereCambioPassword: boolean;
  passwordTemporalExpiraEn: string | null;
  roles: SecurityUserRole[];
  gestionable: boolean;
}

export interface SecurityRole {
  idRol: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  esSistema: boolean;
  activo: boolean;
  asignableRrhh: boolean;
  cantidadPermisos: number;
  cantidadUsuarios: number;
}

export interface SecurityPermission {
  idPermiso: number;
  codigo: string;
  modulo: string;
  recurso: string;
  accion: string;
  nombre: string;
  descripcion: string;
  asignado: boolean;
}

export interface AvailablePerson {
  idPersona: number;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombreCompleto: string;
  correo: string | null;
  correoVerificado: boolean;
  tipoPersona: 'TRABAJADOR' | 'CLIENTE';
  elegible: boolean;
}

export interface SecurityOperationResponse {
  estado: string;
  mensaje: string;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();

  if (!token) {
    throw new Error('No existe una sesión autenticada.');
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.mensaje ??
      `Error ${response.status} al consultar seguridad.`
    );
  }

  return data as T;
}

export interface CreatedUserResponse {
  idUsuario: number;
  estado: string;
  mensaje: string;
}

export const securityApi = {
  listarUsuarios: () =>
    request<SecurityUser[]>('/users'),

  listarRoles: () =>
    request<SecurityRole[]>('/roles'),
  crearRol: (nombre: string) =>
    request<SecurityOperationResponse>('/roles', {
      method: 'POST',
      body: JSON.stringify({ nombre })
    }),
  listarPermisosRol: (codigoRol: string) =>
    request<SecurityPermission[]>(
      `/roles/${encodeURIComponent(codigoRol)}/permissions`
    ),

  listarPersonasDisponibles: () =>
    request<AvailablePerson[]>('/people/available'),

  crearUsuario: (payload: { idPersona: number; usuarioLogin: string }) =>
    request<CreatedUserResponse>('/users', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  asignarRol: (idUsuario: number, codigoRol: string) =>
    request<SecurityOperationResponse>(`/users/${idUsuario}/roles`, {
      method: 'POST',
      body: JSON.stringify({ codigoRol })
    }),

  actualizarPermisosRol: (
    codigoRol: string,
    permisos: string[]
  ) =>
    request<SecurityOperationResponse>(
      `/roles/${encodeURIComponent(codigoRol)}/permissions`,
      {
        method: 'PUT',
        body: JSON.stringify({ permisos })
      }
    ),

  activarUsuario: (idUsuario: number) =>
    request<SecurityOperationResponse>(
      `/users/${idUsuario}/activate`,
      { method: 'PATCH' }
    ),

  desactivarUsuario: (idUsuario: number) =>
    request<SecurityOperationResponse>(
      `/users/${idUsuario}/deactivate`,
      { method: 'PATCH' }
    ),

  asociarCorreoPersona: (idPersona: number, correo: string) =>
    request<SecurityOperationResponse>(
      `/people/${idPersona}/email`,
      {
        method: 'POST',
        body: JSON.stringify({ correo })
      }
    ),

  revocarRol: (idUsuario: number, codigoRol: string) =>
    request<SecurityOperationResponse>(
      `/users/${idUsuario}/roles/${encodeURIComponent(codigoRol)}`,
      { method: 'DELETE' }
    ),

  reemplazarRol: (
    idUsuario: number,
    codigoRolActual: string,
    codigoRolNuevo: string
  ) =>
    request<SecurityOperationResponse>(
      `/users/${idUsuario}/roles/${encodeURIComponent(codigoRolActual)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ codigoRol: codigoRolNuevo })
      }
    ),
  actualizarUsuario: (idUsuario: number, usuarioLogin: string) =>
    request<SecurityOperationResponse>(
      `/users/${idUsuario}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ usuarioLogin })
      }
    )
};

