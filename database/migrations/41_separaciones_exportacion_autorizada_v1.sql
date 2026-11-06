-- SGI MONOLITHE | Exportacion de Separaciones con permiso actual de BD.
-- Nunca incluye VENTAS; respeta exactamente el alcance comercial de la lista.
CREATE OR REPLACE FUNCTION public.sp_crm_exportar_separaciones_v1(
    p_actor bigint,
    p_pagina integer,
    p_tamano integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $function$
BEGIN
    IF p_actor IS NULL OR p_actor <= 0
       OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor, 'sales.view'::varchar),false)
       OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor, 'sales.export'::varchar),false)
    THEN
        RAISE EXCEPTION 'DENEGADO|No autorizado para exportar separaciones.';
    END IF;

    RETURN public.sp_crm_listar_operaciones_v1(
        p_actor, 'SEPARACION'::text, ''::text, p_pagina, p_tamano
    );
END
$function$;

REVOKE ALL ON FUNCTION public.sp_crm_exportar_separaciones_v1(bigint,integer,integer)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_exportar_separaciones_v1(bigint,integer,integer)
TO sigi_app_user;
