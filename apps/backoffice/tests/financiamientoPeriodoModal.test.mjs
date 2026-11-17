// Funcionalidad de financiamiento por período y cronograma individual.
// Estas pruebas impiden volver a mezclar saldos históricos y registros ficticios.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(name)=>readFileSync(new URL(name,import.meta.url),'utf8');

test('reutiliza el filtro global de CRM y comienza en AÑO',()=>{
  const panel=read('../src/components/financing/CarteraFinanciamientoPanel.tsx');
  const periodo=read('../src/components/crm/CrmPeriodoGlobal.tsx');
  const utility=read('../src/utils/crmPeriodo.ts');
  assert.match(panel,/CrmPeriodoGlobal/);
  assert.match(panel,/calcularRangoCrm/);
  assert.match(panel,/useState<PeriodoCrmModo>\('ANIO'\)/);
  assert.match(panel,/getPeruTodayDateString/);
  assert.match(periodo,/Hoy/);
  assert.match(periodo,/Semana/);
  assert.match(periodo,/Mes/);
  assert.match(periodo,/Año/);
  assert.match(periodo,/Rango/);
  assert.match(utility,/America|05:00/);
  assert.match(panel,/desde:rango\.desde,hastaExclusivo:rango\.hastaExclusivo/);
});

test('el periodo limita los planes y los KPI son de saldos vigentes de ventas del periodo',()=>{
  const sql=read('../../../database/migrations/104_financiamiento_cartera_filtro_periodo_v2.sql');
  const service=read('../../../services/core-service/src/main/java/monolithe/core_service/service/CrmVentaService.java');
  const ctr=read('../../../services/core-service/src/main/java/monolithe/core_service/controller/CrmVentaController.java');
  const api=read('../src/services/crmBackend.ts');
  assert.match(sql,/sp_fin_cartera_backoffice_v2/);
  assert.match(sql,/coalesce\(v\.fecha_venta,v\.fecha_creacion\) >= p_desde/);
  assert.match(sql,/coalesce\(v\.fecha_venta,v\.fecha_creacion\) < p_hasta_exclusivo/);
  assert.match(sql,/'saldoBase','SALDO_ACTUAL'/);
  assert.match(sql,/sp_crm_saldo_venta_v1/);
  assert.match(sql,/fn_crm_puede_consultar_venta_v1/);
  assert.match(sql,/REVOKE ALL.*FROM PUBLIC,anon,authenticated/);
  assert.match(sql,/GRANT EXECUTE.*TO sigi_app_user/);
  assert.match(ctr,/hasAuthority\('financing\.view'\) and hasAuthority\('sales\.view'\)/);
  assert.match(ctr,/RequestParam\(required = true\) String desde/);
  assert.match(service,/OffsetDateTime\.parse\(desde\)/);
  assert.match(service,/sp_fin_cartera_backoffice_v3/);
  assert.match(api,/hastaExclusivo:params\.hastaExclusivo/);
});

test('planes y cronograma se unifican: tabla con nueve columnas y detalle por venta',()=>{
  const panel=read('../src/components/financing/CarteraFinanciamientoPanel.tsx');
  const modal=read('../src/components/financing/PlanFinanciamientoDetalleModal.tsx');
  assert.match(panel,/id:'PLANES',label:'Planes y saldos'/);
  assert.match(panel,/id:'ALERTAS',label:'Alertas de cuotas Vencidas'/);
  assert.doesNotMatch(panel,/id:'CUOTAS'/);
  for(const h of ['Venta y comprador','Precio base','Inicial','Capital financiado','Interés','Saldo','Estado','Ver cronograma'])assert.ok(panel.includes(h),h);
  assert.match(panel,/Table head=/);
  assert.match(panel,/PlanFinanciamientoDetalleModal/);
  assert.match(modal,/crmBackend\.obtenerCronogramaVenta\(plan\.idVenta\)/);
  assert.match(modal,/crmBackend\.obtenerSaldoVenta\(plan\.idVenta\)/);
  assert.match(modal,/Con saldo pendiente/);
  assert.match(modal,/Todas/);
  assert.match(modal,/c\.estadoCalculado/);
  assert.match(modal,/c\.cuotaAtrasada/);
  assert.match(modal,/overflow-hidden/);
  assert.match(modal,/Table className=/);
  assert.match(modal,/cuotasVisibles\.map/);
});

test('las tablas y los KPI se adaptan y representan importes sin redondeo',()=>{
  const panel=read('../src/components/financing/CarteraFinanciamientoPanel.tsx');
  const modal=read('../src/components/financing/PlanFinanciamientoDetalleModal.tsx');
  const money=read('../src/utils/financeMoney.ts');
  const table=read('../src/components/ui/Table.tsx');
  assert.match(panel,/KpiCard/);
  assert.match(panel,/sm:grid-cols-2 xl:grid-cols-5/);
  assert.match(panel,/sm:hidden/);
  assert.match(table,/overflow-x-auto/);
  assert.match(modal,/max-w-6xl/);
  assert.match(money,/minimumFractionDigits: 2/);
  assert.match(money,/maximumFractionDigits: 2/);
});


test('el expediente no repite cabecera y conserva exactamente los 11 datos solicitados',()=>{
  const modal=read('../src/components/financing/PlanFinanciamientoDetalleModal.tsx');
  const labels=[...modal.matchAll(/<Dato etiqueta="([^"]+)"/g)].map(x=>x[1]);
  assert.deepEqual(labels,[
    'Código de lote','Precio base de venta','Inicial pactada','Capital financiado',
    'Número de cuotas','Interés total','Total contractual en cuotas','Saldo actual',
    'Separación acreditada','Monto de cuota mensual','Fecha de primera cuota'
  ]);
  assert.match(modal,/title=\{\`Plan financiero · \$\{plan\.codigoVenta\}\`\}/);
  assert.doesNotMatch(modal,/description=\{\`\$\{plan\.comprador\}/);
  assert.match(modal,/bg-gradient-to-r from-brand-950 via-brand-900 to-brand-800/);
  assert.match(modal,/\{plan\.comprador\}/);
  assert.match(modal,/\{plan\.proyecto\}/);
  assert.match(modal,/\{plan\.lote\}/);
  assert.match(modal,/separacionAcreditada \? 'Sí' : 'No'/);
  assert.match(modal,/cronograma\?\.items\.find\(item => item\.estadoCalculado !== 'ANULADA'\)\?\.cuota/);
  assert.match(modal,/montoCuotaMensual != null \? soles\(montoCuotaMensual\) : '—'/);
  assert.match(modal,/cuotasVisibles\.map/);
});

test('la tabla reutiliza el diseño CRM con filtros separados sin cambiar los KPI',()=>{
  const panel=read('../src/components/financing/CarteraFinanciamientoPanel.tsx');
  const filtros=read('../src/components/financing/FiltrosCarteraFinanciera.tsx');
  const sql=read('../../../database/migrations/105_financiamiento_filtros_tabla_v3.sql');
  const service=read('../../../services/core-service/src/main/java/monolithe/core_service/service/CrmVentaService.java');
  const controller=read('../../../services/core-service/src/main/java/monolithe/core_service/controller/CrmVentaController.java');
  const api=read('../src/services/crmBackend.ts');

  assert.match(panel,/useState<PeriodoCrmModo>\('ANIO'\)/);
  assert.match(panel,/FiltrosCarteraFinanciera/);
  assert.match(panel,/proyectos=\{catalogos\.proyectos\}/);
  assert.match(panel,/lotes=\{catalogos\.lotes\}/);
  assert.match(panel,/onProyecto=\{proyecto=>cambiarFiltroTabla\(\{proyecto,lote:''\}\)\}/);
  assert.match(panel,/onLimpiar=\{limpiarFiltrosTabla\}/);
  assert.match(panel,/fechaTablaDesde:filtrosTabla\.fechaDesde/);
  assert.match(panel,/fechaTablaHasta:filtrosTabla\.fechaHasta/);
  assert.match(panel,/setCatalogos\(resultado\.filtros\)/);

  for(const label of ['Buscar venta o comprador','Proyecto','Lote','Estado','Fecha desde','Fecha hasta','Limpiar filtros']){
    assert.ok(filtros.includes(label),label);
  }
  assert.match(filtros,/flex flex-wrap items-end gap-3/);
  assert.match(filtros,/fechaDesde/);
  assert.match(filtros,/fechaHasta/);
  assert.match(filtros,/FILTROS_CARTERA_VACIOS/);

  assert.match(sql,/sp_fin_cartera_backoffice_v3/);
  assert.match(sql,/v_catalogo_proyectos/);
  assert.match(sql,/v_catalogo_lotes/);
  assert.match(sql,/p_proyecto/);
  assert.match(sql,/p_lote/);
  assert.match(sql,/p_estado/);
  assert.match(sql,/p_tabla_desde/);
  assert.match(sql,/p_tabla_hasta/);
  assert.match(sql,/v_total_planes := v_total_planes\+1/);
  assert.match(sql,/'resumen',jsonb_build_object/);
  assert.match(sql,/REVOKE ALL ON FUNCTION.*FROM PUBLIC,anon,authenticated/);
  assert.match(sql,/GRANT EXECUTE ON FUNCTION.*TO sigi_app_user/);
  assert.match(service,/sp_fin_cartera_backoffice_v3/);
  assert.match(controller,/RequestParam\(defaultValue = ""\) String proyecto/);
  assert.match(api,/fechaTablaDesde:params\.fechaTablaDesde/);
  assert.match(api,/fechaTablaHasta:params\.fechaTablaHasta/);
});


test('paginación financiera reutiliza controles de sistema y funciona con un único registro',()=>{
  const panel=read('../src/components/financing/CarteraFinanciamientoPanel.tsx');
  const pagination=read('../src/components/ui/Pagination.tsx');
  assert.match(panel,/import \{Pagination\} from '\.\.\/ui\/Pagination'/);
  assert.match(panel,/<Pagination page=\{pagina\} pageSize=\{20\} total=\{datos\.total\}/);
  assert.doesNotMatch(panel,/datos\.paginas>1&&<div className="flex flex-wrap/);
  assert.match(pagination,/Mostrando \{from\}/);
  assert.match(pagination,/aria-label="Página siguiente"/);
});

test('Excel incluye KPI, todas las páginas, cartera y alertas de ventas en período',()=>{
  const panel=read('../src/components/financing/CarteraFinanciamientoPanel.tsx');
  const excel=read('../src/utils/financiamientoExportExcel.ts');
  assert.match(panel,/Exportar Excel/);
  assert.match(panel,/consultarReporteFinanciero\(rango,setProgresoExportacion\)/);
  assert.match(excel,/listarCarteraFinancieraReal/);
  assert.match(excel,/listarAlertasCuotas/);
  assert.match(excel,/pagina,tamano:100/);
  assert.match(excel,/planes\.length!==primer\.total/);
  assert.match(excel,/ventas\.has\(a\.idVenta\)/);
  assert.match(excel,/addWorksheet\('Resumen financiero'\)/);
  assert.match(excel,/addWorksheet\('Planes y saldos'\)/);
  assert.match(excel,/addWorksheet\('Alertas de cuotas'\)/);
  assert.match(excel,/numFmt=FORMATO_SOLES/);
  assert.match(excel,/numFmt='dd\/mm\/yyyy'/);
  assert.match(excel,/textoSeguro/);
  assert.match(excel,/próximas|PRÓXIMA/i);
});

test('PDF por venta solo incluye cronograma exigible y datos reales del expediente',()=>{
  const modal=read('../src/components/financing/PlanFinanciamientoDetalleModal.tsx');
  const pdf=read('../src/utils/financiamientoExportPdf.tsx');
  assert.match(modal,/Exportar expediente PDF/);
  assert.match(modal,/generarPdfExpediente\(\{plan,cronograma,saldo\}\)/);
  assert.match(modal,/disabled=\{cargando\|\|Boolean\(error\)\|\|!cronograma\|\|!saldo\|\|exportandoPdf\}/);
  assert.match(pdf,/@react-pdf\/renderer/);
  assert.match(pdf,/cronograma\.fuenteEstados==='APLICACIONES_CONFIRMADAS'/);
  assert.match(pdf,/const cuotas=exigible\?cronograma\.items:\[\]/);
  assert.match(pdf,/monto de cuota mensual/i);
  assert.match(pdf,/Saldo actual/);
  assert.match(pdf,/FilaCuota/);
  assert.match(pdf,/orientation="landscape"/);
});

test('alertas y causales contractuales usan KPI modernos sin cambiar derechos',()=>{
  const alertas=read('../src/components/financing/AlertasCuotasPanel.tsx');
  const legal=read('../src/components/financing/RevisionClausulaPanel.tsx');
  for(const p of [alertas,legal]){
    assert.match(p,/KpiCard/);
    assert.match(p,/grid grid-cols-1 gap-3 sm:grid-cols-3/);
    assert.match(p,/formatSoles/);
  }
  assert.match(alertas,/can\('sales\.view'\)/);
  assert.match(alertas,/can\('financing\.approve'\)/);
  assert.match(legal,/can\('sales\.legal\.review'\)/);
  assert.match(legal,/resolución|resuelve ni anula/i);
});
