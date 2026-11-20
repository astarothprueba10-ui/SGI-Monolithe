-- SGI MONOLITHE | Bloque 4: verificaciones en Supabase TEST sin crear ni modificar ventas.
-- El interruptor DEBE permanecer apagado; si no, la prueba aborta.
DO $$
DECLARE
  v_actor bigint;
  v_version integer;
  v_anteriores integer;
  v_ventas integer;
  v_planes integer;
  v_borrador jsonb := '{
    "montoSeparacion":500.00,"modoInicial":"MINIMA","inicialMinima":8000.00,
    "inicialMaxima":null,"inicialFija":null,"tasaNominalAnualPct":10.0000,
    "cuotasMin":1,"cuotasMax":36,"diasVencimientoSeparacion":7,
    "sistemaAmortizacion":"FRANCES","moneda":"PEN",
    "motivoPublicacion":"Prueba de borrador con candado de publicación deshabilitado"
  }'::jsonb;
  v_vista jsonb;
  v_control boolean;
  v_msg text;
BEGIN
  SELECT habilitado INTO v_control FROM public.cfg_fin_publicacion_control WHERE id=1;
  IF v_control IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'TEST_ABORTADO|El interruptor de publicación debe permanecer apagado.';
  END IF;
  IF has_function_privilege('anon','public.sp_fin_publicar_politica_v1(bigint,bigint,text,uuid,uuid,integer,jsonb)','EXECUTE')
     OR has_function_privilege('authenticated','public.sp_fin_publicar_politica_v1(bigint,bigint,text,uuid,uuid,integer,jsonb)','EXECUTE')
     OR has_table_privilege('sigi_app_user','public.cfg_fin_publicacion_control','UPDATE') THEN
    RAISE EXCEPTION 'SEGURIDAD_FALLIDA|Existe acceso directo a publicar o al interruptor.';
  END IF;
  SELECT pv.version INTO STRICT v_version
    FROM public.cfg_fin_politica_activa a
    JOIN public.cfg_fin_politicas_versiones pv ON pv.id_politica=a.id_politica
    WHERE a.id=1;
  SELECT count(*) INTO v_anteriores FROM public.cfg_fin_politicas_versiones;
  SELECT count(*) INTO v_ventas FROM public.ven_ventas;
  SELECT count(*) INTO v_planes FROM public.pag_planes_pago;
  SELECT u.id_usuario INTO v_actor FROM public.seg_usuarios u
    WHERE public.fn_fin_gerencia_autorizada_v1(u.id_usuario)
    ORDER BY u.id_usuario LIMIT 1;
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'TEST_ABORTADO|No hay un actor Gerencia con permiso vigente.';
  END IF;
  v_vista:=public.sp_fin_previsualizar_borrador_v1(v_actor,v_version,v_borrador);
  IF (v_vista->>'versionActual')::integer IS DISTINCT FROM v_version
    OR (v_vista->>'versionNueva')::integer IS DISTINCT FROM v_version+1
    OR length(v_vista->>'hashPropuesta')<>64
    OR (v_vista->>'publicacionHabilitada')::boolean IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'TEST_FALLIDO|La vista previa alteró versión, hash o control.';
  END IF;
  IF public.fn_fin_hash_borrador_v1(v_version,public.fn_fin_normalizar_borrador_v1(v_borrador))
    IS DISTINCT FROM (v_vista->>'hashPropuesta')::char(64) THEN
    RAISE EXCEPTION 'TEST_FALLIDO|El hash canónico no es reproducible.';
  END IF;
  BEGIN
    PERFORM public.sp_fin_publicar_politica_v1(
      v_actor,0,'no-session',gen_random_uuid(),gen_random_uuid(),v_version,v_borrador);
    RAISE EXCEPTION 'TEST_FALLIDO|La publicación fue aceptada sin MFA.';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
    IF position('PUBLICACION_BLOQUEADA|' IN v_msg)=0 THEN
      RAISE EXCEPTION 'TEST_FALLIDO|El bloqueo respondió con un error inesperado.';
    END IF;
  END;
  IF (SELECT count(*) FROM public.cfg_fin_politicas_versiones)<>v_anteriores
     OR (SELECT count(*) FROM public.ven_ventas)<>v_ventas
     OR (SELECT count(*) FROM public.pag_planes_pago)<>v_planes
     OR (SELECT habilitado FROM public.cfg_fin_publicacion_control WHERE id=1) IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'TEST_FALLIDO|El intento de publicación alteró datos.';
  END IF;
  RAISE NOTICE 'BLOQUE4_VERIFICADO: vista previa reproducible, seguridad SQL y publicación bloqueada sin modificar ventas.';
END;
$$;
