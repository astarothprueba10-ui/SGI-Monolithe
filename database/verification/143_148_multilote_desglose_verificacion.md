# SGI-Monolithe — Compras agrupadas y cobros con varios comprobantes

## Alcance implementado en la rama fix/correcciones-ventas-finanzas

Migraciones **143–144**: expediente comercial de negociación (`ven_operaciones_agrupadas_v1`) con cliente/persona única, 2–20 lotes de uno o varios proyectos y una modalidad por lote. `ven_operaciones_agrupadas_lotes_v1` conserva la relación opcional con `ven_ventas` y su contrato propio. Los planes de financiación permanecen asociados a la venta individual, no al encabezado grupal. La operación agrupada es **planificación, no venta formalizada ni reserva de stock**.

- El asistente de Backoffice crea el expediente y permite preparar cada venta desde la ficha del lote.
- Después del registro de una venta individual, el Backoffice intenta vincularla automáticamente a su operación agrupada; si ese vínculo falla, comunica que **la venta sí existe**, e indica cómo vincularla sin registrarla otra vez.
- El backend valida autorización de cartera, identidad, lote y modalidad en el vínculo. No se permite asociar la misma venta a grupos diferentes.
- El expediente muestra código de comprador, proyectos, lotes, contratos y planes asociados. No modifica ventas anteriores.
- **La formalización de todos los lotes en una sola transacción atómica todavía no existe**. Cada contrato y plan se registra mediante el flujo individual de venta; la negociación puede estar parcialmente formalizada.
- **No se ofrece un crédito conjunto de tres lotes**, ni se aplican descuentos colectivos. Siguen siendo obligaciones independientes.

Migraciones **145–147**: desglose de uno o varios comprobantes de una **venta individual**, con importe y referencia bancaria por documento, total exacto y registro de revisión/conciliación separado. Para cada evidencia se exige una autorización diferente del vendedor y del configurador del desglose; la revisión no confirma dinero.

- El desbloqueo de conciliación ocurre únicamente después de aprobación documental y verificación de abono en **cuenta real**. `sp_fin_conciliar_desglose_venta_v1` genera el pago, voucher y movimiento financiero de un comprobante en una misma transacción, y aplica la inicial a su plan si corresponde. Si alguna parte falla, la transacción se revierte.
- Se rechazan cuentas `DEMO-*`, referencias repetidas ya confirmadas, diferencias de divisa o de importe, pagos previos conflictivos, comprobantes privados inexistentes, contratos sin firma válida y usuarios sin permiso.
- La bandeja muestra `montoOriginal`, `montoPendiente` neto y `comprobantesConciliados`; no duplica ingresos al consultar.
- **Una única transferencia bancaria que paga varios lotes sigue sin estar soportada**: la comprobación de duplicados impide reutilizar la referencia en diferentes ventas. Para ese escenario hace falta un módulo de **cobro consolidado con distribución explícita entre obligaciones**, que evitaremos simular mediante referencias repetidas.

Migración **148**: Gerencia con permisos financieros puede reiniciar una revisión documental errónea, exigiendo un motivo y auditando los estados anteriores, **solo cuando no hay ningún pago conciliado**. Si hubo dinero confirmado, no permite borrar la relación ni el saldo; debe seguirse un procedimiento de reversión formal.

## Verificaciones no destructivas efectuadas en Supabase original

Proyecto: `cjwnnroqjltoaqzpxlmh` (mismo entorno de pruebas elegido por el usuario).

Prueba `database/tests/ventas_agrupadas_desglose_143_148_readonly.sql` pasada: creación, consulta y rechazo de vínculo incorrecto con dos lotes de modalidades diferentes; **rollback explícito** del caso ficticio; denegación de desglose falso, conciliación sin evidencia, reinicio sin Gerencia y acceso a RPC financieras mediante `anon`/`authenticated`. Las pruebas verificaron que contratos, pagos y saldos no se modificaron.

Estado observado tras las pruebas:
- **0 negociaciones agrupadas** y **0 desgloses** persistidos.
- **4 cobros por verificar, S/ 69 500** sin conciliar.
- **7 pagos históricos**, sin incremento por estas pruebas.
- **0 cuentas receptoras reales**. La única cuenta configurada anteriormente es de demostración; la conciliación positiva está bloqueada.
- Ninguna venta histórica en la muestra tiene más de un comprobante. La ruta positiva de reparto y conciliación de múltiples comprobantes requiere fixtures locales controlados y un medio bancario válido. **No afirmar que ha sido probada con movimientos reales**.

## Guía de pruebas locales

1. Actualizar el repositorio local en `fix/correcciones-ventas-finanzas` sin sobrescribir modificaciones no guardadas; reconstruir `core-service` y `backoffice` con Docker.
2. En **Separaciones y ventas → Compras agrupadas**, seleccionar un comprador y añadir dos lotes, uno al contado y otro financiado; comprobar el resumen. Crear la negociación solo si se quiere conservar un registro de prueba en la base.
3. Abrir el expediente agrupado y usar **Registrar venta** por lote. Confirmar que se abre el formulario estándar con prospecto, lote, proyecto y modalidad preseleccionados. Completar la venta individual con datos de prueba válidos y verificar el vínculo. Se puede asociar una venta existente con **Vincular**; nunca duplicarla.
4. En **Finanzas → Revisión y cobros de ventas**, para una venta con 2–8 comprobantes, registrar el desglose exacto por documento; comprobar que no se reconoce dinero hasta aprobar y conciliar individualmente. La edición de un desglose parcialmente aprobado está bloqueada.
5. Si se requiere corregir un desglose aprobado pero sin pago, entrar con Gerencia y usar **Reiniciar revisión de comprobantes**, incluyendo justificación. Intentar hacerlo después de conciliar debe fallar.
6. No probar conciliación real con cuentas ficticias. Configurar la cuenta receptora únicamente cuando se disponga de documentación bancaria legítima y autorización de Gerencia.

## Pendientes posteriores

- Cobro consolidado: una transferencia bancaria distribuida entre varias ventas, con un único ingreso bancario y aplicaciones separadas por lote, sin doble conteo.
- Operación de venta grupal con confirmación atómica y recuperación segura de fallos (actualmente la agrupación es una negociación de varias ventas independientes).
- Financiamiento conjunto opcional con garantías, contratos y cronogramas adecuados, si Monolithe lo requiere.
- Pruebas de extremo a extremo de los casos positivos de dinero **solo en local y con datos autorizados**; sin PR ni despliegue.
