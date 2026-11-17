import { coreApi } from '../lib/apiClient';

/** Catálogo financiero de SOLO LECTURA hasta completar MFA y publicación auditada. */
export interface PoliticaFinanciamientoVersion {
  idPolitica: number;
  version: number;
  vigenteDesde: string;
  publicadoEn: string;
  motivo: string;
  idPublicador: number | null;
}

export interface PoliticaFinanciamientoActual {
  codigo: 'GENERAL';
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
  obtenerPoliticaActual: () =>
    coreApi.get<PoliticaFinanciamientoActual>('/crm/financiamiento/configuracion/actual')
};
