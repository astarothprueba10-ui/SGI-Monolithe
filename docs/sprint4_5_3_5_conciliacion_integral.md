# SGI-MONOLITHE — Sprint 4 — 5.3.5
## Conciliación integral y cierre de Gestión de vouchers y comprobantes

**Rama aislada:** `feature/pagosy-financiamiento-sprint-4`.
No abrir PR, no fusionar con `main` ni desplegar hasta la aceptación
de los módulos conectados. Supabase existente es base de **testeo**.

### Migraciones y responsabilidades

| Migración | Responsabilidad |
|---|---|
| 90 | Conciliación integral y anotaciones humanas |
| 91 | Historial append-only de seguimientos y verificación de alerta real |
| 92 | Registro de comprobantes privados de INICIAL adicional |
| 93 | Aprobación segregada de inicial, bandeja y revisión unificadas |
| 94 | Integridad de tipo MIME y tamaño en bandeja y URLs privadas |

La conciliación lee `pag_pagos`, `pag_vouchers`, `pag_aplicaciones_pago`,
los planes/cuotas y las referencias a Storage. **No modifica saldos,
contratos, precios, reservas, cuota pactada ni tasas**.

- Detecta pagos aplicados más allá de su importe; aplicaciones de
  pagos no confirmados; pagos confirmados sin aprobación documental;
  pendientes de revisión; evidencia histórica no verificable;
  dinero confirmado no imputado; ausencia de voucher activo.
- Para archivos de cuota e inicial exige el bucket privado
  `vouchers-ventas-private`. Para separaciones consulta
  `vouchers-separacion-private`, sin cambiar el flujo anterior.
  El estado de evidencia es documental, no verificación bancaria.
- Muestra acumulado confirmado, confirmado sin imputar y
  diferencias históricas entre total financiado y suma de cuotas.
- Reporta candidatos a limpieza de **preautorizaciones**
  expiradas más de 7 días SIN pago NI objeto Storage asociado.
  No borra estos registros ni elimina archivos; los archivos
  sin referencia requieren inventario y validación manual.
- `pag_conciliacion_revisiones_v1` registra el último seguimiento
  de una incidencia real; `pag_conciliacion_eventos_v1` conserva
  cada cambio. Los estados `EN_REVISION` y `REVISADA`
  **no** implican resolución financiera.
- La nueva inicial adicional nunca incluye los S/ 500 de reserva
  ya acreditados. Solo admite planes de financiación ACTIVO
  y contratos VIGENTE firmados. Se muestra el saldo adicional
  pendiente de cobrar.
- La carga de un voucher inicial crea pago `REGISTRADO`/
  voucher `PENDIENTE`, con referencia privada 30 minutos.
  Requiere **otro actor** para aprobarlo. Aprobar confirma el pago,
  pero no modifica el saldo hasta aplicar una
  `pag_aplicaciones_pago` de tipo INICIAL.
- La revisión de inicial bloquea confirmaciones acumuladas
  superiores al saldo disponible; tiene idempotencia e historial
  separados del proceso de cuotas.
- La bandeja muestra `CUOTA`, `INICIAL`, `HISTORICO`
  según el origen SQL. La ruta de lectura privada vuelve a validar
  MIME y tamaño frente a Storage.

### Backend

- `GET /api/core/crm/finanzas/conciliacion-integral`
- `PUT /api/core/crm/finanzas/conciliacion-integral/pagos/{idPago}/revision`
- `GET /api/core/crm/finanzas/vouchers/inicial/opciones`
- `POST /api/core/crm/finanzas/vouchers/inicial/preparar-carga`
- `POST /api/core/crm/finanzas/vouchers/inicial/registrar`

Los endpoints de revisión y lectura de vouchers de cuotas existentes
mantienen su URL pública, ahora usando procedimientos SQL V2 que
identifican CUOTA o INICIAL exclusivamente desde las claves de origen.

`finance.view` para consultar, `finance.create` para cargar y
`finance.view` + `finance.edit` para revisar/registrar seguimiento.
Cada procedimiento SQL valida de nuevo los permisos.
Las tablas nuevas tienen RLS habilitado, sin acceso directo desde
el navegador ni `sigi_app_user`; este rol ejecuta solamente
procedimientos autorizados.

### Backoffice

**Finanzas → Conciliación integral:** filtros, totales, alertas
clasificadas, comentarios de seguimiento con auditoría,
diferencias históricas y advertencia de limpieza controlada.

**Finanzas → Vouchers de cuotas:** bandeja unificada, con botón
`Nuevo comprobante de inicial`, sin retirar el registro de cuotas.
Flujos idénticos de carga segura, reintento idempotente y revisión
por otra persona autorizada.

**Finanzas → Aplicación de pagos:** el pago aprobado de inicial
se presenta con destino INICIAL, nunca se convierte en cuota;
solo entonces se realiza el abono parcial/total correspondiente.

### Datos de testeo detectados el 11/11/2026

- 6 pagos, 6 vouchers, 3 aplicaciones y 84 cuotas,
  conservados tras pruebas reversibles.
- Tres alertas: pago 8 pendiente de revisión (separación);
  pago 7 confirmado de S/ 500 no aplicado (separación);
  pago 2 documentalmente histórico no verificable
  en Storage privado nuevo, a pesar de tener pago
  CONFIRMADO con aplicación legítima anterior.
- Plan 3: `monto_total_financiado=76000`,
  suma de cuotas `75999.96`, diferencia histórica S/ 0.04.
  **No ajustar automáticamente ni recalcular cuotas.**
- La ausencia de un archivo histórico en el bucket nuevo
  **no** habilita deshacer pagos anteriores automáticamente.
- La validación de objetos de separaciones se hizo contra
  su bucket correcto: los archivos originales no se
  consideran ausentes por buscarse en el bucket de ventas.

### Pruebas ejecutadas

1. PostgreSQL 17 CI: conciliación integral, filtros, paginación,
   revisión auditada, protección a actores no autorizados,
   inicial aprobada/rechazada por personas distintas, bloqueo
   de sobreconfirmación, aplicación INICIAL, invariantes de cuotas,
   reintentos idempotentes e integridad de Storage.
2. Supabase de testeo: transacciones SQL reversibles con
   venta 4, plan 3, cuota 73. Verificado el flujo nuevo de inicial,
   creación de pago pendiente, aprobación, rechazo por sobrepago,
   aplicación a INICIAL sin modificar la cuota y notas auditadas.
3. Prueba adversarial de MIME: la bandeja y la URL de lectura
   rechazan un voucher cuya metadata no coincide con Storage.
   El cambio del voucher de prueba fue revertido.
4. CI Java/Backoffice: contratos de petición, permisología
   previa a SQL, validación y compilación.
5. Asesores de seguridad: revisar después de migrar; mantener
   las funciones `SECURITY DEFINER` con permisos explícitos
   solo al backend.

### Criterios de aceptación y asuntos de despliegue

- Desarrollo, pruebas de SQL con fixtures y compilaciones deben
  estar aprobados antes de dar por cerrado el código de 5.3.5.
- **No se ha ejecutado una prueba manual real con dos sesiones
  en el Backoffice desplegado**, ya que no hay despliegue de
  esta rama y se prohibió fusionar con `main`.
  Para aceptación final, usar un usuario `finance.create`
  y otro `finance.edit`, subir un PDF real al Storage de testeo,
  aprobar y aplicar un abono; verificar luego saldos, auditoría,
  reversión y eventos, sin tocar registros históricos.
- La limpieza física de objetos debe seguir un procedimiento
  aprobado de retención y usar el API de Supabase Storage;
  **nunca borrar `storage.objects` mediante SQL**.
  Las herramientas de este sprint solo proporcionan
  un inventario de candidatos seguros.
- La diferencia de 4 céntimos del plan histórico y las
  incidencias de separaciones deben recibir tratamiento
  documental por Finanzas, no una compensación automática.

**Comandos de auditoría solo lectura**:
`database/verification/90_94_fin_conciliacion_final_readonly.sql`.
