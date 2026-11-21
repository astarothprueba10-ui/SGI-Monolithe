-- Correccion 01 - Etapa de consolidacion del esquema compartido.
-- Requiere la migracion 120 (secuencia de codigos).
-- Se aplica una sola vez en Supabase, usado por Docker y produccion.
-- Respaldo externo de coordenadas tomado antes de eliminar las columnas.
BEGIN;

-- PREVENTA es una etapa comercial, no un estado del proyecto.
-- Los proyectos existentes en PREVENTA siguen vigentes como ACTIVO.
UPDATE public.inm_proyectos
SET id_estado_proyecto = (
  SELECT id_estado_proyecto
  FROM public.cfg_estados_proyecto
  WHERE codigo = 'ACTIVO'
)
WHERE id_estado_proyecto = (
  SELECT id_estado_proyecto
  FROM public.cfg_estados_proyecto
  WHERE codigo = 'PREVENTA'
);

-- No se elimina el registro del catalogo para preservar referencias historicas.
UPDATE public.cfg_estados_proyecto
SET activo = false
WHERE codigo = 'PREVENTA';

-- Los nuevos proyectos solo pueden tener codigo automatico con formato PROY-001.
-- Los codigos historicos se mantienen; un proyecto existente no cambia codigo.
CREATE OR REPLACE FUNCTION public.fn_inm_proyectos_codigo_inmutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.codigo IS NULL OR NEW.codigo !~ '^PROY-[0-9]{3,}$' THEN
      RAISE EXCEPTION 'El codigo debe seguir el formato PROY-001';
    END IF;
  ELSIF NEW.codigo IS DISTINCT FROM OLD.codigo THEN
    RAISE EXCEPTION 'El codigo del proyecto es inmutable';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_inm_proyectos_codigo_inmutable() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_inm_proyectos_codigo_inmutable
  ON public.inm_proyectos;
CREATE TRIGGER trg_inm_proyectos_codigo_inmutable
  BEFORE INSERT OR UPDATE OF codigo ON public.inm_proyectos
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_inm_proyectos_codigo_inmutable();

-- Columnas eliminadas del contrato Java/TypeScript.
-- Las restricciones asociadas a estas columnas se retiran automaticamente.
ALTER TABLE public.inm_proyectos
  DROP COLUMN IF EXISTS latitud,
  DROP COLUMN IF EXISTS longitud;

COMMIT;
