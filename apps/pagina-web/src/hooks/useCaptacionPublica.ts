import { useProyectosCaptacion } from './useProyectosCaptacion';
import { useRef, useState, type FormEvent } from 'react';
import { enviarConsulta } from '../services/api';
import { IdentidadEnvio, normalizarCaptacion, validarCaptacion } from '../lib/captacion';

export const initial = { nombres: '', apellidoPaterno: '', apellidoMaterno: '', numeroDocumento: '',
  telefono: '', correo: '', idProyecto: '', motivoContacto: '', mensaje: '' };
export function useCaptacionPublica(motivo = '') {
  const [values, setValues] = useState({ ...initial, motivoContacto: motivo });
  const [accept, setAccept] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [codigoSeguimiento, setCodigoSeguimiento] = useState('');
  const catalogo = useProyectosCaptacion();
  const { projects } = catalogo;
  const identity = useRef(new IdentidadEnvio()), busy = useRef(false);
  function update(key: keyof typeof initial, value: string) {
    setValues(v => ({ ...v, [key]: value }));
    setErrors(e => ({ ...e, [key]: '' }));
  }
  function payload() {
    return { ...normalizarCaptacion({ ...values, idProyecto: Number(values.idProyecto),
      tipoDocumento: values.numeroDocumento.trim() ? 'DNI' : null }), aceptaPrivacidad: accept };
  }
  async function confirmar(datos: ReturnType<typeof payload>) {
    busy.current = true; setState('loading');
    try {
      const resp = await enviarConsulta({ ...datos, idSolicitud: identity.current.para(datos) });
      setCodigoSeguimiento(resp.codigo); setState('success');
    } catch (error) {
      setErrors({ envio: error instanceof Error ? error.message : 'No se confirmó el envío. Reintenta.' }); setState('error');
    } finally { busy.current = false; }
  }
  async function submit(e: FormEvent) {
    e.preventDefault(); if (busy.current) return;
    const datos = payload(), next = validarCaptacion({ ...datos, telefono: values.telefono });
    if (!accept) next.accept = 'Debes aceptar la política de privacidad';
    if (!projects.some(p => p.idProyecto === datos.idProyecto)) next.idProyecto = 'Selecciona un proyecto disponible';
    setErrors(next); if (Object.keys(next).length) { setState('error'); return; }
    await confirmar(datos);
  }
  function reset() {
    setValues({ ...initial, motivoContacto: motivo }); setAccept(false); setErrors({});
    setCodigoSeguimiento(''); setState('idle'); identity.current.reiniciar();
  }
  return { values, accept, setAccept, errors, setErrors, state, codigoSeguimiento, ...catalogo, update, submit, reset };
}
