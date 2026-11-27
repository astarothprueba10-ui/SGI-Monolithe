export type MetodoPagoSeparacion = 'TRANSFERENCIA'|'DEPOSITO'|'YAPE_PLIN'|'EFECTIVO'|'OTRO';
export const MAX_PAGOS_SEPARACION = 20;
export const MAX_ARCHIVO_SEPARACION = 5*1024*1024;
export const METODOS_PAGO_SEPARACION:ReadonlyArray<MetodoPagoSeparacion>=['TRANSFERENCIA','DEPOSITO','YAPE_PLIN','EFECTIVO','OTRO'];
export type PagoSeparacionBorrador = {
  id:number; monto:string|null; metodo:MetodoPagoSeparacion; referencia:string;
  archivo:File|null; hashSha256:string|null; verificandoArchivo:boolean; errorArchivo:string|null;
};
export type PagoSeparacionResuelto = Omit<PagoSeparacionBorrador,'monto'> & {monto:string};
export const crearPagoSeparacion=(id:number,monto:string|null=null):PagoSeparacionBorrador=>({
  id,monto,metodo:'TRANSFERENCIA',referencia:'',archivo:null,hashSha256:null,verificandoArchivo:false,errorArchivo:null
});
export function centavosImporte(monto:string):number|null{
  const limpio=monto.trim().replace(',','.');
  if(!/^\d+(\.\d{1,2})?$/.test(limpio))return null;
  const [entero,decimales='']=limpio.split('.');
  const centavos=Number(entero)*100+Number(decimales.padEnd(2,'0'));
  return Number.isSafeInteger(centavos)&&centavos>0?centavos:null;
}
export function centavosTotal(total:number):number|null{
  const centavos=Math.round(total*100);
  return Number.isFinite(total)&&Number.isSafeInteger(centavos)&&centavos>0&&Math.abs(total*100-centavos)<0.00001?centavos:null;
}
export function resolverPagosSeparacion(pagos:PagoSeparacionBorrador[],total:number):PagoSeparacionResuelto[]{
  return pagos.map(p=>({...p,monto:p.monto??(pagos.length===1&&centavosTotal(total)!==null?total.toFixed(2):'')}));
}
export function errorComprobanteSeparacion(archivo:Pick<File,'name'|'size'|'type'>):string|null{
  if(!['application/pdf','image/jpeg','image/png','image/webp'].includes(archivo.type))return 'Utiliza PDF, JPG, PNG o WebP.';
  if(archivo.size<1||archivo.size>MAX_ARCHIVO_SEPARACION)return 'El archivo debe contener información y no superar 5 MB.';
  if(!archivo.name.trim()||archivo.name.length>255)return 'El nombre del archivo debe contener entre 1 y 255 caracteres.';
  return null;
}
export function requiereReferenciaSeparacion(metodo:MetodoPagoSeparacion):boolean{
  return ['TRANSFERENCIA','DEPOSITO','YAPE_PLIN'].includes(metodo);
}
export function validarPagosSeparacion(pagos:PagoSeparacionResuelto[],total:number){
  const esperado=centavosTotal(total);
  let registrado=0;
  const errores:Record<number,string[]>={};
  const refs=new Map<string,number>(),hashes=new Map<string,number>();
  const agregar=(id:number,mensaje:string)=>{(errores[id]??=[]).push(mensaje);};
  for(const p of pagos){
    const importe=centavosImporte(p.monto);
    if(importe===null)agregar(p.id,'Ingresa un importe positivo con hasta dos decimales.');
    else registrado+=importe;
    if(!METODOS_PAGO_SEPARACION.includes(p.metodo))agregar(p.id,'Selecciona un método válido.');
    const ref=p.referencia.trim().toUpperCase();
    if(requiereReferenciaSeparacion(p.metodo)&&!ref)agregar(p.id,'Ingresa el número de operación.');
    if(ref.length>80)agregar(p.id,'La referencia no debe superar 80 caracteres.');
    if(p.metodo!=='EFECTIVO'&&ref){
      const previo=refs.get(ref);
      if(previo!==undefined){agregar(p.id,'Número de operación repetido.');agregar(previo,'Número de operación repetido.');}
      else refs.set(ref,p.id);
    }
    if(p.errorArchivo)agregar(p.id,p.errorArchivo);
    else if(!p.archivo){if(p.metodo!=='EFECTIVO')agregar(p.id,'Adjunta el comprobante del abono.');}
    else if(p.verificandoArchivo)agregar(p.id,'Verificando comprobante…');
    else {
      const error=errorComprobanteSeparacion(p.archivo);
      if(error)agregar(p.id,error);
      const hash=p.hashSha256?.toLowerCase();
      if(!hash||!(/^[a-f0-9]{64}$/.test(hash)))agregar(p.id,'No se pudo verificar el comprobante.');
      else{
        const previo=hashes.get(hash);
        if(previo!==undefined){agregar(p.id,'Comprobante duplicado.');agregar(previo,'Comprobante duplicado.');}
        else hashes.set(hash,p.id);
      }
    }
  }
  const diferencia=esperado===null?null:esperado-registrado;
  const valido=esperado!==null&&Number.isSafeInteger(registrado)&&pagos.length>=1&&pagos.length<=MAX_PAGOS_SEPARACION
    &&new Set(pagos.map(p=>p.id)).size===pagos.length&&diferencia===0&&Object.keys(errores).length===0;
  return {valido,esperado,registrado,diferencia,errores};
}
export type ValidacionPagosSeparacion=ReturnType<typeof validarPagosSeparacion>;
