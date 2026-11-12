# SGI-MONOLITHE — Sprint 4 / 5.4.4
## Portal Cliente: comprobantes privados y seguimiento de revisión

### Objetivo y alcance
Reemplazar `Pagos.tsx` y `RegistrarPagoForm.tsx` de prototipo por lectura y presentación de comprobantes de **compras realmente vinculadas al JWT de un cliente**. Reutiliza el ciclo contable de Finanzas 5.3 (migraciones 84–94) sin introducir pagos automáticos ni repetir el motor de saldos.

### Migración Supabase de testeo
`98_portal_cliente_vouchers_privados_v1.sql`:
- `sp_portal_cliente_vouchers_v1(actor)`: lista operaciones, saldos de cuotas e inicial, métodos activos e historial de vouchers de las compras del actor. Su fuente es `pag_cargas_voucher_cuota`, `pag_cargas_voucher_inicial_v1` y tablas de pagos de Finanzas; no hay datos simulados.
- `sp_portal_cliente_preparar_voucher_v1(actor,venta,destino,cuota,...)`: valida cuenta CLIENTE y asociación del comprador, contrato VIGENTE firmado, plan ACTIVO, cuota del mismo plan, saldo confirmado, monto <= saldo y archivo permitido. Genera intento de carga temporal (30 minutos) y clave privada únicamente del lado servidor.
- `sp_portal_cliente_registrar_voucher_v1(actor,idCarga,destino)`: verifica titular de la preparación, archivo realmente cargado, MIME y tamaño, vigencia, número de operación duplicado y saldo. Inserta en las **mismas tablas** usadas por el circuito de revisión de Finanzas; reintentos son idempotentes.

Las tres funciones son `SECURITY DEFINER` con `search_path` fijo y EXECUTE revocado a `PUBLIC`, `anon` y `authenticated`; solo `sigi_app_user` puede ejecutarlas.

### Core Service
Todos los endpoints están bajo `/api/core/portal-cliente`, con `@PreAuthorize("hasAuthority('ROLE_CLIENTE')")`, actor extraído de `Jwt.getSubject()` y `Cache-Control: no-store`:
- `GET /vouchers`: compras, opciones e historial de registros propios.
- `POST /vouchers/preparar-carga`: acepta la venta/cuota seleccionada, pero valida en SQL que pertenecen al actor; backend firma URL temporal de **vouchers-ventas-private**, no se entrega ninguna clave de servicio.
- `POST /vouchers/registrar?destino=CUOTA|INICIAL`: finaliza con `idCarga` emitido por la preparación. No permite seleccionar arbitrariamente la ruta de Storage.
El backend reutiliza el componente `CrmSeparacionStorageService` para generar enlaces de subida firmados por servidor.

### Portal Cliente
- Pantalla **Pagos** consulta Core Service y no importa `src/data/portal`.
- Historial por estado **PENDIENTE, APROBADO, RECHAZADO**; muestra motivo de rechazo y monto **efectivamente aplicado**, diferente del aprobado.
- Formulario asociado solo a compras propias: cuota o inicial adicional, método habilitado, fecha, número de operación y PDF/JPG/PNG/WebP <=5 MiB.
- Subida `uploadToSignedUrl` hacia Storage privado sin usar claves de servicio en React; confirma después el registro SQL y permite reintentar `idCarga` si falla la finalización.
- No se ofrecen botones de descarga que no estén autorizados. El acceso temporal de lectura de vouchers propios, si se requiere, se integrará posteriormente con permisos independientes.

### Regla contable invariable
**Subida de archivo != pago confirmado != pago aplicado.**
Registrar un voucher crea `pag_pagos.estado=REGISTRADO` y `pag_vouchers.estado=PENDIENTE`, sin tocar `pag_aplicaciones_pago` ni reducir `pag_cuotas`. Finanzas revisa con los mismos procedimientos 86/93; solo las imputaciones confirmadas del bloque 5.3.4 reducen el saldo mostrado en 5.4.3.

### Seguridad y pruebas
- Supabase original de testeo: actor cliente autorizado con 1 compra, 35 cuotas pendientes, 5 métodos y 0 vouchers, sin exponer rutas. Actor sin rol CLIENTE rechazado.
- Prueba de preparación y rechazo por archivo inexistente comprobada sin persistir pagos ni registros de prueba.
- PostgreSQL 17 en CI: `database/tests/portal_vouchers_privados_v1_pg_test.sql`, fixtures sintéticos; comprueba aislamiento entre compradores, venta ajena, saldo excedido, validación Storage, idempotencia, no imputación y reversión de prueba.
- Java: pruebas de servicio sobre identidad JWT y denegación de compras ajenas.
- Compilación React/TypeScript del Portal Cliente y pruebas Java se validan con CI.
- **Pendiente al cierre de Sprint:** prueba funcional real integrada Portal → Storage → Finanzas → imputaciones, usuarios de prueba y aprobación de aceptación (5.4.6).

### Ramas y entregas
El trabajo se conserva solo en `feature/pagosy-financiamiento-sprint-4`, sin PR, merge a `main` ni despliegue de Portal, Core o Supabase a producción. La migración 98 se aplicó únicamente a la base de **testeo**.
