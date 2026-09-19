-- =============================================================================
-- VALIDACION POST-DESPLIEGUE - SGI MONOLITHE / SUPABASE
-- Ejecutar DESPUES de:
--   1) Supabase_Reset.sql
--   2) Supabase_Script_Tablas.sql
--   3) Supabase_Inserts.sql
-- =============================================================================

SET search_path TO public;

-- 1. Tablas del esquema public
SELECT
    'tablas_public' AS validacion,
    COUNT(*)::BIGINT AS actual,
    83::BIGINT AS esperado,
    COUNT(*) = 83 AS ok
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

-- 2. Foreign keys
SELECT
    'foreign_keys' AS validacion,
    COUNT(*)::BIGINT AS actual,
    189::BIGINT AS esperado,
    COUNT(*) = 189 AS ok
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE n.nspname = 'public'
  AND c.contype = 'f';

-- 3. Foreign keys que referencian estado
SELECT
    'fk_hacia_estado' AS validacion,
    COUNT(*)::BIGINT AS actual,
    23::BIGINT AS esperado,
    COUNT(*) = 23 AS ok
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE n.nspname = 'public'
  AND c.contype = 'f'
  AND c.confrelid = 'public.estado'::regclass;

-- 4. Indices funcionales definidos por el modelo (idx_*)
SELECT
    'indices_idx' AS validacion,
    COUNT(*)::BIGINT AS actual,
    145::BIGINT AS esperado,
    COUNT(*) = 145 AS ok
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx\_%' ESCAPE '\\';

-- 5. Triggers de fecha_actualizacion
SELECT
    'triggers_fecha_actualizacion' AS validacion,
    COUNT(*)::BIGINT AS actual,
    73::BIGINT AS esperado,
    COUNT(*) = 73 AS ok
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
  AND t.tgname LIKE 'trg\_%\_fecha\_actualizacion' ESCAPE '\\';

-- 6. Columnas generadas
SELECT
    'columnas_generadas' AS validacion,
    COUNT(*)::BIGINT AS actual,
    17::BIGINT AS esperado,
    COUNT(*) = 17 AS ok
FROM information_schema.columns
WHERE table_schema = 'public'
  AND is_generated = 'ALWAYS';

-- 7. Catalogo unificado de estados
SELECT
    'filas_estado' AS validacion,
    COUNT(*)::BIGINT AS actual,
    83::BIGINT AS esperado,
    COUNT(*) = 83 AS ok
FROM estado;

-- 8. Dominios del catalogo estado
SELECT
    'dominios_estado' AS validacion,
    COUNT(DISTINCT entidad)::BIGINT AS actual,
    18::BIGINT AS esperado,
    COUNT(DISTINCT entidad) = 18 AS ok
FROM estado;

-- 9. Estados de usuario esperados
SELECT
    'estados_usuario' AS validacion,
    COUNT(*)::BIGINT AS actual,
    4::BIGINT AS esperado,
    COUNT(*) = 4 AS ok
FROM estado
WHERE entidad = 'USUARIO'
  AND codigo IN ('ACTIVO', 'BLOQUEADO', 'SUSPENDIDO', 'INACTIVO');

-- 10. Entidades antiguas que no deben existir
SELECT
    'tablas_redundantes_eliminadas' AS validacion,
    COUNT(*)::BIGINT AS actual,
    0::BIGINT AS esperado,
    COUNT(*) = 0 AS ok
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
      'prospecto',
      'cliente',
      'asesor',
      'estado_proyecto',
      'estado_etapa',
      'estado_manzana',
      'estado_lote',
      'estado_usuario',
      'estado_reserva',
      'estado_venta',
      'estado_contrato',
      'estado_plan_pago',
      'estado_cuota',
      'estado_voucher',
      'estado_pago',
      'estado_asesor',
      'estado_comision',
      'estado_publicacion',
      'estado_consulta_web',
      'estado_envio',
      'estado_movimiento'
  );

-- 11. Resumen de dominios del catalogo estado
SELECT
    entidad,
    COUNT(*) AS cantidad
FROM estado
GROUP BY entidad
ORDER BY entidad;
