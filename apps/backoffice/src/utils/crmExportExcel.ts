import ExcelJS from 'exceljs';
import { crmBackend, type CrmProspect, type CrmBuyer, type CrmPage } from '../services/crmBackend';

export const TAMANO_PAGINA_EXPORT = 100;
const MAX_PAGINAS_EXPORT = 1000;

const COLOR_HEADER_BG = '1A3A5C';
const COLOR_HEADER_FG = 'FFFFFF';
const COLOR_ACCENT    = '4CBB17';
const COLOR_ROW_ALT   = 'F0F7FF';
const COLOR_BORDER    = 'D0D8E4';
const COLOR_META_LABEL = '5B7A9D';
const COLOR_TITLE_FG   = '1A3A5C';

const PROSPECT_COLS = [
  { header: 'Codigo',          key: 'codigo' },
  { header: 'Nombre completo', key: 'nombre' },
  { header: 'Documento',       key: 'documento' },
  { header: 'Telefono',        key: 'telefono' },
  { header: 'Email',           key: 'email' },
  { header: 'Etapa',           key: 'etapa' },
  { header: 'Categoria',       key: 'categoria' },
  { header: 'Puntuacion',      key: 'puntuacion' },
  { header: 'Origen',          key: 'origen' },
  { header: 'Interes',         key: 'interes' },
  { header: 'Asesor',          key: 'asesor' },
  { header: 'Fecha registro',  key: 'fecha_registro' },
  { header: 'Ultimo contacto', key: 'ultimo_contacto' },
  { header: 'Observaciones',   key: 'observaciones' }
];

const BUYER_COLS = [
  { header: 'Codigo cliente' },
  { header: 'Nombre completo' },
  { header: 'Codigo venta' },
  { header: 'Codigo contrato' },
  { header: 'Estado contrato' },
  { header: 'Lote' },
  { header: 'Precio venta (S/)' },
  { header: 'Fecha venta' }
];

function sanitizeText(value: unknown): string {
  const str = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(str)) return `'${str}`;
  return str;
}

function formatDateLimaExcel(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  }
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  const p = f.formatToParts(d).reduce((a, x) => { a[x.type] = x.value; return a; }, {} as Record<string, string>);
  const hr = p.hour === '24' ? 0 : Number(p.hour);
  return new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), hr, Number(p.minute), Number(p.second)));
}

function limaBorderStyle(): Partial<ExcelJS.Borders> {
  const thin: ExcelJS.BorderStyle = 'thin';
  const side = { style: thin, color: { argb: `FF${COLOR_BORDER}` } };
  return { top: side, left: side, bottom: side, right: side };
}

function addSheetTitle(ws: ExcelJS.Worksheet, name: string, cols: number): void {
  ws.mergeCells(1, 1, 1, cols);
  const title = ws.getCell(1, 1);
  title.value = 'MONOLITHE | CRM';
  title.font = { bold: true, size: 16, color: { argb: `FF${COLOR_TITLE_FG}` } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  ws.mergeCells(2, 1, 2, cols);
  const sub = ws.getCell(2, 1);
  sub.value = name;
  sub.font = { bold: true, size: 12, color: { argb: `FF${COLOR_ACCENT}` } };
  sub.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 20;
}

function addSheetMeta(ws: ExcelJS.Worksheet, total: number, cols: number): void {
  const fecha = new Date().toLocaleString('es-PE', {
    timeZone: 'America/Lima', day: '2-digit', month: '2-digit',
    year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  const mitad = Math.ceil(cols / 2);
  ws.mergeCells(3, 1, 3, mitad);
  const celdaF = ws.getCell(3, 1);
  celdaF.value = `Exportado: ${fecha}`;
  celdaF.font = { size: 9, color: { argb: `FF${COLOR_META_LABEL}` } };
  ws.mergeCells(3, mitad + 1, 3, cols);
  const celdaT = ws.getCell(3, mitad + 1);
  celdaT.value = `Total registros: ${total}`;
  celdaT.font = { size: 9, color: { argb: `FF${COLOR_META_LABEL}` } };
  celdaT.alignment = { horizontal: 'right', vertical: 'middle' };
  ws.getRow(3).height = 16;
  ws.getRow(4).height = 6;
}

function styleHeaderRow(ws: ExcelJS.Worksheet, rowNum: number): void {
  const row = ws.getRow(rowNum);
  row.height = 22;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: `FF${COLOR_HEADER_FG}` }, size: 10 };
    cell.fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: `FF${COLOR_HEADER_BG}` }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
    cell.border = limaBorderStyle();
  });
}

function styleDataRow(ws: ExcelJS.Worksheet, rowNum: number, isAlt: boolean): void {
  const row = ws.getRow(rowNum);
  row.height = 16;
  row.eachCell({ includeEmpty: true }, (cell) => {
    if (isAlt) {
      cell.fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: `FF${COLOR_ROW_ALT}` }
      };
    }
    cell.border = limaBorderStyle();
    cell.font = { size: 9 };
  });
}

function autoFitColumns(ws: ExcelJS.Worksheet, minWidth = 8, maxWidth = 45): void {
  ws.columns.forEach((col) => {
    let max = minWidth;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const v = cell.value;
      if (v instanceof Date) { max = Math.max(max, 18); return; }
      max = Math.max(max, String(v ?? '').length);
    });
    col.width = Math.min(max + 2, maxWidth);
  });
}

function renderEmptyRow(ws: ExcelJS.Worksheet, rowNum: number, cols: number): void {
  ws.mergeCells(rowNum, 1, rowNum, cols);
  const emptyCell = ws.getRow(rowNum).getCell(1);
  emptyCell.value = 'Sin registros disponibles';
  emptyCell.alignment = { horizontal: 'center' };
  emptyCell.font = { italic: true, color: { argb: 'FF999999' } };
}

function renderProspectRow(ws: ExcelJS.Worksheet, p: CrmProspect, rowNum: number, isAlt: boolean): void {
  const row = ws.getRow(rowNum);
  const doc = sanitizeText(p.numero_documento ?? p.dni ?? '');
  const tel = sanitizeText(p.telefono ?? '');
  row.getCell(1).numFmt = '@';
  row.getCell(1).value = sanitizeText(p.codigo);
  row.getCell(2).value = sanitizeText(p.nombre_completo);
  row.getCell(3).numFmt = '@';
  row.getCell(3).value = doc;
  row.getCell(4).numFmt = '@';
  row.getCell(4).value = tel;
  row.getCell(5).value = sanitizeText(p.email);
  row.getCell(6).value = sanitizeText(p.estado_nombre ?? p.estado_codigo);
  row.getCell(7).value = sanitizeText(p.categoria);
  row.getCell(8).value = sanitizeText(p.puntuacion);
  row.getCell(9).value = sanitizeText(p.origen_nombre ?? p.origen_codigo);
  row.getCell(10).value = sanitizeText(p.interes);
  row.getCell(11).value = sanitizeText(p.asesor_nombre);
  row.getCell(12).numFmt = 'dd/mm/yyyy hh:mm';
  row.getCell(12).value = formatDateLimaExcel(p.fecha_registro);
  row.getCell(13).numFmt = 'dd/mm/yyyy hh:mm';
  row.getCell(13).value = formatDateLimaExcel(p.ultimo_contacto);
  row.getCell(14).value = sanitizeText(p.observaciones ?? '');
  styleDataRow(ws, rowNum, isAlt);
}

function buildProspectSheet(wb: ExcelJS.Workbook, name: string, items: CrmProspect[]): void {
  const ws = wb.addWorksheet(name);
  const cols = PROSPECT_COLS.length;
  addSheetTitle(ws, name, cols);
  addSheetMeta(ws, items.length, cols);
  const HROW = 5;
  ws.getRow(HROW).values = PROSPECT_COLS.map((c) => c.header);
  styleHeaderRow(ws, HROW);
  ws.autoFilter = { from: { row: HROW, column: 1 }, to: { row: HROW, column: cols } };
  ws.views = [{ state: 'frozen', ySplit: HROW }];
  if (items.length === 0) {
    renderEmptyRow(ws, HROW + 1, cols);
  } else {
    items.forEach((p, idx) => renderProspectRow(ws, p, HROW + 1 + idx, idx % 2 === 1));
  }
  autoFitColumns(ws);
}

function renderBuyerRow(ws: ExcelJS.Worksheet, b: CrmBuyer, rowNum: number, isAlt: boolean): void {
  const row = ws.getRow(rowNum);
  row.getCell(1).numFmt = '@';
  row.getCell(1).value = sanitizeText(b.codigo_cliente);
  row.getCell(2).value = sanitizeText(b.nombre_completo);
  row.getCell(3).numFmt = '@';
  row.getCell(3).value = sanitizeText(b.codigo_venta);
  row.getCell(4).numFmt = '@';
  row.getCell(4).value = sanitizeText(b.codigo_contrato);
  row.getCell(5).value = sanitizeText(b.estado_contrato);
  row.getCell(6).numFmt = '@';
  row.getCell(6).value = sanitizeText(b.codigo_lote);
  row.getCell(7).value = typeof b.precio_venta === 'number' ? b.precio_venta : Number(b.precio_venta) || 0;
  row.getCell(7).numFmt = '#,##0.00';
  row.getCell(7).alignment = { horizontal: 'right' };
  row.getCell(8).value = formatDateLimaExcel(b.fecha_venta);
  row.getCell(8).numFmt = 'dd/mm/yyyy';
  styleDataRow(ws, rowNum, isAlt);
}

function buildBuyerSheet(wb: ExcelJS.Workbook, items: CrmBuyer[]): void {
  const name = 'Compradores';
  const ws = wb.addWorksheet(name);
  const cols = BUYER_COLS.length;
  addSheetTitle(ws, name, cols);
  addSheetMeta(ws, items.length, cols);
  const HROW = 5;
  ws.getRow(HROW).values = BUYER_COLS.map((c) => c.header);
  styleHeaderRow(ws, HROW);
  ws.autoFilter = { from: { row: HROW, column: 1 }, to: { row: HROW, column: cols } };
  ws.views = [{ state: 'frozen', ySplit: HROW }];
  if (items.length === 0) {
    renderEmptyRow(ws, HROW + 1, cols);
  } else {
    items.forEach((b, idx) => renderBuyerRow(ws, b, HROW + 1 + idx, idx % 2 === 1));
  }
  autoFitColumns(ws);
}

export interface CrmExcelPayload {
  leads:       CrmProspect[];
  potenciales: CrmProspect[];
  compradores: CrmBuyer[];
}

export async function generarExcelCrm(payload: CrmExcelPayload): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator  = 'MONOLITHE CRM';
  wb.created  = new Date();
  wb.modified = new Date();
  buildProspectSheet(wb, 'Leads', payload.leads);
  buildProspectSheet(wb, 'Clientes potenciales', payload.potenciales);
  buildBuyerSheet(wb, payload.compradores);
  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

function procesarPaginaItems<T>(
  items: T[],
  obtenerClave: (item: T) => string | number,
  clavesVistas: Set<string | number>,
  acumulados: T[]
): void {
  for (const item of items) {
    const clave = obtenerClave(item);
    if (!clavesVistas.has(clave)) {
      clavesVistas.add(clave);
      acumulados.push(item);
    }
  }
}

function debeTerminarPaginacion(
  pagina: number,
  recibidos: number,
  acumulados: number,
  total: number,
  paginasEsperadas?: number
): boolean {
  if (recibidos === 0 || acumulados >= total) return true;
  if (recibidos < TAMANO_PAGINA_EXPORT) return true;
  const limite = paginasEsperadas && paginasEsperadas > 0
    ? paginasEsperadas
    : Math.ceil(total / TAMANO_PAGINA_EXPORT);
  return pagina >= limite;
}

export async function consultarTodasLasPaginas<T>(
  obtenerPagina: (pagina: number) => Promise<CrmPage<T>>,
  obtenerClave: (item: T) => string | number,
  notificarProgreso?: (actual: number, total: number, pagina: number) => void
): Promise<T[]> {
  const acumulados: T[] = [];
  const clavesVistas = new Set<string | number>();
  let pagina = 1;
  while (pagina <= MAX_PAGINAS_EXPORT) {
    const res = await obtenerPagina(pagina);
    const items = res?.items ?? [];
    const total = res?.total ?? 0;
    procesarPaginaItems(items, obtenerClave, clavesVistas, acumulados);
    notificarProgreso?.(acumulados.length, total, pagina);
    if (debeTerminarPaginacion(pagina, items.length, acumulados.length, total, res?.paginas)) {
      break;
    }
    pagina += 1;
  }
  return acumulados;
}

export function claveProspecto(p: CrmProspect): number {
  return p.id_prospecto;
}

export function claveComprador(b: CrmBuyer): string {
  return `${b.id_cliente}_${b.codigo_venta || ''}_${b.codigo_lote || ''}`;
}

export function obtenerNombreArchivoExcel(): string {
  const hoy = new Date();
  const dd = String(hoy.getDate()).padStart(2, '0');
  const mm = String(hoy.getMonth() + 1).padStart(2, '0');
  const yyyy = hoy.getFullYear();
  return `MONOLITHE_CRM_${dd}-${mm}-${yyyy}.xlsx`;
}

export function descargarBlobExcel(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo;
  link.click();
  URL.revokeObjectURL(url);
}

export interface ParametrosFiltroCrm {
  consulta?: string;
  etapa?: string;
  origen?: string;
  idAsesor?: number;
  sinAsignar?: boolean;
  idProyecto?: number;
  desde: string;
  hastaExclusivo: string;
}

export interface OpcionesExportarCrm {
  filtros: ParametrosFiltroCrm;
  consultaCompradores?: string;
  notificarProgreso?: (mensaje: string) => void;
}

async function consultarLeadsExport(
  filtros: ParametrosFiltroCrm,
  progreso?: (msg: string) => void
): Promise<CrmProspect[]> {
  return consultarTodasLasPaginas(
    (pagina) => crmBackend.buscarPeriodo({
      ...filtros,
      categoria: 'LEAD',
      pagina,
      tamano: TAMANO_PAGINA_EXPORT
    }),
    claveProspecto,
    (act, tot, pag) => progreso?.(`Leads: página ${pag} (${act}/${tot})`)
  );
}

async function consultarPotencialesExport(
  filtros: ParametrosFiltroCrm,
  progreso?: (msg: string) => void
): Promise<CrmProspect[]> {
  return consultarTodasLasPaginas(
    (pagina) => crmBackend.buscarPeriodo({
      ...filtros,
      categoria: 'POTENCIAL',
      pagina,
      tamano: TAMANO_PAGINA_EXPORT
    }),
    claveProspecto,
    (act, tot, pag) => progreso?.(`Potenciales: página ${pag} (${act}/${tot})`)
  );
}

async function consultarCompradoresExport(
  filtros: ParametrosFiltroCrm,
  consulta?: string,
  progreso?: (msg: string) => void
): Promise<CrmBuyer[]> {
  return consultarTodasLasPaginas(
    (pagina) => crmBackend.compradoresPeriodo(
      consulta,
      pagina,
      TAMANO_PAGINA_EXPORT,
      filtros.desde,
      filtros.hastaExclusivo
    ),
    claveComprador,
    (act, tot, pag) => progreso?.(`Compradores: página ${pag} (${act}/${tot})`)
  );
}

export async function ejecutarExportacionExcelCompleta(
  opciones: OpcionesExportarCrm
): Promise<{ nombre: string; totalLeads: number; totalPotenciales: number; totalCompradores: number }> {
  const { filtros, consultaCompradores, notificarProgreso } = opciones;
  notificarProgreso?.('Consultando leads...');
  const leads = await consultarLeadsExport(filtros, notificarProgreso);
  notificarProgreso?.('Consultando clientes potenciales...');
  const potenciales = await consultarPotencialesExport(filtros, notificarProgreso);
  notificarProgreso?.('Consultando compradores...');
  const compradores = await consultarCompradoresExport(filtros, consultaCompradores, notificarProgreso);
  notificarProgreso?.('Generando archivo Excel...');
  const blob = await generarExcelCrm({ leads, potenciales, compradores });
  const nombre = obtenerNombreArchivoExcel();
  descargarBlobExcel(blob, nombre);
  return { nombre, totalLeads: leads.length, totalPotenciales: potenciales.length, totalCompradores: compradores.length };
}
