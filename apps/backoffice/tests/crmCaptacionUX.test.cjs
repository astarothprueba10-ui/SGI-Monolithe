const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const crm=fs.readFileSync(path.resolve(__dirname,'../src/pages/Crm.tsx'),'utf8');

test('CRM comienza en el mes actual sin cambiar las fechas propias de tablas',()=>{
  assert.match(crm,/useState<PeriodoCrmModo>\('MES'\)/);
  assert.match(crm,/useState\(obtenerFechaHoyLima\)/);
  assert.match(crm,/rangoBusquedaLeads = tab === 'visitas' \? rangoPeriodo : rangoTabla/);
});
test('captación espera confirmación del backend pero no bloquea por refresco de catálogos',()=>{
  const handler=crm.slice(crm.indexOf('const handleCreateSubmit'),crm.indexOf('const handleOpenDetail'));
  assert.match(handler,/await crmBackend\.crear\(/);
  assert.ok(handler.indexOf('await crmBackend.crear')<handler.indexOf('setIsNewLeadOpen(false)'));
  assert.match(handler,/setCaptacionRevision\(v=>v\+1\)/);
  assert.match(handler,/finally\s*\{\s*setIsSubmitting\(false\)/);
  assert.doesNotMatch(handler,/loadCatalogsAndAdvisors\(|loadLeads\(/);
  assert.match(handler,/idSolicitud: solicitudId/);
  assert.match(crm,/\[loadSummary,captacionRevision\]/);
  assert.match(crm,/\[tab, loadLeads,captacionRevision\]/);
  assert.match(crm,/\[rangoEvolucion, puedeVerGestionGlobal, projectFilter,captacionRevision\]/);
});
test('expediente conserva identificación y etapa real en su nueva cabecera',()=>{
  const header=crm.slice(crm.indexOf('relative isolate overflow-hidden rounded-2xl'),crm.indexOf("{can('crm.edit')",crm.indexOf('relative isolate overflow-hidden rounded-2xl')));
  assert.match(header,/leadDetail\.prospecto\.codigo/);
  assert.match(header,/leadDetail\.prospecto\.nombre_completo/);
  assert.match(header,/STAGE_TONES\[leadDetail\.prospecto\.estado_codigo\]/);
  assert.match(header,/leadDetail\.prospecto\.estado_nombre/);
  assert.match(header,/leadDetail\.prospecto\.categoria/);
});
