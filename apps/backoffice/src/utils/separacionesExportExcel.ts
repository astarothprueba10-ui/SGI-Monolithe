import ExcelJS from 'exceljs';
import { crmBackend } from '../services/crmBackend';
import { mapOperacion } from '../services/salesService';
import type { Sale } from '../types';
import {
  filtrarSeparaciones,
  fechaCalendarioLima,
  leyendaVencimiento,
  type FiltrosSeparaciones
} from './separacionesFiltros';
import { descargarBlobExcel } from './crmExportExcel';
import { limitarPorPeriodo, periodoValido, type PeriodoComercial } from './ventasComercial';

const TAMANO = 100;
const MAX_PAGINAS = 1000;
const NAVY = '142C46';
const AZUL = '244965';
const VERDE = '1E9B74';
const PALE = 'F2F6FB';
const BORDE = 'DEE6EF';

function textoSeguro(input: string | null | undefined): string {
  const texto = input ?? '';
  return /^[=+\-@\t\r\n]/.test(texto) ? '\'' + texto : texto;
}

/** Date en hora peruana, serializable como fecha nativa de Excel sin desfase UTC. */
export function fechaExcelLima(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const origen = new Date(iso);
  if (!Number.isFinite(origen.getTime())) return null;
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(origen);
  const parte = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? 0);
  return new Date(Date.UTC(
    parte('year'), parte('month') - 1, parte('day'),
    parte('hour'), parte('minute'), parte('second')
  ));
}

async function obtenerSeparacionesAutorizadas(): Promise<Sale[]> {
  const result: Sale[] = [];
  const vistos = new Set<number>();
  let total = 0;

  for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
    // Endpoint exclusivo sales.export; conserva el alcance del SP comercial.
    const respuesta = await crmBackend.listarOperacionesParaExportacion({
      pagina, tamano: TAMANO
    });
    if (!Array.isArray(respuesta.items) || !Number.isFinite(respuesta.total)) {
      throw new Error('Respuesta inválida del servidor al preparar el Excel.');
    }
    total = respuesta.total;
    for (const item of respuesta.items) {
      if (item.tipo !== 'SEPARACION' || !Number.isSafeInteger(item.id)) {
        throw new Error('El servidor devolvió operaciones no válidas para exportar.');
      }
      if (!vistos.has(item.id)) {
        vistos.add(item.id);
        result.push(mapOperacion(item));
      }
    }
    if (result.length >= total) return result;
    if (respuesta.items.length === 0) {
      throw new Error('La exportación quedó incompleta; vuelve a intentarlo.');
    }
  }
  throw new Error('Se alcanzó el límite de páginas de exportación; no se generó un archivo parcial.');
}

const columnas: { titulo: string; ancho: number }[] = [
  { titulo: 'Fecha de registro', ancho: 21 },
  { titulo: 'Código de reserva', ancho: 24 },
  { titulo: 'Prospecto', ancho: 33 },
  { titulo: 'DNI / Documento', ancho: 18 },
  { titulo: 'Proyecto', ancho: 37 },
  { titulo: 'Lote', ancho: 19 },
  { titulo: 'Método de pago', ancho: 27 },
  { titulo: 'Monto (S/)', ancho: 17 },
  { titulo: 'Asesor', ancho: 31 },
  { titulo: 'Estado', ancho: 18 },
  { titulo: 'Vencimiento', ancho: 21 },
  { titulo: 'Tiempo restante', ancho: 20 }
];

export async function exportarSeparacionesExcel(
  filtros: FiltrosSeparaciones,
  periodo?: PeriodoComercial
): Promise<{ total: number; nombre: string }> {
  if (periodo && !periodoValido(periodo)) {
    throw new Error('Seleccione un período comercial global válido.');
  }
  if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
    throw new Error('La fecha desde no puede ser posterior a la fecha hasta.');
  }
  const autorizados = await obtenerSeparacionesAutorizadas();
  const registros = filtrarSeparaciones(
    periodo ? limitarPorPeriodo(autorizados, periodo) : autorizados, filtros
  );
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SGI MONOLITHE';
  wb.created = new Date();
  const ws = wb.addWorksheet('Separaciones', {
    properties: { defaultRowHeight: 21 },
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });
  ws.columns = columnas.map((col) => ({ width: col.ancho }));
  ws.mergeCells('A1:L2');
  const titulo = ws.getCell('A1');
  titulo.value = 'MONOLITHE  |  SEPARACIONES INMOBILIARIAS';
  titulo.font = { name: 'Aptos Display', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
  titulo.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  titulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + NAVY } };
  ws.getRow(1).height = 27;
  ws.getRow(2).height = 23;

  const ahora = new Date();
  const fechaGeneracion = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(ahora);
  ws.mergeCells('A3:F3');
  ws.getCell('A3').value = 'Reporte generado: ' + fechaGeneracion + ' (Lima)';
  ws.mergeCells('G3:L3');
  ws.getCell('G3').value = 'Registros autorizados: ' + registros.length;
  ws.getCell('G3').alignment = { horizontal: 'right' };

  ws.mergeCells('A4:L4');
  ws.getCell('A4').value = textoSeguro(
    'Período global: ' + (periodo ? periodo.desde+' a '+periodo.hasta : 'Sin restricción') +
    '  |  Filtros · Búsqueda: ' + (filtros.busqueda || 'Todas') +
    '  |  Método: ' + (filtros.metodoPago === 'all' ? 'Todos' : filtros.metodoPago) +
    '  |  Asesor: ' + (filtros.asesor === 'all' ? 'Todos' : filtros.asesor) +
    '  |  Proyecto: ' + (filtros.proyecto === 'all' ? 'Todos' : filtros.proyecto) +
    '  |  Fechas: ' + (filtros.desde || 'Inicio') + ' a ' + (filtros.hasta || 'Hoy / sin límite') +
    '  |  Estado: ' + (filtros.estado === 'all' ? 'Todos' : filtros.estado)
  );
  ws.getRow(4).height = 26;
  for (const row of [3, 4]) {
    const celda = ws.getCell('A' + row);
    celda.font = { name: 'Aptos', size: 9, color: { argb: 'FF' + AZUL } };
    celda.alignment = { vertical: 'middle', wrapText: row === 4, indent: 1 };
  }
  ws.getCell('G3').font = { name: 'Aptos', size: 10, bold: true, color: { argb: 'FF' + VERDE } };
  ws.getRow(5).height = 9;

  const filaHeader = 6;
  const filaCabecera = ws.getRow(filaHeader);
  filaCabecera.values = columnas.map((col) => col.titulo);
  filaCabecera.height = 30;
  filaCabecera.eachCell((celda) => {
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + NAVY } };
    celda.font = { name: 'Aptos', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    celda.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  });

  const timestamp = Date.now();
  registros.forEach((op, index) => {
    const fila = ws.getRow(filaHeader + index + 1);
    const valores: (string | number | Date | null)[] = [
      fechaExcelLima(op.dateIso),
      textoSeguro(op.code),
      textoSeguro(op.buyer),
      textoSeguro(op.document),
      textoSeguro(op.project),
      textoSeguro(op.lot),
      textoSeguro(op.paymentMethod),
      op.amount,
      textoSeguro(op.advisor),
      textoSeguro(op.status),
      fechaExcelLima(op.expiresAtIso),
      leyendaVencimiento(op.expiresAtIso, op.status, timestamp) ?? ''
    ];
    fila.values = valores;
    fila.height = 24;
    fila.eachCell({ includeEmpty: true }, (celda) => {
      celda.fill = { type: 'pattern', pattern: 'solid',
        fgColor: { argb: 'FF' + (index % 2 ? PALE : 'FFFFFF') } };
      celda.font = { name: 'Aptos', size: 10, color: { argb: 'FF' + NAVY } };
      celda.border = { bottom: { style: 'hair', color: { argb: 'FF' + BORDE } } };
      celda.alignment = { vertical: 'middle', indent: 1 };
    });
    for (const pos of [2, 4, 6]) fila.getCell(pos).numFmt = '@';
    fila.getCell(1).numFmt = 'dd/mm/yyyy hh:mm';
    fila.getCell(11).numFmt = 'dd/mm/yyyy hh:mm';
    fila.getCell(8).numFmt = '#,##0.00';
    fila.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
    fila.getCell(8).font = { bold: true, color: { argb: 'FF' + NAVY } };
    fila.getCell(10).font = { bold: true, color: {
      argb: 'FF' + (op.status === 'VIGENTE' ? '13719E' : op.status === 'CONVERTIDA' ? VERDE : 'B24635')
    } };
    if (fila.getCell(12).value === 'Vencida') {
      fila.getCell(12).font = { bold: true, color: { argb: 'FFB42318' } };
    }
  });

  if (registros.length === 0) {
    ws.mergeCells('A7:L7');
    ws.getCell('A7').value = 'Sin separaciones dentro de los filtros seleccionados.';
    ws.getCell('A7').font = { italic: true, color: { argb: 'FF64748B' } };
  }
  ws.autoFilter = { from: { row: filaHeader, column: 1 },
    to: { row: filaHeader + registros.length, column: columnas.length } };
  ws.views = [{ state: 'frozen', ySplit: filaHeader, xSplit: 0 }];
  ws.getColumn(3).alignment = { vertical: 'middle', wrapText: true };
  ws.getColumn(5).alignment = { vertical: 'middle', wrapText: true };

  const nombre = 'MONOLITHE_Separaciones_' + fechaCalendarioLima(ahora.toISOString()) + '.xlsx';
  const buffer = await wb.xlsx.writeBuffer();
  descargarBlobExcel(new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }), nombre);
  return { total: registros.length, nombre };
}
