import type { CrmDatosConyugeVenta } from '../services/crmBackend';

export const CONYUGE_VACIO: CrmDatosConyugeVenta = {
  nombres: '', apellidoPaterno: '', apellidoMaterno: '',
  telefono: '', correo: '', tipoDocumento: 'DNI', numeroDocumento: ''
};

export function validarConyugeVenta(datos: CrmDatosConyugeVenta): Partial<Record<keyof CrmDatosConyugeVenta, string>> {
  const errores: Partial<Record<keyof CrmDatosConyugeVenta, string>> = {};
  const nombres = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;
  if (!nombres.test(datos.nombres.trim()) || datos.nombres.trim().length < 2 || datos.nombres.length > 120)
    errores.nombres = 'Ingrese nombres válidos.';
  if (!nombres.test(datos.apellidoPaterno.trim()) || datos.apellidoPaterno.trim().length < 2 || datos.apellidoPaterno.length > 80)
    errores.apellidoPaterno = 'Ingrese el apellido paterno.';
  if (datos.apellidoMaterno.trim() && (!nombres.test(datos.apellidoMaterno.trim()) || datos.apellidoMaterno.length > 80))
    errores.apellidoMaterno = 'Apellido materno no válido.';
  if (!/^(?:[0-9]{7,15}|\+[1-9][0-9]{6,14})$/.test(datos.telefono.trim()))
    errores.telefono = 'Ingrese un teléfono válido de 7 a 15 dígitos.';
  if (!/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i.test(datos.correo.trim()) || datos.correo.length > 180)
    errores.correo = 'Ingrese un correo electrónico válido.';
  const docs: Record<CrmDatosConyugeVenta['tipoDocumento'], RegExp> = {
    DNI: /^[0-9]{8}$/, RUC: /^[0-9]{11}$/, CE: /^[0-9]{9,12}$/, PASAPORTE: /^[A-Z0-9]{6,20}$/
  };
  if (!docs[datos.tipoDocumento]?.test(datos.numeroDocumento.trim().toUpperCase()))
    errores.numeroDocumento = 'Número de documento inválido para el tipo elegido.';
  return errores;
}
