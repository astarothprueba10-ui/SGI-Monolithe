
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Field';
import {
  crmBackend,
  type CrmConciliacionSeparacion,
  type CrmConciliacionesResponse
} from '../../services/crmBackend';
import { currency } from '../../utils/format';

interface Props {
  item: CrmConciliacionSeparacion;
  cuentas: CrmConciliacionesResponse['cuentas'];
  categorias: CrmConciliacionesResponse['categorias'];
  onClose: () => void;
  onConciliado: () => void | Promise<void>;
}

export function ConciliarPagoSeparacionModal({
  item,
  cuentas,
  categorias,
  onClose,
  onConciliado
}: Props) {
  const [cuentaId, setCuentaId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const bloqueo = useRef(false);

  const tipoRequerido =
    item.metodo_pago === 'TRANSFERENCIA' ||
    item.metodo_pago === 'DEPOSITO'
      ? 'BANCO'
      : item.metodo_pago === 'EFECTIVO'
        ? 'CAJA'
        : item.metodo_pago === 'YAPE_PLIN'
          ? 'BILLETERA_DIGITAL'
          : null;

  const cuentasCompatibles = cuentas.filter(
    (cuenta) =>
      cuenta.moneda === item.moneda &&
      (!tipoRequerido || cuenta.tipo === tipoRequerido)
  );

  const cuentaSeleccionada = cuentasCompatibles.find(
    (cuenta) => cuenta.id_cuenta_financiera === Number(cuentaId)
  );

  const categoriaSeleccionada = categorias.find(
    (categoria) => categoria.id_categoria === Number(categoriaId)
  );

  const cerrar = () => {
    if (guardando || bloqueo.current) return;
    onClose();
  };

  const continuar = () => {
    if (!cuentaSeleccionada || !categoriaSeleccionada) {
      toast.error('Selecciona una cuenta y una categoría válidas.');
      return;
    }

    if (item.estado_conciliacion !== 'PENDIENTE') {
      toast.error('Este pago no está pendiente de conciliación.');
      return;
    }

    setConfirmando(true);
  };

  const ejecutarConciliacion = async () => {
    if (bloqueo.current || guardando) return;

    if (!cuentaSeleccionada || !categoriaSeleccionada) {
      toast.error('La selección financiera no es válida.');
      setConfirmando(false);
      return;
    }

    bloqueo.current = true;
    setGuardando(true);

    try {
      const resultado = await crmBackend.conciliarPagoSeparacion(
        item.id_pago,
        {
          idCuentaFinanciera: cuentaSeleccionada.id_cuenta_financiera,
          idCategoria: categoriaSeleccionada.id_categoria
        }
      );

      if (!resultado.success) {
        throw new Error('No se pudo confirmar la conciliación.');
      }

      toast.success(
        resultado.estado === 'YA_CONCILIADO'
          ? 'El pago ya se encontraba conciliado.'
          : 'Pago conciliado correctamente.'
      );

      try {
        await onConciliado();
      } catch {
        toast.error(
          'La conciliación se realizó, pero no se pudo actualizar el listado.'
        );
      }

      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Ocurrió un error al conciliar el pago.'
      );
    } finally {
      bloqueo.current = false;
      setGuardando(false);
    }
  };

  return (
    <Modal
      open={true}
      onClose={cerrar}
      title={
        confirmando
          ? 'Confirmación definitiva de conciliación'
          : 'Conciliar pago de separación'
      }
      description={`Pago ${item.codigo_pago}`}
      footer={
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={guardando}
            onClick={() => {
              if (confirmando) {
                setConfirmando(false);
              } else {
                cerrar();
              }
            }}
          >
            {confirmando ? 'Volver' : 'Cancelar'}
          </Button>

          <Button
            type="button"
            variant="primary"
            disabled={
              guardando ||
              !cuentaSeleccionada ||
              !categoriaSeleccionada ||
              item.estado_conciliacion !== 'PENDIENTE'
            }
            onClick={() => {
              if (confirmando) {
                void ejecutarConciliacion();
              } else {
                continuar();
              }
            }}
          >
            {guardando
              ? 'Conciliando...'
              : confirmando
                ? 'Confirmar conciliación definitiva'
                : 'Continuar'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
          <p className="text-xs text-brand-500">Pago</p>
          <p className="font-semibold text-brand-900">
            {item.codigo_pago}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-brand-500">Comprador</p>
              <p className="font-medium">{item.comprador}</p>
            </div>

            <div>
              <p className="text-xs text-brand-500">Lote</p>
              <p className="font-medium">{item.codigo_lote}</p>
            </div>

            <div>
              <p className="text-xs text-brand-500">Importe</p>
              <p className="font-semibold">
                {currency(Number(item.monto))}
              </p>
            </div>

            <div>
              <p className="text-xs text-brand-500">Método</p>
              <p className="font-medium">{item.metodo_pago}</p>
            </div>
          </div>
        </div>

        {!confirmando ? (
          <>
            <div>
              <label
                htmlFor="cuenta-conciliacion"
                className="mb-1 block text-sm font-medium text-brand-800"
              >
                Cuenta receptora
              </label>

              <Select
                id="cuenta-conciliacion"
                value={cuentaId}
                disabled={guardando}
                onChange={(e) => setCuentaId(e.target.value)}
              >
                <option value="">Seleccionar cuenta</option>

                {cuentasCompatibles.map((cuenta) => (
                  <option
                    key={cuenta.id_cuenta_financiera}
                    value={cuenta.id_cuenta_financiera}
                  >
                    {cuenta.nombre}
                    {cuenta.es_demo ? ' (DEMO)' : ''}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label
                htmlFor="categoria-conciliacion"
                className="mb-1 block text-sm font-medium text-brand-800"
              >
                Categoría financiera
              </label>

              <Select
                id="categoria-conciliacion"
                value={categoriaId}
                disabled={guardando}
                onChange={(e) => setCategoriaId(e.target.value)}
              >
                <option value="">Seleccionar categoría</option>

                {categorias.map((categoria) => (
                  <option
                    key={categoria.id_categoria}
                    value={categoria.id_categoria}
                  >
                    {categoria.nombre}
                  </option>
                ))}
              </Select>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
            <h3 className="text-sm font-semibold text-amber-900">
              Verifica antes de registrar
            </h3>

            <p className="mt-3 text-xs text-amber-900">
              Cuenta: <strong>{cuentaSeleccionada?.nombre}</strong>
            </p>

            <p className="mt-2 text-xs text-amber-900">
              Categoría: <strong>{categoriaSeleccionada?.nombre}</strong>
            </p>

            <p className="mt-3 text-xs text-amber-900">
              Se registrará un movimiento financiero por{' '}
              <strong>{currency(Number(item.monto))}</strong>.
              No se generará un nuevo pago.
            </p>
          </div>
        )}

        {cuentaSeleccionada?.es_demo && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-800">
              Cuenta DEMO: operación de simulación académica.
              No representa dinero recibido en un banco real.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}