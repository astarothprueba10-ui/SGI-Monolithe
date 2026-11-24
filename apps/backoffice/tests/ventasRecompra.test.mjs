import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sales = readFileSync(new URL('../src/pages/Sales.tsx', import.meta.url),'utf8');
const buyer = readFileSync(new URL('../src/components/sales/EditarDatosCompradorModal.tsx', import.meta.url),'utf8');
const migration = readFileSync(new URL('../../../database/migrations/133_ventas_recompra_comprador_existente_v1.sql',import.meta.url),'utf8');

test('un comprador convertido puede iniciar nuevas compras y ver proyectos activos', () => {
  assert.match(sales,/CON_RESERVA', 'CONVERTIDO'/);
  assert.match(sales,/compradorExistente \|\| intereses\.has\(p\.idProyecto\)/);
  assert.match(sales,/idProyectoVenta=\{Number\(formProjectId\)\}/);
});

test('el proyecto de la ficha está asociado al lote y no se cambia en el modal', () => {
  assert.match(buyer,/idProyecto: idProyectoVenta/);
  assert.match(buyer,/Proyecto del lote seleccionado/);
  assert.match(buyer,/disabled\s+aria-label="Proyecto del lote seleccionado/);
});

test('recompra conserva seguridad por asesor, lote y origen de captación', () => {
  assert.match(migration,/sp_crm_validar_formalizacion_v6/);
  assert.match(migration,/CONVERTIDO/);
  assert.match(migration,/PROSPECTO_NO_ELEGIBLE\|El comprador convertido no tiene una venta formalizada verificable/);
  assert.match(migration,/VENTA_EXISTENTE/);
  assert.match(migration,/La ficha contractual no coincide con el proyecto del lote/);
  assert.match(migration,/id_origen_prospecto=v_origen[\s\S]*?AND NOT EXISTS/);
  assert.doesNotMatch(migration,/YA_COMPRADOR/);
});


test('operación permite registrar interés y asignar asesor desde el formulario con permisos CRM', () => {
  assert.match(sales,/compradorExistente \|\| intereses\.has\(p\.idProyecto\) \|\| puedeEditarInteres/);
  assert.match(sales,/crmBackend\.actualizar\(idProspecto, \{ idProyectoInteres: idProyecto \}\)/);
  assert.match(sales,/crmBackend\.registrarInteresRecompra/);
  assert.match(sales,/crmBackend\.asesor\(id, asesor\.id_asesor/);
  assert.match(sales,/puedeAsignarAsesorOperacion = can\('crm\.edit'\)/);
  assert.match(sales,/const tieneAsesor = \(prospect\.id_asesor \?\? 0\) > 0/);
});
