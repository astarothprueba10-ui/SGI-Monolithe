-- SGI MONOLITHE | Sprint 4 / 5.2.7
-- VERIFICACIÓN SOLO LECTURA; actor 5 autorizado en Supabase TESTEO.
-- NO ejecuta el procedimiento antiguo ni cambia estados de contratos.
-- Fecha de corte local America/Lima.

-- 1. Lista segura y autorizada de posibles causales en cartera.
SELECT public.sp_fin_alertas_resolutoria_v1(5,1,20) AS posibles_revisiones;

-- 2. Conteos del procedimiento autorizado (sin declarar resolución).
SELECT j->>'fechaCorte' fecha_corte,
       (j->>'total')::integer expedientes,
       (j->>'montoEnRevision')::numeric saldo_secuencias,
       j->>'resolucionAutomatica' resolucion_automatica
FROM (SELECT public.sp_fin_alertas_resolutoria_v1(5,1,20) j) x;

-- 3. Estado general de planes y contratos, sin datos personales.
SELECT p.id_plan_pago,p.id_venta,ep.codigo estado_plan,
       p.es_vigente,p.numero_cuotas,
       count(c.id_cuota) AS cuotas_registradas
FROM public.pag_planes_pago p
JOIN public.cfg_estados_plan_pago ep USING(id_estado_plan_pago)
LEFT JOIN public.pag_cuotas c USING(id_plan_pago)
GROUP BY p.id_plan_pago,ep.codigo
ORDER BY p.id_plan_pago;

-- 4. Permisos: auxiliares cerrados; solo consulta autorizada en Core.
SELECT p.proname,
 has_function_privilege('anon',p.oid,'EXECUTE') anon,
 has_function_privilege('authenticated',p.oid,'EXECUTE') autenticado,
 has_function_privilege('sigi_app_user',p.oid,'EXECUTE') rol_core
FROM pg_proc p
WHERE p.pronamespace='public'::regnamespace
  AND p.proname IN('fn_fin_rachas_impagas_v1','sp_fin_alertas_resolutoria_v1')
ORDER BY p.proname;

-- 5. Verificación de ausencia de escrituras inesperadas.
SELECT (SELECT count(*) FROM public.not_notificaciones
          WHERE referencia_modulo='FINANCIAMIENTO') notificaciones_financieras,
       (SELECT count(*) FROM public.not_envios) envios_registrados,
       (SELECT count(*) FROM public.pag_cuotas) cuotas_totales;
