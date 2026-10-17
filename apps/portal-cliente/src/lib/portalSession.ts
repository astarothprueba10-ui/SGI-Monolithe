export interface PortalSessionUser {
  idUsuario: number;
  usuario: string;
  nombreMostrar?: string | null;
  iniciales?: string | null;
  autoridades: string[];
  requiereCambioPassword: boolean;
}

export function getPortalSessionUser(): PortalSessionUser | null {
  const raw =
    localStorage.getItem('monolithe_user') ??
    sessionStorage.getItem('monolithe_user');

  if (!raw) return null;

  try {
    const data: unknown = JSON.parse(raw);

    if (
      typeof data !== 'object' ||
      data === null ||
      !('idUsuario' in data) ||
      typeof data.idUsuario !== 'number' ||
      !('autoridades' in data) ||
      !Array.isArray(data.autoridades)
    ) {
      return null;
    }

    return data as PortalSessionUser;
  } catch {
    return null;
  }
}

export function getPortalVisualIdentity() {
  const user = getPortalSessionUser();

  return {
    nombreMostrar: user?.nombreMostrar?.trim() || 'Cliente',
    iniciales: user?.iniciales?.trim().toUpperCase() || 'CL'
  };
}