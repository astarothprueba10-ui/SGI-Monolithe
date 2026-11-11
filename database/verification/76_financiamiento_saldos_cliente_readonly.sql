-- SGI-MONOLITHE — Sprint 4 / 5.2.4
-- EJECUTAR EN SUPABASE DE TESTEO. 100% SOLO LECTURA.
-- El actor 5 tiene acceso a las ventas de ejemplo en esta BD.
-- No extrapolar importes del entorno de pruebas a producción.

-- Verificar saldos de las ventas financiadas (aplicaciones confirmadas).
SELECT v.id_venta,v.codigo AS venta,
  s.j->>'estadoPlan' AS estado_plan,
  (s.j->>'totalPlanCuotas')::numeric AS total_contractual,
  (s.j->>'abonadoCuotasConfirmado')::numeric AS abonado_confirmado,
  (s.j->>'saldoFinanciamiento')::numeric AS saldo_financiamiento,
  (s.j->>'inicialSinAplicacionConfirmada')::numeric AS inicial_por_conciliar,
  (s.j->>'pagosConfirmadosSinAplicar')::numeric AS efectivo_no_imputado,
  (s.j->>'diferenciaCronograma')::numeric AS diferencia_historica,
  s.j->'alertasConciliacion' alertas
FROM public.ven_ventas v
CROSS JOIN LATERAL (
 SELECT public.sp_crm_saldo_venta_v1(5,v.id_venta) AS j
) s
WHERE v.id_venta IN(2,4,21,28)
ORDER BY v.id_venta;

-- Consolidar solo ventas FINANCIADAS del cliente titular y cartera visible.
SELECT c.id_cliente,
  (s.j->>'numeroVentas')::int AS ventas_financiadas_autorizadas,
  (s.j->>'saldoFinanciamientoActivo')::numeric AS saldo_activo,
  (s.j->>'saldoFinanciamientoPendienteFirma')::numeric AS proyeccion_no_exigible,
  (s.j->>'inicialSinAplicacionConfirmada')::numeric AS inicial_por_conciliar
FROM (VALUES(2::bigint),(9),(27),(30)) c(id_cliente)
CROSS JOIN LATERAL (
 SELECT public.sp_crm_saldo_cliente_v1(5,c.id_cliente) AS j
) s ORDER BY c.id_cliente;

-- El pago registrado no confirmado NO reduce el saldo.
-- Los pagos sin aplicación activa NO se imputan automáticamente.
SELECT pg.id_pago,pg.id_venta,pg.id_plan_pago,ep.codigo AS estado,
       pg.monto,COALESCE(SUM(a.monto_aplicado) FILTER(WHERE a.activo),0) AS aplicado
FROM public.pag_pagos pg
JOIN public.cfg_estados_pago ep USING(id_estado_pago)
LEFT JOIN public.pag_aplicaciones_pago a USING(id_pago)
GROUP BY pg.id_pago,ep.codigo ORDER BY pg.id_pago;

-- Verificar que únicamente el backend pueda ejecutar los procedimientos.
SELECT p.proname,
 has_function_privilege('anon',p.oid,'EXECUTE') AS acceso_anon,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS acceso_authenticated,
 has_function_privilege('sigi_app_user',p.oid,'EXECUTE') AS acceso_backend
FROM pg_proc p
WHERE p.pronamespace='public'::regnamespace
 AND p.proname IN ('sp_crm_saldo_venta_v1','sp_crm_saldo_cliente_v1')
ORDER BY p.proname;

-- Incidencias de pagos cuya suma de aplicaciones excede su monto.
-- Resultado esperado: 0 registros.
SELECT pg.id_pago,pg.codigo,pg.monto,
 COALESCE(SUM(a.monto_aplicado) FILTER(WHERE a.activo),0) aplicaciones_activas
FROM public.pag_pagos pg
LEFT JOIN public.pag_aplicaciones_pago a USING(id_pago)
GROUP BY pg.id_pago
HAVING COALESCE(SUM(a.monto_aplicado) FILTER(WHERE a.activo),0)>pg.monto
ORDER BY pg.id_pago;

-- RLS financiero: anon/authenticated false; el backend conserva SELECT.
SELECT p.relname AS tabla,p.relrowsecurity AS rls_habilitado,
 has_table_privilege('anon',p.oid,'SELECT') anon_lectura,
 has_table_privilege('authenticated',p.oid,'SELECT') authenticated_lectura,
 has_table_privilege('sigi_app_user',p.oid,'SELECT') backend_lectura
FROM pg_class p
WHERE p.oid IN('public.pag_planes_pago'::regclass,'public.pag_cuotas'::regclass)
ORDER BY p.relname;

-- Auditoría de discrepancias históricas: sin modificaciones a pag_cuotas.
SELECT p.id_plan_pago,p.id_venta,p.capital_financiado,
       COALESCE(SUM(c.monto_capital),0) AS capital_registrado,
       p.capital_financiado-COALESCE(SUM(c.monto_capital),0) AS diferencia
FROM public.pag_planes_pago p JOIN public.pag_cuotas c USING(id_plan_pago)
GROUP BY p.id_plan_pago
HAVING p.capital_financiado<>COALESCE(SUM(c.monto_capital),0);
