-- SGI-MONOLITHE | Sprint 4 | 5.4.3
-- Cronograma y movimientos exclusivos del comprador autenticado.
-- Se reutilizan el resumen privado 95 y el motor de saldos/estados 76/79.
-- Ninguna venta, cuota, cliente ni plan se recibe desde React.
CREATE OR REPLACE FUNCTION public.sp_portal_cliente_cronograma_v1(p_actor bigint)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE
  v_resumen jsonb;
  v_operacion jsonb;
  v_items jsonb := '[]'::jsonb;
  v_cuotas jsonb;
  v_movimientos jsonb;
  v_estados jsonb;
  v_plan bigint;
  v_venta bigint;
  v_fecha_corte date := (now() AT TIME ZONE 'America/Lima')::date;
BEGIN
  -- Valida identidad, rol CLIENTE activo, cuenta habilitada y titularidad.
  -- Reutiliza la selección del plan activo y contrato vigente firmado.
  v_resumen := public.sp_portal_cliente_resumen_v1(p_actor);

  FOR v_operacion IN
    SELECT DISTINCT ON ((x.value->>'id_venta')::bigint) x.value
    FROM jsonb_array_elements(v_resumen->'operaciones') AS x(value)
    ORDER BY (x.value->>'id_venta')::bigint
  LOOP
    v_venta := (v_operacion->>'id_venta')::bigint;
    v_plan := (v_operacion->'financiamiento'->>'idPlanPago')::bigint;
    v_cuotas := '[]'::jsonb;
    v_movimientos := '[]'::jsonb;
    v_estados := jsonb_build_object(
      'cantidad',0,'pendientes',0,'parciales',0,'vencidas',0,
      'pagadas',0,'anuladas',0,'atrasadas',0,'proximas7Dias',0,
      'montoAtrasado',0,'montoProximo',0,'discrepanciasRegistro',0
    );

    IF v_plan IS NOT NULL THEN
      -- Defensa adicional: jamás utilizar un plan desvinculado de la venta
      -- previamente autorizada por el procedimiento privado del Portal.
      IF NOT EXISTS (
        SELECT 1 FROM public.pag_planes_pago pp
        JOIN public.cfg_estados_plan_pago ep
          ON ep.id_estado_plan_pago=pp.id_estado_plan_pago
          AND ep.codigo='ACTIVO'
        WHERE pp.id_plan_pago=v_plan AND pp.id_venta=v_venta
          AND pp.es_vigente
          AND EXISTS (
            SELECT 1 FROM public.ven_contratos ct
            JOIN public.cfg_estados_contrato ec
              ON ec.id_estado_contrato=ct.id_estado_contrato
              AND ec.codigo='VIGENTE'
            WHERE ct.id_venta=v_venta AND ct.fecha_firma IS NOT NULL
          )
      ) THEN
        RAISE EXCEPTION 'PORTAL_PLAN_NO_AUTORIZADO|Plan inconsistente.';
      END IF;

      WITH cuotas_base AS (
        SELECT c.id_cuota,c.numero_cuota,c.fecha_vencimiento,
          c.monto_capital,c.monto_interes,c.monto_cuota,
          ec.codigo AS estado_registrado,
          public.fn_fin_saldo_cuota_confirmado_v1(c.id_cuota) AS saldo
        FROM public.pag_cuotas c
        JOIN public.cfg_estados_cuota ec
          ON ec.id_estado_cuota=c.id_estado_cuota
        WHERE c.id_plan_pago=v_plan
      ),
      clasificadas AS (
        SELECT b.*,
          public.fn_crm_clasificar_cuota_v1(
            b.estado_registrado,b.monto_cuota,
            b.monto_cuota-b.saldo,b.fecha_vencimiento,v_fecha_corte
          ) AS estado
        FROM cuotas_base b
      )
      SELECT
        coalesce(jsonb_agg(jsonb_build_object(
          'idCuota',c.id_cuota,'numero',c.numero_cuota,
          'fechaVencimiento',to_char(c.fecha_vencimiento,'YYYY-MM-DD'),
          'capital',c.monto_capital,'interes',c.monto_interes,
          'montoCuota',c.monto_cuota,
          'abonadoConfirmado',c.monto_cuota-c.saldo,
          'saldoCuota',c.saldo,
          'estadoCalculado',c.estado->>'estadoCalculado',
          'estadoRegistrado',c.estado->>'estadoRegistrado',
          'estadoDifiereRegistro',(c.estado->>'estadoDifiereRegistro')::boolean,
          'cuotaAtrasada',(c.estado->>'cuotaAtrasada')::boolean,
          'diasMora',(c.estado->>'diasMora')::integer,
          'proxima7Dias',(c.estado->>'proxima7Dias')::boolean
        ) ORDER BY c.numero_cuota,c.id_cuota),'[]'::jsonb),
        jsonb_build_object(
          'cantidad',count(*)::integer,
          'pendientes',count(*) FILTER (WHERE c.estado->>'estado'='PENDIENTE')::integer,
          'parciales',count(*) FILTER (WHERE c.estado->>'estado'='PARCIAL')::integer,
          'vencidas',count(*) FILTER (WHERE c.estado->>'estado'='VENCIDA')::integer,
          'pagadas',count(*) FILTER (WHERE c.estado->>'estado'='PAGADA')::integer,
          'anuladas',count(*) FILTER (WHERE c.estado->>'estado'='ANULADA')::integer,
          'atrasadas',count(*) FILTER (WHERE (c.estado->>'cuotaAtrasada')::boolean)::integer,
          'proximas7Dias',count(*) FILTER (WHERE (c.estado->>'proxima7Dias')::boolean)::integer,
          'montoAtrasado',coalesce(sum(c.saldo) FILTER (
            WHERE (c.estado->>'cuotaAtrasada')::boolean),0),
          'montoProximo',coalesce(sum(c.saldo) FILTER (
            WHERE (c.estado->>'proxima7Dias')::boolean),0),
          'discrepanciasRegistro',count(*) FILTER (
            WHERE (c.estado->>'estadoDifiereRegistro')::boolean)::integer
        )
      INTO v_cuotas,v_estados
      FROM clasificadas c;

      -- Movimientos: únicamente la porción de pagos CONFIRMADOS que fue
      -- efectivamente aplicada; no el importe completo del voucher.
      -- No se devuelven rutas de Storage, hash ni archivos internos.
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'idAplicacion',a.id_aplicacion_pago,
        'codigoPago',p.codigo,
        'tipo',ta.codigo,
        'numeroCuota',c.numero_cuota,
        'fechaOperacion',to_char(p.fecha_operacion AT TIME ZONE 'America/Lima','YYYY-MM-DD'),
        'fechaAplicacion',to_char(a.fecha_aplicacion AT TIME ZONE 'America/Lima','YYYY-MM-DD'),
        'montoAplicado',a.monto_aplicado
      ) ORDER BY a.fecha_aplicacion DESC,a.id_aplicacion_pago DESC),'[]'::jsonb)
      INTO v_movimientos
      FROM public.pag_aplicaciones_pago a
      JOIN public.pag_pagos p
        ON p.id_pago=a.id_pago AND p.id_plan_pago=v_plan
        AND (p.id_venta=v_venta OR p.id_venta IS NULL)
      JOIN public.cfg_estados_pago ep
        ON ep.id_estado_pago=p.id_estado_pago AND ep.codigo='CONFIRMADO'
      JOIN public.cfg_tipos_aplicacion_pago ta
        ON ta.id_tipo_aplicacion_pago=a.id_tipo_aplicacion_pago
        AND ta.codigo IN ('CUOTA','INICIAL')
      LEFT JOIN public.pag_cuotas c
        ON c.id_cuota=a.id_cuota AND c.id_plan_pago=v_plan
      WHERE a.id_plan_pago=v_plan AND a.activo
        AND ((ta.codigo='INICIAL' AND a.id_cuota IS NULL)
          OR (ta.codigo='CUOTA' AND c.id_cuota IS NOT NULL));
    END IF;

    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'idVenta',v_venta,
      'codigoVenta',v_operacion->>'codigo_venta',
      'proyecto',v_operacion->>'proyecto',
      'manzana',v_operacion->>'manzana',
      'numeroLote',v_operacion->>'numero_lote',
      'financiamiento',v_operacion->'financiamiento',
      'cuotas',v_cuotas,
      'resumenEstados',v_estados,
      'movimientosConfirmados',v_movimientos
    ));
  END LOOP;

  RETURN jsonb_build_object(
    'items',v_items,'total',jsonb_array_length(v_items),
    'moneda','PEN','fechaCorte',to_char(v_fecha_corte,'YYYY-MM-DD'),
    'fuente','APLICACIONES_CONFIRMADAS',
    'advertenciaInicial','El saldo de inicial adicional sin aplicación confirmada es un importe por conciliar, no una mora automática.',
    'advertenciaPagos','Los vouchers pendientes, rechazados o pagos no aplicados no reducen los saldos.'
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.sp_portal_cliente_cronograma_v1(bigint)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_portal_cliente_cronograma_v1(bigint)
  TO sigi_app_user;
