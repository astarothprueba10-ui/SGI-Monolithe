-- 155: agrupar la presentación de separaciones y sincronizar cartera desde el registro.
BEGIN;
CREATE FUNCTION public.fn_crm_grupo_operacion_sep_v1(p_actor bigint,p_reserva bigint)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','public','pg_temp' AS $grupo$
 SELECT jsonb_build_object('idGrupo',g.id_grupo,'estado',g.estado)
 FROM public.ven_separaciones_grupo_lotes_v1 l JOIN public.ven_separaciones_grupo_v1 g USING(id_grupo)
 WHERE l.id_reserva=p_reserva AND public.fn_crm_puede_ver_comprobantes_separacion_v2(p_actor,p_reserva)
$grupo$;
REVOKE ALL ON FUNCTION public.fn_crm_grupo_operacion_sep_v1(bigint,bigint) FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
GRANT EXECUTE ON FUNCTION public.fn_crm_grupo_operacion_sep_v1(bigint,bigint) TO sigi_app_user;

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
                                 AND rol.codigo IN ('ADMINISTRADOR','GERENCIA','SUPERVISOR_COMERCIAL','FINANZAS')
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
 string_agg(codigo, ', ' ORDER BY id) AS codigos,
 sum(monto) AS monto_total,min(fecha_vencimiento) FILTER(WHERE estado IN ('PENDIENTE','VIGENTE')) AS vencimiento_abierto,
 string_agg(DISTINCT metodo_pago,' / ' ORDER BY metodo_pago) AS metodos,
 CASE WHEN bool_or(grupo->>'estado'='REQUIERE_REVISION') AND bool_or(estado IN ('PENDIENTE','VIGENTE')) THEN 'REQUIERE_REVISION'
 WHEN count(DISTINCT estado)=1 THEN min(estado) ELSE 'ESTADOS_MIXTOS' END AS estado_grupo,
 jsonb_agg(jsonb_build_object('idReserva',id,'codigo',codigo,'lote',lote,'monto',monto,'estado',estado,'fechaVencimiento',fecha_vencimiento) ORDER BY id) AS integrantes
 FROM con_grupo WHERE grupo IS NOT NULL GROUP BY grupo->>'idGrupo'
 ), agrupadas AS (
 SELECT op.id,op.fecha,op.tipo,op.codigo,coalesce(g.lotes,op.lote) AS lote,op.proyecto,op.comprador,g.codigos,
 (to_jsonb(op)-'grupo') || CASE WHEN g.id_grupo IS NULL THEN '{}'::jsonb ELSE
 jsonb_build_object('id_grupo',g.id_grupo,'lotes_grupo',g.integrantes,'lote',g.lotes,'monto',g.monto_total,
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

CREATE OR REPLACE FUNCTION public.fn_crm_sincronizar_con_reserva_v1(p_persona bigint)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_prospecto bigint;
    v_etapa_actual text;
    v_etapa_id integer;
    v_etapa_previa integer;
    v_etapa_reserva integer;
    v_restaurar integer;
    v_requiere_reserva boolean;
    v_venta_formalizada boolean;
    v_tipo_seguimiento integer;
    v_etapa_restaurada text;
BEGIN
    SELECT p.id_prospecto, e.codigo, p.id_estado_prospecto,
           p.id_estado_pre_reserva
      INTO v_prospecto, v_etapa_actual, v_etapa_id, v_etapa_previa
    FROM public.crm_prospectos p
    JOIN public.cfg_estados_prospecto e ON e.id_estado_prospecto=p.id_estado_prospecto
    WHERE p.id_persona=p_persona AND p.activo
    FOR UPDATE OF p;
    IF v_prospecto IS NULL THEN RETURN; END IF;

    -- La etapa definitiva CONVERTIDO tiene prioridad absoluta.
    IF v_etapa_actual='CONVERTIDO' THEN
        IF v_etapa_previa IS NOT NULL THEN
            UPDATE public.crm_prospectos SET id_estado_pre_reserva=NULL
            WHERE id_prospecto=v_prospecto;
        END IF;
        RETURN;
    END IF;

    -- Evitar deshacer CON_RESERVA dentro de la aprobacion de contrato:
    -- la rutina contractual cambia a CONVERTIDO en esta misma transaccion.
    SELECT EXISTS (
        SELECT 1 FROM public.ven_ventas v
        JOIN public.ven_ventas_clientes vc ON vc.id_venta=v.id_venta AND vc.titular
        JOIN public.crm_clientes c ON c.id_cliente=vc.id_cliente AND c.activo
        JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=v.id_estado_venta
        JOIN public.ven_contratos ct ON ct.id_venta=v.id_venta
        JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=ct.id_estado_contrato
        WHERE c.id_persona=p_persona AND ev.codigo IN ('CONTRATADA','COMPLETADA','CONFIRMADA')
          AND ec.codigo IN ('VIGENTE','FINALIZADO')
    ) INTO v_venta_formalizada;
    IF v_venta_formalizada THEN RETURN; END IF;

    SELECT (
       EXISTS (
         SELECT 1 FROM public.ven_reservas r
         JOIN public.cfg_estados_reserva er ON er.id_estado_reserva=r.id_estado_reserva
         WHERE r.id_persona=p_persona AND er.codigo IN ('PENDIENTE','VIGENTE')
           AND r.fecha_vencimiento>now()
       )
       OR EXISTS (
         SELECT 1 FROM public.ven_ventas v
         JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=v.id_estado_venta
         JOIN public.ven_ventas_clientes vc ON vc.id_venta=v.id_venta AND vc.titular
         JOIN public.crm_clientes c ON c.id_cliente=vc.id_cliente
         WHERE c.id_persona=p_persona AND ev.codigo='PENDIENTE'
       )
    ) INTO v_requiere_reserva;

    SELECT id_estado_prospecto INTO STRICT v_etapa_reserva
    FROM public.cfg_estados_prospecto
    WHERE codigo='CON_RESERVA' AND activo;

    IF v_requiere_reserva THEN
        IF v_etapa_actual='CON_RESERVA' THEN RETURN; END IF;
        IF v_etapa_actual NOT IN
            ('NUEVO','CONTACTADO','EN_SEGUIMIENTO','INTERESADO','NEGOCIACION') THEN
            RAISE EXCEPTION 'ETAPA_INVALIDA|El prospecto no puede ingresar a Con Reserva desde %.',v_etapa_actual;
        END IF;

        UPDATE public.crm_prospectos SET
            id_estado_pre_reserva=COALESCE(id_estado_pre_reserva,v_etapa_id),
            id_estado_prospecto=v_etapa_reserva,
            fecha_actualizacion=now()
        WHERE id_prospecto=v_prospecto;

    ELSIF v_etapa_actual='CON_RESERVA' THEN
        SELECT e.id_estado_prospecto, e.codigo
          INTO v_restaurar, v_etapa_restaurada
        FROM public.cfg_estados_prospecto e
        WHERE e.id_estado_prospecto=v_etapa_previa
          AND e.codigo IN ('NUEVO','CONTACTADO','EN_SEGUIMIENTO','INTERESADO','NEGOCIACION')
          AND e.activo;

        IF v_restaurar IS NULL THEN
            SELECT id_estado_prospecto, codigo
              INTO STRICT v_restaurar, v_etapa_restaurada
            FROM public.cfg_estados_prospecto
            WHERE codigo='NEGOCIACION' AND activo;
        END IF;

        UPDATE public.crm_prospectos SET
            id_estado_prospecto=v_restaurar,
            id_estado_pre_reserva=NULL,
            fecha_actualizacion=now()
        WHERE id_prospecto=v_prospecto;
    ELSE
        RETURN;
    END IF;

    SELECT id_tipo_seguimiento INTO v_tipo_seguimiento
    FROM public.cfg_tipos_seguimiento WHERE codigo='OTRO' AND activo;

    IF v_tipo_seguimiento IS NOT NULL THEN
        INSERT INTO public.crm_seguimientos (
            id_prospecto,id_tipo_seguimiento,asunto,detalle,resultado,
            requiere_seguimiento,id_usuario_registro
        )
        VALUES (
            v_prospecto,v_tipo_seguimiento,'Sincronizacion automatica de reserva',
            CASE WHEN v_requiere_reserva
                THEN v_etapa_actual||' -> CON_RESERVA | Reserva pendiente o vigente, o venta pendiente'
                ELSE 'CON_RESERVA -> '||v_etapa_restaurada||' | Sin reserva pendiente o vigente ni venta pendiente'
            END,
            'Etapa sincronizada',true,NULL
        );
    END IF;
END
$function$;
CREATE OR REPLACE FUNCTION public.sp_crm_detalle_prospecto_v4(p_actor bigint, p_prospecto bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_persona BIGINT;
    v_resumen JSONB;
BEGIN
    -- 1. Validar permiso general.
    IF p_actor IS NULL
       OR NOT COALESCE(
           public.fn_usuario_tiene_permiso_seguridad(
               p_actor, 'crm.view'
           ), FALSE
       )
    THEN
        RAISE EXCEPTION
            'DENEGADO|Se requiere crm.view.';
    END IF;

    -- 2. Validar identificador.
    IF p_prospecto IS NULL OR p_prospecto <= 0 THEN
        RAISE EXCEPTION
            'DATOS_INVALIDOS|ID de prospecto invalido.';
    END IF;

    -- 3. NUEVA VALIDACION DE SEGURIDAD.
    -- Se ejecuta ANTES de consultar datos personales.
    IF NOT COALESCE(
        public.fn_crm_puede_consultar_prospecto(
            p_actor,
            p_prospecto
        ), FALSE
    )
    THEN
        RAISE EXCEPTION
            'DENEGADO|No tiene autorizacion para consultar este prospecto.';
    END IF;

    -- 4. Obtener la persona relacionada.
    SELECT p.id_persona
    INTO v_persona
    FROM public.crm_prospectos p
    JOIN public.core_personas per
        ON per.id_persona = p.id_persona
    WHERE p.id_prospecto = p_prospecto
      AND p.activo
      AND per.activo;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'PROSPECTO_NO_EXISTE|Prospecto no encontrado.';
    END IF;

    -- 5. Obtener resumen comercial.
    SELECT TO_JSONB(p)
    INTO v_resumen
    FROM public.sp_listar_prospectos() p
    WHERE p.id_prospecto = p_prospecto;

    -- 6. Conservar la estructura JSON original.
    RETURN JSONB_BUILD_OBJECT(
        'prospecto', v_resumen,

        'documentoPrincipal', (
            SELECT JSONB_BUILD_OBJECT(
                'tipoCodigo', td.codigo,
                'tipoNombre', td.nombre,
                'numero', d.numero_documento,
                'verificado', d.verificado
            )
            FROM public.core_personas_documentos d
            JOIN public.cfg_tipos_documento td
                ON td.id_tipo_documento = d.id_tipo_documento
            WHERE d.id_persona = v_persona
              AND d.activo
            ORDER BY
                d.principal DESC,
                d.id_persona_documento DESC
            LIMIT 1
        ),

        'contactos', (
            SELECT COALESCE(
                JSONB_AGG(
                    JSONB_BUILD_OBJECT(
                        'tipoCodigo', tc.codigo,
                        'valor', c.valor,
                        'principal', c.principal,
                        'verificado', c.verificado
                    )
                    ORDER BY
                        c.principal DESC,
                        c.id_persona_contacto DESC
                ),
                '[]'::JSONB
            )
            FROM public.core_personas_contactos c
            JOIN public.cfg_tipos_contacto tc
                ON tc.id_tipo_contacto = c.id_tipo_contacto
            WHERE c.id_persona = v_persona
              AND c.activo
        ),

        'intereses', (
            SELECT COALESCE(
                JSONB_AGG(
                    JSONB_BUILD_OBJECT(
                        'idInteres', i.id_prospecto_interes,
                        'idProyecto', i.id_proyecto,
                        'proyecto', pr.nombre,
                        'idLoteInteres', i.id_lote_interes,
                        'codigoLoteInteres', (SELECT l.codigo FROM public.inm_lotes l WHERE l.id_lote=i.id_lote_interes AND l.id_proyecto=i.id_proyecto),
                        'presupuestoMinimo', i.presupuesto_minimo,
                        'presupuestoMaximo', i.presupuesto_maximo,
                        'requiereFinanciamiento',
                            i.requiere_financiamiento,
                        'comentario', i.comentario
                    )
                    ORDER BY i.fecha_interes DESC
                ),
                '[]'::JSONB
            )
            FROM public.crm_prospectos_intereses i
            JOIN public.inm_proyectos pr
                ON pr.id_proyecto = i.id_proyecto
            WHERE i.id_prospecto = p_prospecto
              AND i.activo
        ),

        'reservasActivas', (
            SELECT coalesce(jsonb_agg(jsonb_build_object(
                'idReserva',r.id_reserva,'codigo',r.codigo,'idProyecto',l.id_proyecto,'proyecto',pr.nombre,
                'idLote',l.id_lote,'lote',l.codigo,'estado',er.codigo,'monto',r.monto_reserva,
                'fechaVencimiento',r.fecha_vencimiento) ORDER BY r.id_reserva),'[]'::jsonb)
            FROM public.ven_reservas r
            JOIN public.inm_lotes l USING(id_lote)
            JOIN public.inm_proyectos pr USING(id_proyecto)
            JOIN public.cfg_estados_reserva er USING(id_estado_reserva)
            WHERE r.id_persona=v_persona AND er.codigo IN ('PENDIENTE','VIGENTE') AND r.fecha_vencimiento>now()
        ),
        'esComprador', EXISTS (
            SELECT 1
            FROM public.crm_clientes c
            JOIN public.ven_ventas_clientes vc
                ON vc.id_cliente = c.id_cliente
            JOIN public.ven_ventas ve
                ON ve.id_venta = vc.id_venta
            JOIN public.cfg_estados_venta ev
                ON ev.id_estado_venta = ve.id_estado_venta
               AND ev.codigo IN ('CONFIRMADA','CONTRATADA','COMPLETADA')
            JOIN public.ven_contratos ct
                ON ct.id_venta = ve.id_venta
            JOIN public.cfg_estados_contrato ec
                ON ec.id_estado_contrato = ct.id_estado_contrato
               AND ec.codigo IN ('VIGENTE','FINALIZADO')
            WHERE c.id_persona = v_persona
        ),

        'idCliente', (
            SELECT c.id_cliente
            FROM public.crm_clientes c
            WHERE c.id_persona = v_persona
              AND c.activo
            ORDER BY c.id_cliente
            LIMIT 1
        ),

        'totalSeguimientos', (
            SELECT COUNT(*)
            FROM public.crm_seguimientos s
            WHERE s.id_prospecto = p_prospecto
        ),

        'totalVisitas', (
            SELECT COUNT(*)
            FROM public.crm_visitas v
            WHERE v.id_prospecto = p_prospecto
              AND v.activo
        )
    );
END;
$function$;
-- Regularizar únicamente prospectos con reservas abiertas, sin crear pagos ni aprobar vouchers.
DO $sync$
DECLARE persona bigint;
BEGIN
 FOR persona IN SELECT DISTINCT r.id_persona FROM public.ven_reservas r
 JOIN public.cfg_estados_reserva er USING(id_estado_reserva)
 JOIN public.crm_prospectos p ON p.id_persona=r.id_persona AND p.activo
 JOIN public.cfg_estados_prospecto ep ON ep.id_estado_prospecto=p.id_estado_prospecto
 WHERE er.codigo IN ('PENDIENTE','VIGENTE') AND r.fecha_vencimiento>now()
 AND ep.codigo IN ('NUEVO','CONTACTADO','EN_SEGUIMIENTO','INTERESADO','NEGOCIACION')
 ORDER BY r.id_persona
 LOOP PERFORM public.fn_crm_sincronizar_con_reserva_v1(persona); END LOOP;
END; $sync$;
COMMIT;
