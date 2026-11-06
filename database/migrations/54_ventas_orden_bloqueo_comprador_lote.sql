-- Mantener el mismo orden de candados de v6: lote -> prospecto -> persona.
-- Evita interbloqueos entre ventas simultáneas y edición del comprador.
DO $patch$
DECLARE v_def text;
BEGIN
 SELECT pg_get_functiondef(oid) INTO STRICT v_def FROM pg_proc
 WHERE pronamespace='public'::regnamespace
   AND proname='sp_crm_registrar_venta_pendiente_v10';
 IF strpos(v_def,'PERFORM 1 FROM public.inm_lotes WHERE id_lote=p_lote FOR UPDATE;')>0
 THEN RETURN; END IF;
 IF strpos(v_def,' SELECT id_persona INTO STRICT v_persona FROM public.crm_prospectos')=0
 THEN RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|El orden de locks cambio.'; END IF;
 v_def:=replace(v_def,
   ' SELECT id_persona INTO STRICT v_persona FROM public.crm_prospectos',
   ' PERFORM 1 FROM public.inm_lotes WHERE id_lote=p_lote FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION ''LOTE_NO_DISPONIBLE|Lote inexistente.''; END IF;
 SELECT id_persona INTO STRICT v_persona FROM public.crm_prospectos');
 EXECUTE v_def;
END $patch$;