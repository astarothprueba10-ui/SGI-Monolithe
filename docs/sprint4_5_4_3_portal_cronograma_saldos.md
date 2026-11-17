# SGI-MONOLITHE — Sprint 4 / 5.4.3
## Portal Cliente — Cronograma, cuotas, saldos y movimientos confirmados

### Alcance
El Portal Cliente consume exclusivamente datos financieros **reales** de sus compras.
No recibe IDs de venta, cliente, cuota o plan desde el navegador; el backend
determina la identidad desde el JWT validado. No se duplican motores
financieros y no se ejecutan escrituras desde la pantalla.

### Supabase de testeo
**Migración:** 97_portal_cliente_cronograma_privado_v1.sql.

**Función:** sp_portal_cliente_cronograma_v1(p_actor bigint) -> jsonb.

- Reutiliza sp_portal_cliente_resumen_v1 para validar usuario, rol CLIENTE
  vigente, asociación persona-cliente, compras propias y plan firmado activo.
- Verifica otra vez que cada plan pertenece a la venta autorizada, está vigente
  y tiene contrato VIGENTE con firma registrada.
- Obtiene cuotas **registradas**, nunca proyectadas, de pag_cuotas.
- Reutiliza fn_fin_saldo_cuota_confirmado_v1 y
  fn_crm_clasificar_cuota_v1 (motor 5.2.4 y 5.2.5).
- Conserva la clasificación **PARCIAL** cuando existe un abono confirmado,
  aun si hay atraso. Expone cuotaAtrasada, diasMora y proxima7Dias.
- Los movimientos son **aplicaciones activas de pagos CONFIRMADOS** a
  CUOTA o INICIAL. Un pago REGISTRADO, un voucher pendiente, un pago
  confirmado sin aplicar y una aplicación anulada no figuran como abono.
- La inicial adicional sin aplicación confirmada se presenta **por conciliar**,
  no como mora; la reserva acreditada no se descuenta dos veces.
- No se divulgan archivos de vouchers, claves de Storage, rutas, hashes,
  datos de otros clientes ni documentos internos.

**Seguridad:** SECURITY DEFINER con search_path fijo, autorización
en el procedimiento de identidad reutilizado, verificación adicional de plan,
EXECUTE revocado a PUBLIC, anon, authenticated, concedido solo a
sigi_app_user. Sin permisos públicos de lectura sobre tablas financieras.

### Core Service
GET /api/core/portal-cliente/cronograma:
- Control Spring ROLE_CLIENTE;
- actor extraído exclusivamente de Jwt.getSubject();
- respuesta JSON con Cache-Control: no-store;
- sin parámetros de identificadores ajenos;
- servicios de solo lectura.

### Portal Cliente
La ruta /portal/cronograma deja de usar src/data/portal.ts y muestra:
- selección entre las propias compras (si hay más de una);
- detalle de vencimientos, capital, interés, cuota, abono confirmado,
  saldo y estado calculado;
- filtros por estado, cuotas atrasadas o vencimientos a siete días;
- resumen financiero contractual, inicial por conciliar y reserva;
- movimientos confirmados y aplicados al plan propio.

La interfaz diferencia ausencia de compras, plan no firmado/activo,
sesión expirada y fallo de Core Service; no usa cantidades ficticias.
No genera descargas ni presenta vouchers pendientes como aprobados.

### Validaciones y límites
- Supabase original de testeo: cuenta autorizada con una operación
  recuperó 36 cuotas y 1 aplicación confirmada; primera cuota
  PAGADA con S/ 2,400 aplicados; saldo de cuotas S/ 84,000.
- Cuenta sin operaciones devolvió items: [].
- Cuenta no autorizada devolvió PORTAL_ACCESO_DENEGADO.
- Permisos SQL: anon=false, authenticated=false,
  sigi_app_user=true.
- CI: Java, TypeScript y PostgreSQL 17 mediante
  portal_cronograma_privado_v1_pg_test.sql y fixtures sintéticos.
  Las pruebas funcionales manuales integrales quedan reservadas
  para el cierre del Sprint 4.

**No forma parte de 5.4.3:** carga/seguimiento de vouchers (5.4.4),
lectura documental y notificaciones privadas (5.4.5), pruebas manuales
integrales (5.4.6). Sin PR, sin merge a main y sin despliegue.
