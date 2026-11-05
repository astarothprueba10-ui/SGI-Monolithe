-- SGI-Monolithe / Bloque 5: seguridad comercial y centralizacion del listado.
-- Idempotente. No modifica datos comerciales.
BEGIN;
REVOKE ALL PRIVILEGES ON TABLE
  public.ven_reservas, public.ven_ventas,
  public.ven_contratos, public.ven_ventas_clientes
FROM PUBLIC, anon, authenticated;

-- RLS no gobierna TRUNCATE, REFERENCES ni TRIGGER. Se preserva
-- SELECT/INSERT/UPDATE/DELETE con RLS en las demás tablas.
DO $seguridad$
DECLARE r record;
BEGIN
  FOR r IN SELECT c.relname FROM pg_class c
    WHERE c.relnamespace='public'::regnamespace AND c.relkind IN ('r','p')
      AND (c.relname LIKE 'ven_%' OR c.relname LIKE 'pag_%'
           OR c.relname LIKE 'crm_%' OR c.relname='inm_lotes')
  LOOP
    EXECUTE format('REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.%I FROM PUBLIC, anon, authenticated', r.relname);
  END LOOP;
END;
$seguridad$;

CREATE OR REPLACE FUNCTION public.sp_crm_listar_operaciones_v1(
  p_actor bigint, p_tipo text, p_busqueda text, p_pagina integer, p_tamano integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
SET search_path TO pg_catalog, public, pg_temp
AS $crm_operaciones$
DECLARE v_resultado jsonb;
BEGIN
  IF p_actor IS NULL OR p_actor <= 0
     OR NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.view'::varchar), FALSE)
  THEN RAISE EXCEPTION 'DENEGADO|No autorizado para consultar operaciones comerciales.'; END IF;
  p_tipo := UPPER(BTRIM(COALESCE(p_tipo,'')));
  p_busqueda := LOWER(BTRIM(COALESCE(p_busqueda,'')));
  IF p_tipo NOT IN ('','VENTA','SEPARACION') THEN
    RAISE EXCEPTION 'DATOS_INVALIDOS|Tipo de operacion invalido.'; END IF;
  IF CHAR_LENGTH(p_busqueda)>120 OR p_pagina IS NULL OR p_pagina<1 OR p_pagina>100000
     OR p_tamano IS NULL OR p_tamano<1 OR p_tamano>100 THEN
    RAISE EXCEPTION 'DATOS_INVALIDOS|Filtros de operaciones invalidos.'; END IF;
  WITH contexto AS (
                    SELECT p_actor AS actor,
                           p_tipo AS tipo,
                           p_busqueda AS busqueda
                ), autorizacion AS (
                    SELECT c.*,
                           EXISTS (
                               SELECT 1 FROM public.seg_usuarios_roles ur
                               JOIN public.seg_roles rol ON rol.id_rol=ur.id_rol
                               WHERE ur.id_usuario=c.actor AND ur.activo
                                 AND ur.fecha_revocacion IS NULL AND rol.activo
                                 AND rol.codigo IN ('ADMINISTRADOR','GERENCIA','FINANZAS')
                           ) AS acceso_global
                    FROM contexto c
                ), operaciones AS (
                    SELECT v.id_venta AS id, 'VENTA'::text AS tipo,
                           v.codigo::text AS codigo, l.id_lote AS id_lote,
                           l.codigo::text AS lote, proyecto.nombre::text AS proyecto,
                           concat_ws(' ',per.nombres,per.apellido_paterno,
                                     per.apellido_materno)::text AS comprador,
                           doc.numero_documento::text AS documento,
                           modalidad.codigo::text AS modalidad,
                           v.precio_venta AS monto,
                           estado.codigo::text AS estado,
                           v.fecha_venta AS fecha,
                           NULL::timestamptz AS fecha_vencimiento,
                           contrato.codigo::text AS contrato,
                           estado_contrato.codigo::text AS estado_contrato,
                           NULLIF(concat_ws(' ',ad.nombres,ad.apellido_paterno,
                                          ad.apellido_materno),'')::text AS asesor
                    FROM public.ven_ventas v
                    JOIN public.inm_lotes l ON l.id_lote=v.id_lote
                    JOIN public.inm_proyectos proyecto ON proyecto.id_proyecto=l.id_proyecto
                    JOIN public.cfg_modalidades_venta modalidad
                      ON modalidad.id_modalidad_venta=v.id_modalidad_venta
                    JOIN public.cfg_estados_venta estado
                      ON estado.id_estado_venta=v.id_estado_venta
                    LEFT JOIN public.ven_ventas_clientes vc
                      ON vc.id_venta=v.id_venta AND vc.titular
                    LEFT JOIN public.crm_clientes cl ON cl.id_cliente=vc.id_cliente
                    LEFT JOIN public.core_personas per ON per.id_persona=cl.id_persona
                    LEFT JOIN LATERAL (
                        SELECT d.numero_documento
                        FROM public.core_personas_documentos d
                        WHERE d.id_persona=per.id_persona AND d.principal AND d.activo
                        ORDER BY d.id_persona_documento DESC LIMIT 1
                    ) doc ON true
                    LEFT JOIN LATERAL (
                        SELECT c.codigo,c.id_estado_contrato
                        FROM public.ven_contratos c WHERE c.id_venta=v.id_venta
                        ORDER BY c.id_contrato DESC LIMIT 1
                    ) contrato ON true
                    LEFT JOIN public.cfg_estados_contrato estado_contrato
                      ON estado_contrato.id_estado_contrato=contrato.id_estado_contrato
                    LEFT JOIN LATERAL (
                        SELECT va.id_asesor
                        FROM public.com_ventas_asesores va
                        WHERE va.id_venta=v.id_venta
                        ORDER BY va.es_principal DESC,va.id_venta_asesor LIMIT 1
                    ) va ON true
                    LEFT JOIN public.com_asesores asesor ON asesor.id_asesor=va.id_asesor
                    LEFT JOIN public.core_personas ad ON ad.id_persona=asesor.id_persona
                    CROSS JOIN autorizacion a
                    WHERE public.fn_usuario_tiene_permiso_seguridad(
                        a.actor, 'sales.view'::varchar)
                      AND (a.acceso_global OR v.id_usuario_registro=a.actor
                           OR EXISTS (
                              SELECT 1 FROM public.com_ventas_asesores x
                              JOIN public.com_asesores ca ON ca.id_asesor=x.id_asesor
                              JOIN public.seg_usuarios u ON u.id_persona=ca.id_persona
                              WHERE x.id_venta=v.id_venta AND u.id_usuario=a.actor
                           ))
                    UNION ALL
                    SELECT r.id_reserva, 'SEPARACION'::text, r.codigo::text,
                           l.id_lote, l.codigo::text, proyecto.nombre::text,
                           concat_ws(' ',per.nombres,per.apellido_paterno,
                                     per.apellido_materno)::text,
                           doc.numero_documento::text,
                           NULL::text, r.monto_reserva, estado.codigo::text,
                           r.fecha_reserva, r.fecha_vencimiento,
                           NULL::text, NULL::text, NULL::text
                    FROM public.ven_reservas r
                    JOIN public.inm_lotes l ON l.id_lote=r.id_lote
                    JOIN public.inm_proyectos proyecto ON proyecto.id_proyecto=l.id_proyecto
                    JOIN public.core_personas per ON per.id_persona=r.id_persona
                    JOIN public.cfg_estados_reserva estado
                      ON estado.id_estado_reserva=r.id_estado_reserva
                    LEFT JOIN LATERAL (
                        SELECT d.numero_documento
                        FROM public.core_personas_documentos d
                        WHERE d.id_persona=per.id_persona AND d.principal AND d.activo
                        ORDER BY d.id_persona_documento DESC LIMIT 1
                    ) doc ON true
                    CROSS JOIN autorizacion a
                    WHERE public.fn_usuario_tiene_permiso_seguridad(
                        a.actor, 'sales.view'::varchar)
                      AND (a.acceso_global OR r.id_usuario_registro=a.actor
                           OR EXISTS (
                               SELECT 1 FROM public.crm_prospectos p
                               JOIN public.crm_prospectos_intereses i
                                 ON i.id_prospecto=p.id_prospecto
                                AND i.id_proyecto=l.id_proyecto AND i.activo
                               WHERE p.id_persona=r.id_persona
                                 AND public.fn_crm_puede_consultar_prospecto(
                                     a.actor,p.id_prospecto)
                           ))
                      AND NOT EXISTS (
                          SELECT 1 FROM public.ven_ventas v
                          WHERE v.id_reserva=r.id_reserva
                      )
                ), filtradas AS (
                    SELECT op.* FROM operaciones op CROSS JOIN autorizacion a
                    WHERE (a.tipo='' OR op.tipo=a.tipo)
                      AND (a.busqueda='' OR
                          lower(op.codigo) LIKE '%'||a.busqueda||'%' OR
                          lower(op.lote) LIKE '%'||a.busqueda||'%' OR
                          lower(op.proyecto) LIKE '%'||a.busqueda||'%' OR
                          lower(op.comprador) LIKE '%'||a.busqueda||'%')
                )
                SELECT jsonb_build_object(
                    'items',COALESCE((
                        SELECT jsonb_agg(to_jsonb(f) ORDER BY f.fecha DESC,f.id DESC)
                        FROM (SELECT * FROM filtradas
                              ORDER BY fecha DESC,id DESC
                              LIMIT p_tamano OFFSET ((p_pagina - 1) * p_tamano)) f
                    ),'[]'::jsonb),
                    'total',(SELECT COUNT(*) FROM filtradas),
                    'pagina',p_pagina,
                    'tamano',p_tamano,
                    'paginas',CEIL((SELECT COUNT(*) FROM filtradas)::numeric
                                   /p_tamano)::integer
                ) INTO v_resultado;
  RETURN v_resultado;
END;
$crm_operaciones$;
REVOKE ALL ON FUNCTION public.sp_crm_listar_operaciones_v1(bigint,text,text,integer,integer)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_listar_operaciones_v1(bigint,text,text,integer,integer)
TO service_role, sigi_app_user;
COMMIT;
