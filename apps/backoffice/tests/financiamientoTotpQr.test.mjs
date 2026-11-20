import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import qrcode from '../src/vendor/qrcode-generator.js';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('QR local admite URI otpauth y construye la matriz sin red externa', () => {
  // Solo valores de ejemplo. NUNCA incluir un secreto real de usuario en tests.
  const uri = 'otpauth://totp/MONOLITHE%3AGerencia-999?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=MONOLITHE&algorithm=SHA1&digits=6&period=30';
  const qr = qrcode(0, 'M');
  qr.addData(uri, 'Byte');
  qr.make();
  const size = qr.getModuleCount();
  assert.ok(size >= 21 && size <= 177);
  assert.equal(qr.isDark(0, 0), true);
  assert.equal(qr.isDark(6, 6), true);
  assert.equal(qr.isDark(0, size - 1), true);
  assert.equal(qr.isDark(size - 1, 0), true);
  const total = Array.from({length:size}, (_,r) =>
    Array.from({length:size}, (_,c)=>Number(qr.isDark(r,c))).reduce((a,b)=>a+b,0)
  ).reduce((a,b)=>a+b,0);
  assert.ok(total > 150, 'La matriz no puede estar vacía');
});

test('la pantalla muestra QR por defecto, clave manual oculta y opción de descarte', () => {
  const ui=read('../src/components/financing/SeguridadFinancieraTotpPanel.tsx');
  const svg=read('../src/components/financing/CodigoQrTotp.tsx');
  const api=read('../src/services/financingMfaService.ts');
  const controller=read('../../../services/auth-service/src/main/java/monolithe/auth_service/controller/FinancingTotpController.java');
  const backend=read('../../../services/auth-service/src/main/java/monolithe/auth_service/service/FinancingTotpService.java');

  assert.match(ui, /<CodigoQrTotp otpauthUri=\{otpauthUri\}/);
  assert.match(ui, /setOtpauthUri\(datos\.otpauthUri\)/);
  assert.match(ui, /mostrarClaveManual &&/);
  assert.match(ui, /Descartar QR y comenzar de nuevo/);
  assert.match(svg, /qrcode\(0, 'M'\)/);
  assert.match(svg, /qr\.addData\(otpauthUri, 'Byte'\)/);
  assert.match(svg, /qr\.isDark\(row, col\)/);
  assert.match(svg, /aria-label="Código QR/);
  assert.match(svg, /uri\.protocol !== 'otpauth:'/);
  assert.match(svg, /quietZone = 4/);
  assert.doesNotMatch(svg, /fetch\(|axios|https:\/\/|dangerouslySetInnerHTML/);
  assert.doesNotMatch(ui, /localStorage\.|sessionStorage\./);
  assert.match(api, /'\/cancel-enrollment'/);
  assert.match(controller, /@PostMapping\("\/cancel-enrollment"\)/);
  assert.match(controller, /@PreAuthorize\("hasAuthority\('financing\.configure'\)"\)/);
  assert.match(backend, /public Map<String,String> descartarEnrolamiento\(Jwt jwt\)/);
  assert.match(backend, /secreto_pendiente=NULL/);
  assert.match(backend, /auditar\(id,"MFA_FIN_ENROLAMIENTO_DESCARTADO"/);
});
