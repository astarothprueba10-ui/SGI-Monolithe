-- Sprint 4 / 102 - Carteras y movimientos REALES para Backoffice.
-- Lectura auditada por permisos JWT en Core + controles SQL por actor.
-- No modifica pagos, contratos, cronogramas ni evidencia.
BEGIN;

CREATE OR REPLACE FUNCTION public.sp_fin_cartera_backoffice_v1(
 p_actor bigint, p_vista text DEFAULT 'PLANES',
 p_busqueda text DEFAULT '', p_pagina integer DEFAULT 1, p_tamano integer DEFAULT 20
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $cartera$
DECLARE
 v_fila record;
 v_cuota jsonb;
 v_saldo jsonb;
 v_crono jsonb;
 v_planes jsonb := '[]'::jsonb;
 v_cuotas jsonb := '[]'::jsonb;
 v_filtrado jsonb;
 v_pagina_items jsonb;
 v_filtro text := lower(btrim(coalesce(p_busqueda,'')));
 v_exigible boolean;
 v_total_planes integer := 0;
 v_total_cuotas integer := 0;
 v_saldo_total numeric := 0;
 v_inicial_conciliar numeric := 0;
 v_capital_total numeric := 0;
 v_monto_vencido numeric := 0;
 v_monto_proximo numeric := 0;
BEGIN
 IF p_actor IS NULL OR p_actor<=0
   OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.view'::varchar),false)
   OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'financing.view'::varchar),false)
 THEN RAISE EXCEPTION 'ACCESO_DENEGADO|Requiere ventas y financiamiento.'; END IF;
 IF p_vista NOT IN ('PLANES','CUOTAS') OR length(v_filtro)>120
   OR p_pagina IS NULL OR p_pagina NOT BETWEEN 1 AND 100000
   OR p_tamano IS NULL OR p_tamano NOT BETWEEN 1 AND 100
 THEN RAISE EXCEPTION 'FILTROS_INVALIDOS|Filtros de cartera invalidos.'; END IF;

 FOR v_fila IN
   SELECT v.id_venta,v.codigo AS codigo_venta,ev.codigo AS estado_venta,
     pp.id_plan_pago,pp.codigo AS codigo_plan,pp.numero_cuotas,
     pp.monto_venta,pp.capital_financiado,pp.monto_interes_total,
     pp.monto_inicial,pp.monto_reserva_aplicada,pp.tasa_interes_pct,
     ep.codigo AS estado_plan,
     concat_ws(' ',persona.nombres,persona.apellido_paterno,persona.apellido_materno) AS comprador,
     coalesce(l.codigo,'') AS lote, coalesce(proy.nombre,'') AS proyecto
   FROM public.ven_ventas v
   JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=v.id_estado_venta
   JOIN LATERAL (SELECT p.* FROM public.pag_planes_pago p
     WHERE p.id_venta=v.id_venta
     ORDER BY p.es_vigente DESC,p.numero_version DESC,p.id_plan_pago DESC LIMIT 1) pp ON true
   JOIN public.cfg_estados_plan_pago ep ON ep.id_estado_plan_pago=pp.id_estado_plan_pago
   LEFT JOIN public.ven_ventas_clientes vc ON vc.id_venta=v.id_venta AND vc.titular IS TRUE
   LEFT JOIN public.crm_clientes cl ON cl.id_cliente=vc.id_cliente
   LEFT JOIN public.core_personas persona ON persona.id_persona=cl.id_persona
   LEFT JOIN public.inm_lotes l ON l.id_lote=v.id_lote
   LEFT JOIN public.inm_proyectos proy ON proy.id_proyecto=l.id_proyecto
   WHERE public.fn_crm_puede_consultar_venta_v1(p_actor,v.id_venta)
   ORDER BY v.id_venta DESC
 LOOP
   v_saldo := public.sp_crm_saldo_venta_v1(p_actor,v_fila.id_venta);
   IF v_saldo->>'tipoSaldo'<>'FINANCIADA' THEN CONTINUE; END IF;
   v_crono := public.sp_crm_cronograma_venta_v4(p_actor,v_fila.id_venta);
   v_exigible := v_fila.estado_plan IN ('ACTIVO','COMPLETADO')
     AND v_crono->>'tipoCronograma'='REGISTRADO'
     AND v_crono->>'fuenteEstados'='APLICACIONES_CONFIRMADAS';

   IF v_exigible THEN
     v_saldo_total := v_saldo_total + coalesce((v_saldo->>'saldoFinanciamiento')::numeric,0);
     v_inicial_conciliar := v_inicial_conciliar + coalesce((v_saldo->>'inicialSinAplicacionConfirmada')::numeric,0);
     v_capital_total := v_capital_total + coalesce((v_saldo->>'capitalFinanciado')::numeric,0);
     v_monto_vencido := v_monto_vencido + coalesce((v_crono->>'montoVencido')::numeric,0);
     v_monto_proximo := v_monto_proximo + coalesce((v_crono->>'montoProximo')::numeric,0);
   END IF;

   -- Un plan sin contrato firmado se muestra como pendiente, nunca como deuda exigible.
   v_planes := v_planes || jsonb_build_array(jsonb_build_object(
      'idVenta',v_fila.id_venta,'codigoVenta',v_fila.codigo_venta,
      'idPlanPago',v_fila.id_plan_pago,'codigoPlan',v_fila.codigo_plan,
      'comprador',coalesce(v_fila.comprador,'Sin titular'),
      'lote',v_fila.lote,'proyecto',v_fila.proyecto,
      'estadoVenta',v_fila.estado_venta,'estadoPlan',v_fila.estado_plan,
      'numeroCuotas',v_fila.numero_cuotas,'precioVenta',v_fila.monto_venta,
      'capitalFinanciado',v_fila.capital_financiado,'interesTotal',v_fila.monto_interes_total,
      'inicialAdicional',v_fila.monto_inicial,'reservaAplicada',v_fila.monto_reserva_aplicada,
      'tasaInteresPct',v_fila.tasa_interes_pct,'cuotasExigibles',v_exigible,
      'saldoFinanciamiento',CASE WHEN v_exigible THEN coalesce((v_saldo->>'saldoFinanciamiento')::numeric,0) ELSE 0 END,
      'inicialPorConciliar',CASE WHEN v_exigible THEN coalesce((v_saldo->>'inicialSinAplicacionConfirmada')::numeric,0) ELSE 0 END,
      'totalCuotas',coalesce((v_saldo->>'totalPlanCuotas')::numeric,0),
      'fechaPrimeraCuota',v_crono->>'fechaPrimeraCuota'
   ));
   v_total_planes := v_total_planes+1;

   IF v_exigible THEN
     FOR v_cuota IN SELECT value FROM jsonb_array_elements(v_crono->'items')
     LOOP
       v_cuotas := v_cuotas || jsonb_build_array(jsonb_build_object(
         'idVenta',v_fila.id_venta,'codigoVenta',v_fila.codigo_venta,
         'idPlanPago',v_fila.id_plan_pago,'comprador',coalesce(v_fila.comprador,'Sin titular'),
         'lote',v_fila.lote,'proyecto',v_fila.proyecto,
         'numero', (v_cuota->>'numero')::integer,
         'fechaVencimiento',v_cuota->>'fechaVencimiento',
         'montoCuota',coalesce((v_cuota->>'cuota')::numeric,0),
         'capital',coalesce((v_cuota->>'capital')::numeric,0),
         'interes',coalesce((v_cuota->>'interes')::numeric,0),
         'abonadoConfirmado',coalesce((v_cuota->>'abonadoConfirmado')::numeric,0),
         'saldoCuota',coalesce((v_cuota->>'saldoCuota')::numeric,0),
         'estado',coalesce(v_cuota->>'estadoCalculado',v_cuota->>'estado'),
         'cuotaAtrasada',coalesce((v_cuota->>'cuotaAtrasada')::boolean,false),
         'proxima7Dias',coalesce((v_cuota->>'proxima7Dias')::boolean,false)
       ));
       v_total_cuotas := v_total_cuotas+1;
     END LOOP;
   END IF;
 END LOOP;

 SELECT coalesce(jsonb_agg(x.item ORDER BY x.ordinal),'[]'::jsonb) INTO v_filtrado
 FROM (SELECT value AS item, ordinality AS ordinal
       FROM jsonb_array_elements(CASE WHEN p_vista='PLANES' THEN v_planes ELSE v_cuotas END) WITH ORDINALITY
       WHERE v_filtro='' OR lower(concat_ws(' ',value->>'codigoVenta',
          value->>'comprador',value->>'proyecto',value->>'lote',
          value->>'codigoPlan',value->>'estado',value->>'estadoPlan')) LIKE '%'||v_filtro||'%') x;

 SELECT coalesce(jsonb_agg(x.item ORDER BY x.ordinal),'[]'::jsonb) INTO v_pagina_items
 FROM (SELECT value AS item,ordinality AS ordinal FROM jsonb_array_elements(v_filtrado) WITH ORDINALITY
       ORDER BY ordinality LIMIT p_tamano OFFSET (p_pagina-1)*p_tamano) x;
 RETURN jsonb_build_object(
   'fechaCorte',to_char((now() AT TIME ZONE 'America/Lima')::date,'YYYY-MM-DD'),
   'vista',p_vista,'pagina',p_pagina,'tamano',p_tamano,
   'total',jsonb_array_length(v_filtrado),
   'paginas',ceil(jsonb_array_length(v_filtrado)::numeric/p_tamano)::integer,
   'items',v_pagina_items,
   'resumen',jsonb_build_object(
     'planes',v_total_planes,'cuotasExigibles',v_total_cuotas,
     'capitalFinanciadoActivo',v_capital_total,
     'saldoCuotas',v_saldo_total,
     'inicialPorConciliar',v_inicial_conciliar,
     'montoVencido',v_monto_vencido,'montoProximo',v_monto_proximo)
 );
END;
$cartera$;

REVOKE ALL ON FUNCTION public.sp_fin_cartera_backoffice_v1(bigint,text,text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_fin_cartera_backoffice_v1(bigint,text,text,integer,integer) TO sigi_app_user;

CREATE OR REPLACE FUNCTION public.sp_fin_movimientos_backoffice_v1(
 p_actor bigint, p_busqueda text DEFAULT '',p_pagina integer DEFAULT 1,p_tamano integer DEFAULT 20
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $movimientos$
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
 WHERE v_filtro='' OR lower(concat_ws(' ',p.codigo,p.numero_operacion,ep.codigo)) LIKE '%'||v_filtro||'%';

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

 SELECT coalesce(jsonb_agg(jsonb_build_object('mes',to_char(g.mes,'Mon YYYY'),
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
$movimientos$;
REVOKE ALL ON FUNCTION public.sp_fin_movimientos_backoffice_v1(bigint,text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_fin_movimientos_backoffice_v1(bigint,text,integer,integer) TO sigi_app_user;

COMMIT;
