import React, { useRef, useState } from 'react';
import {
  CheckCircle2Icon,
  CircleAlertIcon,
  PaperclipIcon,
  UploadCloudIcon,
  XIcon } from
'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardHeader } from '../ui/Card';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { cuotas } from '../../data/portal';
import { formatCurrency, formatDate } from '../../utils/format';
import { supabase } from '../../lib/supabase';

const medios = [
'Transferencia BCP',
'Transferencia Interbank',
'Depósito en agencia',
'Yape / Plin'];


const pendientes = cuotas.filter(
  (c) => c.estado === 'vencida' || c.estado === 'pendiente'
);

export function RegistrarPagoForm() {
  const [cuota, setCuota] = useState(String(pendientes[0].numero));
  const [fecha, setFecha] = useState('2026-08-27');
  const [medio, setMedio] = useState(medios[0]);
  const [operacion, setOperacion] = useState('');
  const [archivo, setArchivo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const inputArchivo = useRef<HTMLInputElement>(null);

  const cuotaSel = cuotas.find((c) => String(c.numero) === cuota)!;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setExito(false);
    if (operacion.trim().length < 4) {
      setError(
        'Ingresa el número de operación del voucher (al menos 4 dígitos).'
      );
      return;
    }
    if (!archivo) {
      setError('Adjunta la imagen o el PDF de tu comprobante.');
      return;
    }
    setError(null);
    setConfirmando(true);
  }

  async function confirmar() {
    setEnviando(true);
    try {
      await supabase.rpc('sp_registrar_pago_voucher', {
        p_id_venta: 2,
        p_id_cuota: 37,
        p_monto: cuotaSel?.monto || 2400.0,
        p_id_metodo_pago: medio.includes('BCP') || medio.includes('Interbank') ? 6 : medio.includes('Yape') ? 8 : 7,
        p_numero_operacion: operacion,
        p_nombre_archivo: archivo || 'voucher.pdf',
        p_clave_archivo: `vouchers/2026/${Date.now()}_${archivo || 'voucher.pdf'}`,
        p_hash_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        p_id_usuario: 3
      });
      setExito(true);
      setOperacion('');
      setArchivo(null);
    } catch (err: any) {
      setError('Error al registrar voucher: ' + err.message);
    } finally {
      setEnviando(false);
      setConfirmando(false);
    }
  }

  return (
    <>
      <Card as="section">
        <CardHeader
          title="Registrar un pago"
          description="Adjunta el comprobante para que cobranzas valide tu cuota."
          icon={<UploadCloudIcon className="h-[18px] w-[18px]" />} />
        

        <form onSubmit={handleSubmit} noValidate className="space-y-5 p-5">
          <div aria-live="polite">
            {exito ?
            <div
              role="status"
              className="flex gap-3 rounded-field border border-success-200 bg-success-50 px-3.5 py-3">
              
                <CheckCircle2Icon
                className="mt-0.5 h-[18px] w-[18px] shrink-0 text-success-500"
                aria-hidden="true" />
              
                <div>
                  <p className="text-[13px] font-semibold text-success-700">
                    Comprobante enviado
                  </p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-success-700/85">
                    Tu pago quedó registrado como “En revisión”. Te avisaremos
                    cuando cobranzas lo valide (máx. 48 horas hábiles).
                  </p>
                </div>
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

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cuota a pagar" id="cuota">
              <select
                id="cuota"
                value={cuota}
                onChange={(e) => setCuota(e.target.value)}
                className="h-11 w-full appearance-none rounded-field border border-slateux-200 bg-white px-3.5 text-[14.5px] text-ink-800 shadow-field outline-none transition-[border-color,box-shadow] duration-150 ease-out hover:border-slateux-300 focus:border-ink-700 focus:ring-4 focus:ring-ink-700/10">
                
                {pendientes.slice(0, 6).map((c) =>
                <option key={c.numero} value={c.numero}>
                    Cuota {String(c.numero).padStart(2, '0')} — vence{' '}
                    {formatDate(c.vencimiento)}
                  </option>
                )}
              </select>
            </Field>

            <Field label="Monto a registrar" id="monto">
              <input
                id="monto"
                readOnly
                value={formatCurrency(cuotaSel.monto)}
                className="h-11 w-full rounded-field border border-slateux-200 bg-slateux-50 px-3.5 text-[14.5px] font-medium tabular-nums text-ink-700 outline-none" />
              
            </Field>

            <Field label="Fecha del pago" id="fecha">
              <input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="h-11 w-full rounded-field border border-slateux-200 bg-white px-3.5 text-[14.5px] text-ink-800 shadow-field outline-none transition-[border-color,box-shadow] duration-150 ease-out hover:border-slateux-300 focus:border-ink-700 focus:ring-4 focus:ring-ink-700/10" />
              
            </Field>

            <Field label="Medio de pago" id="medio">
              <select
                id="medio"
                value={medio}
                onChange={(e) => setMedio(e.target.value)}
                className="h-11 w-full appearance-none rounded-field border border-slateux-200 bg-white px-3.5 text-[14.5px] text-ink-800 shadow-field outline-none transition-[border-color,box-shadow] duration-150 ease-out hover:border-slateux-300 focus:border-ink-700 focus:ring-4 focus:ring-ink-700/10">
                
                {medios.map((m) =>
                <option key={m} value={m}>
                    {m}
                  </option>
                )}
              </select>
            </Field>

            <div className="sm:col-span-2">
              <Field label="Número de operación" id="operacion">
                <input
                  id="operacion"
                  inputMode="numeric"
                  value={operacion}
                  onChange={(e) => setOperacion(e.target.value)}
                  placeholder="Ej. 00871245"
                  aria-invalid={Boolean(error) && operacion.length < 4}
                  className="h-11 w-full rounded-field border border-slateux-200 bg-white px-3.5 text-[14.5px] text-ink-800 shadow-field outline-none transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-slateux-400 hover:border-slateux-300 focus:border-ink-700 focus:ring-4 focus:ring-ink-700/10" />
                
              </Field>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[13px] font-medium text-ink-700">
              Comprobante o voucher
            </p>
            {archivo ?
            <div className="flex items-center gap-3 rounded-field border border-slateux-200 bg-slateux-50 px-3.5 py-3">
                <PaperclipIcon
                className="h-4 w-4 shrink-0 text-slateux-400"
                aria-hidden="true" />
              
                <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink-700">
                  {archivo}
                </p>
                <button
                type="button"
                onClick={() => setArchivo(null)}
                aria-label="Quitar archivo adjunto"
                className="flex h-7 w-7 items-center justify-center rounded-md text-slateux-400 outline-none transition-colors duration-150 ease-out hover:bg-white hover:text-ink-700 focus-visible:ring-2 focus-visible:ring-ink-700/25">
                
                  <XIcon className="h-4 w-4" aria-hidden="true" />
                </button>
              </div> :

            <button
              type="button"
              onClick={() => inputArchivo.current?.click()}
              className="flex w-full flex-col items-center gap-1.5 rounded-field border border-dashed border-slateux-300 bg-slateux-50 px-4 py-7 outline-none transition-colors duration-150 ease-out hover:border-ink-600 hover:bg-slateux-100 focus-visible:ring-4 focus-visible:ring-ink-700/15">
              
                <UploadCloudIcon
                className="h-5 w-5 text-slateux-400"
                aria-hidden="true" />
              
                <span className="text-[13.5px] font-semibold text-ink-700">
                  Adjuntar voucher
                </span>
                <span className="text-[12.5px] text-slateux-500">
                  JPG, PNG o PDF · hasta 5 MB
                </span>
              </button>
            }
            <input
              ref={inputArchivo}
              type="file"
              accept="image/*,.pdf"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setArchivo(file.name);
                  setError(null);
                }
              }} />
            
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slateux-200 pt-5 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setOperacion('');
                setArchivo(null);
                setError(null);
                setExito(false);
              }}>
              
              Limpiar
            </Button>
            <Button type="submit">Enviar comprobante</Button>
          </div>
        </form>
      </Card>

      <ConfirmDialog
        open={confirmando}
        title="¿Confirmas el envío del comprobante?"
        description="Una vez enviado, el pago pasa a revisión de cobranzas y no podrás editarlo. Si hay un error, deberás registrar un nuevo voucher."
        confirmLabel="Sí, enviar comprobante"
        loading={enviando}
        onConfirm={confirmar}
        onCancel={() => setConfirmando(false)}>
        
        <dl className="divide-y divide-slateux-200 rounded-field border border-slateux-200 bg-slateux-50 px-3.5">
          <Resumen
            label="Cuota"
            value={`Cuota ${String(cuotaSel.numero).padStart(2, '0')}`} />
          
          <Resumen label="Monto" value={formatCurrency(cuotaSel.monto)} />
          <Resumen label="Medio" value={medio} />
          <Resumen label="Operación" value={operacion || '—'} />
          <Resumen label="Adjunto" value={archivo ?? '—'} />
        </dl>
      </ConfirmDialog>
    </>);

}

function Field({
  label,
  id,
  children




}: {label: string;id: string;children: React.ReactNode;}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[13px] font-medium text-ink-700">
        
        {label}
      </label>
      {children}
    </div>);

}

function Resumen({ label, value }: {label: string;value: string;}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <dt className="text-[12.5px] text-slateux-500">{label}</dt>
      <dd className="min-w-0 truncate text-[12.5px] font-medium text-ink-800">
        {value}
      </dd>
    </div>);

}