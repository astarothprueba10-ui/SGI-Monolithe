-- SGI MONOLITHE · 5.3.5 · conciliación final SOLO LECTURA
-- No borrar/confirmar/anular pagos ni archivos mediante este script.
SELECT public.sp_fin_conciliacion_integral_v1(5,'TODOS',NULL,1,50) resumen;
SELECT public.sp_fin_conciliacion_integral_v1(5,'CON_ALERTA',NULL,1,50) alertas;
SELECT public.sp_fin_opciones_registro_inicial_v1(5,NULL,60) iniciales_exigibles;
SELECT public.sp_finanzas_listar_vouchers_financiamiento_v2(
  5,'TODOS',NULL,1,50) vouchers_financiados;

SELECT (SELECT count(*) FROM public.pag_pagos) pagos,
 (SELECT count(*) FROM public.pag_vouchers) vouchers,
 (SELECT count(*) FROM public.pag_aplicaciones_pago) aplicaciones,
 (SELECT count(*) FROM public.pag_planes_pago) planes,
 (SELECT count(*) FROM public.pag_cuotas) cuotas,
 (SELECT count(*) FROM public.pag_cargas_voucher_cuota) cargas_cuotas,
 (SELECT count(*) FROM public.pag_cargas_voucher_inicial_v1) cargas_inicial,
 (SELECT count(*) FROM public.pag_vouchers_cuota_revisiones) revisiones_cuotas,
 (SELECT count(*) FROM public.pag_vouchers_inicial_revisiones_v1) revisiones_inicial,
 (SELECT count(*) FROM public.pag_imputaciones_operaciones_v1) imputaciones_sprint4,
 (SELECT count(*) FROM public.pag_conciliacion_eventos_v1) eventos_seguimiento;

SELECT proname,
 has_function_privilege('anon',oid,'EXECUTE') anon,
 has_function_privilege('authenticated',oid,'EXECUTE') autenticado,
 has_function_privilege('sigi_app_user',oid,'EXECUTE') backend
FROM pg_proc
WHERE pronamespace='public'::regnamespace AND proname IN(
 'sp_fin_conciliacion_integral_v1',
 'sp_fin_marcar_revision_conciliacion_v1',
 'sp_fin_opciones_registro_inicial_v1',
 'sp_fin_preparar_carga_voucher_inicial_v1',
 'sp_fin_registrar_voucher_inicial_pendiente_v1',
 'sp_finanzas_revisar_voucher_financiamiento_v2',
 'sp_finanzas_listar_vouchers_financiamiento_v2')
ORDER BY proname;

-- Candidatos a limpieza documental: nunca eliminar automáticamente.
SELECT c.id_carga,c.id_venta,c.id_cuota,c.fecha_creacion,c.expira_en
FROM public.pag_cargas_voucher_cuota c
WHERE c.id_pago IS NULL AND c.expira_en<now()-interval '7 days'
  AND NOT EXISTS(SELECT 1 FROM storage.objects o
    WHERE o.bucket_id='vouchers-ventas-private' AND o.name=c.clave_archivo)
ORDER BY c.expira_en LIMIT 50;
SELECT c.id_carga,c.id_venta,c.id_plan_pago,c.fecha_creacion,c.expira_en
FROM public.pag_cargas_voucher_inicial_v1 c
WHERE c.id_pago IS NULL AND c.expira_en<now()-interval '7 days'
 AND NOT EXISTS(SELECT 1 FROM storage.objects o
   WHERE o.bucket_id='vouchers-ventas-private' AND o.name=c.clave_archivo)
ORDER BY c.expira_en LIMIT 50;
