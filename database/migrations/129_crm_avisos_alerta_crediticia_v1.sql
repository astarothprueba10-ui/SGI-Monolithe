-- 129 | Aviso interno y deduplicado a asesor principal y gerencia ante ALERTA externa válida.
-- No consulta proveedores y no modifica estados de contratos ni aprueba/rechaza financiaciones.
-- Preparado para aplicar en base de PRUEBAS después de 127.
BEGIN;
CREATE OR REPLACE FUNCTION public.fn_crm_notificar_alerta_crediticia_v1()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp
AS $func$
DECLARE
    v_tipo INTEGER;
    v_cliente VARCHAR;
    v_modalidad VARCHAR;
    v_persona BIGINT;
    v_dedup VARCHAR;
BEGIN
    IF NEW.resultado <> 'ALERTA'
       OR (NEW.fecha_vencimiento IS NOT NULL AND NEW.fecha_vencimiento <= now())
    THEN
        RETURN NEW;
    END IF;
    SELECT mv.codigo INTO v_modalidad
    FROM public.ven_ventas v
    JOIN public.cfg_modalidades_venta mv ON mv.id_modalidad_venta=v.id_modalidad_venta
    WHERE v.id_venta=NEW.id_venta;
    IF v_modalidad IS DISTINCT FROM 'FINANCIADA' THEN RETURN NEW; END IF;

    SELECT id_tipo_notificacion INTO v_tipo
    FROM public.cfg_tipos_notificacion
    WHERE codigo='GENERAL' AND activo LIMIT 1;
    IF v_tipo IS NULL THEN RETURN NEW; END IF;

    SELECT c.codigo INTO v_cliente
    FROM public.ven_ventas_clientes vc
    JOIN public.crm_clientes c ON c.id_cliente=vc.id_cliente
    WHERE vc.id_venta=NEW.id_venta ORDER BY c.id_cliente LIMIT 1;

    FOR v_persona IN
        SELECT DISTINCT destinatario.id_persona
        FROM (
            SELECT ca.id_persona
            FROM public.com_ventas_asesores va
            JOIN public.com_asesores ca ON ca.id_asesor=va.id_asesor
            WHERE va.id_venta=NEW.id_venta AND va.es_principal

            UNION

            SELECT u.id_persona
            FROM public.seg_usuarios u
            JOIN public.seg_usuarios_roles ur ON ur.id_usuario=u.id_usuario
            JOIN public.seg_roles r ON r.id_rol=ur.id_rol
            WHERE r.codigo='GERENCIA' AND r.activo
              AND ur.activo AND ur.fecha_revocacion IS NULL
              AND u.id_persona IS NOT NULL
        ) destinatario
        WHERE destinatario.id_persona IS NOT NULL
    LOOP
        v_dedup:=concat('CRM_RIESGO:',NEW.id_evaluacion,':',v_persona);
        INSERT INTO public.not_notificaciones (
            id_persona,id_tipo_notificacion,titulo,mensaje,
            url_destino,referencia_modulo,referencia_entidad,referencia_id,
            datos_contexto,clave_deduplicacion,id_usuario_generacion,activo
        ) VALUES (
            v_persona,v_tipo,
            concat('Alerta financiera: ',COALESCE(v_cliente,'comprador')),
            'La evaluación crediticia externa detectó una alerta. Revise el expediente y el cronograma de pagos, contacte al cliente si corresponde y recuerde las condiciones contractuales. Una resolución contractual nunca es automática.',
            '/crm','CRM','VENTA',NEW.id_venta::VARCHAR,
            jsonb_build_object('idVenta',NEW.id_venta,'idEvaluacion',NEW.id_evaluacion,'tipo','RIESGO_CREDITICIO'),
            v_dedup,NEW.id_usuario_consulta,TRUE
        )
        ON CONFLICT (clave_deduplicacion) DO NOTHING;
    END LOOP;
    RETURN NEW;
END;
$func$;

REVOKE ALL ON FUNCTION public.fn_crm_notificar_alerta_crediticia_v1() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS trg_crm_notificar_alerta_crediticia_v1 ON public.crm_evaluaciones_crediticias;
CREATE TRIGGER trg_crm_notificar_alerta_crediticia_v1
AFTER INSERT ON public.crm_evaluaciones_crediticias
FOR EACH ROW EXECUTE FUNCTION public.fn_crm_notificar_alerta_crediticia_v1();
COMMIT;
