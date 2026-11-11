# SGI-MONOLITHE · Sprint 4 / 5.2.5 · Estados de cuotas

## Objetivo

Presentar los estados de cada cuota con base en **pagos confirmados
y aplicaciones vigentes** más la fecha de vencimiento en **America/Lima**.
No se requiere duplicar estados ni cambiar tablas. No se modifica
automáticamente ningún contrato histórico.

## Reglas de clasificación

Se utiliza `fn_crm_clasificar_cuota_v1`, con importes en dos decimales:

| Condición | Estado operativo |
|---|---|
| Cuota anulada previamente | ANULADA |
| Saldo de cuota = 0 | PAGADA |
| Abono confirmado mayor que 0, saldo > 0 | PARCIAL |
| Abono = 0, saldo > 0, venció antes de hoy | VENCIDA |
| Abono = 0, saldo > 0, no ha vencido | PENDIENTE |

La prioridad es relevante: **PARCIAL vencida sigue siendo PARCIAL**,
pero muestra `cuotaAtrasada=true` y `diasMora>0`.
La cuota al día exacto de vencimiento todavía no está vencida.
`proxima7Dias=true` identifica cuotas no pagadas que vencen
entre hoy y siete días naturales, inclusive. El día 8 no se incluye.

`estadoCalculado` (para operación) es diferente de
`estadoRegistrado` (auditoría); diferencias se muestran como advertencia.
Una cuota registrada PAGADA sin aplicaciones confirmadas completas NO
se considera cancelada. Se evita así la lógica insegura del procedimiento
histórico `sp_validar_voucher`.

## Datos y seguridad

- `sp_crm_cronograma_venta_v4`: verifica permisos por venta mediante
  `sp_crm_cronograma_venta_v3`, obtiene aplicaciones confirmadas de
  `sp_crm_saldo_venta_v1`, fusiona importes y estados calculados
  sin cambiar `pag_cuotas`.
- Solo los planes con cronograma REGISTRADO y estado ACTIVO/COMPLETADO
  reciben clasificación operativa.
- Para plan PENDIENTE: se conservan las proyecciones, sin cuotas exigibles
  ni vencimientos operativos.
- Planes ANULADO/RESUELTO: se muestra el historial sin generar mora
  nueva (`HISTORICO_NO_EXIGIBLE`). Migración de compatibilidad 80.
- Cualquier acceso no autorizado se bloquea desde el controlador JWT,
  más una segunda validación de cartera en PostgreSQL.
- Funciones financieras no ejecutables por `anon`/`authenticated`,
  disponibles solo para `sigi_app_user` a través del Core Service.

## Integración

- Migración `79_financiamiento_estados_cuotas_confirmadas_v1.sql`:
  función de clasificación y nuevo cronograma seguro V4.
- Migración `80_financiamiento_cronograma_planes_cerrados_v1.sql`:
  preservación de lectura de planes históricos cerrados.
- Core Service utiliza la función `sp_crm_cronograma_venta_v4`
  en la misma ruta segura GET `/api/core/crm/ventas/{idVenta}/cronograma`.
- `CronogramaVentaPanel.tsx` y PDF muestran estado calculado,
  cuota abonada, saldo, atraso y resumen de vencidas/próximas.
  Si el estado histórico es diferente, se notifica sin alterar datos.
- No se emite una actualización masiva a `id_estado_cuota`:
  se recalcula el estado al consultar para reflejar cambios en pagos
  y vencimientos incluso cuando todavía no corra una tarea programada.

## Pruebas

- PostgreSQL 17 efímero en CI: pendientes, parciales, pagadas, vencidas,
  anuladas, mora, fronteras de fechas, proyecciones, planes cerrados,
  rechazo de sobrepago y control por cartera.
- Supabase de testeo: 84 cuotas registradas en planes 2, 3 y 9;
  el plan 14 no tiene cuotas exigibles. La clasificación al
  11/11/2026 dio 1 PAGADA y 83 PENDIENTE, sin cuotas vencidas;
  la venta 4 tiene una cuota próxima a vencer (16/11/2026).
- Se realizaron dos pruebas transaccionales sobre la cuota 37:
  abono parcial confirmado y conversión de pago a REGISTRADO;
  ambas se revirtieron. No se cambió la evidencia ni el historial
  de cuotas existente.
- SQL de verificación: `database/verification/79_estados_cuotas_confirmadas_readonly.sql`.

## Fuera de alcance

- Registrar, aprobar, revertir o redistribuir pagos: flujo de comprobantes
  y operaciones del 5.3.
- Alertas programadas, notificaciones y la cláusula de tres cuotas
  consecutivas: 5.2.6 y 5.2.7.
- No se calcula automáticamente penalidad, interés moratorio,
  reprogramación ni feriados: requieren una política comercial separada.

Conservar `feature/pagosy-financiamiento-sprint-4` sin merge a `main`
y sin desplegar aplicaciones hasta terminar el Sprint 4.
