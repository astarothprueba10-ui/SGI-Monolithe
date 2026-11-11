# SGI-MONOLITHE | Sprint 4 / Actividad 5.2.6
## Alertas de cuotas próximas y vencidas

### Reglas aprobadas y comportamiento

El origen de los estados es **5.2.5**, usando la función
`fn_crm_clasificar_cuota_v1` y los pagos **CONFIRMADOS**
aplicados a cuotas, no un voucher pendiente ni `fecha_pago_completo`.
La fecha de corte usa `America/Lima`.

- **CUOTA_PROXIMA**: cuota con saldo confirmado pendiente cuyo
  vencimiento está entre hoy y los siete días naturales siguientes
  (incluye hoy y día 7).
- **CUOTA_VENCIDA**: cuota con saldo pendiente cuyo vencimiento fue
  antes de hoy, incluso si tiene un abono parcial confirmado.
- Una cuota PARCIAL vencida sigue siendo PARCIAL en el cronograma,
  pero aparece como CUOTA_VENCIDA en la lista de alertas
  por el saldo efectivamente adeudado.
- No se generan alertas para cuotas PAGADAS, ANULADAS,
  planes PENDIENTE sin contrato firmado o ANULADO/RESUELTO/COMPLETADO.
- La cuota vencida se calcula en cada consulta sin cambiar
  `pag_cuotas.id_estado_cuota`.
- Una cuota se devuelve una vez por ID; su saldo proviene de las
  aplicaciones confirmadas, sin duplicación por versiones o compradores.

### Migraciones y backend

1. `81_financiamiento_alertas_cuotas_v1.sql`
   - `fn_fin_alertas_cuotas_base_v1(fecha_corte)`: cálculo reutilizable
     de alertas basado en cuotas vigentes y saldos confirmados.
   - `sp_fin_alertas_cuotas_v1(actor,tipo,pagina,tamano)`: paginación,
     totales, fechas, compras y comprobación de cartera autorizada.
   - `sp_fin_preparar_avisos_portal_v1(actor,limite)`: proceso
     **explícito** para preparar notificaciones internas. Reutiliza
     `not_notificaciones`, `cfg_tipos_notificacion` y
     `not_preferencias`; respeta desactivaciones y no envía correos.
2. `82_financiamiento_alertas_titular_deduplicacion_v1.sql`
   - La clave única contiene **persona titular + cuota + tipo +
     vencimiento**, para no reactivar avisos dirigidos a un titular
     anterior si se cambia la asociación comercial.
   - Se desactivan avisos obsoletos sin borrarlos, preservando el
     historial y evitando duplicados.
3. Core Service:
   - GET `/api/core/crm/financiamiento/alertas`:
     `sales.view` JWT + ámbito de ventas verificado en PostgreSQL.
   - POST `/api/core/crm/financiamiento/alertas/portal/preparar`:
     `financing.approve` JWT + mismo permiso SQL. Es el único
     método que puede escribir avisos y no genera envíos.
   - Validaciones estrictas de tipo y límite (1–100 registros),
     paginación y máximo 500 avisos en el proceso interno.
   - Funciones REVOKE para PUBLIC/anon/authenticated y EXECUTE
     exclusivamente para `sigi_app_user`.

### Backoffice

`AlertasCuotasPanel.tsx` se incluye en la página Financiamiento:
- Indicadores de próximas, vencidas y saldos en soles.
- Filtros Todas/Vencidas/Próximas, paginación y botón Actualizar.
- Número de cuota, contrato, titular autorizado, importe abonado,
  saldo por cobrar, vencimiento y días de mora.
- `Preparar avisos PORTAL` solo con `financing.approve`,
  indicando explícitamente que no se envían correos/SMS.
- Se retiraron las antiguas alertas ficticias de mora y cláusula
  resolutoria, así como el botón que ejecutaba
  `sp_actualizar_estados_cuotas` inseguro.
- Se deshabilitó la validación simulada de vouchers en esta página.
  Las demás pestañas demo se identifican como tales hasta 5.3.

### Pruebas realizadas

PostgreSQL 17 efímero en GitHub Actions:
- Alertas con vencimiento próximo y vencido, pagos parciales,
  pago completo, cuota ANULADA, plan cerrado, sin contrato y
  sin información fuera de la cartera autorizada.
- Conteos, saldos, fechas, límites y paginación.
- Preparación interna y segundo intento sin duplicados.
- Preferencia PORTAL deshabilitada y reactivada.
- Pago confirmado que cancela saldo: aviso obsoleto desactivado.
- Reversión del pago: mismo aviso reactivado sin duplicarse.
- Cambio del titular: aviso antiguo desactivado y nueva persona
  autorizada recibe su propio aviso sin filtración.
- Consultas no autorizadas o directas anon/authenticated rechazadas.
- Compilación de Backoffice y pruebas Java del Core.

Supabase original de TESTEO:
- Migraciones 81 y 82 aplicadas tras pasar CI.
- Fecha 11/11/2026: una cuota próxima a vencer el 16/11/2026
  en la venta 4; importe pendiente **S/ 2,111.11**.
- Ninguna cuota vencida en la fecha de corte.
- Proceso de avisos ejecutado dentro de subtransacción **revertida**:
  primer intento 1 aviso, siguiente 0 duplicados; sin registros
  persistentes y sin envíos externos.
- Se comprobó el bloqueo de permisos sin JWT/actor válido.

### Límites explícitos

- **No se programa aquí un cron automático**: Supabase aún
  no tiene `pg_cron` activado. La consulta del panel calcula los
  vencimientos en tiempo real. La preparación de notificaciones
  PORTAL queda disponible para ejecución autorizada y podrá
  conectarse al scheduler cuando se defina el flujo final.
- **No se envía EMAIL ni SMS**: la entrega al comprador requiere
  configurar el Portal Cliente (bloque 5.4) y validar la información
  de contacto y preferencias.
- La regla jurídica de **tres cuotas consecutivas impagas**
  corresponde a 5.2.7 y NO se deduce de estas alertas generales.
- La rama permanece `feature/pagosy-financiamiento-sprint-4`,
  sin PR abierto, merge a `main` ni despliegue de aplicaciones.

Consulta de control:
`database/verification/81_alertas_financieras_cuotas_readonly.sql`.
