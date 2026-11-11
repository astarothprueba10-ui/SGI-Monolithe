-- SGI MONOLITHE · Sprint 4 · 5.4.1
-- Portal cliente: lectura real EXCLUSIVAMENTE de compras vinculadas a
-- la persona del actor autenticado. No recibe id_cliente ni id_venta.
-- No muta contratos, cuotas, pagos ni saldos.
CREATE OR REPLACE FUNCTION public.sp_portal_cliente_resumen_v1(p_actor bigint)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE v_persona bigint; v_nombre text; v_items jsonb;
BEGIN
 SELECT u.id_persona, concat_ws(' ',per.nombres,per.apellido_paterno,per.apellido_materno)
 INTO v_persona,v_nombre
 FROM public.seg_usuarios u
 JOIN public.core_personas per ON per.id_persona=u.id_persona AND per.activo
 JOIN public.cfg_estados_usuario eu ON eu.id_estado_usuario=u.id_estado_usuario
  AND eu.activo AND eu.permite_acceso
 WHERE u.id_usuario=p_actor AND p_actor>0
   AND (u.bloqueado_hasta IS NULL OR u.bloqueado_hasta<=now())
   AND EXISTS(
     SELECT 1 FROM public.seg_usuarios_roles ur
     JOIN public.seg_roles rr ON rr.id_rol=ur.id_rol AND rr.codigo='CLIENTE'
       AND rr.activo
     WHERE ur.id_usuario=u.id_usuario AND ur.activo
   );
 IF v_persona IS NULL THEN
   RAISE EXCEPTION 'PORTAL_ACCESO_DENEGADO|Identidad cliente no autorizada.';
 END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.id_venta),'[]'::jsonb)
 INTO v_items
 FROM (
  SELECT v.id_venta,v.codigo AS codigo_venta,
   ev.codigo AS estado_venta,
   pro.nombre AS proyecto,pro.distrito,pro.provincia,pro.departamento,
   l.numero AS numero_lote,l.codigo AS codigo_lote,l.area_m2,
   m.codigo AS manzana,e.nombre AS etapa,
   v.precio_venta,
   CASE WHEN pp.id_plan_pago IS NULL THEN NULL
     ELSE jsonb_build_object(
       'idPlanPago',pp.id_plan_pago,
       'codigoPlan',pp.codigo,
       'numeroCuotas',pp.numero_cuotas,
       'cuotasPagadas',coalesce(cu.cuotas_pagadas,0),
       'montoVenta',pp.monto_venta,
       'inicialAdicionalPactada',pp.monto_inicial,
       'reservaAcreditada',pp.monto_reserva_aplicada,
       'capitalFinanciado',pp.capital_financiado,
       'interesTotalPactado',pp.monto_interes_total,
       'tasaInteresMensualPct',pp.tasa_interes_pct,
       'totalCuotasPactado',pp.monto_total_financiado,
       'saldoInicial',greatest(0,pp.monto_inicial-coalesce(ini.aplicado,0)),
       'saldoCuotas',coalesce(cu.saldo_cuotas,0),
       'totalAplicadoCuotas',coalesce(cu.aplicado_cuotas,0),
       'saldoTotal',greatest(0,pp.monto_inicial-coalesce(ini.aplicado,0))
          + coalesce(cu.saldo_cuotas,0),
       'proximaCuota',CASE WHEN prox.id_cuota IS NULL THEN NULL
           ELSE jsonb_build_object(
            'idCuota',prox.id_cuota,'numero',prox.numero_cuota,
            'fechaVencimiento',to_char(prox.fecha_vencimiento,'YYYY-MM-DD'),
            'monto',prox.monto_cuota,'saldo',prox.saldo,
            'estado',CASE WHEN prox.fecha_vencimiento<
                       (now() AT TIME ZONE 'America/Lima')::date THEN 'VENCIDA'
                         WHEN prox.saldo<prox.monto_cuota THEN 'PARCIAL'
                         ELSE 'PENDIENTE' END)
         END
     ) END AS financiamiento
  FROM public.crm_clientes cl
  JOIN public.ven_ventas_clientes vc ON vc.id_cliente=cl.id_cliente
  JOIN public.ven_ventas v ON v.id_venta=vc.id_venta
  JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=v.id_estado_venta
  JOIN public.inm_lotes l ON l.id_lote=v.id_lote
  JOIN public.inm_proyectos pro ON pro.id_proyecto=l.id_proyecto
  LEFT JOIN public.inm_manzanas m ON m.id_manzana=l.id_manzana
  LEFT JOIN public.inm_etapas e ON e.id_etapa=m.id_etapa
  LEFT JOIN LATERAL (
    SELECT p.* FROM public.pag_planes_pago p
    JOIN public.cfg_estados_plan_pago ep ON ep.id_estado_plan_pago=p.id_estado_plan_pago
      AND ep.codigo='ACTIVO'
    WHERE p.id_venta=v.id_venta AND p.es_vigente
      AND EXISTS (
       SELECT 1 FROM public.ven_contratos ct
       JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=ct.id_estado_contrato
         AND ec.codigo='VIGENTE'
       WHERE ct.id_venta=v.id_venta AND ct.fecha_firma IS NOT NULL
      )
    ORDER BY p.numero_version DESC,p.id_plan_pago DESC LIMIT 1
  ) pp ON true
  LEFT JOIN LATERAL (
    SELECT count(*) FILTER(WHERE z.saldo=0)::integer AS cuotas_pagadas,
       coalesce(sum(z.saldo),0) AS saldo_cuotas,
       coalesce(sum(greatest(0,z.monto_cuota-z.saldo)),0) AS aplicado_cuotas
    FROM (
      SELECT c.monto_cuota,public.fn_fin_saldo_cuota_confirmado_v1(c.id_cuota) saldo
      FROM public.pag_cuotas c WHERE c.id_plan_pago=pp.id_plan_pago
    ) z
  ) cu ON pp.id_plan_pago IS NOT NULL
  LEFT JOIN LATERAL (
    SELECT coalesce(sum(a.monto_aplicado),0) aplicado
    FROM public.pag_aplicaciones_pago a
    JOIN public.cfg_tipos_aplicacion_pago tp
      ON tp.id_tipo_aplicacion_pago=a.id_tipo_aplicacion_pago AND tp.codigo='INICIAL'
    JOIN public.pag_pagos p ON p.id_pago=a.id_pago AND p.id_plan_pago=pp.id_plan_pago
    JOIN public.cfg_estados_pago st ON st.id_estado_pago=p.id_estado_pago
      AND st.codigo='CONFIRMADO'
    WHERE a.id_plan_pago=pp.id_plan_pago AND a.id_cuota IS NULL AND a.activo
  ) ini ON pp.id_plan_pago IS NOT NULL
  LEFT JOIN LATERAL (
    SELECT c.id_cuota,c.numero_cuota,c.fecha_vencimiento,c.monto_cuota,
       public.fn_fin_saldo_cuota_confirmado_v1(c.id_cuota) AS saldo
    FROM public.pag_cuotas c
    JOIN public.cfg_estados_cuota ec ON ec.id_estado_cuota=c.id_estado_cuota
    WHERE c.id_plan_pago=pp.id_plan_pago AND ec.codigo<>'ANULADA'
      AND public.fn_fin_saldo_cuota_confirmado_v1(c.id_cuota)>0
    ORDER BY c.fecha_vencimiento,c.numero_cuota,c.id_cuota LIMIT 1
  ) prox ON pp.id_plan_pago IS NOT NULL
  WHERE cl.id_persona=v_persona AND cl.activo
 ) t;
 RETURN jsonb_build_object(
   'cliente',jsonb_build_object('nombreMostrar',v_nombre),
   'operaciones',v_items,
   'fechaConsulta',to_char(now() AT TIME ZONE 'America/Lima','YYYY-MM-DD'),
   'moneda','PEN');
END;
$fn$;

REVOKE ALL ON FUNCTION public.sp_portal_cliente_resumen_v1(bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_portal_cliente_resumen_v1(bigint)
 TO sigi_app_user;
