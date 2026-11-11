-- SGI-MONOLITHE · Sprint 4 · 5.2.3
-- DIAGNOSTICO SOLO LECTURA. Requiere migraciones 73, 74 y 75.
-- Los resultados no reescriben cuotas ni aprueban contratos.

-- 1. Estados, cuotas generadas y conciliacion histórica por plan.
WITH sumas AS (
 SELECT p.id_plan_pago,p.id_venta,p.descripcion_condiciones,e.codigo estado_plan,
        p.capital_financiado,p.monto_interes_total,p.monto_total_financiado,
        p.numero_cuotas,
        COUNT(c.id_cuota) cuotas_registradas,
        COALESCE(SUM(c.monto_capital),0) capital_registrado,
        COALESCE(SUM(c.monto_interes),0) interes_registrado,
        COALESCE(SUM(c.monto_cuota),0) total_registrado
 FROM public.pag_planes_pago p
 JOIN public.cfg_estados_plan_pago e USING(id_estado_plan_pago)
 LEFT JOIN public.pag_cuotas c USING(id_plan_pago)
 GROUP BY p.id_plan_pago,e.codigo
)
SELECT *,
 CASE
  WHEN estado_plan='PENDIENTE' AND cuotas_registradas=0 THEN 'PROYECCION_NO_EXIGIBLE'
  WHEN estado_plan='PENDIENTE' THEN 'ERROR_CUOTAS_PREMATURAS'
  WHEN cuotas_registradas=numero_cuotas
   AND capital_registrado=capital_financiado
   AND interes_registrado=monto_interes_total
   AND total_registrado=monto_total_financiado THEN 'CONCILIADO'
  WHEN cuotas_registradas>0 THEN 'REVISAR_DIFERENCIA_HISTORICA'
  ELSE 'SIN_CUOTAS_REGISTRADAS'
 END as diagnostico
FROM sumas ORDER BY id_plan_pago;

-- 2. Proyeccion V1 existente y lecturas firmadas verifican el contrato JSON.
SELECT v.id_venta,
       j->>'tipoCronograma' tipo,
       j->>'codigoPlan' codigo_plan,
       jsonb_array_length(j->'items') numero_items,
       j->'items'->0->>'fechaVencimiento' primer_vencimiento,
       j->'items'->-1->>'fechaVencimiento' ultimo_vencimiento
FROM (VALUES(2::bigint),(4::bigint),(21::bigint),(28::bigint)) v(id_venta)
CROSS JOIN LATERAL(
 SELECT public.sp_crm_cronograma_venta_v3(5,v.id_venta) j
) c ORDER BY v.id_venta;

-- 3. Fechas ancladas: la segunda cuota conserva el dia 31 de marzo.
SELECT
 j->>'capitalFinanciado' capital,
 j->>'interesTotal' intereses,
 j->>'totalCuotas' total,
 j->'items'->0->>'fechaVencimiento' febrero_bisiesto,
 j->'items'->1->>'fechaVencimiento' marzo,
 j->'items'->2->>'fechaVencimiento' abril,
 jsonb_array_length(j->'items') numero_cuotas
FROM (
 SELECT public.fn_crm_generar_cronograma_frances_v2(
  30000,500,4500,36,DATE '2028-01-31') j
) g;

-- 4. Los procedimientos versionados deben ser exclusivos del rol backend.
SELECT p.proname,
 has_function_privilege('anon',p.oid,'EXECUTE') anon_puede_ejecutar,
 has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_puede_ejecutar,
 has_function_privilege('sigi_app_user',p.oid,'EXECUTE') core_puede_ejecutar
FROM pg_proc p
WHERE p.pronamespace='public'::regnamespace AND p.proname IN(
 'fn_crm_generar_cronograma_frances_v2',
 'sp_crm_cronograma_venta_v3',
 'sp_crm_aprobar_firma_contrato_v8'
) ORDER BY p.proname;
