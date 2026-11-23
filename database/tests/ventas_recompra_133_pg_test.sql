-- Comprobación de migración 133 sin usar compradores ni ventas reales.
DO $$
DECLARE
  v_regla text;
  v_registro text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_regla
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='sp_crm_validar_formalizacion_v6';
  SELECT pg_get_functiondef(p.oid) INTO v_registro
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='sp_crm_registrar_venta_pendiente_v14';

  IF v_regla IS NULL OR v_registro IS NULL THEN
    RAISE EXCEPTION 'VEN-133-01: faltan los procedimientos del flujo.';
  END IF;
  IF position('''CONVERTIDO''' in v_regla)=0
    OR position('v_estado=''CONVERTIDO'' AND NOT EXISTS' in v_regla)=0
    OR position('YA_COMPRADOR' in v_regla)>0 THEN
    RAISE EXCEPTION 'VEN-133-02: la recompra no está habilitada correctamente.';
  END IF;
  IF position('VENTA_EXISTENTE' in v_regla)=0
    OR position('fn_crm_puede_consultar_prospecto' in v_regla)=0
    OR position('v_estado <> ''CONVERTIDO''' in v_regla)=0 THEN
    RAISE EXCEPTION 'VEN-133-03: faltan restricciones para el comprador o el lote.';
  END IF;
  IF position('La ficha contractual no coincide con el proyecto del lote.' in v_registro)=0
    OR position('e.codigo=''CONVERTIDO''' in v_registro)=0 THEN
    RAISE EXCEPTION 'VEN-133-04: proyecto e historial de captación no están protegidos.';
  END IF;
  IF has_function_privilege('anon',
      'public.sp_crm_validar_formalizacion_v6(bigint,bigint,bigint,character varying,numeric,numeric,integer)','EXECUTE')
     OR has_function_privilege('authenticated',
      'public.sp_crm_validar_formalizacion_v6(bigint,bigint,bigint,character varying,numeric,numeric,integer)','EXECUTE')
     OR has_function_privilege('anon',
      'public.sp_crm_registrar_venta_pendiente_v14(bigint,bigint,bigint,character varying,numeric,numeric,integer,numeric,text,jsonb,jsonb)','EXECUTE')
     OR NOT has_function_privilege('sigi_app_user',
      'public.sp_crm_validar_formalizacion_v6(bigint,bigint,bigint,character varying,numeric,numeric,integer)','EXECUTE') THEN
    RAISE EXCEPTION 'VEN-133-05: permisos inseguros del RPC.';
  END IF;
  RAISE NOTICE 'VEN-133: recompra, proyectos, estado de lote y permisos correctos.';
END $$;
