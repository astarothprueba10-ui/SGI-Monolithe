# SGI MONOLITHE — staging de MFA con Supabase TEST compartida

## Decisión vigente del proyecto

**Usar la misma base de datos** Supabase TEST `cjwnnroqjltoaqzpxlmh`. No crear proyecto ni rama Supabase adicional, ni generar el costo por hora que se había evaluado. El aislamiento es de aplicaciones Railway y claves JWT/TOTP, **no de los datos**.

Precaución: las pruebas de MFA sobre usuarios existentes podrían cambiar las filas MFA y sus sesiones compartidas con otros servicios que usan TEST. Realizar las pruebas con una cuenta Gerencia controlada, bajo supervisión y sin modificar ventas, separaciones, contratos ni cronogramas.

## Infraestructura preparada

- Railway **proyecto separado**: `sgi-monolithe-mfa-staging` (ID `cba443f6-0346-41ef-a5a6-5c277238dd3d`), entorno `staging` (ID `a5851d25-4851-482e-b8cc-f30e0704c506`). **NO** se ha modificado el proyecto `helpful-ambition` ni su entorno `production`.
- GitHub: `astarothprueba10-ui/SGI-Monolithe`, rama `feature/configuracion-financiamiento`; sin cambios en `main`.
- Auth Service: ID Railway `0a90d10c-c109-4095-9a1e-5a85c9896c55`; raíz `/services/auth-service`, Dockerfile `/services/auth-service/Dockerfile.vercel`, puerto `8081`, salud `/actuator/health`, salida IPv6 habilitada para PostgreSQL directo.
- Backoffice: ID Railway `037b749b-100e-40ba-a2e6-9f11fdd035e9`; raíz `/apps/backoffice`, Dockerfile `/apps/backoffice/Dockerfile.staging`, puerto `5174`, salud `/healthz`. La imagen compila Vite y sirve archivos estáticos por Nginx, sin servidor de desarrollo.
- Fuentes de ambos servicios vinculadas a la rama mediante **cambios staged** que no se han aplicado. **No hay despliegue ni dominio público**.
- Los controles de publicación financiera en Supabase TEST permanecen deshabilitados: `cfg_fin_publicacion_control.habilitado=false`. La versión vigente debe continuar siendo la 1.
- El plan gratuito de Railway no permitió crear un tercer servicio. Por ello, exclusivamente para staging, `GET /api/auth/financing-policies/current` permite consultar la política mediante Auth Service con permiso `financing.configure` y la misma función SQL protegida que Core. La variable `VITE_FINANCING_STAGING_AUTH_CURRENT=true` activa esa ruta **solo en staging**. Core y CMS no se redirigen a producción; Nginx devuelve HTTP 503 para sus rutas. Esta prueba se limita a MFA y editor financiero, no al Backoffice completo.

## Configuración ya realizada (valores confidenciales no registrados aquí)

Auth Service:
- `FINANCING_MFA_ENCRYPTION_KEY_BASE64`: creada y guardada exclusivamente en Railway staging.
- `JWT_PRIVATE_KEY_B64`, `JWT_PUBLIC_KEY_B64`: par exclusivo de pruebas en Railway staging.
- `DB_URL`: JDBC con TLS contra el Postgres **existente** del proyecto TEST.
- `DB_USERNAME=sigi_app_user`: usuario de backend existente. **No se ha creado un usuario PostgreSQL adicional ni se ha cambiado una contraseña**.
- `PORT=8081`; `JPA_SHOW_SQL=false`; `HIBERNATE_FORMAT_SQL=false`.

Backoffice:
- `VITE_AUTH_API_URL=/api/auth` para proxy mismo origen a Auth Service de staging.
- `VITE_FINANCING_STAGING_AUTH_CURRENT=true` para política consultada en Auth sin un Core adicional.
- `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` del mismo proyecto Supabase TEST. La clave anon es pública; ninguna clave `service_role` se coloca en el navegador.
- Funciones CMS de publicación deshabilitadas.

## Datos que faltan para iniciar el despliegue

La conexión OAuth a Railway entrega **los nombres** de las variables de `production`, pero **no sus valores**. Por ello no fue posible ni sería seguro copiar contraseñas de ese entorno.

En el **proyecto Railway staging**, abrir servicio **auth-service → Variables** y completar directamente mediante su gestor de secretos:

1. `DB_PASSWORD`: contraseña vigente del usuario PostgreSQL `sigi_app_user` utilizado por la base Supabase TEST. Nunca introducirla en Git, la URL pública ni el chat.
2. `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`: credenciales SMTP de una cuenta emisora controlada, por ejemplo un buzón de pruebas. Configurar STARTTLS 587 o SSL 465 según el proveedor, usando `MAIL_SSL_ENABLE`, `MAIL_STARTTLS_ENABLE`, `MAIL_STARTTLS_REQUIRED` cuando proceda. El **destinatario** de MFA será el correo principal verificado registrado en la cuenta Gerencia; no tiene por qué coincidir con el emisor SMTP.

**No sustituir las variables anteriores por secretos de ejemplo.** Sin contraseña de BD o SMTP válido, Auth Service puede fallar al iniciar o no entregar códigos.

## Después de configurar ambos secretos

1. Confirmar de nuevo que `DB_URL` apunta a TEST y que el candado de publicación sigue **false**.
2. Aceptar cambios staged en el entorno `staging` (NO producción), desplegando primero Auth Service y verificando `/actuator/health`, luego Backoffice. Generar un dominio exclusivo de staging solo tras asegurar el acceso.
3. Iniciar sesión con una cuenta Gerencia controlada cuyo correo principal esté verificado, sin compartir la contraseña. Supabase TEST tiene tres cuentas Gerencia con correo principal activo/verificado (y otras dos sin verificar).
4. Probar OTP correo, enrolamiento TOTP, replay, límites, revocación y recuperación. No activar la publicación hasta cerrar todas las pruebas y autorización formal.
5. Revisar auditoría y sesiones, y comparar que ventas (10), planes (5) y política activa (v1) no hayan cambiado durante las pruebas de MFA.

## Riesgos asumidos por compartir la base

- Al utilizar la misma base, **las credenciales de usuario, estados de MFA y sesiones no están aislados por ambiente**; una revocación o bloqueo de seguridad puede impactar un inicio de sesión en cualquier otro servicio que use TEST.
- No hacer publicaciones financieras de ensayo ni registrar separaciones o ventas ficticias en la base con operaciones existentes. Para la futura prueba transaccional completa, usar una ventana controlada o datos de ensayo autorizados sin tocar clientes reales.
- Al finalizar, eliminar los recursos de staging que ya no se usen y revocar claves de prueba; las credenciales enviadas a Railway nunca deben registrarse en repositorios.

**ESTADO:** proyecto y servicios configurados; despliegue detenido por `DB_PASSWORD` y SMTP aún no cargados. No hay una nueva base de datos ni se generó cargo de rama Supabase.
