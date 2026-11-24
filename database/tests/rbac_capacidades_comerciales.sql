-- Prueba transaccional sobre datos existentes. No crea roles persistentes ni modifica cuentas.
BEGIN;
DO $test$
DECLARE st varchar; msg varchar; n varchar:='RBAC VALIDACION TRANSACCIONAL'; cod varchar; target bigint; prospect bigint; actor bigint;
BEGIN
 SELECT u.id_usuario INTO actor FROM public.seg_usuarios u
 WHERE public.fn_usuario_tiene_permiso_seguridad(u.id_usuario,'roles.create')
 AND public.fn_usuario_tiene_permiso_seguridad(u.id_usuario,'roles.assign_permissions')
 AND public.fn_usuario_tiene_permiso_seguridad(u.id_usuario,'users.assign_role')
 AND public.fn_usuario_tiene_permiso_seguridad(u.id_usuario,'crm.scope_all')
 ORDER BY u.id_usuario LIMIT 1;
 SELECT u.id_usuario,p.id_prospecto INTO target,prospect
 FROM public.seg_usuarios u CROSS JOIN public.crm_prospectos p
 WHERE u.id_usuario<>actor AND public.fn_usuario_tiene_permiso_seguridad(u.id_usuario,'crm.view')
 AND NOT public.fn_usuario_tiene_permiso_seguridad(u.id_usuario,'crm.scope_all')
 AND public.fn_crm_puede_consultar_prospecto(actor,p.id_prospecto)
 AND NOT public.fn_crm_puede_consultar_prospecto(u.id_usuario,p.id_prospecto)
 AND EXISTS (SELECT 1 FROM public.seg_usuarios_roles ur JOIN public.seg_roles r USING(id_rol) WHERE ur.id_usuario=u.id_usuario AND ur.activo AND ur.fecha_revocacion IS NULL AND r.codigo='ASESOR')
 LIMIT 1;
 IF target IS NULL OR actor IS NULL THEN RAISE EXCEPTION 'No hay datos de prueba apropiados'; END IF;
 CALL public.sp_crear_rol_seguridad(actor,n,st,msg);
 IF st<>'CREADO' THEN RAISE EXCEPTION 'No se pudo crear rol de validación: %',st; END IF;
 SELECT codigo INTO STRICT cod FROM public.seg_roles WHERE nombre=n;
 CALL public.sp_actualizar_permisos_rol_seguridad(actor,cod,ARRAY['crm.view','crm.scope_all']::text[],st,msg);
 IF st<>'OK' THEN RAISE EXCEPTION 'No se pudo asignar capacidad: %',st; END IF;
 CALL public.sp_asignar_rol_usuario(actor,target,cod,st,msg);
 IF NOT public.fn_crm_puede_consultar_prospecto(target,prospect) THEN RAISE EXCEPTION 'Rol nuevo no reconocido: %',st; END IF;
 CALL public.sp_revocar_rol_usuario(actor,target,cod,st,msg);
 IF public.fn_crm_puede_consultar_prospecto(target,prospect) THEN RAISE EXCEPTION 'El alcance no fue revocado: %',st; END IF;
END $test$;
ROLLBACK;
