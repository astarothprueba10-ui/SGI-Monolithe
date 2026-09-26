import type {
  Alerta,
  Asesor,
  Cliente,
  Cuota,
  Documento,
  Financiamiento,
  Lote,
  Pago } from
'../types/portal';

export const cliente: Cliente = {
  nombre: 'Diego',
  nombreCompleto: 'Diego Alvarado Ríos',
  documento: 'DNI 45872103',
  correo: 'diego.alvarado@gmail.com',
  telefono: '+51 987 412 553',
  avatar: "/7d69874d-4a17-4207-a753-290fe6cd22f2.jpg",

  codigo: 'CLI-002417'
};

export const lote: Lote = {
  proyecto: 'Habilitación Urbana Los Jardines de Lurín',
  ubicacion: 'Km 32.5 Panamericana Sur, Lurín, Lima',
  etapa: 'Etapa I',
  manzana: 'Mz. A',
  numero: 'Lote 01',
  area: 120,
  precio: 108000,
  estado: 'Separado — en formalización',
  frente: 8,
  fondo: 15,
  uso: 'Residencial unifamiliar',
  partida: 'P.E. 11 452 908'
};

export const financiamiento: Financiamiento = {
  precioTotal: 108000,
  inicial: 21600,
  montoFinanciado: 86400,
  totalPagado: 38400.00,
  saldoPendiente: 69600.00,
  cuotasTotales: 36,
  cuotasPagadas: 7,
  tea: 11.5
};

export const cuotas: Cuota[] = [
{ numero: 1, vencimiento: '2025-10-05', monto: 1744.45, estado: 'pagada', fechaPago: '2025-10-03', medio: 'Transferencia BCP' },
{ numero: 2, vencimiento: '2025-11-05', monto: 1744.45, estado: 'pagada', fechaPago: '2025-11-04', medio: 'Transferencia BCP' },
{ numero: 3, vencimiento: '2025-12-05', monto: 1744.45, estado: 'pagada', fechaPago: '2025-12-05', medio: 'Depósito en agencia' },
{ numero: 4, vencimiento: '2026-01-05', monto: 1744.45, estado: 'pagada', fechaPago: '2026-01-04', medio: 'Transferencia BCP' },
{ numero: 5, vencimiento: '2026-02-05', monto: 1744.45, estado: 'pagada', fechaPago: '2026-02-03', medio: 'Transferencia Interbank' },
{ numero: 6, vencimiento: '2026-03-05', monto: 1744.45, estado: 'pagada', fechaPago: '2026-03-05', medio: 'Transferencia BCP' },
{ numero: 7, vencimiento: '2026-04-05', monto: 1744.45, estado: 'pagada', fechaPago: '2026-04-02', medio: 'Transferencia BCP' },
{ numero: 8, vencimiento: '2026-05-05', monto: 1744.45, estado: 'pagada', fechaPago: '2026-05-06', medio: 'Depósito en agencia' },
{ numero: 9, vencimiento: '2026-06-05', monto: 1744.45, estado: 'pagada', fechaPago: '2026-06-04', medio: 'Transferencia BCP' },
{ numero: 10, vencimiento: '2026-07-05', monto: 1744.45, estado: 'vencida', fechaPago: null, medio: null },
{ numero: 11, vencimiento: '2026-08-05', monto: 1744.45, estado: 'en_validacion', fechaPago: '2026-08-06', medio: 'Transferencia Interbank' },
{ numero: 12, vencimiento: '2026-09-05', monto: 1744.45, estado: 'pendiente', fechaPago: null, medio: null },
{ numero: 13, vencimiento: '2026-10-05', monto: 1744.45, estado: 'pendiente', fechaPago: null, medio: null },
{ numero: 14, vencimiento: '2026-11-05', monto: 1744.45, estado: 'pendiente', fechaPago: null, medio: null },
{ numero: 15, vencimiento: '2026-12-05', monto: 1744.45, estado: 'pendiente', fechaPago: null, medio: null },
{ numero: 16, vencimiento: '2027-01-05', monto: 1744.45, estado: 'pendiente', fechaPago: null, medio: null },
{ numero: 17, vencimiento: '2027-02-05', monto: 1744.45, estado: 'pendiente', fechaPago: null, medio: null },
{ numero: 18, vencimiento: '2027-03-05', monto: 1744.45, estado: 'pendiente', fechaPago: null, medio: null },
{ numero: 19, vencimiento: '2027-04-05', monto: 1744.45, estado: 'pendiente', fechaPago: null, medio: null },
{ numero: 20, vencimiento: '2027-05-05', monto: 1744.45, estado: 'pendiente', fechaPago: null, medio: null },
{ numero: 21, vencimiento: '2027-06-05', monto: 1744.45, estado: 'pendiente', fechaPago: null, medio: null },
{ numero: 22, vencimiento: '2027-07-05', monto: 1744.45, estado: 'pendiente', fechaPago: null, medio: null },
{ numero: 23, vencimiento: '2027-08-05', monto: 1744.45, estado: 'pendiente', fechaPago: null, medio: null },
{ numero: 24, vencimiento: '2027-09-05', monto: 1744.45, estado: 'pendiente', fechaPago: null, medio: null },
{ numero: 25, vencimiento: '2027-10-05', monto: 1744.45, estado: 'pendiente', fechaPago: null, medio: null },
{ numero: 26, vencimiento: '2027-11-05', monto: 1744.45, estado: 'pendiente', fechaPago: null, medio: null },
{ numero: 27, vencimiento: '2027-12-05', monto: 1744.45, estado: 'pendiente', fechaPago: null, medio: null },
{ numero: 28, vencimiento: '2028-01-05', monto: 1744.45, estado: 'pendiente', fechaPago: null, medio: null },
{ numero: 29, vencimiento: '2028-02-05', monto: 1744.45, estado: 'pendiente', fechaPago: null, medio: null },
{ numero: 30, vencimiento: '2028-03-05', monto: 1744.45, estado: 'pendiente', fechaPago: null, medio: null },
{ numero: 31, vencimiento: '2028-04-05', monto: 1744.45, estado: 'pendiente', fechaPago: null, medio: null },
{ numero: 32, vencimiento: '2028-05-05', monto: 1744.45, estado: 'pendiente', fechaPago: null, medio: null },
{ numero: 33, vencimiento: '2028-06-05', monto: 1744.45, estado: 'pendiente', fechaPago: null, medio: null },
{ numero: 34, vencimiento: '2028-07-05', monto: 1744.45, estado: 'pendiente', fechaPago: null, medio: null },
{ numero: 35, vencimiento: '2028-08-05', monto: 1744.45, estado: 'pendiente', fechaPago: null, medio: null },
{ numero: 36, vencimiento: '2028-09-05', monto: 1744.45, estado: 'pendiente', fechaPago: null, medio: null }];


export const pagos: Pago[] = [
{
  id: 'PG-004812',
  cuota: 11,
  fecha: '2026-08-06',
  monto: 1744.45,
  medio: 'Transferencia Interbank',
  operacion: '00871245',
  voucher: 'en_revision',
  motivoRechazo: null,
  archivo: 'voucher-cuota-11.pdf'
},
{
  id: 'PG-004655',
  cuota: 10,
  fecha: '2026-07-08',
  monto: 1744.45,
  medio: 'Depósito en agencia',
  operacion: '00863119',
  voucher: 'rechazado',
  motivoRechazo:
  'El monto del comprobante (S/ 1,044.45) no coincide con el importe de la cuota. Vuelve a registrar el pago adjuntando el voucher completo.',
  archivo: 'voucher-cuota-10.jpg'
},
{
  id: 'PG-004501',
  cuota: 9,
  fecha: '2026-06-04',
  monto: 1744.45,
  medio: 'Transferencia BCP',
  operacion: '00854702',
  voucher: 'validado',
  motivoRechazo: null,
  archivo: 'voucher-cuota-09.pdf'
},
{
  id: 'PG-004370',
  cuota: 8,
  fecha: '2026-05-06',
  monto: 1744.45,
  medio: 'Depósito en agencia',
  operacion: '00845913',
  voucher: 'validado',
  motivoRechazo: null,
  archivo: 'voucher-cuota-08.jpg'
},
{
  id: 'PG-004218',
  cuota: 7,
  fecha: '2026-04-02',
  monto: 1744.45,
  medio: 'Transferencia BCP',
  operacion: '00837480',
  voucher: 'validado',
  motivoRechazo: null,
  archivo: 'voucher-cuota-07.pdf'
}];


export const documentos: Documento[] = [
{
  id: 'DOC-1101',
  nombre: 'Contrato de compraventa — Mz. D Lote 14',
  tipo: 'Contrato',
  fecha: '2025-09-18',
  estado: 'firmado',
  peso: '1.8 MB'
},
{
  id: 'DOC-1102',
  nombre: 'Cronograma de pagos actualizado',
  tipo: 'Financiamiento',
  fecha: '2025-09-20',
  estado: 'disponible',
  peso: '420 KB'
},
{
  id: 'DOC-1103',
  nombre: 'Plano de ubicación del lote',
  tipo: 'Plano',
  fecha: '2025-09-20',
  estado: 'disponible',
  peso: '2.4 MB'
},
{
  id: 'DOC-1104',
  nombre: 'Estado de cuenta — Julio 2026',
  tipo: 'Estado de cuenta',
  fecha: '2026-08-01',
  estado: 'disponible',
  peso: '310 KB'
},
{
  id: 'DOC-1105',
  nombre: 'Adenda de reprogramación de cuota 10',
  tipo: 'Adenda',
  fecha: '2026-08-24',
  estado: 'pendiente_firma',
  peso: '640 KB'
}];


export const alertas: Alerta[] = [
{
  id: 'AL-1',
  nivel: 'critico',
  titulo: 'Voucher de la cuota 10 rechazado',
  detalle:
  'El monto del comprobante no coincide con el importe de la cuota. La cuota figura como vencida hasta que registres un nuevo pago.',
  accion: 'Registrar nuevo voucher',
  ruta: '/portal/pagos'
},
{
  id: 'AL-2',
  nivel: 'atencion',
  titulo: 'Cuota 12 por vencer',
  detalle:
  'Vence el 05 de setiembre de 2026 por S/ 1,744.45. Puedes pagarla desde hoy para evitar mora.',
  accion: 'Ver cronograma',
  ruta: '/portal/cronograma'
},
{
  id: 'AL-3',
  nivel: 'atencion',
  titulo: 'Pago de la cuota 11 en validación',
  detalle:
  'Recibimos tu comprobante el 06 de agosto. El área de cobranzas lo valida en un máximo de 48 horas hábiles.',
  accion: 'Ver pago',
  ruta: '/portal/pagos'
},
{
  id: 'AL-4',
  nivel: 'info',
  titulo: 'Nuevo documento disponible',
  detalle:
  'La adenda de reprogramación de la cuota 10 está lista para tu revisión y firma.',
  accion: 'Ir a documentos',
  ruta: '/portal/documentos'
},
{
  id: 'AL-5',
  nivel: 'info',
  titulo: 'Avance de obra Etapa II',
  detalle:
  'Las redes de agua y desagüe de la Mz. D fueron culminadas. Habilitación urbana al 78%.',
  accion: 'Ver mi lote',
  ruta: '/portal/lote'
}];


export const asesor: Asesor = {
  nombre: 'Claudia Ferreyra Núñez',
  cargo: 'Asesora comercial senior — Proyecto Valle Verde',
  telefono: '+51 954 218 770',
  correo: 'claudia.ferreyra@monolithe.pe',
  avatar: "/d03cdecb-7eed-4b81-b042-bb23c63e66f8.jpg",

  horario: 'Lunes a viernes, 9:00 a 18:00 · Sábados, 9:00 a 13:00',
  oficina: 'Oficina de ventas Valle Verde, Cieneguilla'
};

export const manzanaLotes = [
{ numero: '11', area: 150, estado: 'vendido' },
{ numero: '12', area: 150, estado: 'vendido' },
{ numero: '13', area: 156.25, estado: 'separado' },
{ numero: '14', area: 162.5, estado: 'cliente' },
{ numero: '15', area: 162.5, estado: 'disponible' },
{ numero: '16', area: 150, estado: 'vendido' },
{ numero: '17', area: 150, estado: 'disponible' },
{ numero: '18', area: 175, estado: 'vendido' },
{ numero: '19', area: 175, estado: 'separado' },
{ numero: '20', area: 168, estado: 'disponible' },
{ numero: '21', area: 168, estado: 'vendido' },
{ numero: '22', area: 180, estado: 'vendido' }];