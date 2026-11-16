# Sprint 4 — Reorganización funcional de Financiamiento y Finanzas (migraciones 102–103)

**Rama:** `feature/pagosy-financiamiento-sprint-4`  
**Ambiente SQL:** Supabase TEST `cjwnnroqjltoaqzpxlmh`.  
**Alcance:** Backoffice local en Docker. No merge, PR, despliegue ni operaciones financieras persistentes de QA.

## Problema encontrado

La página `Finance.tsx` mostraba movimientos, ingresos, egresos, cartera por cobrar y gráfico con constantes de `src/data/finance.ts` y `src/data/financing.ts`. No eran pagos ni cuentas de Supabase.
La página `Financing.tsx` mezclaba `INSTALLMENTS` y `FINANCING_PLANS` de demostración con `financingService.getInstallments(2)` (ID fijo y titular fijo). Además, la bandeja de vouchers estaba duplicada en Finanzas y Financiamiento.

## Estructura nueva

### Financiamiento y pagos (`/financiamiento`)
- `CarteraFinanciamientoPanel`: planes por venta, comprador, proyecto, lote, cuota inicial, capital y saldo. Pestaña de cronogramas con cuotas y estados operativos.
- Cuentas por cobrar como parte de la cartera financiera, no como una tabla de ejemplo en Finanzas.
- Alertas reales a siete días y vencidas (`AlertasCuotasPanel`), y revisión de tres cuotas consecutivas (`RevisionClausulaPanel`).
- No muestra como **exigible** un plan pendiente de firma. Las diferencias de inicial por conciliar NO se convierten automáticamente en mora.
- No se recálculan contratos ni importes desde React; usa `sp_crm_saldo_venta_v1` y `sp_crm_cronograma_venta_v4`.

### Finanzas (`/finanzas`)
- Movimientos reales de `pag_pagos`, con código, estado, referencia, importe, voucher y aplicaciones activas.
- Indicadores reales de pagos `CONFIRMADO`, `REGISTRADO`, aplicaciones y confirmado sin imputar a financiamiento.
- Histograma de **pagos confirmados**, no ingresos menos egresos ni resultado contable completo.
- Conserva: `VouchersCuotasPanel` (CUOTA e INICIAL), `SeparacionVouchersPanel`, `AplicacionesPagosPanel`, `ConciliacionIntegralPanel`, `ConciliacionesSeparacionPanel`.
- Retira `Nuevo movimiento` y `Exportar` de la cabecera hasta disponer de flujo respaldado por datos y permisos; no crea asientos ficticios.
- No muestra `RECEIVABLES` de demostración.
- No presenta la aprobación de un voucher como abono a una cuota: solo las **aplicaciones confirmadas** reducen el saldo.

## Arquitectura

- Migración 102: `sp_fin_cartera_backoffice_v1(actor,vista,busqueda,pagina,tamano)`, `sp_fin_movimientos_backoffice_v1(actor,busqueda,pagina,tamano)`.
- Migración 103: al buscar por código de venta, el total de movimientos y las filas paginadas usan el mismo criterio; etiquetas de mes numéricas.
- Core Service: `GET /api/core/crm/financiamiento/cartera` (JWT, `financing.view` + `sales.view`) y `GET /api/core/crm/finanzas/movimientos` (`finance.view`); actor únicamente del JWT, respuestas `no-store`.
- SQL: validez de actor y permisos, `fn_crm_puede_consultar_venta_v1` para planes, búsqueda limitada, paginación de 1 a 100, `SECURITY DEFINER` con `search_path` fijo y revocación de `EXECUTE` a `PUBLIC/anon/authenticated`. Solo `sigi_app_user` invoca desde Core Service.
- Backoffice: `crmBackend.ts` tipa y consulta ambos endpoints. Ninguna de las pantallas nuevas llama a Supabase directamente.

## Pruebas ejecutadas (solo lectura)

Supabase TEST devuelve **5 planes** (uno aún pendiente de firma) y **96 cuotas exigibles**; **6 pagos registrados** en Finanzas. Estos son valores cambiantes, no fixtures obligatorios.

Contraste de venta `VTA-PND-2026-000030` con Portal Cliente:
- capital: S/ 25,000;
- inicial por conciliar: S/ 5,000;
- total/saldo de 12 cuotas: S/ 26,374.75;
- fecha primera cuota: 2026-12-14;
- pago aplicado a cuota: S/ 0.
Coincide con `sp_crm_saldo_venta_v1(5,30)` y `sp_crm_cronograma_venta_v4(5,30)`.
- Búsqueda por venta devuelve el mismo número de registros en `total` y `items`.
- Permisos públicos de las dos funciones: `anon=false`, `authenticated=false`.
- CI: `apps/backoffice/tests/finanzasReales.test.mjs` detecta regresiones de mocks, endpoints, controles y permisos. GitHub Actions comprueba frontend, backend y SQL financiero.

## QA funcional manual requerida (localhost)

1. Actualizar rama y reconstruir `core-service` y `backoffice` (Portal Cliente no necesita rebuild).
2. Con Gerencia, abrir `/financiamiento`; comprobar los **5 planes** y **96 cuotas** como referencia de la fecha del análisis. Buscar `VTA-PND-2026-000030` y verificar 12 cuotas.
3. Confirmar que un plan pendiente de firma **no** entra en cuentas por cobrar exigibles ni en la pestaña de cuotas.
4. Abrir `/finanzas` y confirmar que movimientos presentan **códigos reales de pago**, no clientes ficticios; el histograma de confirmados coincide con la suma de pagos confirmados por mes.
5. Buscar por código de pago y por código de venta, comprobar la paginación.
6. Confirmar que las bandejas de vouchers están solamente en Finanzas, que el revisor es otro usuario que quien registró, y que la aprobación no reduce saldos.
7. Con un expediente **sintético** y autorización de TEST, presentar un voucher real desde Portal, aprobarlo en Finanzas y aplicar el pago. Verificar que la cuota baja exactamente el importe aplicado y que ambos módulos coinciden.
8. Comprobar reversión autorizada y saldo restaurado; validar permisos de `finance.view` y `financing.view` y acceso denegado a perfiles CLIENTE.
9. Registrar captura y cualquier inconsistencia antes de corregirla.

## Pendiente fuera del Sprint 4

No hay libro contable completo con gastos, conciliación bancaria automática ni contabilidad general; **NO** inventar ingresos/egresos para llenar indicadores. Las operaciones financieras y sus procedimientos siguen siendo el alcance de 5.3. El sistema de alertas no envía SMS ni correo salvo un proceso autorizado aparte. Requiere QA de navegador y autenticación real antes de habilitar despliegue.

## Ajustes UX posteriores — alertas en pestaña y campana real

- Se elimina la nota azul `Cartera real · saldos provenientes de pagos aplicados` de `/financiamiento`, sin cambiar las reglas financieras del backend.
- En `CarteraFinanciamientoPanel`, tercera pestaña **Alertas de cuotas Vencidas** junto a **Cronograma de cuotas**. Incluye tanto el panel `AlertasCuotasPanel` (vencidas y próximas a vencer en siete días) como `RevisionClausulaPanel` (revisión contractual de tres cuotas consecutivas). Las otras pestañas no muestran estas secciones repetidas.
- Deep link a la pestaña: `/financiamiento?tab=alertas`.
- La campana del Backoffice deja de usar **todos** los avisos estáticos de `src/data/notifications.ts` (los 7 mensajes anteriores eran demostrativos). Únicamente muestra alertas **reales** de cuotas vigentes en la cartera visible por el actor autorizado: `crmBackend.listarAlertasCuotas`, `GET /api/core/crm/financiamiento/alertas`.
- Requisitos de usuario para la campana financiera: permisos `financing.view` y `sales.view`. La consulta Core deriva el actor del JWT y el procedimiento SQL limita las ventas; no entrega alertas de otros clientes o asesores fuera de cartera.
- La campana consulta todas las páginas de alertas (100 por página, hasta cuatro solicitudes concurrentes), carga al iniciar, actualiza al abrirse, al recuperar el foco, con pestaña visible cada **90 segundos**, y cuando el usuario pulsa **Actualizar alertas**. **No es una suscripción push ni envía correo/SMS.**
- Cada cuota activa es una notificación separada y se considera nueva por el par `idCuota/tipoAlerta`. Un cambio de **próxima a vencer** a **vencida** produce una nueva notificación. Al pagarse/anularse y salir del listado de alertas, desaparece de la campana; no se inventan montos ni fechas.
- El badge rojo contabiliza las alertas **sin leer**, y el desplegable indica todas las activas. Seleccionar el aviso lo marca como leído y navega a la nueva pestaña. Permite marcar todas como leídas.
- El estado leído se almacena localmente por ID de usuario, **no sincronizado entre dispositivos**. Solo se persisten claves de cuota/tipo, sin importes, documentos ni nombres. El servidor sigue siendo fuente de verdad para el vencimiento y el saldo.
- Comprobación SQL en TEST al 15/11/2026: **1 próxima a vencer, 0 vencidas** en la cartera del actor Gerencia de prueba. Las cifras varían diariamente.

### QA manual sugerido

1. Actualizar Backoffice Docker y confirmar ausencia de nota azul, pestaña de alertas y paneles internos.
2. Con Gerencia, abrir campana: debe aparecer un aviso real de cuota que vence en los próximos siete días (según fecha de consulta), **no** los avisos fijos sobre vouchers y Las Palmeras.
3. Abrir aviso: navega a `/financiamiento?tab=alertas`, baja el contador de nuevas y muestra cuota y saldo reales en el panel. Verificar **Marcar todas como leídas**.
4. Refrescar navegador: los avisos ya leídos permanecen leídos en el mismo navegador. Al abrir desde otro dispositivo o almacenamiento, la lectura puede diferir.
5. Verificar que `ASESOR` sin `financing.view` y `CLIENTE` no obtengan alertas administrativas.
6. Tras una aplicación de pago de **TEST**, confirmar que una cuota saldada desaparece tanto de la pestaña como de la campana en la siguiente actualización.
7. Las restantes categorías de la campana (Marketing, CRM, separaciones, etc.) requieren integraciones reales posteriores; no se restauran números simulados.

Pruebas CI: `apps/backoffice/tests/finanzasReales.test.mjs` y `apps/backoffice/tests/alertasCampana.test.mjs`.
