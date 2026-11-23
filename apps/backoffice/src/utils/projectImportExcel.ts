import ExcelJS from 'exceljs';
import { HOJAS_ESTRUCTURA, VERSION_PLANTILLA } from '../lib/projectTemplateSchema';
import type { FilaImportacion, SolicitudImportacion } from '../types/projectImport';

const MAX_FILAS = 2000;
const MAX_BYTES = 5 * 1024 * 1024;

function texto(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value === null || value === undefined) return '';
  if (cell.isMerged) throw new Error(`Celda combinada: ${cell.address}.`);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  throw new Error(`Solo se admite texto, números y fechas; revisa ${cell.address}.`);
}

function leerFila(ws: ExcelJS.Worksheet, index: number, columnas: readonly string[]): FilaImportacion | null {
  const row = ws.getRow(index);
  const celdas: Record<string, string> = {};
  columnas.forEach((col, i) => { celdas[col] = texto(row.getCell(i + 1)); });
  if (row.cellCount > columnas.length) {
    for (let i = columnas.length + 1; i <= row.cellCount; i++) {
      if (texto(row.getCell(i))) throw new Error(`${ws.name}, fila ${index}: columnas adicionales.`);
    }
  }
  if (!Object.values(celdas).some(Boolean)) return null;
  for (const valor of Object.values(celdas)) {
    if (valor.length > 2000) throw new Error(`${ws.name}, fila ${index}: texto demasiado largo.`);
  }
  return { hoja: ws.name, numero: index, celdas };
}

function leerHoja(wb: ExcelJS.Workbook, nombre: string, columnas: readonly string[]): FilaImportacion[] {
  const ws = wb.getWorksheet(nombre);
  if (!ws) throw new Error(`Falta la hoja ${nombre}.`);
  if (ws.rowCount > MAX_FILAS + 1 || ws.columnCount > 40) throw new Error(`La hoja ${nombre} supera los límites.`);
  const encabezados = columnas.map((_, i) => texto(ws.getRow(1).getCell(i + 1)));
  if (encabezados.some((v, i) => v !== columnas[i]) || ws.getRow(1).actualCellCount !== columnas.length)
    throw new Error(`Encabezados incorrectos en ${nombre}.`);
  const filas: FilaImportacion[] = [];
  for (let i = 2; i <= ws.rowCount; i++) {
    const fila = leerFila(ws, i, columnas);
    if (fila) filas.push(fila);
  }
  return filas;
}

export function leerLibroProyecto(wb: ExcelJS.Workbook, codigoProyecto: string): SolicitudImportacion {
  const instrucciones = wb.getWorksheet('Instrucciones');
  if (!instrucciones || texto(instrucciones.getCell('A2')) !== 'version_plantilla'
    || texto(instrucciones.getCell('B2')) !== String(VERSION_PLANTILLA)
    || texto(instrucciones.getCell('A3')) !== 'codigo_proyecto'
    || texto(instrucciones.getCell('B3')) !== codigoProyecto) {
    throw new Error('La versión de plantilla o el código del proyecto no coincide.');
  }
  const admitidas = new Set<string>(['Instrucciones', 'Catalogos', ...HOJAS_ESTRUCTURA.map(h => h.nombre)]);
  if (wb.worksheets.some(h => !admitidas.has(h.name))) throw new Error('El archivo contiene hojas no reconocidas.');
  const filas = HOJAS_ESTRUCTURA.flatMap(h => leerHoja(wb, h.nombre, h.columnas));
  if (!filas.length || filas.length > MAX_FILAS) throw new Error('Ingresa entre 1 y 2,000 filas de datos.');
  return { versionPlantilla: VERSION_PLANTILLA, codigoProyecto, filas };
}

export async function leerArchivoProyecto(file: File, codigoProyecto: string): Promise<SolicitudImportacion> {
  if (!/\.xlsx$/i.test(file.name) || file.size < 1 || file.size > MAX_BYTES)
    throw new Error('Selecciona un archivo XLSX de hasta 5 MB.');
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(await file.arrayBuffer());
  } catch {
    throw new Error(
      'No se pudo interpretar la estructura del XLSX. Utiliza la plantilla descargada del Backoffice ' +
      'o abre el archivo en Excel y guárdalo como Libro de Excel (.xlsx) antes de volver a cargarlo.'
    );
  }
  return leerLibroProyecto(wb, codigoProyecto);
}
