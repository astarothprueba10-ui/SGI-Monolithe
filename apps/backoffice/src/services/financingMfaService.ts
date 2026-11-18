import { authSecuredApi } from '../lib/apiClient';

export interface EstadoMfaFinanciero {
  configurado: boolean;
  correoPrincipalVerificado: boolean;
  habilitado: boolean;
  enrolamientoPendiente: boolean;
  publicacionHabilitada: boolean;
  requiereTotp: true;
}
export interface InicioMfa { mensaje: string }
export interface SecretoMfa { secreto: string; otpauthUri: string }
export interface ConfirmacionMfa { habilitado: true; codigosRecuperacion: string[] }

const base = '/financing-mfa';
/** Las operaciones de seguridad siempre usan el JWT y nunca se guardan en storage del navegador. */
export const financingMfaService = {
  estado: () => authSecuredApi.get<EstadoMfaFinanciero>(base + '/status', { cache: 'no-store' }),
  iniciar: (contrasenaActual: string) =>
    authSecuredApi.post<InicioMfa>(base + '/start', { contrasenaActual }),
  enrolar: (codigo: string) =>
    authSecuredApi.post<SecretoMfa>(base + '/enroll', { codigo }),
  confirmar: (codigo: string) =>
    authSecuredApi.post<ConfirmacionMfa>(base + '/confirm', { codigo }),
  revocar: (codigoEmail: string, codigoTotp: string) =>
    authSecuredApi.post<InicioMfa>(base + '/revoke', { codigoEmail, codigoTotp }),
  recuperar: (codigoEmail: string, codigoRecuperacion: string) =>
    authSecuredApi.post<InicioMfa>(base + '/recover', { codigoEmail, codigoRecuperacion })
};
