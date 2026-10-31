# Revisión de SQL CMS: registro de migraciones y candidatas 40–42

**Uso: revisión del equipo/DBA, NO EJECUTAR 40–42 EN SUPABASE.** Fecha de corte: 30/10/2026.

## Estado conocido

- `git push` de `docs/cms/PLAN_VERSIONADO_MIGRACIONES.md` confirmado con commit `2007637`.
- `origin/main` trae dos migraciones con prefijo `30` y una `31_rrhh_gestion_integral_trabajadores.sql`; no renombrarlas.
- En las búsquedas de repo aportadas, el CI solo verifica que haya SQL; no se identificó un ejecutor automático en el código revisado.
- **Importante:** el diagnóstico real de Supabase **sí** confirmó la existencia de `supabase_migrations.schema_migrations`. No se conocen sus filas ni si corresponden al directorio `database/migrations`. Por ello la modalidad de aplicación sigue pendiente de reconciliación, no puede afirmarse que todo fue manual.
- Diagnóstico real: `sigi_cms_user` ausente, `cms_visibilidad_historial` ausente, políticas `cms_backend_*` ausentes. Muchos otros objetos CMS ya existen; no reejecutar migraciones históricas.
- PostgreSQL 17 local aislado: QA candidata 37 y QA historial visibilidad aprobadas con rol de prueba y esquema reducido. **No** valida despliegue Supabase real ni Storage.

## Archivos y alcance

- `00_registro_migraciones_y_bloqueos_SOLO_LECTURA.sql`: única consulta adecuada para ejecutar ahora en Supabase SQL Editor, con autorización normal de lectura; devuelve versiones (no SQL ni datos de clientes), y verifica rol e historial.
- `40_cms_rol_minimo_privilegio_CANDIDATA_NO_EJECUTAR.sql`: copia exacta de candidata 37 auditada y ensayada en PostgreSQL reducido, renombrada solo como posición propuesta. No crea usuarios ni contraseñas; exige que el DBA haya aprovisionado `sigi_cms_user` de forma segura.
- `41_cms_publicacion_visibilidad_historial_CANDIDATA_NO_EJECUTAR.sql`: copia exacta de extensión de visibilidad + auditoría ensayada en PostgreSQL reducido. Requiere 40 y que la tabla no exista; sus `CREATE TABLE/FUNCTION/TRIGGER/POLICY` NO son idempotentes.
- `42_cms_publicacion_imagenes_permisos_CANDIDATA_NO_EJECUTAR.sql`: copia exacta de extensión de multimedia; exige catálogos `IMAGEN` y `FONDO` y 40. **No hay QA integral de Storage real**; revisar su impacto antes de aprobarla.
- `90_postflight_CMS_37_41_42_SOLO_LECTURA.sql`: verificación posterior (solo lectura); su resultado solo tiene sentido después de instalar una secuencia aprobada en QA. No ejecutarlo ahora para concluir que “falló”.

## Criterios de aprobación antes de promover a database/migrations

1. Equipo/DBA reconcilia el registro de `supabase_migrations.schema_migrations`: versiones, procedimiento real de aplicación y fuente de verdad, sin registrar falsamente scripts ya aplicados.
2. Reconstruir y aprobar las piezas previas 32–39 según el esquema real en un QA representativo; la candidata 34 de borradores es reconstrucción parcial de catálogo, NO original.
3. En QA realista, aprovisionar `sigi_cms_user` por procedimiento seguro: LOGIN; sin superusuario/BYPASSRLS/CREATEROLE/CREATEDB y sin membresías ajenas; contraseña mediante canal de administración, nunca en chat, PR ni Git.
4. QA reproduce estructura + 40, 41 y 42; `ddl-auto=validate`, usuario JDBC restringido, políticas, privilegios, permisos JWT en endpoints, imágenes en Storage real y flujos de publicación/rollback.
5. Despliegue: respaldo aprobado por DBA, preflight previo inmediato, orden validado, registro de ejecución, postflight, flags CMS inicialmente apagados y credenciales `CMS_DB_*` obligatorias; no confiar en fallback a un usuario amplio.
6. Evitar tocar datos oficiales o asignar visibilidad verdadera por defecto: proyecto activo sin fila debe permanecer oculto.

## Cómo usar este paquete ahora

Solo `00_registro_migraciones_y_bloqueos_SOLO_LECTURA.sql` en SQL Editor, si tienes permiso de lectura. Compartir las versiones y los dos booleanos, nunca secretos ni contenido completo de `statements`. El DBA revisará las candidatas sin ejecutarlas hasta confirmar compatibilidad en un QA representativo.

**No** realizar `git add .`, ni copiar este ZIP o las candidatas directamente a `database/migrations` como si fueran SQL aprobados. Los cambios anteriores en Git y los scripts no versionados permanecen intactos.
