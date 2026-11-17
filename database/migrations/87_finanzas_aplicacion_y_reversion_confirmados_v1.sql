-- SGI MONOLITHE | Sprint 4 / 5.3.4
-- Aplica SOLO pagos confirmados con voucher aprobado, no separaciones.
-- Toda reversión es lógica y auditada. Nunca modifica pag_cuotas ni planes.
-- Los estados de cuotas se calculan por 5.2.5 desde aplicaciones activas.

CREATE TABLE IF NOT EXISTS public.pag_imputaciones_operaciones_v1 (
  id_solicitud uuid PRIMARY KEY,
  id_aplicacion_pago bigint NOT NULL UNIQUE
    REFERENCES public.pag_aplicaciones_pago(id_aplicacion_pago) ON DELETE RESTRICT,
  id_pago bigint NOT NULL REFERENCES public.pag_pagos(id_pago) ON DELETE RESTRICT,
  id_plan_pago bigint NOT NULL REFERENCES public.pag_planes_pago(id_plan_pago) ON DELETE RESTRICT,
  id_cuota bigint REFERENCES public.pag_cuotas(id_cuota) ON DELETE RESTRICT,
  tipo varchar(10) NOT NULL CHECK(tipo IN ('CUOTA','INICIAL')),
  monto numeric(14,2) NOT NULL CHECK(monto>0),
  observaciones varchar(255),
  id_actor bigint NOT NULL REFERENCES public.seg_usuarios(id_usuario) ON DELETE RESTRICT,
  fecha_registro timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pag_imputaciones_operaciones_v1_pago
 ON public.pag_imputaciones_operaciones_v1(id_pago,fecha_registro DESC);
ALTER TABLE public.pag_imputaciones_operaciones_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pag_imputaciones_operaciones_v1
 FROM PUBLIC,anon,authenticated,sigi_app_user;

-- Listado de dinero confirmado sin aplicar, más historial auditable.
-- Toda identidad y saldo provienen de la base; no se entregan rutas Storage.
CREATE OR REPLACE FUNCTION public.sp_fin_imputaciones_v1(
 p_actor bigint,p_pagina integer DEFAULT 1,p_tamano integer DEFAULT 20
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE
 v_items jsonb;
 v_historial jsonb;
 v_total integer;
BEGIN
 IF p_actor IS NULL OR NOT coalesce(
    public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.view'::varchar),false)
 THEN RAISE EXCEPTION 'DENEGADO|Sin permiso finance.view.'; END IF;
 IF p_pagina IS NULL OR p_pagina NOT BETWEEN 1 AND 10000
    OR p_tamano IS NULL OR p_tamano NOT BETWEEN 1 AND 100
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Paginación inválida.'; END IF;

 WITH source AS (
   SELECT p.id_pago,p.codigo AS codigo_pago,p.id_venta,p.id_plan_pago,
      v.codigo AS codigo_venta,p.monto AS monto_pago,
      p.fecha_confirmacion,
      c.id_cuota AS cuota_preautorizada,
      c.id_carga,
      q.numero_cuota,
      CASE WHEN c.id_carga IS NOT NULL THEN 'CUOTA' ELSE 'INICIAL' END AS tipo_destino,
      greatest(0,p.monto-coalesce(ap.monto,0)) AS saldo_pago,
      CASE WHEN c.id_carga IS NOT NULL
           THEN public.fn_fin_saldo_cuota_confirmado_v1(c.id_cuota)
           ELSE greatest(0,pp.monto_inicial-coalesce(ini.monto,0))
      END saldo_destino
   FROM public.pag_pagos p
   JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago
     AND ep.codigo='CONFIRMADO'
   JOIN public.pag_planes_pago pp ON pp.id_plan_pago=p.id_plan_pago
     AND pp.id_venta=p.id_venta AND pp.id_moneda=p.id_moneda
     AND pp.es_vigente
   JOIN public.cfg_estados_plan_pago epp ON epp.id_estado_plan_pago=pp.id_estado_plan_pago
     AND epp.codigo='ACTIVO'
   JOIN public.ven_ventas v ON v.id_venta=p.id_venta
   LEFT JOIN public.pag_cargas_voucher_cuota c ON c.id_pago=p.id_pago
   LEFT JOIN public.pag_cuotas q ON q.id_cuota=c.id_cuota
     AND q.id_plan_pago=pp.id_plan_pago
   LEFT JOIN LATERAL (
     SELECT sum(a.monto_aplicado) monto FROM public.pag_aplicaciones_pago a
     WHERE a.id_pago=p.id_pago AND a.activo
   ) ap ON true
   LEFT JOIN LATERAL (
     SELECT sum(a.monto_aplicado) monto
     FROM public.pag_aplicaciones_pago a
     JOIN public.cfg_tipos_aplicacion_pago ta
      ON ta.id_tipo_aplicacion_pago=a.id_tipo_aplicacion_pago AND ta.codigo='INICIAL'
     JOIN public.pag_pagos px ON px.id_pago=a.id_pago
     JOIN public.cfg_estados_pago ex ON ex.id_estado_pago=px.id_estado_pago
      AND ex.codigo='CONFIRMADO'
     WHERE a.id_plan_pago=pp.id_plan_pago AND a.activo AND a.id_cuota IS NULL
   ) ini ON true
   WHERE p.id_reserva IS NULL AND p.id_plan_pago IS NOT NULL
      AND EXISTS(SELECT 1 FROM public.pag_vouchers pv
          JOIN public.cfg_estados_voucher ev ON ev.id_estado_voucher=pv.id_estado_voucher
          WHERE pv.id_pago=p.id_pago AND pv.activo AND ev.codigo='APROBADO')
      AND EXISTS(SELECT 1 FROM public.ven_contratos ct
          JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=ct.id_estado_contrato
          WHERE ct.id_venta=p.id_venta AND ec.codigo='VIGENTE' AND ct.fecha_firma IS NOT NULL)
      AND (c.id_carga IS NOT NULL
        OR NOT EXISTS (SELECT 1 FROM public.pag_aplicaciones_pago az
           JOIN public.cfg_tipos_aplicacion_pago tz
             ON tz.id_tipo_aplicacion_pago=az.id_tipo_aplicacion_pago
           WHERE az.id_pago=p.id_pago AND az.activo AND tz.codigo<>'INICIAL'))
 ),
 items AS (
   SELECT * FROM source
   WHERE saldo_pago>0 AND saldo_destino>0
     AND (tipo_destino='INICIAL' OR numero_cuota IS NOT NULL)
 )
 SELECT count(*) INTO v_total FROM items;
 WITH source AS (
   SELECT p.id_pago,p.codigo codigo_pago,p.id_venta,p.id_plan_pago,v.codigo codigo_venta,
     p.monto monto_pago,p.fecha_confirmacion,c.id_cuota cuota_preautorizada,
     q.numero_cuota,
     CASE WHEN c.id_carga IS NOT NULL THEN 'CUOTA' ELSE 'INICIAL' END tipo_destino,
     greatest(0,p.monto-coalesce((SELECT sum(a.monto_aplicado) FROM public.pag_aplicaciones_pago a
       WHERE a.id_pago=p.id_pago AND a.activo),0)) saldo_pago,
     CASE WHEN c.id_carga IS NOT NULL THEN public.fn_fin_saldo_cuota_confirmado_v1(c.id_cuota)
       ELSE greatest(0,pp.monto_inicial-coalesce((
         SELECT sum(a.monto_aplicado)
         FROM public.pag_aplicaciones_pago a
         JOIN public.cfg_tipos_aplicacion_pago ta ON ta.id_tipo_aplicacion_pago=a.id_tipo_aplicacion_pago
         JOIN public.pag_pagos px ON px.id_pago=a.id_pago
         JOIN public.cfg_estados_pago ex ON ex.id_estado_pago=px.id_estado_pago
         WHERE a.id_plan_pago=pp.id_plan_pago AND a.activo AND a.id_cuota IS NULL
            AND ta.codigo='INICIAL' AND ex.codigo='CONFIRMADO'
       ),0))
     END saldo_destino
   FROM public.pag_pagos p
   JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago AND ep.codigo='CONFIRMADO'
   JOIN public.pag_planes_pago pp ON pp.id_plan_pago=p.id_plan_pago
      AND pp.id_venta=p.id_venta AND pp.id_moneda=p.id_moneda AND pp.es_vigente
   JOIN public.cfg_estados_plan_pago epp ON epp.id_estado_plan_pago=pp.id_estado_plan_pago
      AND epp.codigo='ACTIVO'
   JOIN public.ven_ventas v ON v.id_venta=p.id_venta
   LEFT JOIN public.pag_cargas_voucher_cuota c ON c.id_pago=p.id_pago
   LEFT JOIN public.pag_cuotas q ON q.id_cuota=c.id_cuota AND q.id_plan_pago=pp.id_plan_pago
   WHERE p.id_reserva IS NULL AND p.id_plan_pago IS NOT NULL
     AND EXISTS(SELECT 1 FROM public.pag_vouchers pv
         JOIN public.cfg_estados_voucher ev ON ev.id_estado_voucher=pv.id_estado_voucher
         WHERE pv.id_pago=p.id_pago AND pv.activo AND ev.codigo='APROBADO')
     AND EXISTS(SELECT 1 FROM public.ven_contratos ct
         JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=ct.id_estado_contrato
         WHERE ct.id_venta=p.id_venta AND ec.codigo='VIGENTE' AND ct.fecha_firma IS NOT NULL)
     AND (c.id_carga IS NOT NULL OR NOT EXISTS(
        SELECT 1 FROM public.pag_aplicaciones_pago az
        JOIN public.cfg_tipos_aplicacion_pago tz ON tz.id_tipo_aplicacion_pago=az.id_tipo_aplicacion_pago
        WHERE az.id_pago=p.id_pago AND az.activo AND tz.codigo<>'INICIAL'))
 )
 SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.id_pago),'[]'::jsonb)
 INTO v_items FROM (
   SELECT * FROM source WHERE saldo_pago>0 AND saldo_destino>0
     AND (tipo_destino='INICIAL' OR numero_cuota IS NOT NULL)
   ORDER BY id_pago LIMIT p_tamano OFFSET (p_pagina-1)*p_tamano
 ) t;
 SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.id_aplicacion_pago DESC),'[]'::jsonb)
 INTO v_historial FROM (
   SELECT o.id_aplicacion_pago,o.id_pago,o.id_plan_pago,o.id_cuota,o.tipo,
      o.monto,o.id_actor,o.fecha_registro,o.observaciones,
      a.activo,a.fecha_anulacion,a.id_usuario_anulacion,a.motivo_anulacion,
      p.codigo AS codigo_pago
   FROM public.pag_imputaciones_operaciones_v1 o
   JOIN public.pag_aplicaciones_pago a ON a.id_aplicacion_pago=o.id_aplicacion_pago
   JOIN public.pag_pagos p ON p.id_pago=o.id_pago
   ORDER BY o.id_aplicacion_pago DESC LIMIT 60
 ) t;
 RETURN jsonb_build_object('items',v_items,'total',v_total,
    'pagina',p_pagina,'tamano',p_tamano,
    'paginas',greatest(1,ceil(v_total::numeric/p_tamano)::integer),
    'historial',v_historial);
END;
$fn$;

-- Orden de locks: PLAN > CUOTA > PAGO > SOLICITUD (misma regla en reversión).
CREATE OR REPLACE FUNCTION public.sp_fin_aplicar_pago_confirmado_v1(
 p_actor bigint,p_solicitud uuid,p_id_pago bigint,p_tipo varchar,
 p_id_cuota bigint,p_monto numeric,p_observaciones varchar DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE
 r record;
 v_plan bigint;v_cuota bigint;v_tipo_id integer;v_aplicacion bigint;
 v_aplicado numeric;v_saldo numeric;v_pago_disponible numeric;
 v_obra public.pag_imputaciones_operaciones_v1%ROWTYPE;
 v_estado varchar;v_observaciones varchar:=nullif(btrim(p_observaciones),'');
BEGIN
 IF p_actor IS NULL OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(
     p_actor,'finance.view'::varchar),false)
    OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(
     p_actor,'finance.edit'::varchar),false)
 THEN RAISE EXCEPTION 'DENEGADO|Se requiere finance.view y finance.edit.'; END IF;
 IF p_solicitud IS NULL OR p_id_pago IS NULL OR p_id_pago<=0
   OR p_tipo NOT IN ('CUOTA','INICIAL') OR p_tipo IS NULL
   OR p_monto IS NULL OR p_monto<=0 OR p_monto<>round(p_monto,2)
   OR (p_tipo='CUOTA' AND (p_id_cuota IS NULL OR p_id_cuota<=0))
   OR (p_tipo='INICIAL' AND p_id_cuota IS NOT NULL)
   OR length(coalesce(p_observaciones,''))>255
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Solicitud de imputación inválida.'; END IF;
 SELECT * INTO v_obra FROM public.pag_imputaciones_operaciones_v1
 WHERE id_solicitud=p_solicitud;
 IF FOUND THEN
   IF v_obra.id_actor=p_actor AND v_obra.id_pago=p_id_pago
      AND v_obra.tipo=p_tipo AND v_obra.id_cuota IS NOT DISTINCT FROM p_id_cuota
      AND v_obra.monto=p_monto AND v_obra.observaciones IS NOT DISTINCT FROM v_observaciones
   THEN RETURN jsonb_build_object('idAplicacion',v_obra.id_aplicacion_pago,
     'idPago',v_obra.id_pago,'montoAplicado',v_obra.monto,'tipo',v_obra.tipo,
     'reutilizado',true,'activo',(SELECT activo FROM public.pag_aplicaciones_pago
       WHERE id_aplicacion_pago=v_obra.id_aplicacion_pago));
   END IF;
   RAISE EXCEPTION 'SOLICITUD_DUPLICADA|El identificador pertenece a otra operación.'; END IF;

 SELECT id_plan_pago INTO v_plan FROM public.pag_pagos
 WHERE id_pago=p_id_pago;
 IF v_plan IS NULL THEN RAISE EXCEPTION 'PAGO_NO_DISPONIBLE|Pago sin plan de financiamiento.'; END IF;
 PERFORM 1 FROM public.pag_planes_pago WHERE id_plan_pago=v_plan FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'PAGO_NO_DISPONIBLE|Plan no disponible.'; END IF;
 IF p_id_cuota IS NOT NULL THEN
   PERFORM 1 FROM public.pag_cuotas WHERE id_cuota=p_id_cuota AND id_plan_pago=v_plan FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'CUOTA_NO_DISPONIBLE|La cuota no corresponde al plan.'; END IF;
 END IF;
 SELECT p.id_pago,p.id_venta,p.id_plan_pago,p.id_moneda,p.id_reserva,
     p.monto,ep.codigo AS estado_pago,pp.monto_inicial,pp.es_vigente,
     epp.codigo estado_plan,c.id_cuota AS cuota_origen,c.id_carga
 INTO r FROM public.pag_pagos p
 JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago
 JOIN public.pag_planes_pago pp ON pp.id_plan_pago=p.id_plan_pago AND pp.id_venta=p.id_venta
     AND pp.id_moneda=p.id_moneda
 JOIN public.cfg_estados_plan_pago epp ON epp.id_estado_plan_pago=pp.id_estado_plan_pago
 LEFT JOIN public.pag_cargas_voucher_cuota c ON c.id_pago=p.id_pago
 WHERE p.id_pago=p_id_pago FOR UPDATE OF p;
 IF NOT FOUND OR r.id_reserva IS NOT NULL OR r.estado_pago<>'CONFIRMADO'
   OR NOT r.es_vigente OR r.estado_plan<>'ACTIVO'
   OR NOT EXISTS(SELECT 1 FROM public.ven_contratos ct
      JOIN public.cfg_estados_contrato e ON e.id_estado_contrato=ct.id_estado_contrato
      WHERE ct.id_venta=r.id_venta AND e.codigo='VIGENTE' AND ct.fecha_firma IS NOT NULL)
   OR NOT EXISTS(SELECT 1 FROM public.pag_vouchers vv
      JOIN public.cfg_estados_voucher ev ON ev.id_estado_voucher=vv.id_estado_voucher
         AND ev.codigo='APROBADO'
      WHERE vv.id_pago=r.id_pago AND vv.activo)
 THEN RAISE EXCEPTION 'PAGO_NO_DISPONIBLE|Pago no confirmado o contrato no vigente.'; END IF;

 IF p_tipo='CUOTA' THEN
   IF r.cuota_origen IS NULL OR r.cuota_origen<>p_id_cuota
      OR NOT EXISTS(SELECT 1 FROM public.pag_vouchers_cuota_revisiones rv
         WHERE rv.id_pago=r.id_pago AND rv.decision='APROBAR')
      OR EXISTS(SELECT 1 FROM public.pag_cuotas q
        JOIN public.cfg_estados_cuota ec ON ec.id_estado_cuota=q.id_estado_cuota
        WHERE q.id_cuota=p_id_cuota AND ec.codigo='ANULADA')
   THEN RAISE EXCEPTION 'CUOTA_NO_DISPONIBLE|El comprobante no está aprobado para esa cuota.'; END IF;
   v_saldo:=public.fn_fin_saldo_cuota_confirmado_v1(p_id_cuota);
 ELSE
   -- INICIAL: solo pagos confirmados NO vinculados a una cuota.
   -- Nunca se reutiliza una separación, ni el pago de una cuota.
   IF r.id_carga IS NOT NULL OR EXISTS(
     SELECT 1 FROM public.pag_aplicaciones_pago a
     JOIN public.cfg_tipos_aplicacion_pago t ON t.id_tipo_aplicacion_pago=a.id_tipo_aplicacion_pago
     WHERE a.id_pago=p_id_pago AND a.activo AND t.codigo<>'INICIAL'
   ) THEN RAISE EXCEPTION 'DESTINO_INVALIDO|Pago vinculado a cuotas u otro concepto.'; END IF;
   v_saldo:=greatest(0,r.monto_inicial-coalesce(
     (SELECT sum(a.monto_aplicado) FROM public.pag_aplicaciones_pago a
       JOIN public.cfg_tipos_aplicacion_pago t ON t.id_tipo_aplicacion_pago=a.id_tipo_aplicacion_pago
         AND t.codigo='INICIAL'
       JOIN public.pag_pagos p ON p.id_pago=a.id_pago AND p.id_plan_pago=r.id_plan_pago
       JOIN public.cfg_estados_pago e ON e.id_estado_pago=p.id_estado_pago AND e.codigo='CONFIRMADO'
       WHERE a.id_plan_pago=r.id_plan_pago AND a.id_cuota IS NULL AND a.activo),0));
 END IF;
 SELECT coalesce(sum(a.monto_aplicado),0) INTO v_aplicado
 FROM public.pag_aplicaciones_pago a WHERE a.id_pago=p_id_pago AND a.activo;
 v_pago_disponible:=round(r.monto-v_aplicado,2);
 IF v_pago_disponible<=0 OR p_monto>v_pago_disponible
   OR v_saldo IS NULL OR v_saldo<=0 OR p_monto>v_saldo
 THEN RAISE EXCEPTION 'MONTO_NO_DISPONIBLE|Importe excede el pago o saldo del destino.'; END IF;
 SELECT id_tipo_aplicacion_pago INTO STRICT v_tipo_id
 FROM public.cfg_tipos_aplicacion_pago WHERE codigo=p_tipo AND activo=true;
 INSERT INTO public.pag_aplicaciones_pago(
   id_aplicacion_pago,id_pago,id_tipo_aplicacion_pago,id_plan_pago,
   id_cuota,monto_aplicado,id_usuario_aplicacion,observaciones,activo)
 VALUES(nextval('public.pag_aplicaciones_pago_id_aplicacion_pago_seq'::regclass),
   p_id_pago,v_tipo_id,v_plan,p_id_cuota,p_monto,p_actor,v_observaciones,true)
 RETURNING id_aplicacion_pago INTO v_aplicacion;
 INSERT INTO public.pag_imputaciones_operaciones_v1(
   id_solicitud,id_aplicacion_pago,id_pago,id_plan_pago,id_cuota,
   tipo,monto,observaciones,id_actor)
 VALUES(p_solicitud,v_aplicacion,p_id_pago,v_plan,p_id_cuota,
   p_tipo,p_monto,v_observaciones,p_actor);
 RETURN jsonb_build_object('idAplicacion',v_aplicacion,'idPago',p_id_pago,
   'tipo',p_tipo,'idCuota',p_id_cuota,'montoAplicado',p_monto,
   'saldoPagoRestante',v_pago_disponible-p_monto,
   'saldoDestinoRestante',v_saldo-p_monto,
   'reutilizado',false,'activo',true);
END;
$fn$;

-- Revoca únicamente imputaciones creadas en 5.3.4. El revisor
-- debe ser distinto del actor que hizo la aplicación original.
CREATE OR REPLACE FUNCTION public.sp_fin_revertir_aplicacion_v1(
 p_actor bigint,p_id_aplicacion bigint,p_motivo varchar
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE
 r record;
 v_plan bigint;v_cuota bigint;v_pago bigint;
 v_motivo varchar:=nullif(btrim(p_motivo),'');
BEGIN
 IF p_actor IS NULL OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(
     p_actor,'finance.view'::varchar),false)
    OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(
     p_actor,'finance.edit'::varchar),false)
 THEN RAISE EXCEPTION 'DENEGADO|Reversión requiere finance.view y finance.edit.'; END IF;
 IF p_id_aplicacion IS NULL OR p_id_aplicacion<=0
   OR v_motivo IS NULL OR length(v_motivo) NOT BETWEEN 5 AND 255
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Se requiere motivo de reversión.'; END IF;
 SELECT id_plan_pago,id_cuota,id_pago INTO v_plan,v_cuota,v_pago
 FROM public.pag_imputaciones_operaciones_v1
 WHERE id_aplicacion_pago=p_id_aplicacion;
 IF v_plan IS NULL THEN
   RAISE EXCEPTION 'APLICACION_NO_DISPONIBLE|No se puede revertir una aplicación histórica.'; END IF;
 PERFORM 1 FROM public.pag_planes_pago WHERE id_plan_pago=v_plan FOR UPDATE;
 IF v_cuota IS NOT NULL THEN
   PERFORM 1 FROM public.pag_cuotas WHERE id_cuota=v_cuota FOR UPDATE;
 END IF;
 PERFORM 1 FROM public.pag_pagos WHERE id_pago=v_pago FOR UPDATE;
 SELECT a.id_aplicacion_pago,a.activo,a.id_usuario_aplicacion,
   a.fecha_anulacion,a.id_usuario_anulacion,a.motivo_anulacion,
   a.monto_aplicado,o.tipo,o.id_cuota,o.id_pago
 INTO r
 FROM public.pag_aplicaciones_pago a
 JOIN public.pag_imputaciones_operaciones_v1 o ON o.id_aplicacion_pago=a.id_aplicacion_pago
 WHERE a.id_aplicacion_pago=p_id_aplicacion FOR UPDATE OF a;
 IF NOT FOUND THEN RAISE EXCEPTION 'APLICACION_NO_DISPONIBLE|Aplicación inexistente.'; END IF;
 IF r.id_usuario_aplicacion=p_actor THEN
   RAISE EXCEPTION 'AUTOANULACION_DENEGADA|La reversión exige un segundo revisor.'; END IF;
 IF NOT r.activo THEN
   IF r.id_usuario_anulacion=p_actor AND r.motivo_anulacion=v_motivo
   THEN RETURN jsonb_build_object('idAplicacion',p_id_aplicacion,
      'idPago',r.id_pago,'tipo',r.tipo,'montoRevertido',r.monto_aplicado,
      'activo',false,'reutilizado',true);
   END IF;
   RAISE EXCEPTION 'APLICACION_CERRADA|La aplicación ya fue revertida.'; END IF;
 UPDATE public.pag_aplicaciones_pago SET activo=false,
     fecha_anulacion=now(),id_usuario_anulacion=p_actor,
     motivo_anulacion=v_motivo,fecha_actualizacion=now()
 WHERE id_aplicacion_pago=p_id_aplicacion;
 RETURN jsonb_build_object('idAplicacion',p_id_aplicacion,
    'idPago',r.id_pago,'tipo',r.tipo,'montoRevertido',r.monto_aplicado,
    'activo',false,'reutilizado',false);
END;
$fn$;

REVOKE ALL ON FUNCTION public.sp_fin_imputaciones_v1(bigint,integer,integer)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_fin_imputaciones_v1(bigint,integer,integer)
 TO sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_fin_aplicar_pago_confirmado_v1(
 bigint,uuid,bigint,varchar,bigint,numeric,varchar)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_fin_aplicar_pago_confirmado_v1(
 bigint,uuid,bigint,varchar,bigint,numeric,varchar)
 TO sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_fin_revertir_aplicacion_v1(bigint,bigint,varchar)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_fin_revertir_aplicacion_v1(bigint,bigint,varchar)
 TO sigi_app_user;
