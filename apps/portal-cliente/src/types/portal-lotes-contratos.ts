/** 5.4.2. Datos entregados por Core Service y filtrados por el JWT del comprador. */
export interface PortalProyectoDetalle {
  idProyecto:number;
  codigo:string;
  nombre:string;
  distrito:string|null;
  provincia:string|null;
  departamento:string|null;
  pais:string|null;
  direccion:string|null;
  referencia:string|null;
  areaTotalM2:number|null;
  fechaInicio:string|null;
  fechaFinEstimada:string|null;
}
export interface PortalLoteDetalle {
  idLote:number;
  codigo:string;
  numero:string;
  areaM2:number;
  frenteM:number|null;
  fondoM:number|null;
  lateralDerechoM:number|null;
  lateralIzquierdoM:number|null;
  estado:string;
  tipo:string|null;
  manzana:string|null;
  codigoManzana:string|null;
  etapa:string|null;
}
export interface PortalContratoDetalle {
  idContrato:number;
  codigo:string;
  numero:string|null;
  tipo:string|null;
  estado:string;
  fechaEmision:string|null;
  fechaFirma:string|null;
  fechaInicioVigencia:string|null;
  fechaFinVigencia:string|null;
  documentosPublicados:number;
  anexosPublicados:number;
}
export interface PortalVentaInmobiliaria {
  idVenta:number;
  codigoVenta:string;
  estadoVenta:string;
  esTitular:boolean;
  precioVentaPactado:number;
  proyecto:PortalProyectoDetalle;
  lote:PortalLoteDetalle;
  contratos:PortalContratoDetalle[];
}
export interface PortalLotesContratosResponse {
  total:number;
  items:PortalVentaInmobiliaria[];
  fechaConsulta:string;
  advertenciaPlano:string;
  advertenciaDocumentos:string;
}
