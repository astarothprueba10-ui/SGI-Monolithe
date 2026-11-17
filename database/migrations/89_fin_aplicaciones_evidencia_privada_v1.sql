-- SGI-MONOLITHE | Sprint 4 | 5.3.4 | Verificación de evidencia
-- Los vouchers APROBADOS, incluidos los históricos, deben seguir teniendo
-- un archivo privado íntegro antes de aplicar dinero confirmado.
-- No modifica pagos, planes, cuotas ni aplicaciones anteriores.

CREATE OR REPLACE FUNCTION public.fn_fin_voucher_privado_disponible_v1(
 p_pago bigint
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
 SELECT EXISTS(
  SELECT 1 FROM public.pag_vouchers v
  JOIN public.cfg_estados_voucher ev
    ON ev.id_estado_voucher=v.id_estado_voucher AND ev.codigo='APROBADO'
  JOIN storage.objects o ON o.bucket_id='vouchers-ventas-private'
    AND o.name=v.clave_archivo
    AND o.archived_at IS NULL AND o.is_delete_marker=false
    AND lower(coalesce(o.metadata->>'mimetype',''))=v.tipo_mime
    AND coalesce((o.metadata->>'size')::bigint,0)=v.tamanio_bytes
    AND v.tamanio_bytes BETWEEN 1 AND 5242880
  WHERE v.id_pago=p_pago AND v.activo
    AND v.clave_archivo ~
     '^ventas/p-[0-9]+/l-[0-9]+/[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}\.(pdf|jpg|png|webp)$'
 );
$fn$;
REVOKE ALL ON FUNCTION public.fn_fin_voucher_privado_disponible_v1(bigint)
 FROM PUBLIC,anon,authenticated,sigi_app_user;

DO $patch$
DECLARE v_def text;
DECLARE v_mark text:=$m$ IF p_tipo='CUOTA' THEN$m$;
DECLARE v_guard text:=$m$ IF NOT public.fn_fin_voucher_privado_disponible_v1(p_id_pago) THEN
   RAISE EXCEPTION 'ARCHIVO_NO_EXISTE|El pago confirmado carece de evidencia privada vigente.';
 END IF;

$m$;
BEGIN
 SELECT pg_get_functiondef(oid) INTO STRICT v_def
 FROM pg_proc WHERE pronamespace='public'::regnamespace
   AND proname='sp_fin_aplicar_pago_confirmado_v1';
 IF strpos(v_def,v_mark)=0
 THEN RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Falta destino de imputación V1.'; END IF;
 v_def:=replace(v_def,v_mark,v_guard||v_mark);
 EXECUTE v_def;
END;
$patch$;

-- Excluir de la bandeja los pagos cuyo archivo fue retirado después
-- de la aprobación. Requieren conciliación documental, no imputación.
DO $patch$
DECLARE v_def text;
DECLARE v_mark text:=$m$WHERE p.id_reserva IS NULL AND p.id_plan_pago IS NOT NULL$m$;
DECLARE v_new text:=$m$WHERE p.id_reserva IS NULL AND p.id_plan_pago IS NOT NULL
      AND public.fn_fin_voucher_privado_disponible_v1(p.id_pago)$m$;
BEGIN
 SELECT pg_get_functiondef(oid) INTO STRICT v_def
 FROM pg_proc WHERE pronamespace='public'::regnamespace
   AND proname='sp_fin_imputaciones_v1';
 IF strpos(v_def,v_mark)=0
 THEN RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Bandeja de imputaciones V1 distinta a la auditada.'; END IF;
 v_def:=replace(v_def,v_mark,v_new);
 EXECUTE v_def;
END;
$patch$;
