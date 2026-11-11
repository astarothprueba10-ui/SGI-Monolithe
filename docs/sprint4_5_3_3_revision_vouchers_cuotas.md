# SGI-MONOLITHE — Sprint 4 — 5.3.3 Revisión de vouchers de cuotas

## Alcance y decisión

El flujo de carga 5.3.2 registra `pag_pagos.REGISTRADO` y
`pag_vouchers.PENDIENTE`. El 5.3.3 decide sobre esa documentación,
**sin modificar estados de cuotas ni crear aplicaciones contables**.

| Acción del revisor | Voucher | Pago | Imputaciones |
|---|---|---|---|
| Aprobar | APROBADO | CONFIRMADO | Ninguna (5.3.4) |
| Rechazar (motivo obligatorio) | RECHAZADO | ANULADO | Ninguna |

La aprobación requiere que Finanzas **verifique el ingreso bancario
en la realidad**. El backend verifica únicamente la integridad
referencial, existencia y metadatos del archivo en Storage; **no
autentica por sí solo el contenido del comprobante**.

## Reglas y seguridad

- `finance.view` **y** `finance.edit` en JWT y en SQL.
- Solo admite vouchers **PENDIENTES** creados por el flujo 5.3.2,
  vinculados mediante `pag_cargas_voucher_cuota`.
  Los vouchers de separaciones y los documentos históricos
  quedan excluidos.
- **Segregación de funciones:** el actor que registró el voucher
  o pago no puede aprobarlo ni rechazarlo.
- Rechazo: motivo entre 5 y 255 caracteres, observaciones opcionales
  de hasta 500. Permite rechazar si el archivo falta o es inconsistente.
- Aprobación: el plan debe permanecer ACTIVO y vigente y el contrato
  VIGENTE firmado; no se acepta una cuota anulada.
- Los metadatos y la referencia de archivo de `pag_vouchers` deben
  coincidir con la preautorización y el objeto físico de
  `vouchers-ventas-private`. MIME y tamaño deben corresponder;
  no se admite un objeto archivado o borrado.
- El monto de pagos **confirmados aún no aplicados** con destino
  a la misma cuota se reserva para evitar que dos vouchers
  simultáneos sobreconfirmen la deuda. La cuota se bloquea
  durante la revisión para serializar revisores.
- Si ya existen aplicaciones activas para ese pago antes de
  aprobar/rechazar, se rechaza la revisión por inconsistencia.
- Una decisión **es inmutable**. Reintentar exactamente la misma
  acción con el mismo revisor, motivo y observaciones devuelve
  el ID anterior sin duplicar escrituras; cualquier decisión
  diferente provoca conflicto.
- Aprobaciones y rechazos actualizan los campos existentes de
  `pag_vouchers` y `pag_pagos`, con usuario y fecha de revisión,
  confirmación/anulación y motivo según corresponda.
- La tabla `pag_vouchers_cuota_revisiones` guarda **una decisión
  por voucher** con usuario, fecha, monto, saldo al revisar, motivo
  y observaciones. Tiene RLS habilitado, sin acceso directo para
  roles públicos ni `sigi_app_user`; el único acceso de escritura
  es desde la función autorizada.
- **Nunca actualiza `pag_cuotas` o `pag_aplicaciones_pago`**, ni
  declara resuelto el contrato.

## Integración

Migración `database/migrations/86_finanzas_revision_voucher_cuota_v1.sql`.

- SQL `sp_finanzas_revisar_voucher_cuota_v1(actor,voucher,aprobar,motivo,observaciones)`.
- Core Service:
  `PUT /api/core/crm/finanzas/vouchers/cuotas/{idVoucher}/decision`.
  Actor exclusivamente desde JWT, validación del DTO y
  respuesta `Cache-Control: no-store`.
- Backoffice: desde **Finanzas → Vouchers de cuotas**,
  usuarios `finance.edit` pueden aprobar o rechazar vouchers
  pendientes. El modal presenta monto, venta, titular,
  referencia y archivo. Exige confirmación explícita de
  revisión antes de aprobar y razón documentada para rechazar.
  La bandeja se actualiza al guardar.

## Verificación

Supabase original de testeo, 11/11/2026:
- Migración 86 aplicada correctamente.
- Prueba SQL real con comprobantes **sintéticos** en transacción
  reversible: actor 5 registra y 15 revisa, autoaprobación denegada,
  pago pasa a CONFIRMADO, voucher a APROBADO, reintento idempotente,
  decisión incompatible bloqueada.
- Otro voucher con MIME incongruente no pudo aprobarse;
  se rechazó con motivo y pago pasó a ANULADO.
- Segunda aprobación sobre la misma cuota que superaría
  el saldo disponible fue rechazada.
- Se comprobó que `pag_aplicaciones_pago` **no creció** y que
  el saldo confirmado de la cuota 73 **no cambió**.
- Se respetó la prohibición del API de Storage de eliminar
  objetos mediante SQL; la prueba de objeto inconsistente
  se realizó modificando metadatos del voucher de prueba,
  **sin borrar archivos físicos**.
- Todas las operaciones temporales y archivos ficticios de
  la prueba fueron revertidos.

CI PostgreSQL 17:
- Pruebas sintéticas de aprobación/rechazo, segregación de
  revisor, doble decisión, metadatos, saldo reservado,
  motivos, idempotencia, auditoría y permisos directos.
- Pruebas unitarias Java y compilación TypeScript de la
  pantalla. **El estado de GitHub Actions debe confirmarse
  antes de declarar la actividad 100 % validada.**
- Corregido el fixture heredado 5.3.2 que tenía
  `id_voucher` nulos en registros sintéticos previos
  al alta de la columna; se asignaron identificadores
  **solo dentro de CI**, sin tocar vouchers históricos reales.

## Fuera de alcance

5.3.4: aplicar dinero confirmado a cuotas o inicial,
manejar abonos parciales, excedentes, compensaciones,
reversiones y conciliación de saldos.

5.3.5: conciliación operativa de Tesorería, pruebas
integrales de interfaz y limpieza controlada de
cargas/archivos huérfanos.

Rama `feature/pagosy-financiamiento-sprint-4`,
sin fusión con `main`, sin publicación de PR
y sin despliegue de aplicaciones.
