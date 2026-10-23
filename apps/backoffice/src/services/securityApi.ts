import { getAccessToken } from '../lib/authSession';

const BASE_URL = (
  import.meta.env.VITE_AUTH_API_URL ?? '/api/auth'
).replace(/\/auth\/?$/, '/security');

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
  descripcion: string | null;
  esSistema: boolean;
  activo: boolean;
  asignableRrhh: boolean;
  cantidadPermisos: number;
  cantidadUsuarios: number;
}

export type PersonaRelacion = 'TRABAJADOR' | 'CLIENTE';

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
  /** Correo principal activo de la persona; null cuando no existe. */
  correo: string | null;
  /** Dato informativo; la verificación no condiciona la creación inicial de cuenta. */
  correoVerificado: boolean;
  /** Relaciones vigentes obtenidas por Supabase; una persona puede tener ambas. */
  relaciones: PersonaRelacion[];
  /** Elegibilidad general calculada por Supabase; el frontend no debe recomputarla. */
  elegible: boolean;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  documentoVerificado: boolean;
  documentoActivo: boolean;
}

export interface SecurityOperationResponse {
  estado: string;
  mensaje: string;
}

export interface AuditRole {
  codigo: string;
  nombre: string;
}

export interface AuditEvent {
  idEvento: number;
  fechaEvento: string;

  idUsuario: number | null;
  usuarioLogin: string | null;
  nombreUsuario: string | null;
  roles: AuditRole[];

  modulo: string;
  accion: string;

  entidad: string | null;
  idEntidad: string | null;

  resultado: 'EXITOSO' | 'FALLIDO' | 'DENEGADO';
  descripcion: string | null;

  ipOrigen: string | null;
  userAgent: string | null;
  requestId: string | null;
  metodoHttp: string | null;
  ruta: string | null;

  datosAntes: unknown | null;
  datosDespues: unknown | null;
  datosContexto: unknown | null;
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
  actualizarRol: (codigoRol: string, nombre: string, descripcion: string | null) =>
    request<SecurityOperationResponse>(`/roles/${encodeURIComponent(codigoRol)}`, {
      method: 'PUT',
      body: JSON.stringify({ nombre, descripcion })
    }),
  desactivarRol: (codigoRol: string) =>
    request<SecurityOperationResponse>(
      `/roles/${encodeURIComponent(codigoRol)}/deactivate`,
      { method: 'PATCH' }
    ),
  reactivarRol: (codigoRol: string) =>
    request<SecurityOperationResponse>(
      `/roles/${encodeURIComponent(codigoRol)}/activate`,
      { method: 'PATCH' }
    ),
  listarPermisosRol: (codigoRol: string) =>
    request<SecurityPermission[]>(
      `/roles/${encodeURIComponent(codigoRol)}/permissions`
    ),

  listarPersonasDisponibles: (): Promise<AvailablePerson[]> =>
    request<AvailablePerson[]>('/people/available'),

  crearUsuario: (payload: {
    idPersona: number;
    usuarioLogin: string;
    codigosRol: string[];
  }) =>
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
    ),

  listarAuditoria: () =>
    request<AuditEvent[]>('/audit')
};

