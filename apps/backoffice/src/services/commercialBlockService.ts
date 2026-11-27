import {coreApi} from '../lib/apiClient';
export type EstadoManzana='ACTIVA'|'INACTIVA'|'BLOQUEADA_COMERCIALMENTE'|'VENDIDA';
export interface ZonaManzana {id:number;codigo:string;nombre:string;activa:boolean}
export interface EtapaManzana {codigo:string;nombre:string;habilitada:boolean}
export interface ManzanaComercial {id:number;codigo:string;nombre:string|null;orden:number;codigoEtapa:string|null;nombreEtapa:string|null;estado:EstadoManzana;activa:boolean;lotes:number;vendidos:number;zonas:ZonaManzana[]}
export interface ListadoManzanas {revision:number;publicado:boolean;etapas:EtapaManzana[];zonas:ZonaManzana[];manzanas:ManzanaComercial[];codigoSugerido:string;nombreSugerido:string}
export interface CambioManzana {id:number|null;revision:number;codigo:string;nombre:string;codigoEtapa:string;activa:boolean;zonas:number[]}
export const etiquetasManzana:Record<EstadoManzana,string>={ACTIVA:'Activa',INACTIVA:'Inactiva',BLOQUEADA_COMERCIALMENTE:'Bloqueada comercialmente',VENDIDA:'Vendida'};
export function estadoManzana(activa:boolean,lotes:number,vendidos:number,habilitada:boolean):EstadoManzana{
 if(lotes>0&&lotes===vendidos)return 'VENDIDA';
 if(!activa)return 'INACTIVA';
 return habilitada?'ACTIVA':'BLOQUEADA_COMERCIALMENTE';
}
const ruta=(id:number)=>`/proyectos/${id}/manzanas-comerciales`;
export const commercialBlockService={
 listar:(id:number)=>coreApi.get<ListadoManzanas>(ruta(id)),
 guardar:(id:number,cambio:CambioManzana)=>coreApi.put<ListadoManzanas>(ruta(id),{...cambio})
};
