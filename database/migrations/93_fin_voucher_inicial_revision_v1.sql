-- SGI MONOLITHE · Sprint 4 / 5.3.5
-- La revisión de INICIAL es independiente del registrador, sin imputación.
CREATE TABLE IF NOT EXISTS public.pag_vouchers_inicial_revisiones_v1 (
 id_revision bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 id_voucher bigint NOT NULL UNIQUE REFERENCES public.pag_vouchers(id_voucher),
 id_pago bigint NOT NULL REFERENCES public.pag_pagos(id_pago),
 id_plan_pago bigint NOT NULL REFERENCES public.pag_planes_pago(id_plan_pago),
 id_revisor bigint NOT NULL REFERENCES public.seg_usuarios(id_usuario),
 decision varchar(10) NOT NULL CHECK(decision IN('APROBAR','RECHAZAR')),
 motivo_rechazo varchar(255),
 observaciones varchar(500),
 monto_pago numeric(14,2) NOT NULL CHECK(monto_pago>0),
 saldo_en_revision numeric(14,2) NOT NULL CHECK(saldo_en_revision>=0),
 fecha_revision timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT ck_revision_inicial_motivo CHECK(
  (decision='APROBAR' AND motivo_rechazo IS NULL) OR
  (decision='RECHAZAR' AND length(btrim(motivo_rechazo)) BETWEEN 5 AND 255))
);
ALTER TABLE public.pag_vouchers_inicial_revisiones_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pag_vouchers_inicial_revisiones_v1
 FROM PUBLIC,anon,authenticated,sigi_app_user;

CREATE OR REPLACE FUNCTION public.sp_finanzas_revisar_voucher_inicial_v1(
 p_actor bigint,p_voucher bigint,p_aprobar boolean,
 p_motivo varchar DEFAULT NULL,p_observaciones varchar DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE
 r record; v_plan bigint;v_prev public.pag_vouchers_inicial_revisiones_v1%ROWTYPE;
 v_estado_v varchar;v_estado_p varchar;
 v_estado_v_nuevo int;v_estado_p_nuevo int;v_revision bigint;
 v_motivo varchar:=nullif(btrim(p_motivo),'');
 v_obs varchar:=nullif(btrim(p_observaciones),'');
 v_decision varchar:=CASE WHEN p_aprobar THEN 'APROBAR' ELSE 'RECHAZAR' END;
 v_saldo numeric;v_reservado numeric;
BEGIN
 IF p_actor IS NULL OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(
   p_actor,'finance.view'::varchar),false)
   OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(
   p_actor,'finance.edit'::varchar),false)
 THEN RAISE EXCEPTION 'DENEGADO|Finanzas requiere finance.view y finance.edit.'; END IF;
 IF p_voucher IS NULL OR p_voucher<=0 OR p_aprobar IS NULL
   OR length(coalesce(p_observaciones,''))>500
   OR length(coalesce(p_motivo,''))>255
   OR (p_aprobar AND v_motivo IS NOT NULL)
   OR (NOT p_aprobar AND (v_motivo IS NULL OR length(v_motivo)<5))
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Decisión o motivo inválido.'; END IF;

 SELECT id_plan_pago INTO v_plan FROM public.pag_cargas_voucher_inicial_v1
 WHERE id_voucher=p_voucher AND id_pago IS NOT NULL;
 IF v_plan IS NULL THEN RAISE EXCEPTION 'VOUCHER_NO_DISPONIBLE|Voucher sin origen de inicial.'; END IF;
 -- Serializar revisiones del mismo plan para reservar saldos confirmados.
 PERFORM 1 FROM public.pag_planes_pago WHERE id_plan_pago=v_plan FOR UPDATE;
 SELECT c.id_actor,c.id_venta,c.id_plan_pago,c.id_pago,c.id_voucher,
    c.monto,c.clave_archivo,c.tipo_mime,c.tamanio_bytes,
    p.id_reserva,p.id_usuario_registro,p.id_venta pago_venta,
    p.id_plan_pago pago_plan,p.monto pago_monto,p.id_estado_pago,
    v.id_usuario_carga,v.id_estado_voucher,v.clave_archivo voucher_clave,
    v.tipo_mime voucher_mime,v.tamanio_bytes voucher_bytes,v.activo
 INTO r
 FROM public.pag_cargas_voucher_inicial_v1 c
 JOIN public.pag_pagos p ON p.id_pago=c.id_pago
 JOIN public.pag_vouchers v ON v.id_voucher=c.id_voucher AND v.id_pago=p.id_pago
 WHERE c.id_voucher=p_voucher
 FOR UPDATE OF c,p,v;
 IF NOT FOUND OR r.id_plan_pago<>v_plan OR r.id_reserva IS NOT NULL
     OR r.pago_venta<>r.id_venta OR r.pago_plan<>r.id_plan_pago
     OR r.monto<>r.pago_monto OR NOT r.activo
 THEN RAISE EXCEPTION 'VOUCHER_NO_DISPONIBLE|Inconsistencia del pago de inicial.'; END IF;
 IF p_actor IN(r.id_actor,r.id_usuario_registro,r.id_usuario_carga)
 THEN RAISE EXCEPTION 'AUTOAPROBACION_DENEGADA|Revisor igual al registrador.'; END IF;

 SELECT codigo INTO STRICT v_estado_v FROM public.cfg_estados_voucher
 WHERE id_estado_voucher=r.id_estado_voucher;
 SELECT codigo INTO STRICT v_estado_p FROM public.cfg_estados_pago
 WHERE id_estado_pago=r.id_estado_pago;
 SELECT * INTO v_prev FROM public.pag_vouchers_inicial_revisiones_v1
 WHERE id_voucher=p_voucher;
 IF FOUND THEN
   IF v_prev.decision=v_decision AND v_prev.id_revisor=p_actor
       AND v_prev.motivo_rechazo IS NOT DISTINCT FROM v_motivo
       AND v_prev.observaciones IS NOT DISTINCT FROM v_obs
       AND ((p_aprobar AND v_estado_p='CONFIRMADO' AND v_estado_v='APROBADO')
          OR (NOT p_aprobar AND v_estado_p='ANULADO' AND v_estado_v='RECHAZADO'))
   THEN RETURN jsonb_build_object('idRevision',v_prev.id_revision,
     'idPago',r.id_pago,'idVoucher',r.id_voucher,'destino','INICIAL',
     'estadoPago',v_estado_p,'estadoVoucher',v_estado_v,
     'saldoAplicado',0,'reutilizado',true); END IF;
   RAISE EXCEPTION 'REVISION_CERRADA|Decisión ya registrada.'; END IF;
 IF v_estado_p<>'REGISTRADO' OR v_estado_v<>'PENDIENTE'
 THEN RAISE EXCEPTION 'REVISION_CERRADA|Pago o voucher no pendiente.'; END IF;
 IF EXISTS(SELECT 1 FROM public.pag_aplicaciones_pago a
   WHERE a.id_pago=r.id_pago AND a.activo)
 THEN RAISE EXCEPTION 'REVISION_CERRADA|Pago ya aplicado.'; END IF;

 -- Las aplicaciones INICIAL de pagos CONFIRMADOS reducen la inicial.
 -- Pagos confirmados todavía no aplicados reservan el mismo saldo
 -- y evitan dos confirmaciones que lo sobrepasen.
 SELECT greatest(0,pp.monto_inicial-coalesce((
  SELECT sum(a.monto_aplicado) FROM public.pag_aplicaciones_pago a
  JOIN public.cfg_tipos_aplicacion_pago t
    ON t.id_tipo_aplicacion_pago=a.id_tipo_aplicacion_pago AND t.codigo='INICIAL'
  JOIN public.pag_pagos p ON p.id_pago=a.id_pago AND p.id_plan_pago=pp.id_plan_pago
  JOIN public.cfg_estados_pago e ON e.id_estado_pago=p.id_estado_pago AND e.codigo='CONFIRMADO'
  WHERE a.id_plan_pago=pp.id_plan_pago AND a.id_cuota IS NULL AND a.activo
 ),0))
 INTO v_saldo FROM public.pag_planes_pago pp
 JOIN public.cfg_estados_plan_pago ep ON ep.id_estado_plan_pago=pp.id_estado_plan_pago
 WHERE pp.id_plan_pago=v_plan AND pp.id_venta=r.id_venta AND pp.es_vigente
   AND ep.codigo='ACTIVO'
   AND EXISTS(SELECT 1 FROM public.ven_contratos ct
      JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=ct.id_estado_contrato
      WHERE ct.id_venta=r.id_venta AND ec.codigo='VIGENTE'
        AND ct.fecha_firma IS NOT NULL);
 IF v_saldo IS NULL THEN
   RAISE EXCEPTION 'INICIAL_NO_DISPONIBLE|Plan o contrato no activo.'; END IF;

 IF p_aprobar THEN
  IF NOT EXISTS(SELECT 1 FROM storage.objects o
   WHERE o.bucket_id='vouchers-ventas-private' AND o.name=r.clave_archivo
    AND o.archived_at IS NULL AND o.is_delete_marker=false
    AND r.clave_archivo=r.voucher_clave
    AND r.tipo_mime IS NOT DISTINCT FROM r.voucher_mime
    AND r.tamanio_bytes IS NOT DISTINCT FROM r.voucher_bytes
    AND lower(coalesce(o.metadata->>'mimetype',''))=r.tipo_mime
    AND coalesce((o.metadata->>'size')::bigint,0)=r.tamanio_bytes
    AND r.tamanio_bytes BETWEEN 1 AND 5242880)
  THEN RAISE EXCEPTION 'ARCHIVO_NO_EXISTE|Voucher privado no verificable.'; END IF;
  SELECT coalesce(sum(greatest(0,p.monto-coalesce((
    SELECT sum(a.monto_aplicado) FROM public.pag_aplicaciones_pago a
    WHERE a.id_pago=p.id_pago AND a.activo
  ),0))),0)
  INTO v_reservado
  FROM public.pag_pagos p
  JOIN public.cfg_estados_pago e ON e.id_estado_pago=p.id_estado_pago
     AND e.codigo='CONFIRMADO'
  LEFT JOIN public.pag_cargas_voucher_cuota c ON c.id_pago=p.id_pago
  WHERE p.id_plan_pago=v_plan AND p.id_reserva IS NULL AND p.id_pago<>r.id_pago
     AND c.id_pago IS NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.pag_aplicaciones_pago a
       JOIN public.cfg_tipos_aplicacion_pago t
         ON t.id_tipo_aplicacion_pago=a.id_tipo_aplicacion_pago
       WHERE a.id_pago=p.id_pago AND a.activo AND t.codigo<>'INICIAL');
  IF r.monto>greatest(0,v_saldo-v_reservado)
  THEN RAISE EXCEPTION 'MONTO_NO_DISPONIBLE|Inicial reservada por otros pagos confirmados.'; END IF;
  SELECT id_estado_voucher INTO STRICT v_estado_v_nuevo
  FROM public.cfg_estados_voucher WHERE codigo='APROBADO' AND activo;
  SELECT id_estado_pago INTO STRICT v_estado_p_nuevo
  FROM public.cfg_estados_pago WHERE codigo='CONFIRMADO' AND activo;
  UPDATE public.pag_vouchers SET id_estado_voucher=v_estado_v_nuevo,
    fecha_validacion=now(),id_usuario_validacion=p_actor,
    motivo_rechazo=NULL,observaciones_validacion=v_obs,fecha_actualizacion=now()
  WHERE id_voucher=p_voucher;
  UPDATE public.pag_pagos SET id_estado_pago=v_estado_p_nuevo,
    fecha_confirmacion=now(),id_usuario_confirmacion=p_actor,
    fecha_actualizacion=now()
  WHERE id_pago=r.id_pago;
 ELSE
  SELECT id_estado_voucher INTO STRICT v_estado_v_nuevo
  FROM public.cfg_estados_voucher WHERE codigo='RECHAZADO' AND activo;
  SELECT id_estado_pago INTO STRICT v_estado_p_nuevo
  FROM public.cfg_estados_pago WHERE codigo='ANULADO' AND activo;
  UPDATE public.pag_vouchers SET id_estado_voucher=v_estado_v_nuevo,
    fecha_validacion=now(),id_usuario_validacion=p_actor,
    motivo_rechazo=v_motivo,observaciones_validacion=v_obs,
    fecha_actualizacion=now() WHERE id_voucher=p_voucher;
  UPDATE public.pag_pagos SET id_estado_pago=v_estado_p_nuevo,
    fecha_anulacion=now(),id_usuario_anulacion=p_actor,
    motivo_anulacion=v_motivo,fecha_actualizacion=now()
  WHERE id_pago=r.id_pago;
 END IF;
 INSERT INTO public.pag_vouchers_inicial_revisiones_v1(
  id_voucher,id_pago,id_plan_pago,id_revisor,decision,
  motivo_rechazo,observaciones,monto_pago,saldo_en_revision
 ) VALUES(p_voucher,r.id_pago,v_plan,p_actor,v_decision,
   v_motivo,v_obs,r.monto,v_saldo)
 RETURNING id_revision INTO v_revision;
 RETURN jsonb_build_object('idRevision',v_revision,
   'idPago',r.id_pago,'idVoucher',r.id_voucher,'destino','INICIAL',
   'estadoPago',CASE WHEN p_aprobar THEN 'CONFIRMADO' ELSE 'ANULADO' END,
   'estadoVoucher',CASE WHEN p_aprobar THEN 'APROBADO' ELSE 'RECHAZADO' END,
   'saldoAplicado',0,'reutilizado',false);
END;
$fn$;

-- El endpoint 5.3.3 se mantiene estable; decide por el origen de
-- preautorización, nunca a partir de una cadena enviada por el navegador.
CREATE OR REPLACE FUNCTION public.sp_finanzas_revisar_voucher_financiamiento_v2(
 p_actor bigint,p_voucher bigint,p_aprobar boolean,
 p_motivo varchar DEFAULT NULL,p_observaciones varchar DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
BEGIN
 IF EXISTS(SELECT 1 FROM public.pag_cargas_voucher_inicial_v1
    WHERE id_voucher=p_voucher)
 THEN RETURN public.sp_finanzas_revisar_voucher_inicial_v1(
   p_actor,p_voucher,p_aprobar,p_motivo,p_observaciones); END IF;
 RETURN public.sp_finanzas_revisar_voucher_cuota_v1(
   p_actor,p_voucher,p_aprobar,p_motivo,p_observaciones);
END;
$fn$;

-- Misma bandeja segura, enriquecida con destino determinado en SQL.
CREATE OR REPLACE FUNCTION public.sp_finanzas_listar_vouchers_financiamiento_v2(
 p_actor bigint,p_estado varchar DEFAULT 'TODOS',
 p_busqueda varchar DEFAULT NULL,p_pagina integer DEFAULT 1,p_tamano integer DEFAULT 20
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE v_res jsonb;v_items jsonb;
BEGIN
 v_res:=public.sp_finanzas_listar_vouchers_cuotas_v1(
  p_actor,p_estado,p_busqueda,p_pagina,p_tamano);
 SELECT coalesce(jsonb_agg(e.value||jsonb_build_object(
   'tipo_destino',
      CASE WHEN EXISTS(SELECT 1 FROM public.pag_cargas_voucher_inicial_v1 c
                  WHERE c.id_voucher=(e.value->>'id_voucher')::bigint)
         THEN 'INICIAL'
           WHEN EXISTS(SELECT 1 FROM public.pag_cargas_voucher_cuota c
                  WHERE c.id_voucher=(e.value->>'id_voucher')::bigint)
         THEN 'CUOTA'
       ELSE 'HISTORICO' END) ORDER BY e.ord),'[]'::jsonb)
 INTO v_items FROM jsonb_array_elements(v_res->'items')
 WITH ORDINALITY AS e(value,ord);
 RETURN jsonb_set(v_res,'{items}',v_items);
END;
$fn$;

REVOKE ALL ON FUNCTION public.sp_finanzas_revisar_voucher_inicial_v1(
 bigint,bigint,boolean,varchar,varchar) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_finanzas_revisar_voucher_inicial_v1(
 bigint,bigint,boolean,varchar,varchar) TO sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_finanzas_revisar_voucher_financiamiento_v2(
 bigint,bigint,boolean,varchar,varchar) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_finanzas_revisar_voucher_financiamiento_v2(
 bigint,bigint,boolean,varchar,varchar) TO sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_finanzas_listar_vouchers_financiamiento_v2(
 bigint,varchar,varchar,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_finanzas_listar_vouchers_financiamiento_v2(
 bigint,varchar,varchar,integer,integer) TO sigi_app_user;
