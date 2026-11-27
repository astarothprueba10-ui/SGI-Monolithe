const assert = require('node:assert/strict');
const { test } = require('node:test');
const ExcelJS = require('exceljs');
const { HOJAS_ESTRUCTURA } = require('../src/lib/projectTemplateSchema.ts');
const JSZip = require('jszip');
const { leerArchivoProyecto, leerLibroProyecto } = require('../src/utils/projectImportExcel.ts');

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

async function archivo(wb, variante = false) {
  let bytes = await wb.xlsx.writeBuffer();
  if (variante) {
    const zip = await JSZip.loadAsync(bytes);
    for (const p of ['xl/workbook.xml','xl/styles.xml','xl/sharedStrings.xml',
      ...Object.keys(zip.files).filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))]) {
      const e = zip.file(p);
      if (!e) continue;
      const xml = (await e.async('string'))
        .replace('xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"',
          'xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"')
        .replace(/<(\/?)([A-Za-z][\w.-]*)(?=[\s/>])/g, '<$1x:$2');
      zip.file(p, xml);
    }
    const p = 'xl/_rels/workbook.xml.rels';
    zip.file(p, (await zip.file(p).async('string')).replace(/Target="(?!\/)([^"]+)"/g, 'Target="/xl/$1"'));
    bytes = await zip.generateAsync({type:'nodebuffer'});
  }
  return new File([bytes], 'proyecto.xlsx');
}

test('lee archivos XLSX normales y con prefijos XML y relaciones absolutas', async () => {
  const wb = libro();
  wb.getWorksheet('Zonas').addRow(['Z-01','Zona A & B',1,'']);
  wb.getWorksheet('Lotes').addRow(['ET-01','MZ-A','MZ-A-L01','01','Z-01','REGULAR',450]);
  wb.getWorksheet('Tarifas').addRow(['Z-01','COC-C01','PEN','MONTO_FIJO',26000,'2026-11-26','']);
  const esperado = leerLibroProyecto(wb,'PROY-001');
  assert.deepEqual(await leerArchivoProyecto(await archivo(wb),'PROY-001'),esperado);
  assert.deepEqual(await leerArchivoProyecto(await archivo(wb,true),'PROY-001'),esperado);
});

test('la compatibilidad no permite fórmulas ni archivos de otro proyecto', async () => {
  const wb = libro();
  wb.getWorksheet('Zonas').addRow(['Z-01',{formula:'1+1',result:2},1,'']);
  const file = await archivo(wb,true);
  await assert.rejects(() => leerArchivoProyecto(file,'PROY-002'),/no coincide/);
  await assert.rejects(() => leerArchivoProyecto(file,'PROY-001'),/Solo se admite/);
});

test('rechaza archivos que no son libros XLSX', async () => {
  await assert.rejects(() => leerArchivoProyecto(new File(['no es un zip'],'falso.xlsx'),'PROY-001'),/No se pudo leer/);
});
