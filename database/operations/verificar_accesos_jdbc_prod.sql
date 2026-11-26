-- Diagnostico estructural de conexiones JDBC. Solo lectura.
-- Ejecutar en SGI-MONOLITHE-PROD mediante una identidad administrativa autorizada.
-- No cambia roles ni permisos, no consulta datos personales ni credenciales.
WITH requisitos(servicio,rol,tabla) AS (VALUES
 ('auth','sigi_app_user','cfg_estados_usuario'),
 ('auth','sigi_app_user','seg_permisos'),
 ('auth','sigi_app_user','seg_roles'),
 ('auth','sigi_app_user','seg_roles_permisos'),
 ('auth','sigi_app_user','seg_sesiones'),
 ('auth','sigi_app_user','seg_tokens_recuperacion'),
 ('auth','sigi_app_user','seg_usuarios'),
 ('auth','sigi_app_user','seg_usuarios_roles'),
 ('cms','sigi_cms_user','cfg_estados_consulta_web'),
 ('cms','sigi_cms_user','cfg_estados_proyecto'),
 ('cms','sigi_cms_user','cfg_estados_publicacion'),
 ('cms','sigi_cms_user','cfg_tipos_multimedia'),
 ('cms','sigi_cms_user','cfg_tipos_seccion'),
 ('cms','sigi_cms_user','cfg_usos_multimedia'),
 ('core','sigi_app_user','cfg_tipos_contacto'),
 ('core','sigi_app_user','cfg_tipos_documento'),
 ('core','sigi_app_user','inm_etapas'),
 ('core','sigi_app_user','inm_etapas_comerciales'),
 ('core','sigi_app_user','inm_lotes'),
 ('core','sigi_app_user','inm_lotes_historial_estado'),
 ('core','sigi_app_user','inm_lotes_precios'),
 ('core','sigi_app_user','inm_manzanas'),
 ('core','sigi_app_user','inm_proyectos'),
 ('core','sigi_app_user','inm_tarifas_zona_etapa'),
 ('core','sigi_app_user','inm_zonas'),
 ('core','sigi_app_user','rrhh_trabajadores'),
 ('core','sigi_app_user','ven_reservas'),
 ('core','sigi_app_user','ven_ventas'),
 ('core','sigi_app_user','inm_politicas_comerciales_publicadas')
)
SELECT r.servicio,r.rol,r.tabla,
       has_table_privilege(r.rol::name,format('public.%I',r.tabla),'SELECT') AS acl_select,
       EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public'
         AND p.tablename=r.tabla AND p.cmd IN ('SELECT','ALL')
         AND p.permissive='PERMISSIVE'
         AND ('public'=ANY(p.roles) OR r.rol::name=ANY(p.roles))) AS politica_lectura
FROM requisitos r ORDER BY r.servicio,r.tabla;
