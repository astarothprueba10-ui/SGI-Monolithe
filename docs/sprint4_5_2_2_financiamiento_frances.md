# SGI-MONOLITHE — Sprint 4 / 5.2.2 — Cálculo de intereses

## Alcance de esta rama

Esta rama implementa el contrato financiero para **nuevas** ventas financiadas.
No modifica el contenido de planes, contratos, pagos o cuotas existentes.

**Reglas aprobadas**
- Precio: precio individual vigente del lote, validado por `sp_crm_validar_formalizacion_v6`.
- Inicial total pactada: libre, mínimo **S/ 5,000** y menor que el precio.
- Separación: **S/ 500**, incluida dentro de la inicial total solamente si el
  pago está CONFIRMADO, el comprobante APROBADO y el crédito no fue aplicado
  a otro concepto.
- Si hay una reserva vigente con pago pendiente/inconsistente, formalización
  bloqueada hasta que Finanzas resuelva el comprobante. Esto impide acreditar
  tardíamente una reserva que no descontó el capital al registrar la venta.
- Capital financiado = precio contractual − inicial total.
- En `pag_planes_pago`: `monto_inicial` sigue siendo la **inicial adicional**
  (total − reserva aplicada); `monto_reserva_aplicada` conserva el abono separado.
- Tasa **nominal anual 10%**; tasa nominal mensual 10/12 %, **NO TEA**.
- Sistema francés; plazo de 1 a 36 cuotas; redondeo monetario a céntimos y
  última cuota ajustada. La operación `round(saldo * 10 / 1200, 2)` debe
  conservar el factor racional antes del redondeo.
- Los intereses del plan se registran y pactan al formalizar; las cuotas
  exigibles se generan al aprobar la firma contractual.

## Implementación en Git

- `apps/backoffice/src/utils/financiamientoFrances.ts`: inicial total,
  adicional deducida, capital e intereses con cálculo en céntimos.
- `apps/backoffice/src/pages/Sales.tsx`: captura y resumen de inicial total,
  separación confirmada e inicial por completar.
- `apps/backoffice/src/services/crmBackend.ts`: distingue reserva nominal
  de reserva acreditable recibida desde backend.
- `services/core-service/.../CrmVentaService.java`: enruta solamente
  nuevas operaciones a procedimientos versionados.
- `database/migrations/73_financiamiento_inicial_total_frances_v2.sql`:
  genera `fn_crm_simular_frances_v3` (algoritmo V2), `sp_crm_validar_formalizacion_v10`,
  `sp_crm_registrar_venta_pendiente_v10`, `sp_crm_registrar_venta_pendiente_v14`,
  `sp_crm_aprobar_firma_contrato_v7`, `sp_crm_cronograma_venta_v2`,
  `sp_crm_reservas_vigentes_para_venta_v2` y
  `fn_crm_reserva_acreditable_v1`.
- `apps/backoffice/tests/financiamientoFrances.test.cjs`: regresión matemática
  sobre 60 combinaciones y escenarios de reserva.
- `database/verification/73_financiamiento_inicial_total_v2_readonly.sql`:
  120 verificaciones SQL y controles de permisos solo lectura.

## Orden de despliegue — OBLIGATORIO

1. Copia de seguridad y confirmación de rama/ambiente de pruebas.
2. Revisar cuidadosamente la migración 73 en un ambiente **no productivo**.
   Los bloques `DO` clonan las versiones existentes por texto; si el
   procedimiento original cambió, la migración debe detenerse.
3. Aplicar migración 73 en ese ambiente. **No ejecutar directamente
   en producción sin pruebas funcionales y revisión de seguridad.**
4. Ejecutar SQL de verificación 73: los contadores de errores deben ser 0,
   las regresiones de interés deben coincidir; `anon` y `authenticated`
   no deben tener permiso EXECUTE.
5. Ejecutar `npm run test:financing` y `npm run build` en
   `apps/backoffice`; ejecutar `./mvnw test` / build de core-service.
6. Con usuarios y lotes de prueba: registrar venta sin separación,
   venta con separación aprobada y venta con separación pendiente
   (debe rechazarse), aprobar firma y comparar cronograma contra simulación.
7. Revisar que los planes históricos 2, 3, 9 y 14 mantengan sin cambios
   el precio, la tasa, el capital y las cuotas originales.
8. Solo tras aprobación de todas las pruebas: aplicar migración en producción
   **antes de desplegar** Java y React.

## Consideraciones y pendientes fuera de 5.2.2

- El plan histórico 3 muestra diferencia contractual de S/ 0.04 en cuotas;
  no modificar ni reparar automáticamente.
- El plan histórico 14 y otros V1 usan su lógica original, aunque haya
  diferencias de redondeo frente a V2.
- Cobranza parcial/anticipada, RLS del portal financiero, vencimientos,
  alertas y cláusulas de tres cuotas consecutivas pertenecen a los
  bloques siguientes; no se declara su implementación completa.
- El registro de la venta con comprobantes no constituye aprobación de
  una inicial efectivamente pagada; Finanzas debe revisar esos abonos.

## Registro de validación de esta rama

Se validaron 120 escenarios matemáticos de la calculadora TypeScript,
sin anomalías; también se contrastaron 60 escenarios de la fórmula V2
propuesta en SQL de **solo lectura** y se comprobó igualdad en centavos.

En GitHub Actions CI #457 se creó PostgreSQL 17 efímero:
- Se ejecutó la función SQL V3 extraída de la migración 73 y se verificaron
  120 escenarios, 7 valores de referencia y 3 rechazos esperados.
- Se cargó un esquema mínimo de prueba y las definiciones reales legadas
  recuperadas mediante consultas de solo lectura de Supabase.
- **La migración 73 completa compiló y creó sus versiones** en la BD efímera.
- Se ejecutaron las verificaciones SQL de 120 escenarios, permisos y reserva;
  también se probaron los casos de voucher no aprobado y pago duplicado.
- El resto del pipeline aprobó TypeScript, frontend, backend Java y linter.

**Queda pendiente una prueba de integración comercial con esquema y datos
representativos de Supabase (registro de venta, firma y cronograma)**,
porque no existe una rama de base de datos de pruebas autorizada y crearlo
implica confirmar un costo. En producción NO se ha aplicado la migración 73.
La rama de GitHub se mantiene activa para seguir programando y el PR #99
está cerrado sin fusionar a main.
