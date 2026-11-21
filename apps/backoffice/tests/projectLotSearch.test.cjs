const assert = require('node:assert/strict');
const { test } = require('node:test');
const { buscarLotes } = require('../src/lib/projectLotSearch.ts');

const lotes = Array.from({ length: 50 }, (_,i) => ({
  id: i + 1, codigo: 'ALM-L' + String(i+1).padStart(3,'0')
}));
test('busca por fragmento dentro del selector único', () => {
  assert.deepEqual(buscarLotes(lotes,'9').map(l => l.codigo),
    ['ALM-L009','ALM-L019','ALM-L029','ALM-L039','ALM-L049']);
  assert.deepEqual(buscarLotes(lotes,'  alm-l009 ').map(l => l.codigo), ['ALM-L009']);
  assert.equal(buscarLotes(lotes,'no existe').length,0);
  assert.equal(buscarLotes(lotes,'').length,50);
});
