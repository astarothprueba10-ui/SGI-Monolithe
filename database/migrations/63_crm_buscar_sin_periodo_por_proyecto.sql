-- CRM: consulta de cartera con filtros por proyecto, sin imponer el período global.
-- Se crea a partir de v6 para conservar exactamente su política de acceso y paginación.
DO $$
DECLARE v_def text;
BEGIN
  SELECT replace(pg_get_functiondef(oid), E'\r\n', E'\n') INTO STRICT v_def
  FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='sp_crm_buscar_v6';
  v_def:=replace(v_def,'sp_crm_buscar_v6(', 'sp_crm_buscar_v7(');
  v_def:=replace(v_def,
      '       OR p_desde IS NULL
       OR p_hasta_exclusivo IS NULL
       OR p_hasta_exclusivo <= p_desde
       OR p_hasta_exclusivo > p_desde + INTERVAL ''10 years''',
      '       OR ((p_desde IS NULL) <> (p_hasta_exclusivo IS NULL))
       OR (p_desde IS NOT NULL AND
         (p_hasta_exclusivo <= p_desde
          OR p_hasta_exclusivo > p_desde + INTERVAL ''10 years''))');
  v_def:=replace(v_def,
      'WHERE b.fecha_registro >= p_desde
          AND b.fecha_registro < p_hasta_exclusivo',
      'WHERE (p_desde IS NULL OR
          (b.fecha_registro >= p_desde
          AND b.fecha_registro < p_hasta_exclusivo))');
  IF v_def NOT LIKE '%sp_crm_buscar_v7(%'
      OR v_def NOT LIKE '%WHERE (p_desde IS NULL OR%'
      OR v_def NOT LIKE '%OR ((p_desde IS NULL) <> (p_hasta_exclusivo IS NULL))%'
  THEN RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|La estructura de buscar_v6 cambió.'; END IF;
  EXECUTE v_def;
END $$;
REVOKE ALL ON FUNCTION public.sp_crm_buscar_v7(bigint,varchar,varchar,varchar,bigint,boolean,varchar,integer,integer,bigint,timestamptz,timestamptz)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_buscar_v7(bigint,varchar,varchar,varchar,bigint,boolean,varchar,integer,integer,bigint,timestamptz,timestamptz)
  TO sigi_app_user;