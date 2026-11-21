// Contrato de plantilla v1. No cambiar encabezados sin incrementar la version.
export const VERSION_PLANTILLA = 1;
export const HOJAS_ESTRUCTURA = [
  { nombre: 'EtapasFisicas', columnas: ['codigo', 'nombre', 'codigo_estado', 'orden', 'fecha_inicio', 'fecha_fin_estimada', 'descripcion'] },
  { nombre: 'Zonas', columnas: ['codigo', 'nombre', 'orden', 'descripcion'] },
  { nombre: 'Manzanas', columnas: ['codigo_etapa_fisica', 'codigo', 'nombre', 'codigo_estado', 'orden', 'descripcion'] },
  { nombre: 'Lotes', columnas: ['codigo_etapa_fisica', 'codigo_manzana', 'codigo', 'numero', 'codigo_zona', 'codigo_tipo_lote',
    'area_m2', 'frente_m', 'fondo_m', 'lateral_derecho_m', 'lateral_izquierdo_m', 'observaciones'] },
  { nombre: 'EtapasComerciales', columnas: ['codigo', 'nombre', 'disponibilidad', 'tipo_descuento', 'descuento'] },
  { nombre: 'AsignacionManzanas', columnas: ['codigo_etapa_fisica', 'codigo_manzana', 'codigo_etapa_comercial'] },
  { nombre: 'AsignacionLotes', columnas: ['codigo_lote', 'codigo_etapa_comercial'] },
  { nombre: 'Tarifas', columnas: ['codigo_zona', 'codigo_etapa_comercial', 'moneda', 'tipo_tarifa', 'valor', 'vigente_desde', 'vigente_hasta'] }
] as const;

export const INSTRUCCIONES_PLANTILLA = [
  'Completa solamente las hojas de datos. Conserva los nombres de hojas y encabezados.',
  'Usa códigos, no nombres ni identificadores internos, para las relaciones.',
  'Las manzanas se identifican por código de etapa física y código de manzana. El código de lote debe ser único.',
  'Las fechas deben escribirse como AAAA-MM-DD. Usa números positivos para áreas y medidas, sin símbolos monetarios.',
  'No incluyas fórmulas, celdas combinadas, filas de totales ni macros.',
  'Un lote nuevo no puede quedar disponible para vender hasta que se valide su precio y se publique su configuración comercial.',
  'Las etapas físicas y comerciales son independientes. Una excepción de lote prevalece sobre la asignación de manzana.',
  'Los descuentos solo se aplican a etapas con disponibilidad PROMOCION. Los porcentajes deben ser menores que 100.',
  'MONTO_FIJO en descuentos se expresa en PEN. POR_M2 y MONTO_FIJO son los modos de tarifa.',
  'La importación de estructura física está habilitada. Deja vacías EtapasComerciales, AsignacionManzanas, AsignacionLotes y Tarifas hasta incorporar sus validaciones.'
] as const;
