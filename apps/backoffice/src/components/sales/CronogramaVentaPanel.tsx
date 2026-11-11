import {useEffect,useState} from 'react';
import {CalendarDays,Download,FileClock,RefreshCw} from 'lucide-react';
import {toast} from 'sonner';
import {
  Document as PdfDocument, Page as PdfPage, Text as PdfText,
  View as PdfView, StyleSheet, pdf
} from '@react-pdf/renderer';
import {crmBackend,type CrmCronogramaVenta} from '../../services/crmBackend';

const formatoSoles=(v:number)=>'S/ '+Number(v||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const fecha=(v?:string|null)=>{
 if(!v)return '—';
 const d=new Date(v.slice(0,10)+'T12:00:00Z');
 return Number.isNaN(d.getTime())?v:new Intl.DateTimeFormat('es-PE',{
   timeZone:'UTC',day:'2-digit',month:'2-digit',year:'numeric'
 }).format(d);
};
const p=StyleSheet.create({
 page:{padding:34,fontFamily:'Helvetica',fontSize:9,color:'#17314B'},
 title:{fontSize:17,fontFamily:'Helvetica-Bold',marginBottom:7},
 subtitle:{fontSize:10,color:'#506986',marginBottom:5},
 band:{backgroundColor:'#EAF2FA',padding:12,borderRadius:5,marginVertical:12},
 row:{display:'flex',flexDirection:'row',borderBottomWidth:0.5,borderBottomColor:'#E3EAF1',paddingVertical:7},
 head:{backgroundColor:'#17314B',color:'#FFFFFF',fontFamily:'Helvetica-Bold',paddingVertical:10},
 cellN:{width:'8%',paddingHorizontal:4},cellDate:{width:'19%',paddingHorizontal:4},
 cellAmount:{width:'18%',paddingHorizontal:4,textAlign:'right'},cellStatus:{width:'19%',paddingHorizontal:4,textAlign:'right'},
 footer:{position:'absolute',bottom:22,left:34,right:34,fontSize:8,color:'#60718A'},
 warn:{fontSize:8,color:'#935116',marginTop:6}
});
function CronogramaDocumento({datos}:{datos:CrmCronogramaVenta}) {
 return <PdfDocument title={`MONOLITHE - Cronograma ${datos.codigoVenta}`}
   author="SGI MONOLITHE" subject="Cronograma comercial de la venta">
  <PdfPage size="A4" style={p.page} wrap>
    <PdfText style={p.title}>SGI MONOLITHE</PdfText>
    <PdfText style={p.subtitle}>Cronograma de financiamiento - {datos.codigoVenta}</PdfText>
    <PdfView style={p.band}>
      <PdfText>Plan: {datos.codigoPlan??'Sin código'}  |  Cuotas: {datos.numeroCuotas??datos.items.length}</PdfText>
      <PdfText>Tipo: {datos.tipoCronograma==='PROYECTADO'?'Proyección no exigible':'Cronograma registrado'}</PdfText>
      <PdfText>Primera fecha prevista: {fecha(datos.fechaPrimeraCuota)}</PdfText>
    </PdfView>
    <PdfView style={[p.row,p.head]} fixed>
      <PdfText style={p.cellN}>N.º</PdfText>
      <PdfText style={p.cellDate}>Vencimiento</PdfText>
      <PdfText style={p.cellAmount}>Capital</PdfText>
      <PdfText style={p.cellAmount}>Interés</PdfText>
      <PdfText style={p.cellAmount}>Cuota</PdfText>
      <PdfText style={p.cellStatus}>Estado</PdfText>
    </PdfView>
    {datos.items.map(item=><PdfView key={item.numero} style={p.row} wrap={false}>
      <PdfText style={p.cellN}>{item.numero}</PdfText>
      <PdfText style={p.cellDate}>{fecha(item.fechaVencimiento)}</PdfText>
      <PdfText style={p.cellAmount}>{formatoSoles(item.capital)}</PdfText>
      <PdfText style={p.cellAmount}>{formatoSoles(item.interes)}</PdfText>
      <PdfText style={p.cellAmount}>{formatoSoles(item.cuota)}</PdfText>
      <PdfText style={p.cellStatus}>{item.estado.replaceAll('_',' ')}</PdfText>
    </PdfView>)}
    <PdfView style={p.band}>
      <PdfText>Capital programado: {formatoSoles(datos.items.reduce((s,x)=>s+Math.round(x.capital*100),0)/100)}</PdfText>
      <PdfText>Intereses programados: {formatoSoles(datos.items.reduce((s,x)=>s+Math.round(x.interes*100),0)/100)}</PdfText>
      <PdfText>Total de cuotas: {formatoSoles(datos.items.reduce((s,x)=>s+Math.round(x.cuota*100),0)/100)}</PdfText>
    </PdfView>
    {datos.tipoCronograma==='PROYECTADO'&&
      <PdfText style={p.warn}>{datos.advertencia??'Proyección sujeta a aprobación contractual.'}</PdfText>}
    <PdfText style={p.footer} fixed>
      Documento informativo de SGI MONOLITHE. Fecha de consulta: {fecha(new Date().toISOString())}.
      {' '}No constituye constancia de pago.
    </PdfText>
  </PdfPage>
 </PdfDocument>;
}
export function CronogramaVentaPanel({idVenta}:{idVenta:number}) {
 const [datos,setDatos]=useState<CrmCronogramaVenta|null>(null);
 const [cargando,setCargando]=useState(true);
 const [error,setError]=useState<string|null>(null);
 const [generando,setGenerando]=useState(false);
 const [version,setVersion]=useState(0);
 useEffect(()=>{
  let activo=true;setCargando(true);setError(null);setDatos(null);
  void crmBackend.obtenerCronogramaVenta(idVenta)
    .then(d=>{if(activo)setDatos(d);})
    .catch(e=>{if(activo)setError(e instanceof Error?e.message:'Error al consultar el plan.');})
    .finally(()=>{if(activo)setCargando(false);});
  return ()=>{activo=false};
 },[idVenta,version]);
 const totales=datos?.items.reduce((a,x)=>({
   capital:a.capital+Math.round(x.capital*100),
   interes:a.interes+Math.round(x.interes*100),
   cuota:a.cuota+Math.round(x.cuota*100)
 }),{capital:0,interes:0,cuota:0})??{capital:0,interes:0,cuota:0};
 const diferenciaCapital=datos?.tipoCronograma==='REGISTRADO'
   &&datos.capitalFinanciado!=null
   ? Math.round(datos.capitalFinanciado*100)-totales.capital
   : 0;
 const descargar=async()=>{
  if(!datos?.items.length||generando)return;
  setGenerando(true);
  try{
   const blob=await pdf(<CronogramaDocumento datos={datos}/>).toBlob();
   const url=URL.createObjectURL(blob);
   const a=document.createElement('a');
   a.href=url;
   a.download=`MONOLITHE_Cronograma_${datos.codigoVenta.replace(/[^A-Za-z0-9_-]/g,'_')}.pdf`;
   document.body.appendChild(a);a.click();a.remove();
   window.setTimeout(()=>URL.revokeObjectURL(url),10000);
  }catch(e:unknown){
   toast.error('No se pudo generar el PDF',{
     description:e instanceof Error?e.message:'Error de generación de archivo.'
   });
  }finally{setGenerando(false);}
 };
 return <section className="rounded-xl border border-brand-100 bg-white p-3 shadow-sm sm:p-5">
   <div className="flex flex-wrap items-start justify-between gap-3">
     <div>
       <h3 className="flex items-center gap-2 text-sm font-bold text-brand-900">
         <span className="rounded-lg bg-blue-50 p-2 text-blue-700"><CalendarDays className="h-4 w-4"/></span>
         Cronograma y fechas de pago
       </h3>
       <p className="mt-1 text-xs text-brand-500">Consulta el plan financiero asociado a esta venta.</p>
     </div>
     <button type="button" onClick={()=>void descargar()}
       disabled={cargando||generando||!datos?.items.length}
       className="inline-flex items-center gap-2 rounded-lg border border-brand-200 px-3 py-2 text-xs font-semibold text-brand-800 hover:bg-brand-50 disabled:opacity-40">
       <Download className="h-4 w-4"/>{generando?'Generando PDF…':'Descargar PDF'}
     </button>
   </div>
   {cargando?<p className="py-6 text-xs text-brand-500">Consultando cuotas y fechas…</p>:
    error?<div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
      {error}<button className="ml-2 underline" onClick={()=>setVersion(v=>v+1)}>Reintentar</button></div>:
    !datos?.items.length?<div className="mt-3 flex items-center gap-2 rounded-lg bg-brand-50 p-4 text-xs text-brand-500">
       <FileClock className="h-5 w-5 shrink-0"/>Todavía no se han generado cuotas y fechas para esta operación.
     </div>:
    <>
      {datos.tipoCronograma==='PROYECTADO'&&<p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <strong>Proyección orientativa:</strong> {datos.advertencia??'Los importes definitivos requieren la formalización del contrato.'}
      </p>}
      <div className="mt-4 max-w-full overflow-x-auto rounded-lg border border-brand-100" tabIndex={0}>
       <table className="w-full min-w-[680px] text-left text-xs">
        <thead className="bg-slate-100 text-brand-700">
         <tr>{['N.º','Vencimiento','Capital','Interés','Cuota','Estado'].map(h=>
           <th key={h} className="whitespace-nowrap px-3 py-3 font-bold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-brand-100">
         {datos.items.map(c=><tr key={c.numero} className="hover:bg-brand-50/50">
          <td className="px-3 py-2.5 font-semibold">{c.numero}</td>
          <td className="whitespace-nowrap px-3 py-2.5">{fecha(c.fechaVencimiento)}</td>
          <td className="whitespace-nowrap px-3 py-2.5">{formatoSoles(c.capital)}</td>
          <td className="whitespace-nowrap px-3 py-2.5">{formatoSoles(c.interes)}</td>
          <td className="whitespace-nowrap px-3 py-2.5 font-semibold">{formatoSoles(c.cuota)}</td>
          <td className="whitespace-nowrap px-3 py-2.5 text-brand-600">{c.estado.replaceAll('_',' ')}</td>
         </tr>)}
        </tbody>
       </table>
      </div>
      <div className="mt-3 grid gap-2 rounded-lg bg-brand-50 p-3 text-xs text-brand-700 sm:grid-cols-3">
        <div><span className="block text-brand-500">Capital de las cuotas</span>
          <strong className="tabular-nums">{formatoSoles(totales.capital/100)}</strong></div>
        <div><span className="block text-brand-500">Intereses de las cuotas</span>
          <strong className="tabular-nums">{formatoSoles(totales.interes/100)}</strong></div>
        <div><span className="block text-brand-500">Total del cronograma</span>
          <strong className="tabular-nums">{formatoSoles(totales.cuota/100)}</strong></div>
      </div>
      {diferenciaCapital!==0&&
        <p role="alert" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Diferencia histórica de {formatoSoles(Math.abs(diferenciaCapital)/100)}
          {' '}entre el capital pactado y las cuotas registradas. Requiere revisión de Finanzas;
          no se modifica automáticamente el contrato.
        </p>}
      <p className="mt-3 flex items-center gap-2 text-[11px] text-brand-500">
        <RefreshCw className="h-3.5 w-3.5"/>La información se actualiza desde el plan autorizado.
      </p>
    </>}
 </section>;
}
