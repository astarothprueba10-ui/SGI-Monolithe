import { useState } from 'react';
import { toast } from 'sonner';
import { leerArchivoProyecto } from '../utils/projectImportExcel';
import { projectImportService } from '../services/projectImportService';
import type { ProyectoResponse } from '../types/core';
import type { SolicitudImportacion, RespuestaImportacion } from '../types/projectImport';

export function useProjectImport(project: ProyectoResponse, onImportCompleted?: () => void) {
  const [solicitud, setSolicitud] = useState<SolicitudImportacion | null>(null);
  const [resultado, setResultado] = useState<RespuestaImportacion | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [aceptado, setAceptado] = useState(false);

  async function validar(file: File) {
    if (ocupado) return;
    setOcupado(true); setError(''); setResultado(null); setSolicitud(null); setAceptado(false);
    try {
      const datos = await leerArchivoProyecto(file, project.codigo);
      const respuesta = await projectImportService.validar(project.idProyecto, datos);
      setSolicitud(datos); setResultado(respuesta);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo leer el archivo.');
    } finally { setOcupado(false); }
  }

  async function confirmar() {
    if (!solicitud || !resultado || resultado.confirmado || !aceptado || ocupado
      || resultado.filas.some(f => f.estado === 'ERROR') || !resultado.filas.some(f => f.estado === 'NUEVO' || f.estado === 'BORRADOR')) return;
    setOcupado(true); setError('');
    try {
      const respuesta = await projectImportService.confirmar(project.idProyecto, solicitud, resultado.huella);
      setResultado(respuesta);
      toast.success('Importación registrada. Actualizando los datos del proyecto…');
      onImportCompleted?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar. Valida el archivo nuevamente.');
      setResultado(null);
    } finally { setOcupado(false); setAceptado(false); }
  }
  return { resultado, ocupado, error, aceptado, setAceptado, validar, confirmar };
}
