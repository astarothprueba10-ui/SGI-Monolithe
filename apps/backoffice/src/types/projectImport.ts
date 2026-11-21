export interface FilaImportacion {
  hoja: string;
  numero: number;
  celdas: Record<string, string>;
}
export interface SolicitudImportacion {
  versionPlantilla: number;
  codigoProyecto: string;
  filas: FilaImportacion[];
  huella?: string;
}
export interface ResultadoImportacion {
  hoja: string;
  numero: number;
  codigo: string;
  estado: 'NUEVO' | 'EXISTENTE' | 'ERROR' | 'BORRADOR';
  mensaje: string;
}
export interface RespuestaImportacion {
  huella: string;
  filas: ResultadoImportacion[];
  confirmado: boolean;
}
