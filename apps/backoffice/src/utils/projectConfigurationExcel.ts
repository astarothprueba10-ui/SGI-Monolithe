import ExcelJS from 'exceljs';
import { coreService } from '../services/coreService';
import type { ProyectoResponse } from '../types/core';
import { HOJAS_ESTRUCTURA, INSTRUCCIONES_PLANTILLA, VERSION_PLANTILLA } from '../lib/projectTemplateSchema';
import { descargarExcelProyectos } from './projectExportExcel';

function encabezado(ws: ExcelJS.Worksheet, columnas: readonly string[]) {
  ws.addRow([...columnas]);
  ws.getRow(1).height = 25;
  ws.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF193A55' } };
  });
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columnas.length } };
  columnas.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    col.width = Math.max(19, c.length + 4);
    if (c.includes('codigo') || c === 'numero' || c.includes('fecha') || c.includes('vigente')) col.numFmt = '@';
  });
}

function guia(wb: ExcelJS.Workbook, project: ProyectoResponse) {
  const ws = wb.addWorksheet('Instrucciones');
  ws.getColumn(1).width = 29;
  ws.getColumn(2).width = 115;
  ws.addRows([['MONOLITHE', 'Plantilla de estructura y configuración comercial'],
    ['version_plantilla', VERSION_PLANTILLA], ['codigo_proyecto', project.codigo],
    ['proyecto', project.nombre], ['ESTADO', 'Carga física y comercial en borrador habilitada']]);
  ws.getRow(1).font = { bold: true, size: 15, color: { argb: 'FF193A55' } };
  INSTRUCCIONES_PLANTILLA.forEach((texto, i) => {
    const row = ws.addRow([i + 1, texto]);
    row.height = 35;
    row.alignment = { wrapText: true, vertical: 'middle' };
  });
}

async function catalogos(wb: ExcelJS.Workbook, idProyecto: number) {
  const [estadosEtapa, estadosManzana, tipos, etapas, zonas] = await Promise.all([
    coreService.getStageStatuses(), coreService.getBlockStatuses(), coreService.getLotTypes(),
    coreService.getStagesByProject(idProyecto), coreService.getZonesByProject(idProyecto)
  ]);
  const ws = wb.addWorksheet('Catalogos');
  encabezado(ws, ['catalogo', 'codigo', 'nombre']);
  const grupos = [['estado_etapa', estadosEtapa], ['estado_manzana', estadosManzana],
    ['tipo_lote', tipos], ['etapa_fisica_existente', etapas], ['zona_existente', zonas]] as const;
  grupos.forEach(([nombre, items]) => items.filter(i => i.activo).forEach(i => ws.addRow([nombre, i.codigo, i.nombre])));
  ['PROMOCION', 'REGULAR', 'ANTICIPADA', 'BLOQUEADA'].forEach(v => ws.addRow(['disponibilidad', v, v]));
  ['NINGUNO', 'PORCENTAJE', 'MONTO_FIJO'].forEach(v => ws.addRow(['tipo_descuento', v, v]));
  ['POR_M2', 'MONTO_FIJO'].forEach(v => ws.addRow(['tipo_tarifa', v, v]));
  ws.getColumn(3).width = 45;
}

export async function descargarPlantillaConfiguracion(project: ProyectoResponse) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MONOLITHE';
  guia(wb, project);
  for (const hoja of HOJAS_ESTRUCTURA) encabezado(wb.addWorksheet(hoja.nombre), hoja.columnas);
  await catalogos(wb, project.idProyecto);
  const bytes = await wb.xlsx.writeBuffer();
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  descargarExcelProyectos(blob, `MONOLITHE_${project.codigo.replace(/[^A-Za-z0-9_-]/g, '_')}_Plantilla_v${VERSION_PLANTILLA}.xlsx`);
}
