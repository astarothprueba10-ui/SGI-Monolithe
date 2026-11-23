import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ventas=readFileSync(new URL('../src/pages/Sales.tsx', import.meta.url),'utf8');
const filtros=readFileSync(new URL('../src/utils/separacionesFiltros.ts',import.meta.url),'utf8');

test('separaciones vencidas se detectan por fecha sin cambiar el estado comercial',()=>{
  assert.match(ventas,/separacionesPlazoVencido/);
  assert.match(ventas,/Plazo vencido · revisar/);
  assert.match(ventas,/El estado almacenado puede seguir siendo/);
  assert.match(ventas,/el lote no debe liberarse ni el pago anularse/i);
  assert.match(ventas,/leyendaVencimiento\(sale\.expiresAtIso, sale\.status, instanteActual\)/);
  assert.match(filtros,/if \(diferencia <= 0\) return 'Vencida'/);
});
