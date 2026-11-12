import { useState } from 'react';
import type { FormEvent } from 'react';
import { CheckCircle2Icon, FileUpIcon, ShieldCheckIcon } from 'lucide-react';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { portalCorePost } from '../../lib/portalCoreApi';
import { supabase } from '../../lib/supabase';
import type {
  DestinoVoucher, PortalCargaVoucher, PortalMetodoPago,
  PortalOpcionOperacion, PortalPrepararVoucherInput, PortalRegistroVoucher
} from '../../types/portal-vouchers';
import { formatCurrency } from '../../utils/format';

const MAX_BYTES = 5 * 1024 * 1024;
const MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
function fechaHoyPeru(): string {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const valor = (tipo: string) => partes.find(p => p.type === tipo)?.value ?? '';
  return `${valor('year')}-${valor('month')}-${valor('day')}`;
}

export function RegistrarPagoForm({ operaciones, metodos, onRegistrado }: {
  operaciones: PortalOpcionOperacion[];
  metodos: PortalMetodoPago[];
  onRegistrado: () => void;
}) {
  const [ventaElegida, setVentaElegida] = useState('');
  const [destino, setDestino] = useState<DestinoVoucher>('CUOTA');
  const [cuotaElegida, setCuotaElegida] = useState('');
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState('');
  const [fecha, setFecha] = useState(fechaHoyPeru());
  const [numero, setNumero] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [pendiente, setPendiente] = useState<{ idCarga: string; destino: DestinoVoucher } | null>(null);

  const elegibles = operaciones.filter(o =>
    o.planActivo && (o.cuotas.length > 0 || o.saldoInicial > 0));
  const operacion = elegibles.find(o => String(o.idVenta) === ventaElegida)
    ?? elegibles[0] ?? null;
  const cuota = operacion?.cuotas.find(c => String(c.idCuota) === cuotaElegida)
    ?? operacion?.cuotas[0] ?? null;
  const saldo = destino === 'CUOTA' ? (cuota?.saldo ?? 0) : (operacion?.saldoInicial ?? 0);
  const puedeCargar = !!operacion && saldo > 0 && metodos.length > 0;

  async function registrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (ocupado || !operacion) return;
    setError(null);
    setExito(false);
    setOcupado(true);
    try {
      let cargaPendiente = pendiente;
      if (!cargaPendiente) {
        const cantidad = Number(monto);
        if (!Number.isFinite(cantidad) || !/^\d+(\.\d{1,2})?$/.test(monto)
            || cantidad <= 0 || cantidad > saldo) {
          throw new Error('Ingrese un importe válido, hasta ' + formatCurrency(saldo) + '.');
        }
        if (!metodos.some(m => String(m.idMetodoPago) === metodo)) {
          throw new Error('Seleccione el medio de pago utilizado.');
        }
        if (!fecha || fecha > fechaHoyPeru()) {
          throw new Error('Seleccione la fecha real de la operación.');
        }
        if (!archivo || !MIMES.includes(archivo.type)
            || archivo.size < 1 || archivo.size > MAX_BYTES
            || !archivo.name.trim() || archivo.name.length > 180) {
          throw new Error('Seleccione un PDF, JPG, PNG o WebP de máximo 5 MiB.');
        }
        if (numero.trim().length > 100) {
          throw new Error('El número de operación no puede superar 100 caracteres.');
        }

        const solicitud: PortalPrepararVoucherInput = {
          idVenta: operacion.idVenta, destino,
          idCuota: destino === 'CUOTA' ? cuota?.idCuota ?? null : null,
          monto: cantidad, idMetodoPago: Number(metodo),
          fechaOperacion: fecha, numeroOperacion: numero.trim() || null,
          nombreArchivo: archivo.name, tipoMime: archivo.type,
          tamanioBytes: archivo.size
        };
        const carga = await portalCorePost<PortalCargaVoucher>(
          '/portal-cliente/vouchers/preparar-carga', { ...solicitud });
        if (carga.bucket !== 'vouchers-ventas-private'
            || carga.tipoMime !== archivo.type || carga.maxBytes < archivo.size) {
          throw new Error('La autorización de carga no corresponde al archivo.');
        }
        const url = new URL(carga.urlCarga);
        if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co')
            || !url.pathname.endsWith('/' + carga.claveArchivo)) {
          throw new Error('La URL de carga del comprobante no es segura.');
        }
        const token = url.searchParams.get('token');
        if (!token) throw new Error('No se recibió la autorización de carga.');
        const { error: errorSubida } = await supabase.storage
          .from(carga.bucket)
          .uploadToSignedUrl(carga.claveArchivo, token, archivo, {
            contentType: archivo.type, upsert: false
          });
        if (errorSubida) throw new Error('No se pudo subir el archivo: ' + errorSubida.message);
        cargaPendiente = { idCarga: carga.idCarga, destino };
        setPendiente(cargaPendiente);
      }
      const resultado = await portalCorePost<PortalRegistroVoucher>(
        '/portal-cliente/vouchers/registrar?destino=' + encodeURIComponent(cargaPendiente.destino),
        { idCarga: cargaPendiente.idCarga });
      if (resultado.estadoVoucher !== 'PENDIENTE' && !resultado.reutilizado) {
        throw new Error('Respuesta de registro inesperada.');
      }
      setPendiente(null);
      setArchivo(null);
      setMonto('');
      setNumero('');
      setExito(true);
      onRegistrado();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo presentar el comprobante.');
    } finally {
      setOcupado(false);
    }
  }

  return <Card as="section">
    <CardHeader title="Presentar comprobante"
      icon={<FileUpIcon className="h-[18px] w-[18px]" />}
      description="Solo compras propias y archivos privados · máximo 5 MiB" />
    <form onSubmit={e => void registrar(e)} className="space-y-4 p-5">
      {!puedeCargar && <p className="rounded-field bg-slateux-50 p-3 text-sm text-slateux-600">
        No hay cuotas o inicial adicional pendientes con contrato vigente, o no existen métodos de pago habilitados.
      </p>}
      <fieldset disabled={!puedeCargar || ocupado || !!pendiente} className="space-y-4 disabled:opacity-70">
        <label className="block text-xs font-semibold text-slateux-600">Mi compra
          <select value={operacion?.idVenta ?? ''} onChange={e => {
            setVentaElegida(e.target.value); setCuotaElegida(''); setMonto('');
          }} className="mt-1 block w-full rounded-field border border-slateux-300 bg-white p-2.5 text-sm">
            {elegibles.map(o => <option key={o.idVenta} value={o.idVenta}>
              {o.codigoVenta} · {o.proyecto} · Lote {o.numeroLote}
            </option>)}
          </select>
        </label>
        <label className="block text-xs font-semibold text-slateux-600">Destino del pago
          <select value={destino} onChange={e => {
            setDestino(e.target.value as DestinoVoucher); setMonto('');
          }} className="mt-1 block w-full rounded-field border border-slateux-300 bg-white p-2.5 text-sm">
            <option value="CUOTA">Cuota de financiamiento</option>
            <option value="INICIAL">Inicial adicional</option>
          </select>
        </label>
        {destino === 'CUOTA' && <label className="block text-xs font-semibold text-slateux-600">
          Cuota
          <select value={cuota?.idCuota ?? ''} onChange={e => {
            setCuotaElegida(e.target.value); setMonto('');
          }} className="mt-1 block w-full rounded-field border border-slateux-300 bg-white p-2.5 text-sm">
            {(operacion?.cuotas ?? []).map(c => <option key={c.idCuota} value={c.idCuota}>
              Cuota {c.numero} · vence {c.fechaVencimiento} · saldo {formatCurrency(c.saldo)}
            </option>)}
          </select>
        </label>}
        <p className="text-xs text-slateux-600">Saldo disponible para documentar: <strong>{formatCurrency(saldo)}</strong></p>
        <label className="block text-xs font-semibold text-slateux-600">Importe presentado (S/)
          <input type="number" min="0.01" max={saldo} step="0.01" required
            value={monto} onChange={e => setMonto(e.target.value)}
            className="mt-1 block w-full rounded-field border border-slateux-300 p-2.5 text-sm" />
        </label>
        <label className="block text-xs font-semibold text-slateux-600">Medio de pago
          <select value={metodo} onChange={e => setMetodo(e.target.value)} required
            className="mt-1 block w-full rounded-field border border-slateux-300 bg-white p-2.5 text-sm">
            <option value="">Seleccione un medio</option>
            {metodos.map(m => <option value={m.idMetodoPago} key={m.idMetodoPago}>{m.nombre}</option>)}
          </select>
        </label>
        <label className="block text-xs font-semibold text-slateux-600">Fecha de operación
          <input type="date" required value={fecha} max={fechaHoyPeru()}
            onChange={e => setFecha(e.target.value)}
            className="mt-1 block w-full rounded-field border border-slateux-300 p-2.5 text-sm" />
        </label>
        <label className="block text-xs font-semibold text-slateux-600">Número de operación (si corresponde)
          <input type="text" maxLength={100} value={numero}
            onChange={e => setNumero(e.target.value)}
            className="mt-1 block w-full rounded-field border border-slateux-300 p-2.5 text-sm" />
        </label>
        <label className="block text-xs font-semibold text-slateux-600">Archivo del voucher
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" required={!pendiente}
            onChange={e => setArchivo(e.currentTarget.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm text-slateux-600" />
        </label>
      </fieldset>
      {pendiente && <p className="rounded-field border border-warn-200 bg-warn-50 p-3 text-xs text-warn-700">
        El archivo se subió correctamente, pero falta completar el registro. Reintente con el mismo comprobante.
      </p>}
      {error && <p role="alert" className="rounded-field bg-danger-50 p-3 text-sm text-danger-700">{error}</p>}
      {exito && <p role="status" className="flex gap-2 rounded-field bg-success-50 p-3 text-sm text-success-700">
        <CheckCircle2Icon className="h-4 w-4 shrink-0" />Comprobante recibido. En revisión por Finanzas; aún no reduce su saldo.
      </p>}
      <Button type="submit" block={false} disabled={!puedeCargar || ocupado} loading={ocupado}
        icon={<ShieldCheckIcon className="h-4 w-4" />}>
        {pendiente ? 'Reintentar registro' : 'Enviar voucher'}
      </Button>
      <p className="text-xs leading-relaxed text-slateux-500">
        El voucher se guarda en Storage privado. Solo un pago confirmado y aplicado por Finanzas se reflejará en su cronograma.
      </p>
    </form>
  </Card>;
}
