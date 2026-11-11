-- SGI-MONOLITHE · Sprint 4 / 5.2.5
-- SOLO LECTURA: ejecutar en Supabase de testeo despues de migracion 79 y 80.
-- Actor 5 accede a las ventas historicas de ejemplo; no modificar cuotas.

-- Conteos de estados calculados, vencimientos y proximos siete dias.
SELECT v.id_venta,
       j->>'tipoCronograma' AS tipo,
       j->>'fechaCorte' AS fecha_lima,
       j->>'fuenteEstados' AS fuente,
       (j->>'cuotasPendientes')::integer AS pendientes,
       (j->>'cuotasParciales')::integer AS parciales,
       (j->>'cuotasVencidas')::integer AS vencidas,
       (j->>'cuotasPagadas')::integer AS pagadas,
       (j->>'cuotasProximas')::integer AS proximas_7_dias,
       (j->>'cuotasAtrasadas')::integer AS atrasadas,
       (j->>'montoVencido')::numeric AS saldo_vencido,
       (j->>'estadosDiferentesRegistro')::integer AS estados_no_conciliados,
       jsonb_array_length(j->'items') AS cuotas_en_cronograma
FROM (VALUES(2::bigint),(4::bigint),(21::bigint),(28::bigint)) v(id_venta)
CROSS JOIN LATERAL (
 SELECT public.sp_crm_cronograma_venta_v4(5,v.id_venta) AS j
) s ORDER BY v.id_venta;

-- Solo estados que difieren del campo historico de pag_cuotas;
-- no reparar ni sobreescribir sin revision de las aplicaciones confirmadas.
WITH ventas AS (
 SELECT v.id_venta,public.sp_crm_cronograma_venta_v4(5,v.id_venta) j
 FROM (VALUES(2::bigint),(4::bigint),(21::bigint),(28::bigint)) v(id_venta)
)
SELECT v.id_venta,
       c->>'numero' AS cuota,
       c->>'estadoRegistrado' AS estado_guardado,
       c->>'estadoCalculado' AS estado_contable,
       (c->>'abonadoConfirmado')::numeric AS pagado_confirmado,
       (c->>'saldoCuota')::numeric AS saldo_real,
       (c->>'diasMora')::integer AS dias_mora
FROM ventas v CROSS JOIN LATERAL jsonb_array_elements(v.j->'items') c
WHERE c->>'estadoDifiereRegistro'='true'
ORDER BY v.id_venta,(c->>'numero')::integer;

-- No hubo modificaciones de datos en la migracion 79/80.
SELECT p.id_plan_pago,e.codigo AS estado_plan,
       count(c.id_cuota) AS cantidad_cuotas,
       coalesce(sum(c.monto_capital),0) AS capital_registrado,
       coalesce(sum(c.monto_interes),0) AS interes_registrado
FROM public.pag_planes_pago p
JOIN public.cfg_estados_plan_pago e USING(id_estado_plan_pago)
LEFT JOIN public.pag_cuotas c USING(id_plan_pago)
GROUP BY p.id_plan_pago,e.codigo ORDER BY p.id_plan_pago;

-- Los roles de navegador no deben poder ejecutar funciones financieras.
SELECT proname,
       has_function_privilege('anon',oid,'EXECUTE') AS anon,
       has_function_privilege('authenticated',oid,'EXECUTE') AS autenticado,
       has_function_privilege('sigi_app_user',oid,'EXECUTE') AS backend
FROM pg_proc
WHERE pronamespace='public'::regnamespace
 AND proname IN('fn_crm_clasificar_cuota_v1','sp_crm_cronograma_venta_v4')
ORDER BY proname;
