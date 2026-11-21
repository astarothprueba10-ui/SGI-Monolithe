-- Correccion 01 - Etapa compatible con produccion (expand).
-- Core Service local y desplegado pueden compartir la misma base de Supabase.
-- Esta migracion SOLO habilita la secuencia para codigos PROY-001, PROY-002, etc.
-- No cambia registros existentes ni deshabilita PREVENTA.
-- No elimina latitud ni longitud: la version desplegada puede necesitarlas.
-- Los ajustes incompatibles requieren una migracion posterior coordinada.
BEGIN;

DO $migracion$
DECLARE
  siguiente_numero bigint;
BEGIN
  -- No reiniciar una secuencia que ya exista o haya sido utilizada.
  IF to_regclass('public.inm_proyectos_codigo_seq') IS NULL THEN
    CREATE SEQUENCE public.inm_proyectos_codigo_seq AS bigint START WITH 1;

    SELECT GREATEST(
      COALESCE(MAX(substring(codigo FROM '^PROY-([0-9]+)$')::bigint), 0) + 1,
      1
    )
    INTO siguiente_numero
    FROM public.inm_proyectos
    WHERE codigo ~ '^PROY-[0-9]+$';

    PERFORM setval(
      'public.inm_proyectos_codigo_seq'::regclass,
      siguiente_numero,
      false
    );
  END IF;
END;
$migracion$;

-- Solo los usuarios de base de datos utilizados por los backends.
GRANT USAGE, SELECT ON SEQUENCE public.inm_proyectos_codigo_seq
  TO sgi_backend_user, sigi_app_user;

COMMIT;
