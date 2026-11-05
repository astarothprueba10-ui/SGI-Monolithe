
import { useEffect, useState, type FormEvent } from 'react';
import {
    crmBackend,
    type CrmConciliacionSeparacion,
    type CrmConciliacionesResponse
} from '../../services/crmBackend';
import { ConciliarPagoSeparacionModal } from './ConciliarPagoSeparacionModal';
import { Gate } from '../auth/PermissionRoute';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Field';
import { Table, TD, TH, TR } from '../ui/Table';
import { currency } from '../../utils/format';

type Estado = 'TODOS' | 'PENDIENTE' | 'CONCILIADO' | 'REQUIERE_REVISION';

const fechaPeru = (valor: string) =>
    new Date(valor).toLocaleDateString('es-PE', {
        timeZone: 'America/Lima',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

export function ConciliacionesSeparacionPanel() {
    const [items, setItems] = useState<CrmConciliacionSeparacion[]>([]);
    const [cuentas, setCuentas] =
        useState<CrmConciliacionesResponse['cuentas']>([]);

    const [categorias, setCategorias] =
        useState<CrmConciliacionesResponse['categorias']>([]);

    const [pagoSeleccionado, setPagoSeleccionado] =
        useState<CrmConciliacionSeparacion | null>(null);
    const [estado, setEstado] = useState<Estado>('TODOS');
    const [busqueda, setBusqueda] = useState('');
    const [busquedaAplicada, setBusquedaAplicada] = useState('');
    const [pagina, setPagina] = useState(1);
    const [paginas, setPaginas] = useState(1);
    const [total, setTotal] = useState(0);
    const [revision, setRevision] = useState(0);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let vigente = true;

        const cargar = async () => {
            setCargando(true);
            setError(null);

            try {
                const resultado = await crmBackend.listarConciliacionesSeparacion({
                    estado,
                    busqueda: busquedaAplicada,
                    pagina,
                    tamano: 20
                });

                if (!vigente) return;

                setItems(resultado.items ?? []);
                setCuentas(resultado.cuentas ?? []);
                setCategorias(resultado.categorias ?? []);
                setTotal(resultado.total ?? 0);
                setPaginas(Math.max(1, resultado.paginas ?? 1));
            } catch (err) {
                if (!vigente) return;

                setItems([]);
                setCuentas([]);
                setCategorias([]);
                setTotal(0);
                setError(
                    err instanceof Error
                        ? err.message
                        : 'No se pudieron cargar las conciliaciones.'
                );
            } finally {
                if (vigente) setCargando(false);
            }
        };

        void cargar();

        return () => {
            vigente = false;
        };
    }, [estado, busquedaAplicada, pagina, revision]);

    const buscar = (e: FormEvent) => {
        e.preventDefault();
        setPagina(1);
        setBusquedaAplicada(busqueda.trim());
        setRevision((valor) => valor + 1);
    };

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Los movimientos vinculados a cuentas DEMO son simulaciones
                académicas y no representan ingresos bancarios reales.
            </div>

            <Card className="p-4">
                <form
                    onSubmit={buscar}
                    className="flex flex-wrap items-end justify-between gap-3"
                >
                    <div className="flex min-w-0 flex-1 gap-2">
                        <Input
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar pago, comprador, lote o venta"
                            className="w-full"
                        />
                        <Button type="submit" variant="secondary">
                            Buscar
                        </Button>
                    </div>

                    <Select
                        value={estado}
                        onChange={(e) => {
                            setEstado(e.target.value as Estado);
                            setPagina(1);
                        }}
                    >
                        <option value="TODOS">Todos los estados</option>
                        <option value="PENDIENTE">Pendientes</option>
                        <option value="CONCILIADO">Conciliados</option>
                        <option value="REQUIERE_REVISION">Requieren revisión</option>
                    </Select>

                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setRevision((valor) => valor + 1)}
                    >
                        Actualizar
                    </Button>
                </form>
            </Card>

            <Card>
                {cargando ? (
                    <p className="p-6 text-sm text-brand-500">
                        Consultando conciliaciones en Finanzas...
                    </p>
                ) : error ? (
                    <div className="space-y-2 p-6">
                        <p className="text-sm font-medium text-red-700">
                            No se pudieron consultar las conciliaciones.
                        </p>
                        <p className="text-xs text-brand-500">{error}</p>
                    </div>
                ) : items.length === 0 ? (
                    <p className="p-6 text-sm text-brand-500">
                        No existen conciliaciones para los filtros seleccionados.
                    </p>
                ) : (
                    <Table
                        head={
                            <>
                                <TH>Pago / movimiento</TH>
                                <TH>Comprador</TH>
                                <TH>Lote / venta</TH>
                                <TH>Cuenta receptora</TH>
                                <TH>Fecha</TH>
                                <TH align="right">Monto</TH>
                                <TH>Estado</TH>
                            </>
                        }
                    >
                        {items.map((item) => (
                            <TR key={item.id_pago}>
                                <TD>
                                    <p className="font-semibold text-brand-900">
                                        {item.codigo_pago}
                                    </p>
                                    <p className="text-xs text-brand-500">
                                        {item.codigo_movimiento ?? 'Sin movimiento'}
                                    </p>
                                </TD>

                                <TD className="text-sm">
                                    {item.comprador}
                                </TD>

                                <TD>
                                    <p className="font-medium">{item.codigo_lote}</p>
                                    <p className="text-xs text-brand-500">
                                        {item.codigo_venta ?? item.codigo_reserva}
                                    </p>
                                </TD>

                                <TD>
                                    <p className="text-xs">
                                        {item.codigo_cuenta || 'Sin cuenta asignada'}
                                    </p>
                                    {item.cuenta_demo && (
                                        <span className="text-xs font-semibold text-amber-700">
                                            CUENTA DEMO
                                        </span>
                                    )}
                                </TD>

                                <TD className="text-xs text-brand-600">
                                    {fechaPeru(item.fecha_operacion)}
                                </TD>

                                <TD align="right" className="font-semibold">
                                    {currency(Number(item.monto))}
                                </TD>

                                <TD>
                                    <span
                                        className={
                                            item.estado_conciliacion === 'CONCILIADO'
                                                ? 'font-semibold text-emerald-700'
                                                : item.estado_conciliacion === 'PENDIENTE'
                                                    ? 'font-semibold text-amber-700'
                                                    : 'font-semibold text-red-700'
                                        }
                                    >
                                        {item.estado_conciliacion.replace(/_/g, ' ')}
                                    </span>

                                    {item.estado_conciliacion === 'PENDIENTE' && (
                                        <Gate permission="finance.edit">
                                            <div className="mt-2">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="primary"
                                                    onClick={() => setPagoSeleccionado(item)}
                                                >
                                                    Conciliar
                                                </Button>
                                            </div>
                                        </Gate>
                                    )}

                                </TD>
                            </TR>
                        ))}
                    </Table>
                )}

                <div className="flex items-center justify-between border-t border-brand-100 p-4">
                    <p className="text-xs text-brand-500">
                        {total} registros
                    </p>

                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="secondary"
                            disabled={cargando || pagina <= 1}
                            onClick={() => setPagina((p) => Math.max(1, p - 1))}
                        >
                            Anterior
                        </Button>

                        <span className="text-xs">
                            {pagina} / {paginas}
                        </span>

                        <Button
                            size="sm"
                            variant="secondary"
                            disabled={cargando || pagina >= paginas}
                            onClick={() => setPagina((p) => p + 1)}
                        >
                            Siguiente
                        </Button>
                    </div>
                </div>
            </Card>

            {pagoSeleccionado && (
                <ConciliarPagoSeparacionModal
                    item={pagoSeleccionado}
                    cuentas={cuentas}
                    categorias={categorias}
                    onClose={() => setPagoSeleccionado(null)}
                    onConciliado={() => {
                        setRevision((valor) => valor + 1);
                    }}
                />
            )}

        </div>
    );
}
