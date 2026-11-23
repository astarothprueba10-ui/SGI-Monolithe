-- Validación PostgreSQL 17 de la consulta histórica de captación, sin alterar datos.
DO $test$
DECLARE h jsonb; hp jsonb; ps jsonb; ases jsonb; total_items integer;
BEGIN
  SELECT public.sp_crm_fuentes_historico_v1(900,NULL) INTO h;
  IF (h->>'total')::integer <> 3 THEN
    RAISE EXCEPTION 'FUENTES-01: el histórico debe incluir los 3 prospectos: %',h;
  END IF;
  SELECT COALESCE(SUM((i->>'total')::integer),0) INTO total_items
    FROM jsonb_array_elements(h->'items') i;
  IF total_items <> (h->>'total')::integer THEN
    RAISE EXCEPTION 'FUENTES-02: suma de canales incorrecta: %',h;
  END IF;

  SELECT public.sp_crm_fuentes_historico_v1(900,1) INTO hp;
  IF (hp->>'total')::integer <> 2 THEN
    RAISE EXCEPTION 'FUENTES-03: proyecto 1 debe contener dos prospectos sin duplicación: %',hp;
  END IF;

  SELECT public.sp_crm_fuentes_periodo_v7(
    900,'2026-11-23 00:00:00-05','2026-11-30 00:00:00-05',NULL
  ) INTO ps;
  IF (ps->>'total')::integer <> 0 THEN
    RAISE EXCEPTION 'FUENTES-04: período sin captación no debe inventar registros: %',ps;
  END IF;

  SELECT public.sp_crm_fuentes_historico_v1(901,NULL) INTO ases;
  IF (ases->>'total')::integer <> 1 THEN
    RAISE EXCEPTION 'FUENTES-05: asesor debe ver sólo prospectos autorizados: %',ases;
  END IF;
  BEGIN
    PERFORM public.sp_crm_fuentes_historico_v1(902,NULL);
    RAISE EXCEPTION 'FUENTES-06: usuario sin permiso pudo consultar';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'DENEGADO|%' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.sp_crm_fuentes_historico_v1(900,0);
    RAISE EXCEPTION 'FUENTES-07: proyecto inválido no fue rechazado';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'DATOS_INVALIDOS|%' THEN RAISE; END IF;
  END;

  IF has_function_privilege('anon',
       'public.sp_crm_fuentes_historico_v1(bigint,bigint)','EXECUTE')
     OR has_function_privilege('authenticated',
       'public.sp_crm_fuentes_historico_v1(bigint,bigint)','EXECUTE')
     OR NOT has_function_privilege('sigi_app_user',
       'public.sp_crm_fuentes_historico_v1(bigint,bigint)','EXECUTE')
  THEN RAISE EXCEPTION 'FUENTES-08: permisos SQL incorrectos'; END IF;

  IF (SELECT COUNT(*) FROM public.crm_prospectos) <> 3 THEN
    RAISE EXCEPTION 'FUENTES-09: operación de solo lectura modificó los prospectos';
  END IF;
  RAISE NOTICE 'FUENTES 132: histórico, período, proyectos y permisos correctos';
END;
$test$;
