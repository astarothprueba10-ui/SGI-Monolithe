-- Condicion de rol interno para acceso al backoffice.
-- La funcion ya fue aplicada en Supabase durante la implementacion.
BEGIN;
CREATE OR REPLACE FUNCTION public.fn_usuario_tiene_rol_interno_activo(p_id_usuario bigint)
RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ur
        JOIN public.seg_roles r ON r.id_rol = ur.id_rol
        WHERE ur.id_usuario = p_id_usuario
          AND ur.activo = TRUE
          AND r.activo = TRUE
          AND r.es_interno = TRUE
    );
$function$;
COMMIT;
