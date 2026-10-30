-- Consulta de solo lectura. Las nueve filas deben mostrar OK.
SELECT esperado.firma,
 CASE WHEN to_regprocedure(esperado.firma) IS NOT NULL
   AND md5(btrim(replace(pg_get_functiondef(to_regprocedure(esperado.firma)), chr(13), ''), E' \n\t')) = esperado.huella
 THEN 'OK' ELSE 'REVISAR' END AS estado,
 CASE WHEN to_regprocedure(esperado.firma) IS NULL THEN 'Procedimiento ausente'
   WHEN md5(btrim(replace(pg_get_functiondef(to_regprocedure(esperado.firma)), chr(13), ''), E' \n\t')) <> esperado.huella
   THEN 'La definición del procedimiento no coincide' ELSE 'Definición correcta' END AS detalle
FROM (VALUES
 ('public.sp_rrhh_actualizar_trabajador(bigint,bigint,jsonb)', 'b4ffd4e9cbfaff985dec19d9af8fd749'),
 ('public.sp_rrhh_cesar_trabajador(bigint,bigint,date,text)', 'e797a566ebdd8646b4f09121a7dc62fe'),
 ('public.sp_rrhh_programar_suspension(bigint,bigint,timestamp with time zone,timestamp with time zone,text)', '2b57255e3c38649cec0d297818cf3df2'),
 ('public.sp_rrhh_resolver_reincorporacion(bigint,bigint,character varying,text)', 'a98fe7142b646e7f4184cb28ce6ec5a1'),
 ('public.sp_rrhh_solicitar_cambio_correo(bigint,bigint,text,text)', '7c3c42b5797ee95d24d16a22cce49903'),
 ('public.sp_rrhh_solicitar_correccion_documento(bigint,bigint,integer,text,text)', 'b658280197d2d158f59714bb2f757ba0'),
 ('public.sp_rrhh_solicitar_reincorporacion(bigint,bigint,date,text)', '32693d79d026e84388dbecc0555f4be2')) AS esperado(firma, huella)
UNION ALL
SELECT esperado.firma,
 CASE WHEN p.oid IS NOT NULL AND p.prosecdef = FALSE AND p.provolatile = 's'
   AND btrim(replace(p.prosrc, chr(13), ''), E' \n\t') = btrim(replace(esperado.cuerpo, chr(13), ''), E' \n\t')
 THEN 'OK' ELSE 'REVISAR' END AS estado,
 CASE WHEN p.oid IS NULL THEN 'Función auxiliar ausente'
   WHEN p.prosecdef THEN 'Debe usar SECURITY INVOKER'
   WHEN p.provolatile <> 's' THEN 'Debe estar declarada STABLE'
   WHEN btrim(replace(p.prosrc, chr(13), ''), E' \n\t') IS DISTINCT FROM btrim(replace(esperado.cuerpo, chr(13), ''), E' \n\t')
   THEN 'El cuerpo de la función auxiliar no coincide' ELSE 'Definición correcta' END AS detalle
FROM (VALUES
 ('public.fn_rrhh_actor_gestion_integral(bigint)', $rrhh_verify_body$SELECT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_id_actor, 'hr.edit'::varchar), FALSE)
   AND EXISTS (
     SELECT 1 FROM public.seg_usuarios_roles ur
     JOIN public.seg_roles r ON r.id_rol = ur.id_rol
     WHERE ur.id_usuario = p_id_actor AND ur.activo = TRUE
       AND r.activo = TRUE AND r.codigo = 'RRHH'
   );$rrhh_verify_body$),
 ('public.fn_rrhh_puede_cambiar_estado(bigint,bigint)', $rrhh_verify_body$SELECT p_id_persona IS NOT NULL
   AND public.fn_rrhh_actor_gestion_integral(p_id_actor)
   AND NOT EXISTS (
     SELECT 1 FROM public.seg_usuarios u
     WHERE u.id_usuario = p_id_actor AND u.id_persona = p_id_persona
   );$rrhh_verify_body$)) AS esperado(firma, cuerpo)
LEFT JOIN pg_proc p ON p.oid = to_regprocedure(esperado.firma)
ORDER BY firma;
