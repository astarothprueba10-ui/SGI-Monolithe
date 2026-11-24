import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const ventas=readFileSync(new URL('../src/pages/Sales.tsx', import.meta.url),'utf8');
const filtros=readFileSync(new URL('../src/utils/separacionesFiltros.ts',import.meta.url),'utf8');
test('vencimiento confirmado por el servidor se muestra como anulación y lote liberado',()=>{
 assert.match(ventas,/separacionesPlazoVencido/);
 assert.match(ventas,/lotesVencidos\(sale\)/);
 assert.match(ventas,/Plazo vencido/);
 assert.match(ventas,/han sido liberados/);
 assert.match(ventas,/VENCIDA:[\s\S]*?etiqueta: 'Anulada'/);
 assert.match(ventas,/Varios \(\{sale.groupedLots.length\}\)/);
 assert.match(filtros,/if \(diferencia <= 0\) return 'Vencida'/);
});
