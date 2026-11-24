-- 153: preferencia de lote explícita en el interés CRM, sin inferir identificadores de texto libre.
BEGIN;
ALTER TABLE public.crm_prospectos_intereses ADD COLUMN id_lote_interes bigint REFERENCES public.inm_lotes(id_lote);
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
CREATE FUNCTION public.sp_crm_cambiar_lote_interes_v1(p_actor bigint,p_prospecto bigint,p_proyecto bigint,p_lote bigint,p_anterior bigint,p_motivo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public','pg_temp' AS $$
DECLARE v_interes bigint; v_actual bigint; v_codigo text; v_codigo_anterior text; v_tipo integer; v_evento bigint; v_seguimiento bigint;
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'crm.edit'::varchar),false)
 OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'crm.view'::varchar),false)
 OR NOT coalesce(public.fn_crm_puede_consultar_prospecto(p_actor,p_prospecto),false)
 THEN RAISE EXCEPTION 'DENEGADO|No puede actualizar el lote de interés.'; END IF;
 IF p_lote IS NULL OR p_motivo IS NULL OR length(btrim(p_motivo)) NOT BETWEEN 5 AND 500
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Seleccione un lote e indique el motivo.'; END IF;
 PERFORM 1 FROM public.crm_prospectos WHERE id_prospecto=p_prospecto AND activo FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'PROSPECTO_NO_EXISTE|Cliente no encontrado.'; END IF;
 SELECT i.id_prospecto_interes,i.id_lote_interes INTO v_interes,v_actual FROM public.crm_prospectos_intereses i
 WHERE i.id_prospecto=p_prospecto AND i.id_proyecto=p_proyecto AND i.activo
 ORDER BY i.fecha_interes DESC,i.id_prospecto_interes DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND OR v_actual IS DISTINCT FROM p_anterior THEN RAISE EXCEPTION 'INTERES_CAMBIO|El interés se modificó; consulte el cliente nuevamente.'; END IF;
 SELECT l.codigo INTO v_codigo FROM public.inm_lotes l JOIN public.cfg_estados_lote e USING(id_estado_lote)
 WHERE l.id_lote=p_lote AND l.id_proyecto=p_proyecto AND l.activo AND e.codigo='DISPONIBLE';
 IF NOT FOUND THEN RAISE EXCEPTION 'PROYECTO_INVALIDO|El lote no está disponible en este proyecto.'; END IF;
 IF v_actual=p_lote THEN RETURN jsonb_build_object('idLoteInteres',p_lote,'codigoLoteInteres',v_codigo); END IF;
 SELECT codigo INTO v_codigo_anterior FROM public.inm_lotes WHERE id_lote=v_actual;
 UPDATE public.crm_prospectos_intereses SET id_lote_interes=p_lote,fecha_actualizacion=now() WHERE id_prospecto_interes=v_interes;
 SELECT id_tipo_seguimiento INTO STRICT v_tipo FROM public.cfg_tipos_seguimiento WHERE codigo='OTRO' AND activo;
 INSERT INTO public.crm_seguimientos(id_prospecto,id_tipo_seguimiento,asunto,detalle,resultado,requiere_seguimiento,id_usuario_registro)
 VALUES(p_prospecto,v_tipo,CASE WHEN v_actual IS NULL THEN 'Registro de lote de interés' ELSE 'Cambio de lote de interés' END,
 'Lote anterior: '||coalesce(v_codigo_anterior,'Sin lote identificado')||' | Nuevo lote: '||v_codigo||' | Motivo: '||btrim(p_motivo),
 'Interés actualizado',false,p_actor) RETURNING id_seguimiento INTO v_seguimiento;
 SELECT public.sp_registrar_auditoria(p_actor,'CRM'::varchar,'CAMBIO_LOTE_INTERES'::varchar,'PROSPECTO_INTERES'::varchar,v_interes::varchar,'EXITOSO'::varchar,'Actualización de lote de interés'::varchar,jsonb_build_object('anterior',v_actual,'nuevo',p_lote,'idSeguimiento',v_seguimiento)) INTO v_evento;
 IF v_evento IS NULL THEN RAISE EXCEPTION 'AUDITORIA_FALLIDA|No se registró auditoría.'; END IF;
 RETURN jsonb_build_object('idLoteInteres',p_lote,'codigoLoteInteres',v_codigo);
END;
$$;
REVOKE ALL ON FUNCTION public.sp_crm_cambiar_lote_interes_v1(bigint,bigint,bigint,bigint,bigint,text) FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
GRANT EXECUTE ON FUNCTION public.sp_crm_cambiar_lote_interes_v1(bigint,bigint,bigint,bigint,bigint,text) TO sigi_app_user;
COMMIT;
