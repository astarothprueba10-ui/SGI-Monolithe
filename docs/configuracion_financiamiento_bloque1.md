# SGI MONOLITHE — Configuración de planes de financiamiento

**Rama:** `feature/configuracion-financiamiento` (creada desde main, merge #101).  
**Entorno de aplicación de SQL:** Supabase TEST `cjwnnroqjltoaqzpxlmh`.  
**No desplegar en producción, ni crear PR, ni modificar main sin autorización.**

## Bloque 1 — Implementado: catálogo inmutable y lectura de Gerencia

La migración `database/migrations/106_financiamiento_politicas_versionadas_v1.sql` introduce:

1. `public.cfg_fin_politicas_versiones`: versiones históricas inmutables. `BEFORE UPDATE OR DELETE` rechaza cualquier modificación; columnas numéricas validadas (interés, separación, inicial MINIMA/RANGO/FIJA, cuotas, plazo, método francés, moneda).
2. `public.cfg_fin_politica_activa`: puntero único a la versión de referencia actual. Ningún acceso web puede modificarlo directamente.
3. Permiso nuevo `financing.configure` (el disparador existente de seguridad lo asigna al rol Gerencia). En la función lectora se exige además la existencia de rol `GERENCIA` activo, evitando confiar en un permiso añadido manualmente a otro rol.
4. `public.sp_fin_consultar_politicas_v1(p_actor bigint)`: función de consulta con `SECURITY DEFINER`, `search_path` explícito, doble comprobación de identidad/permiso y respuesta JSON con configuración e historial. `EXECUTE` está concedido únicamente a `sigi_app_user`; sin acceso `anon`, `authenticated` ni `service_role`. Las tablas tienen RLS habilitado, sin políticas de acceso directo y privilegios revocados.
5. Política base V1 (copia de condiciones verificadas del motor SQL anterior): **separación S/ 500; inicial mínima S/ 5,000; interés 10% nominal anual, NO 10% efectivo anual; cuotas 1–36; 7 días calendario de reserva; amortización francesa, PEN**.

### Integración Backoffice y Core

- `CrmVentaController.java`: `GET /api/core/crm/financiamiento/configuracion/actual`; autorización JWT `financing.configure`, `Cache-Control: no-store`.
- `CrmVentaService.java`: llamada SQL parametrizada y lectura exclusiva del actor obtenido del JWT.
- `financingConfigService.ts`: cliente HTTP tipado; **GET solamente**.
- `ConfiguracionPlanesFinanciamientoPanel.tsx`: visualización corporativa de seis parámetros e historial; interfaz expresamente de **solo lectura**.
- `CarteraFinanciamientoPanel.tsx`: tercera pestaña `Configuración de planes de financiamiento`, visible solo si `can('financing.configure') && user.roles.includes('Gerencia')`. Enlaces manuales con `?tab=configuracion` se ignoran para usuarios no autorizados. Las pestañas previas no se modifican.
- `configuracionFinanciamiento.test.mjs`: pruebas estructurales de permisos y compatibilidad, integradas en CI.

**Actualización posterior al Bloque 2:** el motor de nuevas operaciones ya obtiene políticas versionadas y guarda snapshots. Este párrafo del Bloque 1 documentaba un estado previo. Sigue sin existir un endpoint de edición o publicación: está bloqueado hasta completar TOTP y auditoría. Las ventas y cuotas históricas permanecen intactas.

### Validaciones realizadas en TEST

- Versión registrada 1 con 500 / 5000 / 10 TNA / 1–36 / 7 días / FRANCÉS / PEN.
- Ventas existentes = 10; planes de pago existentes = 5 antes y después de la migración.
- Actor Gerencia autorizado recibe JSON con `publicacionHabilitada=false`, `requiereTotp=true`.
- Actor inválido denegado; intento de modificar versión publicada bloqueado con `POLITICA_INMUTABLE`.
- `anon` / `authenticated` no pueden ejecutar la función ni leer las tablas. El servidor sí puede ejecutar la función, pero tampoco puede leer directamente las tablas.
- Asignación de permiso únicamente a GERENCIA; acceso de otros roles requiere rol Gerencia efectivo además del permiso.
- Aviso `rls_enabled_no_policy` en Supabase Advisors es intencional para estas dos tablas internas: RLS cerrada por defecto y sin acceso directo.

## Bloque 2 — Integración transaccional implementada en TEST

Migraciones aplicadas, versionadas en GitHub y confirmadas en Supabase TEST:

- **107:** agrega el identificador y snapshot JSON inmutables a nuevas reservas, ventas y planes. Los datos históricos quedan sin retroactividad (campos NULL).
- **108:** motor francés que toma tasa nominal anual, inicial y número de cuotas de la política aceptada; ajusta la última cuota para cerrar el saldo.
- **109:** conserva el orden de operaciones decimales del motor histórico al calcular intereses.
- **110:** integra la política a la separación, validación de venta, registro pendiente y aprobación de firma.
- **111:** comprueba de forma transaccional `idPoliticaEsperada` sobre la política correspondiente a la operación (incluida una separación vigente). Si cambió, detiene el registro con `POLITICA_CAMBIO`. El servicio traduce ese conflicto a **HTTP 409**.

El formulario de ventas consulta `GET /api/core/crm/financiamiento/condiciones-venta`, presenta las condiciones del prospecto y lote y confirma usando la versión aceptada. La política de una separación vigente se respeta hasta su vencimiento; no se cambia por una versión publicada después. No se recalculan ni reescriben contratos ni cronogramas anteriores.

**Control de datos en TEST (17/11/2026):** política activa versión 1 (S/ 500 de separación, inicial mínima S/ 5,000, 10% TNA, 1–36 cuotas, 7 días, francés). Permanecen 10 ventas y 5 planes históricos; ninguno recibió un snapshot retroactivo. La política vigente sigue en solo lectura; el Bloque 4 permite preparar borradores, pero el control SQL mantiene bloqueada la publicación hasta completar el enrolamiento TOTP de Gerencia.

**Pruebas adicionales pendientes:** registrar una operación de prueba completa en entorno aislado, recorrer firma y cronograma, verificar snapshots en las tres tablas y simular un cambio concurrente de política una vez exista publicación autorizada por TOTP. No crear ventas de prueba sobre datos de clientes existentes.

## Bloque 3 — MFA TOTP implementado en rama y SQL TEST; enrolamiento requiere habilitación segura

La migración **112** está aplicada en Supabase TEST y el código del flujo de enrolamiento,
verificación TOTP, códigos de recuperación de un único uso, revocación y autorización breve
se encuentra en `services/auth-service` y Backoffice. Más detalles y requisitos:
`docs/financiamiento_mfa_bloque3.md`.

**No confundir código implementado con factor operativo:** antes de activar MFA real se requiere
`FINANCING_MFA_ENCRYPTION_KEY_BASE64` en el gestor de secretos, SMTP operativo
y correo principal registrado de Gerencia verificado, personal o corporativo. Ningún secreto debe registrarse en Git.
Actualmente no se habilita publicación, ni en frontend ni en SQL.

## Bloque 4 — Implementado en rama y TEST, publicación todavía bloqueada

Las migraciones **113, 114, 115 y 116** permiten preparar borradores canónicos, obtener hash SHA-256, aprobar con TOTP de 120 segundos y publicar una nueva versión en una transacción con auditoría. El control cfg_fin_publicacion_control permanece **false** y no se abrirá hasta completar la prueba funcional del Bloque 3 y aprobación de Seguridad. Ver detalles en docs/financiamiento_publicacion_bloque4.md.



### Requisitos de seguridad satisfechos por el Bloque 3 (con activación operativa pendiente)

- Activación del primer factor basada en verificación independiente de identidad y sesión reciente, **no solo contraseña o permiso JWT**. Nunca exponer QR a una sesión comprometida sin esta verificación.
- Secreto por gerente (mínimo 160 bits aleatorios), cifrado autenticado en el servidor mediante clave en gestor de secretos / variable de entorno segura. Nunca al frontend, logs, migraciones ni auditoría.
- TOTP de 6 dígitos, paso de 30 segundos, ventana temporal limitada, rechazo de reutilización de un paso aceptado; límite de intentos, bloqueo y avisos de seguridad.
- Vincular autorización de un cambio al usuario, hash canónico de los parámetros, versión actual, nonce único y caducidad corta; no emitir autorizaciones reutilizables para distintos cambios.
- Recuperación: códigos de recuperación individuales de un uso, conservados como hashes; revocación de dispositivos y segunda verificación fuera de banda o proceso administrativo independiente. No recuperar únicamente por correo de la cuenta comprometida.
- TOTP NO es resistente a phishing como WebAuthn; limitar el riesgo con confirmación explícita y verificaciones adicionales.

### Bloque 4 — Publicación y auditoría de cambios

- Formulario editable de borrador para gerente con campos, simulación y vista previa de variaciones.
- Confirmación de TOTP y publicación atómica en SQL con `SELECT ... FOR UPDATE` sobre puntero activo, comprobación de `version_actual` esperada y control antirrepetición.
- La política publicada y evento `aud_eventos` (actor, antes, después, motivo, versión, fecha, solicitud, IP si disponible) se confirman **en la misma transacción**. Sin auditoría, no hay publicación.
- Nunca permitir UPDATE/DELETE de versiones, ni modificar ventas y cronogramas formalizados. Toda reversión se implementa como **nueva versión**.
- Notificación al gerente por canal verificado, y opcional segunda aprobación para cambios de alto impacto.

## Manual: usar rama y Docker local

Desde `C:\SGI-Monolithe\SGI-Monolithe`:

```cmd
git status --short
git fetch origin
git switch --track origin/feature/configuracion-financiamiento
docker compose up -d --build core-service backoffice
```

Iniciar sesión **nuevamente** como Gerencia para renovar los permisos incluidos en el JWT. Abrir `http://localhost:5174/financiamiento?tab=configuracion`: aparecen la política real y el editor de borradores. La vista previa no altera datos; el botón de publicación sigue bloqueado desde PostgreSQL. Para Asesor/Finanzas/Admin sin rol Gerencia, la pestaña debe estar oculta y el endpoint debe responder 403.

Para probar y habilitar publicación sí se requiere TOTP funcional, correo principal registrado y verificado y clave de cifrado en Auth Service, en un entorno aislado. No activar el control de publicación ni tocar Railway production hasta completar los criterios de aceptación.
