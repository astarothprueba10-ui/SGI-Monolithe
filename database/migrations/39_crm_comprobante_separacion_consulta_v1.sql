-- SGI MONOLITHE | Consulta segura del comprobante de una separacion.
-- Permite a quien ya puede ver la operacion comercial obtener la referencia
-- del voucher mas reciente. Nunca expone claves ni URL publicas de Storage.
CREATE OR REPLACE FUNCTION public.sp_crm_obtener_comprobante_separacion_v1(
    p_actor bigint,
    p_id_reserva bigint
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_persona bigint;
    v_usuario_registro bigint;
    v_proyecto bigint;
    v_ruta varchar;
    v_nombre varchar;
    v_mime varchar;
BEGIN
    IF p_actor IS NULL OR p_actor <= 0
       OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(
            p_actor, 'sales.view'::varchar), false) THEN
        RAISE EXCEPTION 'DENEGADO|No autorizado para consultar separaciones.';
    END IF;

    IF p_id_reserva IS NULL OR p_id_reserva <= 0 THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|Identificador de separacion invalido.';
    END IF;

    SELECT r.id_persona, r.id_usuario_registro, l.id_proyecto
      INTO v_persona, v_usuario_registro, v_proyecto
    FROM public.ven_reservas r
    JOIN public.inm_lotes l ON l.id_lote = r.id_lote
    WHERE r.id_reserva = p_id_reserva;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'RESERVA_NO_EXISTE|No existe la separacion solicitada.';
    END IF;

    -- Mantener el mismo alcance que sp_crm_listar_operaciones_v1:
    -- gerencia/administracion/finanzas, usuario registrador o cartera CRM.
    IF NOT (
        EXISTS (
            SELECT 1
            FROM public.seg_usuarios_roles ur
            JOIN public.seg_roles rol ON rol.id_rol = ur.id_rol
            WHERE ur.id_usuario = p_actor
              AND ur.activo
              AND ur.fecha_revocacion IS NULL
              AND rol.activo
              AND rol.codigo IN ('ADMINISTRADOR','GERENCIA','FINANZAS')
        )
        OR v_usuario_registro = p_actor
        OR EXISTS (
            SELECT 1
            FROM public.crm_prospectos p
            JOIN public.crm_prospectos_intereses i
              ON i.id_prospecto = p.id_prospecto
             AND i.id_proyecto = v_proyecto
             AND i.activo
            WHERE p.id_persona = v_persona
              AND public.fn_crm_puede_consultar_prospecto(
                    p_actor, p.id_prospecto
              )
        )
    ) THEN
        RAISE EXCEPTION 'DENEGADO|No autorizado para ver el comprobante de esta separacion.';
    END IF;

    SELECT v.clave_archivo, v.nombre_archivo_original, v.tipo_mime
      INTO v_ruta, v_nombre, v_mime
    FROM public.pag_vouchers v
    JOIN public.pag_pagos pg ON pg.id_pago = v.id_pago
    WHERE pg.id_reserva = p_id_reserva
      AND v.activo
    ORDER BY v.fecha_carga DESC, v.id_voucher DESC
    LIMIT 1;

    IF v_ruta IS NULL THEN
        RAISE EXCEPTION 'ARCHIVO_NO_EXISTE|La separacion no tiene comprobante registrado.';
    END IF;

    IF v_ruta !~ '^separaciones/p-[0-9]+/l-[0-9]+/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.(pdf|jpg|png|webp)$'
        OR v_mime NOT IN ('application/pdf','image/jpeg','image/png','image/webp') THEN
        RAISE EXCEPTION 'ARCHIVO_INVALIDO|La referencia o el formato del comprobante no es valido.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM storage.objects o
        WHERE o.bucket_id = 'vouchers-separacion-private'
          AND o.name = v_ruta
          AND o.archived_at IS NULL
          AND o.is_delete_marker = false
    ) THEN
        RAISE EXCEPTION 'ARCHIVO_NO_EXISTE|El comprobante no esta disponible en Storage.';
    END IF;

    RETURN jsonb_build_object(
        'bucket', 'vouchers-separacion-private',
        'clave_archivo', v_ruta,
        'nombre_archivo', v_nombre,
        'tipo_mime', v_mime
    );
END
$function$;

-- Solo el servicio Java debe consultar la referencia de un bucket privado.
REVOKE ALL ON FUNCTION public.sp_crm_obtener_comprobante_separacion_v1(bigint,bigint)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_obtener_comprobante_separacion_v1(bigint,bigint)
    TO sigi_app_user;
