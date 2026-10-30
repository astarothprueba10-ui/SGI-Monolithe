# Gestión administrable de contenido web — estado previo al PR

**Rama:** `feature/cms-gestion-contenido-integracion`
**Commit de implementación local:** `ad47cd3`
**Corte:** 30-10-2026
**Estado:** código versionado, **despliegue bloqueado** hasta validar migraciones, roles y Storage reales.

## Alcance funcional

- Marketing dispone de «Gestión de contenido web» en Backoffice para editar textos e imágenes promocionales mediante borradores persistentes separados de lo publicado, previsualizar y publicar.
- Marketing puede controlar la visibilidad de proyectos **ya registrados** por usuarios de negocio autorizados. No crea proyectos ni modifica precios, áreas de lote, información oficial o condiciones comerciales.
- El backend consulta proyectos activos con registro `visible_publico = TRUE`; una fila ausente no publica el proyecto. La ficha por código pasa por el mismo control.
- Las promociones específicas de proyectos ocultos se excluyen de la web pública. La presentación no debe mostrar cifras comerciales sin respaldo de Gerencia.
- Seguridad granular: `web_content.view`, `.edit`, `.projects_visibility`, `.publish`; para publicar visibilidad se requieren los dos permisos de visibilidad y publicación.

## Evidencia de verificación local recibida

| Área | Evidencia observada | Alcance de la prueba |
|---|---|---|
| Java — seguridad | `SecurityConfigTest` 18/18, Maven `BUILD SUCCESS` | MockMVC, no JWT desplegado |
| Java — compensación | `CmsPublicacionImagenesCompensacionTest` 4/4 | Storage simulado |
| PostgreSQL/RLS/Storage | `CmsPublicacionImagenesPostgresRollbackTest` 2/2 | PostgreSQL 17 descartable, rol restringido, Storage simulado |
| Web pública | `node --experimental-strip-types --test` 25/25 | Hero/slides; no E2E real |
| Web pública | `tsc && vite build` aprobado tras corrección comercial | Compilación local |
| Backoffice | `vite build` aprobado; pruebas CMS anteriores aprobadas | Compilación local; no JWT/Storage real |
| RLS de visibilidad en Supabase | `cms_m33_proyecto_visible(4)` = `false` sin registro | Lectura SQL, no HTTP anónimo |

Las pruebas se ejecutaron en distintos puntos del desarrollo y **no prueban un despliegue productivo completo**. El error SQLState 23514 del ensayo transaccional fue intencional.

## Dependencias de base de datos pendientes

- En la rama, sin versionar: `database/migrations/30_permisos_gestion_contenido_web.sql` y `31_control_visibilidad_publica_proyectos.sql`. No incluirlas como migraciones ejecutables hasta acordar orden e historial con el equipo.
- En Git existen **dos** migraciones previas con prefijo `30` correspondientes a CRM. Falta una convención/reconciliación de numeración y registro de migraciones aplicadas.
- «32» se recuperó **solo como candidato** a partir del catálogo real de dos tablas (`cms_borradores`, `cms_publicacion_versiones`); no equivale al SQL histórico original ni está validado en un esquema completo nuevo.
- 33A ya tiene políticas/función visibles en la BD consultada. Una variante candidata elimina la precondición que exigía fila para todos los proyectos; la ausencia mantiene el proyecto oculto. **No volver a ejecutar 33A sobre esa BD.**
- 33B, 34, 35, 36, 37 y extensiones (visibilidad, multimedia y 37b) requieren revisión DBA/equipo de dependencias, ACL, triggers, `SECURITY DEFINER`, RLS y secuencia de aplicación.
- Las candidatas incluidas en paquetes de revisión **no** están aprobadas para ejecución y no deben copiarse automáticamente a `database/migrations/`.

## Despliegue: bloqueos y controles

1. Acordar con el equipo el proceso de migraciones/manual baseline y versionar una secuencia reproducible; probar `ddl-auto=validate` contra el esquema completo en base de prueba.
2. Provisionar/verificar el rol JDBC CMS sin `BYPASSRLS`, privilegios mínimos y `CMS_DB_*`; el fallback actual a `SUPABASE_DB_*` es solo compatibilidad y no debe ocultar un rol excesivo en despliegue.
3. Validar JWT y rutas HTTP para Marketing, Gerencia, `anon` y `authenticated`, incluidas URLs directas a proyectos ocultos.
4. Probar buckets privado/público y publicación, rollback y limpieza con Supabase Storage **de pruebas**; considerar objetos huérfanos si falla la compensación remota.
5. Confirmar derechos de uso de `apps/backoffice/public/cms-preview-hero-aerial.jpg`.
6. Mantener desactivadas todas las banderas CMS de imágenes/promociones/publicación hasta autorización de despliegue.
7. Documentar rollback operacional sin ejecutar scripts destructivos ni revertir cambios compartidos con CRM.

## Exclusiones de commit

No incluir scripts temporales de QA como `cms_37_qa_seis_tablas_ROLLBACK.sql`, parches `.patch`, `compose.cms-3e2-it.yml` sin revisión, secretos `.env`, ni SQL candidatos como migraciones de producción. Conservar intactos el stash de respaldo y la rama de backup.

**Conclusión:** esta rama puede proponerse en un **Pull Request en borrador para revisión de código**, expresamente NO listo para merge/despliegue. No realizar migraciones SQL ni activar flags en Supabase mediante este documento.
