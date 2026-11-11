-- SGI-MONOLITHE · Sprint 4 / 5.3.4
-- Consultas SOLO LECTURA. Nunca aplican ni revierten pagos.

-- Bandeja de pagos CONFIRMADOS, con voucher APROBADO y evidencia privada real.
SELECT public.sp_fin_imputaciones_v1(5,1,20) bandeja;

-- Auditoría de operaciones del 5.3.4, incluso anuladas.
SELECT o.id_solicitud,o.id_aplicacion_pago,o.id_pago,o.id_plan_pago,
  o.id_cuota,o.tipo,o.monto,o.id_actor,o.fecha_registro,
  a.activo,a.fecha_anulacion,a.id_usuario_anulacion,a.motivo_anulacion
FROM public.pag_imputaciones_operaciones_v1 o
JOIN public.pag_aplicaciones_pago a USING(id_aplicacion_pago)
ORDER BY o.fecha_registro DESC LIMIT 60;

-- Conciliación: solo el pago CONFIRMADO y la aplicación activa descontarán.
SELECT p.id_pago,p.codigo codigo_pago,es.codigo estado_pago,p.monto,
  coalesce(sum(a.monto_aplicado) FILTER(WHERE a.activo),0) total_aplicado,
  p.monto-coalesce(sum(a.monto_aplicado) FILTER(WHERE a.activo),0) no_aplicado
FROM public.pag_pagos p
JOIN public.cfg_estados_pago es USING(id_estado_pago)
LEFT JOIN public.pag_aplicaciones_pago a USING(id_pago)
WHERE p.id_plan_pago IS NOT NULL
GROUP BY p.id_pago,es.codigo ORDER BY p.id_pago DESC;

-- Permisos restringidos al backend para RPC; helper privado.
SELECT proname,has_function_privilege('anon',oid,'EXECUTE') anon,
  has_function_privilege('authenticated',oid,'EXECUTE') autenticado,
  has_function_privilege('sigi_app_user',oid,'EXECUTE') rol_core
FROM pg_proc WHERE pronamespace='public'::regnamespace AND
 proname IN('sp_fin_imputaciones_v1','sp_fin_aplicar_pago_confirmado_v1',
  'sp_fin_revertir_aplicacion_v1','fn_fin_voucher_privado_disponible_v1')
ORDER BY proname;

-- Integridad de volumen y saldos históricos.
SELECT (SELECT count(*) FROM public.pag_pagos) pagos,
 (SELECT count(*) FROM public.pag_vouchers) vouchers,
 (SELECT count(*) FROM public.pag_aplicaciones_pago) aplicaciones,
 (SELECT count(*) FROM public.pag_cuotas) cuotas,
 (SELECT count(*) FROM public.pag_imputaciones_operaciones_v1) operaciones_sprint4;
