-- 164: invalidación centralizada de JWT ante cualquier modificación RBAC.
-- Los tres microservicios validan fn_seguridad_token_vigente(id,version).
BEGIN;
CREATE FUNCTION public.fn_rbac_invalidar_sesiones_v1(p_usuarios bigint[],p_motivo text)
RETURNS void LANGUAGE plpgsql SET search_path TO 'pg_catalog','public','pg_temp' AS $fn$
BEGIN
 IF coalesce(cardinality(p_usuarios),0)=0 THEN RETURN; END IF;
 -- Orden estable de bloqueos cuando una edición afecta a varias cuentas.
 PERFORM 1 FROM public.seg_usuarios WHERE id_usuario=ANY(p_usuarios) ORDER BY id_usuario FOR UPDATE;
 UPDATE public.seg_usuarios SET version_sesiones=version_sesiones+1,fecha_actualizacion=now()
 WHERE id_usuario=ANY(p_usuarios);
 UPDATE public.seg_sesiones SET fecha_revocacion=now(),motivo_revocacion=left(p_motivo,255)
 WHERE id_usuario=ANY(p_usuarios) AND fecha_revocacion IS NULL;
END; $fn$;
REVOKE ALL ON FUNCTION public.fn_rbac_invalidar_sesiones_v1(bigint[],text) FROM PUBLIC,anon,authenticated,service_role,sigi_app_user,sgi_backend_user;

CREATE FUNCTION public.fn_rbac_invalidar_asignaciones_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public','pg_temp' AS $fn$
DECLARE ids bigint[];
BEGIN
 IF TG_OP='INSERT' THEN
  SELECT array_agg(DISTINCT id_usuario) INTO ids FROM new_rows WHERE activo AND fecha_revocacion IS NULL;
 ELSIF TG_OP='DELETE' THEN
  SELECT array_agg(DISTINCT id_usuario) INTO ids FROM old_rows WHERE activo AND fecha_revocacion IS NULL;
 ELSE
  SELECT array_agg(DISTINCT x.id_usuario) INTO ids
  FROM (
   SELECT o.id_usuario FROM old_rows o JOIN new_rows n USING(id_usuario_rol)
   WHERE (o.id_usuario,o.id_rol,(o.activo AND o.fecha_revocacion IS NULL)) IS DISTINCT FROM (n.id_usuario,n.id_rol,(n.activo AND n.fecha_revocacion IS NULL))
    AND o.activo AND o.fecha_revocacion IS NULL
   UNION
   SELECT n.id_usuario FROM old_rows o JOIN new_rows n USING(id_usuario_rol)
   WHERE (o.id_usuario,o.id_rol,(o.activo AND o.fecha_revocacion IS NULL)) IS DISTINCT FROM (n.id_usuario,n.id_rol,(n.activo AND n.fecha_revocacion IS NULL))
    AND n.activo AND n.fecha_revocacion IS NULL
  ) x;
 END IF;
 PERFORM public.fn_rbac_invalidar_sesiones_v1(ids,'RBAC_ASIGNACION_MODIFICADA');
 RETURN NULL;
END; $fn$;
REVOKE ALL ON FUNCTION public.fn_rbac_invalidar_asignaciones_v1() FROM PUBLIC,anon,authenticated,service_role,sigi_app_user,sgi_backend_user;
CREATE TRIGGER trg_rbac_asignacion_insert AFTER INSERT ON public.seg_usuarios_roles REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.fn_rbac_invalidar_asignaciones_v1();
CREATE TRIGGER trg_rbac_asignacion_update AFTER UPDATE ON public.seg_usuarios_roles REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.fn_rbac_invalidar_asignaciones_v1();
CREATE TRIGGER trg_rbac_asignacion_delete AFTER DELETE ON public.seg_usuarios_roles REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION public.fn_rbac_invalidar_asignaciones_v1();

CREATE FUNCTION public.fn_rbac_invalidar_permisos_rol_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public','pg_temp' AS $fn$
DECLARE roles integer[]; ids bigint[];
BEGIN
 IF TG_OP='INSERT' THEN
  SELECT array_agg(DISTINCT id_rol) INTO roles FROM new_rows WHERE activo;
 ELSIF TG_OP='DELETE' THEN
  SELECT array_agg(DISTINCT id_rol) INTO roles FROM old_rows WHERE activo;
 ELSE
  SELECT array_agg(DISTINCT x.id_rol) INTO roles FROM (
   SELECT o.id_rol FROM old_rows o JOIN new_rows n USING(id_rol_permiso)
   WHERE (o.id_rol,o.id_permiso,o.activo) IS DISTINCT FROM (n.id_rol,n.id_permiso,n.activo) AND o.activo
   UNION
   SELECT n.id_rol FROM old_rows o JOIN new_rows n USING(id_rol_permiso)
   WHERE (o.id_rol,o.id_permiso,o.activo) IS DISTINCT FROM (n.id_rol,n.id_permiso,n.activo) AND n.activo
  ) x;
 END IF;
 SELECT array_agg(DISTINCT ur.id_usuario) INTO ids FROM public.seg_usuarios_roles ur
 JOIN public.seg_roles r USING(id_rol) WHERE ur.id_rol=ANY(roles) AND ur.activo AND ur.fecha_revocacion IS NULL AND r.activo;
 PERFORM public.fn_rbac_invalidar_sesiones_v1(ids,'RBAC_PERMISOS_MODIFICADOS');
 RETURN NULL;
END; $fn$;
REVOKE ALL ON FUNCTION public.fn_rbac_invalidar_permisos_rol_v1() FROM PUBLIC,anon,authenticated,service_role,sigi_app_user,sgi_backend_user;
CREATE TRIGGER trg_rbac_permiso_rol_insert AFTER INSERT ON public.seg_roles_permisos REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.fn_rbac_invalidar_permisos_rol_v1();
CREATE TRIGGER trg_rbac_permiso_rol_update AFTER UPDATE ON public.seg_roles_permisos REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.fn_rbac_invalidar_permisos_rol_v1();
CREATE TRIGGER trg_rbac_permiso_rol_delete AFTER DELETE ON public.seg_roles_permisos REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION public.fn_rbac_invalidar_permisos_rol_v1();

CREATE FUNCTION public.fn_rbac_invalidar_catalogo_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public','pg_temp' AS $fn$
DECLARE ids bigint[];
BEGIN
 IF TG_TABLE_NAME='seg_roles' THEN
  SELECT array_agg(DISTINCT ur.id_usuario) INTO ids FROM public.seg_usuarios_roles ur
  WHERE ur.id_rol=NEW.id_rol AND ur.activo AND ur.fecha_revocacion IS NULL;
 ELSE
  SELECT array_agg(DISTINCT ur.id_usuario) INTO ids
  FROM public.seg_usuarios_roles ur JOIN public.seg_roles r USING(id_rol)
  JOIN public.seg_roles_permisos rp USING(id_rol)
  WHERE rp.id_permiso=NEW.id_permiso AND rp.activo AND ur.activo AND ur.fecha_revocacion IS NULL AND r.activo;
 END IF;
 PERFORM public.fn_rbac_invalidar_sesiones_v1(ids,'RBAC_CATALOGO_MODIFICADO');
 RETURN NEW;
END; $fn$;
REVOKE ALL ON FUNCTION public.fn_rbac_invalidar_catalogo_v1() FROM PUBLIC,anon,authenticated,service_role,sigi_app_user,sgi_backend_user;
CREATE TRIGGER trg_rbac_catalogo_rol AFTER UPDATE OF activo,codigo,es_interno ON public.seg_roles
 FOR EACH ROW WHEN (OLD.activo IS DISTINCT FROM NEW.activo OR OLD.codigo IS DISTINCT FROM NEW.codigo OR OLD.es_interno IS DISTINCT FROM NEW.es_interno)
 EXECUTE FUNCTION public.fn_rbac_invalidar_catalogo_v1();
CREATE TRIGGER trg_rbac_catalogo_permiso AFTER UPDATE OF activo,codigo ON public.seg_permisos
 FOR EACH ROW WHEN (OLD.activo IS DISTINCT FROM NEW.activo OR OLD.codigo IS DISTINCT FROM NEW.codigo)
 EXECUTE FUNCTION public.fn_rbac_invalidar_catalogo_v1();

-- Las capacidades de 163 deben aparecer en nuevos tokens. No se modifica contraseña ni MFA.
SELECT public.fn_rbac_invalidar_sesiones_v1(
 ARRAY(SELECT DISTINCT ur.id_usuario FROM public.seg_usuarios_roles ur JOIN public.seg_roles r USING(id_rol)
 JOIN public.seg_roles_permisos rp USING(id_rol) JOIN public.seg_permisos p USING(id_permiso)
 WHERE ur.activo AND ur.fecha_revocacion IS NULL AND r.activo AND rp.activo AND p.activo
 AND p.codigo IN ('crm.scope_all','crm.scope_assigned','crm.assign_advisor','crm.approve_stage_change','crm.request_stage_change','crm.deactivate_prospect','sales.scope_all','sales.contract_scope_all','sales.approve_reservation_change','sales.notify_expiry_all','sales.reassign_advisor','annulments.scope_all')),
 'RBAC_NUEVAS_CAPACIDADES');
COMMIT;
