# Validación de integración de SGI-MONOLITHE-PROD

## Alcance

Entorno nuevo: `ljxbkfvtbbucakkvdzmr`. Entorno anterior: conservar sin cambios. Esta guía no ejecuta operaciones ni configura credenciales. No conectar producción ni fusionar la rama hasta que se aprueben las pruebas locales.

## Hallazgos verificados

- 172 tablas del aplicativo, 386 rutinas y 163 políticas RLS. Las definiciones de rutinas coinciden al normalizar espacios en blanco. En tres políticas CMS, la diferencia observada es la representación del cast de un arreglo varchar a text.
- 87 tablas de public tienen RLS sin políticas tanto en el proyecto anterior como en el nuevo; las siete tablas auxiliares también tienen RLS en el nuevo.
- El asesor de seguridad reporta 94 tablas con RLS sin políticas (INFO). Esto no equivale a una validación funcional ni garantiza ausencia de vulnerabilidades.
- Los tres roles técnicos nuevos tienen NOLOGIN y NOBYPASSRLS. En el anterior, sigi_app_user tenía BYPASSRLS; no reproducir ese privilegio.
- 321 rutinas originales son SECURITY DEFINER; mantener sin EXECUTE para anon y authenticated, revisar los controles de actor, el search_path y el alcance de permisos antes de exponer cualquier interfaz.
- Nueve buckets vacíos, ocho privados. No copiar archivos de prueba.

## Configuración que requiere validación

Los tres servicios usan DB_URL, DB_USERNAME, DB_PASSWORD y Hibernate ddl-auto=validate. Docker Compose comparte SUPABASE_DB_URL, SUPABASE_DB_USERNAME y SUPABASE_DB_PASSWORD entre auth y core; CMS permite CMS_DB_URL, CMS_DB_USERNAME y CMS_DB_PASSWORD. Revisar las consultas de cada servicio y diseñar accesos acotados con RLS y permisos necesarios antes de habilitar identidades de conexión. No usar una cuenta administrativa de PostgreSQL como cuenta habitual del aplicativo.

Aislar el entorno local del anterior; guardar credenciales fuera de Git. Usar un par RSA JWT nuevo y una clave MFA nueva exclusiva de este entorno. Mantener las claves de Storage de backend fuera de los frontends. Verificar SUPABASE_URL, VITE_SUPABASE_URL y las claves correspondientes al mismo entorno; no combinar URL nueva con credenciales antiguas.

## Criterios de aceptación antes de conectar producción

- Probar conectividad TLS y validación de esquema para cada servicio.
- Verificar operaciones permitidas y denegadas de cada rol técnico, sin desactivar RLS ni ampliar permisos indiscriminadamente.
- Revisar dependencias de roles por código y de identificadores regenerados.
- Revisar las rutas de lectura de frontends y mantener denegado el acceso a datos privados.
- Establecer el alta inicial mediante un procedimiento de incorporación autorizado, con identidad verificada y MFA, sin reutilizar credenciales o sesiones anteriores.
- Configurar política financiera inicial por flujo de negocio autorizado; no copiar versiones históricas.
- Validar lectura y escritura de Storage, URLs firmadas, caducidad y denegación de accesos no autorizados.
- Probar CRM, proyectos y lotes, ventas, finanzas, RRHH, portal y CMS; eliminar o aislar datos de ensayo conforme al plan aprobado.
- Registrar resultados y aprobar el cambio de entorno antes de modificar Railway, Vercel o main.

No se incluyen secretos ni instrucciones para eludir las protecciones de seguridad. Las credenciales se aprovisionan mediante el proceso administrativo autorizado.

## Ensayo Docker aislado

Se añade `docker-compose.prod-ensayo.yml`, sin sustituir `docker-compose.yml` ni `docker-compose.prod.yml`. El proyecto Compose es sgi-prod-ensayo, todos los puertos se enlazan únicamente a loopback, y los puertos del ensayo son 18081 (auth), 18082 (CMS), 18083 (core), 15173 (portal), 15174 (backoffice) y 15175 (web).

La URL y el pooler del nuevo proyecto se fijan explícitamente en el archivo. No utiliza el .env habitual ni .secret/supabase.env como env_file. La plantilla `database/operations/prod-ensayo.env.example` se guarda sin valores. La copia privada debe quedar en .secret/prod-ensayo/connection.env; las claves RSA y MFA nuevas deben ubicarse en .secret/prod-ensayo/keys/. No reutilizar el juego anterior. Las variables de conexión se separan por servicio; no aprovisionar identidades hasta completar su diseño y revisión de acceso.

Comprobación de sintaxis una vez aprovisionados los valores privados:

```sh
docker compose --env-file .secret/prod-ensayo/connection.env -f docker-compose.prod-ensayo.yml config --quiet
```

No iniciar el ensayo hasta confirmar que las credenciales pertenecen al nuevo proyecto y que el acceso del servicio respeta RLS. No usar una cuenta administrativa de PostgreSQL como identidad de servicio. La prueba de correo externo está desactivada por diseño (SMTP loopback sin servidor); se requiere un canal de correo de ensayo autorizado antes de probar invitaciones y MFA por email. Las funciones de publicación CMS quedan desactivadas. No es una configuración para despliegue productivo.

Se excluyen archivos .env, .env.*, .secret, secrets y claves PEM/KEY de los contextos Docker de los tres frontends y auth-service. No introducir credenciales en el frontend.

## Políticas de lectura de catálogos

Se instalaron cinco políticas SELECT para los roles técnicos sgi_backend_user y sigi_app_user en rrhh_areas, rrhh_cargos, rrhh_horarios, cfg_estados_trabajador y cfg_tipos_vinculo_laboral. No hay acceso de anon/authenticated a esas tablas. Los ocho catálogos de CatalogoService (estados de proyecto, etapa, manzana y lote, tipos de lote, monedas, tipos de tarifa y de ajuste de precio) ya tenían políticas de lectura y no requieren otra. La consulta de prueba desde la conexión administrativa con SET ROLE fue denegada; falta comprobar acceso efectivo desde identidades de servicio autorizadas. No alterar membresías para eludir esta restricción.
