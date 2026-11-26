-- 163: capacidades comerciales configurables. Los códigos de rol solo aparecen en la semilla histórica.
-- Los privilegios de los roles esenciales y la separación de funciones no se eliminan.
BEGIN;
CREATE TEMP TABLE rbac_scope_before ON COMMIT DROP AS
 SELECT u.id_usuario,'crm'::text tipo,p.id_prospecto id,public.fn_crm_puede_consultar_prospecto(u.id_usuario,p.id_prospecto) acceso FROM public.seg_usuarios u CROSS JOIN public.crm_prospectos p
 UNION ALL SELECT u.id_usuario,'venta',v.id_venta,public.fn_crm_puede_consultar_venta_v1(u.id_usuario,v.id_venta) FROM public.seg_usuarios u CROSS JOIN public.ven_ventas v
 UNION ALL SELECT u.id_usuario,'voucher',r.id_reserva,public.fn_crm_puede_ver_comprobantes_separacion_v2(u.id_usuario,r.id_reserva) FROM public.seg_usuarios u CROSS JOIN public.ven_reservas r
 UNION ALL SELECT u.id_usuario,'anulacion',r.id_reserva,public.fn_crm_puede_consultar_operacion_anulacion_v1(u.id_usuario,'SEPARACION',r.id_reserva) FROM public.seg_usuarios u CROSS JOIN public.ven_reservas r;

INSERT INTO public.seg_permisos(codigo,modulo,recurso,accion,nombre,descripcion)
VALUES ('crm.scope_all','crm','crm','scope_all','Cartera CRM completa','Capacidad explícita; no sustituye los permisos base ni las reglas de negocio.'),
('crm.scope_assigned','crm','crm','scope_assigned','Cartera CRM asignada','Capacidad explícita; no sustituye los permisos base ni las reglas de negocio.'),
('crm.assign_advisor','crm','crm','assign_advisor','Asignar asesores','Capacidad explícita; no sustituye los permisos base ni las reglas de negocio.'),
('crm.approve_stage_change','crm','crm','approve_stage_change','Resolver cambios de etapa','Capacidad explícita; no sustituye los permisos base ni las reglas de negocio.'),
('crm.request_stage_change','crm','crm','request_stage_change','Solicitar cambios de etapa','Capacidad explícita; no sustituye los permisos base ni las reglas de negocio.'),
('crm.deactivate_prospect','crm','crm','deactivate_prospect','Desactivar prospectos','Capacidad explícita; no sustituye los permisos base ni las reglas de negocio.'),
('sales.scope_all','sales','sales','scope_all','Consultar todas las ventas','Capacidad explícita; no sustituye los permisos base ni las reglas de negocio.'),
('sales.contract_scope_all','sales','sales','contract_scope_all','Consultar toda la documentación contractual','Capacidad explícita; no sustituye los permisos base ni las reglas de negocio.'),
('sales.approve_reservation_change','sales','sales','approve_reservation_change','Resolver cambios de reserva','Capacidad explícita; no sustituye los permisos base ni las reglas de negocio.'),
('sales.notify_expiry_all','sales','sales','notify_expiry_all','Recibir todos los vencimientos','Capacidad explícita; no sustituye los permisos base ni las reglas de negocio.'),
('sales.reassign_advisor','sales','sales','reassign_advisor','Reasignar asesor al formalizar','Capacidad explícita; no sustituye los permisos base ni las reglas de negocio.'),
('annulments.scope_all','annulments','annulments','scope_all','Consultar todas las anulaciones','Capacidad explícita; no sustituye los permisos base ni las reglas de negocio.')
ON CONFLICT(codigo) DO NOTHING;
INSERT INTO public.seg_roles_permisos(id_rol,id_permiso,activo)
SELECT r.id_rol,p.id_permiso,true FROM (VALUES ('ADMINISTRADOR','crm.scope_all'),
('GERENCIA','crm.scope_all'),
('SUPERVISOR_COMERCIAL','crm.scope_all'),
('ADMINISTRACION','crm.scope_all'),
('ASESOR','crm.scope_assigned'),
('ADMINISTRADOR','crm.assign_advisor'),
('GERENCIA','crm.assign_advisor'),
('SUPERVISOR_COMERCIAL','crm.assign_advisor'),
('ADMINISTRACION','crm.assign_advisor'),
('GERENCIA','crm.approve_stage_change'),
('SUPERVISOR_COMERCIAL','crm.approve_stage_change'),
('ASESOR','crm.request_stage_change'),
('ADMINISTRADOR','crm.deactivate_prospect'),
('GERENCIA','crm.deactivate_prospect'),
('SUPERVISOR_COMERCIAL','crm.deactivate_prospect'),
('ADMINISTRACION','crm.deactivate_prospect'),
('ADMINISTRADOR','sales.scope_all'),
('GERENCIA','sales.scope_all'),
('SUPERVISOR_COMERCIAL','sales.scope_all'),
('FINANZAS','sales.scope_all'),
('ADMINISTRADOR','sales.contract_scope_all'),
('GERENCIA','sales.contract_scope_all'),
('FINANZAS','sales.contract_scope_all'),
('GERENCIA','sales.approve_reservation_change'),
('SUPERVISOR_COMERCIAL','sales.approve_reservation_change'),
('GERENCIA','sales.notify_expiry_all'),
('SUPERVISOR_COMERCIAL','sales.notify_expiry_all'),
('GERENCIA','sales.reassign_advisor'),
('SUPERVISOR_COMERCIAL','sales.reassign_advisor'),
('GERENCIA','annulments.scope_all'),
('ADMINISTRADOR','annulments.scope_all'),
('FINANZAS','annulments.scope_all')) semilla(rol,permiso)
JOIN public.seg_roles r ON r.codigo=semilla.rol JOIN public.seg_permisos p ON p.codigo=semilla.permiso
ON CONFLICT(id_rol,id_permiso) DO NOTHING;

CREATE OR REPLACE FUNCTION public.fn_crm_compras_visibles_v1(p_actor bigint)
 RETURNS TABLE(id_cliente bigint, codigo_cliente character varying, nombre_completo text, id_persona bigint, id_venta bigint, codigo_venta character varying, id_contrato bigint, codigo_contrato character varying, estado_contrato character varying, id_lote bigint, codigo_lote character varying, id_proyecto bigint, proyecto_nombre character varying, modalidad character varying, precio_venta numeric, fecha_venta timestamp with time zone, fecha_formalizacion timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE v_global BOOLEAN;
BEGIN
 IF p_actor IS NULL OR p_actor <= 0 OR
   NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_actor,'crm.view'::VARCHAR), FALSE)
 THEN RAISE EXCEPTION 'DENEGADO|Se requiere crm.view'; END IF;

 SELECT EXISTS(
   SELECT 1 FROM public.seg_usuarios_roles ur
   JOIN public.seg_roles r ON r.id_rol=ur.id_rol
   WHERE ur.id_usuario=p_actor AND ur.activo AND ur.fecha_revocacion IS NULL AND r.activo
     AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.scope_all'::varchar),false)
 ) INTO v_global;

 RETURN QUERY
 SELECT c.id_cliente,c.codigo,
   TRIM(CONCAT_WS(' ',per.nombres,per.apellido_paterno,per.apellido_materno)),
   c.id_persona,v.id_venta,v.codigo,ct.id_contrato,ct.codigo,ec.codigo,
   l.id_lote,l.codigo,l.id_proyecto,pro.nombre,mv.codigo,v.precio_venta,
   v.fecha_venta,COALESCE(ct.fecha_firma::timestamp AT TIME ZONE 'America/Lima',ct.fecha_creacion)
 FROM public.crm_clientes c
 JOIN public.core_personas per ON per.id_persona=c.id_persona
 JOIN public.ven_ventas_clientes vc ON vc.id_cliente=c.id_cliente
 JOIN public.ven_ventas v ON v.id_venta=vc.id_venta
 JOIN public.ven_contratos ct ON ct.id_venta=v.id_venta
 JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=ct.id_estado_contrato
 JOIN public.inm_lotes l ON l.id_lote=v.id_lote
 JOIN public.inm_proyectos pro ON pro.id_proyecto=l.id_proyecto
 JOIN public.cfg_modalidades_venta mv ON mv.id_modalidad_venta=v.id_modalidad_venta
 WHERE c.activo AND per.activo
   -- Historico con firma, incluidos contratos terminados, resueltos o anulados.
   -- Contratos que siguen en borrador o pendientes de firma no son adquisiciones.
   AND ec.codigo IN ('VIGENTE','FINALIZADO','RESUELTO','ANULADO')
   AND (ct.fecha_firma IS NOT NULL OR ec.codigo IN ('VIGENTE','FINALIZADO'))
   AND (
      v_global OR EXISTS (
        SELECT 1 FROM public.com_ventas_asesores va
        JOIN public.com_asesores a ON a.id_asesor=va.id_asesor
        JOIN public.seg_usuarios u ON u.id_persona=a.id_persona AND u.id_usuario=p_actor
        JOIN public.seg_usuarios_roles ur ON ur.id_usuario=u.id_usuario
        JOIN public.seg_roles r ON r.id_rol=ur.id_rol
        JOIN public.cfg_estados_asesor ea ON ea.id_estado_asesor=a.id_estado_asesor
        WHERE va.id_venta=v.id_venta AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.scope_assigned'::varchar),false) AND r.activo
          AND ur.activo AND ur.fecha_revocacion IS NULL
          AND ea.activo AND ea.permite_operar
          AND a.fecha_inicio <= CURRENT_DATE
          AND (a.fecha_fin IS NULL OR a.fecha_fin >= CURRENT_DATE)
      )
   );
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_crm_puede_consultar_prospecto(p_actor bigint, p_prospecto bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.crm_prospectos p
        JOIN public.core_personas persona
            ON persona.id_persona = p.id_persona
        WHERE p.id_prospecto = p_prospecto
          AND p.activo = TRUE
          AND persona.activo = TRUE
          AND p_actor IS NOT NULL
          AND p_actor > 0
          AND COALESCE(
              public.fn_usuario_tiene_permiso_seguridad(
                  p_actor, 'crm.view'::varchar
              ), FALSE
          )
          AND (
              -- Roles con alcance comercial global
              EXISTS (
                  SELECT 1
                  FROM public.seg_usuarios_roles ur
                  JOIN public.seg_roles r
                      ON r.id_rol = ur.id_rol
                  WHERE ur.id_usuario = p_actor
                    AND ur.activo = TRUE
                    AND ur.fecha_revocacion IS NULL
                    AND r.activo = TRUE
                    AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.scope_all'::varchar),false)
              )

              OR

              -- Asesor con asignacion vigente
              EXISTS (
                  SELECT 1
                  FROM public.seg_usuarios u
                  JOIN public.seg_usuarios_roles ur
                      ON ur.id_usuario = u.id_usuario
                  JOIN public.seg_roles r
                      ON r.id_rol = ur.id_rol
                  JOIN public.com_asesores a
                      ON a.id_persona = u.id_persona
                  JOIN public.cfg_estados_asesor ea
                      ON ea.id_estado_asesor = a.id_estado_asesor
                  JOIN public.com_asignaciones_prospecto ap
                      ON ap.id_asesor = a.id_asesor
                  WHERE u.id_usuario = p_actor
                    AND ur.activo = TRUE
                    AND ur.fecha_revocacion IS NULL
                    AND r.activo = TRUE
                    AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.scope_assigned'::varchar),false)
                    AND ea.activo = TRUE
                    AND ea.permite_operar = TRUE
                    AND a.fecha_inicio <= CURRENT_DATE
                    AND (
                        a.fecha_fin IS NULL
                        OR a.fecha_fin >= CURRENT_DATE
                    )
                    AND ap.id_prospecto_vigente = p.id_prospecto
                    AND ap.fecha_fin IS NULL
              )
          )
    );
$function$;

CREATE OR REPLACE FUNCTION public.sp_crm_asesores_periodo_v7(p_actor bigint, p_desde timestamp with time zone, p_hasta_exclusivo timestamp with time zone, p_id_proyecto bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_resultado JSONB;
    v_acceso_global BOOLEAN := FALSE;
BEGIN
    IF p_actor IS NULL
       OR p_actor <= 0
       OR NOT COALESCE(
           public.fn_usuario_tiene_permiso_seguridad(
               p_actor, 'crm.view'
           ), FALSE
       )
    THEN
        RAISE EXCEPTION
            'DENEGADO|Se requiere crm.view.';
    END IF;

    IF p_desde IS NULL
       OR p_hasta_exclusivo IS NULL
       OR p_hasta_exclusivo <= p_desde
       OR p_hasta_exclusivo > p_desde + INTERVAL '10 years'
    THEN
        RAISE EXCEPTION
            'DATOS_INVALIDOS|Rango de fechas invalido.';
    END IF;

    -- Identificar roles con acceso al equipo completo.
    SELECT EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ur
        JOIN public.seg_roles r
            ON r.id_rol = ur.id_rol
        WHERE ur.id_usuario = p_actor
          AND ur.activo
          AND ur.fecha_revocacion IS NULL
          AND r.activo
          AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.scope_all'::varchar),false)
    )
    INTO v_acceso_global;

    WITH asignaciones_periodo AS (
        SELECT
            ap.id_asesor,
            COUNT(*)::INTEGER AS asignaciones_periodo
        FROM public.com_asignaciones_prospecto ap
        WHERE (p_id_proyecto IS NULL OR EXISTS (
              SELECT 1 FROM public.crm_prospectos_intereses pi
              WHERE pi.id_prospecto=ap.id_prospecto AND pi.activo AND pi.id_proyecto=p_id_proyecto
          )) AND ap.fecha_asignacion >= p_desde
          AND ap.fecha_asignacion < p_hasta_exclusivo
        GROUP BY ap.id_asesor
    ),

    equipo AS (
        SELECT
            a.id_asesor,
            a.codigo,
            a.nombre_completo,
            a.email,
            a.telefono,
            a.activo,
            CASE WHEN p_id_proyecto IS NULL THEN a.leads_activos
                 ELSE (
                     SELECT COUNT(DISTINCT aa.id_prospecto)::BIGINT
                     FROM public.com_asignaciones_prospecto aa
                     JOIN public.crm_prospectos_intereses pi
                       ON pi.id_prospecto=aa.id_prospecto
                     JOIN public.crm_prospectos cp
                       ON cp.id_prospecto=aa.id_prospecto
                     WHERE aa.id_asesor=a.id_asesor
                       AND aa.fecha_fin IS NULL AND cp.activo AND pi.activo
                       AND pi.id_proyecto=p_id_proyecto
                 )
            END AS leads_activos,
            COALESCE(
                ap.asignaciones_periodo, 0
            ) AS asignaciones_periodo

        FROM public.sp_listar_asesores() a

        LEFT JOIN asignaciones_periodo ap
            ON ap.id_asesor = a.id_asesor

        WHERE
            v_acceso_global

            -- Sin acceso global: mostrar solo al asesor
            -- vinculado a la identidad autenticada.
            OR EXISTS (
                SELECT 1
                FROM public.seg_usuarios u
                JOIN public.com_asesores ca
                    ON ca.id_persona = u.id_persona
                WHERE u.id_usuario = p_actor
                  AND ca.id_asesor = a.id_asesor
            )
    )

    SELECT jsonb_build_object(
        'total', COUNT(*),
        'items', COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id_asesor', id_asesor,
                    'codigo', codigo,
                    'nombre_completo', nombre_completo,
                    'email', email,
                    'telefono', telefono,
                    'activo', activo,
                    'leads_activos', leads_activos,
                    'asignaciones_periodo',
                        asignaciones_periodo
                )
                ORDER BY codigo
            ),
            '[]'::jsonb
        )
    )
    INTO v_resultado
    FROM equipo;

    RETURN v_resultado;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_crm_buscar_v7(p_actor bigint, p_busqueda character varying, p_etapa character varying, p_origen character varying, p_asesor bigint, p_sin_asignar boolean, p_categoria character varying, p_pagina integer, p_tamano integer, p_proyecto bigint, p_desde timestamp with time zone, p_hasta_exclusivo timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_resultado JSONB;
    v_es_asesor BOOLEAN := FALSE;
    v_es_global BOOLEAN := FALSE;
    v_asesor_propio BIGINT;
BEGIN
    IF p_actor IS NULL
       OR p_actor <= 0
       OR NOT COALESCE(
           public.fn_usuario_tiene_permiso_seguridad(
               p_actor, 'crm.view'
           ), FALSE
       )
    THEN
        RAISE EXCEPTION
            'DENEGADO|Se requiere crm.view.';
    END IF;

    IF p_pagina IS NULL
       OR p_pagina < 1
       OR p_pagina > 100000
       OR p_tamano IS NULL
       OR p_tamano < 1
       OR p_tamano > 100
       OR LENGTH(p_busqueda) > 120
       OR LENGTH(p_etapa) > 40
       OR LENGTH(p_origen) > 40
       OR p_categoria IS NULL
       OR p_categoria NOT IN (
           'TODOS',
           'LEAD',
           'POTENCIAL',
           'COMPRADOR',
           'CERRADO'
       )
       OR (p_asesor IS NOT NULL AND p_asesor <= 0)
       OR (p_proyecto IS NOT NULL AND p_proyecto <= 0)
       OR ((p_desde IS NULL) <> (p_hasta_exclusivo IS NULL))
       OR (p_desde IS NOT NULL AND
         (p_hasta_exclusivo <= p_desde
          OR p_hasta_exclusivo > p_desde + INTERVAL '10 years'))
    THEN
        RAISE EXCEPTION
            'DATOS_INVALIDOS|Filtros, fechas o paginacion invalidos.';
    END IF;

    -- Identificar roles con alcance global.
    SELECT EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ur
        JOIN public.seg_roles r
            ON r.id_rol = ur.id_rol
        WHERE ur.id_usuario = p_actor
          AND ur.activo
          AND ur.fecha_revocacion IS NULL
          AND r.activo
          AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.scope_all'::varchar),false)
    )
    INTO v_es_global;

    -- Conservar la identificacion del asesor.
    IF NOT v_es_global THEN

        SELECT EXISTS (
            SELECT 1
            FROM public.seg_usuarios_roles ur
            JOIN public.seg_roles r
                ON r.id_rol = ur.id_rol
            WHERE ur.id_usuario = p_actor
              AND ur.activo
              AND ur.fecha_revocacion IS NULL
              AND r.activo
              AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.scope_assigned'::varchar),false)
        )
        INTO v_es_asesor;

        IF v_es_asesor THEN

            SELECT a.id_asesor
            INTO v_asesor_propio
            FROM public.seg_usuarios u
            JOIN public.com_asesores ca
                ON ca.id_persona = u.id_persona
            JOIN public.sp_listar_asesores() a
                ON a.id_asesor = ca.id_asesor
            WHERE u.id_usuario = p_actor
            LIMIT 1;

            IF v_asesor_propio IS NULL THEN
                RAISE EXCEPTION
                    'DENEGADO|El asesor autenticado no tiene identidad comercial operativa.';
            END IF;
        END IF;
    END IF;

    WITH base AS (
        SELECT
            x.*,

            (
                SELECT d.numero_documento
                FROM public.core_personas_documentos d
                WHERE d.id_persona = x.id_persona
                  AND d.activo
                ORDER BY
                    d.principal DESC,
                    d.id_persona_documento DESC
                LIMIT 1
            ) AS numero_documento,

            CASE
                WHEN EXISTS (
                    SELECT 1
                    FROM public.crm_clientes c
                    JOIN public.ven_ventas_clientes vc
                        ON vc.id_cliente = c.id_cliente
                    JOIN public.ven_ventas v
                        ON v.id_venta = vc.id_venta
                    JOIN public.cfg_estados_venta ev
                        ON ev.id_estado_venta =
                           v.id_estado_venta
                    JOIN public.ven_contratos ct
                        ON ct.id_venta = v.id_venta
                    JOIN public.cfg_estados_contrato ec
                        ON ec.id_estado_contrato =
                           ct.id_estado_contrato
                    WHERE c.id_persona = x.id_persona
                      AND c.activo
                      AND ev.codigo IN (
                          'CONFIRMADA',
                          'CONTRATADA',
                          'COMPLETADA'
                      )
                      AND ec.codigo IN (
                          'VIGENTE',
                          'FINALIZADO'
                      )
                ) THEN 'COMPRADOR'

                WHEN x.estado_codigo IN (
                    'INTERESADO',
                    'NEGOCIACION','CON_RESERVA'
                ) THEN 'POTENCIAL'

                WHEN x.estado_codigo IN (
                    'NUEVO',
                    'CONTACTADO',
                    'EN_SEGUIMIENTO'
                ) THEN 'LEAD'

                ELSE 'CERRADO'
            END AS categoria

        FROM public.sp_listar_prospectos() x
    ),

    filtrado AS (
        SELECT *
        FROM base b

        WHERE (p_desde IS NULL OR
          (b.fecha_registro >= p_desde
          AND b.fecha_registro < p_hasta_exclusivo))

          -- NUEVA VALIDACION OBLIGATORIA.
          -- El usuario debe estar autorizado para
          -- consultar cada prospecto individualmente.
          AND COALESCE(
              public.fn_crm_puede_consultar_prospecto(
                  p_actor,
                  b.id_prospecto
              ),
              FALSE
          )

          AND (
              NULLIF(BTRIM(p_busqueda), '') IS NULL
              OR b.nombre_completo ILIKE
                  '%' || BTRIM(p_busqueda) || '%'
              OR b.codigo ILIKE
                  '%' || BTRIM(p_busqueda) || '%'
              OR b.telefono ILIKE
                  '%' || BTRIM(p_busqueda) || '%'
              OR b.email ILIKE
                  '%' || BTRIM(p_busqueda) || '%'
              OR EXISTS (
                  SELECT 1
                  FROM public.core_personas_documentos d
                  WHERE d.id_persona = b.id_persona
                    AND d.activo
                    AND d.numero_documento ILIKE
                        '%' || BTRIM(p_busqueda) || '%'
              )
          )

          AND (
              NULLIF(BTRIM(p_etapa), '') IS NULL
              OR b.estado_codigo = UPPER(BTRIM(p_etapa))
          )

          AND (
              NULLIF(BTRIM(p_origen), '') IS NULL
              OR b.origen_codigo = UPPER(BTRIM(p_origen))
          )

          AND (
              p_asesor IS NULL
              OR b.id_asesor = p_asesor
          )

          AND (
              NOT v_es_asesor
              OR b.id_asesor = v_asesor_propio
          )

          AND (
              COALESCE(p_sin_asignar, FALSE) = FALSE
              OR b.id_asesor IS NULL
          )

          AND (
              p_categoria = 'TODOS'
              OR b.categoria = p_categoria
          )

          AND (
              p_proyecto IS NULL
              OR EXISTS (
                  SELECT 1
                  FROM public.crm_prospectos_intereses pi
                  WHERE pi.id_prospecto = b.id_prospecto
                    AND pi.id_proyecto = p_proyecto
                    AND pi.activo
              )
          )
    ),

    pagina AS (
        SELECT *
        FROM filtrado
        ORDER BY id_prospecto DESC
        LIMIT p_tamano
        OFFSET (
            (p_pagina::BIGINT - 1) * p_tamano
        )
    )

    SELECT jsonb_build_object(
        'items', (
            SELECT COALESCE(
                jsonb_agg(
                    to_jsonb(x)
                    ORDER BY x.id_prospecto DESC
                ),
                '[]'::jsonb
            )
            FROM pagina x
        ),

        'total', (
            SELECT COUNT(*)
            FROM filtrado
        ),

        'pagina', p_pagina,
        'tamano', p_tamano,

        'paginas', CEIL(
            (
                SELECT COUNT(*)::NUMERIC
                FROM filtrado
            ) / p_tamano
        )::INTEGER
    )
    INTO v_resultado;

    RETURN v_resultado;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_crm_evolucion_mensual_v7(p_actor bigint, p_desde timestamp with time zone, p_hasta_exclusivo timestamp with time zone, p_id_proyecto bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_resultado JSONB;
    v_acceso_global BOOLEAN := FALSE;
BEGIN
    -- Validar identidad y permiso.
    IF p_actor IS NULL
       OR p_actor <= 0
       OR NOT COALESCE(
           public.fn_usuario_tiene_permiso_seguridad(
               p_actor, 'crm.view'
           ),
           FALSE
       )
    THEN
        RAISE EXCEPTION
            'DENEGADO|Se requiere crm.view.';
    END IF;

    -- Conservar validaciones originales.
    IF p_desde IS NULL
       OR p_hasta_exclusivo IS NULL
       OR p_hasta_exclusivo <= p_desde
       OR p_hasta_exclusivo >
          p_desde + INTERVAL '3 years'
    THEN
        RAISE EXCEPTION
            'DATOS_INVALIDOS|Rango de fechas invalido para evolucion comercial.';
    END IF;

    -- Identificar usuarios con acceso global.
    SELECT EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ur
        JOIN public.seg_roles r
            ON r.id_rol = ur.id_rol
        WHERE ur.id_usuario = p_actor
          AND ur.activo
          AND ur.fecha_revocacion IS NULL
          AND r.activo
          AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.scope_all'::varchar),false)
    )
    INTO v_acceso_global;

    WITH prospectos AS (
        SELECT
            x.estado_codigo,
            p.fecha_registro,

            EXISTS (
                SELECT 1
                FROM public.crm_clientes cl
                JOIN public.ven_ventas_clientes vc
                    ON vc.id_cliente = cl.id_cliente
                JOIN public.ven_ventas v
                    ON v.id_venta = vc.id_venta
                JOIN public.cfg_estados_venta ev
                    ON ev.id_estado_venta = v.id_estado_venta
                JOIN public.ven_contratos ct
                    ON ct.id_venta = v.id_venta
                JOIN public.cfg_estados_contrato ec
                    ON ec.id_estado_contrato =
                       ct.id_estado_contrato
                WHERE cl.id_persona = x.id_persona AND (p_id_proyecto IS NULL OR EXISTS (
            SELECT 1 FROM public.inm_lotes lp
            WHERE lp.id_lote=v.id_lote AND lp.id_proyecto=p_id_proyecto
        ))
                  AND cl.activo
                  AND ev.codigo IN (
                      'CONFIRMADA',
                      'CONTRATADA',
                      'COMPLETADA'
                  )
                  AND ec.codigo IN (
                      'VIGENTE',
                      'FINALIZADO'
                  )
            ) AS comprado

        FROM public.sp_listar_prospectos() x

        JOIN public.crm_prospectos p
            ON p.id_prospecto = x.id_prospecto

        -- NUEVO: limitar a prospectos autorizados.
        WHERE (p_id_proyecto IS NULL OR EXISTS (
            SELECT 1 FROM public.crm_prospectos_intereses pi
            WHERE pi.id_prospecto=x.id_prospecto
              AND pi.id_proyecto=p_id_proyecto AND pi.activo
        ))
          AND COALESCE(
            public.fn_crm_puede_consultar_prospecto(
                p_actor,
                x.id_prospecto
            ),
            FALSE
        )
    ),

    meses AS (
        SELECT gs::DATE AS mes
        FROM generate_series(
            date_trunc(
                'month',
                p_desde AT TIME ZONE 'America/Lima'
            ),
            date_trunc(
                'month',
                (p_hasta_exclusivo - INTERVAL '1 microsecond')
                    AT TIME ZONE 'America/Lima'
            ),
            INTERVAL '1 month'
        ) gs
    ),

    registros AS (
        SELECT
            date_trunc(
                'month',
                fecha_registro AT TIME ZONE 'America/Lima'
            )::DATE AS mes,

            COUNT(*) FILTER (
                WHERE NOT comprado
                  AND estado_codigo IN (
                      'NUEVO',
                      'CONTACTADO',
                      'EN_SEGUIMIENTO'
                  )
            )::INTEGER AS leads,

            COUNT(*) FILTER (
                WHERE NOT comprado
                  AND estado_codigo IN (
                      'INTERESADO',
                      'NEGOCIACION','CON_RESERVA'
                  )
            )::INTEGER AS potenciales

        FROM prospectos

        WHERE fecha_registro >= p_desde
          AND fecha_registro < p_hasta_exclusivo

        GROUP BY 1
    ),

    primeras_compras AS (
        SELECT
            c.id_cliente,

            MIN(
                COALESCE(
                    ct.fecha_firma::TIMESTAMP
                        AT TIME ZONE 'America/Lima',
                    ct.fecha_creacion
                )
            ) AS fecha_primera_formalizacion

        FROM public.crm_clientes c

        JOIN public.core_personas per
            ON per.id_persona = c.id_persona

        JOIN public.ven_ventas_clientes vc
            ON vc.id_cliente = c.id_cliente

        JOIN public.ven_ventas v
            ON v.id_venta = vc.id_venta

        JOIN public.cfg_estados_venta ev
            ON ev.id_estado_venta = v.id_estado_venta

        JOIN public.ven_contratos ct
            ON ct.id_venta = v.id_venta

        JOIN public.cfg_estados_contrato ec
            ON ec.id_estado_contrato =
               ct.id_estado_contrato

        WHERE c.activo
          AND (p_id_proyecto IS NULL OR EXISTS (
            SELECT 1 FROM public.inm_lotes lp
            WHERE lp.id_lote=v.id_lote AND lp.id_proyecto=p_id_proyecto
        ))
          AND per.activo

          AND ev.codigo IN (
              'CONFIRMADA',
              'CONTRATADA',
              'COMPLETADA'
          )

          AND ec.codigo IN (
              'VIGENTE',
              'FINALIZADO'
          )

          -- NUEVO: proteger compradores.
          AND (
              v_acceso_global

              OR EXISTS (
                  SELECT 1
                  FROM public.crm_prospectos cp
                  WHERE cp.id_persona = c.id_persona

                    AND COALESCE(
                        public.fn_crm_puede_consultar_prospecto(
                            p_actor,
                            cp.id_prospecto
                        ),
                        FALSE
                    )
              )
          )

        GROUP BY c.id_cliente
    ),

    compras AS (
        SELECT
            date_trunc(
                'month',
                fecha_primera_formalizacion
                    AT TIME ZONE 'America/Lima'
            )::DATE AS mes,

            COUNT(*)::INTEGER AS compradores

        FROM primeras_compras

        WHERE fecha_primera_formalizacion >= p_desde
          AND fecha_primera_formalizacion < p_hasta_exclusivo

        GROUP BY 1
    )

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'mes', to_char(m.mes, 'YYYY-MM'),
                'leads', COALESCE(r.leads, 0),
                'potenciales', COALESCE(r.potenciales, 0),
                'compradores', COALESCE(c.compradores, 0)
            )
            ORDER BY m.mes
        ),
        '[]'::jsonb
    )
    INTO v_resultado

    FROM meses m

    LEFT JOIN registros r
        ON r.mes = m.mes

    LEFT JOIN compras c
        ON c.mes = m.mes;

    RETURN jsonb_build_object(
        'items', v_resultado
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_crm_puede_consultar_venta_v1(p_actor bigint, p_venta bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
 SELECT p_actor IS NOT NULL AND p_actor>0
 AND p_venta IS NOT NULL AND p_venta>0
 AND coalesce(public.fn_usuario_tiene_permiso_seguridad(
   p_actor,'sales.view'::varchar),false)
 AND EXISTS (
   SELECT 1 FROM public.ven_ventas v
   WHERE v.id_venta=p_venta AND
   (
      EXISTS (
        SELECT 1 FROM public.seg_usuarios_roles ur
        JOIN public.seg_roles rol ON rol.id_rol=ur.id_rol
        WHERE ur.id_usuario=p_actor AND ur.activo
          AND ur.fecha_revocacion IS NULL AND rol.activo
          AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'sales.scope_all'::varchar),false)
      )
      OR v.id_usuario_registro=p_actor
      OR EXISTS (
        SELECT 1 FROM public.com_ventas_asesores va
        JOIN public.com_asesores asesor ON asesor.id_asesor=va.id_asesor
        JOIN public.seg_usuarios u ON u.id_persona=asesor.id_persona
        WHERE va.id_venta=v.id_venta AND u.id_usuario=p_actor
      )
   )
 );
$function$;

CREATE OR REPLACE FUNCTION public.sp_crm_compradores_filtros_v2(p_actor bigint, p_busqueda character varying, p_pagina integer, p_tamano integer, p_proyecto bigint DEFAULT NULL::bigint, p_modalidad character varying DEFAULT NULL::character varying, p_desde date DEFAULT NULL::date, p_hasta date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_global BOOLEAN;
    v_resultado JSONB;
BEGIN
    IF p_actor IS NULL OR p_actor <= 0 OR
       NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_actor,'crm.view'),false)
    THEN
        RAISE EXCEPTION 'DENEGADO|Se requiere crm.view.';
    END IF;
    IF p_pagina IS NULL OR p_pagina < 1 OR p_pagina > 100000 OR
       p_tamano IS NULL OR p_tamano < 1 OR p_tamano > 100 OR
       LENGTH(COALESCE(p_busqueda,'')) > 120 OR
       (p_proyecto IS NOT NULL AND p_proyecto <= 0) OR
       (p_modalidad IS NOT NULL AND p_modalidad NOT IN ('CONTADO','FINANCIADA')) OR
       (p_desde IS NOT NULL AND p_hasta IS NOT NULL AND p_desde > p_hasta)
    THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|Filtros de cartera invalidos.';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.seg_usuarios_roles ur
        JOIN public.seg_roles r ON r.id_rol=ur.id_rol
        WHERE ur.id_usuario=p_actor AND ur.activo AND ur.fecha_revocacion IS NULL
          AND r.activo
          AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.scope_all'::varchar),false)
    ) INTO v_global;

    WITH base AS (
        SELECT
            c.id_cliente,
            c.codigo AS codigo_cliente,
            TRIM(CONCAT_WS(' ',per.nombres,per.apellido_paterno,per.apellido_materno)) AS nombre_completo,
            pr.id_prospecto,
            v.id_venta,
            v.codigo AS codigo_venta,
            v.fecha_venta,
            v.precio_venta,
            ct.id_contrato,
            ct.codigo AS codigo_contrato,
            ec.codigo AS estado_contrato,
            l.codigo AS codigo_lote,
            l.id_proyecto,
            pro.nombre AS proyecto_nombre,
            mv.codigo AS modalidad,
            COALESCE(ct.fecha_firma::TIMESTAMP AT TIME ZONE 'America/Lima',ct.fecha_creacion) AS fecha_formalizacion

        FROM public.crm_clientes c
        JOIN public.core_personas per ON per.id_persona=c.id_persona
        JOIN public.ven_ventas_clientes vc ON vc.id_cliente=c.id_cliente
        JOIN public.ven_ventas v ON v.id_venta=vc.id_venta
        JOIN public.cfg_estados_venta es ON es.id_estado_venta=v.id_estado_venta
        JOIN public.ven_contratos ct ON ct.id_venta=v.id_venta
        JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=ct.id_estado_contrato
        JOIN public.inm_lotes l ON l.id_lote=v.id_lote
        JOIN public.inm_proyectos pro ON pro.id_proyecto=l.id_proyecto
        JOIN public.cfg_modalidades_venta mv ON mv.id_modalidad_venta=v.id_modalidad_venta
        LEFT JOIN LATERAL (
            SELECT cp.id_prospecto
            FROM public.crm_prospectos cp
            WHERE cp.id_persona=c.id_persona AND cp.activo AND
               (v_global OR COALESCE(public.fn_crm_puede_consultar_prospecto(p_actor,cp.id_prospecto),false))
            ORDER BY cp.id_prospecto DESC
            LIMIT 1
        ) pr ON TRUE
        WHERE c.activo AND per.activo
          AND es.codigo IN ('CONFIRMADA','CONTRATADA','COMPLETADA')
          AND ec.codigo IN ('VIGENTE','FINALIZADO')
          AND (v_global OR pr.id_prospecto IS NOT NULL)
          AND (p_proyecto IS NULL OR l.id_proyecto=p_proyecto)
          AND (p_modalidad IS NULL OR mv.codigo=p_modalidad)
          AND (p_desde IS NULL OR COALESCE(ct.fecha_firma::TIMESTAMP AT TIME ZONE 'America/Lima',ct.fecha_creacion) >= p_desde::TIMESTAMP AT TIME ZONE 'America/Lima')
          AND (p_hasta IS NULL OR COALESCE(ct.fecha_firma::TIMESTAMP AT TIME ZONE 'America/Lima',ct.fecha_creacion) < (p_hasta + 1)::TIMESTAMP AT TIME ZONE 'America/Lima')
          AND (
            NULLIF(BTRIM(p_busqueda),'') IS NULL OR
            per.nombres ILIKE '%'||BTRIM(p_busqueda)||'%' OR
            TRIM(CONCAT_WS(' ',per.nombres,per.apellido_paterno,per.apellido_materno)) ILIKE '%'||BTRIM(p_busqueda)||'%' OR
            c.codigo ILIKE '%'||BTRIM(p_busqueda)||'%' OR
            v.codigo ILIKE '%'||BTRIM(p_busqueda)||'%' OR
            ct.codigo ILIKE '%'||BTRIM(p_busqueda)||'%' OR
            l.codigo ILIKE '%'||BTRIM(p_busqueda)||'%'
          )
    ), pagina AS (
        SELECT * FROM base
        ORDER BY fecha_formalizacion DESC,id_venta DESC,id_contrato DESC
        LIMIT p_tamano OFFSET (p_pagina::BIGINT-1)*p_tamano
    )
    SELECT jsonb_build_object(
       'items',COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.fecha_formalizacion DESC,x.id_venta DESC,x.id_contrato DESC) FROM pagina x),'[]'::jsonb),
       'total',(SELECT COUNT(*) FROM base),
       'pagina',p_pagina,'tamano',p_tamano,
       'paginas',CEIL((SELECT COUNT(*)::NUMERIC FROM base)/p_tamano)::INTEGER
    ) INTO v_resultado;
    RETURN v_resultado;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_crm_compradores_periodo_v6(p_actor bigint, p_busqueda character varying, p_pagina integer, p_tamano integer, p_desde timestamp with time zone, p_hasta_exclusivo timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_resultado JSONB;
    v_acceso_global BOOLEAN := FALSE;
BEGIN
    -- Validar permiso de consulta.
    IF p_actor IS NULL
       OR p_actor <= 0
       OR NOT COALESCE(
           public.fn_usuario_tiene_permiso_seguridad(
               p_actor, 'crm.view'
           ), FALSE
       )
    THEN
        RAISE EXCEPTION
            'DENEGADO|Se requiere crm.view.';
    END IF;

    -- Conservar validaciones existentes.
    IF p_pagina IS NULL
       OR p_pagina < 1
       OR p_pagina > 100000
       OR p_tamano IS NULL
       OR p_tamano < 1
       OR p_tamano > 100
       OR LENGTH(p_busqueda) > 120
       OR p_desde IS NULL
       OR p_hasta_exclusivo IS NULL
       OR p_hasta_exclusivo <= p_desde
       OR p_hasta_exclusivo >
          p_desde + INTERVAL '10 years'
    THEN
        RAISE EXCEPTION
            'DATOS_INVALIDOS|Filtros, fechas o paginacion invalidos.';
    END IF;

    -- Identificar los roles con acceso global.
    SELECT EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ur
        JOIN public.seg_roles r
            ON r.id_rol = ur.id_rol
        WHERE ur.id_usuario = p_actor
          AND ur.activo
          AND ur.fecha_revocacion IS NULL
          AND r.activo
          AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.scope_all'::varchar),false)
    )
    INTO v_acceso_global;

    WITH base AS (
        SELECT DISTINCT ON (c.id_cliente)
            c.id_cliente,
            c.codigo AS codigo_cliente,
            c.id_persona,

            TRIM(
                CONCAT_WS(
                    ' ',
                    per.nombres,
                    per.apellido_paterno,
                    per.apellido_materno
                )
            ) AS nombre_completo,

            p.id_prospecto,
            v.id_venta,
            v.codigo AS codigo_venta,
            v.fecha_venta,
            v.precio_venta,
            ev.codigo AS estado_venta,
            ct.id_contrato,
            ct.codigo AS codigo_contrato,
            ec.codigo AS estado_contrato,
            l.id_lote,
            l.codigo AS codigo_lote,

            COALESCE(
                ct.fecha_firma::TIMESTAMP
                    AT TIME ZONE 'America/Lima',
                ct.fecha_creacion
            ) AS fecha_formalizacion

        FROM public.crm_clientes c

        JOIN public.core_personas per
            ON per.id_persona = c.id_persona

        JOIN public.ven_ventas_clientes vc
            ON vc.id_cliente = c.id_cliente

        JOIN public.ven_ventas v
            ON v.id_venta = vc.id_venta

        JOIN public.cfg_estados_venta ev
            ON ev.id_estado_venta = v.id_estado_venta

        JOIN public.ven_contratos ct
            ON ct.id_venta = v.id_venta

        JOIN public.cfg_estados_contrato ec
            ON ec.id_estado_contrato =
               ct.id_estado_contrato

        JOIN public.inm_lotes l
            ON l.id_lote = v.id_lote

        -- Buscar el prospecto que el usuario
        -- esta autorizado a consultar.
        LEFT JOIN LATERAL (
            SELECT pr.id_prospecto
            FROM public.crm_prospectos pr
            WHERE pr.id_persona = c.id_persona
              AND pr.activo
              AND (
                  v_acceso_global
                  OR COALESCE(
                      public.fn_crm_puede_consultar_prospecto(
                          p_actor,
                          pr.id_prospecto
                      ),
                      FALSE
                  )
              )
            ORDER BY pr.id_prospecto DESC
            LIMIT 1
        ) p ON TRUE

        WHERE c.activo
          AND per.activo

          AND ev.codigo IN (
              'CONFIRMADA',
              'CONTRATADA',
              'COMPLETADA'
          )

          AND ec.codigo IN (
              'VIGENTE',
              'FINALIZADO'
          )

          -- NUEVA REGLA DE SEGURIDAD:
          -- Gerencia conserva acceso global.
          -- Asesores necesitan prospecto autorizado.
          AND (
              v_acceso_global
              OR p.id_prospecto IS NOT NULL
          )

        ORDER BY
            c.id_cliente,
            fecha_formalizacion ASC,
            v.id_venta ASC,
            ct.id_contrato ASC
    ),

    filtrado AS (
        SELECT *
        FROM base b

        WHERE b.fecha_formalizacion >= p_desde
          AND b.fecha_formalizacion < p_hasta_exclusivo

          AND (
              NULLIF(BTRIM(p_busqueda), '') IS NULL

              OR b.nombre_completo ILIKE
                  '%' || BTRIM(p_busqueda) || '%'

              OR b.codigo_cliente ILIKE
                  '%' || BTRIM(p_busqueda) || '%'

              OR b.codigo_venta ILIKE
                  '%' || BTRIM(p_busqueda) || '%'

              OR b.codigo_contrato ILIKE
                  '%' || BTRIM(p_busqueda) || '%'
          )
    ),

    pagina AS (
        SELECT *
        FROM filtrado

        ORDER BY id_cliente DESC

        LIMIT p_tamano

        OFFSET (
            (p_pagina::BIGINT - 1) * p_tamano
        )
    )

    SELECT jsonb_build_object(
        'items', (
            SELECT COALESCE(
                jsonb_agg(
                    to_jsonb(x)
                    ORDER BY x.id_cliente DESC
                ),
                '[]'::jsonb
            )
            FROM pagina x
        ),

        'total', (
            SELECT COUNT(*)
            FROM filtrado
        ),

        'pagina', p_pagina,
        'tamano', p_tamano,

        'paginas', CEIL(
            (
                SELECT COUNT(*)::NUMERIC
                FROM filtrado
            ) / p_tamano
        )::INTEGER
    )
    INTO v_resultado;

    RETURN v_resultado;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_crm_compradores_v5(p_actor bigint, p_busqueda character varying, p_pagina integer, p_tamano integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_resultado JSONB;
    v_acceso_global BOOLEAN := FALSE;
BEGIN
    -- Validar permiso de consulta.
    IF p_actor IS NULL
       OR p_actor <= 0
       OR NOT COALESCE(
           public.fn_usuario_tiene_permiso_seguridad(
               p_actor, 'crm.view'
           ), FALSE
       )
    THEN
        RAISE EXCEPTION
            'DENEGADO|Se requiere crm.view.';
    END IF;

    -- Mantener validaciones originales.
    IF p_pagina IS NULL
       OR p_pagina < 1
       OR p_pagina > 100000
       OR p_tamano IS NULL
       OR p_tamano < 1
       OR p_tamano > 100
       OR LENGTH(p_busqueda) > 120
    THEN
        RAISE EXCEPTION
            'DATOS_INVALIDOS|Filtros o paginacion invalidos.';
    END IF;

    -- Identificar roles autorizados a consultar
    -- la cartera comercial completa.
    SELECT EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ur
        JOIN public.seg_roles r
            ON r.id_rol = ur.id_rol
        WHERE ur.id_usuario = p_actor
          AND ur.activo
          AND ur.fecha_revocacion IS NULL
          AND r.activo
          AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.scope_all'::varchar),false)
    )
    INTO v_acceso_global;

    WITH base AS (
        SELECT DISTINCT ON (c.id_cliente)
            c.id_cliente,
            c.codigo AS codigo_cliente,
            c.id_persona,

            TRIM(
                CONCAT_WS(
                    ' ',
                    per.nombres,
                    per.apellido_paterno,
                    per.apellido_materno
                )
            ) AS nombre_completo,

            p.id_prospecto,
            v.id_venta,
            v.codigo AS codigo_venta,
            v.fecha_venta,
            v.precio_venta,
            ev.codigo AS estado_venta,
            ct.id_contrato,
            ct.codigo AS codigo_contrato,
            ec.codigo AS estado_contrato,
            l.id_lote,
            l.codigo AS codigo_lote

        FROM public.crm_clientes c

        JOIN public.core_personas per
            ON per.id_persona = c.id_persona

        JOIN public.ven_ventas_clientes vc
            ON vc.id_cliente = c.id_cliente

        JOIN public.ven_ventas v
            ON v.id_venta = vc.id_venta

        JOIN public.cfg_estados_venta ev
            ON ev.id_estado_venta = v.id_estado_venta

        JOIN public.ven_contratos ct
            ON ct.id_venta = v.id_venta

        JOIN public.cfg_estados_contrato ec
            ON ec.id_estado_contrato =
               ct.id_estado_contrato

        JOIN public.inm_lotes l
            ON l.id_lote = v.id_lote

        -- Seleccionar exclusivamente un prospecto
        -- que el usuario tenga permitido consultar.
        LEFT JOIN LATERAL (
            SELECT pr.id_prospecto
            FROM public.crm_prospectos pr
            WHERE pr.id_persona = c.id_persona
              AND pr.activo
              AND (
                  v_acceso_global
                  OR COALESCE(
                      public.fn_crm_puede_consultar_prospecto(
                          p_actor,
                          pr.id_prospecto
                      ),
                      FALSE
                  )
              )
            ORDER BY pr.id_prospecto DESC
            LIMIT 1
        ) p ON TRUE

        WHERE c.activo
          AND per.activo

          AND ev.codigo IN (
              'CONFIRMADA',
              'CONTRATADA',
              'COMPLETADA'
          )

          AND ec.codigo IN (
              'VIGENTE',
              'FINALIZADO'
          )

          -- NUEVA VALIDACION DE CARTERA.
          AND (
              v_acceso_global
              OR p.id_prospecto IS NOT NULL
          )

        -- Mantener criterio de seleccion
        -- de la operacion comercial mas reciente.
        ORDER BY
            c.id_cliente,
            v.fecha_venta DESC,
            v.id_venta DESC,
            ct.id_contrato DESC
    ),

    filtrado AS (
        SELECT *
        FROM base b
        WHERE
            NULLIF(BTRIM(p_busqueda), '') IS NULL

            OR b.nombre_completo ILIKE
                '%' || BTRIM(p_busqueda) || '%'

            OR b.codigo_cliente ILIKE
                '%' || BTRIM(p_busqueda) || '%'

            OR b.codigo_venta ILIKE
                '%' || BTRIM(p_busqueda) || '%'
    ),

    pagina AS (
        SELECT *
        FROM filtrado
        ORDER BY id_cliente DESC
        LIMIT p_tamano
        OFFSET (
            (p_pagina::BIGINT - 1) * p_tamano
        )
    )

    SELECT jsonb_build_object(
        'items', (
            SELECT COALESCE(
                jsonb_agg(
                    to_jsonb(a)
                    ORDER BY a.id_cliente DESC
                ),
                '[]'::jsonb
            )
            FROM pagina a
        ),

        'total', (
            SELECT COUNT(*)
            FROM filtrado
        ),

        'pagina', p_pagina,
        'tamano', p_tamano
    )
    INTO v_resultado;

    RETURN v_resultado;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_crm_indicadores_periodo_v7(p_actor bigint, p_desde timestamp with time zone, p_hasta_exclusivo timestamp with time zone, p_id_proyecto bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_resultado JSONB;
    v_acceso_global BOOLEAN := FALSE;
BEGIN
    -- Validar permiso de consulta.
    IF p_actor IS NULL
       OR p_actor <= 0
       OR NOT COALESCE(
           public.fn_usuario_tiene_permiso_seguridad(
               p_actor, 'crm.view'
           ), FALSE
       )
    THEN
        RAISE EXCEPTION
            'DENEGADO|Se requiere crm.view.';
    END IF;

    -- Validar periodo.
    IF p_desde IS NULL
       OR p_hasta_exclusivo IS NULL
       OR p_hasta_exclusivo <= p_desde
       OR p_hasta_exclusivo > p_desde + INTERVAL '10 years'
    THEN
        RAISE EXCEPTION
            'DATOS_INVALIDOS|Rango de fechas invalido.';
    END IF;

    -- Identificar usuarios con visibilidad global.
    SELECT EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ur
        JOIN public.seg_roles r
            ON r.id_rol = ur.id_rol
        WHERE ur.id_usuario = p_actor
          AND ur.activo
          AND ur.fecha_revocacion IS NULL
          AND r.activo
          AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.scope_all'::varchar),false)
    )
    INTO v_acceso_global;

    WITH prospectos AS (
        SELECT
            x.id_prospecto,
            x.estado_codigo,
            x.id_asesor,
            p.fecha_registro,

            EXISTS (
                SELECT 1
                FROM public.crm_clientes c
                JOIN public.ven_ventas_clientes vc
                    ON vc.id_cliente = c.id_cliente
                JOIN public.ven_ventas v
                    ON v.id_venta = vc.id_venta
                JOIN public.cfg_estados_venta ev
                    ON ev.id_estado_venta = v.id_estado_venta
                JOIN public.ven_contratos ct
                    ON ct.id_venta = v.id_venta
                JOIN public.cfg_estados_contrato ec
                    ON ec.id_estado_contrato =
                       ct.id_estado_contrato
                WHERE c.id_persona = x.id_persona AND (p_id_proyecto IS NULL OR EXISTS (
            SELECT 1 FROM public.inm_lotes lp
            WHERE lp.id_lote=v.id_lote AND lp.id_proyecto=p_id_proyecto
        ))
                  AND c.activo
                  AND ev.codigo IN (
                      'CONFIRMADA',
                      'CONTRATADA',
                      'COMPLETADA'
                  )
                  AND ec.codigo IN (
                      'VIGENTE',
                      'FINALIZADO'
                  )
            ) AS comprado

        FROM public.sp_listar_prospectos() x

        JOIN public.crm_prospectos p
            ON p.id_prospecto = x.id_prospecto

        -- NUEVO: incluir solo prospectos autorizados.
        WHERE (p_id_proyecto IS NULL OR EXISTS (
            SELECT 1 FROM public.crm_prospectos_intereses pi
            WHERE pi.id_prospecto=x.id_prospecto
              AND pi.id_proyecto=p_id_proyecto AND pi.activo
        ))
          AND COALESCE(
            public.fn_crm_puede_consultar_prospecto(
                p_actor,
                x.id_prospecto
            ),
            FALSE
        )
    ),

    registrados AS (
        SELECT *
        FROM prospectos
        WHERE fecha_registro >= p_desde
          AND fecha_registro < p_hasta_exclusivo
    ),

    compradores AS (
        SELECT
            c.id_cliente,
            MIN(
                COALESCE(
                    ct.fecha_firma::TIMESTAMP
                        AT TIME ZONE 'America/Lima',
                    ct.fecha_creacion
                )
            ) AS fecha_primera_formalizacion

        FROM public.crm_clientes c

        JOIN public.core_personas per
            ON per.id_persona = c.id_persona

        JOIN public.ven_ventas_clientes vc
            ON vc.id_cliente = c.id_cliente

        JOIN public.ven_ventas v
            ON v.id_venta = vc.id_venta

        JOIN public.cfg_estados_venta ev
            ON ev.id_estado_venta = v.id_estado_venta

        JOIN public.ven_contratos ct
            ON ct.id_venta = v.id_venta

        JOIN public.cfg_estados_contrato ec
            ON ec.id_estado_contrato =
               ct.id_estado_contrato

        WHERE c.activo
          AND (p_id_proyecto IS NULL OR EXISTS (
            SELECT 1 FROM public.inm_lotes lp
            WHERE lp.id_lote=v.id_lote AND lp.id_proyecto=p_id_proyecto
        ))
          AND per.activo
          AND ev.codigo IN (
              'CONFIRMADA',
              'CONTRATADA',
              'COMPLETADA'
          )
          AND ec.codigo IN (
              'VIGENTE',
              'FINALIZADO'
          )

          -- NUEVO: Gerencia y administracion pueden
          -- consultar todos los compradores.
          -- Los asesores solo los vinculados a
          -- prospectos de su cartera actual.
          AND (
              v_acceso_global

              OR EXISTS (
                  SELECT 1
                  FROM public.crm_prospectos cp
                  WHERE cp.id_persona = c.id_persona
                    AND COALESCE(
                        public.fn_crm_puede_consultar_prospecto(
                            p_actor,
                            cp.id_prospecto
                        ),
                        FALSE
                    )
              )
          )

        GROUP BY c.id_cliente
    )

    SELECT jsonb_build_object(
        'total', COUNT(*),

        'leads', COUNT(*) FILTER (
            WHERE NOT comprado
              AND estado_codigo IN (
                  'NUEVO',
                  'CONTACTADO',
                  'EN_SEGUIMIENTO'
              )
        ),

        'potenciales', COUNT(*) FILTER (
            WHERE NOT comprado
              AND estado_codigo IN (
                  'INTERESADO',
                  'NEGOCIACION','CON_RESERVA'
              )
        ),

        'cerrados', COUNT(*) FILTER (
            WHERE NOT comprado
              AND estado_codigo NOT IN (
                  'NUEVO',
                  'CONTACTADO',
                  'EN_SEGUIMIENTO',
                  'INTERESADO',
                  'NEGOCIACION','CON_RESERVA'
              )
        ),

        'sinAsesor', COUNT(*) FILTER (
            WHERE id_asesor IS NULL
        ),

        'compradores', (
            SELECT COUNT(*)
            FROM compradores
            WHERE fecha_primera_formalizacion >= p_desde
              AND fecha_primera_formalizacion < p_hasta_exclusivo
        )
    )
    INTO v_resultado
    FROM registrados;

    RETURN v_resultado;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_crm_puede_ver_comprobantes_separacion_v2(p_actor bigint, p_reserva bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
 SELECT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.view'::varchar),false)
 AND EXISTS(SELECT 1 FROM public.ven_reservas r JOIN public.inm_lotes l USING(id_lote)
  WHERE r.id_reserva=p_reserva AND (
    r.id_usuario_registro=p_actor OR EXISTS(SELECT 1 FROM public.seg_usuarios_roles ur JOIN public.seg_roles rol USING(id_rol)
      WHERE ur.id_usuario=p_actor AND ur.activo AND ur.fecha_revocacion IS NULL AND rol.activo AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'sales.scope_all'::varchar),false))
    OR EXISTS(SELECT 1 FROM public.crm_prospectos p JOIN public.crm_prospectos_intereses i USING(id_prospecto)
      WHERE p.id_persona=r.id_persona AND i.id_proyecto=l.id_proyecto AND i.activo AND public.fn_crm_puede_consultar_prospecto(p_actor,p.id_prospecto))
  ));
$function$;

CREATE OR REPLACE FUNCTION public.sp_crm_listar_anexos_contrato_v1(p_actor bigint, p_contrato bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_id_venta bigint;
  v_codigo_contrato text;
  v_codigo_venta text;
  v_id_lote bigint;
  v_codigo_lote text;
  v_estado_contrato text;
  v_resultado jsonb;
  v_alcance boolean;
BEGIN
  IF p_actor IS NULL OR p_actor <= 0 OR p_contrato IS NULL OR p_contrato <= 0 THEN
    RAISE EXCEPTION 'DATOS_INVALIDOS|Identificadores invalidos.';
  END IF;

  IF NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_actor, 'sales.view'),false) THEN
    RAISE EXCEPTION 'DENEGADO|Se requiere sales.view.';
  END IF;

  SELECT v.id_venta,c.codigo,v.codigo,v.id_lote,l.codigo,ec.codigo
  INTO v_id_venta,v_codigo_contrato,v_codigo_venta,v_id_lote,v_codigo_lote,v_estado_contrato
  FROM public.ven_contratos c
  JOIN public.ven_ventas v ON v.id_venta=c.id_venta
  JOIN public.inm_lotes l ON l.id_lote=v.id_lote
  JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=c.id_estado_contrato
  WHERE c.id_contrato=p_contrato;

  IF v_id_venta IS NULL THEN
    RAISE EXCEPTION 'CONTRATO_NO_EXISTE|El contrato no existe.';
  END IF;

  SELECT (
    EXISTS (
      SELECT 1 FROM public.seg_usuarios_roles ur
      JOIN public.seg_roles rol ON rol.id_rol=ur.id_rol
      WHERE ur.id_usuario=p_actor AND ur.activo
        AND ur.fecha_revocacion IS NULL AND rol.activo
        AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'sales.contract_scope_all'::varchar),false)
    )
    OR EXISTS (
      SELECT 1 FROM public.ven_ventas v
      WHERE v.id_venta=v_id_venta AND v.id_usuario_registro=p_actor
    )
    OR EXISTS (
      SELECT 1
      FROM public.com_ventas_asesores va
      JOIN public.com_asesores a ON a.id_asesor=va.id_asesor
      JOIN public.seg_usuarios u ON u.id_persona=a.id_persona
      WHERE va.id_venta=v_id_venta AND u.id_usuario=p_actor
    )
  ) INTO v_alcance;

  IF NOT COALESCE(v_alcance,false) THEN
    RAISE EXCEPTION 'DENEGADO|Sin alcance sobre la venta del contrato.';
  END IF;

  SELECT jsonb_build_object(
    'idContrato',p_contrato,
    'codigoContrato',v_codigo_contrato,
    'idVenta',v_id_venta,
    'codigoVenta',v_codigo_venta,
    'idLote',v_id_lote,
    'codigoLote',v_codigo_lote,
    'estadoContrato',v_estado_contrato,
    'documentos',COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'idAnexo',a.id_anexo,
        'tipoAnexo',a.tipo_anexo,
        'numeroVersion',a.numero_version,
        'nombreArchivoOriginal',a.nombre_archivo_original,
        'tipoMime',a.tipo_mime,
        'tamanoBytes',a.tamano_bytes,
        'vigente',a.vigente,
        'visibleCliente',a.visible_cliente,
        'fechaCarga',a.fecha_carga,
        'fechaPublicacionCliente',a.fecha_publicacion_cliente
      ) ORDER BY a.tipo_anexo, a.numero_version DESC)
      FROM public.ven_contratos_anexos a
      WHERE a.id_contrato=p_contrato
    ), '[]'::jsonb),
    'faltantes',COALESCE((
      SELECT jsonb_agg(t.tipo ORDER BY t.tipo)
      FROM (VALUES ('PLANO_LOTE'::text),('MEMORIA_DESCRIPTIVA'::text)) t(tipo)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.ven_contratos_anexos a
        WHERE a.id_contrato=p_contrato
          AND a.tipo_anexo=t.tipo AND a.vigente=true
      )
    ),'[]'::jsonb)
  ) INTO v_resultado;

  RETURN v_resultado;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_crm_listar_contratos_documentacion_v1(p_actor bigint, p_busqueda character varying DEFAULT NULL::character varying, p_pagina integer DEFAULT 1, p_tamano integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_busqueda text := NULLIF(btrim(p_busqueda), '');
    v_global boolean;
    v_resultado jsonb;
BEGIN
    IF p_actor IS NULL OR p_actor <= 0
       OR NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.view'),false) THEN
        RAISE EXCEPTION 'DENEGADO|Se requiere sales.view.';
    END IF;

    IF p_pagina IS NULL OR p_pagina < 1 OR p_pagina > 100000
       OR p_tamano IS NULL OR p_tamano < 1 OR p_tamano > 100
       OR length(p_busqueda) > 120 THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|Busqueda o paginacion invalida.';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.seg_usuarios_roles ur
        JOIN public.seg_roles rol ON rol.id_rol=ur.id_rol
        WHERE ur.id_usuario=p_actor
          AND ur.activo
          AND ur.fecha_revocacion IS NULL
          AND rol.activo
          AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'sales.contract_scope_all'::varchar),false)
    ) INTO v_global;

    WITH base AS (
        SELECT c.id_contrato,
               c.codigo::text AS codigo_contrato,
               c.id_venta,
               v.codigo::text AS codigo_venta,
               v.id_lote,
               l.codigo::text AS codigo_lote,
               pro.nombre::text AS nombre_proyecto,
               ec.codigo::text AS estado_contrato,
               ev.codigo::text AS estado_venta,
               c.fecha_creacion,
               COALESCE(comprador.nombre_completo,'Sin titular')::text AS comprador,
               EXISTS (
                 SELECT 1 FROM public.ven_contratos_archivos a
                 WHERE a.id_contrato=c.id_contrato AND a.vigente=true
               ) AS tiene_pdf_contrato,
               EXISTS (
                 SELECT 1 FROM public.ven_contratos_aprobaciones ap
                 JOIN public.ven_contratos_archivos a
                   ON a.id_contrato_archivo=ap.id_contrato_archivo
                  AND a.id_contrato=c.id_contrato
                  AND a.vigente=true
                 WHERE ap.id_contrato=c.id_contrato
                   AND ap.firma_revisada=true
                   AND ec.codigo='VIGENTE'
                   AND ev.codigo='CONTRATADA'
               ) AS tiene_pdf_aprobado,
               EXISTS (
                 SELECT 1 FROM public.ven_contratos_anexos a
                 WHERE a.id_contrato=c.id_contrato AND a.vigente=true
                   AND a.tipo_anexo='PLANO_LOTE'
               ) AS tiene_plano_lote,
               EXISTS (
                 SELECT 1 FROM public.ven_contratos_anexos a
                 WHERE a.id_contrato=c.id_contrato AND a.vigente=true
                   AND a.tipo_anexo='MEMORIA_DESCRIPTIVA'
               ) AS tiene_memoria_descriptiva
        FROM public.ven_contratos c
        JOIN public.ven_ventas v ON v.id_venta=c.id_venta
        JOIN public.inm_lotes l ON l.id_lote=v.id_lote
        JOIN public.inm_proyectos pro ON pro.id_proyecto=l.id_proyecto
        JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=c.id_estado_contrato
        JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=v.id_estado_venta
        LEFT JOIN LATERAL (
            SELECT NULLIF(btrim(concat_ws(' ',p.nombres,p.apellido_paterno,p.apellido_materno)),'') AS nombre_completo
            FROM public.ven_ventas_clientes vc
            JOIN public.crm_clientes cli ON cli.id_cliente=vc.id_cliente
            JOIN public.core_personas p ON p.id_persona=cli.id_persona
            WHERE vc.id_venta=v.id_venta AND vc.titular=true
            ORDER BY vc.id_venta_cliente DESC
            LIMIT 1
        ) comprador ON true
        WHERE v_global
           OR v.id_usuario_registro=p_actor
           OR EXISTS (
              SELECT 1
              FROM public.com_ventas_asesores va
              JOIN public.com_asesores asesor ON asesor.id_asesor=va.id_asesor
              JOIN public.seg_usuarios usuario ON usuario.id_persona=asesor.id_persona
              WHERE va.id_venta=v.id_venta
                AND usuario.id_usuario=p_actor
           )
    ), filtrado AS (
        SELECT * FROM base b
        WHERE v_busqueda IS NULL
           OR b.codigo_contrato ILIKE '%'||v_busqueda||'%'
           OR b.codigo_venta ILIKE '%'||v_busqueda||'%'
           OR b.codigo_lote ILIKE '%'||v_busqueda||'%'
           OR b.nombre_proyecto ILIKE '%'||v_busqueda||'%'
           OR b.comprador ILIKE '%'||v_busqueda||'%'
    )
    SELECT jsonb_build_object(
        'items',COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'idContrato',p.id_contrato,
                'codigoContrato',p.codigo_contrato,
                'idVenta',p.id_venta,
                'codigoVenta',p.codigo_venta,
                'idLote',p.id_lote,
                'codigoLote',p.codigo_lote,
                'nombreProyecto',p.nombre_proyecto,
                'comprador',p.comprador,
                'estadoContrato',p.estado_contrato,
                'estadoVenta',p.estado_venta,
                'tienePdfContrato',p.tiene_pdf_contrato,
                'tienePdfAprobado',p.tiene_pdf_aprobado,
                'tienePlanoLote',p.tiene_plano_lote,
                'tieneMemoriaDescriptiva',p.tiene_memoria_descriptiva
            ) ORDER BY p.fecha_creacion DESC,p.id_contrato DESC)
            FROM (
                SELECT * FROM filtrado
                ORDER BY fecha_creacion DESC,id_contrato DESC
                LIMIT p_tamano OFFSET (p_pagina-1)*p_tamano
            ) p
        ),'[]'::jsonb),
        'total',(SELECT COUNT(*) FROM filtrado),
        'pagina',p_pagina,
        'tamano',p_tamano
    ) INTO v_resultado;

    RETURN v_resultado;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_crm_listar_historial_comercial_lote_v1(p_actor bigint, p_id_lote bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE v_resultado jsonb;
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
          AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'sales.contract_scope_all'::varchar),false)
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

CREATE OR REPLACE FUNCTION public.sp_crm_listar_operaciones_v1(p_actor bigint, p_tipo text, p_busqueda text, p_pagina integer, p_tamano integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE v_resultado jsonb;
BEGIN
 IF p_actor IS NULL OR p_actor <= 0
 OR NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_actor, 'sales.view'::varchar),FALSE)
 THEN RAISE EXCEPTION 'DENEGADO|No autorizado para consultar operaciones comerciales.'; END IF;
 p_tipo := UPPER(BTRIM(COALESCE(p_tipo,'')));
 p_busqueda := LOWER(BTRIM(COALESCE(p_busqueda,'')));
 IF p_tipo NOT IN ('','VENTA','SEPARACION') THEN
  RAISE EXCEPTION 'DATOS_INVALIDOS|Tipo de operacion invalido.'; END IF;
 IF CHAR_LENGTH(p_busqueda)>120
 OR p_pagina IS NULL OR p_pagina<1 OR p_pagina>100000
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
                                 AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'sales.scope_all'::varchar),false)
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
                                          ad.apellido_materno),'')::text AS asesor,
                           NULL::text AS metodo_pago
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
                           COALESCE(
                               (SELECT mv.codigo::text
                                FROM public.ven_ventas vv
                                JOIN public.cfg_modalidades_venta mv
                                  ON mv.id_modalidad_venta=vv.id_modalidad_venta
                                WHERE vv.id_reserva=r.id_reserva
                                ORDER BY vv.fecha_venta DESC, vv.id_venta DESC
                                LIMIT 1),
                               r.modalidad_prevista::text
                           ) AS modalidad, r.monto_reserva, estado.codigo::text,
                           r.fecha_reserva, r.fecha_vencimiento,
                           NULL::text, NULL::text,
                           (
                               SELECT NULLIF(concat_ws(' ', ap.nombres, ap.apellido_paterno,
                                                      ap.apellido_materno), '')::text
                               FROM public.crm_prospectos pro
                               JOIN public.crm_prospectos_intereses pi
                                 ON pi.id_prospecto=pro.id_prospecto
                                AND pi.id_proyecto=l.id_proyecto
                               JOIN public.com_asignaciones_prospecto asep
                                 ON asep.id_prospecto=pro.id_prospecto
                               JOIN public.com_asesores ca
                                 ON ca.id_asesor=asep.id_asesor
                               JOIN public.core_personas ap
                                 ON ap.id_persona=ca.id_persona
                               WHERE pro.id_persona=r.id_persona
                                 AND asep.fecha_asignacion<=r.fecha_reserva
                                 AND (asep.fecha_fin IS NULL OR asep.fecha_fin>r.fecha_reserva)
                               ORDER BY asep.fecha_asignacion DESC, asep.id_asignacion_prospecto DESC
                               LIMIT 1
                           )::text AS asesor,
                           public.fn_crm_metodo_pago_reserva_v2(a.actor,r.id_reserva) AS metodo_pago
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
                      AND (a.acceso_global
                           OR EXISTS (
                               SELECT 1 FROM public.crm_prospectos p
                               JOIN public.crm_prospectos_intereses i
                                 ON i.id_prospecto=p.id_prospecto
                                AND i.id_proyecto=l.id_proyecto AND i.activo
                               WHERE p.id_persona=r.id_persona
                                 AND public.fn_crm_puede_consultar_prospecto(
                                     a.actor,p.id_prospecto)
                           ))
                      
                ), con_grupo AS (
 SELECT op.*, CASE WHEN op.tipo='SEPARACION' THEN public.fn_crm_grupo_operacion_sep_v1(a.actor,op.id) END AS grupo
 FROM operaciones op CROSS JOIN autorizacion a
 ), grupos AS (
 SELECT grupo->>'idGrupo' AS id_grupo,min(id) AS representante,
 string_agg(lote, ', ' ORDER BY id) AS lotes,
 string_agg(DISTINCT proyecto, ' / ' ORDER BY proyecto) AS proyectos,
 string_agg(codigo, ', ' ORDER BY id) AS codigos,
 sum(monto) AS monto_total,min(fecha_vencimiento) FILTER(WHERE estado IN ('PENDIENTE','VIGENTE')) AS vencimiento_abierto,
 string_agg(DISTINCT metodo_pago,' / ' ORDER BY metodo_pago) AS metodos,
 CASE WHEN bool_or(grupo->>'estado'='REQUIERE_REVISION') AND bool_or(estado IN ('PENDIENTE','VIGENTE')) THEN 'REQUIERE_REVISION'
 WHEN count(DISTINCT estado)=1 THEN min(estado) ELSE 'ESTADOS_MIXTOS' END AS estado_grupo,
 jsonb_agg(jsonb_build_object('idReserva',id,'codigo',codigo,'lote',lote,'proyecto',proyecto,'monto',monto,'estado',estado,'fechaVencimiento',fecha_vencimiento) ORDER BY id) AS integrantes
 FROM con_grupo WHERE grupo IS NOT NULL GROUP BY grupo->>'idGrupo'
 ), agrupadas AS (
 SELECT op.id,op.fecha,op.tipo,op.codigo,coalesce(g.lotes,op.lote) AS lote,coalesce(g.proyectos,op.proyecto) AS proyecto,op.comprador,g.codigos,
 (to_jsonb(op)-'grupo') || CASE WHEN g.id_grupo IS NULL THEN '{}'::jsonb ELSE
 jsonb_build_object('id_grupo',g.id_grupo,'lotes_grupo',g.integrantes,'lote',g.lotes,'proyecto',g.proyectos,'monto',g.monto_total,
 'metodo_pago',g.metodos,'estado',g.estado_grupo,'fecha_vencimiento',g.vencimiento_abierto) END AS item
 FROM con_grupo op LEFT JOIN grupos g ON g.id_grupo=op.grupo->>'idGrupo'
 WHERE g.id_grupo IS NULL OR op.id=g.representante
 ), filtradas AS (
 SELECT op.* FROM agrupadas op CROSS JOIN autorizacion a
 WHERE (a.tipo='' OR op.tipo=a.tipo) AND (a.busqueda='' OR lower(op.codigo) LIKE '%'||a.busqueda||'%'
 OR lower(op.lote) LIKE '%'||a.busqueda||'%' OR lower(op.proyecto) LIKE '%'||a.busqueda||'%'
 OR lower(op.comprador) LIKE '%'||a.busqueda||'%' OR lower(coalesce(op.codigos,'')) LIKE '%'||a.busqueda||'%')
 )
 SELECT jsonb_build_object('items',coalesce((SELECT jsonb_agg(f.item ORDER BY f.fecha DESC,f.id DESC)
 FROM (SELECT * FROM filtradas ORDER BY fecha DESC,id DESC LIMIT p_tamano OFFSET ((p_pagina-1)*p_tamano)) f),'[]'::jsonb),
 'total',(SELECT count(*) FROM filtradas),'pagina',p_pagina,'tamano',p_tamano,
 'paginas',ceil((SELECT count(*) FROM filtradas)::numeric/p_tamano)::integer) INTO v_resultado;
 RETURN v_resultado;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_crm34_asignar(actor bigint, prospecto bigint, asesor bigint)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    vigente bigint;
    v_asesor bigint := asesor;
    v_asesor_propio bigint;
    v_cantidad bigint;
    v_es_gestor boolean;
    v_es_asesor boolean;
BEGIN
    -- Captaciones web sin actor: no se atribuyen a un asesor del navegador.
    IF actor IS NULL THEN
        IF asesor IS NOT NULL THEN
            RAISE EXCEPTION 'DENEGADO|La captacion web no puede asignar asesores.';
        END IF;
        RETURN;
    END IF;

    -- Solo perfiles comerciales de gestion pueden escoger a otro asesor.
    SELECT EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ur
        JOIN public.seg_roles r ON r.id_rol = ur.id_rol
        WHERE ur.id_usuario = actor
          AND ur.activo
          AND ur.fecha_revocacion IS NULL
          AND r.activo
          AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.assign_advisor'::varchar),false)
    ) INTO v_es_gestor;

    IF NOT v_es_gestor THEN
        SELECT EXISTS (
            SELECT 1
            FROM public.seg_usuarios_roles ur
            JOIN public.seg_roles r ON r.id_rol = ur.id_rol
            WHERE ur.id_usuario = actor
              AND ur.activo
              AND ur.fecha_revocacion IS NULL
              AND r.activo
              AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.scope_assigned'::varchar),false)
        ) INTO v_es_asesor;

        IF v_es_asesor THEN
            SELECT min(a.id_asesor), count(*)
            INTO v_asesor_propio, v_cantidad
            FROM public.seg_usuarios u
            JOIN public.com_asesores a ON a.id_persona = u.id_persona
            JOIN public.cfg_estados_asesor e ON e.id_estado_asesor = a.id_estado_asesor
            JOIN public.core_personas p ON p.id_persona = a.id_persona
            WHERE u.id_usuario = actor
              AND e.activo
              AND e.permite_operar
              AND p.activo
              AND a.fecha_inicio <= CURRENT_DATE
              AND (a.fecha_fin IS NULL OR a.fecha_fin >= CURRENT_DATE);

            IF v_cantidad <> 1 THEN
                RAISE EXCEPTION 'ASESOR_INVALIDO|La cuenta debe tener un unico asesor comercial operativo.';
            END IF;

            IF asesor IS NOT NULL AND asesor <> v_asesor_propio THEN
                RAISE EXCEPTION 'DENEGADO|Un asesor solo puede asignarse sus propios leads.';
            END IF;
            v_asesor := v_asesor_propio;
        ELSIF asesor IS NOT NULL THEN
            RAISE EXCEPTION 'DENEGADO|El usuario no puede seleccionar un asesor.';
        END IF;
    END IF;

    -- Los gestores pueden dejar el lead pendiente de asignacion.
    IF v_asesor IS NULL THEN
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.com_asesores a
        JOIN public.cfg_estados_asesor e ON e.id_estado_asesor = a.id_estado_asesor
        JOIN public.core_personas p ON p.id_persona = a.id_persona
        WHERE a.id_asesor = v_asesor
          AND e.activo AND e.permite_operar AND p.activo
          AND a.fecha_inicio <= CURRENT_DATE
          AND (a.fecha_fin IS NULL OR a.fecha_fin >= CURRENT_DATE)
    ) THEN
        RAISE EXCEPTION 'ASESOR_INVALIDO|El asesor no esta disponible para operar.';
    END IF;

    SELECT id_asesor INTO vigente
    FROM public.com_asignaciones_prospecto
    WHERE id_prospecto = prospecto AND fecha_fin IS NULL
    FOR UPDATE;

    IF vigente = v_asesor THEN
        RETURN;
    END IF;
    IF vigente IS NOT NULL THEN
        RAISE EXCEPTION 'ASESOR_YA_ASIGNADO|El prospecto ya tiene un asesor; revise su asignacion.';
    END IF;

    INSERT INTO public.com_asignaciones_prospecto
        (id_prospecto, id_asesor, motivo_asignacion, id_usuario_asignacion)
    VALUES
        (prospecto, v_asesor, 'Asignacion inicial desde captacion', actor);

    INSERT INTO public.crm_seguimientos
        (id_prospecto, id_tipo_seguimiento, asunto, detalle, resultado,
         requiere_seguimiento, id_usuario_registro)
    VALUES
        (prospecto,
         public.fn_crm33_catalogo('public.cfg_tipos_seguimiento', 'id_tipo_seguimiento', 'OTRO'),
         'Asignacion inicial', 'Asesor ' || v_asesor::text, 'Prospecto asignado',
         FALSE, actor);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_crm_indicadores_retroceso_v2(p_actor bigint, p_desde timestamp with time zone, p_hasta_exclusivo timestamp with time zone, p_asesor bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_resultado jsonb;
BEGIN
    IF p_actor IS NULL OR p_actor<=0
      OR NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_actor,'crm.view'::varchar),false)
      OR NOT EXISTS (
        SELECT 1 FROM public.seg_usuarios_roles ur
        JOIN public.seg_roles r ON r.id_rol=ur.id_rol
        WHERE ur.id_usuario=p_actor AND ur.activo AND ur.fecha_revocacion IS NULL
          AND r.activo AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.approve_stage_change'::varchar),false)
      ) THEN
      RAISE EXCEPTION 'DENEGADO|Solo Gerencia o Supervisor comercial pueden consultar indicadores de retrocesos.';
    END IF;

    IF p_desde IS NULL OR p_hasta_exclusivo IS NULL
      OR p_hasta_exclusivo<=p_desde
      OR p_hasta_exclusivo>p_desde+interval '10 years'
      OR (p_asesor IS NOT NULL AND p_asesor<=0) THEN
      RAISE EXCEPTION 'DATOS_INVALIDOS|Rango de fechas invalido.';
    END IF;

    WITH base AS (
      SELECT s.id_solicitud,s.estado,s.fecha_solicitud,s.fecha_resolucion,
             s.id_asesor_solicitante AS id_asesor, 
             concat_ws(' ',per.nombres,per.apellido_paterno,per.apellido_materno) AS asesor,
             m.codigo AS motivo_codigo,m.nombre AS motivo_nombre
      FROM public.crm_solicitudes_retroceso_etapa s
      JOIN public.cfg_motivos_retroceso_crm m ON m.id_motivo=s.id_motivo
      JOIN public.com_asesores a ON a.id_asesor=s.id_asesor_solicitante
      JOIN public.core_personas per ON per.id_persona=a.id_persona
      WHERE (p_asesor IS NULL OR s.id_asesor_solicitante=p_asesor)
        AND s.fecha_solicitud >= p_desde
        AND s.fecha_solicitud < p_hasta_exclusivo
    ),
    motivos_aprobados AS (
       SELECT motivo_codigo AS codigo,motivo_nombre AS nombre,count(*) AS cantidad
       FROM base WHERE estado='APROBADA'
       GROUP BY motivo_codigo,motivo_nombre
    ),
    motivos_solicitados AS (
       SELECT motivo_codigo AS codigo,motivo_nombre AS nombre,count(*) AS cantidad
       FROM base GROUP BY motivo_codigo,motivo_nombre
    ),
    asesores_aprobados AS (
       SELECT id_asesor,asesor AS nombre,count(*) AS cantidad
       FROM base WHERE estado='APROBADA'
       GROUP BY id_asesor,asesor
    ),
    meses AS (
       SELECT to_char(fecha_solicitud AT TIME ZONE 'America/Lima','YYYY-MM') AS mes,
              count(*) AS solicitudes,
              count(*) FILTER (WHERE estado='PENDIENTE') AS pendientes,
              count(*) FILTER (WHERE estado='APROBADA') AS aprobadas,
              count(*) FILTER (WHERE estado='RECHAZADA') AS rechazadas
       FROM base
       GROUP BY to_char(fecha_solicitud AT TIME ZONE 'America/Lima','YYYY-MM')
    ),
    resumen AS (
       SELECT count(*) AS total,
              count(*) FILTER (WHERE estado='PENDIENTE') AS pendientes,
              count(*) FILTER (WHERE estado='APROBADA') AS aprobadas,
              count(*) FILTER (WHERE estado='RECHAZADA') AS rechazadas,
              COALESCE(
                  round(
                    100.0 * count(*) FILTER (WHERE estado='APROBADA')
                    / NULLIF(count(*) FILTER (WHERE estado IN ('APROBADA','RECHAZADA')),0),
                    1
                  ),0
              ) AS tasa_aprobacion
       FROM base
    )
    SELECT jsonb_build_object(
       'totalSolicitudes',r.total,
       'pendientes',r.pendientes,
       'aprobadas',r.aprobadas,
       'rechazadas',r.rechazadas,
       'totalRetornos',r.aprobadas,
       'tasaAprobacion',r.tasa_aprobacion,
       'motivoMasComun',(
          SELECT jsonb_build_object('codigo',m.codigo,'nombre',m.nombre,'cantidad',m.cantidad)
          FROM motivos_aprobados m ORDER BY m.cantidad DESC,m.codigo LIMIT 1
       ),
       'asesorMasRetornos',(
          SELECT jsonb_build_object('idAsesor',a.id_asesor,'nombre',a.nombre,'cantidad',a.cantidad)
          FROM asesores_aprobados a ORDER BY a.cantidad DESC,a.id_asesor LIMIT 1
       ),
       'motivos',COALESCE((
          SELECT jsonb_agg(jsonb_build_object('codigo',x.codigo,'nombre',x.nombre,'cantidad',x.cantidad)
                           ORDER BY x.cantidad DESC,x.codigo)
          FROM motivos_aprobados x
       ),'[]'::jsonb),
       'motivosSolicitudes',COALESCE((
          SELECT jsonb_agg(jsonb_build_object('codigo',x.codigo,'nombre',x.nombre,'cantidad',x.cantidad)
                           ORDER BY x.cantidad DESC,x.codigo)
          FROM motivos_solicitados x
       ),'[]'::jsonb),
       'rankingAsesores',COALESCE((
          SELECT jsonb_agg(jsonb_build_object('idAsesor',x.id_asesor,'nombre',x.nombre,'retornos',x.cantidad)
                           ORDER BY x.cantidad DESC,x.id_asesor)
          FROM (SELECT * FROM asesores_aprobados ORDER BY cantidad DESC,id_asesor LIMIT 10) x
       ),'[]'::jsonb),
       'evolucionMensual',COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'mes',x.mes,'solicitudes',x.solicitudes,
            'pendientes',x.pendientes,'aprobadas',x.aprobadas,'rechazadas',x.rechazadas
          ) ORDER BY x.mes)
          FROM meses x
       ),'[]'::jsonb)
    )
    INTO v_resultado FROM resumen r;

    RETURN v_resultado;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_crm_listar_solicitudes_retroceso_v2(p_actor bigint, p_desde timestamp with time zone, p_hasta_exclusivo timestamp with time zone, p_estado character varying DEFAULT NULL::character varying, p_busqueda character varying DEFAULT NULL::character varying, p_pagina integer DEFAULT 1, p_tamano integer DEFAULT 20, p_asesor bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_resultado jsonb;
BEGIN
    IF p_actor IS NULL OR p_actor <= 0
       OR NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_actor,'crm.view'::varchar),false)
       OR NOT EXISTS (
           SELECT 1
           FROM public.seg_usuarios_roles ur
           JOIN public.seg_roles r ON r.id_rol=ur.id_rol
           WHERE ur.id_usuario=p_actor AND ur.activo
             AND ur.fecha_revocacion IS NULL AND r.activo
             AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.approve_stage_change'::varchar),false)
       ) THEN
        RAISE EXCEPTION 'DENEGADO|Solo Gerencia o Supervisor comercial pueden consultar la bandeja de retrocesos.';
    END IF;

    IF p_desde IS NULL OR p_hasta_exclusivo IS NULL
       OR p_hasta_exclusivo <= p_desde
       OR p_hasta_exclusivo > p_desde + interval '10 years'
       OR p_pagina IS NULL OR p_pagina < 1 OR p_pagina > 100000
       OR p_tamano IS NULL OR p_tamano < 1 OR p_tamano > 100
       OR length(p_busqueda)>120 OR length(p_estado)>12
       OR (p_asesor IS NOT NULL AND p_asesor <= 0)
       OR (p_estado IS NOT NULL AND upper(btrim(p_estado)) NOT IN ('TODAS','PENDIENTE','APROBADA','RECHAZADA'))
    THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|Filtros, fechas o paginacion invalidos.';
    END IF;

    WITH filtrado AS (
        SELECT
            s.id_solicitud,
            s.id_prospecto,
            cp.codigo AS codigo_prospecto,
            concat_ws(' ',pper.nombres,pper.apellido_paterno,pper.apellido_materno) AS nombre_prospecto,
            s.id_usuario_solicitante,
            concat_ws(' ',psol.nombres,psol.apellido_paterno,psol.apellido_materno) AS nombre_solicitante,
            s.id_asesor_solicitante AS id_asesor,
            concat_ws(' ',pase.nombres,pase.apellido_paterno,pase.apellido_materno) AS nombre_asesor,
            orig.codigo AS etapa_origen,
            orig.nombre AS nombre_etapa_origen,
            dest.codigo AS etapa_destino,
            dest.nombre AS nombre_etapa_destino,
            actual.codigo AS etapa_actual,
            s.id_motivo,
            m.codigo AS motivo_codigo,
            m.nombre AS motivo_nombre,
            s.motivo_detallado,
            (s.evidencia_storage_path IS NOT NULL) AS tiene_evidencia,
            s.estado,
            s.id_usuario_revisor,
            concat_ws(' ',prev.nombres,prev.apellido_paterno,prev.apellido_materno) AS nombre_revisor,
            s.observacion_revision,
            s.fecha_solicitud,
            s.fecha_resolucion
        FROM public.crm_solicitudes_retroceso_etapa s
        JOIN public.crm_prospectos cp ON cp.id_prospecto=s.id_prospecto
        JOIN public.core_personas pper ON pper.id_persona=cp.id_persona
        JOIN public.seg_usuarios usol ON usol.id_usuario=s.id_usuario_solicitante
        JOIN public.core_personas psol ON psol.id_persona=usol.id_persona
        JOIN public.com_asesores a ON a.id_asesor=s.id_asesor_solicitante
        JOIN public.core_personas pase ON pase.id_persona=a.id_persona
        JOIN public.cfg_estados_prospecto orig ON orig.id_estado_prospecto=s.id_estado_origen
        JOIN public.cfg_estados_prospecto dest ON dest.id_estado_prospecto=s.id_estado_destino
        JOIN public.cfg_estados_prospecto actual ON actual.id_estado_prospecto=cp.id_estado_prospecto
        JOIN public.cfg_motivos_retroceso_crm m ON m.id_motivo=s.id_motivo
        LEFT JOIN public.seg_usuarios urev ON urev.id_usuario=s.id_usuario_revisor
        LEFT JOIN public.core_personas prev ON prev.id_persona=urev.id_persona
        WHERE (p_asesor IS NULL OR s.id_asesor_solicitante = p_asesor)
          AND s.fecha_solicitud >= p_desde
          AND s.fecha_solicitud < p_hasta_exclusivo
          AND (
            p_estado IS NULL OR upper(btrim(p_estado))='TODAS'
            OR s.estado=upper(btrim(p_estado))
          )
          AND (
             NULLIF(btrim(p_busqueda),'') IS NULL
             OR concat_ws(' ',pper.nombres,pper.apellido_paterno,pper.apellido_materno) ILIKE '%'||btrim(p_busqueda)||'%'
             OR concat_ws(' ',pase.nombres,pase.apellido_paterno,pase.apellido_materno) ILIKE '%'||btrim(p_busqueda)||'%'
             OR cp.codigo ILIKE '%'||btrim(p_busqueda)||'%'
             OR m.nombre ILIKE '%'||btrim(p_busqueda)||'%'
             OR s.motivo_detallado ILIKE '%'||btrim(p_busqueda)||'%'
          )
    ),
    pagina AS (
        SELECT * FROM filtrado
        ORDER BY CASE WHEN estado='PENDIENTE' THEN 0 ELSE 1 END,
                 fecha_solicitud DESC,id_solicitud DESC
        LIMIT p_tamano OFFSET ((p_pagina::bigint-1)*p_tamano)
    )
    SELECT jsonb_build_object(
        'items',COALESCE((
           SELECT jsonb_agg(to_jsonb(pg)
             ORDER BY CASE WHEN pg.estado='PENDIENTE' THEN 0 ELSE 1 END,
                      pg.fecha_solicitud DESC,pg.id_solicitud DESC)
           FROM pagina pg
        ),'[]'::jsonb),
        'total',(SELECT count(*) FROM filtrado),
        'pagina',p_pagina,
        'tamano',p_tamano,
        'paginas',ceil((SELECT count(*)::numeric FROM filtrado)/p_tamano)::integer
    )
    INTO v_resultado;

    RETURN v_resultado;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_crm_resolver_retroceso_v1(p_actor bigint, p_solicitud bigint, p_aprobar boolean, p_observacion text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_s public.crm_solicitudes_retroceso_etapa%ROWTYPE;
  v_actual integer;
  v_persona bigint;
  v_origen varchar;
  v_destino varchar;
  v_tipo integer;
  v_codigo_actual varchar;
  v_resultado varchar;
BEGIN
  IF p_actor IS NULL
    OR NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_actor,'crm.edit'::varchar),false)
    OR NOT EXISTS (
      SELECT 1 FROM public.seg_usuarios_roles ur
      JOIN public.seg_roles r ON r.id_rol=ur.id_rol
      WHERE ur.id_usuario=p_actor AND ur.activo AND ur.fecha_revocacion IS NULL
        AND r.activo AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.approve_stage_change'::varchar),false)
    ) THEN
    RAISE EXCEPTION 'DENEGADO|Solo Gerencia o Supervisor comercial pueden resolver solicitudes.';
  END IF;
  IF p_solicitud IS NULL OR p_solicitud<=0 OR p_aprobar IS NULL
    OR length(coalesce(p_observacion,''))>1000 THEN
    RAISE EXCEPTION 'DATOS_INVALIDOS|La solicitud, decision u observacion es invalida.';
  END IF;
  IF NOT p_aprobar AND length(btrim(coalesce(p_observacion,'')))<10 THEN
    RAISE EXCEPTION 'DATOS_INVALIDOS|Indique el motivo de rechazo (minimo 10 caracteres).';
  END IF;

  SELECT * INTO v_s FROM public.crm_solicitudes_retroceso_etapa
    WHERE id_solicitud=p_solicitud FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SOLICITUD_NO_EXISTE|La solicitud no existe.';
  END IF;
  IF v_s.estado<>'PENDIENTE' THEN
    RAISE EXCEPTION 'SOLICITUD_RESUELTA|La solicitud ya tiene una decision.';
  END IF;
  IF v_s.id_usuario_solicitante=p_actor THEN
    RAISE EXCEPTION 'DENEGADO|No esta permitido aprobar o rechazar una solicitud propia.';
  END IF;
  IF p_aprobar AND v_s.evidencia_storage_path IS NULL THEN
    RAISE EXCEPTION 'EVIDENCIA_REQUERIDA|Debe adjuntarse una imagen de evidencia antes de aprobar la solicitud.';
  END IF;

  SELECT p.id_estado_prospecto,p.id_persona INTO v_actual,v_persona
  FROM public.crm_prospectos p
  WHERE p.id_prospecto=v_s.id_prospecto AND p.activo
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROSPECTO_NO_EXISTE|El prospecto ya no esta activo.';
  END IF;
  IF p_aprobar AND v_actual<>v_s.id_estado_origen THEN
    RAISE EXCEPTION 'ETAPA_DESACTUALIZADA|La etapa actual del prospecto cambio; revise la solicitud.';
  END IF;

  SELECT codigo INTO v_codigo_actual FROM public.cfg_estados_prospecto
    WHERE id_estado_prospecto=v_actual;
  SELECT codigo INTO v_origen FROM public.cfg_estados_prospecto
    WHERE id_estado_prospecto=v_s.id_estado_origen;
  SELECT codigo INTO v_destino FROM public.cfg_estados_prospecto
    WHERE id_estado_prospecto=v_s.id_estado_destino AND activo;

  IF v_origen NOT IN ('INTERESADO','NEGOCIACION')
     OR v_destino NOT IN ('NUEVO','CONTACTADO','EN_SEGUIMIENTO') THEN
    RAISE EXCEPTION 'TRANSICION_INVALIDA|Las etapas ya no permiten este retroceso.';
  END IF;
  IF p_aprobar AND EXISTS (
    SELECT 1 FROM public.crm_clientes c
    JOIN public.ven_ventas_clientes vc ON vc.id_cliente=c.id_cliente
    WHERE c.id_persona=v_persona
  ) THEN
    RAISE EXCEPTION 'VENTA_EXISTENTE|No se puede aprobar retroceso con venta vinculada.';
  END IF;
  IF p_aprobar THEN
    UPDATE public.crm_prospectos SET
      id_estado_prospecto=v_s.id_estado_destino,fecha_actualizacion=NOW()
    WHERE id_prospecto=v_s.id_prospecto;
  END IF;

  UPDATE public.crm_solicitudes_retroceso_etapa SET
    estado=CASE WHEN p_aprobar THEN 'APROBADA' ELSE 'RECHAZADA' END,
    id_usuario_revisor=p_actor,
    observacion_revision=NULLIF(btrim(p_observacion),''),
    fecha_resolucion=NOW(),
    fecha_actualizacion=NOW()
  WHERE id_solicitud=v_s.id_solicitud;

  SELECT id_tipo_seguimiento INTO v_tipo
  FROM public.cfg_tipos_seguimiento WHERE codigo='OTRO' AND activo;
  IF v_tipo IS NULL THEN
    RAISE EXCEPTION 'CATALOGO_INVALIDO|Falta el tipo de seguimiento OTRO.';
  END IF;
  v_resultado:=CASE WHEN p_aprobar THEN 'Retroceso aprobado' ELSE 'Retroceso rechazado' END;

  INSERT INTO public.crm_seguimientos
    (id_prospecto,id_tipo_seguimiento,asunto,detalle,resultado,
     requiere_seguimiento,id_usuario_registro)
  VALUES
    (v_s.id_prospecto,v_tipo,'Revision de retroceso CRM',
     v_origen||' -> '||v_destino||' | Solicitud #'||v_s.id_solicitud||
     ' | Motivo: '||v_s.motivo_detallado||
     coalesce(' | Observacion de revision: '||nullif(btrim(p_observacion),''),''),
     v_resultado,p_aprobar,p_actor);

  PERFORM public.sp_registrar_auditoria(
    p_actor,'CRM',CASE WHEN p_aprobar THEN 'APROBAR_RETROCESO' ELSE 'RECHAZAR_RETROCESO' END,
    'crm_solicitudes_retroceso_etapa',p_solicitud::varchar,'EXITOSO',v_resultado,
    jsonb_build_object('idProspecto',v_s.id_prospecto,'origen',v_origen,
      'destino',v_destino,'idSolicitante',v_s.id_usuario_solicitante)
  );

  RETURN jsonb_build_object(
    'id_solicitud',v_s.id_solicitud,'id_prospecto',v_s.id_prospecto,
    'estado',CASE WHEN p_aprobar THEN 'APROBADA' ELSE 'RECHAZADA' END,
    'estado_actual',CASE WHEN p_aprobar THEN v_destino ELSE v_codigo_actual END,
    'etapa_modificada',p_aprobar
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_crm_ruta_evidencia_retroceso_v1(p_actor bigint, p_solicitud bigint)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE v_s public.crm_solicitudes_retroceso_etapa%ROWTYPE;
BEGIN
 IF p_actor IS NULL OR p_actor<=0
    OR p_solicitud IS NULL OR p_solicitud<=0
    OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'crm.view'::varchar),false)
 THEN RAISE EXCEPTION 'DENEGADO|Se requiere crm.view.'; END IF;

 SELECT * INTO v_s FROM public.crm_solicitudes_retroceso_etapa WHERE id_solicitud=p_solicitud;
 IF NOT FOUND THEN RAISE EXCEPTION 'SOLICITUD_NO_EXISTE|La solicitud no existe.'; END IF;
 IF NOT EXISTS (
    SELECT 1 FROM public.seg_usuarios_roles ur JOIN public.seg_roles r ON r.id_rol=ur.id_rol
    WHERE ur.id_usuario=p_actor AND ur.activo AND ur.fecha_revocacion IS NULL AND r.activo
      AND (coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.approve_stage_change'::varchar),false)
           OR (coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.request_stage_change'::varchar),false) AND v_s.id_usuario_solicitante=p_actor))
 ) THEN RAISE EXCEPTION 'DENEGADO|No tiene acceso a la evidencia de esta solicitud.'; END IF;

 IF v_s.evidencia_storage_path IS NULL THEN
   RAISE EXCEPTION 'EVIDENCIA_NO_EXISTE|La solicitud no tiene evidencia adjunta.';
 END IF;
 IF v_s.evidencia_storage_path NOT LIKE ('solicitudes/'||p_solicitud::text||'/%') THEN
   RAISE EXCEPTION 'EVIDENCIA_INVALIDA|La ruta de evidencia no corresponde a esta solicitud.';
 END IF;
 RETURN v_s.evidencia_storage_path;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_crm_avisar_cambio_reserva_v1(p_solicitud bigint, p_decision boolean)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE s record; v_tipo integer; v_titulo text; v_msg text;
BEGIN
 SELECT c.*,a.codigo lote_anterior,b.codigo lote_nuevo,pr.nombre proyecto_nuevo INTO s FROM public.crm_solicitudes_cambio_reserva_v1 c
 JOIN public.inm_lotes a ON a.id_lote=c.id_lote_anterior JOIN public.inm_lotes b ON b.id_lote=c.id_lote_nuevo JOIN public.inm_proyectos pr ON pr.id_proyecto=b.id_proyecto WHERE c.id_solicitud=p_solicitud;
 IF NOT FOUND THEN RETURN; END IF;
 SELECT id_tipo_notificacion INTO STRICT v_tipo FROM public.cfg_tipos_notificacion WHERE codigo='GENERAL' AND activo;
 v_titulo:=CASE WHEN p_decision THEN 'Cambio de reserva '||lower(s.estado) ELSE 'Solicitud de cambio de reserva' END;
 v_msg:='Lote '||s.lote_anterior||' → '||s.lote_nuevo||' ('||s.proyecto_nuevo||'). '||CASE WHEN p_decision THEN 'Decisión: '||s.estado ELSE 'Pendiente de revisión de Gerencia o Supervisión.' END;
 INSERT INTO public.not_notificaciones(id_persona,id_tipo_notificacion,titulo,mensaje,url_destino,referencia_modulo,referencia_entidad,referencia_id,clave_deduplicacion)
 SELECT DISTINCT u.id_persona,v_tipo,v_titulo,v_msg,'/ventas?tab=cambios-reserva','CRM','CAMBIO_RESERVA',s.id_solicitud::text,
 'crm:cambio:'||s.id_solicitud||':'||s.estado||':'||u.id_persona
 FROM public.seg_usuarios u JOIN public.cfg_estados_usuario eu USING(id_estado_usuario) JOIN public.seg_usuarios_roles ur USING(id_usuario) JOIN public.seg_roles ro USING(id_rol)
 WHERE eu.codigo='ACTIVO' AND ur.activo AND ur.fecha_revocacion IS NULL AND ro.activo AND public.fn_usuario_tiene_permiso_seguridad(u.id_usuario,'sales.view'::varchar)
 AND ((NOT p_decision AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'sales.approve_reservation_change'::varchar),false)) OR (p_decision AND u.id_usuario=s.id_solicitante))
 ON CONFLICT(clave_deduplicacion) DO NOTHING;
END; $function$;

CREATE OR REPLACE FUNCTION public.fn_crm_publicar_reserva_vencida_v1(p_historial bigint)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE h record; v_prospecto bigint; v_tipo integer; v_seguimiento integer; v_detalle text;
BEGIN
 SELECT a.id_reserva,a.fecha_evento,r.codigo,r.id_persona,l.codigo lote,pr.nombre proyecto
 INTO h FROM public.crm_anulaciones_historial a JOIN public.ven_reservas r USING(id_reserva)
 JOIN public.inm_lotes l USING(id_lote) JOIN public.inm_proyectos pr USING(id_proyecto)
 WHERE a.id_historial=p_historial AND a.evento='ANULACION_PLAZO_VENCIDO' AND a.origen='SISTEMA';
 IF NOT FOUND THEN RETURN; END IF;
 SELECT id_prospecto INTO v_prospecto FROM public.crm_prospectos WHERE id_persona=h.id_persona AND activo;
 SELECT id_tipo_notificacion INTO STRICT v_tipo FROM public.cfg_tipos_notificacion WHERE codigo='RESERVA_VENCIDA' AND activo;
 SELECT id_tipo_seguimiento INTO STRICT v_seguimiento FROM public.cfg_tipos_seguimiento WHERE codigo='OTRO' AND activo;
 v_detalle:='Reserva '||h.codigo||' vencida. Lote '||h.lote||' del proyecto '||h.proyecto||' liberado automáticamente.';
 IF v_prospecto IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.crm_seguimientos WHERE id_prospecto=v_prospecto AND asunto='Reserva vencida' AND detalle=v_detalle) THEN
   INSERT INTO public.crm_seguimientos(id_prospecto,id_tipo_seguimiento,fecha_seguimiento,asunto,detalle,resultado,requiere_seguimiento,id_usuario_registro)
   VALUES(v_prospecto,v_seguimiento,h.fecha_evento,'Reserva vencida',v_detalle,'Separación anulada por plazo vencido; lote liberado',true,NULL);
 END IF;
 -- Gerencia y supervisión reciben todos los vencimientos; el asesor solo su cartera asignada.
 INSERT INTO public.not_notificaciones(id_persona,id_tipo_notificacion,titulo,mensaje,url_destino,referencia_modulo,referencia_entidad,referencia_id,datos_contexto,clave_deduplicacion,fecha_generacion)
 SELECT DISTINCT u.id_persona,v_tipo,'Reserva vencida',v_detalle,'/ventas','CRM','RESERVA',h.id_reserva::text,
 jsonb_build_object('idReserva',h.id_reserva,'lote',h.lote,'codigo',h.codigo),
 'crm:reserva_vencida:'||h.id_reserva||':'||u.id_persona,h.fecha_evento
 FROM public.seg_usuarios u JOIN public.cfg_estados_usuario eu USING(id_estado_usuario)
 JOIN public.seg_usuarios_roles ur USING(id_usuario) JOIN public.seg_roles ro USING(id_rol)
 WHERE eu.codigo='ACTIVO' AND ur.activo AND ur.fecha_revocacion IS NULL AND ro.activo
 AND public.fn_usuario_tiene_permiso_seguridad(u.id_usuario,'sales.view'::varchar)
 AND (coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'sales.notify_expiry_all'::varchar),false) OR EXISTS(
 SELECT 1 FROM public.com_asignaciones_prospecto ap JOIN public.com_asesores ca USING(id_asesor)
 WHERE ap.id_prospecto=v_prospecto AND ap.fecha_fin IS NULL AND ca.id_persona=u.id_persona))
 ON CONFLICT(clave_deduplicacion) DO NOTHING;
END; $function$;

CREATE OR REPLACE FUNCTION public.sp_crm_asignar_asesor_v3(p_actor bigint, p_prospecto bigint, p_asesor bigint, p_motivo character varying DEFAULT NULL::character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_actual_id BIGINT;
    v_actual_asesor BIGINT;
    v_persona BIGINT;
    v_estado TEXT;
    v_nombre TEXT;
    v_tipo INTEGER;
    v_nuevo BIGINT;
BEGIN
    -- Verificar permiso de edicion vigente.
    IF p_actor IS NULL OR NOT COALESCE(
        public.fn_usuario_tiene_permiso_seguridad(
            p_actor, 'crm.edit'
        ), FALSE
    ) THEN
        RAISE EXCEPTION
            'DENEGADO|No tiene permiso crm.edit.';
    END IF;

    -- Solo roles administrativos pueden asignar asesores.
    IF NOT EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ur
        JOIN public.seg_roles r
            ON r.id_rol = ur.id_rol
        WHERE ur.id_usuario = p_actor
          AND ur.activo = TRUE
          AND ur.fecha_revocacion IS NULL
          AND r.activo = TRUE
          AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.assign_advisor'::varchar),false)
    ) THEN
        RAISE EXCEPTION
            'DENEGADO|La asignacion de asesores requiere un rol administrativo autorizado.';
    END IF;

    -- Validaciones originales.
    IF p_prospecto IS NULL
       OR p_prospecto <= 0
       OR p_asesor IS NULL
       OR p_asesor <= 0
       OR LENGTH(p_motivo) > 255
    THEN
        RAISE EXCEPTION
            'DATOS_INVALIDOS|Prospecto, asesor o motivo invalidos.';
    END IF;

    SELECT p.id_persona, e.codigo
    INTO v_persona, v_estado
    FROM public.crm_prospectos p
    JOIN public.cfg_estados_prospecto e
        ON e.id_estado_prospecto = p.id_estado_prospecto
    WHERE p.id_prospecto = p_prospecto
      AND p.activo
    FOR UPDATE OF p;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'PROSPECTO_NO_EXISTE|Prospecto no encontrado o inactivo.';
    END IF;

    IF v_estado IN (
        'CONVERTIDO', 'NO_INTERESADO', 'DESCARTADO'
    )
       OR EXISTS (
           SELECT 1
           FROM public.crm_clientes c
           JOIN public.ven_ventas_clientes vc
               ON vc.id_cliente = c.id_cliente
           WHERE c.id_persona = v_persona
       )
    THEN
        RAISE EXCEPTION
            'PROSPECTO_CERRADO|No se puede reasignar un prospecto cerrado o vendido.';
    END IF;

    SELECT TRIM(
        CONCAT_WS(
            ' ',
            per.nombres,
            per.apellido_paterno,
            per.apellido_materno
        )
    )
    INTO v_nombre
    FROM public.com_asesores a
    JOIN public.cfg_estados_asesor es
        ON es.id_estado_asesor = a.id_estado_asesor
    JOIN public.core_personas per
        ON per.id_persona = a.id_persona
    WHERE a.id_asesor = p_asesor
      AND es.activo
      AND es.permite_operar
      AND per.activo
      AND a.fecha_inicio <= CURRENT_DATE
      AND (
          a.fecha_fin IS NULL
          OR a.fecha_fin >= CURRENT_DATE
      );

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'ASESOR_INVALIDO|El asesor no esta habilitado.';
    END IF;

    SELECT
        a.id_asignacion_prospecto,
        a.id_asesor
    INTO v_actual_id, v_actual_asesor
    FROM public.com_asignaciones_prospecto a
    WHERE a.id_prospecto_vigente = p_prospecto
    FOR UPDATE;

    IF v_actual_asesor = p_asesor THEN
        RETURN jsonb_build_object(
            'id_prospecto', p_prospecto,
            'id_asesor', p_asesor,
            'id_asignacion', v_actual_id,
            'sin_cambios', TRUE
        );
    END IF;

    IF v_actual_id IS NOT NULL THEN
        UPDATE public.com_asignaciones_prospecto
        SET
            fecha_fin = GREATEST(
                NOW(), fecha_asignacion
            ),
            id_usuario_cierre = p_actor,
            motivo_cierre = 'Reasignacion CRM',
            fecha_actualizacion = NOW()
        WHERE id_asignacion_prospecto = v_actual_id;
    END IF;

    INSERT INTO public.com_asignaciones_prospecto (
        id_prospecto,
        id_asesor,
        motivo_asignacion,
        id_usuario_asignacion
    )
    VALUES (
        p_prospecto,
        p_asesor,
        COALESCE(
            NULLIF(BTRIM(p_motivo), ''),
            'Asignacion CRM'
        ),
        p_actor
    )
    RETURNING id_asignacion_prospecto INTO v_nuevo;

    SELECT t.id_tipo_seguimiento
    INTO v_tipo
    FROM public.cfg_tipos_seguimiento t
    WHERE t.codigo = 'OTRO'
      AND t.activo;

    IF v_tipo IS NULL THEN
        RAISE EXCEPTION
            'CATALOGO_INVALIDO|No existe el tipo OTRO.';
    END IF;

    INSERT INTO public.crm_seguimientos (
        id_prospecto,
        id_tipo_seguimiento,
        asunto,
        detalle,
        resultado,
        requiere_seguimiento,
        id_usuario_registro
    )
    VALUES (
        p_prospecto,
        v_tipo,
        'Asignacion de asesor CRM',
        'Asesor: ' || v_nombre ||
            COALESCE(
                ' | ' || NULLIF(BTRIM(p_motivo), ''),
                ''
            ),
        'Asignado',
        FALSE,
        p_actor
    );

    RETURN jsonb_build_object(
        'id_prospecto', p_prospecto,
        'id_asesor', p_asesor,
        'asesor_nombre', v_nombre,
        'id_asignacion', v_nuevo,
        'sin_cambios', FALSE
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_crm_decidir_cambio_reserva_v1(p_actor bigint, p_solicitud bigint, p_aprobar boolean, p_motivo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE s public.crm_solicitudes_cambio_reserva_v1%ROWTYPE; r record; v_grupo uuid; v_destino jsonb; v_disp integer; v_reservado integer; v_tipo integer; v_fin jsonb; v_com jsonb;
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.view'::varchar),false) OR NOT EXISTS(
 SELECT 1 FROM public.seg_usuarios_roles ur JOIN public.seg_roles ro USING(id_rol) WHERE ur.id_usuario=p_actor AND ur.activo AND ur.fecha_revocacion IS NULL AND ro.activo AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'sales.approve_reservation_change'::varchar),false))
 THEN RAISE EXCEPTION 'DENEGADO|Solo Gerencia o Supervisor comercial puede decidir.'; END IF;
 IF p_aprobar IS NULL OR length(btrim(coalesce(p_motivo,''))) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Indique el sustento de la decisión.'; END IF;
 SELECT * INTO s FROM public.crm_solicitudes_cambio_reserva_v1 WHERE id_solicitud=p_solicitud;
 IF NOT FOUND OR s.estado<>'PENDIENTE' THEN RAISE EXCEPTION 'OPERACION_INVALIDA|La solicitud ya fue resuelta.'; END IF;
 IF s.id_solicitante=p_actor THEN RAISE EXCEPTION 'DENEGADO|La aprobación debe realizarla otro usuario.'; END IF;
 IF p_aprobar THEN
   SELECT id_grupo INTO v_grupo FROM public.ven_separaciones_grupo_lotes_v1 WHERE id_reserva=s.id_reserva;
   -- Mismo orden de bloqueo que vencimiento y validación financiera de separaciones.
   PERFORM 1 FROM public.inm_lotes l WHERE l.id_lote IN (
    SELECT s.id_lote_anterior UNION SELECT s.id_lote_nuevo UNION
    SELECT r0.id_lote FROM public.ven_reservas r0 JOIN public.ven_separaciones_grupo_lotes_v1 g USING(id_reserva) WHERE g.id_grupo=v_grupo
   ) ORDER BY l.id_lote FOR UPDATE;
   IF v_grupo IS NOT NULL THEN PERFORM 1 FROM public.ven_separaciones_grupo_v1 WHERE id_grupo=v_grupo FOR UPDATE; END IF;
   SELECT r0.*,e.codigo estado,l.id_proyecto,el.codigo estado_lote INTO r FROM public.ven_reservas r0 JOIN public.cfg_estados_reserva e USING(id_estado_reserva)
   JOIN public.inm_lotes l USING(id_lote) JOIN public.cfg_estados_lote el USING(id_estado_lote)
   WHERE r0.id_reserva=s.id_reserva FOR UPDATE OF r0;
   IF NOT FOUND OR r.id_lote<>s.id_lote_anterior OR r.estado NOT IN ('PENDIENTE','VIGENTE') OR r.fecha_vencimiento<=now()
     OR r.estado_lote<>'RESERVADO' OR EXISTS(SELECT 1 FROM public.ven_ventas WHERE id_reserva=r.id_reserva)
     OR EXISTS(SELECT 1 FROM public.ven_ventas v JOIN public.cfg_estados_venta e USING(id_estado_venta) WHERE v.id_lote=r.id_lote AND e.codigo<>'ANULADA')
     OR EXISTS(SELECT 1 FROM public.ven_reservas z JOIN public.cfg_estados_reserva e USING(id_estado_reserva) WHERE z.id_lote=r.id_lote AND z.id_reserva<>r.id_reserva AND e.codigo IN ('PENDIENTE','VIGENTE'))
   THEN RAISE EXCEPTION 'OPERACION_INVALIDA|La reserva cambió o venció; no se puede trasladar.'; END IF;
   PERFORM 1 FROM public.crm_prospectos WHERE id_prospecto=s.id_prospecto AND id_persona=r.id_persona AND activo FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'OPERACION_INVALIDA|Prospecto no disponible.'; END IF;
   v_destino:=public.fn_crm_destino_cambio_reserva_v1(s.id_lote_nuevo,r.id_moneda);
   IF v_destino IS DISTINCT FROM s.destino OR (v_destino->>'precio')::numeric<=r.monto_reserva THEN RAISE EXCEPTION 'OPERACION_INVALIDA|El precio o la política del destino cambió; rechace y solicite nuevamente.'; END IF;
   IF s.antes IS DISTINCT FROM jsonb_build_object('idProyecto',r.id_proyecto,'idMoneda',r.id_moneda,'monto',r.monto_reserva,'idPolitica',r.id_politica_financiera,'fin',r.politica_financiera_snapshot,'com',r.politica_comercial_snapshot,'vence',r.fecha_vencimiento)
   THEN RAISE EXCEPTION 'OPERACION_INVALIDA|Las condiciones de origen cambiaron; solicite nuevamente.'; END IF;
   SELECT id_estado_lote INTO STRICT v_disp FROM public.cfg_estados_lote WHERE codigo='DISPONIBLE' AND activo;
   SELECT id_estado_lote INTO STRICT v_reservado FROM public.cfg_estados_lote WHERE codigo='RESERVADO' AND activo;
 END IF;
 PERFORM 1 FROM public.crm_solicitudes_cambio_reserva_v1 WHERE id_solicitud=p_solicitud AND estado='PENDIENTE' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'OPERACION_INVALIDA|La solicitud ya fue resuelta.'; END IF;
 IF p_aprobar THEN
   UPDATE public.crm_solicitudes_cambio_reserva_v1 SET estado='APLICANDO',id_decisor=p_actor,decision=btrim(p_motivo),fecha_decision=now() WHERE id_solicitud=p_solicitud;
   v_fin:=v_destino->'fin';v_com:=nullif(v_destino->'com','null'::jsonb);
   -- Se conserva id de reserva, abonos, distribuciones, monto y vencimiento originales.
   UPDATE public.ven_reservas SET id_lote=s.id_lote_nuevo,id_politica_financiera=(v_fin->>'idPolitica')::bigint,
    politica_financiera_snapshot=v_fin,politica_comercial_snapshot=v_com,fecha_actualizacion=now() WHERE id_reserva=r.id_reserva;
   UPDATE public.inm_lotes SET id_estado_lote=v_disp,fecha_actualizacion=now() WHERE id_lote=s.id_lote_anterior;
   UPDATE public.inm_lotes SET id_estado_lote=v_reservado,fecha_actualizacion=now() WHERE id_lote=s.id_lote_nuevo;
   INSERT INTO public.inm_lotes_historial_estado(id_lote,id_estado_anterior,id_estado_nuevo,motivo,id_usuario)
   VALUES(s.id_lote_anterior,v_reservado,v_disp,'Traslado de reserva aprobado #'||s.id_solicitud,p_actor),(s.id_lote_nuevo,v_disp,v_reservado,'Traslado de reserva aprobado #'||s.id_solicitud,p_actor);
   -- Conservar el interés histórico. Si el nuevo proyecto no era de interés, agregarlo.
   IF NOT EXISTS(SELECT 1 FROM public.crm_prospectos_intereses WHERE id_prospecto=s.id_prospecto AND id_proyecto=(v_destino->>'idProyecto')::bigint AND activo) THEN
     INSERT INTO public.crm_prospectos_intereses(id_prospecto,id_proyecto,id_lote_interes,comentario,activo)
     VALUES(s.id_prospecto,(v_destino->>'idProyecto')::bigint,s.id_lote_nuevo,'Traslado aprobado #'||s.id_solicitud,true);
   END IF;
   UPDATE public.crm_prospectos_intereses SET id_lote_interes=s.id_lote_nuevo,fecha_actualizacion=now()
   WHERE id_prospecto=s.id_prospecto AND id_proyecto=(v_destino->>'idProyecto')::bigint AND activo AND (id_lote_interes=s.id_lote_anterior OR id_lote_interes IS NULL);
   UPDATE public.crm_solicitudes_cambio_reserva_v1 SET estado='APROBADA' WHERE id_solicitud=p_solicitud;
 ELSE
   UPDATE public.crm_solicitudes_cambio_reserva_v1 SET estado='RECHAZADA',id_decisor=p_actor,decision=btrim(p_motivo),fecha_decision=now() WHERE id_solicitud=p_solicitud;
 END IF;
 SELECT id_tipo_seguimiento INTO STRICT v_tipo FROM public.cfg_tipos_seguimiento WHERE codigo='OTRO' AND activo;
 INSERT INTO public.crm_seguimientos(id_prospecto,id_tipo_seguimiento,asunto,detalle,resultado,requiere_seguimiento,id_usuario_registro)
 VALUES(s.id_prospecto,v_tipo,CASE WHEN p_aprobar THEN 'Cambio de reserva aprobado' ELSE 'Cambio de reserva rechazado' END,
 'Solicitud #'||s.id_solicitud||' · '||(SELECT codigo FROM public.inm_lotes WHERE id_lote=s.id_lote_anterior)||' → '||(SELECT codigo FROM public.inm_lotes WHERE id_lote=s.id_lote_nuevo)||'. '||btrim(p_motivo),CASE WHEN p_aprobar THEN 'Lote cambiado; abonos conservados' ELSE 'Reserva original conservada' END,false,p_actor);
 PERFORM public.fn_crm_avisar_cambio_reserva_v1(p_solicitud,true);
 RETURN jsonb_build_object('idSolicitud',p_solicitud,'estado',CASE WHEN p_aprobar THEN 'APROBADA' ELSE 'RECHAZADA' END);
END; $function$;

CREATE OR REPLACE FUNCTION public.sp_crm_listar_cambios_reserva_v1(p_actor bigint, p_prospecto bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE v_global boolean;
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.view'::varchar),false) THEN RAISE EXCEPTION 'DENEGADO|Se requiere sales.view.'; END IF;
 SELECT EXISTS(SELECT 1 FROM public.seg_usuarios_roles ur JOIN public.seg_roles ro USING(id_rol) WHERE ur.id_usuario=p_actor AND ur.activo AND ur.fecha_revocacion IS NULL AND ro.activo AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'sales.approve_reservation_change'::varchar),false)) INTO v_global;
 RETURN jsonb_build_object('items',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.fecha DESC) FROM (
 SELECT c.id_solicitud "idSolicitud",c.id_prospecto "idProspecto",c.id_reserva "idReserva",c.id_lote_anterior "idLoteAnterior",c.id_lote_nuevo "idLoteNuevo",
 a.codigo "loteAnterior",b.codigo "loteNuevo",pa.nombre "proyectoAnterior",pb.nombre "proyectoNuevo",r.codigo "codigoReserva",
 concat_ws(' ',per.nombres,per.apellido_paterno,per.apellido_materno) cliente,c.motivo,c.estado,c.decision,c.fecha_solicitud fecha,
 (v_global AND c.id_solicitante<>p_actor AND c.estado='PENDIENTE') "puedeDecidir",
 (c.antes->>'monto')::numeric credito,(c.destino->>'precio')::numeric "precioDestino",
 (c.destino->'fin'->>'montoSeparacion')::numeric "separacionDestino"
 FROM public.crm_solicitudes_cambio_reserva_v1 c JOIN public.crm_prospectos pro USING(id_prospecto) JOIN public.core_personas per USING(id_persona)
 JOIN public.ven_reservas r USING(id_reserva) JOIN public.inm_lotes a ON a.id_lote=c.id_lote_anterior JOIN public.inm_lotes b ON b.id_lote=c.id_lote_nuevo
 JOIN public.inm_proyectos pa ON pa.id_proyecto=a.id_proyecto JOIN public.inm_proyectos pb ON pb.id_proyecto=b.id_proyecto
 WHERE (p_prospecto IS NULL OR c.id_prospecto=p_prospecto) AND (v_global OR c.id_solicitante=p_actor OR public.fn_crm_puede_consultar_prospecto(p_actor,c.id_prospecto))
 ORDER BY (c.estado='PENDIENTE') DESC,c.fecha_solicitud DESC LIMIT 100
 ) x),'[]'::jsonb));
END; $function$;

CREATE OR REPLACE FUNCTION public.fn_crm_puede_consultar_operacion_anulacion_v1(p_actor bigint, p_tipo character varying, p_id_operacion bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
  SELECT
    p_actor IS NOT NULL AND p_actor>0
    AND p_id_operacion IS NOT NULL AND p_id_operacion>0
    AND COALESCE(public.fn_usuario_tiene_permiso_seguridad(
          p_actor,'annulments.view'::varchar),false)
    AND (
      -- Alcance global, coherente con el listado actual de operaciones.
      (
        EXISTS (
          SELECT 1 FROM public.seg_usuarios_roles ur
          JOIN public.seg_roles rol ON rol.id_rol=ur.id_rol
          WHERE ur.id_usuario=p_actor
            AND ur.activo AND ur.fecha_revocacion IS NULL
            AND rol.activo
            AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'annulments.scope_all'::varchar),false)
        )
        AND (
          (p_tipo='VENTA' AND EXISTS (
             SELECT 1 FROM public.ven_ventas v
             WHERE v.id_venta=p_id_operacion
          ))
          OR
          (p_tipo='SEPARACION' AND EXISTS (
             SELECT 1 FROM public.ven_reservas r
             WHERE r.id_reserva=p_id_operacion
          ))
        )
      )
      OR
      -- Venta de registro propio o cartera asociada.
      (p_tipo='VENTA' AND EXISTS (
         SELECT 1 FROM public.ven_ventas v
         WHERE v.id_venta=p_id_operacion
           AND (
             v.id_usuario_registro=p_actor
             OR EXISTS (
               SELECT 1 FROM public.com_ventas_asesores va
               JOIN public.com_asesores a ON a.id_asesor=va.id_asesor
               JOIN public.seg_usuarios u ON u.id_persona=a.id_persona
               WHERE va.id_venta=v.id_venta AND u.id_usuario=p_actor
             )
           )
      ))
      OR
      -- Separación de registro propio o de prospecto en cartera.
      (p_tipo='SEPARACION' AND EXISTS (
         SELECT 1 FROM public.ven_reservas r
         JOIN public.inm_lotes l ON l.id_lote=r.id_lote
         WHERE r.id_reserva=p_id_operacion
           AND (
             r.id_usuario_registro=p_actor
             OR EXISTS (
               SELECT 1 FROM public.crm_prospectos pro
               JOIN public.crm_prospectos_intereses i
                 ON i.id_prospecto=pro.id_prospecto
                AND i.id_proyecto=l.id_proyecto AND i.activo
               WHERE pro.id_persona=r.id_persona
                 AND public.fn_crm_puede_consultar_prospecto(p_actor,pro.id_prospecto)
             )
           )
      ))
    );
$function$;

CREATE OR REPLACE FUNCTION public.sp_crm_desactivar_prospecto_v5(p_actor bigint, p_prospecto bigint, p_motivo character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_persona BIGINT;
    v_activo BOOLEAN;
    v_tipo INTEGER;
BEGIN
    -- 1. Exigir permiso de desactivacion.
    IF p_actor IS NULL
       OR p_actor <= 0
       OR NOT COALESCE(
           public.fn_usuario_tiene_permiso_seguridad(
               p_actor, 'crm.delete'
           ), FALSE
       )
    THEN
        RAISE EXCEPTION
            'DENEGADO|Se requiere crm.delete.';
    END IF;

    -- 2. Exigir perfil comercial autorizado.
    IF NOT EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ur
        JOIN public.seg_roles r
            ON r.id_rol = ur.id_rol
        WHERE ur.id_usuario = p_actor
          AND ur.activo
          AND ur.fecha_revocacion IS NULL
          AND r.activo
          AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.deactivate_prospect'::varchar),false)
    )
    THEN
        RAISE EXCEPTION
            'DENEGADO|No tiene perfil autorizado para desactivar prospectos.';
    END IF;

    -- 3. Validar datos.
    IF p_prospecto IS NULL
       OR p_prospecto <= 0
       OR p_motivo IS NULL
       OR LENGTH(BTRIM(p_motivo)) < 10
       OR LENGTH(p_motivo) > 500
    THEN
        RAISE EXCEPTION
            'DATOS_INVALIDOS|Debe justificar la baja (10-500 caracteres).';
    END IF;

    -- 4. Bloquear el registro durante la operacion.
    SELECT id_persona, activo
    INTO v_persona, v_activo
    FROM public.crm_prospectos
    WHERE id_prospecto = p_prospecto
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'PROSPECTO_NO_EXISTE|Prospecto no encontrado.';
    END IF;

    -- Conservar comportamiento idempotente original.
    IF NOT v_activo THEN
        RETURN JSONB_BUILD_OBJECT(
            'id_prospecto', p_prospecto,
            'activo', FALSE,
            'sin_cambios', TRUE
        );
    END IF;

    -- 5. Validar autorizacion comercial centralizada.
    IF NOT COALESCE(
        public.fn_crm_puede_consultar_prospecto(
            p_actor, p_prospecto
        ), FALSE
    )
    THEN
        RAISE EXCEPTION
            'DENEGADO|No tiene autorizacion comercial sobre este prospecto.';
    END IF;

    -- No permitir baja con dinero en revision o una reserva vigente.
    IF EXISTS (
        SELECT 1 FROM public.ven_reservas res
        JOIN public.cfg_estados_reserva er
          ON er.id_estado_reserva=res.id_estado_reserva
        WHERE res.id_persona=v_persona
          AND er.codigo IN ('PENDIENTE','VIGENTE')
    ) THEN
        RAISE EXCEPTION 'RESERVA_ACTIVA|Debe resolver las separaciones pendientes o vigentes antes de desactivar al prospecto.';
    END IF;

    -- 6. No desactivar prospectos con ventas vigentes.
    IF EXISTS (
        SELECT 1
        FROM public.crm_clientes c
        JOIN public.ven_ventas_clientes vc
            ON vc.id_cliente = c.id_cliente
        JOIN public.ven_ventas v
            ON v.id_venta = vc.id_venta
        JOIN public.cfg_estados_venta ev
            ON ev.id_estado_venta = v.id_estado_venta
        WHERE c.id_persona = v_persona
          AND ev.codigo <> 'ANULADA'
    )
    THEN
        RAISE EXCEPTION
            'VENTA_EXISTENTE|No se desactiva un prospecto con operaciones comerciales.';
    END IF;

    -- 7. No desactivar con visitas pendientes.
    IF EXISTS (
        SELECT 1
        FROM public.crm_visitas
        WHERE id_prospecto = p_prospecto
          AND activo
          AND estado IN (
              'PROGRAMADA',
              'CONFIRMADA'
          )
    )
    THEN
        RAISE EXCEPTION
            'VISITAS_PENDIENTES|Cancele las visitas pendientes antes de desactivar.';
    END IF;

    -- 8. Obtener tipo de seguimiento.
    SELECT id_tipo_seguimiento
    INTO v_tipo
    FROM public.cfg_tipos_seguimiento
    WHERE codigo = 'OTRO'
      AND activo;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'CATALOGO_INVALIDO|No existe el tipo de seguimiento OTRO.';
    END IF;

    -- 9. Registrar trazabilidad.
    INSERT INTO public.crm_seguimientos (
        id_prospecto,
        id_tipo_seguimiento,
        asunto,
        detalle,
        resultado,
        requiere_seguimiento,
        id_usuario_registro
    )
    VALUES (
        p_prospecto,
        v_tipo,
        'Prospecto desactivado',
        BTRIM(p_motivo),
        'DESACTIVADO',
        FALSE,
        p_actor
    );

    -- 10. Realizar desactivacion logica.
    UPDATE public.crm_prospectos
    SET activo = FALSE,
        fecha_actualizacion = NOW()
    WHERE id_prospecto = p_prospecto;

    RETURN JSONB_BUILD_OBJECT(
        'id_prospecto', p_prospecto,
        'activo', FALSE,
        'sin_cambios', FALSE
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_crm_registrar_venta_pendiente_v10(p_actor bigint, p_prospecto bigint, p_lote bigint, p_modalidad character varying, p_monto_total numeric, p_monto_inicial numeric, p_numero_cuotas integer, p_tasa_mensual_pct numeric, p_observaciones text, p_datos jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
 v_persona bigint; v_origen integer; v_doc_tipo integer; v_asignado bigint; v_nuevo_asesor bigint;
 v_nombre text; v_paterno text; v_materno text; v_email text; v_telefono text;
 v_doc text; v_tipo text; v_direccion text; v_motivo text; v_mensaje text;
 v_proyecto bigint; v_contacto_id bigint; v_doc_id bigint; v_dir_id bigint;
 v_valor text; v_verificado boolean; v_actual_tipo integer;
 v_resultado jsonb; v_tipo_contacto integer;
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.create'::varchar),false)
    OR NOT coalesce(public.fn_crm_puede_consultar_prospecto(p_actor,p_prospecto),false)
 THEN RAISE EXCEPTION 'DENEGADO|No puede registrar esta venta.'; END IF;
 IF p_datos IS NULL OR jsonb_typeof(p_datos)<>'object'
    OR (p_datos->>'idProspecto') IS DISTINCT FROM p_prospecto::text
 THEN RAISE EXCEPTION 'DATOS_COMPRADOR_REQUERIDOS|Revise los datos del cliente antes de registrar.'; END IF;
 PERFORM 1 FROM public.inm_lotes WHERE id_lote=p_lote FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'LOTE_NO_DISPONIBLE|Lote inexistente.'; END IF;
 SELECT id_persona INTO STRICT v_persona FROM public.crm_prospectos
 WHERE id_prospecto=p_prospecto AND activo FOR UPDATE;
 PERFORM 1 FROM public.core_personas
 WHERE id_persona=v_persona AND activo FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'PERSONA_INVALIDA|La persona no esta activa.'; END IF;

 v_nombre:=btrim(coalesce(p_datos->>'nombres',''));
 v_paterno:=btrim(coalesce(p_datos->>'apellidoPaterno',''));
 v_materno:=btrim(coalesce(p_datos->>'apellidoMaterno',''));
 v_email:=lower(btrim(coalesce(p_datos->>'correo','')));
 v_telefono:=btrim(coalesce(p_datos->>'telefono',''));
 v_tipo:=upper(btrim(coalesce(p_datos->>'tipoDocumento','')));
 v_doc:=upper(btrim(coalesce(p_datos->>'numeroDocumento','')));
 v_direccion:=btrim(coalesce(p_datos->>'direccion',''));
 v_motivo:=btrim(coalesce(p_datos->>'motivoContacto',''));
 v_mensaje:=btrim(coalesce(p_datos->>'mensaje',''));
 IF v_nombre !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
    OR length(v_nombre)<2 OR length(v_nombre)>120
    OR v_paterno !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
    OR length(v_paterno)<2 OR length(v_paterno)>80
    OR (v_materno<>'' AND
       (v_materno !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
       OR length(v_materno)>80))
    OR length(concat_ws(' ',v_nombre,v_paterno,nullif(v_materno,'')))>150
    OR v_email !~ '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$'
    OR length(v_email)>180 OR v_telefono !~ '^([0-9]{7,15}|\+[1-9][0-9]{6,14})$'
    OR length(v_direccion)>255 OR length(v_motivo)=0 OR length(v_motivo)>150
    OR length(v_mensaje)>4000
 THEN RAISE EXCEPTION 'DATOS_COMPRADOR_INVALIDOS|Revise nombres, contacto, direccion y motivo.'; END IF;
 IF NOT (CASE v_tipo
   WHEN 'DNI' THEN v_doc ~ '^[0-9]{8}$'
   WHEN 'RUC' THEN v_doc ~ '^[0-9]{11}$'
   WHEN 'CE' THEN v_doc ~ '^[0-9]{9,12}$'
   WHEN 'PASAPORTE' THEN v_doc ~ '^[A-Z0-9]{6,20}$'
   ELSE false END)
 THEN RAISE EXCEPTION 'DOCUMENTO_INVALIDO|El documento no cumple el formato indicado.'; END IF;
 SELECT id_tipo_documento INTO v_doc_tipo FROM public.cfg_tipos_documento
 WHERE codigo=v_tipo AND activo;
 SELECT id_origen_prospecto INTO v_origen FROM public.cfg_origenes_prospecto
 WHERE codigo=p_datos->>'origenCodigo' AND activo;
 IF v_doc_tipo IS NULL OR v_origen IS NULL
 THEN RAISE EXCEPTION 'CATALOGO_INVALIDO|Documento u origen no valido.'; END IF;
 IF coalesce(p_datos->>'idProyectoInteres','') !~ '^[0-9]+$'
 THEN RAISE EXCEPTION 'PROYECTO_INVALIDO|Seleccione un proyecto.'; END IF;
 v_proyecto:=(p_datos->>'idProyectoInteres')::bigint;
 IF NOT EXISTS(SELECT 1 FROM public.inm_proyectos WHERE id_proyecto=v_proyecto AND activo)
 THEN RAISE EXCEPTION 'PROYECTO_INVALIDO|Proyecto inactivo o inexistente.'; END IF;

 -- Un cambio en documentos/contactos verificados requiere su flujo formal de evidencias.
 SELECT d.id_persona_documento,d.id_tipo_documento,d.numero_documento,d.verificado
 INTO v_doc_id,v_actual_tipo,v_valor,v_verificado
 FROM public.core_personas_documentos d
 WHERE d.id_persona=v_persona AND d.activo
 ORDER BY d.principal DESC,d.id_persona_documento DESC LIMIT 1 FOR UPDATE;
 IF v_doc_id IS NOT NULL AND
     (v_actual_tipo<>v_doc_tipo OR upper(btrim(v_valor))<>v_doc) THEN
   IF v_verificado THEN
     RAISE EXCEPTION 'DOCUMENTO_VERIFICADO|El cambio requiere revision documental con evidencias.';
   END IF;
   UPDATE public.core_personas_documentos SET
     id_tipo_documento=v_doc_tipo,numero_documento=v_doc,verificado=false,
     fecha_actualizacion=now()
   WHERE id_persona_documento=v_doc_id;
 ELSIF v_doc_id IS NULL THEN
   INSERT INTO public.core_personas_documentos(
     id_persona,id_tipo_documento,numero_documento,principal,verificado
   ) VALUES(v_persona,v_doc_tipo,v_doc,true,false);
 END IF;

 SELECT id_tipo_contacto INTO STRICT v_tipo_contacto FROM public.cfg_tipos_contacto
 WHERE codigo='EMAIL' AND activo;
 SELECT id_persona_contacto,valor,verificado INTO v_contacto_id,v_valor,v_verificado
 FROM public.core_personas_contactos
 WHERE id_persona=v_persona AND id_tipo_contacto=v_tipo_contacto AND activo
 ORDER BY principal DESC,id_persona_contacto DESC LIMIT 1 FOR UPDATE;
 IF v_contacto_id IS NOT NULL AND lower(btrim(v_valor))<>v_email THEN
   IF v_verificado THEN
     RAISE EXCEPTION 'CORREO_VERIFICADO|El cambio de correo requiere confirmacion de identidad.';
   END IF;
   UPDATE public.core_personas_contactos SET valor=v_email,verificado=false,
      fecha_actualizacion=now() WHERE id_persona_contacto=v_contacto_id;
 ELSIF v_contacto_id IS NULL THEN
   INSERT INTO public.core_personas_contactos(
     id_persona,id_tipo_contacto,valor,principal,verificado,permite_notificaciones)
   VALUES(v_persona,v_tipo_contacto,v_email,true,false,false);
 END IF;

 SELECT id_tipo_contacto INTO STRICT v_tipo_contacto FROM public.cfg_tipos_contacto
 WHERE codigo='CELULAR' AND activo;
 v_contacto_id:=NULL;v_valor:=NULL;v_verificado:=NULL;
 SELECT id_persona_contacto,valor,verificado INTO v_contacto_id,v_valor,v_verificado
 FROM public.core_personas_contactos
 WHERE id_persona=v_persona AND id_tipo_contacto=v_tipo_contacto AND activo
 ORDER BY principal DESC,id_persona_contacto DESC LIMIT 1 FOR UPDATE;
 IF v_contacto_id IS NOT NULL AND regexp_replace(v_valor,'[ ()-]','','g')<>v_telefono THEN
   IF v_verificado THEN
     RAISE EXCEPTION 'TELEFONO_VERIFICADO|El cambio de telefono requiere verificacion.';
   END IF;
   UPDATE public.core_personas_contactos SET valor=v_telefono,verificado=false,
      fecha_actualizacion=now() WHERE id_persona_contacto=v_contacto_id;
 ELSIF v_contacto_id IS NULL THEN
   INSERT INTO public.core_personas_contactos(
     id_persona,id_tipo_contacto,valor,principal,verificado,permite_notificaciones)
   VALUES(v_persona,v_tipo_contacto,v_telefono,true,false,false);
 END IF;

 UPDATE public.core_personas SET nombres=v_nombre,apellido_paterno=v_paterno,
   apellido_materno=nullif(v_materno,''),fecha_actualizacion=now()
 WHERE id_persona=v_persona;

 IF v_direccion<>'' THEN
   SELECT id_persona_direccion INTO v_dir_id
   FROM public.core_personas_direcciones WHERE id_persona=v_persona AND activo
   ORDER BY principal DESC,id_persona_direccion DESC LIMIT 1 FOR UPDATE;
   IF v_dir_id IS NOT NULL THEN
     UPDATE public.core_personas_direcciones SET direccion=v_direccion,
       fecha_actualizacion=now() WHERE id_persona_direccion=v_dir_id;
   ELSE
     INSERT INTO public.core_personas_direcciones(id_persona,tipo,direccion,principal)
       VALUES(v_persona,'DOMICILIO',v_direccion,true);
   END IF;
 END IF;
 UPDATE public.crm_prospectos SET id_origen_prospecto=v_origen,
   fecha_actualizacion=now() WHERE id_prospecto=p_prospecto;
 UPDATE public.crm_prospectos_intereses
   SET fecha_interes=now(),fecha_actualizacion=now()
 WHERE id_prospecto=p_prospecto AND id_proyecto=v_proyecto AND activo;
 IF NOT FOUND THEN
   INSERT INTO public.crm_prospectos_intereses(id_prospecto,id_proyecto,activo)
   VALUES(p_prospecto,v_proyecto,true);
 END IF;

 SELECT id_asesor INTO v_asignado FROM public.com_asignaciones_prospecto
 WHERE id_prospecto_vigente=p_prospecto AND fecha_fin IS NULL LIMIT 1;
 IF p_datos ? 'idAsesor' AND p_datos->>'idAsesor' IS NOT NULL THEN
   IF (p_datos->>'idAsesor') !~ '^[0-9]+$'
   THEN RAISE EXCEPTION 'ASESOR_INVALIDO|Seleccione un asesor valido.'; END IF;
   v_nuevo_asesor:=(p_datos->>'idAsesor')::bigint;
   IF v_nuevo_asesor IS DISTINCT FROM v_asignado THEN
     IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'crm.edit'::varchar),false)
       OR NOT EXISTS(
         SELECT 1 FROM public.seg_usuarios_roles ur JOIN public.seg_roles r ON r.id_rol=ur.id_rol
         WHERE ur.id_usuario=p_actor AND ur.activo AND ur.fecha_revocacion IS NULL AND r.activo
           AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'sales.reassign_advisor'::varchar),false)
       ) THEN RAISE EXCEPTION 'DENEGADO|Solo Gerencia o Supervisor comercial pueden reasignar asesor.'; END IF;
     PERFORM public.sp_crm_asignar_asesor_v3(
       p_actor,p_prospecto,v_nuevo_asesor,'Reasignacion durante validacion contractual');
   END IF;
 END IF;

 -- Crear una venta y vincular su cliente en el mismo contexto transaccional.
 v_resultado:=public.sp_crm_registrar_venta_pendiente_v9(
   p_actor,p_prospecto,p_lote,p_modalidad,p_monto_total,
   p_monto_inicial,p_numero_cuotas,p_tasa_mensual_pct,p_observaciones);
 INSERT INTO public.crm_ventas_datos_comprador(
   id_venta,id_prospecto,id_persona,id_usuario_revision,datos_revisados
 ) VALUES(
   (v_resultado->>'idVenta')::bigint,p_prospecto,v_persona,p_actor,
   p_datos||jsonb_build_object('revisadoEn',now(),'modalidad',p_modalidad,
     'idLote',p_lote,'precioVenta',p_monto_total)
 );
 RETURN v_resultado||jsonb_build_object('datosCompradorRevisados',true);
END $function$;

CREATE OR REPLACE FUNCTION public.sp_crm_registrar_venta_pendiente_v14(p_actor bigint, p_prospecto bigint, p_lote bigint, p_modalidad character varying, p_monto_total numeric, p_monto_inicial numeric, p_numero_cuotas integer, p_tasa_mensual_pct numeric, p_observaciones text, p_datos jsonb, p_pago jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
 v_id_politica_esperada bigint;
 v_persona bigint; v_origen integer; v_doc_tipo integer; v_asignado bigint; v_nuevo_asesor bigint;
 v_nombre text; v_paterno text; v_materno text; v_email text; v_telefono text;
 v_doc text; v_tipo text; v_direccion text; v_motivo text; v_mensaje text;
 v_proyecto bigint; v_contacto_id bigint; v_doc_id bigint; v_dir_id bigint;
 v_valor text; v_verificado boolean; v_actual_tipo integer;
 v_cantidad_documentos integer;
 v_resultado jsonb; v_tipo_contacto integer;
 v_metodo text; v_id_metodo integer; v_requiere_numero boolean;
 v_numero_operacion text; v_archivos jsonb; v_archivo jsonb;
 v_key text; v_nombre_archivo text; v_mime text; v_size bigint;
 v_archivos_vistos text[]:='{}'::text[];
 v_cantidad integer; v_id_venta bigint; v_monto_objetivo numeric;
 v_estado_civil text; v_conyuge jsonb;
 v_conyuge_nombres text; v_conyuge_paterno text;
 v_conyuge_materno text; v_conyuge_telefono text;
 v_conyuge_correo text; v_conyuge_tipo text;
 v_conyuge_documento text;
 v_referencia text; v_pais text; v_departamento text;
 v_provincia text; v_distrito text;
 v_id_pais bigint; v_id_departamento bigint; v_id_provincia bigint; v_id_distrito bigint;
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.create'::varchar),false)
    OR NOT coalesce(public.fn_crm_puede_consultar_prospecto(p_actor,p_prospecto),false)
 THEN RAISE EXCEPTION 'DENEGADO|No puede registrar esta venta.'; END IF;
 IF p_pago IS NULL OR jsonb_typeof(p_pago)<>'object' THEN
   RAISE EXCEPTION 'PAGO_INVALIDO|Seleccione método de pago y adjunte los comprobantes necesarios.';
 END IF;
 v_metodo:=upper(trim(coalesce(p_pago->>'metodoPago','')));
 SELECT id_metodo_pago,requiere_numero_operacion
  INTO v_id_metodo,v_requiere_numero
 FROM public.cfg_metodos_pago WHERE codigo=v_metodo AND activo;
 IF v_id_metodo IS NULL THEN
   RAISE EXCEPTION 'METODO_PAGO_INVALIDO|Seleccione un método de pago activo.';
 END IF;
 v_numero_operacion:=trim(coalesce(p_pago->>'numeroOperacion',''));
 IF length(v_numero_operacion)>80 OR
    (v_requiere_numero AND v_numero_operacion='')
 THEN RAISE EXCEPTION 'OPERACION_REQUERIDA|Indique el número de operación del pago.';
 END IF;
 v_archivos:=p_pago->'comprobantes';
 IF v_archivos IS NULL OR jsonb_typeof(v_archivos)<>'array'
 THEN RAISE EXCEPTION 'ARCHIVOS_INVALIDOS|Se esperaba lista de comprobantes.';
 END IF;
 v_cantidad:=jsonb_array_length(v_archivos);
 IF v_cantidad>8 OR (v_metodo<>'EFECTIVO' AND v_cantidad=0)
 THEN RAISE EXCEPTION 'VOUCHER_REQUERIDO|Adjunte de 1 a 8 comprobantes, excepto si paga en efectivo.';
 END IF;
 FOR v_archivo IN SELECT value FROM jsonb_array_elements(v_archivos) LOOP
   v_key:=coalesce(v_archivo->>'claveArchivo','');
   v_nombre_archivo:=coalesce(v_archivo->>'nombreArchivo','');
   v_mime:=coalesce(v_archivo->>'tipoMime','');
   IF coalesce(v_archivo->>'tamanioBytes','') !~ '^[0-9]+$' THEN
     RAISE EXCEPTION 'ARCHIVO_INVALIDO|Tamaño de comprobante inválido.';
   END IF;
   v_size:=(v_archivo->>'tamanioBytes')::bigint;
   IF v_key !~ ('^ventas/p-'||p_prospecto::text||'/l-'||
       p_lote::text||'/[a-f0-9-]{36}\.(pdf|jpg|png|webp)$')
      OR v_nombre_archivo='' OR length(v_nombre_archivo)>255
      OR v_mime NOT IN('application/pdf','image/jpeg','image/png','image/webp')
      OR v_size<1 OR v_size>5242880 OR v_key=ANY(v_archivos_vistos)
      OR EXISTS(SELECT 1 FROM public.ven_ventas_comprobantes WHERE clave_archivo=v_key)
   THEN RAISE EXCEPTION 'ARCHIVO_INVALIDO|Referencia de comprobante inválida o duplicada.';
   END IF;
   IF NOT EXISTS (
      SELECT 1 FROM storage.objects obj WHERE obj.bucket_id='vouchers-ventas-private'
       AND obj.name=v_key AND obj.metadata->>'mimetype'=v_mime
       AND (obj.metadata->>'size') ~ '^[0-9]+$'
       AND (obj.metadata->>'size')::bigint=v_size
   ) THEN RAISE EXCEPTION 'VOUCHER_NO_CARGADO|Archivo no encontrado o distinto del enviado.';
   END IF;
   v_archivos_vistos:=array_append(v_archivos_vistos,v_key);
 END LOOP;

 IF p_datos IS NULL OR jsonb_typeof(p_datos)<>'object'
    OR (p_datos->>'idProspecto') IS DISTINCT FROM p_prospecto::text
 THEN RAISE EXCEPTION 'DATOS_COMPRADOR_REQUERIDOS|Revise los datos del cliente antes de registrar.'; END IF;
 IF p_datos->'identidadVerificada' IS DISTINCT FROM 'true'::jsonb THEN
  RAISE EXCEPTION 'IDENTIDAD_NO_VERIFICADA|Debe confirmar el cotejo del documento del comprador.';
 END IF;
 PERFORM 1 FROM public.inm_lotes WHERE id_lote=p_lote FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'LOTE_NO_DISPONIBLE|Lote inexistente.'; END IF;
 -- Esta confirmación queda vinculada exactamente a la política aceptada.
 PERFORM 1 FROM public.cfg_fin_politica_activa WHERE id=1 FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'POLITICA_NO_DISPONIBLE|No hay política activa.'; END IF;
 IF coalesce(p_pago->>'idPoliticaEsperada','') !~ '^[1-9][0-9]{0,17}$' THEN
   RAISE EXCEPTION 'POLITICA_REQUERIDA|Actualice el formulario y confirme nuevamente las condiciones.';
 END IF;
 v_id_politica_esperada:=(p_pago->>'idPoliticaEsperada')::bigint;
 IF v_id_politica_esperada IS DISTINCT FROM
      (public.fn_fin_politica_para_venta_v1(p_prospecto,p_lote)->>'idPolitica')::bigint THEN
   RAISE EXCEPTION 'POLITICA_CAMBIO|La política cambió: revise cuotas e intereses antes de confirmar.';
 END IF;
 SELECT id_persona INTO STRICT v_persona FROM public.crm_prospectos
 WHERE id_prospecto=p_prospecto AND activo FOR UPDATE;
 PERFORM 1 FROM public.core_personas
 WHERE id_persona=v_persona AND activo FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'PERSONA_INVALIDA|La persona no esta activa.'; END IF;

 v_nombre:=btrim(coalesce(p_datos->>'nombres',''));
 v_paterno:=btrim(coalesce(p_datos->>'apellidoPaterno',''));
 v_materno:=btrim(coalesce(p_datos->>'apellidoMaterno',''));
 v_email:=lower(btrim(coalesce(p_datos->>'correo','')));
 v_telefono:=btrim(coalesce(p_datos->>'telefono',''));
 v_tipo:=upper(btrim(coalesce(p_datos->>'tipoDocumento','')));
 v_doc:=upper(btrim(coalesce(p_datos->>'numeroDocumento','')));
 v_direccion:=btrim(coalesce(p_datos->>'direccion',''));
 v_referencia:=btrim(coalesce(p_datos->>'referencia',''));
 v_motivo:=btrim(coalesce(p_datos->>'motivoContacto',''));
 v_mensaje:=btrim(coalesce(p_datos->>'mensaje',''));
 IF v_nombre !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
    OR length(v_nombre)<2 OR length(v_nombre)>120
    OR v_paterno !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
    OR length(v_paterno)<2 OR length(v_paterno)>80
    OR (v_materno<>'' AND
       (v_materno !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
       OR length(v_materno)>80))
    OR length(concat_ws(' ',v_nombre,v_paterno,nullif(v_materno,'')))>150
    OR v_email !~ '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$'
    OR length(v_email)>180 OR v_telefono !~ '^([0-9]{7,15}|\+[1-9][0-9]{6,14})$'
    OR length(v_direccion)=0 OR length(v_direccion)>255
    OR length(v_referencia)>255 OR length(v_motivo)>150
    OR length(v_mensaje)>4000
 THEN RAISE EXCEPTION 'DATOS_COMPRADOR_INVALIDOS|Revise los datos personales, contacto y dirección del comprador.'; END IF;
 IF NOT (CASE v_tipo
   WHEN 'DNI' THEN v_doc ~ '^[0-9]{8}$'
   WHEN 'RUC' THEN v_doc ~ '^[0-9]{11}$'
   WHEN 'CE' THEN v_doc ~ '^[0-9]{9,12}$'
   WHEN 'PASAPORTE' THEN v_doc ~ '^[A-Z0-9]{6,20}$'
   ELSE false END)
 THEN RAISE EXCEPTION 'DOCUMENTO_INVALIDO|El documento no cumple el formato indicado.'; END IF;
 SELECT id_tipo_documento INTO v_doc_tipo FROM public.cfg_tipos_documento
 WHERE codigo=v_tipo AND activo;
 SELECT id_origen_prospecto INTO v_origen FROM public.cfg_origenes_prospecto
 WHERE codigo=p_datos->>'origenCodigo' AND activo;
 IF v_doc_tipo IS NULL OR v_origen IS NULL
 THEN RAISE EXCEPTION 'CATALOGO_INVALIDO|Documento u origen no valido.'; END IF;
 IF coalesce(p_datos->>'idProyectoInteres','') !~ '^[0-9]+$'
 THEN RAISE EXCEPTION 'PROYECTO_INVALIDO|Seleccione un proyecto.'; END IF;
 v_proyecto:=(p_datos->>'idProyectoInteres')::bigint;
 IF NOT EXISTS(SELECT 1 FROM public.inm_proyectos WHERE id_proyecto=v_proyecto AND activo)
 THEN RAISE EXCEPTION 'PROYECTO_INVALIDO|Proyecto inactivo o inexistente.'; END IF;
 -- Evita registrar la adquisición bajo un interés de proyecto distinto al lote real.
 IF v_proyecto IS DISTINCT FROM (SELECT l.id_proyecto FROM public.inm_lotes l WHERE l.id_lote=p_lote AND l.activo)
 THEN RAISE EXCEPTION 'PROYECTO_INVALIDO|La ficha contractual no coincide con el proyecto del lote.'; END IF;

 -- Un cambio en documentos/contactos verificados requiere su flujo formal de evidencias.
 SELECT d.id_persona_documento,d.id_tipo_documento,d.numero_documento,d.verificado
 INTO v_doc_id,v_actual_tipo,v_valor,v_verificado
 FROM public.core_personas_documentos d
 WHERE d.id_persona=v_persona AND d.activo
 ORDER BY d.principal DESC,d.id_persona_documento DESC LIMIT 1 FOR UPDATE;
 IF v_doc_id IS NOT NULL AND
     (v_actual_tipo<>v_doc_tipo OR upper(btrim(v_valor))<>v_doc) THEN
   IF v_verificado THEN
     RAISE EXCEPTION 'DOCUMENTO_VERIFICADO|El cambio requiere revision documental con evidencias.';
   END IF;
   UPDATE public.core_personas_documentos SET
     id_tipo_documento=v_doc_tipo,numero_documento=v_doc,verificado=false,
     fecha_actualizacion=now()
   WHERE id_persona_documento=v_doc_id;
 ELSIF v_doc_id IS NULL THEN
   INSERT INTO public.core_personas_documentos(
     id_persona,id_tipo_documento,numero_documento,principal,verificado
   ) VALUES(v_persona,v_doc_tipo,v_doc,true,false);
 END IF;

 -- El cotejo expreso de identidad se guarda atomicamente con la venta pendiente.
 SELECT count(*) INTO v_cantidad_documentos FROM public.core_personas_documentos d
 WHERE d.id_persona=v_persona AND d.principal IS TRUE AND d.activo IS TRUE
  AND d.id_tipo_documento=v_doc_tipo AND upper(btrim(d.numero_documento))=v_doc;
 IF v_cantidad_documentos <> 1 OR EXISTS (
  SELECT 1 FROM public.core_personas_documentos d
  WHERE d.id_persona<>v_persona AND d.id_tipo_documento=v_doc_tipo
   AND upper(btrim(d.numero_documento))=v_doc
 ) THEN
  RAISE EXCEPTION 'IDENTIDAD_NO_APTA|Documento principal ambiguo, duplicado o inconsistente.';
 END IF;
 UPDATE public.core_personas_documentos SET verificado=TRUE,fecha_actualizacion=now()
 WHERE id_persona=v_persona AND principal IS TRUE AND activo IS TRUE
  AND id_tipo_documento=v_doc_tipo AND upper(btrim(numero_documento))=v_doc;

 SELECT id_tipo_contacto INTO STRICT v_tipo_contacto FROM public.cfg_tipos_contacto
 WHERE codigo='EMAIL' AND activo;
 SELECT id_persona_contacto,valor,verificado INTO v_contacto_id,v_valor,v_verificado
 FROM public.core_personas_contactos
 WHERE id_persona=v_persona AND id_tipo_contacto=v_tipo_contacto AND activo
 ORDER BY principal DESC,id_persona_contacto DESC LIMIT 1 FOR UPDATE;
 IF v_contacto_id IS NOT NULL AND lower(btrim(v_valor))<>v_email THEN
   IF v_verificado THEN
     RAISE EXCEPTION 'CORREO_VERIFICADO|El cambio de correo requiere confirmacion de identidad.';
   END IF;
   UPDATE public.core_personas_contactos SET valor=v_email,verificado=false,
      fecha_actualizacion=now() WHERE id_persona_contacto=v_contacto_id;
 ELSIF v_contacto_id IS NULL THEN
   INSERT INTO public.core_personas_contactos(
     id_persona,id_tipo_contacto,valor,principal,verificado,permite_notificaciones)
   VALUES(v_persona,v_tipo_contacto,v_email,true,false,false);
 END IF;

 SELECT id_tipo_contacto INTO STRICT v_tipo_contacto FROM public.cfg_tipos_contacto
 WHERE codigo='CELULAR' AND activo;
 v_contacto_id:=NULL;v_valor:=NULL;v_verificado:=NULL;
 SELECT id_persona_contacto,valor,verificado INTO v_contacto_id,v_valor,v_verificado
 FROM public.core_personas_contactos
 WHERE id_persona=v_persona AND id_tipo_contacto=v_tipo_contacto AND activo
 ORDER BY principal DESC,id_persona_contacto DESC LIMIT 1 FOR UPDATE;
 IF v_contacto_id IS NOT NULL AND regexp_replace(v_valor,'[ ()-]','','g')<>v_telefono THEN
   IF v_verificado THEN
     RAISE EXCEPTION 'TELEFONO_VERIFICADO|El cambio de telefono requiere verificacion.';
   END IF;
   UPDATE public.core_personas_contactos SET valor=v_telefono,verificado=false,
      fecha_actualizacion=now() WHERE id_persona_contacto=v_contacto_id;
 ELSIF v_contacto_id IS NULL THEN
   INSERT INTO public.core_personas_contactos(
     id_persona,id_tipo_contacto,valor,principal,verificado,permite_notificaciones)
   VALUES(v_persona,v_tipo_contacto,v_telefono,true,false,false);
 END IF;

 -- Resolver jerarquía real desde el catálogo de ubicaciones:
 IF coalesce(p_datos->>'idPais','') !~ '^[0-9]+$'
    OR coalesce(p_datos->>'idDepartamento','') !~ '^[0-9]+$'
    OR coalesce(p_datos->>'idProvincia','') !~ '^[0-9]+$'
    OR coalesce(p_datos->>'idDistrito','') !~ '^[0-9]+$'
 THEN
   RAISE EXCEPTION 'UBICACION_INVALIDA|Seleccione país, departamento, provincia y distrito.';
 END IF;
 v_id_pais:=(p_datos->>'idPais')::bigint;
 v_id_departamento:=(p_datos->>'idDepartamento')::bigint;
 v_id_provincia:=(p_datos->>'idProvincia')::bigint;
 v_id_distrito:=(p_datos->>'idDistrito')::bigint;

 SELECT pais.nombre,dep.nombre,prov.nombre,dist.nombre
 INTO v_pais,v_departamento,v_provincia,v_distrito
 FROM public.cfg_ubicaciones_geograficas pais
 JOIN public.cfg_ubicaciones_geograficas dep
   ON dep.id_ubicacion_padre=pais.id_ubicacion
 JOIN public.cfg_ubicaciones_geograficas prov
   ON prov.id_ubicacion_padre=dep.id_ubicacion
 JOIN public.cfg_ubicaciones_geograficas dist
   ON dist.id_ubicacion_padre=prov.id_ubicacion
 WHERE pais.id_ubicacion=v_id_pais AND pais.tipo='PAIS'
   AND pais.pais_iso2='PE'
   AND dep.id_ubicacion=v_id_departamento AND dep.tipo='DEPARTAMENTO'
   AND prov.id_ubicacion=v_id_provincia AND prov.tipo='PROVINCIA'
   AND dist.id_ubicacion=v_id_distrito AND dist.tipo='DISTRITO'
   AND pais.activo AND dep.activo AND prov.activo AND dist.activo
   AND pais.estado_verificacion='VALIDADO'
   AND dep.estado_verificacion='VALIDADO'
   AND prov.estado_verificacion='VALIDADO'
   AND dist.estado_verificacion='VALIDADO';
 IF NOT FOUND THEN
   RAISE EXCEPTION 'UBICACION_INVALIDA|La ubicación no corresponde a la jerarquía seleccionada.';
 END IF;

 -- Estado civil solicitado para la preparación contractual.
 v_estado_civil:=upper(trim(coalesce(p_datos->>'estadoCivil','')));
 IF v_estado_civil NOT IN ('SOLTERO','CASADO','DIVORCIADO','VIUDO') THEN
    RAISE EXCEPTION 'ESTADO_CIVIL_INVALIDO|Seleccione un estado civil válido.';
 END IF;
 IF v_estado_civil='CASADO' THEN
    v_conyuge:=p_datos->'conyuge';
    IF v_conyuge IS NULL OR jsonb_typeof(v_conyuge)<>'object' THEN
      RAISE EXCEPTION 'CONYUGE_REQUERIDO|Complete la información del cónyuge.';
    END IF;
    v_conyuge_nombres:=trim(coalesce(v_conyuge->>'nombres',''));
    v_conyuge_paterno:=trim(coalesce(v_conyuge->>'apellidoPaterno',''));
    v_conyuge_materno:=trim(coalesce(v_conyuge->>'apellidoMaterno',''));
    v_conyuge_telefono:=trim(coalesce(v_conyuge->>'telefono',''));
    v_conyuge_correo:=lower(trim(coalesce(v_conyuge->>'correo','')));
    v_conyuge_tipo:=upper(trim(coalesce(v_conyuge->>'tipoDocumento','')));
    v_conyuge_documento:=upper(trim(coalesce(v_conyuge->>'numeroDocumento','')));
    IF v_conyuge_nombres !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
       OR length(v_conyuge_nombres)<2 OR length(v_conyuge_nombres)>120
       OR v_conyuge_paterno !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
       OR length(v_conyuge_paterno)<2 OR length(v_conyuge_paterno)>80
       OR (v_conyuge_materno<>'' AND (length(v_conyuge_materno)>80 OR
          v_conyuge_materno !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'))
       OR v_conyuge_telefono !~ '^([0-9]{7,15}|\+[1-9][0-9]{6,14})$'
       OR v_conyuge_correo !~ '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$'
       OR length(v_conyuge_correo)>180
       OR NOT (CASE v_conyuge_tipo
         WHEN 'DNI' THEN v_conyuge_documento ~ '^[0-9]{8}$'
         WHEN 'RUC' THEN v_conyuge_documento ~ '^[0-9]{11}$'
         WHEN 'CE' THEN v_conyuge_documento ~ '^[0-9]{9,12}$'
         WHEN 'PASAPORTE' THEN v_conyuge_documento ~ '^[A-Z0-9]{6,20}$'
         ELSE false END)
       OR (v_conyuge_tipo=v_tipo AND v_conyuge_documento=v_doc)
    THEN
      RAISE EXCEPTION 'CONYUGE_INVALIDO|Revise nombres, contacto y documento del cónyuge.';
    END IF;
 END IF;

 UPDATE public.core_personas SET estado_civil_codigo=v_estado_civil
  WHERE id_persona=v_persona;
 IF v_estado_civil='CASADO' THEN
   INSERT INTO public.core_personas_conyuges(
    id_persona,nombres,apellido_paterno,apellido_materno,
    telefono,correo,tipo_documento,numero_documento,activo,fecha_actualizacion)
   VALUES(v_persona,v_conyuge_nombres,v_conyuge_paterno,nullif(v_conyuge_materno,''),
     v_conyuge_telefono,v_conyuge_correo,v_conyuge_tipo,v_conyuge_documento,true,now())
   ON CONFLICT(id_persona) DO UPDATE SET
     nombres=excluded.nombres,apellido_paterno=excluded.apellido_paterno,
     apellido_materno=excluded.apellido_materno,telefono=excluded.telefono,
     correo=excluded.correo,tipo_documento=excluded.tipo_documento,
     numero_documento=excluded.numero_documento,activo=true,fecha_actualizacion=now();
 ELSE
   UPDATE public.core_personas_conyuges SET activo=false,fecha_actualizacion=now()
   WHERE id_persona=v_persona;
 END IF;

 UPDATE public.core_personas SET nombres=v_nombre,apellido_paterno=v_paterno,
   apellido_materno=nullif(v_materno,''),fecha_actualizacion=now()
 WHERE id_persona=v_persona;

 SELECT id_persona_direccion INTO v_dir_id
 FROM public.core_personas_direcciones WHERE id_persona=v_persona AND activo
 ORDER BY principal DESC,id_persona_direccion DESC LIMIT 1 FOR UPDATE;
 IF v_dir_id IS NOT NULL THEN
   UPDATE public.core_personas_direcciones
   SET direccion=v_direccion,referencia=nullif(v_referencia,''),
       pais=v_pais,departamento=v_departamento,
       provincia=v_provincia,distrito=v_distrito,
       fecha_actualizacion=now()
   WHERE id_persona_direccion=v_dir_id;
 ELSE
   INSERT INTO public.core_personas_direcciones(
     id_persona,tipo,direccion,referencia,pais,departamento,
     provincia,distrito,principal
   ) VALUES(
     v_persona,'DOMICILIO',v_direccion,nullif(v_referencia,''),
     v_pais,v_departamento,v_provincia,v_distrito,true);
 END IF;
 -- En recompra preservar el canal de captación histórico del prospecto original.
 UPDATE public.crm_prospectos SET id_origen_prospecto=v_origen,
   fecha_actualizacion=now()
 WHERE id_prospecto=p_prospecto AND NOT EXISTS (
   SELECT 1 FROM public.cfg_estados_prospecto e
   WHERE e.id_estado_prospecto=crm_prospectos.id_estado_prospecto
     AND e.codigo='CONVERTIDO'
 );
 UPDATE public.crm_prospectos_intereses
   SET fecha_interes=now(),fecha_actualizacion=now()
 WHERE id_prospecto=p_prospecto AND id_proyecto=v_proyecto AND activo;
 IF NOT FOUND THEN
   INSERT INTO public.crm_prospectos_intereses(id_prospecto,id_proyecto,activo)
   VALUES(p_prospecto,v_proyecto,true);
 END IF;

 SELECT id_asesor INTO v_asignado FROM public.com_asignaciones_prospecto
 WHERE id_prospecto_vigente=p_prospecto AND fecha_fin IS NULL LIMIT 1;
 IF p_datos ? 'idAsesor' AND p_datos->>'idAsesor' IS NOT NULL THEN
   IF (p_datos->>'idAsesor') !~ '^[0-9]+$'
   THEN RAISE EXCEPTION 'ASESOR_INVALIDO|Seleccione un asesor valido.'; END IF;
   v_nuevo_asesor:=(p_datos->>'idAsesor')::bigint;
   IF v_nuevo_asesor IS DISTINCT FROM v_asignado THEN
     IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'crm.edit'::varchar),false)
       OR NOT EXISTS(
         SELECT 1 FROM public.seg_usuarios_roles ur JOIN public.seg_roles r ON r.id_rol=ur.id_rol
         WHERE ur.id_usuario=p_actor AND ur.activo AND ur.fecha_revocacion IS NULL AND r.activo
           AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'sales.reassign_advisor'::varchar),false)
       ) THEN RAISE EXCEPTION 'DENEGADO|Solo Gerencia o Supervisor comercial pueden reasignar asesor.'; END IF;
     PERFORM public.sp_crm_asignar_asesor_v3(
       p_actor,p_prospecto,v_nuevo_asesor,'Reasignacion durante validacion contractual');
   END IF;
 END IF;

 -- Crear una venta y vincular su cliente en el mismo contexto transaccional.
 v_resultado:=public.sp_crm_registrar_venta_pendiente_v10(
   p_actor,p_prospecto,p_lote,p_modalidad,p_monto_total,
   p_monto_inicial,p_numero_cuotas,p_tasa_mensual_pct,p_observaciones);
 -- El registro sigue siendo pendiente de auditoría; no constituye pago aprobado.
 v_id_venta:=(v_resultado->>'idVenta')::bigint;
 v_monto_objetivo:=CASE WHEN p_modalidad='FINANCIADA'
   THEN (v_resultado->>'montoInicialAdicional')::numeric
   ELSE (v_resultado->>'saldoContado')::numeric END;
 IF v_monto_objetivo IS NULL THEN
   v_monto_objetivo:=p_monto_total-coalesce((v_resultado->>'montoReservaAplicable')::numeric,0);
 END IF;
 IF p_modalidad='FINANCIADA' AND ((v_monto_objetivo>0 AND v_cantidad<>1) OR (v_monto_objetivo=0 AND v_cantidad<>0)) THEN
   RAISE EXCEPTION 'VOUCHER_REQUERIDO|Adjunte un único comprobante de la inicial adicional; si no hay pago, no adjunte un comprobante.';
 END IF;
 INSERT INTO public.ven_ventas_medios_pago(
   id_venta,id_metodo_pago,numero_operacion,monto_pendiente_revision,
   tipo_abono,id_usuario_registro
 ) VALUES (v_id_venta,v_id_metodo,nullif(v_numero_operacion,''),
   v_monto_objetivo,CASE WHEN p_modalidad='FINANCIADA' THEN 'INICIAL' ELSE 'CONTADO' END,p_actor);
 FOR v_archivo IN SELECT value FROM jsonb_array_elements(v_archivos) LOOP
   INSERT INTO public.ven_ventas_comprobantes(
     id_venta,clave_archivo,nombre_archivo,tipo_mime,tamanio_bytes)
   VALUES (v_id_venta,v_archivo->>'claveArchivo',
     v_archivo->>'nombreArchivo',v_archivo->>'tipoMime',
     (v_archivo->>'tamanioBytes')::bigint);
 END LOOP;
 INSERT INTO public.crm_ventas_datos_comprador(
   id_venta,id_prospecto,id_persona,id_usuario_revision,datos_revisados
 ) VALUES(
   (v_resultado->>'idVenta')::bigint,p_prospecto,v_persona,p_actor,
   p_datos||jsonb_build_object('revisadoEn',now(),'modalidad',p_modalidad,
     'idLote',p_lote,'precioVenta',p_monto_total)
 );
 PERFORM public.sp_registrar_auditoria(
  p_actor,'CRM','VERIFICAR_IDENTIDAD_COMPRADOR','core_personas_documentos',
  v_persona::varchar,'EXITOSO',
  'Cotejo de identidad efectuado al registrar la venta pendiente.',
  jsonb_build_object('idPersona',v_persona,'idProspecto',p_prospecto,
   'idVenta',v_id_venta,'tipoDocumento',v_tipo)
 );
 RETURN v_resultado||jsonb_build_object('datosCompradorRevisados',true,'identidadVerificada',true);
END $function$;

CREATE OR REPLACE FUNCTION public.sp_crm_solicitar_retroceso_v1(p_actor bigint, p_prospecto bigint, p_estado_destino_codigo character varying, p_motivo_codigo character varying, p_motivo_detallado text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_origen integer;
  v_origen_codigo varchar;
  v_destino integer;
  v_destino_codigo varchar;
  v_motivo integer;
  v_asesor bigint;
  v_persona bigint;
  v_solicitud bigint;
BEGIN
  IF p_actor IS NULL
     OR NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_actor,'crm.edit'::varchar),false)
     OR NOT EXISTS (
       SELECT 1 FROM public.seg_usuarios_roles ur
       JOIN public.seg_roles r ON r.id_rol=ur.id_rol
       WHERE ur.id_usuario=p_actor AND ur.activo AND ur.fecha_revocacion IS NULL
         AND r.activo AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.request_stage_change'::varchar),false)
     ) THEN
    RAISE EXCEPTION 'DENEGADO|Solo un asesor comercial autorizado puede solicitar el retroceso.';
  END IF;
  IF p_prospecto IS NULL OR p_prospecto<=0
     OR length(btrim(coalesce(p_motivo_detallado,''))) NOT BETWEEN 15 AND 1000 THEN
    RAISE EXCEPTION 'DATOS_INVALIDOS|El motivo detallado debe tener entre 15 y 1000 caracteres.';
  END IF;
  SELECT p.id_estado_prospecto,e.codigo,p.id_persona
    INTO v_origen,v_origen_codigo,v_persona
  FROM public.crm_prospectos p
  JOIN public.cfg_estados_prospecto e ON e.id_estado_prospecto=p.id_estado_prospecto
  WHERE p.id_prospecto=p_prospecto AND p.activo
  FOR UPDATE OF p;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROSPECTO_NO_EXISTE|El prospecto no existe o esta inactivo.';
  END IF;
  IF NOT COALESCE(public.fn_crm_puede_consultar_prospecto(p_actor,p_prospecto),false) THEN
    RAISE EXCEPTION 'DENEGADO|El prospecto no pertenece a la cartera del usuario.';
  END IF;
  SELECT a.id_asesor INTO v_asesor
  FROM public.seg_usuarios u
  JOIN public.com_asesores a ON a.id_persona=u.id_persona
  JOIN public.cfg_estados_asesor ea ON ea.id_estado_asesor=a.id_estado_asesor
  JOIN public.com_asignaciones_prospecto ap ON ap.id_asesor=a.id_asesor
  WHERE u.id_usuario=p_actor AND ap.id_prospecto_vigente=p_prospecto
    AND ap.fecha_fin IS NULL AND ea.activo AND ea.permite_operar
    AND a.fecha_inicio<=CURRENT_DATE AND (a.fecha_fin IS NULL OR a.fecha_fin>=CURRENT_DATE);
  IF v_asesor IS NULL THEN
    RAISE EXCEPTION 'DENEGADO|El solicitante no es el asesor vigente del prospecto.';
  END IF;

  SELECT e.id_estado_prospecto,e.codigo INTO v_destino,v_destino_codigo
  FROM public.cfg_estados_prospecto e
  WHERE e.codigo=upper(btrim(coalesce(p_estado_destino_codigo,''))) AND e.activo;
  IF NOT FOUND OR v_origen_codigo NOT IN ('INTERESADO','NEGOCIACION')
       OR v_destino_codigo NOT IN ('NUEVO','CONTACTADO','EN_SEGUIMIENTO') THEN
    RAISE EXCEPTION 'TRANSICION_INVALIDA|Solo se autoriza solicitar retroceso de cliente potencial a lead.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.crm_clientes c
    JOIN public.ven_ventas_clientes vc ON vc.id_cliente=c.id_cliente
    WHERE c.id_persona=v_persona
  ) THEN
    RAISE EXCEPTION 'VENTA_EXISTENTE|No se puede retroceder un prospecto con venta vinculada.';
  END IF;

  SELECT id_motivo INTO v_motivo
  FROM public.cfg_motivos_retroceso_crm
  WHERE codigo=upper(btrim(coalesce(p_motivo_codigo,''))) AND activo;
  IF v_motivo IS NULL THEN
    RAISE EXCEPTION 'MOTIVO_INVALIDO|Seleccione un motivo vigente.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.crm_solicitudes_retroceso_etapa
    WHERE id_prospecto=p_prospecto AND estado='PENDIENTE'
  ) THEN
    RAISE EXCEPTION 'SOLICITUD_PENDIENTE|Ya existe una solicitud pendiente para este prospecto.';
  END IF;

  INSERT INTO public.crm_solicitudes_retroceso_etapa (
    id_prospecto,id_usuario_solicitante,id_asesor_solicitante,
    id_estado_origen,id_estado_destino,id_motivo,motivo_detallado
  ) VALUES (
    p_prospecto,p_actor,v_asesor,v_origen,v_destino,v_motivo,btrim(p_motivo_detallado)
  ) RETURNING id_solicitud INTO v_solicitud;

  PERFORM public.sp_registrar_auditoria(
    p_actor,'CRM','SOLICITAR_RETROCESO','crm_solicitudes_retroceso_etapa',
    v_solicitud::varchar,'EXITOSO','Retroceso de etapa solicitado.',
    jsonb_build_object('idProspecto',p_prospecto,
      'origen',v_origen_codigo,'destino',v_destino_codigo)
  );
  RETURN jsonb_build_object(
    'id_solicitud',v_solicitud,'id_prospecto',p_prospecto,
    'estado','PENDIENTE','estado_actual',v_origen_codigo,
    'estado_solicitado',v_destino_codigo,'etapa_modificada',false
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_usuario_tiene_permiso_seguridad(p_id_usuario bigint, p_codigo_permiso character varying)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN

    IF p_id_usuario IS NULL
       OR NULLIF(BTRIM(p_codigo_permiso), '') IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.seg_usuarios u

        INNER JOIN public.core_personas persona
            ON persona.id_persona = u.id_persona

        INNER JOIN public.cfg_estados_usuario eu
            ON eu.id_estado_usuario = u.id_estado_usuario

        INNER JOIN public.seg_usuarios_roles ur
            ON ur.id_usuario = u.id_usuario

        INNER JOIN public.seg_roles r
            ON r.id_rol = ur.id_rol

        INNER JOIN public.seg_roles_permisos rp
            ON rp.id_rol = r.id_rol

        INNER JOIN public.seg_permisos p
            ON p.id_permiso = rp.id_permiso

        WHERE u.id_usuario = p_id_usuario
          AND persona.activo = TRUE
          AND eu.activo = TRUE
          AND eu.permite_acceso = TRUE

          AND (
                u.bloqueado_hasta IS NULL
                OR u.bloqueado_hasta <= timezone('utc'::text, now())
          )

          AND ur.activo = TRUE
          AND ur.fecha_revocacion IS NULL
          AND r.activo = TRUE
          AND rp.activo = TRUE
          AND p.activo = TRUE

          AND p.codigo = BTRIM(p_codigo_permiso)
    );

END;
$function$;

CREATE OR REPLACE PROCEDURE public.sp_actualizar_permisos_rol_seguridad(IN p_id_actor bigint, IN p_codigo_rol character varying, IN p_codigos_permisos text[], OUT p_estado character varying, OUT p_mensaje character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $procedure$
DECLARE
    v_id_rol INTEGER;
    v_codigo_rol VARCHAR;
    v_codigo_permiso TEXT;
    v_permisos TEXT[];
BEGIN
    /* 1. El actor debe poder administrar permisos de roles */
    IF NOT public.fn_usuario_tiene_permiso_seguridad(
        p_id_actor,
        'roles.assign_permissions'
    ) THEN
        p_estado := 'DENEGADO';
        p_mensaje := 'No tiene permiso para modificar permisos de roles.';
        RETURN;
    END IF;

    /* 2. Buscar el rol */
    SELECT id_rol, codigo
    INTO v_id_rol, v_codigo_rol
    FROM seg_roles
    WHERE UPPER(codigo) = UPPER(BTRIM(p_codigo_rol))
      AND activo = TRUE;

    IF v_id_rol IS NULL THEN
        p_estado := 'NO_ENCONTRADO';
        p_mensaje := 'El rol indicado no existe o está inactivo.';
        RETURN;
    END IF;

    /* Delegacion RRHH: no modificar roles del sistema ni conceder privilegios
       de seguridad a roles personalizados (escalada de privilegios). */
    IF EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ar
        JOIN public.seg_roles ar_rol ON ar_rol.id_rol=ar.id_rol
        WHERE ar.id_usuario=p_id_actor AND ar.activo IS TRUE
          AND ar.fecha_revocacion IS NULL
          AND ar_rol.activo IS TRUE
          AND ar_rol.codigo='RRHH'
    ) AND NOT EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ar
        JOIN public.seg_roles ar_rol ON ar_rol.id_rol=ar.id_rol
        WHERE ar.id_usuario=p_id_actor AND ar.activo IS TRUE
          AND ar.fecha_revocacion IS NULL
          AND ar_rol.activo IS TRUE
          AND ar_rol.codigo IN ('ADMINISTRADOR','GERENCIA')
    ) THEN
        IF EXISTS (SELECT 1 FROM public.seg_roles r
                   WHERE r.id_rol=v_id_rol AND
                       (r.es_sistema IS TRUE OR r.codigo IN ('ADMINISTRADOR','GERENCIA','CLIENTE','RRHH'))) THEN
            p_estado := 'PROTEGIDO';
            p_mensaje := 'RRHH no puede cambiar permisos de roles del sistema.';
            RETURN;
        END IF;
        IF EXISTS (SELECT 1 FROM unnest(COALESCE(p_codigos_permisos,ARRAY[]::text[])) AS x(codigo)
                   WHERE split_part(btrim(x.codigo), '.', 1) IN ('users','roles','permissions','audit')) THEN
            p_estado := 'DENEGADO';
            p_mensaje := 'RRHH no puede delegar permisos de administracion de seguridad.';
            RETURN;
        END IF;
    END IF;

    /* 3. GERENCIA es administrado automáticamente */
    IF v_codigo_rol = 'GERENCIA' THEN
        p_estado := 'PROTEGIDO';
        p_mensaje := 'Los permisos de GERENCIA se asignan automáticamente y no pueden modificarse manualmente.';
        RETURN;
    END IF;

    /* 4. CLIENTE pertenece al Portal del Cliente */
    IF v_codigo_rol = 'CLIENTE' THEN
        p_estado := 'PROTEGIDO';
        p_mensaje := 'El rol CLIENTE no se administra desde el Backoffice.';
        RETURN;
    END IF;

    /* 5. Solo GERENCIA puede modificar al ADMINISTRADOR */
    IF v_codigo_rol = 'ADMINISTRADOR'
       AND NOT EXISTS (
           SELECT 1
           FROM seg_usuarios_roles ur
           INNER JOIN seg_roles r
               ON r.id_rol = ur.id_rol
           WHERE ur.id_usuario = p_id_actor
             AND ur.activo = TRUE
             AND r.activo = TRUE
             AND r.codigo = 'GERENCIA'
       ) THEN

        p_estado := 'DENEGADO';
        p_mensaje := 'Solo GERENCIA puede modificar los permisos del rol ADMINISTRADOR.';
        RETURN;
    END IF;

    /* 6. Normalizar lista recibida */
    SELECT COALESCE(
        ARRAY_AGG(DISTINCT BTRIM(x)),
        ARRAY[]::TEXT[]
    )
    INTO v_permisos
    FROM UNNEST(
        COALESCE(
            p_codigos_permisos,
            ARRAY[]::TEXT[]
        )
    ) AS x
    WHERE BTRIM(x) <> '';

    /* 7. Validar que todos los permisos existan y estén activos */
    FOREACH v_codigo_permiso IN ARRAY v_permisos
    LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM seg_permisos
            WHERE codigo = v_codigo_permiso
              AND activo = TRUE
        ) THEN
            p_estado := 'PERMISO_INVALIDO';
            p_mensaje :=
                'El permiso ' ||
                v_codigo_permiso ||
                ' no existe o está inactivo.';
            RETURN;
        END IF;
    END LOOP;

    -- Las nuevas capacidades de alcance y aprobación solo se delegan si el actor ya las posee.
    IF EXISTS (SELECT 1 FROM unnest(v_permisos) x(codigo)
      WHERE x.codigo IN ('crm.scope_all','crm.scope_assigned','crm.assign_advisor','crm.approve_stage_change','crm.request_stage_change','crm.deactivate_prospect','sales.scope_all','sales.contract_scope_all','sales.approve_reservation_change','sales.notify_expiry_all','sales.reassign_advisor','annulments.scope_all')
      AND NOT public.fn_usuario_tiene_permiso_seguridad(p_id_actor,x.codigo::varchar)) THEN
        p_estado := 'DENEGADO';
        p_mensaje := 'No puede delegar una capacidad comercial que no posee.';
        RETURN;
    END IF;

    /*
     * 8. Desactivar las asignaciones actuales.
     * No hacemos DELETE físico.
     */
    UPDATE seg_roles_permisos
    SET activo = FALSE
    WHERE id_rol = v_id_rol
      AND activo = TRUE;

    /*
     * 9. Activar/asignar los permisos seleccionados.
     * UNIQUE(id_rol,id_permiso) evita duplicados.
     */
    IF CARDINALITY(v_permisos) > 0 THEN

        INSERT INTO seg_roles_permisos (
            id_rol,
            id_permiso,
            fecha_asignacion,
            asignado_por,
            activo
        )
        SELECT
            v_id_rol,
            p.id_permiso,
            NOW(),
            p_id_actor,
            TRUE
        FROM seg_permisos p
        WHERE p.codigo = ANY(v_permisos)
          AND p.activo = TRUE

        ON CONFLICT (id_rol, id_permiso)
        DO UPDATE
        SET
            activo = TRUE,
            fecha_asignacion = EXCLUDED.fecha_asignacion,
            asignado_por = EXCLUDED.asignado_por;

    END IF;
    /* 10. Revocar sesiones activas de usuarios afectados */
    UPDATE seg_sesiones s
    SET
       fecha_revocacion = NOW(),
       motivo_revocacion = 'PERMISOS_ROL_ACTUALIZADOS'
    WHERE s.fecha_revocacion IS NULL
      AND EXISTS (
         SELECT 1
         FROM seg_usuarios_roles ur
          WHERE ur.id_usuario = s.id_usuario
            AND ur.id_rol = v_id_rol
            AND ur.activo = TRUE
  );

    p_estado := 'OK';
    p_mensaje := 'Permisos del rol actualizados correctamente.';
END;
$procedure$;

CREATE OR REPLACE FUNCTION public.sp_crm_adjuntar_evidencia_retroceso_v1(p_actor bigint, p_solicitud bigint, p_ruta text, p_nombre_archivo text, p_mime character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE v_s public.crm_solicitudes_retroceso_etapa%ROWTYPE; v_ext text;
BEGIN
 IF p_actor IS NULL OR p_actor <= 0
   OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'crm.edit'::varchar),false)
   OR NOT EXISTS(
      SELECT 1 FROM public.seg_usuarios_roles ur
      JOIN public.seg_roles r ON r.id_rol=ur.id_rol
      WHERE ur.id_usuario=p_actor AND ur.activo
       AND ur.fecha_revocacion IS NULL AND r.activo AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.request_stage_change'::varchar),false)
   )
 THEN RAISE EXCEPTION 'DENEGADO|Se requiere un asesor con permiso crm.edit.'; END IF;

 IF p_solicitud IS NULL OR p_solicitud<=0 OR p_ruta IS NULL OR p_nombre_archivo IS NULL OR
    length(btrim(p_nombre_archivo))<1 OR length(p_nombre_archivo)>255 OR
    p_mime NOT IN ('image/jpeg','image/png','image/webp')
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Datos de la evidencia invalidos.'; END IF;

 v_ext := CASE p_mime WHEN 'image/jpeg' THEN 'jpg' WHEN 'image/png' THEN 'png'
                      WHEN 'image/webp' THEN 'webp' END;
 IF p_ruta !~ ('^solicitudes/' || p_solicitud::text ||
                '/[[:xdigit:]]{8}-[[:xdigit:]]{4}-[[:xdigit:]]{4}-[[:xdigit:]]{4}-[[:xdigit:]]{12}\.' || v_ext || '$')
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Ruta de evidencia invalida.'; END IF;

 SELECT * INTO v_s FROM public.crm_solicitudes_retroceso_etapa
 WHERE id_solicitud=p_solicitud FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'SOLICITUD_NO_EXISTE|La solicitud no existe.'; END IF;
 IF v_s.id_usuario_solicitante<>p_actor THEN
   RAISE EXCEPTION 'DENEGADO|Solo el asesor solicitante puede adjuntar su evidencia.';
 END IF;
 IF v_s.estado<>'PENDIENTE' THEN
   RAISE EXCEPTION 'SOLICITUD_RESUELTA|Solo se pueden adjuntar evidencias a solicitudes pendientes.';
 END IF;
 IF v_s.evidencia_storage_path IS NOT NULL THEN
   RAISE EXCEPTION 'EVIDENCIA_EXISTENTE|La solicitud ya tiene una evidencia adjunta.';
 END IF;

 UPDATE public.crm_solicitudes_retroceso_etapa SET
   evidencia_storage_path=p_ruta,
   evidencia_nombre_archivo=regexp_replace(p_nombre_archivo,'[^a-zA-Z0-9._-]','_','g'),
   evidencia_tipo_mime=p_mime,
   fecha_evidencia=now(),
   fecha_actualizacion=now()
 WHERE id_solicitud=p_solicitud;

 PERFORM public.sp_registrar_auditoria(
   p_actor,'CRM','ADJUNTAR_EVIDENCIA_RETROCESO',
   'crm_solicitudes_retroceso_etapa',p_solicitud::varchar,
   'EXITOSO','Evidencia comercial adjuntada',
   jsonb_build_object('idProspecto',v_s.id_prospecto,'idSolicitud',p_solicitud)
 );
 RETURN jsonb_build_object('id_solicitud',p_solicitud,'tiene_evidencia',true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_crm_catalogo_motivos_retroceso_v1(p_actor bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE v_resultado jsonb;
BEGIN
    IF p_actor IS NULL OR p_actor<=0
       OR NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_actor,'crm.view'::varchar),false)
       OR NOT EXISTS (
           SELECT 1 FROM public.seg_usuarios_roles ur
           JOIN public.seg_roles r ON r.id_rol=ur.id_rol
           WHERE ur.id_usuario=p_actor AND ur.activo
             AND ur.fecha_revocacion IS NULL AND r.activo
             AND (coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.request_stage_change'::varchar),false) OR coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.approve_stage_change'::varchar),false))
       )
    THEN
       RAISE EXCEPTION 'DENEGADO|Se requiere un rol comercial autorizado para consultar motivos de retroceso.';
    END IF;
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id_motivo',m.id_motivo,'codigo',m.codigo,'nombre',m.nombre,
      'descripcion',m.descripcion,'orden',m.orden
    ) ORDER BY m.orden,m.id_motivo),'[]'::jsonb)
    INTO v_resultado
    FROM public.cfg_motivos_retroceso_crm m WHERE m.activo;
    RETURN v_resultado;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_crm_mi_retroceso_pendiente_v1(p_actor bigint, p_prospecto bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE v_s public.crm_solicitudes_retroceso_etapa%ROWTYPE;
BEGIN
    IF p_actor IS NULL OR p_actor<=0 OR p_prospecto IS NULL OR p_prospecto<=0
       OR NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_actor,'crm.view'::varchar),false)
       OR NOT EXISTS (
         SELECT 1 FROM public.seg_usuarios_roles ur
         JOIN public.seg_roles r ON r.id_rol=ur.id_rol
         WHERE ur.id_usuario=p_actor AND ur.activo AND ur.fecha_revocacion IS NULL
           AND r.activo AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.request_stage_change'::varchar),false)
       )
    THEN RAISE EXCEPTION 'DENEGADO|Se requiere un asesor autenticado con permiso CRM.'; END IF;
    SELECT * INTO v_s FROM public.crm_solicitudes_retroceso_etapa
    WHERE id_prospecto=p_prospecto AND id_usuario_solicitante=p_actor
      AND estado='PENDIENTE'
    ORDER BY id_solicitud DESC LIMIT 1;
    IF NOT FOUND THEN
       RETURN jsonb_build_object('pendiente',false,'tiene_evidencia',false);
    END IF;
    RETURN jsonb_build_object(
      'pendiente',true,'id_solicitud',v_s.id_solicitud,
      'id_prospecto',v_s.id_prospecto,
      'tiene_evidencia',v_s.evidencia_storage_path IS NOT NULL,
      'fecha_solicitud',v_s.fecha_solicitud
    );
END;
$function$;

DO $verify$
DECLARE diferencias integer;
BEGIN
 SELECT count(*) INTO diferencias FROM pg_temp.rbac_scope_before b WHERE b.acceso IS DISTINCT FROM
 CASE b.tipo WHEN 'crm' THEN public.fn_crm_puede_consultar_prospecto(b.id_usuario,b.id)
 WHEN 'venta' THEN public.fn_crm_puede_consultar_venta_v1(b.id_usuario,b.id)
 WHEN 'voucher' THEN public.fn_crm_puede_ver_comprobantes_separacion_v2(b.id_usuario,b.id)
 ELSE public.fn_crm_puede_consultar_operacion_anulacion_v1(b.id_usuario,'SEPARACION',b.id) END;
 IF diferencias<>0 THEN RAISE EXCEPTION 'RBAC: % diferencias en alcances existentes; revisar antes de aplicar',diferencias; END IF;
END $verify$;

COMMIT;
