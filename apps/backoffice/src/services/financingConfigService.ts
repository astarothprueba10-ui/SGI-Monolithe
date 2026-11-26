import { authSecuredApi, coreApi } from '../lib/apiClient';

/** Catálogo financiero de SOLO LECTURA hasta completar MFA y publicación auditada. */
export interface PoliticaFinanciamientoVersion {
  idPolitica: number;
  version: number;
  vigenteDesde: string;
  publicadoEn: string;
  motivo: string;
  idPublicador: number | null;
  nombrePublicador?: string | null;
}

export interface PoliticaFinanciamientoActual {
  codigo: string;
  idProyecto?: number;
  modoAplicacion?: 'GENERAL' | 'PROPIA';
  idPoliticaProyecto?: number | null;
  versionSiguiente?: number;
  politicaGeneral?: PoliticaFinanciamientoActual;
  version: number;
  idPolitica: number;
  vigenteDesde: string;
  montoSeparacion: number;
  modoInicial: 'MINIMA' | 'RANGO' | 'FIJA';
  inicialMinima: number | null;
  inicialMaxima: number | null;
  inicialFija: number | null;
  tasaNominalAnualPct: number;
  cuotasMin: number;
  cuotasMax: number;
  diasVencimientoSeparacion: number;
  sistemaAmortizacion: 'FRANCES';
  moneda: 'PEN';
  historial: PoliticaFinanciamientoVersion[];
  publicacionHabilitada: boolean;
  requiereTotp: true;
}

export const financingConfigService = {
  /** Actor y permisos se extraen del JWT de Core; SQL valida rol GERENCIA activo. */
  obtenerPoliticaActual: (idProyecto?: number) =>
    idProyecto ? authSecuredApi.get<PoliticaFinanciamientoActual>(`/financing-policies/projects/${idProyecto}`, { cache: 'no-store' })
      : import.meta.env.VITE_FINANCING_STAGING_AUTH_CURRENT === 'true'
      ? authSecuredApi.get<PoliticaFinanciamientoActual>('/financing-policies/current', { cache: 'no-store' })
      : coreApi.get<PoliticaFinanciamientoActual>('/crm/financiamiento/configuracion/actual')
};
