# SGI-MONOLITHE · Sprint 4 · 5.2.7
## Detección de tres cuotas consecutivas vencidas e impagas

**Estado:** implementado y probado en rama
`feature/pagosy-financiamiento-sprint-4`; sin fusión ni despliegue de aplicaciones.

### Alcance

El procedimiento anterior, `sp_evaluar_clausula_resolutoria`,
devolvía `clausula_aplicable=true` cuando existían tres cuotas vencidas
**cualesquiera**, aunque no fueran consecutivas. Además, sumaba
`monto_cuota` completo, sin considerar abonos confirmados, y
no recibía el actor para validar la cartera. **No utilizarlo** para
evaluar posibles causales.

La versión 5.2.7 produce exclusivamente una **alerta para revisión
administrativa y jurídica**. No determina que el contrato ya pueda
resolverse, no modifica estados, no presenta botones de resolución
y no envía comunicaciones. Es necesario verificar la redacción
contractual, pagos, requerimientos y demás condiciones legales
antes de adoptar decisiones.

### Regla técnica implementada

- Tres o más cuotas de **numeración consecutiva** dentro del mismo
  plan vigente; no bastan tres cuotas impagas aisladas.
- Todas las cuotas de la secuencia deben tener **vencimiento anterior**
  a la fecha local de Perú (`America/Lima`) y **saldo > 0** según
  aplicaciones activas de pagos `CONFIRMADO` tipo `CUOTA`.
- Las cuotas `PARCIAL` vencidas con saldo se cuentan, con el
  saldo real pendiente, no el valor original.
- Una cuota `PAGADA` por aplicaciones confirmadas, `ANULADA` o
  aún no vencida corta la serie. El día de vencimiento no es mora.
- Solo planes `ACTIVO` y `es_vigente=true`, cronogramas completos
  (`COUNT(cuotas)=numero_cuotas`), con un contrato
  `VIGENTE` y `fecha_firma IS NOT NULL`.
  Excluye contratos sin firma, anulados, resueltos, planes históricos
  no vigentes o cronogramas incompletos.
- Si un plan tiene varias rachas independientes, se muestra **una
  revisión por plan**, escogiendo la más larga; ante empate, la
  terminada en la cuota más reciente. Se detallan todas sus cuotas.
- La diferencia histórica de S/ 0.04 permanece intacta y no
  impide detectar impagos por saldo; no se recalculan cuotas históricas.

### Migración y seguridad

`database/migrations/83_financiamiento_revision_tres_cuotas_consecutivas_v1.sql`

- `fn_fin_rachas_impagas_v1(fecha_corte)`:
  agrupación por la diferencia entre número de cuota y
  `row_number()` sobre las **cuotas vencidas con saldo**. Es
  una rutina interna **sin acceso directo**, incluso para
  `sigi_app_user`; solo la ejecuta el propietario SQL.
- `sp_fin_alertas_resolutoria_v1(actor,pagina,tamano)`:
  respuesta paginada y `SECURITY DEFINER`, con `search_path`
  seguro. Requiere simultáneamente `sales.view` y al menos uno
  de `sales.legal.review`, `sales.annul`,
  `financing.approve`. Cada venta se vuelve a filtrar mediante
  `fn_crm_puede_consultar_venta_v1`.
- Solo `sigi_app_user` dispone de EXECUTE del procedimiento
  autorizado; `PUBLIC`, `anon`, `authenticated` no tienen
  EXECUTE. No hay nuevas tablas ni modificaciones de saldos.
- Core Service expone GET
  `/api/core/crm/financiamiento/clausula-resolutoria/revision`
  con controles JWT idénticos a los SQL y `CacheControl.noStore()`.
  No hay endpoint para resolver o anular contratos.

### Backoffice

`RevisionClausulaPanel.tsx` se presenta en Financiamiento,
solo a perfiles autorizados:
- Total de expedientes con posible causal y monto pendiente
  de las secuencias.
- Contrato y comprador autorizado; rango de números consecutivos,
  fechas, saldo de la racha y detalle por cuota (importe,
  abono confirmado, saldo y vencimiento).
- Paginación y actualización sin escrituras.
- Mensaje destacado: **alerta para revisión, no resolución
  automática ni declaración de procedencia jurídica**.

La página ya no utiliza la evaluación obsoleta ni sus alertas demo.

### Verificación

**GitHub Actions (PostgreSQL 17 efímero):**
- Tres consecutivas vencidas, incluida una con pago parcial: detectadas.
- Tres impagos no consecutivos: descartados.
- Cuota intermedia pagada o anulada: corta la serie.
- Pago `REGISTRADO` o aplicación inactiva: NO resta el saldo.
- Tercera cuota cuyo vencimiento es HOY: sin alerta; al día
  siguiente sí se detecta.
- Plan pendiente de firma, anulado, no vigente, cronograma
  incompleto o contrato resuelto: sin alerta.
- Racha de cuatro; dos series de tres en un mismo plan y selección
  de la más reciente; paginación y roles sin autorización.
- Rutina interna no accesible por backend directamente; único
  endpoint SQL autorizado; no se crean notificaciones ni se
  modifican contratos.

**Supabase original de testeo:**
- Migración 83 aplicada.
- El 11/11/2026, **0 expedientes** con tres cuotas consecutivas
  vencidas e impagas.
- Prueba reversible sobre las cuotas 1,2,3 del plan 3 (venta 4):
  al modificar transaccionalmente sus vencimientos al pasado
  se detectó una racha de tres por el importe exacto; cuando
  la cuota 2 tuvo vencimiento igual a hoy, desapareció la señal.
  **Toda la prueba fue revertida**, preservando los datos reales.
- `pag_cuotas`: 84 filas, plan 14 pendiente con 0 filas;
  ninguna notificación financiera persistida, ningún envío creado.

SQL de verificación de solo lectura:
`database/verification/83_resolutoria_tres_consecutivas_readonly.sql`.

### Límites y siguientes actividades

La existencia de la secuencia es un criterio técnico para
priorizar revisión, NO prueba jurídica automática de causal.
La decisión y su eventual procedimiento requerirán validación
legal/comercial, registro de evidencias, notificaciones formales
y permisos independientes en un flujo posterior.

El bloque 5.3 implementará comprobantes y conciliación de cobros;
5.4 integrará el Portal Cliente. No activar automáticamente
alertas externas o acciones sobre contratos en este bloque.
