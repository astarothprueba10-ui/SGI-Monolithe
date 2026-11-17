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

## Nueva experiencia de Financiamiento — migración 104 (15/11/2026)

- Se reutiliza el componente de CRM `CrmPeriodoGlobal` con la función `calcularRangoCrm`: **Hoy, Semana, Mes, Año y Rango**. El módulo abre en **Año actual según Lima (UTC-5)**.
- El período filtra por `ven_ventas.fecha_venta` (o `fecha_creacion` si falta) y afecta tanto la lista de planes como los cinco KPI; las búsquedas de texto cambian únicamente la lista, no la suma de KPI del período.
- Se documenta explícitamente que el **saldo representa la deuda ACTUAL de las operaciones registradas dentro del período**, no la deuda histórica que tenían al finalizarlo. Nunca se fabrican saldos a fecha pasada.
- Las alertas de vencimiento y la revisión contractual NO se ocultan al filtrar un período de ventas, para no omitir moras de contratos anteriores.
- Migración `104_financiamiento_cartera_filtro_periodo_v2.sql`: función `sp_fin_cartera_backoffice_v2(actor,vista,busqueda,pagina,tamano,desde,hastaExclusivo)`. Se conserva v1 para compatibilidad. Autoriza únicamente el rol servidor `sigi_app_user`; `anon/authenticated` tienen `EXECUTE` denegado. Valida actor, cartera, límites de paginación y período. No actualiza pagos ni contratos.
- Core `GET /api/core/crm/financiamiento/cartera`: ahora requiere `desde` y `hastaExclusivo` ISO-8601 con offset, además de parámetros tradicionales; permisos JWT `financing.view` y `sales.view`, actor extraído del token y `no-store`.
- Tabla unificada **Planes y saldos**: columnas Venta y comprador | Lote | Precio base | Inicial total | Capital financiado | Interés | Saldo | Estado | Ver cronograma. El tab de cuotas global se elimina.
- Cada operación abre un **expediente financiero** en modal con comprador, código de venta, plan, lote, importes contractuales, inicial (reserva y adicional) y saldo contable actual. El cronograma se solicita exclusivamente para la operación seleccionada mediante `obtenerCronogramaVenta(idVenta)` y `obtenerSaldoVenta(idVenta)` autenticados.
- El detalle muestra cuotas **con saldo pendiente** por defecto, con selector **Todas** para ver también pagadas o anuladas. Columnas: número, vencimiento, capital, interés, importe, abonado, saldo y estado. Las etiquetas de estado tienen colores accesibles. No se presentan cronogramas proyectados como deuda exigible.
- Precisión monetaria: `formatSoles` representa céntimos sin el redondeo a enteros del `currency()` de la interfaz histórica.
- Los cinco KPI usan `KpiCard` de la biblioteca Backoffice, con iconos y tonos de marca; tabla y modal usan `Table` (desplazamiento horizontal accesible, foco por teclado, altura adaptativa y anchos mínimos) para pantallas móviles y grandes.
- Campanita financiera real mantiene `/financiamiento?tab=alertas`. Solo quedan pestañas Planes y saldos y Alertas de cuotas Vencidas.
- CI: `apps/backoffice/tests/financiamientoPeriodoModal.test.mjs` (componentes compartidos, seguridad, vigencia de saldos, datos reales, interacción y scroll).
- Pruebas SQL solo lectura: Noviembre 2026 = **3** planes registrados, **S/ 76,749.50** de saldo de cuotas exigibles y **S/ 15,500.00** inicial pendiente de conciliar; Octubre 2026 = **1** plan; Febrero 2027 = **0**. Son cifras de TEST sujetas a cambios. Rol CLIENTE y rangos invertidos rechazados.

### QA manual después de actualizar Docker

1. Abrir `http://localhost:5174/financiamiento`. Por defecto el filtro debe estar en **Mes**, con fecha Perú del día. Verificar KPI y registros correspondientes al mes actual.
2. Cambiar a **Hoy, Semana, Año, Rango** y comparar tarjetas y ventas; al cambiar de período debe reiniciar paginación y dejar de mostrar el período anterior. Rango invertido debe mostrar error de validación.
3. Verificar las nueve columnas y la barra de desplazamiento horizontal en móvil o ventana angosta.
4. Abrir **Ver cronograma** de `VTA-PND-2026-000030`. Verificar nombre, lote MZ-D-L34, precio S/ 30,000, inicial S/ 5,000, capital S/ 25,000, intereses S/ 1,374.75, saldo de cuotas S/ 26,374.75 y las 12 cuotas detalladas.
5. Alternar **Con saldo pendiente / Todas**, comparar importes y estados coloreados después de aplicar un voucher de TEST mediante Finanzas.
6. Abrir un plan de venta pendiente de firma y confirmar que no muestra cuotas proyectadas como exigibles.
7. Seleccionar **Alertas de cuotas Vencidas** y verificar que no depende del filtro de registro de ventas; la campana lleva a esta pestaña.
8. Comprobar que usuarios sin `financing.view` o fuera de cartera no obtengan planes ni detalle de terceros.

No se desplegó, creó PR, fusionó o tocó `main`. Requiere comprobación funcional local antes de aprobar Sprint 4.

## Ajuste de filtros financieros — migración 105 (16/11/2026)

La experiencia se alinea con los filtros de la tabla de CRM y usa **Año** como período global predeterminado, con referencia a la fecha local de Perú. Los otros modos (Hoy/Semana/Mes/Rango) siguen disponibles.

### Indicadores y tabla: filtros deliberadamente separados
- **Período global**: determina la cohorte de ventas cuya fecha de registro cae en el período. Sus cinco KPI muestran **saldos ACTUALES**, no reconstrucciones históricas. **Por defecto, Año actual**.
- **Filtros exclusivos de la tabla**: primera fila `Buscar venta o comprador`, `Proyecto`, `Lote`, `Estado`; segunda fila `Fecha desde`, `Fecha hasta` y `Limpiar filtros`.
- Las etiquetas de todos los campos aparecen **encima de su control**, replicando la disposición usada en CRM. En móvil, los controles pasan a varias líneas; la tabla conserva desplazamiento horizontal.
- Los filtros de tabla son combinables y se ejecutan **en el servidor antes de paginar**; por tanto, funcionan para el conjunto completo de ventas autorizadas, no solo en las filas visibles de una página.
- Proyecto y lote proceden de un catálogo que Core construye desde las operaciones autorizadas del período global; elegir un proyecto limita las opciones de lote a ese proyecto y borra la selección anterior de lote.
- El estado usa el estado **visible** de la tabla (`ACTIVO`, `PENDIENTE_FIRMA`, `COMPLETADO`, `ANULADO`). Los rangos de fechas son inclusivos en hora local de Lima y **restringen**, sin sustituir, el período global.
- **Limpiar filtros** restablece búsqueda, proyecto, lote, estado y fechas de la tabla. No cambia el período global seleccionado ni modifica las cinco tarjetas KPI.
- Los KPI no varían al utilizar únicamente los filtros de la tabla. El contador de filas filtradas y la paginación sí varían. La sección de alertas no se filtra por fecha de registro de ventas.

### Backend
- Migración **`105_financiamiento_filtros_tabla_v3.sql`**: `sp_fin_cartera_backoffice_v3` extiende la v2 sin eliminarla. Usa la verificación habitual de actor, `fn_crm_puede_consultar_venta_v1`, `search_path` fijo, `REVOKE EXECUTE` de roles públicos y permiso exclusivo al rol servidor `sigi_app_user`.
- El mismo endpoint `GET /api/core/crm/financiamiento/cartera` admite los parámetros `proyecto`, `lote`, `estado`, `fechaTablaDesde` y `fechaTablaHasta`; los valida en Java y en SQL. El actor se extrae del JWT; los filtros no confieren acceso a ventas ajenas.
- La respuesta añade `filtros.proyectos` y `filtros.lotes`, con las opciones de la cartera visible antes de aplicar paginación y filtros específicos de tabla.
- Se preservan los procedimientos oficiales de cálculo de capital, mora, cronograma, importes y pagos confirmados. No se actualiza ningún saldo ni contrato.

### Pruebas realizadas
- SQL TEST: el filtro global de 2026 devuelve **5 planes**; el lote `MZ-D-L34` devuelve **1**; el período específico 01–30/11/2026 devuelve **3**. Los KPI no cambian entre esas consultas.
- Permisos: `anon=false`, `authenticated=false`, `sigi_app_user=true`; CLIENTE sin permisos bloqueado. Fechas invertidas rechazadas.
- CI de la rama: compilación y typecheck de frontend, tests Java de Core y pruebas estructurales de los filtros.

### QA manual en Docker local
1. Entrar en Financiamiento y pagos y confirmar que **Año** está seleccionado por defecto; los KPI indican importes anuales.
2. En la tabla, comprobar las dos filas y etiquetas superiores de los controles.
3. Elegir un proyecto: la lista de lotes debe adaptarse. Elegir `MZ-D-L34`: con año 2026 debe quedar una operación.
4. Seleccionar estado y fechas desde/hasta. Confirmar que los filtros se combinan y que el total de registros cambia sin cambiar los KPI.
5. Buscar por nombre o código; probar cero resultados y paginación; después pulsar **Limpiar filtros**.
6. Verificar que **Limpiar filtros** no cambie el Año global y que los planes vuelvan a mostrarse.
7. Cambiar el período global a otro año y verificar que cambien las tarjetas y las opciones autorizadas. Las alertas continúan independientes.
8. En una ventana estrecha comprobar que los controles se reordenan y las columnas de planes no se comprimen.

No se ha fusionado con `main` ni desplegado.


## Sprint 4 — Exportaciones y presentación de alertas (17/11/2026)

### 1. Paginación
`CarteraFinanciamientoPanel.tsx` reutiliza `components/ui/Pagination.tsx`, con recuento `Mostrando X–Y de Z registros`, números de página y controles anterior/siguiente, incluso cuando solo hay una página. Se mantienen paginación real en servidor y filtros combinados.

### 2. Excel financiero por período global
- Botón `Exportar Excel` al lado del período global. Exporta las **ventas de la cohorte del período global** (sin limitarse a la página visible ni a los filtros de búsqueda exclusivos de tabla).
- `utils/financiamientoExportExcel.ts` consulta todas las páginas autorizadas del endpoint de cartera (`tamano=100`), protege contra exportación parcial y detecta cambios de total durante la consulta. No lee Supabase directamente ni contiene datos ficticios.
- Consulta también las alertas financieras actuales y retiene **solo las relativas a las ventas del período seleccionado**, vinculándolas por `idVenta`. Las alertas se reconocen como situación al corte (no reconstrucción histórica).
- 3 hojas: `Resumen financiero` (indicadores y advertencia sobre saldos actuales), `Planes y saldos` (cartera completa), `Alertas de cuotas` (vencidas y próximas, por tipo).
- Numeración financiera con dos decimales y celdas numéricas reales; fechas de Excel `dd/mm/yyyy`; texto Unicode en castellano; cabeceras, franjas y títulos azul marino/dorado/verde; filtros y encabezados congelados. Cadenas externas protegidas contra interpretación como fórmulas.
- No incluye movimientos de Finanzas, vouchers, libros mayores ni información no autorizada: es un reporte de **financiamiento**, no un asiento contable ni un estado financiero histórico.

### 3. PDF individual del comprador
- En `PlanFinanciamientoDetalleModal.tsx` se agrega `Exportar expediente PDF` únicamente cuando el cronograma y el saldo oficial se han cargado sin errores. No altera el expediente ni aplica pagos.
- `utils/financiamientoExportPdf.tsx` genera un documento A4 apaisado con cabecera MONOLITHE, comprador, proyecto, lote, códigos de venta y plan, fecha de operación, estado, 11 indicadores financieros, importes confirmados y cronograma completo (capital, interés, cuota, abono, saldo, estado, fechas). Contiene pie con páginas y advertencia de uso informativo.
- Para operaciones sin formalización, no exporta cuotas proyectadas como obligaciones exigibles. Carga diferida de la librería de PDF; no se generan ni transfieren archivos a servidores ajenos.

### 4. Alertas y revisión contractual
- `AlertasCuotasPanel.tsx` y `RevisionClausulaPanel.tsx` reutilizan `KpiCard` para tres indicadores por sección, con iconos, tonos y formato monetario a dos decimales. Se modernizan cabeceras, bordes y fondos, preservando controles, permisos, reglas de mora y prevención de resolución contractual automática.
- La pestaña conserva alertas actuales **sin depender** del período global (se evita ocultar moras de ventas antiguas). Solo la **exportación Excel** recorta alertas a las ventas de la cohorte que se está informando.

### QA local pendiente
1. Año 2026 en `/financiamiento`: paginador con `Mostrando 1–5 de 5 registros` y página 1, controles inactivos si no hay más páginas.
2. `Exportar Excel`: validar las tres hojas, KPI, todos los planes, alertas del mismo universo de ventas y celdas de fecha/moneda; probar un período vacío y nombres con tildes.
3. En `Ver cronograma` de `VTA-PND-2026-000030`, exportar PDF y revisar que incluya las 12 cuotas en una segunda página, importes y fechas legibles. Probar también una operación pendiente de formalización, sin proyectar deuda exigible.
4. Verificar KPI y estética de `Alertas de cuotas Vencidas` y `Posibles causales de revisión contractual` en escritorio y móvil.
5. Confirmar que los accesos a reportes siguen limitados por el JWT/roles y la cartera; ni exportación ni visualización registran pagos.
