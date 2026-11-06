import type { CrmDatosPersonalesEdicion } from '../services/crmBackend';
import { sanitizarLead } from './crmLeadValidation';

export type CampoPersonal=keyof CrmDatosPersonalesEdicion;
export type ErroresPersonales=Partial<Record<CampoPersonal,string>>;
const RE_NOMBRE=/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/u;
const RE_CORREO=/^[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,}$/i;
const RE_TEL=/^(?:[0-9]{7,15}|\+[1-9][0-9]{6,14})$/;

export function normalizarDatoPersonal(
  campo:CampoPersonal, valor:string,tipoDocumento:string
):string {
  if(campo==='nombres') return sanitizarLead('names',valor,tipoDocumento);
  if(campo==='apellidoPaterno') return sanitizarLead('paternalSurname',valor,tipoDocumento);
  if(campo==='apellidoMaterno') return sanitizarLead('maternalSurname',valor,tipoDocumento);
  if(campo==='telefono') return sanitizarLead('phone',valor,tipoDocumento);
  if(campo==='numeroDocumento') return sanitizarLead('numeroDocumento',valor,tipoDocumento);
  return valor;
}

export function validarDatosPersonales(d:CrmDatosPersonalesEdicion):ErroresPersonales {
  const errores:ErroresPersonales={};
  const testNombre=(campo:'nombres'|'apellidoPaterno'|'apellidoMaterno',requerido:boolean,max:number)=>{
    const v=d[campo].trim();
    if ((!v && requerido) || (v && (v.length<2||v.length>max||!RE_NOMBRE.test(v))))
      errores[campo]=requerido?'Ingrese letras y guiones, sin números ni símbolos.':
        'Use solo letras y guiones, o déjelo vacío.';
  };
  testNombre('nombres',true,120);
  testNombre('apellidoPaterno',true,80);
  testNombre('apellidoMaterno',false,80);
  if(d.nombres.length+d.apellidoPaterno.length+d.apellidoMaterno.length>148)
    errores.nombres='El nombre completo excede el límite permitido.';
  if(!RE_TEL.test(d.telefono.trim()))
    errores.telefono='Ingrese 7 a 15 dígitos. Solo se permite + al inicio.';
  if(!RE_CORREO.test(d.correo.trim())||d.correo.length>180)
    errores.correo='El correo debe tener el formato persona@example.com.';
  const docs:Record<string,RegExp>={
    DNI:/^[0-9]{8}$/,RUC:/^[0-9]{11}$/,CE:/^[0-9]{9,12}$/,PASAPORTE:/^[A-Z0-9]{6,20}$/
  };
  if(!docs[d.tipoDocumento]) errores.tipoDocumento='Seleccione un documento válido.';
  else if(!docs[d.tipoDocumento].test(d.numeroDocumento.trim().toUpperCase()))
    errores.numeroDocumento='Número inválido para el documento seleccionado.';
  if(d.direccion.length>255) errores.direccion='La dirección no puede superar 255 caracteres.';
  return errores;
}
