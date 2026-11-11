-- SGI-MONOLITHE · Sprint 4 / 5.3.1
-- Verificación SOLO LECTURA en Supabase de TESTEO.
-- Actor 5 = rol Finanzas autorizado de la base de testeo.

-- 1) Bandeja segura de vouchers de cuotas.
SELECT public.sp_finanzas_listar_vouchers_cuotas_v1(
  5,'TODOS',NULL,1,20) AS bandeja_cuotas;

-- 2) Conteos de vouchers por contexto (no confundir reserva/cuotas).
SELECT CASE
  WHEN p.id_reserva IS NOT NULL THEN 'SEPARACION'
  WHEN p.id_plan_pago IS NOT NULL AND p.id_venta IS NOT NULL THEN 'CUOTA'
  ELSE 'OTRO'
END AS contexto,ev.codigo estado_voucher,count(*) cantidad
FROM public.pag_vouchers v
JOIN public.pag_pagos p USING(id_pago)
JOIN public.cfg_estados_voucher ev USING(id_estado_voucher)
GROUP BY 1,2 ORDER BY 1,2;

-- 3) Detectar referencias históricas que no existen en su bucket.
SELECT v.id_voucher,v.codigo codigo_voucher,p.codigo codigo_pago,
  v.clave_archivo,
  EXISTS(SELECT 1 FROM storage.objects o
    WHERE o.bucket_id='vouchers-ventas-private'
      AND o.name=v.clave_archivo
      AND o.archived_at IS NULL AND o.is_delete_marker=false) archivo_presente
FROM public.pag_vouchers v
JOIN public.pag_pagos p USING(id_pago)
WHERE p.id_reserva IS NULL AND p.id_plan_pago IS NOT NULL
ORDER BY v.id_voucher;

-- 4) Permisos: versiones seguras ejecutables solo desde backend.
SELECT p.proname,
 has_function_privilege('anon',p.oid,'EXECUTE') anon,
 has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated,
 has_function_privilege('sigi_app_user',p.oid,'EXECUTE') backend
FROM pg_proc p WHERE p.pronamespace='public'::regnamespace
 AND p.proname IN(
  'sp_registrar_pago_voucher','sp_validar_voucher','sp_listar_vouchers_tesoreria',
  'sp_finanzas_listar_vouchers_cuotas_v1','sp_finanzas_obtener_ruta_voucher_cuota_v1'
 ) ORDER BY p.proname;

-- 5) Asegurar que no se alteraron pagos/aplicaciones/cuotas.
SELECT
 (SELECT count(*) FROM public.pag_pagos) pagos,
 (SELECT count(*) FROM public.pag_vouchers) vouchers,
 (SELECT count(*) FROM public.pag_aplicaciones_pago) aplicaciones,
 (SELECT count(*) FROM public.pag_cuotas) cuotas;
