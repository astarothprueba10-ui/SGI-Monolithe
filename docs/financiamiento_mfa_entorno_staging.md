# SGI MONOLITHE — entorno independiente para pruebas MFA y publicación

## Recursos preparados (18/11/2026)

- Repositorio: `astarothprueba10-ui/SGI-Monolithe`, rama **feature/configuracion-financiamiento**. No tocar `main`.
- Railway: proyecto **sgi-monolithe-mfa-staging** (ID `cba443f6-0346-41ef-a5a6-5c277238dd3d`), entorno **staging** (ID `a5851d25-4851-482e-b8cc-f30e0704c506`), privado. Ningún cambio aplicado al proyecto Railway `helpful-ambition` / `production`.
- Auth Service: servicio ID `0a90d10c-c109-4095-9a1e-5a85c9896c55`, raíz `/services/auth-service`, Dockerfile `/services/auth-service/Dockerfile.vercel`, healthcheck `/actuator/health`, puerto 8081.
- Backoffice: servicio ID `037b749b-100e-40ba-a2e6-9f11fdd035e9`, raíz `/apps/backoffice`, Dockerfile `/apps/backoffice/Dockerfile`, healthcheck `/`, puerto 5174.
- Fuentes GitHub **preparadas como cambios staged**, NO desplegadas. No aceptar/aplicar esos cambios hasta configurar DB, correo y conectividad.
- En Auth Service se configuraron en las variables de Railway **FINANCING_MFA_ENCRYPTION_KEY_BASE64**, `JWT_PRIVATE_KEY_B64`, `JWT_PUBLIC_KEY_B64` y `PORT`. Clave de AES y firma JWT **exclusivas de pruebas**, nunca en Git.
- Backoffice: rutas proxy relativas `/api/auth` y `/api/core`; `AUTH_PROXY_TARGET=http://auth-service.railway.internal:8081`; opciones de publicación CMS deshabilitadas. `CORE_PROXY_TARGET` tiene destino nominal de staging y NO debe apuntar a producción.

## Bloqueos externos antes del primer despliegue

1. **Base de datos realmente independiente**. Se intentó crear la rama Supabase `financing-mfa-isolated-test` bajo `cjwnnroqjltoaqzpxlmh`. Supabase exige confirmación previa del costo: **USD 0.01344/h**, más consumo aplicable. Se consultó la tarifa, **pero la rama NO fue creada**. Obtener aprobación explícita y usar el flujo Supabase `confirm_cost` → `create_branch`. Tras crearla, verificar que contiene el esquema completo, migraciones 106–116 y controles MFA; las ramas nuevas no copian los datos de usuarios existentes. **No utilizar ni clonar datos comerciales reales**.
2. **Credenciales de base de datos**. Auth Service necesita `DB_URL` (JDBC PostgreSQL de la nueva rama), `DB_USERNAME` y `DB_PASSWORD`. Configurarlas SOLO en el proyecto staging mediante el gestor de variables de Railway. No copiar valores desde producción ni registrarlos en Git, tickets o chat.
3. **Correo SMTP de pruebas**. Auth Service necesita `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` y `MAIL_FROM` con TLS apropiado; usar casilla/proveedor sandbox o una cuenta emisora controlada. Las credenciales de production son ilegibles desde la integración OAuth y deliberadamente **NO se han copiado**.
4. **Core Service necesario para la pantalla financiera**. Backoffice consulta política actual en Core Service: `GET /api/core/crm/financiamiento/configuracion/actual`. El plan gratuito de Railway rechazó crear el tercer servicio debido al límite de recursos. El proyecto staging conserva los **dos** servicios solicitados (Auth y Backoffice); la integración completa requiere ampliar el límite o desplegar Core aislado en otra plataforma, conectado a la MISMA rama Supabase y verificador de JWT TEST. `CORE_PROXY_TARGET` no debe apuntar a producción.
5. **Usuario Gerencia de pruebas**. Los datos de usuarios y contraseñas no se copian a nuevas ramas Supabase. Crear una identidad de prueba con rol y permiso `financing.configure`; verificar por el flujo oficial su correo principal, sea Gmail, Outlook o corporativo. No marcar `verificado=true` manualmente.

## Flujo de activación, SOLO después de resolver bloqueos

1. Confirmar el esquema TEST aislado y la política GENERAL v1, y comprobar `cfg_fin_publicacion_control.habilitado=false`.
2. Configurar variables privadas de la nueva rama y SMTP de pruebas; configurar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` publicable de ESA rama para el navegador, sin usar una clave `service_role`.
3. Verificar conectividad privada de Core↔Auth y de Backoffice↔Auth/Core; publicar URL(s) de staging. La ruta /api/auth en la UI deberá permanecer proxy mismo origen.
4. Desplegar desde `feature/configuracion-financiamiento` y comprobar healthchecks, logs y autorización de JWT TEST, sin exponer secretos.
5. Ejecutar enrolamiento MFA contraseña → email OTP → app TOTP → confirm, replay, intentos y recuperación. Luego ensayar la publicación completa contra **datos ficticios**, con aprobación y ventana temporal controlada.
6. Verificar auditoría, versionado, antirreplay y persistencia de snapshots; retornar el control de publicación a false tras el ejercicio.

## Seguridad

- El entorno `staging` aún no tiene fuentes desplegadas ni dominios públicos. La publicación en Supabase existente sigue deshabilitada.
- Nunca usar claves JWT de producción para staging; no compartir secretos AES, contraseña de BD ni SMTP entre ambientes.
- Antes de habilitar cualquier publicación exigir pruebas funcionales y autorización de Gerencia/Seguridad.
- Tras completar las pruebas, eliminar recursos de staging no necesarios para evitar costos recurrentes.

**ESTADO: preparado y seguro; despliegue BLOQUEADO hasta aprobación de costo Supabase y configuración de dependencias externas.**
