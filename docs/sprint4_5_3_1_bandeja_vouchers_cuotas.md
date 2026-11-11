# SGI-MONOLITHE · Sprint 4 · 5.3 Gestión de vouchers y comprobantes

## Auditoría previa a modificar datos
Base Supabase de TESTEO autorizada, noviembre 2026:
- `pag_pagos`: 6 filas.
- `pag_vouchers`: 6 filas.
- `pag_aplicaciones_pago`: 3 filas.
- `pag_cuotas`: 84 filas.
- Buckets `vouchers-separacion-private` y `vouchers-ventas-private`
  privados, límite 5 MiB y MIME PDF/JPEG/PNG/WebP.
- La revisión de separaciones `sp_finanzas_revisar_voucher_separacion_v1`
  ya funciona con permiso `finance.edit` y valida la existencia del archivo.
  Se conserva este flujo sin cambios.
- Los procedimientos antiguos `sp_registrar_pago_voucher` y
  `sp_validar_voucher` usan IDs numéricos de estados, pueden elegir
  un usuario distinto al actor autenticado, y `sp_validar_voucher`
  marca la primera cuota impaga como PAGADA sin conciliar el importe
  recibido. **No reutilizarlos**.
- El procedimiento antiguo `sp_listar_vouchers_tesoreria` no
  acepta actor ni limita el acceso por cartera/permisos: se reemplaza.
- El voucher de cuotas histórico `VOU-2026-0001` tiene una referencia
  de archivo antigua y no se encuentra en el bucket privado
  `vouchers-ventas-private`. Se mantiene su registro sin alteraciones
  y se señala en la bandeja como «Requiere conciliación». No se
  falsifica un documento ni se permite una URL de lectura inexistente.
- Los dos archivos observados en el bucket de ventas no corresponden
  a ese voucher histórico. No se reasignan por suposición.

## 5.3.1 — Bandeja real y lectura segura

Migración `84_vouchers_cuotas_bandeja_segura_v1.sql`:
- `sp_finanzas_listar_vouchers_cuotas_v1`: listado paginado de
  vouchers de pagos con `id_reserva IS NULL`,
  `id_venta IS NOT NULL` e `id_plan_pago IS NOT NULL`, separando
  comprobantes de cuotas de separaciones.
- Requiere `finance.view`, valida estado, búsqueda y paginación.
- Incluye pago, venta, titular, monto y estados; **no expone
  `clave_archivo` ni permite lectura directa del bucket**.
- `archivo_disponible` indica una referencia al bucket autorizado,
  con ruta canónica, metadatos MIME válidos, archivo no archivado
  y tamaño de 1 a 5 MiB. No afirma validación de contenido o de hash.
- `sp_finanzas_obtener_ruta_voucher_cuota_v1` verifica nuevamente
  permiso, contexto de la venta y objeto real antes de devolver
  la referencia exclusivamente al backend.
- Se revoca EXECUTE al usuario de aplicación de las tres funciones
  legadas (registro, validación y listado general), pero se
  conservan sus definiciones y todos los datos históricos.
- Las dos nuevas RPC tienen `SECURITY DEFINER` con
  `search_path` seguro y EXECUTE exclusivo del rol `sigi_app_user`.

Core Service:
- GET `/api/core/crm/finanzas/vouchers/cuotas`: solo `finance.view`,
  pasa actor JWT a SQL y no cachea resultados.
- GET `/api/core/crm/finanzas/vouchers/cuotas/{idVoucher}/url-firmada`:
  autoriza en SQL y emite una URL efímera únicamente para un archivo
  presente en el bucket privado de ventas.
- Ningún método de esta actividad aprueba o registra pagos.

Backoffice:
- `VouchersCuotasPanel.tsx`: bandeja en Finanzas y Financiamiento
  para usuarios autorizados, filtros, paginación y evidencia de archivo
  disponible o pendiente de conciliación.
- Se elimina la lista ficticia de vouchers y la afirmación
  inventada de «SHA-256 Validado» de `Financing.tsx`.
- Se conserva el panel existente de separaciones, con su lógica
  correcta de aprobar/rechazar.

## Pruebas
- PostgreSQL 17 CI con fixtures sintéticas: archivo válido, ruta
  antigua ausente, separación excluida, filtros, paginación,
  control de acceso, URL de lectura privada y revocaciones.
- Pruebas Java: permisos backend, consultas versionadas e IDs inválidos.
- Supabase de testeo: auditoría de datos existentes y verificación
  posterior a migración, sin modificar pagos, cuotas ni vouchers.

## Siguientes subactividades propuestas
- **5.3.2**: registro y carga de nuevos vouchers de cuotas,
  comprobación de archivo privado y metadatos.
- **5.3.3**: revisión por Finanzas, aprobación o rechazo con motivo,
  concurrencia e idempotencia; sin marcar cuotas PAGADAS automáticamente.
- **5.3.4**: aplicación confirmada a inicial y cuotas, abonos parciales,
  sobrepagos, pagos sin imputar y reversión auditada.
- **5.3.5**: conciliación de Tesorería, auditoría, pruebas integrales
  de estados y flujo en Backoffice/Portal.

Las subactividades anteriores son el plan de ejecución propuesto
para el resto del 5.3, no desarrollo ya completado.

Rama activa `feature/pagosy-financiamiento-sprint-4`;
no fusionar con `main`, no desplegar las aplicaciones hasta
finalizar pruebas integrales.
