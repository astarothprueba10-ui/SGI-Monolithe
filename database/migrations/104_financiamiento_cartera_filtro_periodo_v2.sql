-- 104: Filtro temporal de planes y KPIs por fecha de REGISTRO de venta.
-- Cifras de deuda siguen siendo SALDOS ACTUALES de la cohorte; no reconstruyen cortes históricos.
-- Alertas de vencimiento son independientes del período y no se ocultan al filtrar.
-- La versión anterior permanece intacta para conservar compatibilidad.
BEGIN;
CREATE OR REPLACE FUNCTION public.sp_fin_cartera_backoffice_v2(
 p_actor bigint, p_vista text DEFAULT 'PLANES',
 p_busqueda text DEFAULT '', p_pagina integer DEFAULT 1, p_tamano integer DEFAULT 20,
 p_desde timestamptz DEFAULT NULL, p_hasta_exclusivo timestamptz DEFAULT NULL
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
  OR p_desde IS NULL OR p_hasta_exclusivo IS NULL
  OR p_desde >= p_hasta_exclusivo
  OR p_hasta_exclusivo > p_desde + interval '15 years'
 THEN RAISE EXCEPTION 'FILTROS_INVALIDOS|Filtros o fechas de cartera invalidos.'; END IF;

 FOR v_fila IN
   SELECT v.id_venta,v.codigo AS codigo_venta,ev.codigo AS estado_venta,
     pp.id_plan_pago,pp.codigo AS codigo_plan,pp.numero_cuotas,
     pp.monto_venta,pp.capital_financiado,pp.monto_interes_total,
     pp.monto_inicial,pp.monto_reserva_aplicada,pp.tasa_interes_pct,
     ep.codigo AS estado_plan,
     to_char((coalesce(v.fecha_venta,v.fecha_creacion) AT TIME ZONE 'America/Lima')::date,'YYYY-MM-DD') AS fecha_venta,
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
     AND coalesce(v.fecha_venta,v.fecha_creacion) >= p_desde
     AND coalesce(v.fecha_venta,v.fecha_creacion) < p_hasta_exclusivo
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
      'fechaVenta',v_fila.fecha_venta,
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
   'desde',to_char(p_desde AT TIME ZONE 'America/Lima','YYYY-MM-DD'),
   'hastaExclusivo',to_char(p_hasta_exclusivo AT TIME ZONE 'America/Lima','YYYY-MM-DD'),
   'fechaBase','FECHA_VENTA',
   'saldoBase','SALDO_ACTUAL',
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
REVOKE ALL ON FUNCTION public.sp_fin_cartera_backoffice_v2(bigint,text,text,integer,integer,timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_fin_cartera_backoffice_v2(bigint,text,text,integer,integer,timestamptz,timestamptz) TO sigi_app_user;
COMMIT;
