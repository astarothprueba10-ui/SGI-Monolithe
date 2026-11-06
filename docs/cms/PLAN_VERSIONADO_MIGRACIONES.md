# SGI-Monolithe — Plan de integración reproducible de migraciones CMS

**Estado: propuesta para revisión del equipo; NO EJECUTAR los SQL candidatos en Supabase.**
**Base documental:** inventario `git ls-files` compartido el 30/10/2026; resultados de diagnósticos SQL de solo lectura compartidos por el usuario; candidatos y ensayos PostgreSQL 17 locales facilitados en el proyecto. No se ha accedido al repositorio remoto.

## 1. Mecanismo de aplicación constatado

- `.github/workflows/ci.yml`, líneas 74–76, verifica la existencia de `database/migrations/*.sql`; **no demuestra ejecución de scripts ni seguimiento de versiones**.
- `docs/permisos-rrhh-trabajadores.md` indica ejecutar `31_rrhh_gestion_integral_trabajadores.sql` en el SQL Editor de Supabase. Se infiere que al menos esa migración se instala manualmente.
- La búsqueda facilitada no identificó Flyway, Liquibase ni una orden automática `supabase db push`/`psql -f`. **No se puede descartar otra automatización no compartida**, pero se debe operar como despliegue manual controlado hasta que el equipo confirme lo contrario.
- Actualmente hay dos migraciones `30` versionadas y una `31` de RR. HH. No renombrarlas ni alterarlas por este issue.

## 2. Propuesta de números nuevos — únicamente nombres de trabajo

| Nueva posición tentativa | Fuente CMS preexistente | Dependencias/revisión obligatoria |
|---|---|---|
| `32_cms_permisos_gestion_contenido_web.sql` | `30_permisos_gestion_contenido_web.sql` sin versionar | Migración 18, trigger de Gerencia y rol MARKETING; constatar estado ya aplicado |
| `33_cms_control_visibilidad_publica_proyectos.sql` | `31_control_visibilidad_publica_proyectos.sql` sin versionar | Rehacer inicialización: **no depender de IDs 2/3 ni publicar proyectos por defecto**; validar contra criterio de negocio |
| `34_cms_borradores_y_versiones.sql` | `32_cms_borradores_y_versiones_CANDIDATA_NO_EJECUTAR.sql` | Reconstrucción **parcial** de catálogo: solo dos tablas; completar y cotejar DDL/constraints/ACL antes de aprobar |
| `35_cms_rls_visibilidad.sql` | `33A_rls_visibilidad_CANDIDATA_AJUSTADA_NO_EJECUTAR.sql` | `SECURITY DEFINER`, RLS restrictivo y políticas existentes; ausencias de visibilidad = oculto |
| `36_cms_rpc_visibilidad.sql` | `02_dependencias_33B_rpc_CANDIDATA_REVISION_EQUIPO.sql` | Efectos cruzados sobre RPC/otros módulos: revisión del equipo |
| `37_cms_imagenes_privadas.sql` | `03_cms_34_imagenes_privadas_CANDIDATA.sql` | Bucket privado, catálogo, RLS y existencia de imágenes; no repetir sobre BD real |
| `38_cms_secciones_promocionales.sql` | `04_cms_35_secciones_promocionales_CANDIDATA.sql` | Preflight de páginas y secciones, sin asumir IDs entre entornos |
| `39_cms_historial_publicacion.sql` | `05_cms_36_historial_publicacion_CANDIDATA.sql` | Historial inmutable, versiones y snapshots; tablas/objetos existentes en Supabase |
| `40_cms_rol_minimo_privilegio.sql` | `06_cms_37_rol_minimo_privilegio_CANDIDATA.sql` | Provisionar `sigi_cms_user` mediante canal seguro; RLS, ACL, secuencias |
| `41_cms_publicacion_visibilidad_historial.sql` | `07_cms_visibilidad_publicacion_CANDIDATA.sql` + candidata QA de historial | Integrar en **un solo SQL revisado** o en dos secuenciales; garantizar compatibilidad y no duplicar DDL |
| `42_cms_publicacion_imagenes_permisos.sql` | `08_cms_publicacion_imagenes_permisos_CANDIDATA.sql` | Validar catálogos `IMAGEN`/`FONDO` y Supabase Storage real |

**Separar sin numerar por ahora:** propuesta 37b de revocación general de TRUNCATE, porque puede afectar otros servicios; requiere auditoría y aprobación específica. La columna de nombre nuevo NO valida automáticamente el contenido de origen y NO constituye una lista autorizada de ejecución.

## 3. Dos pistas distintas, no ejecutar scripts anteriores contra producción

**Instalación nueva / QA con esquema representativo**: revisar y aprobar las 11 piezas, reconstruir la 34 completa y ensayar en orden sobre base vacía representativa, con preflights y tests. Fijar como falso/oculto cualquier proyecto sin visibilidad explícita. Las semillas deben ser transportables y aprobadas por negocio; nunca derivarlas de IDs concretos de producción.

**Supabase ya existente**: los diagnósticos compartidos muestran muchas tablas CMS, buckets y 10 políticas de lectura `m33_visibilidad_lectura` instalados. **No ejecutar 32–39 para “poner la base al día”** sin reconciliación de definiciones. Aplicar exclusivamente migración correctiva *forward-only* que añada objetos realmente ausentes (el diagnóstico mostró `cms_visibilidad_historial` y el rol `sigi_cms_user` ausentes), previa revisión del DBA, después de respaldo y ensayo del mismo esquema en QA. Documentar cada versión ya aplicada con evidencia, sin fingir que se ejecutó desde Git.

## 4. Evidencia de QA ya disponible y sus límites

- PostgreSQL 17 descartable, rol restringido, fixture reducido: verificación de permisos/RLS de la candidata 37 **aprobada**.
- PostgreSQL 17 descartable: inserción y protección del historial de visibilidad **aprobadas**, incluidos rechazo de revisiones inconsistentes y operaciones prohibidas.
- Compilación Backoffice tras merge **aprobada**; seguridad CMS Java 21 **22/22 aprobadas**.
- Suite general Backoffice post-merge **89 aprobadas, 8 fallidas** (varios errores de resolución de imports TypeScript / Node 22, pruebas CRM y datos de ubicación). No se ha establecido línea base de `main` para esos fallos.
- QA reducido no sustituye integración real con el esquema completo, JWT, Supabase Storage ni pruebas E2E.

## 5. Criterios para promover al PR listo para revisión de despliegue

1. Revisar y aprobar mapping y las fuentes SQL por DBA/equipo; reconstruir migración 34 de manera reproducible, corregir IDs/semillas de visibilidad.
2. Crear/provisionar de forma segura `sigi_cms_user` **sin entregar contraseñas al chat**, sin BYPASSRLS ni roles privilegiados. Confirmar variables `CMS_DB_*` en despliegue y quitar o bloquear fallback a credenciales amplias cuando el CMS esté habilitado.
3. Preparar QA con esquema representativo (preferiblemente copia sanitizada de la estructura, sin PII) y ensayar DDL/ALTER/RLS allí. Validar con `ddl-auto=validate`, JDBC restringido y postflight de solo lectura.
4. Validar políticas `anon`/`authenticated`, JWT HTTP real y lectura de imágenes privadas/publicadas en Storage; publicar textos, imágenes y visibilidad; mostrar oculto todo proyecto sin visibilidad explícita.
5. Clasificar los ocho fallos generales comparándolos con `origin/main`, sin alterar módulos CRM/RR. HH. fuera del alcance.
6. Documentar estados: ya aplicado / correctivo pendiente / no aplicable. Crear PR como Draft hasta completar gates y obtener aprobación del equipo.

**Prohibiciones de esta fase:** no ejecutar SQL de candidatos en Supabase; no activar flags; no copiar scripts de QA efímeros a `database/migrations`; no usar `git add .`, `git push --force` ni reescribir migraciones históricas.
