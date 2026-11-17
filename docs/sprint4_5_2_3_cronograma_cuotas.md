# SGI-MONOLITHE — Sprint 4 / 5.2.3 Cronograma de cuotas

## Resultado
Generación de **cuotas definitivas únicamente tras aprobar la firma contractual**,
y presentación de cronogramas **no exigibles** mientras la venta está pendiente.

Las migraciones se instalaron en la Supabase original de **testeo** autorizada
por el usuario, sin crear un segundo proyecto ni duplicar tablas.
La rama de GitHub sigue activa: `feature/pagosy-financiamiento-sprint-4`.
No fusionar con `main` ni desplegar aplicaciones hasta continuar el Sprint 4.

## Modelo y fechas
- Precio del lote: precio individual vigente validado por Core.
- Inicial total: mínimo S/ 5,000; la separación acreditada de S/ 500
  forma parte de esa inicial.
- Capital: precio − (inicial adicional + reserva aplicada).
- Sistema francés: tasa nominal anual 10%, plazo 1–36 cuotas.
- Proyección: `PROYECTADO`, sin filas en `pag_cuotas`.
- Firma autorizada: `ACTIVO`, 1–36 filas reales en `pag_cuotas` con estado
  inicial `PENDIENTE`, registro de transición y firma.
- **Anclaje de calendario**: vencimiento N = fecha de firma + N meses
  (no fecha de primera cuota + N-1 meses).
  Ejemplo 31/01/2028: 29/02/2028, 31/03/2028, 30/04/2028.
- No se aplica desplazamiento por feriados o días inhábiles en 5.2.3;
  queda sujeto a definición comercial posterior.
- El ajuste de redondeo en la última cuota liquida todo el capital
  y los importes se concilian al céntimo con el plan pactado.

## SQL
- `73_financiamiento_inicial_total_frances_v2.sql`: modelo matemático,
  validación de inicial/reserva, firma V7 y cronograma V2.
- `74_cronograma_cuotas_frances_v2.sql`:
  - `fn_crm_generar_cronograma_frances_v2` genera importes y fechas.
  - `sp_crm_cronograma_venta_v3` consulta proyectos/ventas autorizados,
    devuelve cronogramas registrados desde `pag_cuotas` sin recalcularlos,
    y proyecciones de planes V1 y V2.
  - `sp_crm_aprobar_firma_contrato_v8` conserva validaciones de la V7,
    pero para condiciones V2 inserta cuotas a partir del mismo motor.
- `75_cronograma_guardas_integridad_v3.sql`: rechaza cronogramas
  incongruentes, planes pendientes con cuotas y planes V2 firmados
  con cuotas incompletas o importes fuera de balance. No cambia
  importes históricos.

Las nuevas funciones restringen EXECUTE a `sigi_app_user`.
Java `CrmVentaService` llama a la firma V8 y la lectura V3, sin
autorización directa desde React.

## Presentación
`CronogramaVentaPanel.tsx` diferencia proyección de registro,
genera PDF, muestra vencimiento, capital, intereses y total,
y alerta sobre discrepancias históricas (sin modificarlas).

## Validaciones ejecutadas
**CI / PostgreSQL 17 efímero**
- Compilación de migraciones 73–75 y regresiones financieras.
- Simulación francesa 120 combinaciones, redondeo y saldo final.
- Fecha anclada, año bisiesto/no bisiesto y mes con 31 días.
- Proyección de V1/V2, plan registrado, permisos y bloqueo de planes
  incoherentes, facturas con cuotas parciales incompletas.
- Build TypeScript del Backoffice y pruebas Java del Core.

**Supabase de testeo (proyecto original)**
- Migraciones 73, 74 y 75 aplicadas exitosamente.
- Planes históricos 2,3 y 9 siguen activos con sus cuotas registradas;
  plan 14 sigue pendiente, con 12 cuotas proyectadas y **0 registradas**.
- Se probaron **dos aprobaciones reales de procedimiento, revertidas en
  subtransacciones** sobre el contrato 28 y la evidencia existente:
  - V2 temporal: 12 cuotas, capital S/ 25,000.00,
    intereses S/ 1,374.75; fechas ancladas correctamente.
  - V1 original: misma conciliación; un segundo intento de aprobación
    fue rechazado.
  - **Los cambios fueron revertidos**: contrato y venta 28 siguen
    PENDIENTE, sin aprobaciones y sin nuevas cuotas.
- Los nuevos procedimientos no son ejecutables por `anon` ni
  `authenticated`, únicamente por el rol interno del backend.

## Delimitación y pendientes
- Se conserva diferencia histórica de **S/ 0.04** en capital del plan 3,
  expresamente sin rectificar contratos antiguos.
- La determinación de cuota VENCIDA/PARCIAL/PAGADA, aplicación de
  cobros y saldos pertenecen al siguiente bloque 5.2.4–5.2.5.
- La corrección de políticas RLS con `user_metadata` sigue pendiente
  de la fase de seguridad de cobranzas/portal cliente.
- Las modificaciones deben continuar solo en la misma rama de GitHub;
  no hay PR abierto.
