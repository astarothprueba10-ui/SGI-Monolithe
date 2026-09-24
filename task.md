# Auditoría SGI-Monolithe — 2026-09-23

## 🔴 CRÍTICO (Hacer primero)
- [ ] Revocar y rotar inmediatamente la contraseña de Supabase expuesta en `scripts/test_supabase.py` y eliminarla del historial Git — permite acceso directo como `postgres` a la base de datos.
- [ ] Corregir `scripts/test_supabase.py` para exigir credenciales por entorno y validar TLS con `CERT_REQUIRED` y hostname habilitado — actualmente acepta certificados no confiables en una conexión PostgreSQL remota.
- [ ] Restringir `EXECUTE` de `sp_cambiar_estado_lote` y `sp_registrar_separacion`, validar identidad/rol dentro de las funciones y derivar el usuario desde claims — son `SECURITY DEFINER` invocables por clientes sin autorización suficiente.
- [ ] Corregir la política RLS de `cms_consultas_web` para que solo personal autorizado pueda leer leads — `authenticated` hoy puede consultar nombres, correos, teléfonos y mensajes de todos los clientes.
- [ ] Auditar y endurecer todas las políticas RLS de tablas sensibles y RPC, incluyendo `search_path` de funciones `SECURITY DEFINER` — la integridad actual depende demasiado de permisos implícitos de Supabase.
- [ ] Separar configuración de desarrollo y producción y eliminar Vite dev servers expuestos como servicio operativo — Compose publica puertos en todas las interfaces y expone HMR/código fuente sin TLS.
- [ ] Retirar `SUPABASE_DB_*` y cualquier secreto de los entornos de frontend y de `env_file` compartidos — el navegador solo debe recibir variables públicas `VITE_*`.

## 🟡 IMPORTANTE (Esta semana)
- [ ] Definir una única ruta de acceso a datos para cada caso de uso — el acceso directo desde React a Supabase junto con Spring Boot/JPA duplica autorización, validación y reglas de negocio.
- [ ] Crear un paquete compartido para tipos TypeScript, cliente Supabase, autenticación, `cn`, formateadores y componentes UI comunes — `Button`, `Card`, `Feedback`, `supabase.ts`, `client.ts`, `format.ts` y `projects.ts` están repetidos entre aplicaciones.
- [ ] Consolidar `database/migrations` como fuente única y convertir `docs/05_base_de_datos` en documentación/enlaces — varias migraciones son copias byte a byte y los scripts históricos divergen.
- [ ] Añadir pruebas de integración para autorización, RLS, RPC y controladores de `services/cms-service` — la cobertura automatizada existente se concentra en seguridad y servicios de `services/auth-service`.
- [ ] Añadir pruebas de contrato entre `services/auth-service`, `services/cms-service` y los tres clientes — ambos backends duplican configuración JWT/CORS y no hay garantía automatizada de compatibilidad de claims.
- [ ] Desactivar `spring.jpa.show-sql` y revisar exposición de Actuator antes de producción — evita filtrar consultas/datos y reduce superficie operativa.
- [ ] Normalizar variables de entorno y nombres (`VITE_API_URL`, `VITE_WEB_API_URL`, `SUPABASE_URL`, `VITE_SUPABASE_URL`, `CORS_ALLOWED_ORIGINS`) en una plantilla central — hoy scripts, Compose y frontends no usan el mismo contrato.
- [ ] Fijar versiones de dependencias y usar `npm ci` con lockfiles coherentes — hay rangos `latest`, nombres de paquete plantilla y estrategias distintas de instalación entre frontends.
- [ ] Añadir validación de entrada, límites de tamaño, anti-spam y observabilidad al endpoint público de consultas — el formulario es anónimo y su política de inserción acepta cualquier payload que supere solo la validación HTTP.
- [ ] Documentar el modelo de despliegue real y actualizar `README.md` — describe solo parte de los servicios y afirma que las credenciales vienen preconfiguradas, contradiciendo el modelo seguro esperado.

## 🟢 MEJORA (Próximo sprint)
- [ ] Evolucionar el monorepo a workspaces (`apps/*`, `services/*`, `packages/*`) con librerías internas versionadas — mejora límites de ownership, builds y reutilización sin convertir los tres productos en una sola aplicación.
- [ ] Extraer un módulo común de configuración JWT/CORS y estandarizar autoridades/claims — reduce drift entre los dos `SecurityConfig` y centraliza reglas verificables.
- [ ] Añadir pipeline CI/CD con build, lint, tests, escaneo de secretos, análisis de dependencias y validación de migraciones — actualmente la verificación principal depende de scripts locales y servicios vivos.
- [ ] Añadir health checks de dependencias, métricas y trazabilidad correlacionada — los endpoints Actuator actuales exponen principalmente salud básica.
- [ ] Servir builds estáticos detrás de reverse proxy con HTTPS, headers de seguridad y límites de red — reemplaza el patrón de contenedores Vite de desarrollo.
- [ ] Revisar índices, paginación y consultas públicas de proyectos/lotes con datos representativos — las políticas públicas y RPC pueden convertirse en consultas costosas a escala.
- [ ] Definir estrategia de rotación de claves RSA, refresh tokens y revocación de sesiones — los tests cubren generación/rotación, pero falta operación documentada y automatizada.
- [ ] Eliminar nombres heredados de plantillas (`magic-patterns-vite-template`) y alinear nombres de artefactos Maven — reduce ambigüedad de ownership y mantenimiento.

## 🗑️ ELIMINAR
- [ ] Copias duplicadas de `docs/05_base_de_datos/01-04_*.sql` que ya existen en `database/migrations/` — evitan que una corrección de esquema tenga una fuente inequívoca.
- [ ] Scripts SQL históricos MySQL y de creación/reset que no formen parte del flujo soportado (`database/scripts/Script - Crear base de datos.sql`, `Script - Tablas.sql`, `database/seeds/Supabase_Reset.sql`) — riesgo de ejecutar DDL obsoleto contra Supabase.
- [ ] Artefactos locales no distribuibles (`node_modules/`, `target/`, `dist/`, `.idea/`) si aparecen en entregables o despliegues — deben generarse en CI y no formar parte del contexto de producción.
- [ ] `scripts/test_supabase.py` después de reemplazarlo por una prueba segura y reproducible — contiene credenciales por defecto y desactiva la verificación TLS.
- [ ] Variables y ramas de configuración sin consumidores (`VITE_WEB_API_URL` frente a `VITE_API_URL`, y aliases no usados en scripts) tras validar referencias — evita configuraciones falsas y fallos silenciosos.

## ✅ NO TOCAR (Estable)
- [x] `auth-service` y su separación controller/service/repository/entity — la estructura por capas es coherente y tiene pruebas unitarias relevantes para JWT, rate limiting, contraseñas, reset y refresh tokens.
- [x] `JwtService`, RS256 y expiración corta de access token — la generación incluye issuer, subject, jti, expiración y authorities, y está cubierta por `JwtServiceTest`.
- [x] `SecurityConfig` de `auth-service` como baseline funcional — mantiene API stateless, BCrypt, endpoints de autenticación explícitos y bloqueo de operaciones cuando se exige cambio de contraseña.
- [x] `services/cms-service` con DTO, validación, controller, service, repository y `ddl-auto=validate` — es una integración estable para la web pública y CMS; endurecer seguridad sin reescribir la capa.
- [x] Migraciones Supabase versionadas `01` a `05` como contenido funcional — conservarlas como base de recuperación, corrigiendo permisos/RLS mediante migraciones nuevas y auditables.
- [x] `scripts/probar_pagina_web.sh` como smoke test de integración — valida TypeScript, conexión Supabase, health check y persistencia; debe mantenerse tras retirar credenciales inseguras.
- [x] `scripts/iniciar_local.sh` y el flujo local con claves RSA en `.secret/` — es útil para desarrollo siempre que no se reutilice tal cual en producción.
- [x] Integración de Supabase pública con claves anon y políticas de lectura explícitamente activas — conservar el patrón para contenido público, pero no extenderlo a datos personales ni operaciones privilegiadas.

## 🚀 MIGRACIÓN A GITHUB (astarothprueba10-ui/SGI-Monolithe)
- [x] Configurar remotos de Git (`origin` -> `https://github.com/astarothprueba10-ui/SGI-Monolithe.git`, `upstream` -> `https://github.com/Adrianny16/SGI-Monolithe.git`).
- [x] Aceptar invitación de colaboración para `JhonatanSanchezIngSistemas` con permisos de escritura.
- [x] Limpiar repositorio remoto manteniendo únicamente la estructura limpia (`main` y `develop`).
- [/] Configurar / Inicializar el proyecto GitHub Projects / Tablero Kanban y Planificación de Sprints según la documentación/archivos que suba el usuario.
