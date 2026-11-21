-- Correccion 01. Preparado para ambiente de pruebas. No ejecutar en produccion.
BEGIN;

CREATE SEQUENCE IF NOT EXISTS public.inm_proyectos_codigo_seq AS bigint START WITH 1;
-- No se modifica PROJ-1111: los codigos historicos son identificadores estables.
SELECT setval('public.inm_proyectos_codigo_seq'::regclass,
  GREATEST(COALESCE((
    SELECT MAX(substring(codigo FROM '^PROY-([0-9]+)$')::bigint)
    FROM public.inm_proyectos WHERE codigo ~ '^PROY-[0-9]+$'
  ), 0) + 1, 1), false);
GRANT USAGE, SELECT ON SEQUENCE public.inm_proyectos_codigo_seq TO sgi_backend_user, sigi_app_user;

-- El trigger solo valida nuevos registros; conserva la edicion de los legados.
CREATE OR REPLACE FUNCTION public.fn_inm_proyectos_codigo_inmutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.codigo !~ '^PROY-[0-9]{3,}
$$;
CREATE TRIGGER trg_inm_proyectos_codigo_inmutable
  BEFORE INSERT OR UPDATE OF codigo ON public.inm_proyectos
  FOR EACH ROW EXECUTE FUNCTION public.fn_inm_proyectos_codigo_inmutable();

-- Preventa es fase comercial y no estado del proyecto.
UPDATE public.inm_proyectos
SET id_estado_proyecto = (
  SELECT id_estado_proyecto FROM public.cfg_estados_proyecto WHERE codigo = 'ACTIVO'
)
WHERE id_estado_proyecto = (
  SELECT id_estado_proyecto FROM public.cfg_estados_proyecto WHERE codigo = 'PREVENTA'
);
UPDATE public.cfg_estados_proyecto SET activo = false WHERE codigo = 'PREVENTA';

-- El respaldo anterior a esta migracion debe conservar estos valores.
ALTER TABLE public.inm_proyectos
  DROP COLUMN IF EXISTS latitud,
  DROP COLUMN IF EXISTS longitud;

COMMIT;
 THEN
      RAISE EXCEPTION 'El codigo debe seguir el formato PROY-000';
    END IF;
  ELSIF NEW.codigo IS DISTINCT FROM OLD.codigo THEN
    RAISE EXCEPTION 'El codigo del proyecto es inmutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_inm_proyectos_codigo_inmutable
  BEFORE UPDATE OF codigo ON public.inm_proyectos
  FOR EACH ROW EXECUTE FUNCTION public.fn_inm_proyectos_codigo_inmutable();

-- Preventa es fase comercial y no estado del proyecto.
UPDATE public.inm_proyectos
SET id_estado_proyecto = (
  SELECT id_estado_proyecto FROM public.cfg_estados_proyecto WHERE codigo = 'ACTIVO'
)
WHERE id_estado_proyecto = (
  SELECT id_estado_proyecto FROM public.cfg_estados_proyecto WHERE codigo = 'PREVENTA'
);
UPDATE public.cfg_estados_proyecto SET activo = false WHERE codigo = 'PREVENTA';

-- El respaldo anterior a esta migracion debe conservar estos valores.
ALTER TABLE public.inm_proyectos
  DROP COLUMN IF EXISTS latitud,
  DROP COLUMN IF EXISTS longitud;

COMMIT;
