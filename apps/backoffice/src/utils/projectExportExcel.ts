import ExcelJS from 'exceljs';
import type { ProyectoResponse } from '../types/core';

const DARK = '1A3A5C', GREEN = '4CBB17', ALT = 'F0F7FF', BORDER = 'D0D8E4';
const COLS = [
  { title: 'ID', width: 10 }, { title: 'Código', width: 17 },
  { title: 'Proyecto', width: 38 }, { title: 'Estado', width: 19 },
  { title: 'Habilitado', width: 16 }, { title: 'Descripción', width: 55 },
  { title: 'Dirección', width: 35 }, { title: 'Referencia', width: 30 },
  { title: 'País', width: 15 }, { title: 'Departamento', width: 22 },
  { title: 'Provincia', width: 22 }, { title: 'Distrito', width: 22 },
  { title: 'Área total (m²)', width: 20 }, { title: 'Inicio', width: 17 },
  { title: 'Fin estimada', width: 19 }
] as const;

function safeText(value: string | null | undefined): string {
  const content = String(value ?? '');
  return /^[=+\-@\t\r]/.test(content) ? "'" + content : content;
}

function excelDate(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function writeTitle(ws: ExcelJS.Worksheet, count: number): void {
  const last = COLS.length;
  ws.mergeCells(1, 1, 1, last);
  const title = ws.getCell(1, 1);
  title.value = 'MONOLITHE | PROYECTOS';
  title.font = { name: 'Arial', size: 17, bold: true, color: { argb: 'FF' + DARK } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 32;
  ws.mergeCells(2, 1, 2, last);
  const subtitle = ws.getCell(2, 1);
  subtitle.value = 'Reporte general de proyectos inmobiliarios';
  subtitle.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF' + GREEN } };
  subtitle.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 23;
  ws.mergeCells(3, 1, 3, 8);
  ws.getCell(3, 1).value = 'Exportado: ' + new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });
  ws.mergeCells(3, 9, 3, last);
  ws.getCell(3, 9).value = 'Total de proyectos: ' + count;
  ws.getCell(3, 9).alignment = { horizontal: 'right' };
  ws.getRow(4).height = 8;
}

function writeHeader(ws: ExcelJS.Worksheet): void {
  const row = ws.getRow(5);
  row.values = COLS.map(col => col.title);
  row.height = 28;
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + DARK } };
    cell.font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: COLS.length } };
  ws.views = [{ state: 'frozen', ySplit: 5 }];
}

function projectValues(p: ProyectoResponse): (string | number | Date | null)[] {
  return [
    p.idProyecto, safeText(p.codigo), safeText(p.nombre),
    safeText(p.nombreEstadoProyecto ?? p.codigoEstadoProyecto), p.activo ? 'Sí' : 'No',
    safeText(p.descripcion), safeText(p.direccion), safeText(p.ubicacionReferencia),
    safeText(p.pais), safeText(p.departamento), safeText(p.provincia), safeText(p.distrito),
    p.areaTotalM2 ?? null, excelDate(p.fechaInicio), excelDate(p.fechaFinEstimada)
  ];
}

function writeProject(ws: ExcelJS.Worksheet, project: ProyectoResponse, index: number): void {
  const row = ws.getRow(index + 6);
  row.values = projectValues(project);
  row.height = 22;
  row.eachCell({ includeEmpty: true }, cell => {
    cell.font = { name: 'Arial', size: 10, color: { argb: 'FF' + DARK } };
    cell.alignment = { vertical: 'middle' };
    cell.border = { bottom: { style: 'hair', color: { argb: 'FF' + BORDER } } };
    if (index % 2) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + ALT } };
  });
  ws.getCell(index + 6, 2).numFmt = '@';
  ws.getCell(index + 6, 13).numFmt = '#,##0.00';
  ws.getCell(index + 6, 14).numFmt = 'dd/mm/yyyy';
  ws.getCell(index + 6, 15).numFmt = 'dd/mm/yyyy';
}

export async function generarExcelProyectos(proyectos: ProyectoResponse[]): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MONOLITHE';
  wb.created = new Date();
  const ws = wb.addWorksheet('Proyectos');
  COLS.forEach((col, i) => { ws.getColumn(i + 1).width = col.width; });
  writeTitle(ws, proyectos.length);
  writeHeader(ws);
  if (!proyectos.length) ws.getCell(6, 1).value = 'Sin proyectos registrados';
  proyectos.forEach((p, i) => writeProject(ws, p, i));
  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function nombreArchivoProyectos(): string {
  const date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  return 'MONOLITHE_Proyectos_' + date + '.xlsx';
}

export function descargarExcelProyectos(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
