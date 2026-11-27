const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const base = resolve(__dirname,'../src');
function read(path){return readFileSync(resolve(base,path),'utf8')}
test('panel CAD acepta DWG y SVG y preserva la vista de lotes',()=>{
 const panel=read('components/projects/detail/ProjectSvgPanel.tsx');
 assert.match(panel,/accept="\.dwg,\.svg/);
 assert.match(panel,/projectSvgService\.subirOriginal/);
 assert.match(panel,/projectSvgService\.guardar/);
 assert.match(panel,/PlanSvgShapes/);
 assert.match(panel,/no se convierte automáticamente/i);
});
test('el cliente REST envia FormData autenticado sin revelar claves privadas',()=>{
 const svc=read('services/projectSvgService.ts');
 assert.match(svc,/new FormData\(\)/);
 assert.match(svc,/form\.append\('archivo'/);
 assert.match(svc,/coreApi\.post/);
 assert.doesNotMatch(svc,/SERVICE_ROLE_KEY/);
});

test('la papelera requiere permiso y confirmación, elimina por proyecto y limpia la vista cuando corresponde',()=>{
 const panel=read('components/projects/detail/ProjectSvgPanel.tsx');
 const svc=read('services/projectSvgService.ts');
 assert.match(panel,/puedeConfigurar && <button[\s\S]*?Trash2Icon/);
 assert.match(panel,/Eliminar definitivamente/);
 assert.match(panel,/projectSvgService\.eliminarOriginal\(proyecto,archivoEliminar\.id\)/);
 assert.match(panel,/resultado\.vistaEliminada/);
 assert.match(panel,/onSave\(null\)/);
 assert.match(svc,/coreApi\.delete/);
});
