-- SGI MONOLITHE | Sprint 4 / 5.3.3
-- Consultas exclusivas de SOLO LECTURA sobre la base de TESTEO.
-- Nunca ejecuta un pago ni una decisión financiera.

-- 1. Resumen de comprobantes de cuotas sin rutas privadas.
SELECT public.sp_finanzas_listar_vouchers_cuotas_v1(
  5,'TODOS',NULL,1,20) AS bandeja_finanzas;

-- 2. Estados y número de decisiones de revisión 5.3.3.
SELECT d.decision,count(*) total,
  coalesce(sum(d.monto_pago),0) monto_revisado
FROM public.pag_vouchers_cuota_revisiones d
GROUP BY d.decision ORDER BY d.decision;

-- 3. Conciliación de nuevas cargas aprobadas (incluye pendientes sin aplicar).
SELECT c.id_carga,c.id_cuota,c.id_pago,c.id_voucher,
  ep.codigo estado_pago,ev.codigo estado_voucher,
  p.monto monto_pago,
  coalesce((SELECT sum(a.monto_aplicado)
    FROM public.pag_aplicaciones_pago a WHERE a.id_pago=p.id_pago
      AND a.activo),0) monto_aplicado,
  d.id_revisor,d.decision,d.fecha_revision
FROM public.pag_cargas_voucher_cuota c
LEFT JOIN public.pag_pagos p ON p.id_pago=c.id_pago
LEFT JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago
LEFT JOIN public.pag_vouchers v ON v.id_voucher=c.id_voucher
LEFT JOIN public.cfg_estados_voucher ev ON ev.id_estado_voucher=v.id_estado_voucher
LEFT JOIN public.pag_vouchers_cuota_revisiones d ON d.id_voucher=c.id_voucher
WHERE c.id_pago IS NOT NULL
ORDER BY c.fecha_creacion DESC LIMIT 30;

-- 4. Seguridad: sólo Core Service ejecuta la revisión.
SELECT proname,
 has_function_privilege('anon',oid,'EXECUTE') anon,
 has_function_privilege('authenticated',oid,'EXECUTE') authenticated,
 has_function_privilege('sigi_app_user',oid,'EXECUTE') core
FROM pg_proc
WHERE pronamespace='public'::regnamespace
AND proname='sp_finanzas_revisar_voucher_cuota_v1';

-- 5. Integridad de saldos y volúmenes históricos.
SELECT (SELECT count(*) FROM public.pag_pagos) pagos,
 (SELECT count(*) FROM public.pag_vouchers) vouchers,
 (SELECT count(*) FROM public.pag_vouchers_cuota_revisiones) revisiones,
 (SELECT count(*) FROM public.pag_aplicaciones_pago) aplicaciones,
 (SELECT count(*) FROM public.pag_cuotas) cuotas,
 (SELECT count(*) FROM public.pag_cargas_voucher_cuota) cargas;
