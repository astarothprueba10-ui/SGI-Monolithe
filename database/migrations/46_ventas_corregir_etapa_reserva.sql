-- Etapa física se encuentra en inm_manzanas y no directamente en inm_lotes.
DO $patch$
DECLARE v_def text;
BEGIN
 SELECT pg_get_functiondef(oid) INTO STRICT v_def FROM pg_proc
 WHERE pronamespace='public'::regnamespace AND proname='sp_crm_reservas_vigentes_para_venta_v1';
 IF strpos(v_def,'l.id_etapa')=0 THEN RETURN; END IF;
 IF strpos(v_def,'JOIN public.inm_lotes l ON l.id_lote=r.id_lote')=0 THEN
   RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|No se encontro relacion de manzana.';
 END IF;
 v_def:=replace(v_def,'l.id_etapa','man.id_etapa');
 v_def:=replace(v_def,
   'JOIN public.inm_lotes l ON l.id_lote=r.id_lote',
   'JOIN public.inm_lotes l ON l.id_lote=r.id_lote
  JOIN public.inm_manzanas man ON man.id_manzana=l.id_manzana');
 EXECUTE v_def;
END $patch$;
