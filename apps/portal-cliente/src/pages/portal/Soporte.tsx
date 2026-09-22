import React, { useState } from 'react';
import {
  CheckCircle2Icon,
  CircleAlertIcon,
  HeadphonesIcon,
  LifeBuoyIcon } from
'lucide-react';
import { PageHeader } from '../../components/portal/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { formatDate } from '../../utils/format';

const temas = [
'Pagos y vouchers',
'Cronograma y cuotas',
'Documentos y contrato',
'Datos de mi lote',
'Acceso al portal',
'Otro'];


const tickets = [
{
  id: 'TCK-2291',
  tema: 'Pagos y vouchers',
  asunto: 'Consulta por rechazo de voucher de cuota 10',
  fecha: '2026-08-25',
  estado: 'abierto' as const
},
{
  id: 'TCK-2180',
  tema: 'Documentos y contrato',
  asunto: 'Solicitud de copia del contrato firmado',
  fecha: '2026-07-14',
  estado: 'resuelto' as const
}];


export function Soporte() {
  const [tema, setTema] = useState(temas[0]);
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setExito(false);
    if (asunto.trim().length < 5) {
      setError('Escribe un asunto de al menos 5 caracteres.');
      return;
    }
    if (mensaje.trim().length < 20) {
      setError('Describe tu consulta con un poco más de detalle (20 caracteres o más).');
      return;
    }
    setError(null);
    setConfirmar(true);
  }

  async function enviar() {
    setEnviando(true);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    setEnviando(false);
    setConfirmar(false);
    setExito(true);
    setAsunto('');
    setMensaje('');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Soporte"
        title="¿En qué podemos ayudarte?"
        description="Envía tu consulta sobre pagos, cuotas o documentación. El equipo de atención al cliente responde en un máximo de 24 horas hábiles." />
      

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <Card as="section">
          <CardHeader
            title="Nueva solicitud"
            description="Solo verás y podrás consultar información de tu propia operación."
            icon={<HeadphonesIcon className="h-[18px] w-[18px]" />} />
          
          <form onSubmit={handleSubmit} noValidate className="space-y-5 p-5">
            <div aria-live="polite">
              {exito ?
              <div
                role="status"
                className="flex gap-3 rounded-field border border-success-200 bg-success-50 px-3.5 py-3">
                
                  <CheckCircle2Icon
                  className="mt-0.5 h-[18px] w-[18px] shrink-0 text-success-500"
                  aria-hidden="true" />
                
                  <p className="text-[13px] leading-relaxed text-success-700">
                    Tu solicitud fue registrada con el código TCK-2304. Te
                    responderemos al correo asociado a tu cuenta.
                  </p>
                </div> :
              null}
              {error ?
              <div
                role="alert"
                className="flex gap-3 rounded-field border border-danger-200 bg-danger-50 px-3.5 py-3">
                
                  <CircleAlertIcon
                  className="mt-0.5 h-[18px] w-[18px] shrink-0 text-danger-500"
                  aria-hidden="true" />
                
                  <p className="text-[13px] leading-relaxed text-danger-700">
                    {error}
                  </p>
                </div> :
              null}
            </div>

            <div>
              <label
                htmlFor="tema"
                className="mb-1.5 block text-[13px] font-medium text-ink-700">
                
                Tema de la consulta
              </label>
              <select
                id="tema"
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                className="h-11 w-full appearance-none rounded-field border border-slateux-200 bg-white px-3.5 text-[14.5px] text-ink-800 shadow-field outline-none transition-[border-color,box-shadow] duration-150 ease-out hover:border-slateux-300 focus:border-ink-700 focus:ring-4 focus:ring-ink-700/10">
                
                {temas.map((t) =>
                <option key={t} value={t}>
                    {t}
                  </option>
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="asunto"
                className="mb-1.5 block text-[13px] font-medium text-ink-700">
                
                Asunto
              </label>
              <input
                id="asunto"
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
                placeholder="Ej. No puedo registrar el voucher de mi cuota"
                className="h-11 w-full rounded-field border border-slateux-200 bg-white px-3.5 text-[14.5px] text-ink-800 shadow-field outline-none transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-slateux-400 hover:border-slateux-300 focus:border-ink-700 focus:ring-4 focus:ring-ink-700/10" />
              
            </div>

            <div>
              <label
                htmlFor="mensaje"
                className="mb-1.5 block text-[13px] font-medium text-ink-700">
                
                Detalle de tu consulta
              </label>
              <textarea
                id="mensaje"
                rows={5}
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Cuéntanos qué ocurrió, con fechas y montos si aplica."
                className="w-full resize-y rounded-field border border-slateux-200 bg-white px-3.5 py-3 text-[14.5px] leading-relaxed text-ink-800 shadow-field outline-none transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-slateux-400 hover:border-slateux-300 focus:border-ink-700 focus:ring-4 focus:ring-ink-700/10" />
              
              <p className="mt-1.5 text-[12px] text-slateux-400">
                {mensaje.trim().length}/600 caracteres
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slateux-200 pt-5 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setAsunto('');
                  setMensaje('');
                  setError(null);
                  setExito(false);
                }}>
                
                Limpiar
              </Button>
              <Button type="submit">Enviar solicitud</Button>
            </div>
          </form>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Mis solicitudes"
              icon={<LifeBuoyIcon className="h-[18px] w-[18px]" />} />
            
            <ul className="divide-y divide-slateux-200">
              {tickets.map((t) =>
              <li key={t.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[13.5px] font-semibold text-ink-800">
                      {t.asunto}
                    </p>
                    <StatusBadge
                    tone={t.estado === 'abierto' ? 'warn' : 'success'}>
                    
                      {t.estado === 'abierto' ? 'Abierto' : 'Resuelto'}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-[12.5px] text-slateux-500">
                    {t.id} · {t.tema} · {formatDate(t.fecha)}
                  </p>
                </li>
              )}
            </ul>
          </Card>

          <Card className="p-5">
            <p className="text-[12.5px] font-medium uppercase tracking-[0.1em] text-slateux-400">
              Canales de atención
            </p>
            <ul className="mt-4 space-y-3 text-[13px] leading-relaxed text-slateux-600">
              <li>
                <span className="font-medium text-ink-800">
                  Central telefónica
                </span>
                <br />
                (01) 480 5520 · Lun a Vie, 9:00–18:00
              </li>
              <li>
                <span className="font-medium text-ink-800">Correo</span>
                <br />
                atencioncliente@monolithe.pe
              </li>
              <li>
                <span className="font-medium text-ink-800">
                  Oficina de ventas
                </span>
                <br />
                Km 12.5 Carretera Central, Cieneguilla
              </li>
            </ul>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmar}
        title="¿Enviar tu solicitud a soporte?"
        description="Adjuntaremos automáticamente los datos de tu lote y tu financiamiento para agilizar la respuesta."
        confirmLabel="Sí, enviar solicitud"
        loading={enviando}
        onConfirm={enviar}
        onCancel={() => setConfirmar(false)} />
      
    </div>);

}