-- Cuando se elige un proyecto de interés ya existente, debe pasar a ser el
-- más reciente en la ficha sin borrar los demás intereses históricos.
DO $patch$
DECLARE v_def text;
BEGIN
 SELECT pg_get_functiondef(oid) INTO STRICT v_def FROM pg_proc
 WHERE pronamespace='public'::regnamespace
   AND proname='sp_crm_registrar_venta_pendiente_v10';
 IF strpos(v_def,'UPDATE public.crm_prospectos_intereses SET fecha_interes=now()')>0
 THEN RETURN; END IF;
 IF strpos(v_def,' IF NOT EXISTS (SELECT 1 FROM public.crm_prospectos_intereses')=0
 THEN RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|No se localiza el interés.'; END IF;
 v_def:=replace(v_def,
 ' IF NOT EXISTS (SELECT 1 FROM public.crm_prospectos_intereses
   WHERE id_prospecto=p_prospecto AND id_proyecto=v_proyecto AND activo)
 THEN
   INSERT INTO public.crm_prospectos_intereses(id_prospecto,id_proyecto,activo)
   VALUES(p_prospecto,v_proyecto,true);
 END IF;',
 ' UPDATE public.crm_prospectos_intereses
   SET fecha_interes=now(),fecha_actualizacion=now()
 WHERE id_prospecto=p_prospecto AND id_proyecto=v_proyecto AND activo;
 IF NOT FOUND THEN
   INSERT INTO public.crm_prospectos_intereses(id_prospecto,id_proyecto,activo)
   VALUES(p_prospecto,v_proyecto,true);
 END IF;');
 IF strpos(v_def,'UPDATE public.crm_prospectos_intereses SET fecha_interes=now()')=0
  AND strpos(v_def,' UPDATE public.crm_prospectos_intereses
   SET fecha_interes=now()')=0
 THEN RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|No se pudo priorizar el interés.'; END IF;
 EXECUTE v_def;
END $patch$;