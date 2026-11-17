/** 5.4.5: respuestas privadas; los listados nunca contienen claves de Storage. */
export type TipoDocumentoPortal = 'CONTRATO' | 'ANEXO';

export interface PortalDocumentoPublicado {
  tipo: TipoDocumentoPortal;
  idDocumento: number;
  idContrato: number;
  idVenta: number;
  codigoVenta: string;
  codigoContrato: string;
  categoria: string;
  nombre: string;
  numeroVersion: number;
  fechaPublicacion: string;
  nombreArchivo: string;
  tamanioBytes: number;
}
export interface PortalDocumentosResponse {
  items: PortalDocumentoPublicado[];
  total: number;
  advertencia: string;
}
export interface PortalEnlaceDocumento {
  urlLectura: string;
  nombreArchivo: string;
  tipoMime: 'application/pdf';
  expiresInSeconds: number;
}
export type NivelAlertaPortal = 'critico'|'atencion'|'info';
export interface PortalAlertaReal {
  id: string;
  tipo: 'CUOTA_VENCIDA'|'CUOTA_PROXIMA'|'VOUCHER_PENDIENTE'
    |'VOUCHER_RECHAZADO'|'DOCUMENTO_PUBLICADO';
  nivel: NivelAlertaPortal;
  titulo: string;
  detalle: string;
  ruta: '/portal/cronograma'|'/portal/pagos'|'/portal/documentos';
  accion: string;
}
export interface PortalAlertasResponse {
  items: PortalAlertaReal[];
  total: number;
  fechaCorte: string;
  fuente: 'CRONOGRAMA_VOUCHERS_DOCUMENTOS_REALES';
}
