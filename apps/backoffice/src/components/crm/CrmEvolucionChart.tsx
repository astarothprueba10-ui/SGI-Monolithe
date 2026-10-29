
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import type { CrmEvolucionMes } from '../../services/crmBackend';

interface Props {
  items: CrmEvolucionMes[];
  loading?: boolean;
}

function formatearMes(mes: string): string {
  const fecha = new Date(`${mes}-01T12:00:00Z`);

  if (Number.isNaN(fecha.getTime())) {
    return mes;
  }

  return new Intl.DateTimeFormat('es-PE', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC'
  }).format(fecha);
}

export function CrmEvolucionChart({
  items,
  loading = false
}: Props) {
  const sinActividad = items.length > 0 &&
    items.every(
      (item) =>
        item.leads === 0 &&
        item.potenciales === 0 &&
        item.compradores === 0
    );

  return (
    <section className="mb-5 rounded-xl border border-brand-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-brand-100 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-brand-900">
            Evolución comercial por mes
          </h3>

          <p className="mt-1 text-xs text-brand-400">
            Comparativo de leads, clientes potenciales y
            compradores.
          </p>
        </div>

        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          Evolución mensual
        </span>
      </div>

      <div className="px-4 py-5">
        {loading ? (
          <div className="flex h-[260px] items-center justify-center text-sm text-brand-400">
            Cargando evolución comercial...
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-[260px] items-center justify-center text-sm text-brand-400">
            No hay información disponible para este período.
          </div>
        ) : (
          <>
            <div
              className="h-[260px] w-full"
              role="img"
              aria-label="Gráfico comparativo mensual de leads, potenciales y compradores"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={items}
                  margin={{
                    top: 10,
                    right: 15,
                    left: -15,
                    bottom: 5
                  }}
                  barGap={4}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E5E7EB"
                  />

                  <XAxis
                    dataKey="mes"
                    tickFormatter={formatearMes}
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fontSize: 12,
                      fill: '#64748B'
                    }}
                  />

                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fontSize: 12,
                      fill: '#64748B'
                    }}
                  />

                  <Tooltip
                    labelFormatter={(value) =>
                      formatearMes(String(value))
                    }
                    contentStyle={{
                      borderRadius: 10,
                      border: '1px solid #E2E8F0',
                      fontSize: 12
                    }}
                  />

                  <Legend
                    verticalAlign="bottom"
                    height={30}
                    iconType="circle"
                    wrapperStyle={{
                      fontSize: 12
                    }}
                  />

                  <Bar
                    dataKey="leads"
                    name="Leads"
                    fill="#60A5FA"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={24}
                  />

                  <Bar
                    dataKey="potenciales"
                    name="Clientes potenciales"
                    fill="#1E3A5C"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={24}
                  />

                  <Bar
                    dataKey="compradores"
                    name="Clientes compradores"
                    fill="#4CBB17"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {sinActividad && (
              <p className="mt-2 text-center text-xs text-brand-400">
                No se registró actividad comercial en los meses
                seleccionados.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
