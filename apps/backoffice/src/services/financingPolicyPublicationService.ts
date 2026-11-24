import { authSecuredApi } from '../lib/apiClient';
import type { PoliticaFinanciamientoActual } from './financingConfigService';

/** La normalización y el hash definitivo se calculan exclusivamente en PostgreSQL. */
export interface BorradorFinanciero {
  idProyecto?: number;
  modoAplicacion?: 'GENERAL' | 'PROPIA';
  idPoliticaBase?: number;
  idPoliticaProyectoBase?: number | null;
  montoSeparacion: number | null;
  modoInicial: 'MINIMA' | 'RANGO' | 'FIJA';
  inicialMinima: number | null;
  inicialMaxima: number | null;
  inicialFija: number | null;
  tasaNominalAnualPct: number | null;
  cuotasMin: number | null;
  cuotasMax: number | null;
  diasVencimientoSeparacion: number | null;
  sistemaAmortizacion: 'FRANCES';
  moneda: 'PEN';
  motivoPublicacion: string;
}

export interface VistaPreviaPolitica {
  versionActual: number;
  versionNueva: number;
  idPoliticaActual: number;
  condiciones: BorradorFinanciero;
  hashPropuesta: string;
  publicacionHabilitada: boolean;
  mensaje: string;
}
export interface ResultadoEnsayoTotp {
  ensayoValidado: true;
  publicacionRealizada: false;
  versionEsperada: number;
  hashPropuesta: string;
}
export interface AutorizacionPolitica {
  autorizacionId: string;
  expiraEnSegundos: number;
  hashPropuesta: string;
  publicacionHabilitada: boolean;
}
export interface ResultadoPublicacionPolitica {
  idPolitica: number;
  idPoliticaAnterior: number;
  version: number;
  eventoAuditoria: number;
  publicado: boolean;
  hashPropuesta: string;
}

export const crearBorradorPolitica = (p: PoliticaFinanciamientoActual): BorradorFinanciero => ({
  ...(p.idProyecto ? {idProyecto:p.idProyecto,modoAplicacion:p.modoAplicacion ?? 'GENERAL',
    idPoliticaBase:p.idPolitica,idPoliticaProyectoBase:p.idPoliticaProyecto ?? null} : {}),
  montoSeparacion: p.montoSeparacion,
  modoInicial: p.modoInicial,
  inicialMinima: p.inicialMinima,
  inicialMaxima: p.inicialMaxima,
  inicialFija: p.inicialFija,
  tasaNominalAnualPct: p.tasaNominalAnualPct,
  cuotasMin: p.cuotasMin,
  cuotasMax: p.cuotasMax,
  diasVencimientoSeparacion: p.diasVencimientoSeparacion,
  sistemaAmortizacion: 'FRANCES',
  moneda: 'PEN',
  motivoPublicacion: ''
});

export const financingPolicyPublicationService = {
  previsualizar: (versionEsperada: number, borrador: BorradorFinanciero) =>
    authSecuredApi.post<VistaPreviaPolitica>('/financing-policies/preview',
      { versionEsperada, borrador }),
  ensayarTotp: (versionEsperada: number, borrador: BorradorFinanciero, codigo: string) =>
    authSecuredApi.post<ResultadoEnsayoTotp>('/financing-mfa/rehearse',
      { versionEsperada, borrador, codigo }),
  autorizar: (versionEsperada: number, borrador: BorradorFinanciero, codigo: string, nonce: string) =>
    authSecuredApi.post<AutorizacionPolitica>('/financing-mfa/authorize',
      { versionEsperada, borrador, codigo, nonce }),
  publicar: (versionEsperada: number, borrador: BorradorFinanciero,
    autorizacionId: string, nonce: string) =>
    authSecuredApi.post<ResultadoPublicacionPolitica>('/financing-policies/publish',
      { versionEsperada, borrador, autorizacionId, nonce, confirmacionExplicita: true })
};
