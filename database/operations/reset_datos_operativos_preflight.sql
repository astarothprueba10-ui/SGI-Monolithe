-- Preflight de mantenimiento. No ejecuta cambios de datos ni de esquema.
-- Ejecutar en el proyecto existente, antes de cualquier reset operativo.
-- Las clasificaciones son propuestas; nunca se usan para ejecutar borrados.
-- Alcance revisado: conservar los identificadores de Gerencia, su registro laboral y MFA.
-- Conservar historiales inmutables y sus referencias; no reasignar autores ni desactivar triggers.
-- Los catalogos de roles de sistema requieren tratamiento compatible con sus reglas de negocio.
-- El ensayo anterior permanece suspendido. Este informe no lo habilita.
BEGIN TRANSACTION READ ONLY;

WITH inventario AS (
    SELECT c.oid, n.nspname AS esquema, c.relname AS tabla,
           c.relrowsecurity AS rls,
           CASE
               WHEN n.nspname = 'auth_mfa' THEN 'CONSERVAR_Y_REVISAR_ACCESO'
               WHEN c.relname IN ('cfg_fin_politicas_versiones','cfg_fin_politica_activa',
                                  'cfg_fin_publicacion_control','cfg_fin_politica_proyecto_activa',
                                  'cms_paginas','cms_secciones') THEN 'CONSERVAR_Y_REVISAR_HISTORIAL'
               WHEN c.relname ~* '(historial|auditoria|bitacora|version|publicacion)' OR c.relname LIKE 'aud\_%' ESCAPE '\' THEN 'CONSERVAR_Y_REVISAR_HISTORIAL'
               WHEN c.relname ~ '^(seg|core_personas|rrhh_trabajadores)' THEN 'CONSERVAR_Y_REVISAR_IDENTIDAD'
               WHEN c.relname LIKE 'cfg\_%' ESCAPE '\'
                    OR c.relname IN ('seg_roles','seg_permisos','seg_roles_permisos',
                        'rrhh_areas','rrhh_cargos','rrhh_horarios','rrhh_horarios_detalle',
                        'fin_categorias','not_plantillas') THEN 'CONSERVAR'
               WHEN c.relname ~ '^(aud|cms|com|core|crm|fin|inm|not|pag|rrhh|seg|ven)_' THEN 'OPERATIVO'
               ELSE 'REVISAR'
           END AS tratamiento
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r','p') AND n.nspname IN ('public','auth_mfa')
), referencias AS (
    SELECT a.esquema, a.tabla, a.tratamiento, b.esquema AS destino_esquema,
           b.tabla AS destino_tabla, b.tratamiento AS destino_tratamiento,
           k.conname, pg_get_constraintdef(k.oid) AS definicion
    FROM pg_constraint k JOIN inventario a ON a.oid = k.conrelid
    JOIN inventario b ON b.oid = k.confrelid
    WHERE k.contype = 'f'
)
SELECT jsonb_build_object(
    'tablas', (SELECT count(*) FROM inventario),
    'tablas_rls', (SELECT count(*) FROM inventario WHERE rls),
    'clasificacion', (SELECT jsonb_object_agg(tratamiento, cantidad)
        FROM (SELECT tratamiento, count(*) cantidad FROM inventario GROUP BY tratamiento) x),
    'inventario', (SELECT jsonb_agg(to_jsonb(i) - 'oid' ORDER BY esquema, tabla) FROM inventario i),
    'fk_entre_tablas', (SELECT count(*) FROM referencias),
    'fk_configuracion_a_operativas', (SELECT coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
        FROM referencias r WHERE tratamiento <> 'OPERATIVO' AND destino_tratamiento = 'OPERATIVO'),
    'fk_externas', (SELECT coalesce(jsonb_agg(jsonb_build_object(
        'origen', k.conrelid::regclass::text, 'destino', k.confrelid::regclass::text,
        'restriccion', k.conname)), '[]'::jsonb)
        FROM pg_constraint k JOIN inventario i ON i.oid = k.confrelid
        WHERE k.contype = 'f' AND NOT EXISTS (SELECT 1 FROM inventario a WHERE a.oid = k.conrelid)),
    'triggers_truncate', (SELECT coalesce(jsonb_agg(jsonb_build_object(
        'tabla', i.tabla, 'trigger', g.tgname, 'estado', g.tgenabled)), '[]'::jsonb)
        FROM pg_trigger g JOIN inventario i ON i.oid = g.tgrelid
        WHERE NOT g.tgisinternal AND (g.tgtype & 32) <> 0),
    'secuencias', (SELECT count(*) FROM pg_sequences WHERE schemaname IN ('public','auth_mfa')),
    'usuarios', (SELECT count(*) FROM public.seg_usuarios),
    'roles', (SELECT count(*) FROM public.seg_roles),
    'permisos', (SELECT count(*) FROM public.seg_permisos),
    'asignaciones_permiso', (SELECT count(*) FROM public.seg_roles_permisos),
    'asignaciones_permiso_con_actor', (SELECT count(*) FROM public.seg_roles_permisos WHERE asignado_por IS NOT NULL),
    'politicas_generales_activas', (SELECT count(*) FROM public.cfg_fin_politica_activa),
    'paginas_cms', (SELECT count(*) FROM public.cms_paginas),
    'secciones_cms', (SELECT count(*) FROM public.cms_secciones)
) AS preflight_reset;

ROLLBACK;
