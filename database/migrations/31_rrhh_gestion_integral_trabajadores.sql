-- Gestión de expedientes laborales de cualquier rol por RRHH autorizado.
-- Fuente: definiciones de las dos exportaciones del usuario del 29/10/2026.
-- Valida las versiones antes de modificar; una diferencia revierte la transacción.
BEGIN;
CREATE TEMP TABLE rrhh_cambios_migracion (
 firma text PRIMARY KEY, anterior text NOT NULL, nuevo text NOT NULL, cambios jsonb NOT NULL
) ON COMMIT DROP;
INSERT INTO rrhh_cambios_migracion (firma, anterior, nuevo, cambios) VALUES
('public.sp_rrhh_actualizar_trabajador(bigint,bigint,jsonb)', 'bac7a02191bfb80bcbf1d771ecd3fe71', 'b4ffd4e9cbfaff985dec19d9af8fd749', $rrhh_text$[{"antes": "    -- Protección de Gerencia: RRHH no puede editar al Gerente General.\n    -- El titular solo puede modificar información personal autorizada.\n    IF (", "despues": "    -- RRHH autorizado puede gestionar expedientes de cualquier cargo o rol.\n    -- Para los demás actores se conserva la protección de Gerencia.\n    IF NOT public.fn_rrhh_actor_gestion_integral(p_id_actor) AND ("}, {"antes": "        IF NOT COALESCE(\n            public.fn_seguridad_puede_bloquear_persona(", "despues": "        IF NOT public.fn_rrhh_puede_cambiar_estado(p_id_actor, v_trabajador.id_persona)\n           AND NOT COALESCE(\n            public.fn_seguridad_puede_bloquear_persona("}]$rrhh_text$::jsonb),
('public.sp_rrhh_cesar_trabajador(bigint,bigint,date,text)', 'c5e4e0ae85e3601683e1303e6ebdbf69', 'e797a566ebdd8646b4f09121a7dc62fe', $rrhh_text$[{"antes": " IF EXISTS (SELECT 1 FROM public.rrhh_cargos c\n            WHERE c.id_cargo=v_t.id_cargo AND c.codigo='GERENTE_GENERAL')\n   OR EXISTS (SELECT 1 FROM public.seg_usuarios u\n     JOIN public.seg_usuarios_roles ur ON ur.id_usuario=u.id_usuario AND ur.activo\n     JOIN public.seg_roles r ON r.id_rol=ur.id_rol AND r.activo\n     WHERE u.id_persona=v_t.id_persona AND r.codigo='GERENCIA')\n   OR NOT COALESCE(public.fn_seguridad_puede_bloquear_persona(\n     p_id_actor,v_t.id_persona),FALSE)\n THEN\n", "despues": " IF NOT public.fn_rrhh_puede_cambiar_estado(p_id_actor, v_t.id_persona) AND (\n   EXISTS (SELECT 1 FROM public.rrhh_cargos c\n            WHERE c.id_cargo=v_t.id_cargo AND c.codigo='GERENTE_GENERAL')\n   OR EXISTS (SELECT 1 FROM public.seg_usuarios u\n     JOIN public.seg_usuarios_roles ur ON ur.id_usuario=u.id_usuario AND ur.activo\n     JOIN public.seg_roles r ON r.id_rol=ur.id_rol AND r.activo\n     WHERE u.id_persona=v_t.id_persona AND r.codigo='GERENCIA')\n   OR NOT COALESCE(public.fn_seguridad_puede_bloquear_persona(\n     p_id_actor,v_t.id_persona),FALSE)\n )\n THEN\n"}]$rrhh_text$::jsonb),
('public.sp_rrhh_programar_suspension(bigint,bigint,timestamp with time zone,timestamp with time zone,text)', '04b2d0bc72be7c0382cea58c48b4abae', '2b57255e3c38649cec0d297818cf3df2', $rrhh_text$[{"antes": "    IF EXISTS (\n        SELECT 1 FROM public.rrhh_cargos c\n        WHERE c.id_cargo=v_t.id_cargo AND c.codigo='GERENTE_GENERAL'\n    ) OR EXISTS (\n        SELECT 1 FROM public.seg_usuarios u\n        JOIN public.seg_usuarios_roles ur ON ur.id_usuario=u.id_usuario AND ur.activo\n        JOIN public.seg_roles r ON r.id_rol=ur.id_rol AND r.activo\n        WHERE u.id_persona=v_t.id_persona AND r.codigo='GERENCIA'\n    ) OR NOT COALESCE(public.fn_seguridad_puede_bloquear_persona(\n        p_id_actor,v_t.id_persona),FALSE)\n    THEN\n", "despues": "    IF NOT public.fn_rrhh_puede_cambiar_estado(p_id_actor, v_t.id_persona) AND (\n      EXISTS (\n        SELECT 1 FROM public.rrhh_cargos c\n        WHERE c.id_cargo=v_t.id_cargo AND c.codigo='GERENTE_GENERAL'\n    ) OR EXISTS (\n        SELECT 1 FROM public.seg_usuarios u\n        JOIN public.seg_usuarios_roles ur ON ur.id_usuario=u.id_usuario AND ur.activo\n        JOIN public.seg_roles r ON r.id_rol=ur.id_rol AND r.activo\n        WHERE u.id_persona=v_t.id_persona AND r.codigo='GERENCIA'\n    ) OR NOT COALESCE(public.fn_seguridad_puede_bloquear_persona(\n        p_id_actor,v_t.id_persona),FALSE)\n    )\n    THEN\n"}]$rrhh_text$::jsonb),
('public.sp_rrhh_resolver_reincorporacion(bigint,bigint,character varying,text)', 'a20a5c5d3b22d44b985eb739cb8e2bb1', 'a98fe7142b646e7f4184cb28ce6ec5a1', $rrhh_text$[{"antes": " IF EXISTS(SELECT 1 FROM public.rrhh_cargos c\n     WHERE c.id_cargo=v_t.id_cargo AND c.codigo='GERENTE_GENERAL')\n   OR EXISTS(SELECT 1 FROM public.seg_usuarios u\n     JOIN public.seg_usuarios_roles ur ON ur.id_usuario=u.id_usuario AND ur.activo\n     JOIN public.seg_roles r ON r.id_rol=ur.id_rol AND r.activo\n     WHERE u.id_persona=v_t.id_persona AND r.codigo='GERENCIA')\n THEN\n   p_estado:='USUARIO_PROTEGIDO';p_mensaje:='Gerencia no puede reincorporarse por este flujo.';RETURN;\n END IF;", "despues": " -- La autorización administrativa y las prohibiciones de autoaprobación\n -- ya fueron validadas; también se admiten expedientes de Gerencia."}]$rrhh_text$::jsonb),
('public.sp_rrhh_solicitar_cambio_correo(bigint,bigint,text,text)', '2851b54d77a958e40dc1f4a1a01ad78d', '7c3c42b5797ee95d24d16a22cce49903', $rrhh_text$[{"antes": "    -- 3. Proteccion para cuenta del Gerente General\n    IF (", "despues": "    -- 3. RRHH autorizado puede solicitar cambios para cualquier expediente.\n    IF NOT public.fn_rrhh_actor_gestion_integral(p_id_actor) AND ("}]$rrhh_text$::jsonb),
('public.sp_rrhh_solicitar_correccion_documento(bigint,bigint,integer,text,text)', 'a0a6347cdb90234b134f296e85bf4f6e', 'b658280197d2d158f59714bb2f757ba0', $rrhh_text$[{"antes": " IF (\n        EXISTS (", "despues": " IF NOT public.fn_rrhh_actor_gestion_integral(p_id_actor) AND (\n        EXISTS ("}, {"antes": "      IF NOT public.fn_seguridad_puede_bloquear_persona(p_id_actor,v_t.id_persona)", "despues": "      IF NOT public.fn_rrhh_puede_cambiar_estado(p_id_actor, v_t.id_persona)\n         AND NOT public.fn_seguridad_puede_bloquear_persona(p_id_actor,v_t.id_persona)"}]$rrhh_text$::jsonb),
('public.sp_rrhh_solicitar_reincorporacion(bigint,bigint,date,text)', '77995cb2e0d8191d786a409e29083f59', '32693d79d026e84388dbecc0555f4be2', $rrhh_text$[{"antes": " IF EXISTS(SELECT 1 FROM public.rrhh_cargos c\n    WHERE c.id_cargo=v_t.id_cargo AND c.codigo='GERENTE_GENERAL')\n   OR EXISTS(SELECT 1 FROM public.seg_usuarios u\n    JOIN public.seg_usuarios_roles ur ON ur.id_usuario=u.id_usuario AND ur.activo\n    JOIN public.seg_roles r ON r.id_rol=ur.id_rol AND r.activo\n    WHERE u.id_persona=v_t.id_persona AND r.codigo='GERENCIA')\n   OR NOT COALESCE(public.fn_seguridad_puede_bloquear_persona(p_id_actor,v_t.id_persona),FALSE)\n THEN\n", "despues": " IF NOT public.fn_rrhh_puede_cambiar_estado(p_id_actor, v_t.id_persona) AND (\n   EXISTS(SELECT 1 FROM public.rrhh_cargos c\n    WHERE c.id_cargo=v_t.id_cargo AND c.codigo='GERENTE_GENERAL')\n   OR EXISTS(SELECT 1 FROM public.seg_usuarios u\n    JOIN public.seg_usuarios_roles ur ON ur.id_usuario=u.id_usuario AND ur.activo\n    JOIN public.seg_roles r ON r.id_rol=ur.id_rol AND r.activo\n    WHERE u.id_persona=v_t.id_persona AND r.codigo='GERENCIA')\n   OR NOT COALESCE(public.fn_seguridad_puede_bloquear_persona(p_id_actor,v_t.id_persona),FALSE)\n )\n THEN\n"}]$rrhh_text$::jsonb);

DO $rrhh_preflight$
DECLARE r record; actual text;
BEGIN
 FOR r IN SELECT firma, anterior, nuevo FROM rrhh_cambios_migracion ORDER BY firma LOOP
   IF to_regprocedure(r.firma) IS NULL THEN
     RAISE EXCEPTION 'Falta el procedimiento requerido: %', r.firma;
   END IF;
   actual := md5(btrim(replace(pg_get_functiondef(to_regprocedure(r.firma)), chr(13), ''), E' \n\t'));
   IF actual NOT IN (r.anterior, r.nuevo) THEN
     RAISE EXCEPTION 'La definición cambió desde el CSV: %. Exporte su definición actual y no fuerce la migración.', r.firma;
   END IF;
 END LOOP;
END
$rrhh_preflight$;

DO $rrhh_helpers_preflight$
DECLARE r record; actual text;
BEGIN
 IF to_regprocedure('public.fn_rrhh_actor_gestion_integral(bigint)') IS NOT NULL THEN
   SELECT btrim(replace(prosrc, chr(13), ''), E' \n\t') INTO actual FROM pg_proc WHERE oid = to_regprocedure('public.fn_rrhh_actor_gestion_integral(bigint)');
   IF actual IS DISTINCT FROM btrim(replace($rrhh_helper_body$SELECT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_id_actor, 'hr.edit'::varchar), FALSE)
   AND EXISTS (
     SELECT 1 FROM public.seg_usuarios_roles ur
     JOIN public.seg_roles r ON r.id_rol = ur.id_rol
     WHERE ur.id_usuario = p_id_actor AND ur.activo = TRUE
       AND r.activo = TRUE AND r.codigo = 'RRHH'
   );$rrhh_helper_body$, chr(13), ''), E' \n\t') THEN
     RAISE EXCEPTION 'Existe una función distinta: public.fn_rrhh_actor_gestion_integral(bigint)';
   END IF;
 END IF;
 IF to_regprocedure('public.fn_rrhh_puede_cambiar_estado(bigint,bigint)') IS NOT NULL THEN
   SELECT btrim(replace(prosrc, chr(13), ''), E' \n\t') INTO actual FROM pg_proc WHERE oid = to_regprocedure('public.fn_rrhh_puede_cambiar_estado(bigint,bigint)');
   IF actual IS DISTINCT FROM btrim(replace($rrhh_helper_body$SELECT p_id_persona IS NOT NULL
   AND public.fn_rrhh_actor_gestion_integral(p_id_actor)
   AND NOT EXISTS (
     SELECT 1 FROM public.seg_usuarios u
     WHERE u.id_usuario = p_id_actor AND u.id_persona = p_id_persona
   );$rrhh_helper_body$, chr(13), ''), E' \n\t') THEN
     RAISE EXCEPTION 'Existe una función distinta: public.fn_rrhh_puede_cambiar_estado(bigint,bigint)';
   END IF;
 END IF;
END
$rrhh_helpers_preflight$;
CREATE OR REPLACE FUNCTION public.fn_rrhh_actor_gestion_integral(p_id_actor bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER
SET search_path TO pg_catalog, public, pg_temp
AS $rrhh_fn$
 SELECT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_id_actor, 'hr.edit'::varchar), FALSE)
   AND EXISTS (
     SELECT 1 FROM public.seg_usuarios_roles ur
     JOIN public.seg_roles r ON r.id_rol = ur.id_rol
     WHERE ur.id_usuario = p_id_actor AND ur.activo = TRUE
       AND r.activo = TRUE AND r.codigo = 'RRHH'
   );
$rrhh_fn$;

CREATE OR REPLACE FUNCTION public.fn_rrhh_puede_cambiar_estado(p_id_actor bigint, p_id_persona bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER
SET search_path TO pg_catalog, public, pg_temp
AS $rrhh_fn$
 SELECT p_id_persona IS NOT NULL
   AND public.fn_rrhh_actor_gestion_integral(p_id_actor)
   AND NOT EXISTS (
     SELECT 1 FROM public.seg_usuarios u
     WHERE u.id_usuario = p_id_actor AND u.id_persona = p_id_persona
   );
$rrhh_fn$;

DO $rrhh_apply$
DECLARE r record; cambio jsonb; definicion text;
BEGIN
 FOR r IN SELECT firma, anterior, nuevo, cambios FROM rrhh_cambios_migracion ORDER BY firma LOOP
   definicion := btrim(replace(pg_get_functiondef(to_regprocedure(r.firma)), chr(13), ''), E' \n\t');
   IF md5(definicion) = r.nuevo THEN CONTINUE; END IF;
   FOR cambio IN SELECT value FROM jsonb_array_elements(r.cambios) LOOP
     IF strpos(definicion, cambio->>'antes') = 0 THEN RAISE EXCEPTION 'No coincide el bloque: %', r.firma; END IF;
     definicion := replace(definicion, cambio->>'antes', cambio->>'despues');
   END LOOP;
   IF md5(definicion) <> r.nuevo THEN RAISE EXCEPTION 'Resultado inesperado: %', r.firma; END IF;
   EXECUTE definicion;
 END LOOP;
END
$rrhh_apply$;

REVOKE ALL ON FUNCTION public.fn_rrhh_actor_gestion_integral(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_rrhh_puede_cambiar_estado(bigint,bigint) FROM PUBLIC;
DO $rrhh_acl$
DECLARE propietario text;
BEGIN
 FOR propietario IN
   SELECT DISTINCT pg_get_userbyid(p.proowner)
   FROM rrhh_cambios_migracion r JOIN pg_proc p ON p.oid = to_regprocedure(r.firma)
 LOOP
   EXECUTE format('GRANT EXECUTE ON FUNCTION public.fn_rrhh_actor_gestion_integral(bigint) TO %I', propietario);
   EXECUTE format('GRANT EXECUTE ON FUNCTION public.fn_rrhh_puede_cambiar_estado(bigint,bigint) TO %I', propietario);
 END LOOP;
END
$rrhh_acl$;
SELECT 'OK: permisos laborales de RRHH actualizados' AS resultado, COUNT(*) AS procedimientos FROM rrhh_cambios_migracion;
COMMIT;
