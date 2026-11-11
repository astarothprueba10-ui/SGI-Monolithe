# SGI-MONOLITHE — Sprint 4 — 5.2.4 Saldos pendientes por cliente

## Reglas implementadas

El saldo del financiamiento se deriva de los **importes contractuales** y
las **aplicaciones activas de pagos CONFIRMADOS de tipo CUOTA**. La
marca `fecha_pago_completo`, el estado `PAGADA` y el voucher subido NO
constituyen por sí solos un abono contable.

- `saldoFinanciamiento = monto_total_financiado - SUM(aplicaciones CUOTA confirmadas)`.
- Cada cuota tiene su propio saldo: monto de cuota menos sus aplicaciones confirmadas.
- `monto_inicial` es la inicial **adicional** separada de
  `monto_reserva_aplicada`. No se descuenta la separación otra vez.
- `inicialSinAplicacionConfirmada = monto_inicial - SUM(aplicaciones
  INICIAL confirmadas)`. Es un **importe por conciliar**; en contratos
  históricos no se presupone automáticamente una deuda exigible porque
  pudieron existir pagos fuera del registro actual.
- Los pagos confirmados que no tienen aplicaciones activas se muestran
  como `pagosConfirmadosSinAplicar`. **No se descuentan** hasta ser imputados.
- Pagos `REGISTRADO` o `ANULADO`, y aplicaciones `activo=false`, no cuentan.
- Si un plan está `PENDIENTE`, el saldo futuro es una **proyección**, no
  cuotas exigibles. Los planes `ACTIVO` presentan el saldo contractual.
- Se preservan diferencias históricas: plan 3, venta 4,
  `diferenciaCronograma = S/ 0.04`. Sin ajustes automáticos.
- El saldo no es la clasificación de cuotas PENDIENTE/PARCIAL/VENCIDA
  (actividad 5.2.5); no se disparan alertas de cobro ni morosidad.

## Funciones PostgreSQL

Migración `76_financiamiento_saldo_cliente_confirmado_v1.sql`:
- `sp_crm_saldo_venta_v1(p_actor,p_venta)` valida
  `fn_crm_puede_consultar_venta_v1`, calcula totales, inicial,
  aplicaciones por cuota, dinero sin imputar y diferencias de contrato.
- `sp_crm_saldo_cliente_v1(p_actor,p_cliente)` agrega las **ventas
  financiadas del titular accesibles para ese actor**. Así, el asesor no
  consulta las operaciones del mismo cliente asignadas a otra cartera.

Ambas son `SECURITY DEFINER`, pero tienen guardia explícita de cartera,
`search_path` fijado y EXECUTE revocado a PUBLIC/anon/authenticated.
Solo `sigi_app_user` accede desde el Core Service autenticado.

## Backend y Backoffice

- GET `/api/core/crm/ventas/{idVenta}/saldo` — requires `sales.view`,
  obtiene actor del JWT; PostgreSQL comprueba acceso a esa venta.
- GET `/api/core/crm/clientes/{idCliente}/saldo` — requires `sales.view`;
  PostgreSQL filtra ventas financiadas del titular por cartera.
- `DetalleVentaAmpliadoPanel` muestra `SaldoFinancieroVentaPanel`,
  deja de usar como saldo real la suma de cuotas con `fecha_pago_completo`
  vacía y presenta importes conciliados y avisos históricos.
- No se usa `supabase.rpc` desde el navegador ni se expone una llave
  privilegiada a React.

## Migración de seguridad

`77_financiamiento_bloqueo_acceso_directo_v1.sql` elimina las
únicas dos políticas de lectura basadas en `user_metadata` para
`pag_planes_pago` y `pag_cuotas`. Revoca
SELECT/INSERT/UPDATE/DELETE directos para `anon` y `authenticated`
en dichas tablas. No modifica datos ni restringe el backend.
La migración se probó en PostgreSQL 17 efímero y se aplicó
a Supabase de testeo; se verificó que ambos roles públicos
carecen de SELECT y que `sigi_app_user` conserva ese permiso.

## Verificaciones y pruebas

GitHub Actions: pruebas SQL con datos sintéticos en PostgreSQL 17:
- Venta firmada: cuota de S/ 25,000, pago CONFIRMADO de S/ 175,
  aplicado S/ 100 a cuota y S/ 50 a inicial, S/ 25 sin imputar;
  saldo cuota S/ 24,900 y adicional por conciliar S/ 4,950.
- Pago REGISTRADO con aplicación de S/ 700: no reduce deuda.
- Aplicación inactiva / pago no confirmado: no reduce saldo.
- Sobreaplicación y acceso de actor sin cartera: se rechazan.
- Cliente con dos planes pendientes: agregado sin duplicación.
- Validación Java del método SQL seguro e identificadores inválidos.

Supabase de testeo:
- Migración 76 aplicada al mismo proyecto autorizado; no se borró,
  recalculó ni registró un contrato de producción.
- Venta 2: S/ 84,000 de saldo tras S/ 2,400 confirmados a cuotas.
- Venta 4: S/ 76,000, con S/ 0.04 histórico por conciliar.
- Venta 21: S/ 24,000 y S/ 500 confirmados a inicial.
- Venta 28: S/ 26,374.75 **proyectados**, contrato sin firma.
- Un abono parcial y su distribución entre dos cuotas se simularon
  en subtransacción y se **revirtieron**, sin dejar registros.

SQL de verificación:
`database/verification/76_financiamiento_saldos_cliente_readonly.sql`.

## Delimitación

La actividad 5.2.4 deja calculado el saldo financiero por venta y
cliente titular. La gestión de estados de cuotas, pagos en mora y reglas
para registrar, reprogramar o revertir aplicaciones pertenece a 5.2.5
y los bloques posteriores. Las políticas RLS históricas que utilizaban `user_metadata` en
`pag_planes_pago` y `pag_cuotas` fueron eliminadas mediante
`77_financiamiento_bloqueo_acceso_directo_v1.sql`.
Se revocaron sus privilegios directos a `anon` y `authenticated`,
manteniendo RLS activado y lectura para `sigi_app_user`.
El portal cliente deberá utilizar endpoints backend que verifiquen
titularidad; no se debe restablecer lectura directa mediante
`user_metadata`.

El código se conserva en
`feature/pagosy-financiamiento-sprint-4`. No fusionar con `main`
ni desplegar hasta completar el Sprint.
