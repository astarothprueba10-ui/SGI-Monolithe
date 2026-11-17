# SGI-MONOLITHE — Sprint 4, bloque 5.4: Portal Cliente

## Decisión de trabajo
Se culminará el Sprint 4 y se reservarán las **pruebas funcionales manuales entre
Backoffice y Portal Cliente para el cierre del sprint**, por indicación del usuario.
Se mantienen las pruebas automáticas de compilación, regresión y seguridad durante
el desarrollo. No hacer merge a main ni desplegar aplicaciones.

## Actividades propuestas para el bloque 5.4
| Actividad | Resultado esperado |
|---|---|
| 5.4.1 | Identidad JWT, ámbito privado de ventas y panel de resumen financiero real |
| 5.4.2 | Mi lote, proyecto y contratos, estrictamente del comprador |
| 5.4.3 | Cronograma y estados de cuotas, saldos y movimientos confirmados |
| 5.4.4 | Carga real de vouchers por cliente y seguimiento de revisión |
| 5.4.5 | Documentación, alertas de pago y perfil del cliente |
| 5.4.6 | Integración total y preparación de las pruebas finales de Sprint 4 |

Esta subdivisión se propone para gestionar la implementación; no proviene
de una rúbrica del repositorio.

## 5.4.1 — Acceso y resumen del comprador

**Migración**: `database/migrations/95_portal_cliente_resumen_privado_v1.sql`.
**API**: `GET /api/core/portal-cliente/resumen` (JWT, `ROLE_CLIENTE`).
**Backoffice**: sin cambios en reglas financieras.
**Portal**: `/portal` presenta las compras reales del usuario.

El procedimiento `sp_portal_cliente_resumen_v1(p_actor)`:
1. Obtiene la identidad de la persona desde `seg_usuarios.id_persona`.
   Requiere rol `CLIENTE` activo, cuenta activa y no bloqueada;
   nunca acepta `id_cliente`, `id_persona` ni `id_venta` externos.
2. Devuelve ventas vinculadas por
   `seg_usuarios → core_personas → crm_clientes →
   ven_ventas_clientes → ven_ventas`. Puede devolver varias
   operaciones o ninguna. Si no hay venta vinculada, **no genera una ficticia**.
3. Recupera proyecto, manzana, etapa, lote, área y precio pactado.
4. Solo incluye financiamiento si existe un plan vigente ACTIVO
   y contrato VIGENTE firmado. Nunca muestra como exigible un
   cronograma pendiente de firma.
5. El saldo de cuotas se deriva de
   `fn_fin_saldo_cuota_confirmado_v1`, de aplicaciones activas
   de pagos CONFIRMADOS. El saldo de inicial adicional se calcula
   por separado desde aplicaciones INICIAL confirmadas.
   La reserva acreditada se informa como concepto independiente.
6. La próxima cuota es la primera con saldo pendiente; nunca se
   deduce de los ejemplos de `src/data/portal.ts`.

**Privacidad:** Función `SECURITY DEFINER` con `search_path`
limitado, controles explícitos de titularidad y EXECUTE revocado a
`PUBLIC`, `anon` y `authenticated`. El rol interno
`sigi_app_user` es el único autorizado. Core Service deriva el actor
del `Jwt.getSubject()` verificado por Spring y controla `ROLE_CLIENTE`.
El endpoint devuelve `Cache-Control: no-store`.

**Interfaz:** Se creó cliente HTTP con
`VITE_CORE_API_URL`, JWT Bearer y `cache: no-store`.
El resumen muestra un estado de carga, error de acceso y estado
vacío real. Se han suspendido temporalmente las otras páginas que
continúan leyendo de `src/data/portal.ts` (lote, cronograma, pagos,
documentos, asesor, soporte, perfil), mediante una pantalla clara
de «en integración». Se habilitarán una a una en 5.4.2–5.4.5.
Se retiraron las notificaciones y tickets de demostración del
encabezado visible y el peligroso RPC con IDs fijos del formulario
anterior; el formulario nuevo de cliente pertenecerá a 5.4.4.
No se vuelve a mostrar la fecha congelada del prototipo.

## Auditoría de Supabase de testeo, 11 de noviembre de 2026
- Migración 95 instalada satisfactoriamente sin modificar datos de prueba.
- Un usuario CLIENTE con compra vigente recibió únicamente su
  operación (venta 2) y su saldo real; con cuota primera pagada, se
  devolvió como próxima la segunda cuota.
- Otro CLIENTE sin ventas vinculadas obtuvo `operaciones: []`.
- Un usuario sin acceso CLIENTE y una cuenta sin estado de acceso
  permitido recibieron `PORTAL_ACCESO_DENEGADO`.
- Permisos verificados: `anon=false`, `authenticated=false`,
  `sigi_app_user=true` para ejecutar la función.
- El histórico del plan 2 conserva su interés contractual 0%;
  **no se sustituye por 10% retroactivamente**.

## Criterios del cierre Sprint 4
Cuando se completen las actividades 5.4.2–5.4.6:
- iniciar sesión como dos clientes diferentes;
- comprobar que ninguno consulte compras o documentos del otro;
- registrar vouchers mediante Storage privado;
- aprobar desde Finanzas con usuario distinto;
- imputar y comprobar saldos y estados de cuotas reales;
- revisar alertas y soporte;
- verificar reversiones, errores, expiración de sesión y
  observabilidad;
- no unir a `main` ni desplegar antes de autorización.

**Estado:** 5.4.1 implementado y pendiente de aceptación funcional manual
junto con el resto del Sprint 4. El bloque 5.4 completo está en progreso.
