-- SGI-MONOLITHE | Sprint 4 | 5.3.4 | Ajuste de compatibilidad IDENTITY
-- En Supabase real, pag_aplicaciones_pago.id_aplicacion_pago es
-- GENERATED ALWAYS AS IDENTITY; no se le debe entregar nextval manual.
-- El fixture CI posee DEFAULT nextval y sigue siendo compatible.
-- Solo reemplaza la DEFINICIÓN del procedimiento, sin DML de históricos.
DO $patch$
DECLARE
 v_def text;
 v_old text:=$sql$INSERT INTO public.pag_aplicaciones_pago(
   id_aplicacion_pago,id_pago,id_tipo_aplicacion_pago,id_plan_pago,
   id_cuota,monto_aplicado,id_usuario_aplicacion,observaciones,activo)
 VALUES(nextval('public.pag_aplicaciones_pago_id_aplicacion_pago_seq'::regclass),
   p_id_pago,v_tipo_id,v_plan,p_id_cuota,p_monto,p_actor,v_observaciones,true)$sql$;
 v_new text:=$sql$INSERT INTO public.pag_aplicaciones_pago(
   id_pago,id_tipo_aplicacion_pago,id_plan_pago,
   id_cuota,monto_aplicado,id_usuario_aplicacion,observaciones,activo)
 VALUES(p_id_pago,v_tipo_id,v_plan,p_id_cuota,p_monto,p_actor,v_observaciones,true)$sql$;
BEGIN
 SELECT pg_get_functiondef(oid) INTO STRICT v_def FROM pg_proc
 WHERE pronamespace='public'::regnamespace
   AND proname='sp_fin_aplicar_pago_confirmado_v1'
   AND pg_get_function_identity_arguments(oid)=
    'p_actor bigint, p_solicitud uuid, p_id_pago bigint, p_tipo character varying, p_id_cuota bigint, p_monto numeric, p_observaciones character varying';
 IF strpos(v_def,v_old)=0
 THEN RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Procedimiento de aplicación distinto del auditado.'; END IF;
 v_def:=replace(v_def,v_old,v_new);
 EXECUTE v_def;
END;
$patch$;
