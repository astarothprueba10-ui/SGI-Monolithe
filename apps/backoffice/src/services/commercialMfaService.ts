import { coreApi } from '../lib/apiClient';

export type CommercialAction='MATRIZ'|'TARIFA'|'DISPONIBILIDAD'|'IMPORTACION'|'PUBLICACION'|'ETAPAS'|'ASIGNACION';
export interface CommercialChallenge {challengeId:string;correo:string;expiraEn:number;reenviarEn:number}
export interface CommercialPrompt {project:number;action:CommercialAction;body:Record<string,unknown>;resolve:(token:string)=>void;reject:(error:Error)=>void}
let listener:((prompt:CommercialPrompt)=>void)|null=null;
let pending=false;
export function registerCommercialPrompt(fn:(prompt:CommercialPrompt)=>void) {
 listener=fn;
 return ()=>{if(listener===fn)listener=null;};
}
export const commercialMfaService={
 iniciar:(p:CommercialPrompt)=>coreApi.post<CommercialChallenge>(`/proyectos/${p.project}/mfa-comercial/iniciar`,{accion:p.action,datos:p.body}),
 verificar:(project:number,challengeId:string,codigo:string)=>coreApi.post<{approvalToken:string}>(`/proyectos/${project}/mfa-comercial/verificar`,{challengeId,codigo})
};
export async function commercialMutation<T>(project:number,action:CommercialAction,path:string,method:'POST'|'PUT',body:Record<string,unknown>):Promise<T>{
 if(!listener||pending)throw new Error('No se puede iniciar otra confirmación comercial en este momento.');
 const snapshot=JSON.parse(JSON.stringify(body)) as Record<string,unknown>;
 pending=true;
 try{
  const token=await new Promise<string>((resolve,reject)=>listener!({project,action,body:snapshot,resolve,reject}));
  const options={headers:{'X-Commercial-Approval':token}};
  return await (method==='POST'?coreApi.post<T>(path,snapshot,options):coreApi.put<T>(path,snapshot,options));
 }finally{pending=false;}
}
