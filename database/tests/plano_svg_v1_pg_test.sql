-- Ejecutar solo en PostgreSQL de CI después de la migración 124.
BEGIN;
DO $$
BEGIN
  IF has_table_privilege('anon','public.inm_planos_svg_proyecto','SELECT') OR
     has_table_privilege('authenticated','public.inm_planos_svg_proyecto','INSERT') THEN
    RAISE EXCEPTION 'El recurso SVG no puede ser público';
  END IF;
  IF NOT has_table_privilege('sgi_backend_user','public.inm_planos_svg_proyecto','UPDATE') THEN
    RAISE EXCEPTION 'El backend no puede reemplazar el plano';
  END IF;
END;
$$;
INSERT INTO public.inm_planos_svg_proyecto(id_proyecto,nombre_archivo,documento) VALUES
  (1,'alameda.svg','{"nombreArchivo":"alameda.svg","viewBox":[0,0,1000,600],"elementos":[{"tipo":"path","atributos":{"d":"M1 1L5 5"},"codigoLote":null}]}');
UPDATE public.inm_planos_svg_proyecto SET nombre_archivo='alameda_2.svg' WHERE id_proyecto=1;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.inm_planos_svg_proyecto WHERE id_proyecto=1)<>1 THEN
    RAISE EXCEPTION 'El plano no puede duplicarse por proyecto';
  END IF;
  IF EXISTS(SELECT 1 FROM public.inm_planos_svg_proyecto WHERE nombre_archivo='alameda.svg') THEN
    RAISE EXCEPTION 'No se reemplazo el SVG existente';
  END IF;
END;
$$;
ROLLBACK;
