
import type { PeriodoCrmModo } from '../components/crm/CrmPeriodoGlobal';

export interface RangoCrm {
  desde: string;
  hastaExclusivo: string;
}

function leerFecha(fecha: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return null;
  }

  const resultado = new Date(`${fecha}T00:00:00.000Z`);

  if (
    Number.isNaN(resultado.getTime()) ||
    resultado.toISOString().slice(0, 10) !== fecha
  ) {
    return null;
  }

  return resultado;
}

function formatoFecha(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

function sumarDias(fecha: Date, dias: number): Date {
  const resultado = new Date(fecha);
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return resultado;
}

export function calcularRangoCrm(
  modo: PeriodoCrmModo,
  fechaReferencia: string,
  fechaDesde: string,
  fechaHasta: string
): RangoCrm | null {
  const referencia = leerFecha(fechaReferencia);

  if (!referencia) {
    return null;
  }

  let inicio: Date;
  let finExclusivo: Date;

  switch (modo) {
    case 'HOY':
      inicio = referencia;
      finExclusivo = sumarDias(referencia, 1);
      break;

    case 'SEMANA': {
      const diaSemana = (referencia.getUTCDay() + 6) % 7;

      inicio = sumarDias(referencia, -diaSemana);
      finExclusivo = sumarDias(inicio, 7);
      break;
    }

    case 'MES':
      inicio = new Date(Date.UTC(
        referencia.getUTCFullYear(),
        referencia.getUTCMonth(),
        1
      ));

      finExclusivo = new Date(Date.UTC(
        referencia.getUTCFullYear(),
        referencia.getUTCMonth() + 1,
        1
      ));
      break;

    case 'ANIO':
      inicio = new Date(Date.UTC(
        referencia.getUTCFullYear(),
        0,
        1
      ));

      finExclusivo = new Date(Date.UTC(
        referencia.getUTCFullYear() + 1,
        0,
        1
      ));
      break;

    case 'RANGO': {
      const desde = leerFecha(fechaDesde);
      const hasta = leerFecha(fechaHasta);

      if (!desde || !hasta || desde > hasta) {
        return null;
      }

      inicio = desde;
      finExclusivo = sumarDias(hasta, 1);
      break;
    }
  }

  return {
    desde: `${formatoFecha(inicio)}T00:00:00-05:00`,
    hastaExclusivo:
      `${formatoFecha(finExclusivo)}T00:00:00-05:00`
  };
}
