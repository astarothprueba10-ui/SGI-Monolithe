import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

const read = (file) => fs.readFileSync(path.join(srcDir, file), 'utf8');

const service = read('services/crmBackend.ts');
const page = read('pages/Crm.tsx');
const autocomplete = read('components/ui/ProspectSearchAutocomplete.tsx');

// 1. Verificacion de Endpoints Reales del Backend Core
const requiredEndpoints = [
  '/crm/catalogos',
  '/crm/prospectos/buscar',
  '/crm/prospectos',
  '/crm/compradores',
  '/crm/resumen',
  '/crm/asesores',
  '/crm/prospectos/${id}/ficha',
  '/crm/prospectos/${id}/etapa',
  '/crm/prospectos/${id}/asesor',
  '/crm/prospectos/${idProspecto}/visitas',
  '/crm/visitas/${idVisita}/estado',
  '/crm/prospectos/${id}/seguimientos',
  '/crm/exportaciones/prospectos.csv'
];

for (const ep of requiredEndpoints) {
  assert.ok(service.includes(ep), `Endpoint ausente en crmBackend: ${ep}`);
}

// 2. Verificacion de Seguridad y Autenticacion
assert.ok(service.includes('coreApi'), 'Se requiere coreApi autenticado');
assert.ok(!service.includes('supabase.rpc'), 'Prohibido llamar RPC directo de Supabase');
assert.ok(!page.includes('INITIAL_LEADS') && !page.includes('data/crm'), 'Prohibido usar datos mock o leads demo');

// 3. Verificacion de CRUD de Leads
for (const field of ['idSolicitud', 'motivoContacto', 'idProyecto', 'correo', 'telefono']) {
  assert.ok(page.includes(field), `Campo requerido en captacion: ${field}`);
}
assert.ok(page.includes('crypto.randomUUID()'), 'Captaciones requieren UUID de idempotencia');
assert.ok(page.includes('crmBackend.crear'), 'Falta operacion de creacion de leads');
assert.ok(page.includes('crmBackend.desactivar'), 'Falta baja logica de leads');
assert.ok(page.includes('crmBackend.actualizar'), 'Falta edicion comercial de leads');
assert.ok(page.includes('crmBackend.etapa'), 'Falta transicion de etapa de leads');
assert.ok(page.includes('crmBackend.asesor'), 'Falta asignacion de asesor comercial');

// 4. Verificacion de Seguimientos Comerciales
assert.ok(page.includes('crmBackend.registrarSeguimiento'), 'Falta registro de seguimientos');
assert.ok(page.includes('crmBackend.listarSeguimientos'), 'Falta consulta de historial de seguimientos');

// 5. Verificacion de Visitas y Agenda
assert.ok(page.includes('crmBackend.visitas'), 'Falta consulta de visitas en agenda');
assert.ok(page.includes('crmBackend.agendarVisita'), 'Falta agendamiento de visitas');
assert.ok(page.includes('crmBackend.actualizarEstadoVisita'), 'Falta actualizacion de estado de visita');
assert.ok(page.includes('handleCompleteVisit'), 'Falta handler para visita realizada');
assert.ok(page.includes('handleConfirmVisit'), 'Falta handler para visita confirmada');
assert.ok(page.includes('handleCancelVisit'), 'Falta handler para visita cancelada');

// 6. Verificacion de Buscador Dinamico de Prospectos (Nombre, Codigo y DNI)
assert.ok(autocomplete.includes('ProspectSearchAutocomplete'), 'Componente de busqueda ausente');
assert.ok(autocomplete.includes('debounceTimerRef'), 'Falta implementacion de debounce');
assert.ok(autocomplete.includes('handleKeyDown'), 'Falta navegacion por teclado');
assert.ok(autocomplete.includes('ArrowDown') && autocomplete.includes('ArrowUp'), 'Faltan flechas de navegacion');
assert.ok(autocomplete.includes('crmBackend.buscar'), 'Falta busqueda remota por consulta');
assert.ok(
  autocomplete.includes('numero_documento') || autocomplete.includes('dni'),
  'Falta busqueda por DNI/documento en autocompletado'
);
assert.ok(page.includes('<ProspectSearchAutocomplete'), 'La pagina Crm no utiliza el buscador dinamico');

// 7. Verificacion de Contadores y Estados de Carga/Error
assert.ok(page.includes('visitsError'), 'Falta estado de error en agenda');
assert.ok(page.includes('isLoadingVisits'), 'Falta estado de carga en agenda');
assert.ok(page.includes('Reintentar'), 'Falta boton de reintentar tras error');

// 8. Verificacion de Permisos y Exportacion
assert.ok(page.includes('permission="crm.edit"'), 'Falta validacion de permiso crm.edit');
assert.ok(page.includes('permission="crm.export"'), 'Falta validacion de permiso crm.export');
assert.ok(page.includes('permission="crm.delete"'), 'Falta validacion de permiso crm.delete');
assert.ok(page.includes('permission="crm.create"'), 'Falta validacion de permiso crm.create');
assert.ok(page.includes('crmBackend.exportarCsv'), 'Falta exportacion CSV');

console.log('Validacion automatizada de contratos CRUD CRM: 100% aprobada.');
