-- SGI MONOLITHE | Exportación autorizada de ventas: no permite elevar alcance desde frontend.
-- El período se cruza después con el filtro global visible de la pantalla;
-- este SP entrega exclusivamente filas que el actor ya puede consultar.
CREATE OR REPLACE FUNCTION public.sp_crm_exportar_ventas_v1(
    p_actor bigint, p_pagina integer, p_tamano integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
BEGIN
    IF p_actor IS NULL OR p_actor <= 0
        OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(
            p_actor,'sales.view'::varchar),false)
        OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(
            p_actor,'sales.export'::varchar),false)
    THEN
        RAISE EXCEPTION 'DENEGADO|No autorizado para exportar ventas.';
    END IF;
    RETURN public.sp_crm_listar_operaciones_v1(
       p_actor,'VENTA'::text,''::text,p_pagina,p_tamano);
END $fn$;

REVOKE ALL ON FUNCTION public.sp_crm_exportar_ventas_v1(bigint,integer,integer)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_exportar_ventas_v1(bigint,integer,integer)
  TO sigi_app_user;
