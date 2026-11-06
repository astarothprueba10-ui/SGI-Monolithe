import ExcelJS from 'exceljs';
import { crmBackend } from '../services/crmBackend';
import { mapOperacion } from '../services/salesService';
import type { Sale } from '../types';
import { descargarBlobExcel } from './crmExportExcel';
import { fechaExcelLima } from './separacionesExportExcel';
import {
  filtrarVentas, limitarPorPeriodo, periodoValido,
  type FiltrosVentas, type PeriodoComercial
} from './ventasComercial';

const COLUMNAS = [
  { nombre:'Fecha de venta', ancho:22 },
  { nombre:'Código de venta', ancho:28 },
  { nombre:'Comprador', ancho:33 },
  { nombre:'DNI / Documento', ancho:19 },
  { nombre:'Proyecto', ancho:36 },
  { nombre:'Lote', ancho:19 },
  { nombre:'Monto (S/)', ancho:18 },
  { nombre:'Modalidad', ancho:18 },
  { nombre:'Asesor', ancho:32 },
  { nombre:'Estado', ancho:20 },
  { nombre:'Contrato', ancho:24 }
];
const SEGURO = (value:string | null | undefined):string => {
  const s = value ?? '';
  return /^[=+\-@\t\r\n]/.test(s) ? "'"+s : s;
};

async function ventasAutorizadas(): Promise<Sale[]> {
  const result: Sale[] = [];
  const vistos = new Set<number>();
  for (let pagina=1; pagina<=1000; pagina++) {
    const respuesta=await crmBackend.listarVentasParaExportacion({pagina,tamano:100});
    if (!Array.isArray(respuesta.items) || !Number.isFinite(respuesta.total)) {
      throw new Error('El servidor no devolvió un listado de ventas válido.');
    }
    for (const item of respuesta.items) {
      if (item.tipo!=='VENTA' || !Number.isSafeInteger(item.id))
        throw new Error('Operación inesperada en el listado exportable.');
      if (!vistos.has(item.id)) {
        vistos.add(item.id); result.push(mapOperacion(item));
      }
    }
    if (result.length >= respuesta.total) return result;
    if (respuesta.items.length===0)
      throw new Error('La exportación está incompleta; no se descargará un Excel parcial.');
  }
  throw new Error('Se alcanzó el límite de exportación; no se descargará un Excel parcial.');
}

export async function exportarVentasExcel(
  filtros: FiltrosVentas, periodo: PeriodoComercial
):Promise<{total:number;nombre:string}> {
  if (!periodoValido(periodo)) throw new Error('Seleccione un período global válido.');
  if (filtros.desde && filtros.hasta && filtros.desde>filtros.hasta)
    throw new Error('El rango de la tabla no puede estar invertido.');
  const operaciones=filtrarVentas(limitarPorPeriodo(await ventasAutorizadas(),periodo),filtros);
  const libro = new ExcelJS.Workbook();
  libro.creator='SGI MONOLITHE';
  libro.created=new Date();
  const hoja=libro.addWorksheet('Ventas', {
    properties:{defaultRowHeight:22},
    pageSetup:{orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0}
  });
  hoja.columns=COLUMNAS.map(c=>({width:c.ancho}));
  hoja.mergeCells('A1:K2');
  const cab=hoja.getCell('A1');
  cab.value='MONOLITHE  |  REPORTE DE VENTAS';
  cab.font={name:'Aptos Display',size:18,bold:true,color:{argb:'FFFFFFFF'}};
  cab.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF142C46'}};
  cab.alignment={vertical:'middle',indent:1};
  hoja.getRow(1).height=26;
  hoja.getRow(2).height=23;
  hoja.mergeCells('A3:F3');
  hoja.getCell('A3').value='Período comercial: '+periodo.desde+' al '+periodo.hasta;
  hoja.mergeCells('G3:K3');
  hoja.getCell('G3').value='Ventas autorizadas: '+operaciones.length;
  hoja.getCell('G3').alignment={horizontal:'right'};
  hoja.mergeCells('A4:K4');
  hoja.getCell('A4').value=SEGURO(
    'Filtros de tabla  |  Búsqueda: '+(filtros.busqueda||'Todas')+
    '  |  Modalidad: '+(filtros.modalidad==='all'?'Todas':filtros.modalidad)+
    '  |  Asesor: '+(filtros.asesor==='all'?'Todos':filtros.asesor)+
    '  |  Proyecto: '+(filtros.proyecto==='all'?'Todos':filtros.proyecto)+
    '  |  Estado: '+(filtros.estado==='all'?'Todos':filtros.estado)+
    '  |  Fechas tabla: '+(filtros.desde||'Sin mínimo')+' a '+(filtros.hasta||'Sin máximo')
  );
  hoja.getRow(4).height=36;
  for (const n of [3,4]) {
    hoja.getCell('A'+n).font={name:'Aptos',size:9,color:{argb:'FF244965'}};
    hoja.getCell('A'+n).alignment={wrapText:true,vertical:'middle',indent:1};
  }
  hoja.getCell('G3').font={name:'Aptos',size:10,bold:true,color:{argb:'FF1E9B74'}};
  hoja.getRow(5).height=8;
  const encabezado=hoja.getRow(6);
  encabezado.values=COLUMNAS.map(c=>c.nombre);
  encabezado.height=30;
  encabezado.eachCell(c=>{
    c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF142C46'}};
    c.font={name:'Aptos',bold:true,size:10,color:{argb:'FFFFFFFF'}};
    c.alignment={vertical:'middle',indent:1};
  });

  operaciones.forEach((op,i)=>{
    const f=hoja.getRow(i+7);
    f.values=[
      fechaExcelLima(op.dateIso),SEGURO(op.code),SEGURO(op.buyer),
      SEGURO(op.document),SEGURO(op.project),SEGURO(op.lot),op.amount,
      SEGURO(op.modality ?? ''),SEGURO(op.advisor),SEGURO(op.status),
      SEGURO(op.contract)
    ];
    f.height=26;
    f.eachCell({includeEmpty:true},c=>{
      c.fill={type:'pattern',pattern:'solid',
        fgColor:{argb:i%2?'FFF2F6FB':'FFFFFFFF'}};
      c.border={bottom:{style:'hair',color:{argb:'FFDEE6EF'}}};
      c.font={name:'Aptos',size:10,color:{argb:'FF142C46'}};
      c.alignment={vertical:'middle',indent:1};
    });
    f.getCell(1).numFmt='dd/mm/yyyy hh:mm';
    for (const col of [2,4,6]) f.getCell(col).numFmt='@';
    f.getCell(7).numFmt='"S/ " #,##0.00';
    f.getCell(7).font={name:'Aptos',size:10,bold:true,color:{argb:'FF142C46'}};
    f.getCell(7).alignment={vertical:'middle',horizontal:'right'};
  });
  if (!operaciones.length) {
    hoja.mergeCells('A7:K7');
    hoja.getCell('A7').value='No hay ventas autorizadas en el período y filtros seleccionados.';
    hoja.getCell('A7').font={italic:true,color:{argb:'FF64748B'}};
  }
  hoja.autoFilter={from:{row:6,column:1},to:{row:6+operaciones.length,column:11}};
  hoja.views=[{state:'frozen',ySplit:6,xSplit:0}];
  hoja.getColumn(3).alignment={wrapText:true,vertical:'middle'};
  hoja.getColumn(5).alignment={wrapText:true,vertical:'middle'};
  const nombre='MONOLITHE_Ventas_'+periodo.desde+'_'+periodo.hasta+'.xlsx';
  const buffer=await libro.xlsx.writeBuffer();
  descargarBlobExcel(new Blob([buffer], {
    type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }),nombre);
  return {total:operaciones.length,nombre};
}
