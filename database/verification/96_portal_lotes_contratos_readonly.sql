-- SGI MONOLITHE — 5.4.2 · verificar solamente con SELECT
-- El actor 9 corresponde a una cuenta CLIENTE de testeo con compra propia.
-- El actor 6 es un CLIENTE de testeo sin compras vinculadas.
SELECT public.sp_portal_cliente_lotes_contratos_v1(9) expediente_cliente;
SELECT public.sp_portal_cliente_lotes_contratos_v1(6) expediente_sin_compras;

-- Publicación real de documentos: requiere tres condiciones de seguridad.
SELECT c.id_venta,c.id_contrato,
 (SELECT count(*) FROM public.ven_contratos_archivos ca
   WHERE ca.id_contrato=c.id_contrato AND ca.vigente
     AND ca.visible_cliente AND ca.fecha_publicacion_cliente IS NOT NULL)
   documentos_publicados,
 (SELECT count(*) FROM public.ven_contratos_anexos an
   WHERE an.id_contrato=c.id_contrato AND an.vigente
     AND an.visible_cliente AND an.fecha_publicacion_cliente IS NOT NULL)
   anexos_publicados
FROM public.ven_contratos c
WHERE c.id_venta=2;

SELECT proname,
 has_function_privilege('anon',oid,'EXECUTE') anon,
 has_function_privilege('authenticated',oid,'EXECUTE') autenticado,
 has_function_privilege('sigi_app_user',oid,'EXECUTE') backend
FROM pg_proc
WHERE pronamespace='public'::regnamespace
  AND proname='sp_portal_cliente_lotes_contratos_v1';
