-- SGI-Monolithe · Bloque 4.3.11
-- Historial de estados y operaciones comerciales por lote.
-- Definiciones verificadas en la base de datos de Supabase (05-11-2026).
-- Ejecutar únicamente en entornos que aún no tengan estas funciones.
-- Consultas SQL encapsuladas en Supabase; Core Service solo invoca RPC.

BEGIN;

CREATE OR REPLACE FUNCTION public.sp_lotes_listar_historial_estados_v1(
    p_actor bigint,
    p_id_lote bigint
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_items jsonb;
BEGIN
    IF p_actor IS NULL OR p_actor <= 0
       OR NOT COALESCE(
           public.fn_usuario_tiene_permiso_seguridad(p_actor, 'lots.view'::varchar),
           FALSE
       ) THEN
        RAISE EXCEPTION 'DENEGADO|No tiene permiso para consultar el historial.';
    END IF;

    IF p_id_lote IS NULL OR p_id_lote <= 0
       OR NOT EXISTS (
           SELECT 1 FROM public.inm_lotes l WHERE l.id_lote = p_id_lote
       ) THEN
        RAISE EXCEPTION 'LOTE_NO_EXISTE|El lote no existe.';
    END IF;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'idHistorial', h.id_historial,
                'idLote', l.id_lote,
                'codigoLote', l.codigo,
                'numeroLote', l.numero,
                'idEstadoAnterior', anterior.id_estado_lote,
                'codigoEstadoAnterior', anterior.codigo,
                'nombreEstadoAnterior', anterior.nombre,
                'idEstadoNuevo', nuevo.id_estado_lote,
                'codigoEstadoNuevo', nuevo.codigo,
                'nombreEstadoNuevo', nuevo.nombre,
                'motivo', h.motivo,
                'fechaCambio', h.fecha_cambio,
                'idUsuario', h.id_usuario,
                'nombreResponsable', NULLIF(
                    BTRIM(CONCAT_WS(' ',
                        persona.nombres,
                        persona.apellido_paterno,
                        persona.apellido_materno
                    )), ''
                )
            )
            ORDER BY h.fecha_cambio DESC, h.id_historial DESC
        ),
        '[]'::jsonb
    )
    INTO v_items
    FROM public.inm_lotes l
    JOIN public.inm_lotes_historial_estado h ON h.id_lote = l.id_lote
    LEFT JOIN public.cfg_estados_lote anterior
        ON anterior.id_estado_lote = h.id_estado_anterior
    JOIN public.cfg_estados_lote nuevo
        ON nuevo.id_estado_lote = h.id_estado_nuevo
    LEFT JOIN public.seg_usuarios u ON u.id_usuario = h.id_usuario
    LEFT JOIN public.core_personas persona ON persona.id_persona = u.id_persona
    WHERE l.id_lote = p_id_lote;

    RETURN v_items;
END;
$function$;

REVOKE ALL ON FUNCTION public.sp_lotes_listar_historial_estados_v1(bigint,bigint)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sp_lotes_listar_historial_estados_v1(bigint,bigint)
TO service_role;

CREATE OR REPLACE FUNCTION public.sp_crm_listar_historial_comercial_lote_v1(
    p_actor bigint,
    p_id_lote bigint
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_resultado jsonb;
BEGIN
    IF p_actor IS NULL OR p_actor <= 0
       OR NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_actor,'lots.view'::varchar),FALSE)
       OR NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.view'::varchar),FALSE)
    THEN
      RAISE EXCEPTION 'ACCESO_DENEGADO|Permisos lots.view y sales.view obligatorios';
    END IF;

    IF p_id_lote IS NULL OR p_id_lote <= 0
       OR NOT EXISTS (SELECT 1 FROM public.inm_lotes WHERE id_lote=p_id_lote)
    THEN
      RAISE EXCEPTION 'LOTE_NO_ENCONTRADO|El lote solicitado no existe';
    END IF;

    WITH autorizacion AS (
      SELECT EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ur
        JOIN public.seg_roles rol ON rol.id_rol=ur.id_rol
        WHERE ur.id_usuario=p_actor
          AND ur.activo AND ur.fecha_revocacion IS NULL AND rol.activo
          AND rol.codigo IN ('ADMINISTRADOR','GERENCIA','FINANZAS')
      ) AS acceso_global
    ), operaciones AS (
      SELECT 'SEPARACION'::text AS tipo,
        r.id_reserva AS id, r.codigo::text AS codigo,
        er.codigo::text AS estado, r.fecha_reserva AS fecha,
        r.monto_reserva AS monto, NULL::text AS referencia,
        NULL::date AS fecha_firma
      FROM public.ven_reservas r
      JOIN public.cfg_estados_reserva er ON er.id_estado_reserva=r.id_estado_reserva
      CROSS JOIN autorizacion a
      WHERE r.id_lote=p_id_lote
        AND (a.acceso_global OR r.id_usuario_registro=p_actor
          OR EXISTS (
            SELECT 1
            FROM public.crm_prospectos p
            JOIN public.crm_prospectos_intereses i
              ON i.id_prospecto=p.id_prospecto AND i.activo
            JOIN public.inm_lotes l
              ON l.id_lote=r.id_lote AND l.id_proyecto=i.id_proyecto
            WHERE p.id_persona=r.id_persona
              AND public.fn_crm_puede_consultar_prospecto(p_actor,p.id_prospecto)
          ))
      UNION ALL
      SELECT 'VENTA'::text, v.id_venta, v.codigo::text,
        ev.codigo::text, v.fecha_venta, v.precio_venta,
        NULL::text, NULL::date
      FROM public.ven_ventas v
      JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=v.id_estado_venta
      CROSS JOIN autorizacion a
      WHERE v.id_lote=p_id_lote
        AND (a.acceso_global OR v.id_usuario_registro=p_actor
          OR EXISTS (
            SELECT 1
            FROM public.com_ventas_asesores va
            JOIN public.com_asesores ca ON ca.id_asesor=va.id_asesor
            JOIN public.seg_usuarios u ON u.id_persona=ca.id_persona
            WHERE va.id_venta=v.id_venta AND u.id_usuario=p_actor
          ))
      UNION ALL
      SELECT 'CONTRATO'::text, ct.id_contrato, ct.codigo::text,
        ec.codigo::text, ct.fecha_creacion, NULL::numeric,
        v.codigo::text, ct.fecha_firma
      FROM public.ven_contratos ct
      JOIN public.ven_ventas v ON v.id_venta=ct.id_venta
      JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=ct.id_estado_contrato
      CROSS JOIN autorizacion a
      WHERE v.id_lote=p_id_lote
        AND (a.acceso_global OR v.id_usuario_registro=p_actor
          OR EXISTS (
            SELECT 1
            FROM public.com_ventas_asesores va
            JOIN public.com_asesores ca ON ca.id_asesor=va.id_asesor
            JOIN public.seg_usuarios u ON u.id_persona=ca.id_persona
            WHERE va.id_venta=v.id_venta AND u.id_usuario=p_actor
          ))
    )
    SELECT COALESCE(
      jsonb_agg(to_jsonb(o) ORDER BY o.fecha DESC,o.tipo DESC,o.id DESC),
      '[]'::jsonb
    )
    INTO v_resultado
    FROM operaciones o;
    RETURN v_resultado;
END;
$function$;

REVOKE ALL ON FUNCTION public.sp_crm_listar_historial_comercial_lote_v1(bigint,bigint)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_listar_historial_comercial_lote_v1(bigint,bigint)
TO service_role;

COMMIT;
