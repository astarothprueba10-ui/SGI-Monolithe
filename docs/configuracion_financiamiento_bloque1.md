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

**Importante:** tener una política registrada **NO** significa que el motor de ventas la esté utilizando. En esta fase no existe endpoint de publicación ni funcionalidad de edición. Los procedimientos antiguos mantienen sus valores fijos para evitar cambios de conducta antes de terminar el control de seguridad y snapshots contractuales. Las ventas registradas y sus cuotas son intactas.

### Validaciones realizadas en TEST

- Versión registrada 1 con 500 / 5000 / 10 TNA / 1–36 / 7 días / FRANCÉS / PEN.
- Ventas existentes = 10; planes de pago existentes = 5 antes y después de la migración.
- Actor Gerencia autorizado recibe JSON con `publicacionHabilitada=false`, `requiereTotp=true`.
- Actor inválido denegado; intento de modificar versión publicada bloqueado con `POLITICA_INMUTABLE`.
- `anon` / `authenticated` no pueden ejecutar la función ni leer las tablas. El servidor sí puede ejecutar la función, pero tampoco puede leer directamente las tablas.
- Asignación de permiso únicamente a GERENCIA; acceso de otros roles requiere rol Gerencia efectivo además del permiso.
- Aviso `rls_enabled_no_policy` en Supabase Advisors es intencional para estas dos tablas internas: RLS cerrada por defecto y sin acceso directo.

## Bloques pendientes (NO habilitados todavía)

### Bloque 2 — Integración transaccional y snapshots

- Conectar el motor francés con la **versión vigente al instante de aceptación de la operación**, en lugar de tasas fijas.
- Crear funciones SQL **nuevas**, sin modificar ni recalcular cronogramas históricos.
- Congelar `id_politica` y una fotografía JSON de los parámetros en separaciones y operaciones nuevas, así como su fecha de aplicación; respetar ofertas aceptadas hasta el vencimiento de separación.
- Validar en la misma transacción la tasa y la inicial en simulación, formalización, generación de cuotas y firma. El cliente jamás podrá enviar una tasa efectiva distinta de la aprobada.
- Ceros de interés, redondeo y cuota final: pruebas en PostgreSQL 17 con casos extremos, incluyendo concurrencia de venta mientras se publica otra versión.

### Bloque 3 — Autenticación reforzada TOTP para Gerencia

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

Iniciar sesión **nuevamente** como Gerencia para renovar los permisos incluidos en el JWT. Abrir `http://localhost:5174/financiamiento?tab=configuracion`: aparecen política y 6 parámetros reales, y no existe opción para modificar. Para Asesor/Finanzas/Admin sin rol Gerencia, la pestaña debe estar oculta y el endpoint debe responder 403.

No se requiere instalar Google Authenticator ni configurar secretos todavía; el factor se activará únicamente al implementar el Bloque 3.
