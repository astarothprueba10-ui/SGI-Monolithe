-- SGI-MONOLITHE | Sprint 4 | 5.3.3
-- Revisión independiente de vouchers de cuotas registrados en 5.3.2.
-- APROBAR: voucher APROBADO y pago CONFIRMADO, SIN aplicaciones ni abonos.
-- RECHAZAR: voucher RECHAZADO y pago ANULADO, motivo obligatorio.
-- Nunca procesa separaciones ni vouchers históricos sin preautorización 85.

CREATE TABLE IF NOT EXISTS public.pag_vouchers_cuota_revisiones (
  id_revision bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_voucher bigint NOT NULL UNIQUE REFERENCES public.pag_vouchers(id_voucher) ON DELETE RESTRICT,
  id_pago bigint NOT NULL REFERENCES public.pag_pagos(id_pago) ON DELETE RESTRICT,
  id_cuota bigint NOT NULL REFERENCES public.pag_cuotas(id_cuota) ON DELETE RESTRICT,
  id_revisor bigint NOT NULL REFERENCES public.seg_usuarios(id_usuario) ON DELETE RESTRICT,
  decision varchar(10) NOT NULL
    CHECK (decision IN ('APROBAR','RECHAZAR')),
  motivo_rechazo varchar(255),
  observaciones varchar(500),
  monto_pago numeric(14,2) NOT NULL CHECK(monto_pago>0),
  saldo_en_revision numeric(14,2) NOT NULL CHECK(saldo_en_revision>=0),
  fecha_revision timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_voucher_cuota_revision_motivo CHECK (
    (decision='APROBAR' AND motivo_rechazo IS NULL)
    OR
    (decision='RECHAZAR' AND motivo_rechazo IS NOT NULL
       AND length(btrim(motivo_rechazo)) BETWEEN 5 AND 255)
  )
);
CREATE INDEX IF NOT EXISTS idx_pag_vouchers_cuota_revisiones_fecha
  ON public.pag_vouchers_cuota_revisiones(fecha_revision DESC);
ALTER TABLE public.pag_vouchers_cuota_revisiones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pag_vouchers_cuota_revisiones
  FROM PUBLIC,anon,authenticated,sigi_app_user;

CREATE OR REPLACE FUNCTION public.sp_finanzas_revisar_voucher_cuota_v1(
 p_actor bigint,
 p_id_voucher bigint,
 p_aprobar boolean,
 p_motivo varchar DEFAULT NULL,
 p_observaciones varchar DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE
 r record;
 v_cuota bigint;
 v_estado_voucher varchar;
 v_estado_pago varchar;
 v_estado_voucher_nuevo integer;
 v_estado_pago_nuevo integer;
 v_revision bigint;
 v_prev public.pag_vouchers_cuota_revisiones%ROWTYPE;
 v_motivo varchar:=nullif(btrim(p_motivo),'');
 v_obs varchar:=nullif(btrim(p_observaciones),'');
 v_saldo numeric;
 v_sin_aplicar numeric;
 v_disponible numeric;
 v_decision varchar:=CASE WHEN p_aprobar IS TRUE THEN 'APROBAR' ELSE 'RECHAZAR' END;
BEGIN
 -- Comprobación doble: Jwt @PreAuthorize en Core y permiso real en SQL.
 IF p_actor IS NULL OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(
       p_actor,'finance.view'::varchar),false)
    OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(
       p_actor,'finance.edit'::varchar),false)
 THEN RAISE EXCEPTION 'DENEGADO|La revisión requiere finance.view y finance.edit.'; END IF;
 IF p_id_voucher IS NULL OR p_id_voucher<=0 OR p_aprobar IS NULL
    OR length(coalesce(p_observaciones,''))>500
    OR length(coalesce(p_motivo,''))>255
    OR (p_aprobar AND v_motivo IS NOT NULL)
    OR (NOT p_aprobar AND (v_motivo IS NULL
      OR length(v_motivo)<5))
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Decisión o motivo de revisión inválidos.'; END IF;

 -- Una revisión de CUOTAS solo existe para un voucher finalizado por 5.3.2.
 -- En particular, no se permite aprobar vouchers de separaciones.
 SELECT c.id_cuota INTO v_cuota
 FROM public.pag_cargas_voucher_cuota c
 WHERE c.id_voucher=p_id_voucher
   AND c.id_pago IS NOT NULL;
 IF v_cuota IS NULL THEN
   RAISE EXCEPTION 'VOUCHER_NO_DISPONIBLE|Comprobante no elegible para revisión de cuotas.'; END IF;

 -- Orden de bloqueo: CUOTA, CARGA, PAGO, VOUCHER.
 -- Todos los revisores de una misma cuota serializan disponibilidad.
 PERFORM 1 FROM public.pag_cuotas
 WHERE id_cuota=v_cuota FOR UPDATE;
 SELECT c.id_carga,c.id_actor,c.id_cuota,c.id_venta,c.id_plan_pago,
   c.id_pago,c.id_voucher,c.monto,c.clave_archivo,c.tipo_mime,c.tamanio_bytes,
   p.id_estado_pago,p.id_usuario_registro,p.id_reserva,p.id_metodo_pago,
   p.id_venta AS pago_venta,p.id_plan_pago AS pago_plan,
   p.monto AS pago_monto,
   v.id_estado_voucher,v.id_usuario_carga,v.clave_archivo AS voucher_clave,
   v.tipo_mime AS voucher_mime,v.tamanio_bytes AS voucher_bytes,
   v.activo
 INTO r
 FROM public.pag_cargas_voucher_cuota c
 JOIN public.pag_pagos p ON p.id_pago=c.id_pago
 JOIN public.pag_vouchers v ON v.id_voucher=c.id_voucher AND v.id_pago=p.id_pago
 WHERE c.id_voucher=p_id_voucher
 FOR UPDATE OF c,p,v;
 IF NOT FOUND OR r.id_cuota<>v_cuota OR r.id_reserva IS NOT NULL
   OR r.pago_venta<>r.id_venta OR r.pago_plan<>r.id_plan_pago
   OR r.pago_monto<>r.monto OR NOT r.activo
 THEN RAISE EXCEPTION 'VOUCHER_NO_DISPONIBLE|La relación de pago y cuota es inconsistente.'; END IF;
 IF p_actor=r.id_actor OR p_actor=r.id_usuario_registro OR p_actor=r.id_usuario_carga
 THEN RAISE EXCEPTION 'AUTOAPROBACION_DENEGADA|El registrador no puede revisar su propio comprobante.'; END IF;

 SELECT codigo INTO STRICT v_estado_voucher
 FROM public.cfg_estados_voucher WHERE id_estado_voucher=r.id_estado_voucher;
 SELECT codigo INTO STRICT v_estado_pago
 FROM public.cfg_estados_pago WHERE id_estado_pago=r.id_estado_pago;

 -- La decisión de un voucher es inmutable. El MISMO revisor puede
 -- repetir exactamente la misma petición, sin escribir de nuevo.
 SELECT * INTO v_prev
 FROM public.pag_vouchers_cuota_revisiones WHERE id_voucher=p_id_voucher;
 IF FOUND THEN
   IF v_prev.decision=v_decision AND v_prev.id_revisor=p_actor
      AND v_prev.motivo_rechazo IS NOT DISTINCT FROM v_motivo
      AND v_prev.observaciones IS NOT DISTINCT FROM v_obs
      AND ((v_decision='APROBAR' AND v_estado_voucher='APROBADO'
             AND v_estado_pago='CONFIRMADO')
        OR (v_decision='RECHAZAR' AND v_estado_voucher='RECHAZADO'
             AND v_estado_pago='ANULADO'))
   THEN RETURN jsonb_build_object(
     'idRevision',v_prev.id_revision,'idVoucher',r.id_voucher,
     'idPago',r.id_pago,'idCuota',r.id_cuota,
     'estadoVoucher',v_estado_voucher,'estadoPago',v_estado_pago,
     'reutilizado',true,'saldoAplicado',0,
     'accion',v_prev.decision,'resolucionAutomatica',false);
   END IF;
   RAISE EXCEPTION 'REVISION_CERRADA|El voucher ya tiene una decisión registrada.'; END IF;
 IF v_estado_voucher<>'PENDIENTE' OR v_estado_pago<>'REGISTRADO'
 THEN RAISE EXCEPTION 'REVISION_CERRADA|El voucher o pago ya no está pendiente.'; END IF;

 -- Un asiento contable previo contradice el estado inicial y requiere
 -- conciliación manual; este procedimiento no corrige históricos.
 IF EXISTS(SELECT 1 FROM public.pag_aplicaciones_pago a
           WHERE a.id_pago=r.id_pago AND a.activo)
 THEN RAISE EXCEPTION 'REVISION_CERRADA|El pago ya tiene aplicaciones contables.'; END IF;

 SELECT public.fn_fin_saldo_cuota_confirmado_v1(r.id_cuota)
 INTO v_saldo;
 IF v_saldo IS NULL THEN
   RAISE EXCEPTION 'CUOTA_NO_DISPONIBLE|Cuota no encontrada.'; END IF;

 IF p_aprobar THEN
   -- El pago solo se confirma si aún corresponde a una cuota activa
   -- y contrato firmado en vigor. Un contrato cerrado exige revisión aparte.
   IF NOT EXISTS(
     SELECT 1 FROM public.pag_cuotas q
     JOIN public.cfg_estados_cuota ec ON ec.id_estado_cuota=q.id_estado_cuota
     JOIN public.pag_planes_pago pp ON pp.id_plan_pago=q.id_plan_pago
        AND pp.id_venta=r.id_venta AND pp.es_vigente=true
     JOIN public.cfg_estados_plan_pago ep ON ep.id_estado_plan_pago=pp.id_estado_plan_pago
     WHERE q.id_cuota=r.id_cuota AND pp.id_plan_pago=r.id_plan_pago
        AND ep.codigo='ACTIVO' AND ec.codigo<>'ANULADA'
        AND EXISTS (SELECT 1 FROM public.ven_contratos ct
          JOIN public.cfg_estados_contrato est
            ON est.id_estado_contrato=ct.id_estado_contrato
          WHERE ct.id_venta=r.id_venta AND est.codigo='VIGENTE'
            AND ct.fecha_firma IS NOT NULL)
   ) THEN RAISE EXCEPTION 'CUOTA_NO_DISPONIBLE|Contrato o plan ya no está activo.'; END IF;

   -- Verificar el OBJETO REAL (no solo la ruta guardada).
   IF r.clave_archivo<>r.voucher_clave OR r.tipo_mime IS DISTINCT FROM r.voucher_mime
      OR r.tamanio_bytes IS DISTINCT FROM r.voucher_bytes
      OR r.clave_archivo !~
        '^ventas/p-[0-9]+/l-[0-9]+/[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}\.(pdf|jpg|png|webp)$'
      OR NOT EXISTS(SELECT 1 FROM storage.objects o
         WHERE o.bucket_id='vouchers-ventas-private'
           AND o.name=r.clave_archivo
           AND o.archived_at IS NULL AND o.is_delete_marker=false
           AND lower(coalesce(o.metadata->>'mimetype',''))=r.tipo_mime
           AND coalesce((o.metadata->>'size')::bigint,0)=r.tamanio_bytes
           AND r.tamanio_bytes BETWEEN 1 AND 5242880)
   THEN RAISE EXCEPTION 'ARCHIVO_NO_EXISTE|No se encontró el comprobante privado verificado.'; END IF;

   -- Evitar sobre-confirmar una misma cuota con dos vouchers pendientes.
   -- Solo se reserva el importe de pagos CONFIRMADOS todavía NO aplicados.
   SELECT coalesce(sum(greatest(0,p.monto-coalesce(a.aplicado,0))),0)
   INTO v_sin_aplicar
   FROM public.pag_cargas_voucher_cuota c
   JOIN public.pag_pagos p ON p.id_pago=c.id_pago
   JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago
     AND ep.codigo='CONFIRMADO'
   LEFT JOIN LATERAL (
     SELECT sum(ap.monto_aplicado) AS aplicado
     FROM public.pag_aplicaciones_pago ap WHERE ap.id_pago=p.id_pago AND ap.activo
   ) a ON true
   WHERE c.id_cuota=r.id_cuota AND c.id_pago<>r.id_pago;
   v_disponible:=greatest(0,v_saldo-v_sin_aplicar);
   IF r.monto>v_disponible THEN
      RAISE EXCEPTION 'MONTO_NO_DISPONIBLE|Existen pagos confirmados pendientes de aplicación para esta cuota.'; END IF;

   SELECT id_estado_voucher INTO STRICT v_estado_voucher_nuevo
   FROM public.cfg_estados_voucher WHERE codigo='APROBADO' AND activo=true;
   SELECT id_estado_pago INTO STRICT v_estado_pago_nuevo
   FROM public.cfg_estados_pago WHERE codigo='CONFIRMADO' AND activo=true;
   UPDATE public.pag_vouchers
     SET id_estado_voucher=v_estado_voucher_nuevo,
         fecha_validacion=now(),id_usuario_validacion=p_actor,
         motivo_rechazo=NULL,observaciones_validacion=v_obs,
         fecha_actualizacion=now()
   WHERE id_voucher=p_id_voucher;
   UPDATE public.pag_pagos
     SET id_estado_pago=v_estado_pago_nuevo,
         fecha_confirmacion=now(),id_usuario_confirmacion=p_actor,
         fecha_actualizacion=now()
   WHERE id_pago=r.id_pago;
 ELSE
   SELECT id_estado_voucher INTO STRICT v_estado_voucher_nuevo
   FROM public.cfg_estados_voucher WHERE codigo='RECHAZADO' AND activo=true;
   SELECT id_estado_pago INTO STRICT v_estado_pago_nuevo
   FROM public.cfg_estados_pago WHERE codigo='ANULADO' AND activo=true;
   UPDATE public.pag_vouchers
     SET id_estado_voucher=v_estado_voucher_nuevo,
         fecha_validacion=now(),id_usuario_validacion=p_actor,
         motivo_rechazo=v_motivo,observaciones_validacion=v_obs,
         fecha_actualizacion=now()
   WHERE id_voucher=p_id_voucher;
   UPDATE public.pag_pagos
     SET id_estado_pago=v_estado_pago_nuevo,
         fecha_anulacion=now(),id_usuario_anulacion=p_actor,
         motivo_anulacion=v_motivo,fecha_actualizacion=now()
   WHERE id_pago=r.id_pago;
 END IF;

 INSERT INTO public.pag_vouchers_cuota_revisiones(
    id_voucher,id_pago,id_cuota,id_revisor,decision,
    motivo_rechazo,observaciones,monto_pago,saldo_en_revision)
 VALUES(r.id_voucher,r.id_pago,r.id_cuota,p_actor,
    v_decision,v_motivo,v_obs,r.monto,v_saldo)
 RETURNING id_revision INTO v_revision;

 RETURN jsonb_build_object(
   'idRevision',v_revision,'idVoucher',r.id_voucher,
   'idPago',r.id_pago,'idCuota',r.id_cuota,
   'estadoVoucher',CASE WHEN p_aprobar THEN 'APROBADO' ELSE 'RECHAZADO' END,
   'estadoPago',CASE WHEN p_aprobar THEN 'CONFIRMADO' ELSE 'ANULADO' END,
   'accion',v_decision,'reutilizado',false,
   'saldoAplicado',0,'resolucionAutomatica',false);
END;
$fn$;

REVOKE ALL ON FUNCTION public.sp_finanzas_revisar_voucher_cuota_v1(
 bigint,bigint,boolean,varchar,varchar)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_finanzas_revisar_voucher_cuota_v1(
 bigint,bigint,boolean,varchar,varchar)
 TO sigi_app_user;
