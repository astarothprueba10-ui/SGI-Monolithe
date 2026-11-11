-- SGI-MONOLITHE | Sprint 4 | 5.2.4
-- Saldo por venta y por cliente: SOLO LECTURA, sin duplicar entidades.
-- No actualiza pagos, planes, cuotas ni condiciones de contratos históricos.
-- APLICACION CUOTA + pago CONFIRMADO + aplicación activa = abono contable.
-- INICIAL se concilia por separado; la reserva aplicada al plan NO se
-- descuenta otra vez del capital financiado.

CREATE OR REPLACE FUNCTION public.sp_crm_saldo_venta_v1(
 p_actor bigint, p_venta bigint
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE
 v_codigo varchar;
 v_modalidad varchar;
 v_estado_venta varchar;
 v_id_cliente bigint;
 v_plan public.pag_planes_pago%ROWTYPE;
 v_estado_plan varchar;
 v_cuotas jsonb;
 v_num_cuotas integer;
 v_cuotas_monto numeric:=0;
 v_abonado_cuotas numeric:=0;
 v_abonado_inicial numeric:=0;
 v_pago_confirmado_sin_aplicar numeric:=0;
 v_saldo_plan numeric:=0;
 v_saldo_cuotas numeric:=0;
 v_inicial_por_conciliar numeric:=0;
 v_diferencia numeric:=0;
 v_alertas jsonb:='[]'::jsonb;
BEGIN
 IF p_actor IS NULL OR p_actor<=0 OR p_venta IS NULL OR p_venta<=0
    OR NOT COALESCE(public.fn_crm_puede_consultar_venta_v1(p_actor,p_venta),false)
 THEN
   RAISE EXCEPTION 'VENTA_NO_DISPONIBLE|Venta fuera de la cartera autorizada.';
 END IF;
 SELECT v.codigo,m.codigo,ev.codigo,vc.id_cliente
 INTO v_codigo,v_modalidad,v_estado_venta,v_id_cliente
 FROM public.ven_ventas v
 JOIN public.cfg_modalidades_venta m ON m.id_modalidad_venta=v.id_modalidad_venta
 JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=v.id_estado_venta
 LEFT JOIN public.ven_ventas_clientes vc ON vc.id_venta=v.id_venta AND vc.titular=true
 WHERE v.id_venta=p_venta;
 IF v_codigo IS NULL THEN
   RAISE EXCEPTION 'VENTA_NO_DISPONIBLE|Venta no encontrada.';
 END IF;
 IF v_modalidad<>'FINANCIADA' THEN
   RETURN jsonb_build_object('idVenta',p_venta,'codigoVenta',v_codigo,
     'idCliente',v_id_cliente,'modalidad',v_modalidad,
     'tipoSaldo','NO_FINANCIADA','cuotas','[]'::jsonb);
 END IF;
 SELECT * INTO v_plan FROM public.pag_planes_pago
 WHERE id_venta=p_venta ORDER BY es_vigente DESC,numero_version DESC,id_plan_pago DESC
 LIMIT 1;
 IF v_plan.id_plan_pago IS NULL THEN
   RETURN jsonb_build_object('idVenta',p_venta,'codigoVenta',v_codigo,
     'idCliente',v_id_cliente,'modalidad',v_modalidad,
     'tipoSaldo','SIN_PLAN','cuotas','[]'::jsonb);
 END IF;
 SELECT codigo INTO v_estado_plan FROM public.cfg_estados_plan_pago
 WHERE id_estado_plan_pago=v_plan.id_estado_plan_pago;
 IF v_estado_plan IS NULL THEN
   RAISE EXCEPTION 'PLAN_INCONSISTENTE|Estado de plan inexistente.';
 END IF;

 -- Cada cuota: solo aplicaciones CUOTA activas, vinculadas al mismo plan,
 -- cuyo pago origen este CONFIRMADO. No se usan fecha_pago_completo ni vouchers.
 WITH cuotas_abonadas AS (
   SELECT c.id_cuota,c.numero_cuota,c.fecha_vencimiento,
          c.monto_capital,c.monto_interes,c.monto_cuota,
          ec.codigo estado_registrado,
          COALESCE(SUM(a.monto_aplicado) FILTER(
            WHERE a.activo AND tp.codigo='CUOTA' AND ep.codigo='CONFIRMADO'
               AND pg.id_plan_pago=v_plan.id_plan_pago
               AND pg.id_venta=p_venta
          ),0)::numeric abono
   FROM public.pag_cuotas c
   JOIN public.cfg_estados_cuota ec ON ec.id_estado_cuota=c.id_estado_cuota
   LEFT JOIN public.pag_aplicaciones_pago a
     ON a.id_cuota=c.id_cuota AND a.id_plan_pago=v_plan.id_plan_pago
   LEFT JOIN public.cfg_tipos_aplicacion_pago tp
     ON tp.id_tipo_aplicacion_pago=a.id_tipo_aplicacion_pago
   LEFT JOIN public.pag_pagos pg ON pg.id_pago=a.id_pago
   LEFT JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=pg.id_estado_pago
   WHERE c.id_plan_pago=v_plan.id_plan_pago
   GROUP BY c.id_cuota,ec.codigo
 )
 SELECT COUNT(*)::integer,
        COALESCE(SUM(monto_cuota),0),COALESCE(SUM(abono),0),
        COALESCE(jsonb_agg(jsonb_build_object(
          'idCuota',id_cuota,'numero',numero_cuota,
          'fechaVencimiento',to_char(fecha_vencimiento,'YYYY-MM-DD'),
          'capital',monto_capital,'interes',monto_interes,
          'montoCuota',monto_cuota,'abonadoConfirmado',abono,
          'saldoCuota',greatest(0,monto_cuota-abono),
          'estadoRegistrado',estado_registrado
        ) ORDER BY numero_cuota),'[]'::jsonb)
 INTO v_num_cuotas,v_cuotas_monto,v_abonado_cuotas,v_cuotas
 FROM cuotas_abonadas;

 IF EXISTS(
   SELECT 1 FROM public.pag_cuotas c
   JOIN LATERAL (
     SELECT COALESCE(SUM(a.monto_aplicado),0) abonado
     FROM public.pag_aplicaciones_pago a
     JOIN public.cfg_tipos_aplicacion_pago tp
       ON tp.id_tipo_aplicacion_pago=a.id_tipo_aplicacion_pago
     JOIN public.pag_pagos pg ON pg.id_pago=a.id_pago
     JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=pg.id_estado_pago
     WHERE a.id_cuota=c.id_cuota AND a.id_plan_pago=v_plan.id_plan_pago
       AND a.activo AND tp.codigo='CUOTA' AND ep.codigo='CONFIRMADO'
       AND pg.id_venta=p_venta AND pg.id_plan_pago=v_plan.id_plan_pago
   ) x ON true
   WHERE c.id_plan_pago=v_plan.id_plan_pago AND x.abonado>c.monto_cuota
 ) THEN
   RAISE EXCEPTION 'PAGO_INCONSISTENTE|Una cuota tiene pagos confirmados superiores a su importe.';
 END IF;

 -- La inicial adicional se reconoce solo con aplicaciones INICIAL (sin
 -- id_cuota); no se confunde con la reserva ni con pagos en revision.
 SELECT COALESCE(SUM(a.monto_aplicado),0)
 INTO v_abonado_inicial
 FROM public.pag_aplicaciones_pago a
 JOIN public.cfg_tipos_aplicacion_pago tp
   ON tp.id_tipo_aplicacion_pago=a.id_tipo_aplicacion_pago
 JOIN public.pag_pagos pg ON pg.id_pago=a.id_pago
 JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=pg.id_estado_pago
 WHERE a.id_plan_pago=v_plan.id_plan_pago AND a.id_cuota IS NULL
   AND a.activo AND tp.codigo='INICIAL' AND ep.codigo='CONFIRMADO'
   AND pg.id_plan_pago=v_plan.id_plan_pago AND pg.id_venta=p_venta;
 IF v_abonado_inicial>v_plan.monto_inicial THEN
   RAISE EXCEPTION 'PAGO_INCONSISTENTE|Abonos de inicial superiores a la inicial adicional pactada.';
 END IF;

 -- Pago CONFIRMADO sin aplicar: caja aun NO imputada, no resta al saldo.
 -- Reserva, pagos de otra venta u otro plan no cuentan aqui.
 SELECT COALESCE(SUM(greatest(0,pg.monto-coalesce(ap.monto,0))),0)
 INTO v_pago_confirmado_sin_aplicar
 FROM public.pag_pagos pg
 JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=pg.id_estado_pago
 LEFT JOIN LATERAL (
   SELECT SUM(a.monto_aplicado) monto
   FROM public.pag_aplicaciones_pago a WHERE a.id_pago=pg.id_pago AND a.activo
 ) ap ON true
 WHERE pg.id_plan_pago=v_plan.id_plan_pago AND pg.id_venta=p_venta
   AND ep.codigo='CONFIRMADO';

 v_saldo_plan:=greatest(0,
    coalesce(v_plan.monto_total_financiado,
      v_plan.capital_financiado+coalesce(v_plan.monto_interes_total,0))
    -v_abonado_cuotas);
 v_saldo_cuotas:=greatest(0,v_cuotas_monto-v_abonado_cuotas);
 v_inicial_por_conciliar:=greatest(0,v_plan.monto_inicial-v_abonado_inicial);
 v_diferencia:=CASE WHEN v_num_cuotas>0 THEN
   coalesce(v_plan.monto_total_financiado,
     v_plan.capital_financiado+coalesce(v_plan.monto_interes_total,0))
     -v_cuotas_monto ELSE 0 END;
 IF v_num_cuotas>0 AND v_num_cuotas<>v_plan.numero_cuotas THEN
   v_alertas:=v_alertas||jsonb_build_array('CUOTAS_INCOMPLETAS');
 END IF;
 IF v_estado_plan='PENDIENTE' AND v_num_cuotas>0 THEN
   v_alertas:=v_alertas||jsonb_build_array('CUOTAS_ANTES_DE_FIRMA');
 END IF;
 IF v_diferencia<>0 THEN
   v_alertas:=v_alertas||jsonb_build_array('DIFERENCIA_CRONOGRAMA_HISTORICO');
 END IF;
 IF v_pago_confirmado_sin_aplicar>0 THEN
   v_alertas:=v_alertas||jsonb_build_array('PAGO_CONFIRMADO_SIN_IMPUTAR');
 END IF;
 IF v_inicial_por_conciliar>0 THEN
   v_alertas:=v_alertas||jsonb_build_array('INICIAL_SIN_APLICACIONES_CONFIRMADAS_COMPLETAS');
 END IF;
 RETURN jsonb_build_object(
   'idVenta',p_venta,'codigoVenta',v_codigo,'idCliente',v_id_cliente,
   'modalidad',v_modalidad,'estadoVenta',v_estado_venta,
   'tipoSaldo','FINANCIADA','idPlanPago',v_plan.id_plan_pago,
   'estadoPlan',v_estado_plan,'numeroVersion',v_plan.numero_version,
   'cuotasExigibles',v_estado_plan='ACTIVO' AND v_num_cuotas>0,
   'inicialAdicionalPactada',v_plan.monto_inicial,
   'reservaAplicada',v_plan.monto_reserva_aplicada,
   'inicialTotalPactada',v_plan.monto_inicial+v_plan.monto_reserva_aplicada,
   'inicialAbonadaConfirmada',v_abonado_inicial,
   'inicialSinAplicacionConfirmada',v_inicial_por_conciliar,
   'capitalFinanciado',v_plan.capital_financiado,
   'interesTotal',v_plan.monto_interes_total,
   'totalPlanCuotas',coalesce(v_plan.monto_total_financiado,
      v_plan.capital_financiado+coalesce(v_plan.monto_interes_total,0)),
   'abonadoCuotasConfirmado',v_abonado_cuotas,
   'saldoFinanciamiento',v_saldo_plan,
   'montoCuotasRegistradas',v_cuotas_monto,
   'saldoCuotasRegistradas',v_saldo_cuotas,
   'diferenciaCronograma',v_diferencia,
   'pagosConfirmadosSinAplicar',v_pago_confirmado_sin_aplicar,
   'numeroCuotasRegistradas',v_num_cuotas,'numeroCuotasPactadas',v_plan.numero_cuotas,
   'alertasConciliacion',v_alertas,'cuotas',v_cuotas);
END;
$fn$;

-- Saldo del CLIENTE TITULAR sobre ventas financiadas VISIBLES al actor.
-- Un asesor no puede acumular ventas del mismo cliente fuera de su cartera.
-- No se duplican ventas por versiones del plan ni por cotitulares.
CREATE OR REPLACE FUNCTION public.sp_crm_saldo_cliente_v1(
 p_actor bigint,p_cliente bigint
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE
 v_ventas jsonb:='[]'::jsonb;
 v_total_activo numeric:=0;
 v_total_pendiente_firma numeric:=0;
 v_inicial_por_conciliar numeric:=0;
 v_abonado_confirmado numeric:=0;
 v_contador integer:=0;
 v_fila record;
 v_saldo jsonb;
BEGIN
 IF p_actor IS NULL OR p_actor<=0 OR p_cliente IS NULL OR p_cliente<=0 THEN
    RAISE EXCEPTION 'CLIENTE_NO_DISPONIBLE|Cliente inválido.';
 END IF;
 FOR v_fila IN
   SELECT DISTINCT v.id_venta
   FROM public.ven_ventas_clientes vc
   JOIN public.ven_ventas v ON v.id_venta=vc.id_venta
   JOIN public.cfg_modalidades_venta m ON m.id_modalidad_venta=v.id_modalidad_venta
   WHERE vc.id_cliente=p_cliente AND vc.titular=true AND m.codigo='FINANCIADA'
     AND COALESCE(public.fn_crm_puede_consultar_venta_v1(p_actor,v.id_venta),false)
   ORDER BY v.id_venta
 LOOP
   v_saldo:=public.sp_crm_saldo_venta_v1(p_actor,v_fila.id_venta);
   IF v_saldo->>'tipoSaldo'='FINANCIADA' THEN
     v_ventas:=v_ventas||jsonb_build_array(v_saldo);
     v_contador:=v_contador+1;
     IF v_saldo->>'estadoPlan'='ACTIVO' THEN
       v_total_activo:=v_total_activo+coalesce((v_saldo->>'saldoFinanciamiento')::numeric,0);
     ELSIF v_saldo->>'estadoPlan'='PENDIENTE' THEN
       v_total_pendiente_firma:=v_total_pendiente_firma
          +coalesce((v_saldo->>'saldoFinanciamiento')::numeric,0);
     END IF;
     v_inicial_por_conciliar:=v_inicial_por_conciliar
        +coalesce((v_saldo->>'inicialSinAplicacionConfirmada')::numeric,0);
     v_abonado_confirmado:=v_abonado_confirmado
        +coalesce((v_saldo->>'abonadoCuotasConfirmado')::numeric,0);
   END IF;
 END LOOP;
 IF v_contador=0 THEN
   RAISE EXCEPTION 'CLIENTE_NO_DISPONIBLE|Sin ventas financiadas en la cartera autorizada.';
 END IF;
 RETURN jsonb_build_object(
   'idCliente',p_cliente,'numeroVentas',v_contador,
   'saldoFinanciamientoActivo',v_total_activo,
   'saldoFinanciamientoPendienteFirma',v_total_pendiente_firma,
   'inicialSinAplicacionConfirmada',v_inicial_por_conciliar,
   'abonadoCuotasConfirmado',v_abonado_confirmado,
   'advertencia','La inicial sin aplicaciones confirmadas requiere conciliación y no implica automáticamente una deuda exigible.',
   'ventas',v_ventas);
END;
$fn$;

-- No abrir RPC financieras al navegador.
REVOKE ALL ON FUNCTION public.sp_crm_saldo_venta_v1(bigint,bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_saldo_venta_v1(bigint,bigint) TO sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_crm_saldo_cliente_v1(bigint,bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_saldo_cliente_v1(bigint,bigint) TO sigi_app_user;
