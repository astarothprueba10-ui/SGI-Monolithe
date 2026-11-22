export type SvgFiguraTipo = 'path' | 'rect' | 'circle' | 'ellipse' | 'polygon' | 'polyline' | 'line' | 'text';

export interface SvgFigura {
  tipo: SvgFiguraTipo;
  atributos: Record<string, string>;
  texto: string | null;
  codigoLote: string | null;
}

export interface PlanoSvgDocumento {
  nombreArchivo: string;
  viewBox: number[];
  elementos: SvgFigura[];
}

export interface PlanoSvgProyectoResponse {
  idProyecto: number;
  documento: PlanoSvgDocumento;
  fechaActualizacion: string;
}
