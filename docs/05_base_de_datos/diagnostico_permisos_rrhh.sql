-- Consulta de solo lectura para recuperar las reglas desplegadas en Supabase.
-- El resultado contiene codigo de funciones y procedimientos, no expedientes.
SELECT
    p.oid::regprocedure::text AS firma,
    pg_get_functiondef(p.oid) AS definicion
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind IN ('f', 'p')
  AND (
      p.proname ILIKE '%rrhh%'
      OR p.proname ILIKE '%trabajador%'
      OR p.proname ILIKE '%gerente%'
      OR p.proname IN (
          'fn_usuario_objetivo_gestionable',
          'fn_usuario_tiene_permiso_seguridad'
      )
      OR p.prosrc ILIKE '%Solo el Gerente General%'
  )
ORDER BY p.proname, p.oid
LIMIT 100;
