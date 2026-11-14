-- 103 - Filtros consistentes en movimientos reales: total y pagina coinciden
-- al buscar por codigo de venta. Meses en formato numerico legible en español.
BEGIN;
CREATE OR REPLACE FUNCTION public.sp_fin_movimientos_backoffice_v1(p_actor bigint, p_busqueda text DEFAULT ''::text, p_pagina integer DEFAULT 1, p_tamano integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
 v_items jsonb;
 v_total integer;
 v_confirmado numeric;
 v_registrado numeric;
 v_anulado numeric;
 v_aplicado numeric;
 v_no_imputado numeric;
 v_meses jsonb;
 v_filtro text:=lower(btrim(coalesce(p_busqueda,'')));
BEGIN
 IF p_actor IS NULL OR p_actor<=0
   OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.view'::varchar),false)
 THEN RAISE EXCEPTION 'ACCESO_DENEGADO|Requiere finance.view.'; END IF;
 IF length(v_filtro)>120 OR p_pagina IS NULL OR p_pagina NOT BETWEEN 1 AND 100000
   OR p_tamano IS NULL OR p_tamano NOT BETWEEN 1 AND 100
 THEN RAISE EXCEPTION 'FILTROS_INVALIDOS|Filtros de movimientos invalidos.'; END IF;

 SELECT count(*)::integer,
   coalesce(sum(p.monto) FILTER(WHERE ep.codigo='CONFIRMADO'),0),
   coalesce(sum(p.monto) FILTER(WHERE ep.codigo='REGISTRADO'),0),
   coalesce(sum(p.monto) FILTER(WHERE ep.codigo='ANULADO'),0)
 INTO v_total,v_confirmado,v_registrado,v_anulado
 FROM public.pag_pagos p JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago
 LEFT JOIN public.ven_ventas v ON v.id_venta=p.id_venta
 WHERE v_filtro='' OR lower(concat_ws(' ',p.codigo,p.numero_operacion,ep.codigo,v.codigo)) LIKE '%'||v_filtro||'%';

 SELECT coalesce(sum(a.monto_aplicado),0) INTO v_aplicado
 FROM public.pag_aplicaciones_pago a
 JOIN public.pag_pagos p ON p.id_pago=a.id_pago
 JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago
 WHERE a.activo AND ep.codigo='CONFIRMADO';

 -- Los pagos de separacion no generan por si mismos aplicaciones a cuotas.
 SELECT coalesce(sum(greatest(p.monto - coalesce(x.aplicado,0),0)),0)
 INTO v_no_imputado
 FROM public.pag_pagos p
 JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago AND ep.codigo='CONFIRMADO'
 LEFT JOIN LATERAL (SELECT sum(a.monto_aplicado) AS aplicado
   FROM public.pag_aplicaciones_pago a WHERE a.id_pago=p.id_pago AND a.activo) x ON true
 WHERE p.id_plan_pago IS NOT NULL;

 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'idPago',r.id_pago,'codigo',r.codigo,'fechaOperacion',r.fecha_operacion,
   'fechaConfirmacion',r.fecha_confirmacion,'monto',r.monto,'estado',r.estado,
   'tipo',r.tipo,'venta',r.venta,'referencia',r.referencia,
   'comprobante',r.comprobante,'estadoVoucher',r.estado_voucher,
   'montoAplicado',r.aplicado
 ) ORDER BY r.fecha_operacion DESC,r.id_pago DESC),'[]'::jsonb)
 INTO v_items
 FROM (
   SELECT p.id_pago,p.codigo,p.fecha_operacion,p.fecha_confirmacion,p.monto,
     ep.codigo AS estado,
     CASE WHEN p.id_reserva IS NOT NULL THEN 'SEPARACION'
          WHEN p.id_plan_pago IS NOT NULL THEN 'FINANCIAMIENTO'
          WHEN p.id_venta IS NOT NULL THEN 'VENTA'
          ELSE 'OTRO' END AS tipo,
     v.codigo AS venta,p.numero_operacion AS referencia,
     vo.codigo AS comprobante,ev.codigo AS estado_voucher,
     coalesce(ap.aplicado,0) AS aplicado
   FROM public.pag_pagos p
   JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago
   LEFT JOIN public.ven_ventas v ON v.id_venta=p.id_venta
   LEFT JOIN LATERAL (
     SELECT z.codigo,z.id_estado_voucher FROM public.pag_vouchers z
     WHERE z.id_pago=p.id_pago AND z.activo ORDER BY z.numero_version DESC,z.id_voucher DESC LIMIT 1
   ) vo ON true
   LEFT JOIN public.cfg_estados_voucher ev ON ev.id_estado_voucher=vo.id_estado_voucher
   LEFT JOIN LATERAL (SELECT sum(a.monto_aplicado) AS aplicado
     FROM public.pag_aplicaciones_pago a WHERE a.id_pago=p.id_pago AND a.activo) ap ON true
   WHERE v_filtro='' OR lower(concat_ws(' ',p.codigo,p.numero_operacion,ep.codigo,v.codigo)) LIKE '%'||v_filtro||'%'
   ORDER BY p.fecha_operacion DESC,p.id_pago DESC
   LIMIT p_tamano OFFSET (p_pagina-1)*p_tamano
 ) r;

 SELECT coalesce(jsonb_agg(jsonb_build_object('mes',to_char(g.mes,'MM/YYYY'),
    'confirmado',coalesce(m.monto,0)) ORDER BY g.mes),'[]'::jsonb)
 INTO v_meses
 FROM generate_series(date_trunc('month',now())-interval '5 months',
                      date_trunc('month',now()),interval '1 month') g(mes)
 LEFT JOIN LATERAL (
    SELECT sum(p.monto) AS monto FROM public.pag_pagos p
    JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago
    WHERE ep.codigo='CONFIRMADO' AND p.fecha_confirmacion>=g.mes
      AND p.fecha_confirmacion<g.mes+interval '1 month'
 ) m ON true;
 RETURN jsonb_build_object(
   'pagina',p_pagina,'tamano',p_tamano,'total',v_total,
   'paginas',ceil(v_total::numeric/p_tamano)::integer,'items',v_items,
   'resumen',jsonb_build_object('confirmado',v_confirmado,
     'registrado',v_registrado,'anulado',v_anulado,
     'aplicado',v_aplicado,'confirmadoSinImputarFinanciamiento',v_no_imputado),
   'meses',v_meses);
END;
$function$
;
REVOKE ALL ON FUNCTION public.sp_fin_movimientos_backoffice_v1(bigint,text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_fin_movimientos_backoffice_v1(bigint,text,integer,integer) TO sigi_app_user;
COMMIT;
