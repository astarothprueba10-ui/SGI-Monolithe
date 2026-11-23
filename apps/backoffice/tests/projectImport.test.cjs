const assert = require('node:assert/strict');
const { test } = require('node:test');
const ExcelJS = require('exceljs');
const { HOJAS_ESTRUCTURA } = require('../src/lib/projectTemplateSchema.ts');
const { leerLibroProyecto } = require('../src/utils/projectImportExcel.ts');

function libro() {
  const wb = new ExcelJS.Workbook();
  const info = wb.addWorksheet('Instrucciones');
  info.addRows([['MONOLITHE'],['version_plantilla',1],['codigo_proyecto','PROY-001']]);
  for (const h of HOJAS_ESTRUCTURA) wb.addWorksheet(h.nombre).addRow([...h.columnas]);
  return wb;
}
test('lee codigos y filas sin convertir texto a numeros', () => {
  const wb = libro();
  wb.getWorksheet('Zonas').addRow(['Z-01','Zona A',1,'']);
  const datos = leerLibroProyecto(wb,'PROY-001');
  assert.equal(datos.versionPlantilla,1);
  assert.deepEqual(datos.filas,[{hoja:'Zonas',numero:2,celdas:{codigo:'Z-01',nombre:'Zona A',orden:'1',descripcion:''}}]);
});
test('rechaza archivo de otro proyecto, hoja modificada y formulas', () => {
  let wb = libro();
  assert.throws(() => leerLibroProyecto(wb,'PROY-002'),/no coincide/);
  wb.getWorksheet('Zonas').getCell('A1').value='otro';
  assert.throws(() => leerLibroProyecto(wb,'PROY-001'),/Encabezados incorrectos/);
  wb=libro();
  wb.getWorksheet('Zonas').addRow([{formula:'1+1',result:2},'Zona A',1,'']);
  assert.throws(() => leerLibroProyecto(wb,'PROY-001'),/Solo se admite/);
});
test('rechaza un archivo sin datos y protege encabezados adicionales', () => {
  let wb=libro();
  assert.throws(() => leerLibroProyecto(wb,'PROY-001'),/1 y 2,000/);
  wb.getWorksheet('Zonas').getCell('E1').value='otro';
  assert.throws(() => leerLibroProyecto(wb,'PROY-001'),/Encabezados incorrectos/);
});
