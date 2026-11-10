import { useMemo } from 'react';
import { CalendarDaysIcon, TrendingUpIcon, BookmarkCheckIcon, BriefcaseBusinessIcon } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Sale } from '../../types';
import { currency } from '../../utils/format';
import {
  crearPeriodoComercial, limitarPorPeriodo, periodoValido,
  resumenMensualComercial, type PeriodoComercial, type ModoPeriodoComercial
} from '../../utils/ventasComercial';

interface Props {
  operaciones: Sale[];
  periodo: PeriodoComercial;
  onChange: (siguiente: PeriodoComercial) => void;
}

const OPCIONES: { modo: ModoPeriodoComercial; nombre: string }[] = [
  {modo:'tres_meses',nombre:'3 meses'},
  {modo:'hoy',nombre:'Hoy'},
  {modo:'semana',nombre:'Semana'},
  {modo:'mes',nombre:'Mes'},
  {modo:'anio',nombre:'Año'},
  {modo:'rango',nombre:'Rango'}
];

export function ResumenComercialOperaciones({ operaciones, periodo, onChange }: Props) {
  const autorizado = useMemo(
    () => limitarPorPeriodo(operaciones,periodo),[operaciones,periodo]
  );
  const mensual = useMemo(
    () => resumenMensualComercial(operaciones,periodo),[operaciones,periodo]
  );
  const resumen = useMemo(() => {
    const separaciones = autorizado.filter(x=>x.type==='Separación');
    const ventas = autorizado.filter(x=>x.type==='Venta');
    return {
      separaciones:separaciones.length,
      importeSeparado:separaciones.reduce((sum,x)=>sum+x.amount,0),
      ventas:ventas.length,
      importeVendido:ventas.reduce((sum,x)=>sum+x.amount,0)
    };
  },[autorizado]);
  const valido = periodoValido(periodo);
  const esDiaUnico = valido && periodo.desde === periodo.hasta;
  const fechaLegible = esDiaUnico
    ? new Intl.DateTimeFormat('es-PE', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
      }).format(new Date(`${periodo.desde}T12:00:00Z`))
    : '';
  const tituloGrafico = esDiaUnico ? 'Operaciones del día' : 'Evolución mensual de operaciones';
  const descripcionGrafico = esDiaUnico
    ? `Separaciones y ventas del ${fechaLegible}`
    : 'Separaciones y ventas agrupadas por mes, solo dentro del período seleccionado';
  return (
    <section className="mb-5 space-y-4" aria-label="Resumen comercial global autorizado">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-100 bg-white px-4 py-4 shadow-sm sm:px-5">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-blue-50 p-2.5 text-blue-700">
            <CalendarDaysIcon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-brand-900">Período comercial global</h2>
            <p className="mt-0.5 text-xs text-brand-500">
              Actualiza los indicadores, el gráfico y el período de los Excel. No modifica la tabla.
            </p>
          </div>
        </div>
        <div className="flex max-w-full flex-wrap items-center gap-1 rounded-lg border border-brand-100 bg-slate-50 p-1">
          {OPCIONES.map(({modo,nombre})=>(
            <button type="button" key={modo} aria-pressed={periodo.modo===modo}
              onClick={()=>onChange(crearPeriodoComercial(modo))}
              className={`rounded-md px-3 py-2 text-xs font-semibold transition sm:py-1.5
                ${periodo.modo===modo?'bg-brand-900 text-white shadow-sm':'text-brand-700 hover:bg-white'}`}>
              {nombre}
            </button>
          ))}
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 text-xs text-brand-700 lg:w-auto">
          <label className="flex min-w-0 flex-1 items-center gap-2 lg:flex-none">
            <span className="shrink-0">Desde</span>
            <input type="date" value={periodo.desde}
              onChange={e=>onChange({...periodo,modo:'rango',desde:e.target.value})}
              className="min-w-0 rounded-md border border-brand-200 bg-white px-2 py-2 text-xs"/>
          </label>
          <label className="flex min-w-0 flex-1 items-center gap-2 lg:flex-none">
            <span className="shrink-0">Hasta</span>
            <input type="date" value={periodo.hasta}
              onChange={e=>onChange({...periodo,modo:'rango',hasta:e.target.value})}
              className="min-w-0 rounded-md border border-brand-200 bg-white px-2 py-2 text-xs"/>
          </label>
        </div>
        {!valido && (
          <p role="alert" className="w-full text-xs font-semibold text-red-600">
            Selecciona un rango de fechas válido; la fecha inicial no debe superar la final.
          </p>
        )}
      </div>
      <div>
        <h2 className="text-sm font-semibold text-brand-900">Resumen comercial</h2>
        <p className="mt-0.5 text-xs text-brand-500">
          Datos de tu cartera autorizada entre {periodo.desde || '—'} y {periodo.hasta || '—'}.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.75fr)]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-brand-700">Separaciones</h3>
              <span className="rounded-lg bg-sky-50 p-2 text-sky-700">
                <BookmarkCheckIcon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-3xl font-extrabold tabular-nums text-brand-900">
              {resumen.separaciones}
            </p>
            <p className="mt-1 text-xs text-brand-500">Importe registrado: {currency(resumen.importeSeparado)}</p>
          </div>
          <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-brand-700">Ventas</h3>
              <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                <BriefcaseBusinessIcon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-3xl font-extrabold tabular-nums text-brand-900">
              {resumen.ventas}
            </p>
            <p className="mt-1 text-xs text-brand-500">Monto de ventas: {currency(resumen.importeVendido)}</p>
          </div>
        </div>
        <div className="min-w-0 rounded-xl border border-brand-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-brand-900">{tituloGrafico}</h3>
              <p className="mt-0.5 text-xs text-brand-500">{descripcionGrafico}</p>
            </div>
            <span className="rounded-lg bg-brand-50 p-2 text-brand-700">
              <TrendingUpIcon className="h-4 w-4" />
            </span>
          </div>
          <div className="w-full overflow-x-auto" role="img"
            aria-label={`${tituloGrafico}: separaciones y ventas de la cartera autorizada`}>
            <div style={{minWidth: Math.max(300,mensual.length*63)}} className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mensual} margin={{top:8,right:10,left:-20,bottom:2}} barGap={4}>
                  <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="#E2E8F0"/>
                  <XAxis dataKey="mes" tick={{fontSize:11,fill:'#64748B'}} tickLine={false} axisLine={false}/>
                  <YAxis allowDecimals={false} tick={{fontSize:11,fill:'#64748B'}} tickLine={false} axisLine={false}/>
                  <Tooltip cursor={{fill: "#F1F5F9"}} />
                  <Legend wrapperStyle={{fontSize:12}}/>
                  <Bar dataKey="separaciones" name="Separaciones" fill="#38A3D1" radius={[4,4,0,0]} maxBarSize={35}/>
                  <Bar dataKey="ventas" name="Ventas" fill="#16A77A" radius={[4,4,0,0]} maxBarSize={35}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
