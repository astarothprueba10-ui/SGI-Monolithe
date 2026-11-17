# SGI-MONOLITHE — Sprint 4 — 5.3.2 Registro y carga de vouchers de cuotas

## Alcance

Esta actividad implementa el **registro documental de un pago de cuota**
en estado `REGISTRADO` y su voucher en estado `PENDIENTE`.
**No confirma el pago, no imputa cuotas, no actualiza `fecha_pago_completo`
ni modifica el saldo.** La aprobación/rechazo corresponde al 5.3.3
y la distribución/aplicación confirmada al 5.3.4.

Se conservan íntegros los flujos de separaciones y los datos históricos.
Se continúa utilizando el bucket privado preexistente
`vouchers-ventas-private`, con 5 MiB como límite y formatos
PDF, JPEG, PNG o WebP.

## Flujo implementado

1. **Consulta de cuotas elegibles:** solo Finanzas con `finance.create`.
   Se listan cuotas de planes `ACTIVO` vigentes con contrato
   `VIGENTE` y firmado, excluyendo cuotas anuladas y saldos cero.
   El saldo se calcula con aplicaciones `CUOTA` activas de pagos
   `CONFIRMADO`, nunca con vouchers pendientes.
2. **Preparación:** se valida venta + cuota + actor + importe, moneda,
   método activo, fecha de operación, nombre/MIME/tamaño de archivo
   y saldo confirmado actual. Se registra una preautorización única
   en `pag_cargas_voucher_cuota` durante 30 minutos, vinculada a
   esos datos y a una clave privada generada del lado servidor.
3. **Carga:** el Core Service solicita a Supabase Storage una
   URL firmada para la clave validada; Backoffice envía el archivo
   mediante `uploadToSignedUrl`, sin exponer el service-role key.
   La URL nativa de carga de Supabase puede durar hasta dos horas,
   pero la preautorización para finalizar el registro se limita
   **a 30 minutos**.
4. **Finalización:** PostgreSQL verifica nuevamente el actor,
   plazo de la preautorización, venta/plan/cuota, saldo,
   existencia REAL del objeto privado, MIME y tamaño de Storage.
   Solo entonces, en la misma transacción:
   - inserta `pag_pagos` en estado `REGISTRADO`;
   - inserta `pag_vouchers` en estado `PENDIENTE`;
   - vincula ambas filas y la cuota propuesta a
     `pag_cargas_voucher_cuota`.
   - **No crea ninguna fila** en `pag_aplicaciones_pago`.
5. **Reintento:** un segundo registro de la misma `idCarga`
   devuelve los ID originales, protegido por `FOR UPDATE`.
   El número de operación, cuando se suministra, se contrasta
   con pagos no anulados en la misma venta y medio de pago.
   Un advisory lock de transacción serializa intentos concurrentes
   del mismo número de operación.
6. **Consulta:** la nueva fila aparece automáticamente en la bandeja
   de vouchers del 5.3.1, con importe real y estado pendiente.
   La cuota y la cartera siguen sin cambios hasta la aprobación.

Los intentos vencidos que no llegaron a registrarse quedan como
trazabilidad documental. Una política de limpieza controlada de
objetos huérfanos se abordará en el cierre y conciliación del 5.3.

## Seguridad

- Se creó `pag_cargas_voucher_cuota` con claves foráneas,
  restricciones, referencias a actor y cuota, e **RLS habilitado**.
  No concede acceso directo a `anon`, `authenticated`
  ni a `sigi_app_user` para leer o escribir esta tabla.
- `fn_fin_saldo_cuota_confirmado_v1` es una función auxiliar,
  sin permiso directo de ejecución para el rol de aplicación.
- Las operaciones `sp_fin_opciones_registro_cuota_v1`,
  `sp_fin_preparar_carga_voucher_cuota_v1` y
  `sp_fin_registrar_voucher_cuota_pendiente_v1`
  usan `SECURITY DEFINER`, un `search_path` limitado y
  vuelven a exigir `finance.create` para el actor JWT.
- Toda preparación está vinculada a usuario, venta, plan,
  cuota, importe y archivo; no se acepta una ruta elegida
  por el navegador durante la finalización.
- No se publica la URL permanente del archivo ni se modifica
  la revisión de reservas existente.
- La presencia, MIME y tamaño en Storage no suponen haber
  validado el **contenido bancario**, la autenticidad o un hash
  criptográfico. Esas comprobaciones operativas se harán
  en el bloque de aprobación.

## Integración

**Migración:** `database/migrations/85_registro_voucher_cuotas_pendientes_v1.sql`.

**Core Service:**
- `GET /api/core/crm/finanzas/vouchers/cuotas/opciones`
- `POST /api/core/crm/finanzas/vouchers/cuotas/preparar-carga`
- `POST /api/core/crm/finanzas/vouchers/cuotas/registrar`

Los tres endpoints requieren JWT con permiso `finance.create`;
las funciones SQL verifican de nuevo dicho permiso.
Las respuestas no se almacenan en caché.

**Backoffice:** `NuevoVoucherCuotaModal.tsx`, accesible desde
`VouchersCuotasPanel.tsx` para roles con `finance.create`.
Incluye búsqueda de venta/cuota, saldo real, abonos parciales,
fecha/método/referencia, validación del archivo, carga
firmada y reintento sin duplicación si el registro falla
después de subir el archivo. Los mensajes distinguen
registro documental y confirmación bancaria.

## Pruebas

**Supabase de testeo:**
- La migración 85 se aplicó correctamente.
- Una prueba SQL transaccional sobre la venta 4/cuota 73
  registró un abono ficticio de S/ 100 con voucher pendiente;
  verificó reintento idempotente y ninguna aplicación
  contable; la subtransacción se revirtió.
- Después de la prueba siguen existiendo **6 pagos,
  6 vouchers, 3 aplicaciones, 84 cuotas y 0 cargas de cuota
  nuevas persistidas**. No hay archivos ficticios nuevos.
- La consulta de opciones devuelve **83 cuotas con saldo**
  en los planes activos (incluye la cuota 73, excluye
  la cuota 37 totalmente cancelada y el plan 14 sin firma).
- Los permisos del rol app/anon/authenticated y los
  asesores de seguridad se revisaron; se mantienen
  sin ejecuciones directas privilegiadas desde el navegador.

**CI PostgreSQL 17:**
- Fixtures sintéticas: archivo inexistente, MIME y tamaño
  inconsistentes, usuario distinto al autorizador, importe
  excesivo, venta-cuota no correspondiente, fecha futura,
  número de operación duplicado, registro idempotente,
  pagos/aplicaciones intactos y funciones cerradas al público.
- Las pruebas Java validan el control de los parámetros
  y la llamada a procedimientos protegidos.
- La compilación final de la rama **se reportará como aprobada
  únicamente cuando GitHub Actions termine con éxito**.

## Fuera del alcance

No hay aprobación de vouchers, rechazo con motivo,
reversión de pagos, abono a inicial ni imputación
contable. Estos procedimientos se desarrollarán en
5.3.3 y 5.3.4; la conciliación, limpieza de objetos
huérfanos y pruebas integrales corresponden a 5.3.5.

**Rama exclusiva:** `feature/pagosy-financiamiento-sprint-4`.
No fusionar con `main` ni desplegar hasta el cierre
y pruebas integrales.
