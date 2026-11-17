-- SGI-MONOLITHE | Sprint 4 | 5.2.7
-- Posible causal de revisión contractual: TRES o más cuotas
-- de NUMERO_CONSECUTIVO, vencidas y con saldo confirmado pendiente.
-- NO cancela ventas ni contratos, NO cambia estados, NO notifica al cliente.
-- Regla de filtro operativa, NO dictamen jurídico vinculante.
-- Fecha local Peru; contratos VIGENTES y firmados; planes activos vigentes.
-- Dependencia: migraciones 76,78,79,80,81,82.

CREATE OR REPLACE FUNCTION public.fn_fin_rachas_impagas_v1(p_fecha_corte date)
RETURNS TABLE(
  id_venta bigint,
  id_plan_pago bigint,
  codigo_venta varchar,
  id_cliente bigint,
  comprador text,
  desde_cuota integer,
  hasta_cuota integer,
  cuotas_consecutivas bigint,
  saldo_racha numeric,
  fecha_primer_vencimiento date,
  fecha_ultimo_vencimiento date,
  cuotas jsonb
)
LANGUAGE sql STABLE
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
 WITH candidatas AS (
   SELECT
     a.*,
     (a.numero_cuota - row_number() OVER (
       PARTITION BY a.id_plan_pago ORDER BY a.numero_cuota
     )::integer) AS grupo
   FROM public.fn_fin_alertas_cuotas_base_v1(p_fecha_corte) a
   JOIN public.pag_planes_pago pp ON pp.id_plan_pago=a.id_plan_pago
   WHERE a.tipo_alerta='CUOTA_VENCIDA'
     AND pp.es_vigente AND pp.numero_cuotas>=3
     -- Un plan truncado no debe producir un aviso de posible resolución.
     AND (SELECT count(*) FROM public.pag_cuotas c
          WHERE c.id_plan_pago=pp.id_plan_pago)=pp.numero_cuotas
     AND EXISTS (
       SELECT 1 FROM public.ven_contratos ct
       JOIN public.cfg_estados_contrato ec
         ON ec.id_estado_contrato=ct.id_estado_contrato
       WHERE ct.id_venta=a.id_venta AND ec.codigo='VIGENTE'
         AND ct.fecha_firma IS NOT NULL
     )
 ),
 rachas AS (
   SELECT c.id_venta,c.id_plan_pago,c.codigo_venta,
     max(c.id_cliente) AS id_cliente,
     max(c.comprador) AS comprador,
     min(c.numero_cuota) AS desde_cuota,
     max(c.numero_cuota) AS hasta_cuota,
     count(*) AS cuotas_consecutivas,
     sum(c.saldo_cuota) AS saldo_racha,
     min(c.fecha_vencimiento) AS fecha_primer_vencimiento,
     max(c.fecha_vencimiento) AS fecha_ultimo_vencimiento,
     jsonb_agg(jsonb_build_object(
       'idCuota',c.id_cuota,'numeroCuota',c.numero_cuota,
       'fechaVencimiento',to_char(c.fecha_vencimiento,'YYYY-MM-DD'),
       'importeCuota',c.monto_cuota,
       'abonadoConfirmado',c.abonado_confirmado,
       'saldoPendiente',c.saldo_cuota,
       'estadoCuota',c.estado_cuota,
       'diasMora',c.dias_mora
     ) ORDER BY c.numero_cuota) AS cuotas
   FROM candidatas c
   GROUP BY c.id_venta,c.id_plan_pago,c.codigo_venta,c.grupo
   HAVING count(*)>=3
 ),
 elegidas AS (
   SELECT r.*,
     row_number() OVER(
       PARTITION BY r.id_plan_pago
       ORDER BY r.cuotas_consecutivas DESC,r.hasta_cuota DESC
     ) AS ranking
   FROM rachas r
 )
 SELECT e.id_venta,e.id_plan_pago,e.codigo_venta,
   e.id_cliente,e.comprador,e.desde_cuota,e.hasta_cuota,
   e.cuotas_consecutivas,e.saldo_racha,
   e.fecha_primer_vencimiento,e.fecha_ultimo_vencimiento,e.cuotas
 FROM elegidas e
 WHERE e.ranking=1;
$fn$;

-- Endpoint backend con doble control: permiso para revisar
-- situaciones contractuales + alcance efectivo de cartera.
CREATE OR REPLACE FUNCTION public.sp_fin_alertas_resolutoria_v1(
 p_actor bigint,
 p_pagina integer DEFAULT 1,
 p_tamano integer DEFAULT 20
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE
 v_corte date:=(now() AT TIME ZONE 'America/Lima')::date;
 v_total integer;
 v_monto numeric;
 v_items jsonb;
BEGIN
 IF p_actor IS NULL OR p_actor<=0
   OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(
        p_actor,'sales.view'::varchar),false)
   OR NOT (
        coalesce(public.fn_usuario_tiene_permiso_seguridad(
          p_actor,'sales.legal.review'::varchar),false)
        OR coalesce(public.fn_usuario_tiene_permiso_seguridad(
          p_actor,'sales.annul'::varchar),false)
        OR coalesce(public.fn_usuario_tiene_permiso_seguridad(
          p_actor,'financing.approve'::varchar),false)
   )
 THEN
   RAISE EXCEPTION 'ACCESO_DENEGADO|Se requiere autorización para la revisión contractual.';
 END IF;
 IF p_pagina IS NULL OR p_pagina NOT BETWEEN 1 AND 10000
    OR p_tamano IS NULL OR p_tamano NOT BETWEEN 1 AND 100
 THEN RAISE EXCEPTION 'FILTROS_INVALIDOS|Paginación de revisión inválida.'; END IF;

 SELECT count(*)::integer,coalesce(sum(r.saldo_racha),0)
 INTO v_total,v_monto
 FROM public.fn_fin_rachas_impagas_v1(v_corte) r
 WHERE public.fn_crm_puede_consultar_venta_v1(p_actor,r.id_venta);

 SELECT coalesce(jsonb_agg(jsonb_build_object(
    'idVenta',q.id_venta,'idPlanPago',q.id_plan_pago,
    'codigoVenta',q.codigo_venta,'idCliente',q.id_cliente,
    'comprador',q.comprador,'desdeCuota',q.desde_cuota,
    'hastaCuota',q.hasta_cuota,'cuotasConsecutivas',q.cuotas_consecutivas,
    'saldoRacha',q.saldo_racha,
    'fechaPrimerVencimiento',to_char(q.fecha_primer_vencimiento,'YYYY-MM-DD'),
    'fechaUltimoVencimiento',to_char(q.fecha_ultimo_vencimiento,'YYYY-MM-DD'),
    'cuotas',q.cuotas,
    'requiereRevision',true,'resolucionAutomatica',false,
    'criterio','TRES_CUOTAS_CONSECUTIVAS_VENCIDAS_CON_SALDO'
 ) ORDER BY q.cuotas_consecutivas DESC,q.fecha_ultimo_vencimiento,q.id_venta),
 '[]'::jsonb)
 INTO v_items
 FROM (
   SELECT * FROM public.fn_fin_rachas_impagas_v1(v_corte) r
   WHERE public.fn_crm_puede_consultar_venta_v1(p_actor,r.id_venta)
   ORDER BY r.cuotas_consecutivas DESC,r.fecha_ultimo_vencimiento,r.id_venta
   LIMIT p_tamano OFFSET (p_pagina-1)*p_tamano
 ) q;

 RETURN jsonb_build_object(
  'fechaCorte',to_char(v_corte,'YYYY-MM-DD'),
  'pagina',p_pagina,'tamano',p_tamano,
  'total',v_total,'paginas',ceil(v_total::numeric/p_tamano)::integer,
  'montoEnRevision',v_monto,'items',v_items,
  'resolucionAutomatica',false,
  'advertencia','Posible causal para revisión comercial y jurídica. No declara resuelto ningún contrato; revisar cláusula pactada, pagos y requisitos legales.');
END;
$fn$;

-- La función auxiliar no se ofrece públicamente vía Supabase Data API.
-- La rutina interna sin actor queda solo accesible por el propietario;
-- ni siquiera el rol Core puede consultarla directamente sin el wrapper
-- que vuelve a verificar permisos y cartera.
REVOKE ALL ON FUNCTION public.fn_fin_rachas_impagas_v1(date)
  FROM PUBLIC,anon,authenticated,sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_fin_alertas_resolutoria_v1(bigint,integer,integer)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_fin_alertas_resolutoria_v1(bigint,integer,integer)
  TO sigi_app_user;
