# SGI Monolithe · Ventas/Finanzas · Verificación 136–139

## Alcance y límites
La nueva revisión cubre comprobantes **de ventas individuales** almacenados en `ven_ventas_comprobantes`.
No confunde firma contractual, soporte aprobado ni cobro bancario confirmado.

**136 – revisión documental:** registra el revisor, decisión y evidencia. No crea pagos ni
modifica cuentas. Las observaciones conservan el cobro pendiente y requieren un motivo.
La aprobación documental exige un contrato firmado vigente, un único soporte identificable,
archivo privado verificable, permisos `finance.view` + `finance.edit` y separación del
registrador de la venta.

**137 y 139 – conciliación contable:** comprobación transaccional de modalidad, precio,
reserva acreditada, inicial del plan, posibles pagos por otras vías, referencia bancaria,
método y cuenta receptora. Bloquea `DEMO-*` y referencias previamente confirmadas incluso
dentro de la misma venta. Solo un revisor autorizado confirma y crea `pag_pagos`,
`pag_vouchers`, `fin_movimientos`; en ventas financiadas intenta imputar la inicial
mediante `sp_fin_aplicar_pago_confirmado_v1` en la **misma transacción**. Un error
revierte la transacción completa. No ejecutar estas acciones sin cotejo bancario real.

**138 – lecturas protegidas:** bandeja de pendientes/aprobados, cuentas receptoras reales,
separaciones vencidas con dinero y/o operaciones retenidas. La reserva no cambia de estado
ni libera el lote por abrir la bandeja.

## Situación verificada en Supabase
- 4 cobros de venta pendientes: S/ 69,500; 3 cuentan con archivo y 1 no tiene.
- 2 separaciones vencidas: una con S/ 500 confirmados; otra con un pago registrado.
  Ambas aparecen retenidas por su necesidad de revisión.
- 2 categorías contables de ingreso de ventas creadas, sin usar categorías de separación.
- 0 cuentas receptoras reales habilitadas: la única cuenta disponible empieza por `DEMO-`.
  Por tanto, la conciliación debe mantenerse **bloqueada** hasta configurar una cuenta real.
- Se verificaron los permisos: `anon` y `authenticated` no ejecutan las nuevas RPC.
- La nueva tabla de auditoría tiene RLS activo y acceso directo revocado. Sin políticas
  públicas es intencional: el backend invoca funciones con permisos internos explícitos.

## Pruebas y requisitos para aceptación local
1. Reconstruir `core-service` y `backoffice` desde `fix/correcciones-ventas-finanzas`.
2. En Finanzas abrir **Revisión y cobros de ventas**. Confirmar 4 operaciones por
   S/ 69,500; todas están por verificar hasta que Finanzas actúe.
3. Abrir el soporte de una venta con un comprobante. El rol sin `finance.edit`
   solo puede consultar. El mismo registrador no debe autoaprobar.
4. Seleccionar **Aprobar soporte** únicamente cuando la evidencia haya sido revisada.
   Verificar estado documental aprobado y **saldo sin cambio**.
5. Sin una cuenta receptora real no debería habilitarse **Conciliar**.
   No ingresar datos bancarios ficticios para eludir el bloqueo.
6. Configurada una cuenta real y cotejados los abonos, probar con un registro autorizado.
   Verificar auditoría, pago único, movimiento único y, si aplica, imputación inicial.
7. Intentar reutilizar la referencia de un pago confirmado: debe bloquearse.
8. En **Separaciones vencidas** comprobar que ninguna reserva con pagos se libera
   automáticamente ni cambia de estado por consultar.

## Pendientes expresos
- **No se ha probado la ruta positiva de conciliación**, pues no existe cuenta real
  habilitada. Las pruebas negativas y de permisos sí pasaron sobre Supabase.
- Los comprobantes múltiples por venta requieren desglose de importes, pendiente de
  la etapa de compra multílote. La aprobación automática del conjunto está bloqueada.
- Las ventas sin comprobante necesitan flujo de subsanación/carga posterior.
- Las separaciones vencidas permanecen retenidas hasta una resolución de negocio
  respaldada por revisión financiera. No se ha emitido ninguna anulación/reembolso.
- Más adelante: operación comercial agrupada para múltiples lotes y diferentes modalidades.

No realizar PR ni desplegar desde esta rama sin autorización del usuario.
