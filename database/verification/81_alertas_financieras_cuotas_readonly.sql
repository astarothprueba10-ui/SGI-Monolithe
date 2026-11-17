-- SGI-MONOLITHE | Sprint 4 / 5.2.6
-- CONSULTAS DE SOLO LECTURA. No crean avisos ni ejecutan envíos.
-- Ejecutar en Supabase de TESTEO, tras migraciones 81 y 82.

-- 1. Alertas reales del actor autorizado, corte America/Lima.
SELECT public.sp_fin_alertas_cuotas_v1(5,'TODAS',1,20) AS cartera;

-- 2. Verificaciones de coherencia de vencimientos.
SELECT tipo_alerta,COUNT(*) cuotas,
       COALESCE(SUM(saldo_cuota),0) saldo_pendiente,
       MIN(fecha_vencimiento) proximo_vencimiento
FROM public.fn_fin_alertas_cuotas_base_v1(
 (now() AT TIME ZONE 'America/Lima')::date)
GROUP BY tipo_alerta ORDER BY tipo_alerta;

-- 3. Catalogos de notificacion existentes, sin replicar tablas.
SELECT codigo,id_tipo_notificacion,activo
FROM public.cfg_tipos_notificacion
WHERE codigo IN('CUOTA_PROXIMA','CUOTA_VENCIDA')
ORDER BY codigo;

-- 4. Avisos internos existentes, sin exponer datos de compradores.
SELECT referencia_modulo,referencia_entidad,
 count(*) AS total,
 count(*) FILTER(WHERE activo) AS activos,
 count(*) FILTER(WHERE NOT activo) AS historicos_desactivados
FROM public.not_notificaciones
WHERE referencia_modulo='FINANCIAMIENTO'
GROUP BY referencia_modulo,referencia_entidad;

-- 5. No se debe crear ni enviar correo/SMS en 5.2.6.
SELECT count(*) AS envios_registrados FROM public.not_envios;

-- 6. Acceso a operaciones financieras solo desde Core Service.
SELECT proname,
 has_function_privilege('anon',oid,'EXECUTE') anon,
 has_function_privilege('authenticated',oid,'EXECUTE') authenticated,
 has_function_privilege('sigi_app_user',oid,'EXECUTE') backend
FROM pg_proc
WHERE pronamespace='public'::regnamespace AND proname IN
 ('fn_fin_alertas_cuotas_base_v1','sp_fin_alertas_cuotas_v1',
  'sp_fin_preparar_avisos_portal_v1')
ORDER BY proname;

-- 7. Integridad de cronogramas históricos, sin alterarlos.
SELECT p.id_plan_pago,p.id_venta,e.codigo estado_plan,
       count(c.id_cuota) cuotas,COALESCE(sum(c.monto_capital),0) capital,
       COALESCE(sum(c.monto_interes),0) intereses
FROM public.pag_planes_pago p
JOIN public.cfg_estados_plan_pago e USING(id_estado_plan_pago)
LEFT JOIN public.pag_cuotas c USING(id_plan_pago)
GROUP BY p.id_plan_pago,e.codigo ORDER BY p.id_plan_pago;
