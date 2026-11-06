-- SGI MONOLITHE | Bloque Separaciones: alcance comercial y exportacion.
-- Los asesores consultan/exportan exclusivamente las separaciones de su
-- cartera CRM vigente. Gerencia y supervision comercial ven la cartera global.
-- Los permisos deben figurar en JWT al renovar la sesion.
DO $migration$
DECLARE v_def text;
BEGIN
    -- El asesor puede exportar, pero su consulta sigue limitada en base de datos.
    -- El supervisor comercial recibe la misma visibilidad global que Gerencia.
    INSERT INTO public.seg_roles_permisos (id_rol,id_permiso,activo)
    SELECT r.id_rol,p.id_permiso,true
    FROM public.seg_roles r
    CROSS JOIN public.seg_permisos p
    WHERE r.activo AND p.activo
      AND (
        (r.codigo='ASESOR' AND p.codigo='sales.export')
        OR (r.codigo='SUPERVISOR_COMERCIAL'
            AND p.codigo IN ('sales.view','sales.export'))
      )
    ON CONFLICT (id_rol,id_permiso) DO UPDATE SET activo=EXCLUDED.activo;

    SELECT pg_get_functiondef(oid) INTO STRICT v_def
    FROM pg_proc
    WHERE pronamespace='public'::regnamespace
      AND proname='sp_crm_listar_operaciones_v1';

    -- Solo se amplian los roles globales; los usuarios sin cartera
    -- no pueden acceder a separaciones ajenas por haberlas registrado.
    IF strpos(v_def, $old$rol.codigo IN ('ADMINISTRADOR','GERENCIA','FINANZAS')$old$)>0 THEN
        v_def:=replace(
            v_def,
            $old$rol.codigo IN ('ADMINISTRADOR','GERENCIA','FINANZAS')$old$,
            $new$rol.codigo IN ('ADMINISTRADOR','GERENCIA','SUPERVISOR_COMERCIAL','FINANZAS')$new$
        );
    ELSIF strpos(v_def,'SUPERVISOR_COMERCIAL')=0 THEN
        RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Catalogo de roles en operaciones cambio.';
    END IF;

    IF strpos(v_def,'a.acceso_global OR r.id_usuario_registro=a.actor')>0 THEN
        v_def:=replace(
            v_def,
            'a.acceso_global OR r.id_usuario_registro=a.actor',
            'a.acceso_global'
        );
    END IF;
    EXECUTE v_def;
END
$migration$;
