-- Diferenciar la modalidad FINANCIADA del tipo de abono INICIAL en finanzas.
DO $patch$
DECLARE v_def text;
BEGIN
 SELECT pg_get_functiondef(oid) INTO STRICT v_def FROM pg_proc
 WHERE pronamespace='public'::regnamespace
   AND proname='sp_crm_registrar_venta_pendiente_v13';
 IF strpos(v_def,'v_monto_objetivo,p_modalidad,p_actor')>0 THEN
   v_def:=replace(v_def,'v_monto_objetivo,p_modalidad,p_actor',
     'v_monto_objetivo,CASE WHEN p_modalidad=''FINANCIADA'' THEN ''INICIAL'' ELSE ''CONTADO'' END,p_actor');
   EXECUTE v_def;
 ELSIF strpos(v_def,'''INICIAL'' ELSE ''CONTADO'' END,p_actor')=0 THEN
   RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|No se pudo establecer el tipo de abono.';
 END IF;
END $patch$;
