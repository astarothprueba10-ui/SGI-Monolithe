import {
  Document,Page,Text,View,StyleSheet,pdf
} from '@react-pdf/renderer';
import type {
  CrmPlanCarteraReal,CrmCronogramaVenta,CrmSaldoVenta,CrmCuotaCronograma
} from '../services/crmBackend';

const azul='#0E1F33',marino='#152B45',dorado='#D9B168',gris='#5B7490',verde='#047857',borde='#DDE7F0';
const styles=StyleSheet.create({
  pagina:{backgroundColor:'#FFFFFF',color:azul,fontFamily:'Helvetica',fontSize:9,paddingTop:30,paddingBottom:32,paddingHorizontal:34},
  cabecera:{backgroundColor:azul,paddingVertical:17,paddingHorizontal:20,borderRadius:9,marginBottom:18},
  marca:{fontSize:9,color:dorado,letterSpacing:2,fontWeight:700,marginBottom:8},
  titulo:{fontSize:20,color:'#FFFFFF',fontWeight:700,marginBottom:4},
  subtitulo:{fontSize:10,color:'#D7E2EF'},
  chip:{backgroundColor:'#F1F5FA',borderRadius:6,paddingVertical:10,paddingHorizontal:11,marginBottom:9},
  seccion:{fontSize:12,fontWeight:700,marginBottom:10,color:azul},
  etiqueta:{fontSize:8,color:gris,marginBottom:5},
  valor:{fontSize:11,fontWeight:700,color:azul},
  grid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between'},
  dato:{width:'24%',marginBottom:10,borderWidth:1,borderColor:borde,borderRadius:6,paddingVertical:12,paddingHorizontal:10,minHeight:56},
  texto:{fontSize:9,lineHeight:1.5,color:marino},
  nota:{marginTop:12,padding:11,backgroundColor:'#F6F8FC',borderLeftWidth:3,borderLeftColor:dorado,borderRadius:3},
  filaHead:{flexDirection:'row',backgroundColor:azul,paddingVertical:9,borderRadius:3},
  fila:{flexDirection:'row',paddingVertical:8,borderBottomWidth:.5,borderBottomColor:borde},
  tablaTexto:{fontSize:8,color:azul},
  tablaHead:{fontSize:8,fontWeight:700,color:'#FFFFFF'},
  pie:{position:'absolute',bottom:15,left:34,right:34,borderTopWidth:.7,borderTopColor:borde,paddingTop:7,
    flexDirection:'row',justifyContent:'space-between'},
  pieText:{fontSize:7,color:gris},
  total:{fontSize:11,fontWeight:700,color:verde}
});
const soles=(n:number|null|undefined)=>`S/ ${new Intl.NumberFormat('es-PE',{
  minimumFractionDigits:2,maximumFractionDigits:2
}).format(Number(n??0))}`;
const fecha=(v?:string|null)=>{
  if(!v || !/^\d{4}-\d{2}-\d{2}/.test(v))return '—';
  const d=new Date(v.slice(0,10)+'T12:00:00Z');
  return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('es-PE',{
    timeZone:'UTC',day:'2-digit',month:'2-digit',year:'numeric'
  }).format(d);
};
function etiquetaEstado(c:CrmCuotaCronograma):string{
  const e=c.estadoCalculado??c.estado;
  if(e==='ANULADA')return 'Anulada';
  if(e==='PAGADA')return 'Pagada';
  if(c.cuotaAtrasada||e==='VENCIDA')return e==='PARCIAL'?'Parcial atrasada':'Vencida';
  if(e==='PARCIAL')return 'Parcial';
  if(c.proxima7Dias)return 'Próxima a vencer';
  return 'Pendiente';
}
const Celdas=[7,15,17,13,13,13,13,9] as const;
function FilaCuota({c,cabecera=false}:{c?:CrmCuotaCronograma;cabecera?:boolean}){
  const labels=cabecera?['N.º','Vencimiento','Capital','Interés','Importe','Abonado','Saldo','Estado']:
    [String(c?.numero??'').padStart(2,'0'),fecha(c?.fechaVencimiento),
      soles(c?.capital),soles(c?.interes),soles(c?.cuota),soles(c?.abonadoConfirmado),
      soles(c?.saldoCuota??c?.cuota),c?etiquetaEstado(c):''];
  return <View style={cabecera?styles.filaHead:styles.fila} wrap={false}>
    {labels.map((t,i)=><Text key={i} style={[cabecera?styles.tablaHead:styles.tablaTexto,
      {width:`${Celdas[i]}%`,textAlign:i>1&&i<7?'right':'left',paddingHorizontal:3}]}>{t}</Text>)}
  </View>;
}
function Pie({venta}:{venta:string}){
  return <View fixed style={styles.pie}>
    <Text style={styles.pieText}>MONOLITHE · Expediente {venta} · Información al corte, no comprobante de pago</Text>
    <Text style={styles.pieText} render={({pageNumber,totalPages})=>`Página ${pageNumber} de ${totalPages}`}/>
  </View>;
}
function Dato({label,valor,verdeValor=false}:{label:string;valor:string|number;verdeValor?:boolean}){
  return <View style={styles.dato} wrap={false}>
    <Text style={styles.etiqueta}>{label}</Text>
    <Text style={[styles.valor,verdeValor?{color:verde}:{}]}>{String(valor)}</Text>
  </View>;
}
export interface ExpedientePdf {
  plan:CrmPlanCarteraReal;
  cronograma:CrmCronogramaVenta;
  saldo:CrmSaldoVenta;
}
export function DocumentoFinanciamiento({plan,cronograma,saldo}:ExpedientePdf){
  const fechaEmision=new Intl.DateTimeFormat('es-PE',{
    timeZone:'America/Lima',day:'2-digit',month:'2-digit',year:'numeric',
    hour:'2-digit',minute:'2-digit'
  }).format(new Date());
  const exigible=Boolean(plan.cuotasExigibles&&saldo.cuotasExigibles
    &&cronograma.tipoCronograma==='REGISTRADO'
    &&cronograma.fuenteEstados==='APLICACIONES_CONFIRMADAS');
  const cuotas=exigible?cronograma.items:[];
  const cuotaMensual=cuotas.find(c=>c.estadoCalculado!=='ANULADA')?.cuota;
  const campos=[
    ['Código de lote',plan.lote],
    ['Precio base de venta',soles(plan.precioVenta)],
    ['Inicial pactada',soles(plan.inicialAdicional+plan.reservaAplicada)],
    ['Capital financiado',soles(plan.capitalFinanciado)],
    ['Número de cuotas',plan.numeroCuotas],
    ['Interés total',soles(plan.interesTotal)],
    ['Total contractual en cuotas',soles(saldo.totalPlanCuotas??plan.totalCuotas)],
    ['Saldo actual',exigible?soles(saldo.saldoFinanciamiento):'No exigible'],
    ['Separación acreditada',plan.reservaAplicada>0?'Sí':'No'],
    ['Monto de cuota mensual',cuotaMensual!==undefined?soles(cuotaMensual):'—'],
    ['Fecha de primera cuota',fecha(cronograma.fechaPrimeraCuota??plan.fechaPrimeraCuota)],
  ] as const;
  const lotes:Array<CrmCuotaCronograma[]>=[];
  for(let i=0;i<cuotas.length;i+=18)lotes.push(cuotas.slice(i,i+18));
  return <Document title={`Plan financiero ${plan.codigoVenta}`}
    author="MONOLITHE" subject="Estado financiero informativo de la operación">
    <Page size="A4" orientation="landscape" style={styles.pagina}>
      <View style={styles.cabecera}>
        <Text style={styles.marca}>MONOLITHE   /   EXPEDIENTE FINANCIERO</Text>
        <Text style={styles.titulo}>{plan.comprador}</Text>
        <Text style={styles.subtitulo}>{plan.proyecto}  ·  Lote {plan.lote}</Text>
        <Text style={[styles.subtitulo,{marginTop:6,fontSize:8}]}>
          Emitido: {fechaEmision} (hora de Perú) · Saldos informativos actualizados
        </Text>
      </View>
      <View style={styles.grid}>
        <View style={[styles.chip,{width:'32%'}]}>
          <Text style={styles.etiqueta}>Código de venta</Text><Text style={styles.valor}>{plan.codigoVenta}</Text>
        </View>
        <View style={[styles.chip,{width:'32%'}]}>
          <Text style={styles.etiqueta}>Código del plan</Text><Text style={styles.valor}>{plan.codigoPlan}</Text>
        </View>
        <View style={[styles.chip,{width:'32%'}]}>
          <Text style={styles.etiqueta}>Estado · Fecha de venta</Text>
          <Text style={styles.valor}>{exigible?'Contrato vigente · cuotas exigibles':'Pendiente de formalización'} · {fecha(plan.fechaVenta)}</Text>
        </View>
      </View>
      <Text style={styles.seccion}>Resumen de la financiación</Text>
      <View style={styles.grid}>
        {campos.map(([label,valor])=><Dato key={label} label={label} valor={valor} verdeValor={label==='Saldo actual'&&exigible}/>)}
      </View>
      <View style={styles.nota}>
        <Text style={styles.texto}>
          {exigible
            ?`Total abonado a cuotas confirmado: ${soles(saldo.abonadoCuotasConfirmado)}. Saldo de cuotas pendiente: ${soles(saldo.saldoFinanciamiento)}. El saldo puede variar al confirmarse nuevos pagos.`
            :'Este plan aún no tiene cuotas exigibles. No se presenta un cronograma proyectado como deuda vencida o exigible.'}
        </Text>
      </View>
      <Pie venta={plan.codigoVenta}/>
    </Page>
    {lotes.map((pagina,i)=><Page key={i} size="A4" orientation="landscape" style={styles.pagina}>
      <Text style={styles.marca}>MONOLITHE  /  CRONOGRAMA DE CUOTAS</Text>
      <Text style={[styles.seccion,{fontSize:16,marginTop:8,marginBottom:6}]}>Cuotas registradas · {plan.codigoVenta}</Text>
      <Text style={[styles.texto,{marginBottom:15}]}>
        Titular: {plan.comprador} · Plan {plan.codigoPlan} · Estado financiero al momento de exportar
      </Text>
      <FilaCuota cabecera/>
      {pagina.map(c=><FilaCuota key={c.numero} c={c}/>)}
      <Pie venta={plan.codigoVenta}/>
    </Page>)}
    {!exigible&&<Page size="A4" orientation="landscape" style={styles.pagina}>
      <Text style={styles.seccion}>Cronograma de cuotas</Text>
      <View style={styles.nota}><Text style={styles.texto}>No hay cuotas exigibles registradas para esta operación. El cronograma se habilita tras la formalización contractual.</Text></View>
      <Pie venta={plan.codigoVenta}/>
    </Page>}
  </Document>;
}
export async function generarPdfExpediente(datos:ExpedientePdf):Promise<Blob>{
  return pdf(<DocumentoFinanciamiento {...datos}/>).toBlob();
}
