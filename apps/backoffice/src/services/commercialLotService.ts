import {coreApi} from '../lib/apiClient';
import type {LoteResponse} from '../types/core';
import type {ListadoManzanas} from './commercialBlockService';
export interface FilaLote {lote:LoteResponse;codigoEtapa:string|null;nombreEtapa:string|null;estado:string;precio:number|null;protegido:boolean}
export interface IdentidadLote {codigo:string;numero:string}
export interface ListadoLotes {catalogo:ListadoManzanas;lotes:FilaLote[];sugerencias:Record<string,IdentidadLote>}
export interface ConsultaLote {idLote:number|null;idManzana:number;idZona:number;codigoEtapa:string;areaM2:number}
export interface VistaLote extends IdentidadLote {revision:number;estado:string;precioBase:number|null;adicional:number|null;ajusteHistorico:number|null;descuento:number|null;precioFinal:number|null;mensaje:string;calculado:boolean}
export interface CambioLote {revision:number;ubicacion:ConsultaLote;frenteM:number|null;fondoM:number|null;lateralDerechoM:number|null;lateralIzquierdoM:number|null;observaciones:string|null;codigoRevisado:string;numeroRevisado:string;precioRevisado:number|null}
export const estadoLote=(s:string)=>({DISPONIBLE:'Disponible',NO_DISPONIBLE:'No disponible',BLOQUEADO_COMERCIALMENTE:'Bloqueado comercialmente',BLOQUEADO:'Bloqueado',RESERVADO:'Separado / reservado',VENDIDO:'Vendido'} as Record<string,string>)[s]??s;
export const soles=(n:number|null|undefined)=>n==null?'—':new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(n);
const ruta=(id:number)=>`/proyectos/${id}/lotes-comerciales`;
export const commercialLotService={
 listar:(id:number)=>coreApi.get<ListadoLotes>(ruta(id)),
 revisar:(id:number,q:ConsultaLote)=>coreApi.post<VistaLote>(ruta(id)+'/revisar',{...q}),
 guardar:(id:number,q:CambioLote)=>coreApi.put<ListadoLotes>(ruta(id),{...q})
};
