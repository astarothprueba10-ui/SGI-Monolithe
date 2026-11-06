const test = require('node:test');
const assert = require('node:assert/strict');
const { validarPagoVenta } = require('../src/utils/crmPagoVenta.ts');
const { validarConyugeVenta, CONYUGE_VACIO } = require('../src/utils/crmConyugeVenta.ts');
const archivo = { name: 'pago.pdf', type: 'application/pdf', size: 42_000 };

test('Efectivo admite venta sin comprobantes', () => {
  assert.equal(validarPagoVenta('EFECTIVO', '', []), null);
});

test('Transferencia exige operación y uno o más comprobantes', () => {
  assert.match(validarPagoVenta('TRANSFERENCIA', '', [archivo]), /número de operación/);
  assert.match(validarPagoVenta('TRANSFERENCIA', 'OP123', []), /al menos un comprobante/);
  assert.equal(validarPagoVenta('TRANSFERENCIA', 'OP123', [archivo, archivo]), null);
});

test('Depósito, Yape y otros medios: evidencia obligatoria', () => {
  assert.match(validarPagoVenta('DEPOSITO', '123', []), /comprobante/);
  assert.match(validarPagoVenta('YAPE_PLIN', '123', []), /comprobante/);
  assert.match(validarPagoVenta('OTRO', '', []), /comprobante/);
  assert.equal(validarPagoVenta('OTRO', '', [archivo]), null);
});

test('Comprobantes limitados a 8 y a archivos compatibles de 5 MB', () => {
  assert.match(validarPagoVenta('TRANSFERENCIA', '123', Array(9).fill(archivo)), /máximo 8/);
  assert.match(validarPagoVenta('TRANSFERENCIA', '123',
    [{ ...archivo, size: 6 * 1024 * 1024 }]), /5 MB/);
  assert.match(validarPagoVenta('TRANSFERENCIA', '123',
    [{ ...archivo, type: 'text/plain' }]), /PDF/);
});

test('Datos del cónyuge: nombres, contacto y documento obligatorios', () => {
  assert.ok(Object.keys(validarConyugeVenta(CONYUGE_VACIO)).length >= 5);
  assert.deepEqual(validarConyugeVenta({
    nombres: 'Ana María', apellidoPaterno: 'Ramírez', apellidoMaterno: 'Ñahui',
    telefono: '+51987654321', correo: 'ejemplo@dominio.pe',
    tipoDocumento: 'DNI', numeroDocumento: '12345678'
  }), {});
});

test('Documento del cónyuge se valida por tipo', () => {
  const datos = { ...CONYUGE_VACIO, nombres: 'Ana', apellidoPaterno: 'Pérez',
    telefono: '987654321', correo: 'ejemplo@dominio.pe' };
  assert.ok(validarConyugeVenta({ ...datos, tipoDocumento: 'DNI', numeroDocumento: '123' }).numeroDocumento);
  assert.ok(!validarConyugeVenta({ ...datos, tipoDocumento: 'PASAPORTE', numeroDocumento: 'AB123456' }).numeroDocumento);
});
