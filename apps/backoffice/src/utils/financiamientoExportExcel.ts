import ExcelJS from 'exceljs';
import {
  crmBackend, type CrmPlanCarteraReal, type CrmAlertaCuota,
  type CrmCarteraReal
} from '../services/crmBackend';
import type {RangoCrm} from './crmPeriodo';

const AZUL='0E1F33', DORADO='D9B168', VERDE='4CBB17', SUAVE='F4F7FA', BORDE='E5EDF5';
const FORMATO_SOLES='"S/ " #,##0.00;[Red]("S/ " #,##0.00)';
const LIMITE_PAGINAS=1000;

export function fechaExcel(valor:string|null|undefined):Date|null {
  if(!valor || !/^\d{4}-\d{2}-\d{2}/.test(valor)) return null;
  const [ano,mes,dia]=valor.slice(0,10).split('-').map(Number);
  const fecha=new Date(Date.UTC(ano,mes-1,dia));
  return fecha.getUTCFullYear()===ano&&fecha.getUTCMonth()+1===mes&&fecha.getUTCDate()===dia?fecha:null;
}
function textoSeguro(valor:unknown):string {
  const s=String(valor??'');
  return /^[\s]*[=+\-@\t\r]/.test(s)?"'"+s:s;
}
function fechaPeru(valor:Date):string {
  return new Intl.DateTimeFormat('es-PE',{
    timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit'
  }).format(valor);
}
function fechaCorte(valor:string):string {
  const f=fechaExcel(valor);
  return f?new Intl.DateTimeFormat('es-PE',{timeZone:'UTC',day:'2-digit',month:'2-digit',year:'numeric'}).format(f):'—';
}
function prepararHoja(ws:ExcelJS.Worksheet,titulo:string,subtitulo:string,columnas:number,ancho:number[]) {
  ws.properties.defaultRowHeight=21;
  ws.pageSetup={paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0};
  ancho.forEach((w,i)=>{ws.getColumn(i+1).width=w;});
  ws.mergeCells(1,1,1,columnas);
  let c=ws.getCell('A1');c.value='MONOLITHE  |  FINANCIAMIENTO';c.font={bold:true,size:16,color:{argb:'FFFFFFFF'}};
  c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+AZUL}};
  c.alignment={vertical:'middle',indent:1};ws.getRow(1).height=40;
  ws.mergeCells(2,1,2,columnas);
  c=ws.getCell('A2');c.value=titulo;c.font={bold:true,size:14,color:{argb:'FF'+AZUL}};
  c.alignment={vertical:'middle',indent:1};ws.getRow(2).height=27;
  ws.mergeCells(3,1,3,columnas);
  c=ws.getCell('A3');c.value=subtitulo;c.font={size:10,color:{argb:'FF56718D'}};
  c.alignment={vertical:'middle',indent:1};ws.getRow(3).height=27;
  ws.getRow(4).height=10;
}
function cabecera(ws:ExcelJS.Worksheet,fila:number,nombres:string[]){
  const row=ws.getRow(fila);row.values=nombres;row.height=32;
  row.eachCell(c=>{
    c.font={size:10,bold:true,color:{argb:'FFFFFFFF'}};
    c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+AZUL}};
    c.alignment={vertical:'middle',wrapText:true,indent:1};
  });
  ws.views=[{state:'frozen',ySplit:fila}];
  ws.autoFilter={from:{row:fila,column:1},to:{row:fila,column:nombres.length}};
  ws.printTitlesRow=`1:${fila}`;
}
function filaEstilo(ws:ExcelJS.Worksheet,indice:number,monedas:number[],fechas:number[],estado?:{col:number,tipo:string}){
  const row=ws.getRow(indice);row.height=25;
  row.eachCell({includeEmpty:true},(c,col)=>{
    c.font={name:'Calibri',size:10,color:{argb:'FF'+AZUL}};
    c.alignment={vertical:'middle',indent:1};
    c.border={bottom:{style:'hair',color:{argb:'FF'+BORDE}}};
    if(indice%2===0)c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+SUAVE}};
    if(monedas.includes(col)){c.numFmt=FORMATO_SOLES;c.alignment={vertical:'middle',horizontal:'right'};}
    if(fechas.includes(col)){c.numFmt='dd/mm/yyyy';c.alignment={vertical:'middle',horizontal:'center'};}
  });
  if(estado){
    const c=row.getCell(estado.col),s=estado.tipo;
    const color=s.includes('VENCIDA')||s==='ANULADO'?'B91C1C':
      s==='ACTIVO'||s==='COMPLETADO'?'047857':'B45309';
    c.font={size:10,bold:true,color:{argb:'FF'+color}};
  }
}
export interface ReporteFinanciero {
  periodo:RangoCrm;
  corte:string;
  resumen:CrmCarteraReal['resumen'];
  planes:CrmPlanCarteraReal[];
  alertas:CrmAlertaCuota[];
}
export async function consultarReporteFinanciero(periodo:RangoCrm,progreso?:(msg:string)=>void):Promise<ReporteFinanciero>{
  const planes:CrmPlanCarteraReal[]=[];
  const vistos=new Set<number>();
  let primer:CrmCarteraReal|null=null;
  for(let pagina=1;pagina<=LIMITE_PAGINAS;pagina++){
    progreso?.(`Consultando planes · página ${pagina}…`);
    const r=await crmBackend.listarCarteraFinancieraReal({
      vista:'PLANES',desde:periodo.desde,hastaExclusivo:periodo.hastaExclusivo,
      pagina,tamano:100
    });
    if(!primer) primer=r;
    for(const p of r.items as CrmPlanCarteraReal[]){
      if(!vistos.has(p.idPlanPago)){vistos.add(p.idPlanPago);planes.push(p);}
    }
    if(pagina>=r.paginas || r.paginas===0)break;
    if(pagina===LIMITE_PAGINAS)throw new Error('Exportación demasiado grande: excede el límite seguro de páginas.');
  }
  if(!primer)throw new Error('No fue posible consultar la cartera financiera.');
  if(planes.length!==primer.total)throw new Error('La cartera cambió durante la exportación. Actualiza e inténtalo nuevamente.');

  // El reporte tiene el MISMO universo de ventas del filtro global; alertas vigentes
  // se cruzan por idVenta, no por fecha de vencimiento, y se identifican como snapshot.
  const ventas=new Set(planes.map(p=>p.idVenta));
  const alertas:CrmAlertaCuota[]=[];
  const alertasVistas=new Set<number>();
  for(let pagina=1;pagina<=LIMITE_PAGINAS;pagina++){
    progreso?.(`Consultando alertas autorizadas · página ${pagina}…`);
    const r=await crmBackend.listarAlertasCuotas({tipo:'TODAS',pagina,tamano:100});
    for(const a of r.items){
      if(ventas.has(a.idVenta)&&!alertasVistas.has(a.idCuota)){
        alertasVistas.add(a.idCuota);alertas.push(a);
      }
    }
    if(pagina>=r.paginas || r.paginas===0)break;
    if(pagina===LIMITE_PAGINAS)throw new Error('Las alertas superan el límite seguro de exportación.');
  }
  return {periodo,corte:primer.fechaCorte,resumen:primer.resumen,planes,alertas};
}
export async function generarExcelFinanciamiento(r:ReporteFinanciero):Promise<Blob>{
  const libro=new ExcelJS.Workbook();
  libro.creator='MONOLITHE';
  libro.created=new Date();
  libro.modified=new Date();
  const periodoTexto=`${fechaCorte(r.periodo.desde)} al ${fechaCorte(new Date(new Date(r.periodo.hastaExclusivo).getTime()-86400000).toISOString())}`;
  const generado=`Período de venta: ${periodoTexto} · Corte de saldos: ${fechaCorte(r.corte)} · Exportado: ${fechaPeru(new Date())} (Lima)`;
  const resumen=libro.addWorksheet('Resumen financiero');
  prepararHoja(resumen,'Resumen financiero y KPI',generado,5,[34,22,25,24,24]);
  const datos=[
    ['Planes financiados',r.resumen.planes,false],
    ['Capital financiado activo',r.resumen.capitalFinanciadoActivo,true],
    ['Saldo de cuotas por cobrar',r.resumen.saldoCuotas,true],
    ['Inicial por conciliar',r.resumen.inicialPorConciliar,true],
    ['Cuotas vencidas con saldo',r.resumen.montoVencido,true],
    ['Cuotas próximas con saldo',r.resumen.montoProximo,true]
  ] as const;
  for(const [i,[titulo,valor,moneda]] of datos.entries()){
    const fila=i+6;
    resumen.mergeCells(fila,1,fila,2);
    let c=resumen.getCell(fila,1);c.value=titulo;c.font={size:11,bold:true,color:{argb:'FF'+AZUL}};
    c=resumen.getCell(fila,3);c.value=valor;
    c.font={size:14,bold:true,color:{argb:'FF'+(i===4?'B91C1C':i===1?'047857':AZUL)}};
    if(moneda)c.numFmt=FORMATO_SOLES;
    resumen.getRow(fila).height=34;
    for(let j=1;j<=5;j++)resumen.getCell(fila,j).fill={
      type:'pattern',pattern:'solid',fgColor:{argb:'FF'+(i%2?'FFFFFF':SUAVE)}
    };
  }
  resumen.mergeCells('A14:E14');resumen.getCell('A14').value=
    'Indicadores de saldos vigentes al corte, para ventas registradas en el período. No es un saldo histórico.';
  resumen.getCell('A14').font={italic:true,size:10,color:{argb:'FF56718D'}};
  resumen.mergeCells('A15:E15');resumen.getCell('A15').value=
    'La hoja Alertas incluye alertas actuales de estas ventas; no representa mora histórica del período.';
  resumen.getCell('A15').font={italic:true,size:10,color:{argb:'FF56718D'}};

  const planes=libro.addWorksheet('Planes y saldos');
  prepararHoja(planes,'Cartera completa de planes',generado,13,[26,34,38,18,16,18,18,18,17,19,19,19,19]);
  cabecera(planes,6,['Venta','Comprador','Proyecto','Lote','Fecha venta','Precio base','Inicial pactada','Capital financiado','Interés','Total cuotas','Saldo vigente','Estado','Código plan']);
  if(!r.planes.length){planes.getCell('A7').value='Sin operaciones para el período.';}
  for(const [i,p] of r.planes.entries()){
    const row=planes.getRow(7+i);
    row.values=[textoSeguro(p.codigoVenta),textoSeguro(p.comprador),textoSeguro(p.proyecto),
      textoSeguro(p.lote),fechaExcel(p.fechaVenta),p.precioVenta,p.inicialAdicional+p.reservaAplicada,
      p.capitalFinanciado,p.interesTotal,p.totalCuotas,
      p.cuotasExigibles?p.saldoFinanciamiento:null,textoSeguro(p.estadoFiltro),textoSeguro(p.codigoPlan)];
    filaEstilo(planes,7+i,[6,7,8,9,10,11],[5],{col:12,tipo:p.estadoFiltro});
  }
  const alertas=libro.addWorksheet('Alertas de cuotas');
  prepararHoja(alertas,'Alertas activas de cuotas',generado,10,[28,34,18,16,18,24,20,21,22,18]);
  cabecera(alertas,6,['Venta','Comprador','Cuota N.º','Vencimiento','Estado cuota','Tipo de alerta','Importe cuota','Abonado','Saldo pendiente','Días mora']);
  if(!r.alertas.length)alertas.getCell('A7').value='Sin alertas activas para las ventas del período.';
  for(const [i,a] of r.alertas.entries()){
    const row=alertas.getRow(7+i);
    row.values=[textoSeguro(a.codigoVenta),textoSeguro(a.comprador||'Sin titular'),
      a.numeroCuota,fechaExcel(a.fechaVencimiento),textoSeguro(a.estadoCuota),
      a.tipoAlerta==='CUOTA_VENCIDA'?'VENCIDA':'PRÓXIMA',
      a.montoCuota,a.abonadoConfirmado,a.saldoCuota,a.diasMora];
    filaEstilo(alertas,7+i,[7,8,9],[4],{col:6,tipo:a.tipoAlerta});
  }
  const buffer=await libro.xlsx.writeBuffer();
  return new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}

export function descargarReporte(blob:Blob,nombre:string):void{
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=nombre;
  document.body.appendChild(a);a.click();a.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
