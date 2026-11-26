-- 165: autorización de anulaciones y habilitación de asesor por capacidades.
BEGIN;
CREATE TEMP TABLE rbac_asesores_before ON COMMIT DROP AS SELECT id_asesor FROM public.sp_listar_asesores();
CREATE TEMP TABLE rbac_legal_before ON COMMIT DROP AS SELECT u.id_usuario,s.id_solicitud,public.fn_crm_puede_acceder_expediente_legal_v1(u.id_usuario,s.id_solicitud) acceso FROM public.seg_usuarios u CROSS JOIN public.crm_solicitudes_anulacion s;
CREATE OR REPLACE FUNCTION public.fn_sincronizar_permiso_gerencia()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_id_gerencia INT;
BEGIN

    -- Revisiones jurídicamente independientes: Gerencia aprueba,
    -- pero no emite dictámenes del área legal.
    IF NEW.codigo IN (
                'sales.legal.review',
                'annulments.review_finance',
                'annulments.review_legal',
                'crm.operate_advisor'
            ) THEN
        UPDATE public.seg_roles_permisos rp
        SET activo=FALSE
        FROM public.seg_roles r
        WHERE rp.id_rol=r.id_rol
          AND r.codigo='GERENCIA'
          AND rp.id_permiso=NEW.id_permiso;
        RETURN NEW;
    END IF;

    SELECT id_rol
    INTO v_id_gerencia
    FROM public.seg_roles
    WHERE codigo = 'GERENCIA'
    LIMIT 1;

    IF v_id_gerencia IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.activo = TRUE THEN

        INSERT INTO public.seg_roles_permisos (
            id_rol,
            id_permiso,
            activo
        )
        VALUES (
            v_id_gerencia,
            NEW.id_permiso,
            TRUE
        )
        ON CONFLICT (id_rol, id_permiso)
        DO UPDATE SET
            activo = TRUE;

    ELSE

        UPDATE public.seg_roles_permisos
        SET activo = FALSE
        WHERE id_rol = v_id_gerencia
          AND id_permiso = NEW.id_permiso;

    END IF;

    RETURN NEW;
END;
$function$;

INSERT INTO public.seg_permisos(codigo,modulo,recurso,accion,nombre,descripcion)
VALUES ('crm.operate_advisor','crm','crm','operate_advisor','Habilitar como asesor comercial','Designación operativa de trabajador activo; los permisos de cartera se configuran aparte.'),
('annulments.request_global','annulments','annulments','request_global','Solicitar anulaciones de toda la cartera','Requiere permiso de crear anulaciones; no sustituye validaciones de operación.')
ON CONFLICT(codigo) DO NOTHING;
INSERT INTO public.seg_roles_permisos(id_rol,id_permiso,activo)
SELECT r.id_rol,p.id_permiso,true FROM public.seg_roles r CROSS JOIN public.seg_permisos p
WHERE (r.codigo='ASESOR' AND p.codigo='crm.operate_advisor') OR (r.codigo IN ('GERENCIA','ADMINISTRADOR') AND p.codigo='annulments.request_global')
ON CONFLICT(id_rol,id_permiso) DO NOTHING;

CREATE FUNCTION public.fn_rbac_rol_operativo_asesor_v1(p_rol integer)
RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'pg_catalog','public','pg_temp' AS $fn$
 SELECT EXISTS(SELECT 1 FROM public.seg_roles_permisos rp JOIN public.seg_permisos p USING(id_permiso)
 WHERE rp.id_rol=p_rol AND rp.activo AND p.activo AND p.codigo='crm.operate_advisor');
$fn$;
REVOKE ALL ON FUNCTION public.fn_rbac_rol_operativo_asesor_v1(integer) FROM PUBLIC,anon,authenticated,service_role,sigi_app_user,sgi_backend_user;

CREATE OR REPLACE FUNCTION public.fn_crm_puede_acceder_expediente_legal_v1(p_actor bigint, p_solicitud bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
SELECT coalesce((
 SELECT (
   (
     public.fn_usuario_tiene_permiso_seguridad(p_actor,'annulments.approve'::varchar)
     AND EXISTS(
       SELECT 1 FROM public.seg_usuarios_roles ur
       JOIN public.seg_roles r ON r.id_rol=ur.id_rol
       WHERE ur.id_usuario=p_actor AND ur.activo AND ur.fecha_revocacion IS NULL
         AND r.activo AND (coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'annulments.approve'::varchar),false) OR coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'annulments.reject'::varchar),false))
     )
     AND public.fn_crm_puede_consultar_operacion_anulacion_v1(
       p_actor,s.tipo_operacion,s.id_venta
     )
   )
   OR
   (
     public.fn_usuario_tiene_permiso_seguridad(p_actor,'annulments.review_legal'::varchar)
     AND EXISTS(
       SELECT 1 FROM public.seg_usuarios_roles ur
       JOIN public.seg_roles r ON r.id_rol=ur.id_rol
       WHERE ur.id_usuario=p_actor AND ur.activo AND ur.fecha_revocacion IS NULL
         AND r.activo AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'annulments.review_legal'::varchar),false)
     )
     AND NOT EXISTS(
       SELECT 1 FROM public.seg_usuarios_roles ur
       JOIN public.seg_roles r ON r.id_rol=ur.id_rol
       WHERE ur.id_usuario=p_actor AND ur.activo AND ur.fecha_revocacion IS NULL
         AND r.activo AND (coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'annulments.approve'::varchar),false) OR coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'annulments.reject'::varchar),false))
     )
     AND p_actor<>s.id_usuario_solicitante
     AND s.estado='PENDIENTE_LEGAL'
   )
 )
 FROM public.crm_solicitudes_anulacion s
 WHERE s.id_solicitud=p_solicitud
   AND s.tipo_operacion='VENTA'
   AND s.requiere_revision_legal
),false)
WHERE p_actor IS NOT NULL AND p_actor>0
  AND coalesce(public.fn_usuario_tiene_permiso_seguridad(
    p_actor,'annulments.view'::varchar),false)
  AND p_solicitud IS NOT NULL AND p_solicitud>0;
$function$;

CREATE OR REPLACE FUNCTION public.sp_crm_autorizar_carga_evidencia_legal_v1(p_actor bigint, p_solicitud bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_s public.crm_solicitudes_anulacion%ROWTYPE;
BEGIN
  IF p_actor IS NULL OR p_actor<=0 OR p_solicitud IS NULL OR p_solicitud<=0 THEN
    RAISE EXCEPTION 'DATOS_INVALIDOS|Actor o solicitud invalida.';
  END IF;

  IF NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(
      p_actor,'annulments.approve'::varchar),false)
     OR NOT EXISTS (
        SELECT 1 FROM public.seg_usuarios_roles ur
        JOIN public.seg_roles rol ON rol.id_rol=ur.id_rol
        WHERE ur.id_usuario=p_actor AND ur.activo
          AND ur.fecha_revocacion IS NULL AND rol.activo
          AND (coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'annulments.approve'::varchar),false) OR coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'annulments.reject'::varchar),false))
     ) THEN
      RAISE EXCEPTION 'DENEGADO|Se requiere permiso de aprobación para adjuntar evidencias legales.';
  END IF;

  SELECT * INTO v_s FROM public.crm_solicitudes_anulacion
  WHERE id_solicitud=p_solicitud;

  IF NOT FOUND OR v_s.estado<>'PENDIENTE_LEGAL'
     OR v_s.tipo_operacion<>'VENTA'
     OR NOT v_s.requiere_revision_legal THEN
     RAISE EXCEPTION 'SOLICITUD_NO_ADMISIBLE|Solo ventas pendientes de revision legal admiten esta carga.';
  END IF;

  IF NOT public.fn_crm_puede_consultar_operacion_anulacion_v1(
      p_actor,v_s.tipo_operacion,v_s.id_venta) THEN
     RAISE EXCEPTION 'DENEGADO|Operacion fuera del alcance autorizado.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets b
    WHERE b.id='anulaciones-legales-private'
      AND b.public=false AND b.file_size_limit=10485760
      AND b.allowed_mime_types=ARRAY['application/pdf']::text[]
  ) THEN
    RAISE EXCEPTION 'CONFIGURACION_INVALIDA|Storage legal privado no disponible.';
  END IF;

  RETURN jsonb_build_object(
    'autorizado',true,
    'idSolicitud',p_solicitud,
    'idVenta',v_s.id_venta,
    'bucket','anulaciones-legales-private',
    'prefijo','expedientes/'||p_solicitud::text||'/',
    'tipoMime','application/pdf',
    'maxBytes',10485760,
    'estadoSolicitud',v_s.estado,
    'mensaje','Carga privada autorizada; la evidencia no queda aprobada por subirla.'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_crm_decidir_solicitud_anulacion_v1(p_actor bigint, p_solicitud bigint, p_version_esperada integer, p_accion character varying, p_justificacion text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_accion text := upper(btrim(coalesce(p_accion,'')));
    v_justificacion text := btrim(coalesce(p_justificacion,''));
    v_s public.crm_solicitudes_anulacion%ROWTYPE;
    v_estado_nuevo text;
    v_evento text;
    v_estado_operacion text;
    v_estado_contrato text;
    v_id_contrato bigint;
    v_reserva_venta bigint;
    v_operacion bigint;
    v_financiero_actual boolean := false;
    v_legal_actual boolean := false;
    v_tiene_pagos boolean := false;
    v_tiene_vouchers boolean := false;
    v_tiene_planes boolean := false;
    v_tiene_cuotas boolean := false;
    v_financiero boolean;
    v_legal boolean;
    v_requiere_decision boolean;
    v_revision_resultado text;
    v_revision_huella text;
    v_revision_usuario bigint;
    v_resumen_financiero jsonb;
    v_legal_revision public.crm_anulaciones_revisiones%ROWTYPE;
    v_legal_evidencia public.crm_anulaciones_evidencias_legales%ROWTYPE;
    v_legal_storage_id uuid;
    v_legal_storage_updated timestamptz;
    v_legal_storage_mime text;
    v_legal_storage_size bigint;
    v_legal_reviewer_activo boolean;
BEGIN
    IF p_actor IS NULL OR p_actor<=0
       OR p_solicitud IS NULL OR p_solicitud<=0
       OR p_version_esperada IS NULL OR p_version_esperada<=0
       OR v_accion NOT IN ('INICIAR_REVISION','DERIVAR_FINANZAS',
                           'DERIVAR_LEGAL','APROBAR','RECHAZAR')
       OR length(v_justificacion) NOT BETWEEN 20 AND 2000 THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|Solicitud, version, accion o justificacion invalida (20-2000 caracteres).';
    END IF;

    -- Decisión mediante permisos efectivos; conservar las restricciones de independencia.
    IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(
       p_actor,CASE WHEN v_accion='RECHAZAR'
                 THEN 'annulments.reject'::varchar
                 ELSE 'annulments.approve'::varchar END),false)
       OR NOT EXISTS (
          SELECT 1 FROM public.seg_usuarios_roles ur
          JOIN public.seg_roles rol ON rol.id_rol=ur.id_rol
          WHERE ur.id_usuario=p_actor
            AND ur.activo AND ur.fecha_revocacion IS NULL
            AND rol.activo AND (coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'annulments.approve'::varchar),false) OR coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'annulments.reject'::varchar),false))
       ) THEN
        RAISE EXCEPTION 'DENEGADO|Se requiere permiso de aprobación o rechazo de anulaciones.';
    END IF;

    SELECT * INTO v_s FROM public.crm_solicitudes_anulacion
    WHERE id_solicitud=p_solicitud
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'SOLICITUD_NO_EXISTE|No existe la solicitud indicada.';
    END IF;

    IF v_s.version<>p_version_esperada THEN
        RAISE EXCEPTION 'VERSION_DESACTUALIZADA|La solicitud fue modificada; recargue antes de decidir.';
    END IF;

    IF v_s.estado NOT IN (
       'SOLICITADA','EN_REVISION','PENDIENTE_FINANZAS','PENDIENTE_LEGAL'
    ) THEN
        RAISE EXCEPTION 'SOLICITUD_CERRADA|Esta solicitud no admite otra decision.';
    END IF;

    v_operacion:=coalesce(v_s.id_venta,v_s.id_reserva);

    IF NOT public.fn_crm_puede_consultar_operacion_anulacion_v1(
        p_actor,v_s.tipo_operacion,v_operacion) THEN
        RAISE EXCEPTION 'DENEGADO|La operacion no esta en el alcance autorizado.';
    END IF;

    -- Leer el estado actual: no se debe aprobar a partir de datos obsoletos.
    IF v_s.tipo_operacion='SEPARACION' THEN
        SELECT er.codigo
        INTO v_estado_operacion
        FROM public.ven_reservas r
        JOIN public.cfg_estados_reserva er ON er.id_estado_reserva=r.id_estado_reserva
        WHERE r.id_reserva=v_s.id_reserva;
    ELSE
        SELECT ev.codigo,v.id_reserva
        INTO v_estado_operacion,v_reserva_venta
        FROM public.ven_ventas v
        JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=v.id_estado_venta
        WHERE v.id_venta=v_s.id_venta;

        SELECT c.id_contrato,ec.codigo
        INTO v_id_contrato,v_estado_contrato
        FROM public.ven_contratos c
        JOIN public.cfg_estados_contrato ec
          ON ec.id_estado_contrato=c.id_estado_contrato
        WHERE c.id_venta=v_s.id_venta
        ORDER BY c.id_contrato DESC LIMIT 1;

        v_legal_actual:=v_estado_operacion='CONTRATADA'
          OR v_estado_contrato IN ('VIGENTE','RESUELTO','FINALIZADO')
          OR EXISTS (
             SELECT 1 FROM public.ven_contratos_aprobaciones ap
             JOIN public.ven_contratos c ON c.id_contrato=ap.id_contrato
             WHERE c.id_venta=v_s.id_venta AND ap.firma_revisada=true
          );
    END IF;

    -- Si alguien pagó tras la solicitud, el riesgo debe detectarse igualmente.
    SELECT EXISTS (
      SELECT 1 FROM public.pag_pagos p
      JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago
      WHERE ((NOT EXISTS(SELECT 1 FROM public.pag_separaciones_grupo_abonos_v1 a WHERE a.id_pago=p.id_pago) AND (
         (v_s.id_reserva IS NOT NULL AND p.id_reserva=v_s.id_reserva)
         OR (v_s.id_venta IS NOT NULL AND
             (p.id_venta=v_s.id_venta
              OR (v_reserva_venta IS NOT NULL AND p.id_reserva=v_reserva_venta)))
      )) OR EXISTS(SELECT 1 FROM public.pag_separaciones_grupo_distribucion_v1 d WHERE d.id_pago=p.id_pago AND d.id_reserva=coalesce(v_s.id_reserva,v_reserva_venta))) AND ep.codigo<>'ANULADO'
    ) INTO v_tiene_pagos;

    SELECT EXISTS (
      SELECT 1 FROM public.pag_vouchers vo
      JOIN public.cfg_estados_voucher ev ON ev.id_estado_voucher=vo.id_estado_voucher
      JOIN public.pag_pagos p ON p.id_pago=vo.id_pago
      WHERE ((NOT EXISTS(SELECT 1 FROM public.pag_separaciones_grupo_abonos_v1 a WHERE a.id_pago=p.id_pago) AND (
         (v_s.id_reserva IS NOT NULL AND p.id_reserva=v_s.id_reserva)
         OR (v_s.id_venta IS NOT NULL AND
             (p.id_venta=v_s.id_venta
              OR (v_reserva_venta IS NOT NULL AND p.id_reserva=v_reserva_venta)))
      )) OR EXISTS(SELECT 1 FROM public.pag_separaciones_grupo_distribucion_v1 d WHERE d.id_pago=p.id_pago AND d.id_reserva=coalesce(v_s.id_reserva,v_reserva_venta))) AND ev.codigo<>'RECHAZADO'
    ) INTO v_tiene_vouchers;

    SELECT EXISTS (
       SELECT 1 FROM public.pag_planes_pago pp
       WHERE v_s.id_venta IS NOT NULL AND pp.id_venta=v_s.id_venta
    ) INTO v_tiene_planes;

    SELECT EXISTS (
       SELECT 1 FROM public.pag_cuotas cu
       JOIN public.pag_planes_pago pp ON pp.id_plan_pago=cu.id_plan_pago
       WHERE v_s.id_venta IS NOT NULL AND pp.id_venta=v_s.id_venta
    ) INTO v_tiene_cuotas;

    v_financiero_actual:=v_tiene_pagos OR v_tiene_vouchers
                         OR v_tiene_planes OR v_tiene_cuotas;
    v_financiero:=v_s.requiere_revision_financiera OR v_financiero_actual;
    v_legal:=v_s.requiere_revision_legal OR v_legal_actual;

    IF v_accion='INICIAR_REVISION' THEN
        IF v_s.estado<>'SOLICITADA' THEN
            RAISE EXCEPTION 'TRANSICION_INVALIDA|Solo una solicitud nueva puede iniciarse en revision.';
        END IF;
        v_estado_nuevo:='EN_REVISION';
        v_evento:='REVISION_INICIADA';
    ELSIF v_accion='DERIVAR_FINANZAS' THEN
        IF v_s.estado='PENDIENTE_FINANZAS' THEN
            RAISE EXCEPTION 'TRANSICION_INVALIDA|La solicitud ya esta pendiente de Finanzas.';
        END IF;
        v_financiero:=true;
        v_estado_nuevo:='PENDIENTE_FINANZAS';
        v_evento:='DERIVADA_FINANZAS';
    ELSIF v_accion='DERIVAR_LEGAL' THEN
        IF v_s.estado='PENDIENTE_LEGAL' THEN
            RAISE EXCEPTION 'TRANSICION_INVALIDA|La solicitud ya esta pendiente de Legal.';
        END IF;
        v_legal:=true;
        v_estado_nuevo:='PENDIENTE_LEGAL';
        v_evento:='DERIVADA_LEGAL';
    ELSIF v_accion='APROBAR' THEN
        IF v_s.estado NOT IN ('SOLICITADA','EN_REVISION') THEN
            RAISE EXCEPTION 'REVISION_OBLIGATORIA|No se puede aprobar una solicitud derivada sin cerrar formalmente su revision.';
        END IF;
        IF (
           (v_s.tipo_operacion='SEPARACION'
              AND v_estado_operacion NOT IN ('PENDIENTE','VIGENTE'))
           OR
           (v_s.tipo_operacion='VENTA'
              AND v_estado_operacion NOT IN ('PENDIENTE','CONFIRMADA','CONTRATADA'))
           OR v_estado_operacion IS NULL
        ) THEN
            RAISE EXCEPTION 'OPERACION_NO_SOLICITABLE|La operacion ya no admite anulacion.';
        END IF;
        IF v_s.tipo_operacion='SEPARACION' AND EXISTS (
          SELECT 1 FROM public.ven_ventas v
          JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=v.id_estado_venta
          WHERE v.id_reserva=v_s.id_reserva AND ev.codigo<>'ANULADA'
        ) THEN
            RAISE EXCEPTION 'OPERACION_NO_SOLICITABLE|La separacion ya esta asociada a una venta activa.';
        END IF;
        -- El expediente conserva el indicador de que requirió revisión.
        -- Para aprobar se exige un dictamen financiero conforme, vigente y
        -- emitido por un usuario distinto del gerente que decide.
        IF v_financiero THEN
            SELECT r.resultado,r.detalle_revision->>'huella',r.id_usuario_revisor
            INTO v_revision_resultado,v_revision_huella,v_revision_usuario
            FROM public.crm_anulaciones_revisiones r
            WHERE r.id_solicitud=v_s.id_solicitud
              AND r.tipo_revision='FINANCIERA'
            ORDER BY r.fecha_revision DESC,r.id_revision DESC
            LIMIT 1;

            IF v_revision_resultado IS DISTINCT FROM 'CONFORME'
               OR v_revision_usuario IS NULL
               OR v_revision_usuario=p_actor THEN
                RAISE EXCEPTION 'REVISION_OBLIGATORIA|Se requiere dictamen financiero conforme e independiente.';
            END IF;

            v_resumen_financiero :=
                public.fn_crm_resumen_financiero_anulacion_v1(
                    v_s.tipo_operacion,v_operacion);

            IF v_revision_huella IS DISTINCT FROM
                 (v_resumen_financiero->>'huella')
               OR (v_resumen_financiero->>'pagosNoAnulados')::bigint>0
               OR (v_resumen_financiero->>'vouchersNoRechazados')::bigint>0
               OR (v_resumen_financiero->>'planesAbiertos')::bigint>0
               OR (v_resumen_financiero->>'cuotasNoAnuladas')::bigint>0
               OR (v_resumen_financiero->>'pagosHistoricos')::bigint>0
               OR (v_resumen_financiero->>'vouchersHistoricos')::bigint>0 THEN
                RAISE EXCEPTION 'REVISION_DESACTUALIZADA|Cambió la situación financiera o falta soporte verificable.';
            END IF;
        END IF;

        -- Solo un dictamen jurídico favorable, vigente e independiente
        -- habilita la aprobación; no ejecuta la anulación.
        IF v_legal THEN
            SELECT * INTO v_legal_revision
            FROM public.crm_anulaciones_revisiones r
            WHERE r.id_solicitud=v_s.id_solicitud
              AND r.tipo_revision='LEGAL'
            ORDER BY r.fecha_revision DESC,r.id_revision DESC
            LIMIT 1;

            IF NOT FOUND OR v_legal_revision.resultado<>'CONFORME'
               OR v_legal_revision.id_usuario_revisor=p_actor
               OR v_legal_revision.referencia_evidencia IS NULL
               OR v_legal_revision.referencia_evidencia !~ '^[0-9]+$' THEN
                RAISE EXCEPTION 'REVISION_LEGAL_OBLIGATORIA|Se requiere dictamen jurídico conforme e independiente.';
            END IF;

            SELECT (
                coalesce(public.fn_usuario_tiene_permiso_seguridad(
                    v_legal_revision.id_usuario_revisor,'annulments.review_legal'::varchar),false)
                AND EXISTS(
                    SELECT 1 FROM public.seg_usuarios_roles ur
                    JOIN public.seg_roles rol ON rol.id_rol=ur.id_rol
                    WHERE ur.id_usuario=v_legal_revision.id_usuario_revisor
                      AND ur.activo AND ur.fecha_revocacion IS NULL
                      AND rol.activo AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'annulments.review_legal'::varchar),false)
                )
                AND NOT EXISTS(
                    SELECT 1 FROM public.seg_usuarios_roles ur
                    JOIN public.seg_roles rol ON rol.id_rol=ur.id_rol
                    WHERE ur.id_usuario=v_legal_revision.id_usuario_revisor
                      AND ur.activo AND ur.fecha_revocacion IS NULL
                      AND rol.activo AND (coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'annulments.approve'::varchar),false) OR coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'annulments.reject'::varchar),false))
                )
            ) INTO v_legal_reviewer_activo;

            IF NOT coalesce(v_legal_reviewer_activo,false)
               OR v_legal_revision.id_usuario_revisor=v_s.id_usuario_solicitante THEN
                RAISE EXCEPTION 'REVISION_LEGAL_OBLIGATORIA|El revisor jurídico ya no está autorizado o es incompatible.';
            END IF;

            SELECT * INTO v_legal_evidencia
            FROM public.crm_anulaciones_evidencias_legales e
            WHERE e.id_evidencia=v_legal_revision.referencia_evidencia::bigint
              AND e.id_solicitud=v_s.id_solicitud;

            IF NOT FOUND OR
               v_legal_evidencia.tipo_documento NOT IN ('INFORME_LEGAL','ACUERDO_RESOLUCION')
               OR v_legal_revision.detalle_revision->>'idContrato' IS DISTINCT FROM
                   v_id_contrato::text
               OR v_legal_revision.detalle_revision->>'estadoContrato' IS DISTINCT FROM
                   v_estado_contrato
               OR v_legal_revision.detalle_revision->>'estadoVenta' IS DISTINCT FROM
                   v_estado_operacion
               OR v_legal_revision.detalle_revision->>'sha256' IS DISTINCT FROM
                   btrim(v_legal_evidencia.hash_sha256)
               OR v_legal_revision.detalle_revision->>'storageObjectId' IS DISTINCT FROM
                   v_legal_evidencia.storage_object_id::text
               OR (v_legal_revision.detalle_revision->>'storageUpdatedAt')::timestamptz
                   IS DISTINCT FROM v_legal_evidencia.storage_updated_at THEN
                RAISE EXCEPTION 'REVISION_LEGAL_DESACTUALIZADA|El documento, venta o contrato cambió desde el dictamen.';
            END IF;

            SELECT o.id,o.updated_at,o.metadata->>'mimetype',
                   CASE WHEN (o.metadata->>'size') ~ '^[0-9]+$'
                     THEN (o.metadata->>'size')::bigint ELSE NULL END
            INTO v_legal_storage_id,v_legal_storage_updated,
                 v_legal_storage_mime,v_legal_storage_size
            FROM storage.objects o
            WHERE o.bucket_id=v_legal_evidencia.bucket
              AND o.name=v_legal_evidencia.clave_archivo;

            IF v_legal_storage_id IS DISTINCT FROM v_legal_evidencia.storage_object_id
               OR v_legal_storage_updated IS DISTINCT FROM v_legal_evidencia.storage_updated_at
               OR v_legal_storage_mime IS DISTINCT FROM 'application/pdf'
               OR v_legal_storage_size IS DISTINCT FROM v_legal_evidencia.tamano_bytes THEN
                RAISE EXCEPTION 'REVISION_LEGAL_DESACTUALIZADA|El PDF legal fue reemplazado o retirado.';
            END IF;
        END IF;
        v_estado_nuevo:='APROBADA';
        v_evento:='SOLICITUD_APROBADA';
    ELSE
        v_estado_nuevo:='RECHAZADA';
        v_evento:='SOLICITUD_RECHAZADA';
    END IF;

    v_requiere_decision:=v_estado_nuevo IN ('APROBADA','RECHAZADA');

    UPDATE public.crm_solicitudes_anulacion
    SET estado=v_estado_nuevo,
        requiere_revision_financiera=v_financiero,
        requiere_revision_legal=v_legal,
        id_usuario_decision=CASE WHEN v_requiere_decision
                                 THEN p_actor ELSE id_usuario_decision END,
        fecha_decision=CASE WHEN v_requiere_decision
                            THEN now() ELSE fecha_decision END,
        justificacion_decision=CASE WHEN v_requiere_decision
                                    THEN v_justificacion ELSE justificacion_decision END,
        fecha_actualizacion=now(),
        version=version+1
    WHERE id_solicitud=v_s.id_solicitud AND version=p_version_esperada;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'VERSION_DESACTUALIZADA|No se pudo actualizar la solicitud.';
    END IF;

    INSERT INTO public.crm_anulaciones_historial (
      id_solicitud,tipo_operacion,id_reserva,id_venta,id_contrato,
      evento,origen,id_usuario_actor,motivo,
      estado_anterior_operacion,estado_nuevo_operacion,
      estados_antes,estados_despues,impacto_financiero,detalles
    ) VALUES (
      v_s.id_solicitud,v_s.tipo_operacion,v_s.id_reserva,v_s.id_venta,
      v_id_contrato,v_evento,'USUARIO',p_actor,v_justificacion,
      v_estado_operacion,v_estado_operacion,
      jsonb_build_object('operacion',v_estado_operacion,
                         'solicitud',v_s.estado,
                         'version',v_s.version),
      jsonb_build_object('operacion',v_estado_operacion,
                         'solicitud',v_estado_nuevo,
                         'version',v_s.version+1),
      jsonb_build_object('requiereRevisionFinanciera',v_financiero,
                         'pagos',v_tiene_pagos,
                         'vouchers',v_tiene_vouchers,
                         'planes',v_tiene_planes,
                         'cuotas',v_tiene_cuotas),
      jsonb_build_object('accion',v_accion,
                         'requiereRevisionLegal',v_legal,
                         'estadoContrato',v_estado_contrato,
                         'ejecucionRealizada',false)
    );

    RETURN jsonb_build_object(
      'success',true,'idSolicitud',v_s.id_solicitud,
      'estadoAnterior',v_s.estado,'estadoSolicitud',v_estado_nuevo,
      'version',v_s.version+1,
      'requiereRevisionFinanciera',v_financiero,
      'requiereRevisionLegal',v_legal,
      'operacionModificada',false,
      'mensaje','Decision registrada; no se modifico la operacion comercial.'
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_crm_solicitar_anulacion_v1(p_actor bigint, p_tipo character varying, p_id_operacion bigint, p_categoria character varying, p_motivo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_tipo text := upper(btrim(coalesce(p_tipo,'')));
    v_categoria text := upper(btrim(coalesce(p_categoria,'')));
    v_motivo text := btrim(coalesce(p_motivo,''));
    v_lote bigint;
    v_persona bigint;
    v_reserva_venta bigint;
    v_estado text;
    v_codigo text;
    v_id_contrato bigint;
    v_estado_contrato text;
    v_tiene_aprobacion boolean := false;
    v_autorizado_global boolean := false;
    v_alcance boolean := false;
    v_financiera boolean := false;
    v_legal boolean := false;
    v_hay_pagos boolean := false;
    v_hay_vouchers boolean := false;
    v_hay_plan boolean := false;
    v_hay_cuotas boolean := false;
    v_solicitud bigint;
    v_id_reserva bigint;
    v_id_venta bigint;
BEGIN
    IF p_actor IS NULL OR p_actor<=0 OR p_id_operacion IS NULL OR p_id_operacion<=0
       OR v_tipo NOT IN ('SEPARACION','VENTA')
       OR v_categoria NOT IN ('DESISTIMIENTO_CLIENTE','MUTUO_ACUERDO',
                              'ERROR_COMERCIAL','INCUMPLIMIENTO','OTRO')
       OR length(v_motivo) NOT BETWEEN 20 AND 2000 THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|Tipo, operacion, categoria o justificacion invalidos.';
    END IF;

    IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'annulments.create'),false) THEN
        RAISE EXCEPTION 'DENEGADO|No tiene permiso para crear solicitudes de Anulaciones.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.seg_usuarios_roles ur
        JOIN public.seg_roles rol ON rol.id_rol=ur.id_rol
        WHERE ur.id_usuario=p_actor AND ur.activo
          AND ur.fecha_revocacion IS NULL AND rol.activo
          AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'annulments.create'::varchar),false)
    ) THEN
        RAISE EXCEPTION 'DENEGADO|Este rol no puede registrar solicitudes comerciales.';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.seg_usuarios_roles ur
        JOIN public.seg_roles rol ON rol.id_rol=ur.id_rol
        WHERE ur.id_usuario=p_actor AND ur.activo
          AND ur.fecha_revocacion IS NULL AND rol.activo
          AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'annulments.request_global'::varchar),false)
    ) INTO v_autorizado_global;

    -- Bloqueo consistente: lote -> reserva/venta.
    IF v_tipo='SEPARACION' THEN
        SELECT id_lote INTO v_lote
        FROM public.ven_reservas WHERE id_reserva=p_id_operacion;
    ELSE
        SELECT id_lote INTO v_lote
        FROM public.ven_ventas WHERE id_venta=p_id_operacion;
    END IF;

    IF v_lote IS NULL THEN
        RAISE EXCEPTION 'OPERACION_NO_EXISTE|No se encontro la operacion.';
    END IF;

    PERFORM 1 FROM public.inm_lotes WHERE id_lote=v_lote FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'LOTE_NO_EXISTE|No se encontro el lote relacionado.';
    END IF;

    IF v_tipo='SEPARACION' THEN
        SELECT r.codigo, er.codigo,r.id_persona
        INTO v_codigo,v_estado,v_persona
        FROM public.ven_reservas r
        JOIN public.cfg_estados_reserva er ON er.id_estado_reserva=r.id_estado_reserva
        WHERE r.id_reserva=p_id_operacion AND r.id_lote=v_lote
        FOR UPDATE OF r;

        IF v_estado NOT IN ('PENDIENTE','VIGENTE') THEN
            RAISE EXCEPTION 'OPERACION_NO_SOLICITABLE|La separacion no se encuentra activa.';
        END IF;

        SELECT v_autorizado_global OR EXISTS (
            SELECT 1 FROM public.ven_reservas r
            WHERE r.id_reserva=p_id_operacion AND r.id_usuario_registro=p_actor
        ) OR EXISTS (
            SELECT 1 FROM public.crm_prospectos pro
            JOIN public.crm_prospectos_intereses i
              ON i.id_prospecto=pro.id_prospecto
             AND i.id_proyecto=(SELECT id_proyecto FROM public.inm_lotes WHERE id_lote=v_lote)
             AND i.activo
            WHERE pro.id_persona=v_persona
              AND public.fn_crm_puede_consultar_prospecto(p_actor,pro.id_prospecto)
        ) INTO v_alcance;

        IF EXISTS (
            SELECT 1 FROM public.ven_ventas v
            JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=v.id_estado_venta
            WHERE v.id_reserva=p_id_operacion AND ev.codigo<>'ANULADA'
        ) THEN
            RAISE EXCEPTION 'OPERACION_NO_SOLICITABLE|La separacion tiene venta asociada; tramitar la venta.';
        END IF;

        v_id_reserva:=p_id_operacion;
    ELSE
        SELECT v.codigo,ev.codigo,v.id_reserva
        INTO v_codigo,v_estado,v_reserva_venta
        FROM public.ven_ventas v
        JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=v.id_estado_venta
        WHERE v.id_venta=p_id_operacion AND v.id_lote=v_lote
        FOR UPDATE OF v;

        IF v_estado NOT IN ('PENDIENTE','CONFIRMADA','CONTRATADA') THEN
            RAISE EXCEPTION 'OPERACION_NO_SOLICITABLE|El estado de la venta no permite solicitar anulacion.';
        END IF;

        SELECT v_autorizado_global OR EXISTS (
            SELECT 1 FROM public.ven_ventas v
            WHERE v.id_venta=p_id_operacion AND v.id_usuario_registro=p_actor
        ) OR EXISTS (
            SELECT 1
            FROM public.com_ventas_asesores va
            JOIN public.com_asesores a ON a.id_asesor=va.id_asesor
            JOIN public.seg_usuarios u ON u.id_persona=a.id_persona
            WHERE va.id_venta=p_id_operacion AND u.id_usuario=p_actor
        ) INTO v_alcance;

        SELECT c.id_contrato,ec.codigo
        INTO v_id_contrato,v_estado_contrato
        FROM public.ven_contratos c
        JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=c.id_estado_contrato
        WHERE c.id_venta=p_id_operacion
        ORDER BY c.id_contrato DESC LIMIT 1;

        SELECT EXISTS (
            SELECT 1 FROM public.ven_contratos_aprobaciones ap
            JOIN public.ven_contratos c ON c.id_contrato=ap.id_contrato
            WHERE c.id_venta=p_id_operacion AND ap.firma_revisada=true
        ) INTO v_tiene_aprobacion;

        v_legal:=(v_estado='CONTRATADA'
                  OR v_estado_contrato IN ('VIGENTE','RESUELTO','FINALIZADO')
                  OR v_tiene_aprobacion);
        v_id_venta:=p_id_operacion;
    END IF;

    IF NOT coalesce(v_alcance,false) THEN
        RAISE EXCEPTION 'DENEGADO|Sin acceso a la operacion comercial indicada.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.crm_solicitudes_anulacion s
        WHERE s.tipo_operacion=v_tipo
          AND (s.id_reserva=v_id_reserva OR s.id_venta=v_id_venta)
          AND s.estado NOT IN ('RECHAZADA','EJECUTADA','CANCELADA')
    ) THEN
        RAISE EXCEPTION 'SOLICITUD_DUPLICADA|Ya existe una solicitud de anulacion abierta.';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.pag_pagos p
        JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago
        WHERE ((NOT EXISTS(SELECT 1 FROM public.pag_separaciones_grupo_abonos_v1 a WHERE a.id_pago=p.id_pago) AND ((v_id_reserva IS NOT NULL AND p.id_reserva=v_id_reserva)
           OR (v_id_venta IS NOT NULL AND
              (p.id_venta=v_id_venta OR
                (v_reserva_venta IS NOT NULL AND p.id_reserva=v_reserva_venta))))) OR EXISTS(SELECT 1 FROM public.pag_separaciones_grupo_distribucion_v1 d WHERE d.id_pago=p.id_pago AND d.id_reserva=coalesce(v_id_reserva,v_reserva_venta)))
          AND ep.codigo<>'ANULADO'
    ) INTO v_hay_pagos;

    SELECT EXISTS (
        SELECT 1 FROM public.pag_vouchers vo
        JOIN public.cfg_estados_voucher ev ON ev.id_estado_voucher=vo.id_estado_voucher
        JOIN public.pag_pagos p ON p.id_pago=vo.id_pago
        WHERE ((NOT EXISTS(SELECT 1 FROM public.pag_separaciones_grupo_abonos_v1 a WHERE a.id_pago=p.id_pago) AND ((v_id_reserva IS NOT NULL AND p.id_reserva=v_id_reserva)
           OR (v_id_venta IS NOT NULL AND
              (p.id_venta=v_id_venta OR
                (v_reserva_venta IS NOT NULL AND p.id_reserva=v_reserva_venta))))) OR EXISTS(SELECT 1 FROM public.pag_separaciones_grupo_distribucion_v1 d WHERE d.id_pago=p.id_pago AND d.id_reserva=coalesce(v_id_reserva,v_reserva_venta)))
          AND ev.codigo<>'RECHAZADO'
    ) INTO v_hay_vouchers;

    SELECT EXISTS (
        SELECT 1 FROM public.pag_planes_pago pp
        WHERE v_id_venta IS NOT NULL AND pp.id_venta=v_id_venta
    ) INTO v_hay_plan;

    SELECT EXISTS (
        SELECT 1 FROM public.pag_cuotas cu
        JOIN public.pag_planes_pago pp ON pp.id_plan_pago=cu.id_plan_pago
        WHERE v_id_venta IS NOT NULL AND pp.id_venta=v_id_venta
    ) INTO v_hay_cuotas;

    v_financiera:=v_hay_pagos OR v_hay_vouchers OR v_hay_plan OR v_hay_cuotas;

    INSERT INTO public.crm_solicitudes_anulacion (
      tipo_operacion,id_reserva,id_venta,categoria_motivo,motivo,
      estado,requiere_revision_financiera,requiere_revision_legal,
      id_usuario_solicitante
    ) VALUES (
      v_tipo,v_id_reserva,v_id_venta,v_categoria,v_motivo,
      'SOLICITADA',v_financiera,v_legal,p_actor
    ) RETURNING id_solicitud INTO v_solicitud;

    INSERT INTO public.crm_anulaciones_historial (
      id_solicitud,tipo_operacion,id_reserva,id_venta,id_contrato,
      evento,origen,id_usuario_actor,motivo,
      estado_anterior_operacion,estado_nuevo_operacion,
      estados_antes,estados_despues,impacto_financiero,detalles
    ) VALUES (
      v_solicitud,v_tipo,v_id_reserva,v_id_venta,v_id_contrato,
      'SOLICITUD_REGISTRADA','USUARIO',p_actor,v_motivo,
      v_estado,v_estado,
      jsonb_build_object('operacion',v_estado,'contrato',v_estado_contrato),
      jsonb_build_object('operacion',v_estado,'solicitud','SOLICITADA'),
      jsonb_build_object('requiereRevision',v_financiera,
                         'pagos',v_hay_pagos,'vouchers',v_hay_vouchers,
                         'planes',v_hay_plan,'cuotas',v_hay_cuotas),
      jsonb_build_object('categoria',v_categoria,'idLote',v_lote,
                         'codigoOperacion',v_codigo,'requiereRevisionLegal',v_legal)
    );

    RETURN jsonb_build_object(
      'success',true,'idSolicitud',v_solicitud,
      'tipoOperacion',v_tipo,'idOperacion',p_id_operacion,'codigoOperacion',v_codigo,
      'estadoSolicitud','SOLICITADA','estadoOperacion',v_estado,
      'requiereRevisionFinanciera',v_financiera,
      'requiereRevisionLegal',v_legal,
      'mensaje','Solicitud registrada para revision. La operacion no ha sido anulada.'
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_crm_sincronizar_asesor(p_id_persona bigint)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_fecha date;
  v_tipo integer;
  v_activo integer;
  v_inactivo integer;
  v_id bigint;
BEGIN
  IF p_id_persona IS NULL OR p_id_persona <= 0 THEN RETURN NULL; END IF;

  SELECT a.id_asesor INTO v_id FROM public.com_asesores a
  WHERE a.id_persona=p_id_persona FOR UPDATE;

  SELECT t.fecha_ingreso INTO v_fecha
  FROM public.rrhh_trabajadores t
  JOIN public.cfg_estados_trabajador et ON et.id_estado_trabajador=t.id_estado_trabajador
  JOIN public.core_personas p ON p.id_persona=t.id_persona
  WHERE t.id_persona=p_id_persona AND p.activo
    AND et.codigo='ACTIVO' AND et.activo
    AND t.fecha_ingreso<=CURRENT_DATE
    AND (t.fecha_cese IS NULL OR t.fecha_cese>=CURRENT_DATE)
  ORDER BY t.fecha_ingreso DESC LIMIT 1;

  IF v_fecha IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.seg_usuarios u
    JOIN public.cfg_estados_usuario eu ON eu.id_estado_usuario=u.id_estado_usuario
    JOIN public.seg_usuarios_roles ur ON ur.id_usuario=u.id_usuario
    JOIN public.seg_roles r ON r.id_rol=ur.id_rol
    WHERE u.id_persona=p_id_persona AND eu.codigo='ACTIVO' AND eu.permite_acceso
      AND ur.activo AND ur.fecha_revocacion IS NULL
      AND public.fn_rbac_rol_operativo_asesor_v1(r.id_rol) AND r.activo
  ) THEN
    IF v_id IS NOT NULL THEN
      SELECT id_estado_asesor INTO v_inactivo
      FROM public.cfg_estados_asesor WHERE codigo='INACTIVO' AND activo LIMIT 1;
      IF v_inactivo IS NULL THEN
        RAISE EXCEPTION 'CATALOGO_INVALIDO|Falta estado INACTIVO del asesor.';
      END IF;
      UPDATE public.com_asesores
      SET id_estado_asesor=v_inactivo, fecha_fin=GREATEST(CURRENT_DATE,fecha_inicio)
      WHERE id_asesor=v_id AND (id_estado_asesor IS DISTINCT FROM v_inactivo OR fecha_fin IS NULL);
    END IF;
    RETURN NULL;
  END IF;

  SELECT id_tipo_asesor INTO v_tipo FROM public.cfg_tipos_asesor
  WHERE codigo='INTERNO' AND activo LIMIT 1;
  SELECT id_estado_asesor INTO v_activo FROM public.cfg_estados_asesor
  WHERE codigo='ACTIVO' AND activo AND permite_operar LIMIT 1;
  IF v_tipo IS NULL OR v_activo IS NULL THEN
    RAISE EXCEPTION 'CATALOGO_INVALIDO|Falta tipo INTERNO o estado ACTIVO del asesor.';
  END IF;

  IF v_id IS NOT NULL THEN
    UPDATE public.com_asesores SET id_estado_asesor=v_activo,fecha_fin=NULL
    WHERE id_asesor=v_id AND (id_estado_asesor IS DISTINCT FROM v_activo OR fecha_fin IS NOT NULL);
    RETURN v_id;
  END IF;

  v_id:=nextval('public.com_asesores_id_asesor_seq'::regclass);
  INSERT INTO public.com_asesores
    (id_asesor,id_persona,id_tipo_asesor,id_estado_asesor,codigo,fecha_inicio)
  OVERRIDING SYSTEM VALUE
  VALUES (v_id,p_id_persona,v_tipo,v_activo,
          'ASE-'||lpad(v_id::text,GREATEST(3,length(v_id::text)),'0'),v_fecha)
  ON CONFLICT(id_persona) DO UPDATE SET id_estado_asesor=v_activo,fecha_fin=NULL
  RETURNING id_asesor INTO v_id;
  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_crm_listar_casos_revision_legal_v1(p_actor bigint, p_pagina integer DEFAULT 1, p_tamano integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE v_respuesta jsonb;
BEGIN
 IF p_actor IS NULL OR p_actor<=0
    OR p_pagina IS NULL OR p_pagina NOT BETWEEN 1 AND 100000
    OR p_tamano IS NULL OR p_tamano NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'DATOS_INVALIDOS|Revisor o paginacion no valida.';
 END IF;

 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(
      p_actor,'annulments.review_legal'::varchar),false)
   OR NOT EXISTS(
       SELECT 1 FROM public.seg_usuarios_roles ur
       JOIN public.seg_roles rol ON rol.id_rol=ur.id_rol
       WHERE ur.id_usuario=p_actor AND ur.activo
         AND ur.fecha_revocacion IS NULL AND rol.activo
         AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'annulments.review_legal'::varchar),false)
   )
   OR EXISTS(
       SELECT 1 FROM public.seg_usuarios_roles ur
       JOIN public.seg_roles rol ON rol.id_rol=ur.id_rol
       WHERE ur.id_usuario=p_actor AND ur.activo
         AND ur.fecha_revocacion IS NULL AND rol.activo
         AND (coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'annulments.approve'::varchar),false) OR coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'annulments.reject'::varchar),false))
   ) THEN
     RAISE EXCEPTION 'DENEGADO|Se requiere permiso de revisión legal independiente.';
 END IF;

 WITH accesibles AS (
   SELECT s.id_solicitud,s.id_venta,v.codigo AS codigo_operacion,
     s.categoria_motivo,s.motivo,s.estado,s.version,
     s.requiere_revision_financiera,s.fecha_solicitud,
     s.fecha_actualizacion,
     (SELECT count(*) FROM public.crm_anulaciones_evidencias_legales e
       WHERE e.id_solicitud=s.id_solicitud) AS documentos_registrados,
     (SELECT max(r.fecha_revision) FROM public.crm_anulaciones_revisiones r
       WHERE r.id_solicitud=s.id_solicitud AND r.tipo_revision='LEGAL')
       AS ultima_revision_legal
   FROM public.crm_solicitudes_anulacion s
   JOIN public.ven_ventas v ON v.id_venta=s.id_venta
   WHERE s.tipo_operacion='VENTA'
     AND s.estado='PENDIENTE_LEGAL'
     AND s.requiere_revision_legal
     AND s.id_usuario_solicitante<>p_actor
 ), pagina AS (
   SELECT * FROM accesibles a
   ORDER BY a.fecha_solicitud DESC,a.id_solicitud DESC
   LIMIT p_tamano OFFSET ((p_pagina-1)*p_tamano)
 )
 SELECT jsonb_build_object(
    'items',coalesce((SELECT jsonb_agg(jsonb_build_object(
       'idSolicitud',x.id_solicitud,
       'idVenta',x.id_venta,
       'codigoOperacion',x.codigo_operacion,
       'categoriaMotivo',x.categoria_motivo,
       'motivo',x.motivo,
       'estado',x.estado,
       'version',x.version,
       'requiereRevisionFinanciera',x.requiere_revision_financiera,
       'documentosRegistrados',x.documentos_registrados,
       'ultimaRevisionLegal',x.ultima_revision_legal,
       'fechaSolicitud',x.fecha_solicitud
    ) ORDER BY x.fecha_solicitud DESC,x.id_solicitud DESC) FROM pagina x),'[]'::jsonb),
    'total',(SELECT count(*) FROM accesibles),
    'pagina',p_pagina,'tamano',p_tamano,
    'paginas',ceil((SELECT count(*) FROM accesibles)::numeric/p_tamano)::int
 ) INTO v_respuesta;
 RETURN v_respuesta;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_crm_registrar_revision_financiera_anulacion_v1(p_actor bigint, p_solicitud bigint, p_version_esperada integer, p_resultado character varying, p_sustento text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
 v_resultado text := upper(btrim(coalesce(p_resultado,'')));
 v_sustento text := btrim(coalesce(p_sustento,''));
 v_s public.crm_solicitudes_anulacion%ROWTYPE;
 v_resumen jsonb;
 v_id_revision bigint;
 v_nuevo_estado text;
 v_id_contrato bigint;
 v_codigo_operacion text;
 v_estado_actual text;
BEGIN
 IF p_actor IS NULL OR p_actor<=0
    OR p_solicitud IS NULL OR p_solicitud<=0
    OR p_version_esperada IS NULL OR p_version_esperada<1
    OR v_resultado NOT IN ('CONFORME','OBSERVADA','NO_PROCEDE')
    OR length(v_sustento) NOT BETWEEN 40 AND 2000 THEN
   RAISE EXCEPTION 'DATOS_INVALIDOS|Revisor, solicitud, version, resultado y sustento son obligatorios.';
 END IF;

 -- El dictamen solo lo registra personal de Finanzas; no Gerencia.
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(
    p_actor,'annulments.review_finance'::varchar),false)
    OR NOT EXISTS (
       SELECT 1 FROM public.seg_usuarios_roles ur
       JOIN public.seg_roles r ON r.id_rol=ur.id_rol
       WHERE ur.id_usuario=p_actor AND ur.activo
         AND ur.fecha_revocacion IS NULL AND r.activo
         AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'annulments.review_finance'::varchar),false)
    )
    OR EXISTS (
       SELECT 1 FROM public.seg_usuarios_roles ur
       JOIN public.seg_roles r ON r.id_rol=ur.id_rol
       WHERE ur.id_usuario=p_actor AND ur.activo
         AND ur.fecha_revocacion IS NULL AND r.activo
         AND (coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'annulments.approve'::varchar),false) OR coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'annulments.reject'::varchar),false))
    )
 THEN
   RAISE EXCEPTION 'DENEGADO|Se requiere permiso de revisión financiera independiente de la decisión.';
 END IF;

 SELECT * INTO v_s
 FROM public.crm_solicitudes_anulacion
 WHERE id_solicitud=p_solicitud FOR UPDATE;

 IF NOT FOUND THEN
   RAISE EXCEPTION 'SOLICITUD_NO_EXISTE|No se encontro la solicitud.';
 END IF;

 IF v_s.version<>p_version_esperada THEN
   RAISE EXCEPTION 'VERSION_DESACTUALIZADA|Recargue la solicitud antes de registrar el dictamen.';
 END IF;
 IF v_s.estado<>'PENDIENTE_FINANZAS' THEN
   RAISE EXCEPTION 'TRANSICION_INVALIDA|La solicitud no esta derivada a Finanzas.';
 END IF;

 IF NOT public.fn_crm_puede_consultar_operacion_anulacion_v1(
     p_actor,v_s.tipo_operacion,coalesce(v_s.id_venta,v_s.id_reserva)) THEN
    RAISE EXCEPTION 'DENEGADO|No tiene acceso a esta operacion comercial.';
 END IF;

 IF v_s.tipo_operacion='SEPARACION' THEN
   SELECT e.codigo,r.codigo
   INTO v_estado_actual,v_codigo_operacion
   FROM public.ven_reservas r
   JOIN public.cfg_estados_reserva e ON e.id_estado_reserva=r.id_estado_reserva
   WHERE r.id_reserva=v_s.id_reserva;
 ELSE
   SELECT e.codigo,v.codigo
   INTO v_estado_actual,v_codigo_operacion
   FROM public.ven_ventas v
   JOIN public.cfg_estados_venta e ON e.id_estado_venta=v.id_estado_venta
   WHERE v.id_venta=v_s.id_venta;

   SELECT id_contrato INTO v_id_contrato
   FROM public.ven_contratos WHERE id_venta=v_s.id_venta
   ORDER BY id_contrato DESC LIMIT 1;
 END IF;

 v_resumen:=public.fn_crm_resumen_financiero_anulacion_v1(
     v_s.tipo_operacion,coalesce(v_s.id_venta,v_s.id_reserva));

 IF v_resultado='CONFORME' THEN
   IF (v_s.tipo_operacion='SEPARACION'
          AND v_estado_actual NOT IN ('PENDIENTE','VIGENTE'))
       OR (v_s.tipo_operacion='VENTA'
          AND v_estado_actual NOT IN ('PENDIENTE','CONFIRMADA','CONTRATADA'))
       OR v_estado_actual IS NULL THEN
      RAISE EXCEPTION 'OPERACION_NO_SOLICITABLE|La operacion ya no admite anulacion.';
   END IF;

   -- Bloquear si existen pagos, comprobantes, planes o cuotas no conciliados.
   IF (v_resumen->>'pagosNoAnulados')::bigint>0
     OR (v_resumen->>'vouchersNoRechazados')::bigint>0
     OR (v_resumen->>'planesAbiertos')::bigint>0
     OR (v_resumen->>'cuotasNoAnuladas')::bigint>0 THEN
     RAISE EXCEPTION 'REVISION_OBLIGATORIA|Aun hay pagos, vouchers, planes o cuotas por regularizar.';
   END IF;

   -- En esta primera version no se acredita una devolucion historica con un PDF:
   -- no certificar conformidad cuando existieron pagos hasta implementar evidencia verificable.
   IF (v_resumen->>'pagosHistoricos')::bigint>0
     OR (v_resumen->>'vouchersHistoricos')::bigint>0 THEN
      RAISE EXCEPTION 'EVIDENCIA_REQUERIDA|Hay historial de pagos; falta habilitar la comprobacion documental de devolucion o retencion.';
   END IF;
 END IF;

 v_nuevo_estado:=CASE
    WHEN v_resultado='CONFORME' AND v_s.requiere_revision_legal
      THEN 'PENDIENTE_LEGAL'
    WHEN v_resultado='CONFORME' THEN 'EN_REVISION'
    ELSE 'PENDIENTE_FINANZAS'
 END;

 INSERT INTO public.crm_anulaciones_revisiones(
   id_solicitud,tipo_revision,resultado,sustento,
   version_solicitud,id_usuario_revisor,detalle_revision
 ) VALUES (
   p_solicitud,'FINANCIERA',v_resultado,v_sustento,
   v_s.version,p_actor,v_resumen
 ) RETURNING id_revision INTO v_id_revision;

 UPDATE public.crm_solicitudes_anulacion
 SET estado=v_nuevo_estado,
     requiere_revision_financiera=true,
     version=version+1,
     fecha_actualizacion=now()
 WHERE id_solicitud=v_s.id_solicitud AND version=p_version_esperada;

 IF NOT FOUND THEN
   RAISE EXCEPTION 'VERSION_DESACTUALIZADA|La solicitud cambio durante el registro del dictamen.';
 END IF;

 INSERT INTO public.crm_anulaciones_historial(
   id_solicitud,tipo_operacion,id_reserva,id_venta,id_contrato,
   evento,origen,id_usuario_actor,motivo,
   estado_anterior_operacion,estado_nuevo_operacion,
   estados_antes,estados_despues,impacto_financiero,detalles
 ) VALUES (
   v_s.id_solicitud,v_s.tipo_operacion,v_s.id_reserva,v_s.id_venta,v_id_contrato,
   CASE v_resultado WHEN 'CONFORME' THEN 'REVISION_FINANCIERA_CONFORME'
                    WHEN 'OBSERVADA' THEN 'REVISION_FINANCIERA_OBSERVADA'
                    ELSE 'REVISION_FINANCIERA_NO_PROCEDE' END,
   'USUARIO',p_actor,v_sustento,v_estado_actual,v_estado_actual,
   jsonb_build_object('solicitud',v_s.estado,'version',v_s.version),
   jsonb_build_object('solicitud',v_nuevo_estado,'version',v_s.version+1),
   v_resumen,
   jsonb_build_object('idRevision',v_id_revision,
                      'resultado',v_resultado,
                      'codigoOperacion',v_codigo_operacion,
                      'ejecucionRealizada',false)
 );

 RETURN jsonb_build_object(
    'success',true,'idRevision',v_id_revision,'idSolicitud',p_solicitud,
    'resultado',v_resultado,'estadoSolicitud',v_nuevo_estado,
    'version',v_s.version+1,
    'ejecucionRealizada',false,
    'mensaje','Revision registrada para evaluacion de Gerencia; sin anular operaciones.'
 );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_crm_registrar_revision_legal_anulacion_v1(p_actor bigint, p_solicitud bigint, p_version_esperada integer, p_resultado character varying, p_sustento text, p_id_evidencia bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
 v_resultado text := upper(btrim(coalesce(p_resultado,'')));
 v_sustento text := btrim(coalesce(p_sustento,''));
 v_s public.crm_solicitudes_anulacion%ROWTYPE;
 v_e public.crm_anulaciones_evidencias_legales%ROWTYPE;
 v_storage uuid;
 v_storage_updated timestamptz;
 v_mime text;
 v_tamano bigint;
 v_venta_estado text;
 v_contrato_estado text;
 v_id_contrato bigint;
 v_nuevo_estado text;
 v_id_revision bigint;
 v_finanzas_conforme boolean:=false;
 v_revision_financiera bigint;
 v_detalle jsonb:='{}'::jsonb;
BEGIN
 IF p_actor IS NULL OR p_actor<=0 OR p_solicitud IS NULL OR p_solicitud<=0
   OR p_version_esperada IS NULL OR p_version_esperada<=0
   OR v_resultado NOT IN ('CONFORME','OBSERVADA','NO_PROCEDE')
   OR length(v_sustento) NOT BETWEEN 40 AND 2000
   OR (p_id_evidencia IS NOT NULL AND p_id_evidencia<=0) THEN
   RAISE EXCEPTION 'DATOS_INVALIDOS|Identificadores, resultado o sustento legal no validos.';
 END IF;

 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(
   p_actor,'annulments.review_legal'::varchar),false)
   OR NOT EXISTS(
     SELECT 1 FROM public.seg_usuarios_roles ur
     JOIN public.seg_roles rol ON rol.id_rol=ur.id_rol
     WHERE ur.id_usuario=p_actor AND ur.activo
       AND ur.fecha_revocacion IS NULL AND rol.activo
       AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'annulments.review_legal'::varchar),false)
   )
   OR EXISTS(
     SELECT 1 FROM public.seg_usuarios_roles ur
     JOIN public.seg_roles rol ON rol.id_rol=ur.id_rol
     WHERE ur.id_usuario=p_actor AND ur.activo
       AND ur.fecha_revocacion IS NULL AND rol.activo
       AND (coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'annulments.approve'::varchar),false) OR coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'annulments.reject'::varchar),false))
   ) THEN
   RAISE EXCEPTION 'DENEGADO|Se requiere permiso de revisión legal independiente de la decisión.';
 END IF;

 SELECT * INTO v_s FROM public.crm_solicitudes_anulacion
 WHERE id_solicitud=p_solicitud FOR UPDATE;

 IF NOT FOUND THEN
   RAISE EXCEPTION 'SOLICITUD_NO_EXISTE|No existe la solicitud.';
 END IF;
 IF v_s.version<>p_version_esperada THEN
   RAISE EXCEPTION 'VERSION_DESACTUALIZADA|El expediente cambio, vuelva a consultarlo.';
 END IF;
 IF v_s.tipo_operacion<>'VENTA' OR v_s.estado<>'PENDIENTE_LEGAL'
     OR NOT v_s.requiere_revision_legal THEN
   RAISE EXCEPTION 'TRANSICION_INVALIDA|La venta no esta en revision legal.';
 END IF;
 IF p_actor=v_s.id_usuario_solicitante THEN
   RAISE EXCEPTION 'DENEGADO|El solicitante no puede emitir su propio dictamen legal.';
 END IF;

 SELECT r.id_usuario_revisor INTO v_revision_financiera
 FROM public.crm_anulaciones_revisiones r
 WHERE r.id_solicitud=p_solicitud AND r.tipo_revision='FINANCIERA'
 ORDER BY r.fecha_revision DESC,r.id_revision DESC LIMIT 1;
 IF v_revision_financiera=p_actor THEN
   RAISE EXCEPTION 'DENEGADO|Las revisiones financiera y legal deben ser independientes.';
 END IF;

 SELECT ev.codigo INTO v_venta_estado
 FROM public.ven_ventas v JOIN public.cfg_estados_venta ev
    ON ev.id_estado_venta=v.id_estado_venta
 WHERE v.id_venta=v_s.id_venta;

 SELECT c.id_contrato,ec.codigo
 INTO v_id_contrato,v_contrato_estado
 FROM public.ven_contratos c
 JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=c.id_estado_contrato
 WHERE c.id_venta=v_s.id_venta
 ORDER BY c.id_contrato DESC LIMIT 1;

 IF p_id_evidencia IS NOT NULL THEN
   SELECT * INTO v_e FROM public.crm_anulaciones_evidencias_legales
   WHERE id_evidencia=p_id_evidencia AND id_solicitud=p_solicitud;
   IF NOT FOUND THEN
     RAISE EXCEPTION 'EVIDENCIA_NO_EXISTE|El PDF no pertenece a esta solicitud.';
   END IF;

   SELECT o.id,o.updated_at,o.metadata->>'mimetype',
     CASE WHEN (o.metadata->>'size') ~ '^[0-9]+$'
          THEN (o.metadata->>'size')::bigint ELSE NULL END
   INTO v_storage,v_storage_updated,v_mime,v_tamano
   FROM storage.objects o
   WHERE o.bucket_id=v_e.bucket AND o.name=v_e.clave_archivo;
 END IF;

 IF v_resultado='CONFORME' THEN
   IF p_id_evidencia IS NULL OR v_e.id_evidencia IS NULL THEN
     RAISE EXCEPTION 'EVIDENCIA_REQUERIDA|Se exige un informe o acuerdo legal registrado.';
   END IF;
   IF v_e.tipo_documento NOT IN ('INFORME_LEGAL','ACUERDO_RESOLUCION') THEN
     RAISE EXCEPTION 'EVIDENCIA_REQUERIDA|Se requiere informe legal o acuerdo de resolucion.';
   END IF;
   IF v_storage IS DISTINCT FROM v_e.storage_object_id
       OR v_storage_updated IS DISTINCT FROM v_e.storage_updated_at
       OR v_mime IS DISTINCT FROM 'application/pdf'
       OR v_tamano IS DISTINCT FROM v_e.tamano_bytes THEN
     RAISE EXCEPTION 'EVIDENCIA_ALTERADA|PDF legal ausente o cambiado desde su registro.';
   END IF;
   IF v_venta_estado NOT IN ('PENDIENTE','CONFIRMADA','CONTRATADA')
      OR v_contrato_estado IS NULL THEN
     RAISE EXCEPTION 'OPERACION_NO_SOLICITABLE|El contrato cambio de estado o no esta disponible.';
   END IF;
 END IF;

 SELECT EXISTS(
   SELECT 1 FROM public.crm_anulaciones_revisiones r
   WHERE r.id_revision=(
     SELECT max(r2.id_revision)
     FROM public.crm_anulaciones_revisiones r2
     WHERE r2.id_solicitud=p_solicitud AND r2.tipo_revision='FINANCIERA'
   ) AND r.resultado='CONFORME'
 ) INTO v_finanzas_conforme;

 v_nuevo_estado:=CASE
    WHEN v_resultado='CONFORME' AND v_s.requiere_revision_financiera
         AND NOT v_finanzas_conforme THEN 'PENDIENTE_FINANZAS'
    WHEN v_resultado='CONFORME' THEN 'EN_REVISION'
    ELSE 'PENDIENTE_LEGAL'
 END;

 v_detalle:=jsonb_build_object(
   'resultado',v_resultado,
   'estadoVenta',v_venta_estado,
   'estadoContrato',v_contrato_estado,
   'idContrato',v_id_contrato,
   'idEvidencia',p_id_evidencia,
   'finanzasConformeAlRegistrar',v_finanzas_conforme,
   'archivoDisponible',
      coalesce(v_storage=v_e.storage_object_id
       AND v_storage_updated=v_e.storage_updated_at
       AND v_mime='application/pdf'
       AND v_tamano=v_e.tamano_bytes,false)
 );
 IF p_id_evidencia IS NOT NULL THEN
   v_detalle:=v_detalle||jsonb_build_object(
     'sha256',btrim(v_e.hash_sha256),
     'storageObjectId',v_e.storage_object_id,
     'storageUpdatedAt',v_e.storage_updated_at
   );
 END IF;

 INSERT INTO public.crm_anulaciones_revisiones(
    id_solicitud,tipo_revision,resultado,sustento,
    referencia_evidencia,detalle_revision,version_solicitud,id_usuario_revisor
 ) VALUES(
    p_solicitud,'LEGAL',v_resultado,v_sustento,
    CASE WHEN p_id_evidencia IS NULL THEN NULL ELSE p_id_evidencia::varchar END,
    v_detalle,v_s.version,p_actor
 ) RETURNING id_revision INTO v_id_revision;

 UPDATE public.crm_solicitudes_anulacion
 SET estado=v_nuevo_estado,version=version+1,
     fecha_actualizacion=now()
 WHERE id_solicitud=p_solicitud AND version=p_version_esperada;

 IF NOT FOUND THEN
   RAISE EXCEPTION 'VERSION_DESACTUALIZADA|No se pudo guardar la revision.';
 END IF;

 INSERT INTO public.crm_anulaciones_historial(
  id_solicitud,tipo_operacion,id_venta,id_contrato,
  evento,origen,id_usuario_actor,motivo,
  estado_anterior_operacion,estado_nuevo_operacion,
  estados_antes,estados_despues,detalles
 ) VALUES(
  v_s.id_solicitud,'VENTA',v_s.id_venta,v_id_contrato,
  CASE v_resultado WHEN 'CONFORME' THEN 'REVISION_LEGAL_CONFORME'
    WHEN 'OBSERVADA' THEN 'REVISION_LEGAL_OBSERVADA'
    ELSE 'REVISION_LEGAL_NO_PROCEDE' END,
  'USUARIO',p_actor,v_sustento,
  v_venta_estado,v_venta_estado,
  jsonb_build_object('solicitud',v_s.estado,'version',v_s.version),
  jsonb_build_object('solicitud',v_nuevo_estado,'version',v_s.version+1),
  jsonb_build_object('idRevision',v_id_revision,
    'idEvidencia',p_id_evidencia,
    'resultado',v_resultado,'ejecucionRealizada',false)
 );

 RETURN jsonb_build_object(
   'success',true,'idSolicitud',p_solicitud,'idRevision',v_id_revision,
   'resultado',v_resultado,'estadoSolicitud',v_nuevo_estado,
   'version',v_s.version+1,'ejecucionRealizada',false,
   'mensaje','Dictamen legal registrado sin modificar la venta ni el contrato.'
 );
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
              AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.operate_advisor'::varchar),false)
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
      WHERE x.codigo IN ('crm.scope_all','crm.scope_assigned','crm.assign_advisor','crm.approve_stage_change','crm.request_stage_change','crm.deactivate_prospect','sales.scope_all','sales.contract_scope_all','sales.approve_reservation_change','sales.notify_expiry_all','sales.reassign_advisor','annulments.scope_all','annulments.request_global')
      AND NOT public.fn_usuario_tiene_permiso_seguridad(p_id_actor,x.codigo::varchar)) THEN
        p_estado := 'DENEGADO';
        p_mensaje := 'No puede delegar una capacidad comercial que no posee.';
        RETURN;
    END IF;

    -- La designación operativa es independiente de Gerencia; solo los
    -- administradores protegidos o quienes ya poseen la capacidad pueden delegarla.
    IF 'crm.operate_advisor'=ANY(v_permisos)
      AND NOT public.fn_usuario_tiene_permiso_seguridad(p_id_actor,'crm.operate_advisor')
      AND NOT EXISTS(SELECT 1 FROM public.seg_usuarios_roles ur JOIN public.seg_roles r USING(id_rol)
        WHERE ur.id_usuario=p_id_actor AND ur.activo AND ur.fecha_revocacion IS NULL AND r.activo AND r.codigo IN ('GERENCIA','ADMINISTRADOR')) THEN
      p_estado:='DENEGADO';p_mensaje:='No puede delegar la habilitación operativa de asesor.';RETURN;
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

CREATE OR REPLACE FUNCTION public.sp_listar_asesores()
 RETURNS TABLE(id_asesor bigint, codigo character varying, nombre_completo text, email character varying, telefono character varying, activo boolean, leads_activos bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
SELECT
 a.id_asesor,
 a.codigo,
 concat_ws(' ',p.nombres,p.apellido_paterno,p.apellido_materno) AS nombre_completo,
 COALESCE((
   SELECT c.valor FROM public.core_personas_contactos c
   JOIN public.cfg_tipos_contacto tc ON tc.id_tipo_contacto=c.id_tipo_contacto
   WHERE c.id_persona=p.id_persona AND c.activo AND tc.activo AND tc.codigo='EMAIL'
   ORDER BY c.principal DESC,c.id_persona_contacto DESC LIMIT 1
 ),'Sin correo')::varchar AS email,
 COALESCE((
   SELECT c.valor FROM public.core_personas_contactos c
   JOIN public.cfg_tipos_contacto tc ON tc.id_tipo_contacto=c.id_tipo_contacto
   WHERE c.id_persona=p.id_persona AND c.activo AND tc.activo
     AND tc.codigo IN ('CELULAR','TELEFONO','WHATSAPP')
   ORDER BY c.principal DESC,c.id_persona_contacto DESC LIMIT 1
 ),'Sin telefono')::varchar AS telefono,
 true AS activo,
 (SELECT count(*) FROM public.com_asignaciones_prospecto ap
  WHERE ap.id_asesor=a.id_asesor AND ap.fecha_fin IS NULL) AS leads_activos
FROM public.com_asesores a
JOIN public.core_personas p ON p.id_persona=a.id_persona
JOIN public.cfg_estados_asesor ea ON ea.id_estado_asesor=a.id_estado_asesor
WHERE p.activo AND ea.codigo='ACTIVO' AND ea.activo AND ea.permite_operar
  AND a.fecha_inicio<=current_date AND (a.fecha_fin IS NULL OR a.fecha_fin>=current_date)
  AND EXISTS(
    SELECT 1 FROM public.rrhh_trabajadores t
    JOIN public.cfg_estados_trabajador et ON et.id_estado_trabajador=t.id_estado_trabajador
    WHERE t.id_persona=p.id_persona AND et.codigo='ACTIVO' AND et.activo
      AND t.fecha_ingreso<=current_date
      AND (t.fecha_cese IS NULL OR t.fecha_cese>=current_date)
  )
  AND EXISTS(
    SELECT 1 FROM public.seg_usuarios u
    JOIN public.cfg_estados_usuario eu ON eu.id_estado_usuario=u.id_estado_usuario
    JOIN public.seg_usuarios_roles ur ON ur.id_usuario=u.id_usuario
    JOIN public.seg_roles r ON r.id_rol=ur.id_rol
    WHERE u.id_persona=p.id_persona AND eu.codigo='ACTIVO' AND eu.activo AND eu.permite_acceso
      AND ur.activo AND ur.fecha_revocacion IS NULL
      AND public.fn_rbac_rol_operativo_asesor_v1(r.id_rol) AND r.activo
  )
ORDER BY a.codigo;
$function$;

CREATE OR REPLACE FUNCTION public.fn_crm_sync_asesor_por_rol()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public','pg_temp' AS $fn$
DECLARE persona_anterior bigint; persona_nueva bigint;
BEGIN
 IF TG_OP IN ('UPDATE','DELETE') THEN
  IF public.fn_rbac_rol_operativo_asesor_v1(OLD.id_rol) THEN
   SELECT id_persona INTO persona_anterior FROM public.seg_usuarios WHERE id_usuario=OLD.id_usuario;
   PERFORM public.fn_crm_sincronizar_asesor(persona_anterior);
  END IF;
 END IF;
 IF TG_OP IN ('UPDATE','INSERT') THEN
  IF public.fn_rbac_rol_operativo_asesor_v1(NEW.id_rol) THEN
   SELECT id_persona INTO persona_nueva FROM public.seg_usuarios WHERE id_usuario=NEW.id_usuario;
   IF persona_nueva IS DISTINCT FROM persona_anterior THEN PERFORM public.fn_crm_sincronizar_asesor(persona_nueva); END IF;
  END IF;
 END IF;
 RETURN NULL;
END; $fn$;

CREATE FUNCTION public.fn_crm_sync_asesor_por_capacidad_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public','pg_temp' AS $fn$
DECLARE roles integer[]:='{}'; p integer; persona bigint;
BEGIN
 SELECT id_permiso INTO p FROM public.seg_permisos WHERE codigo='crm.operate_advisor';
 IF TG_OP IN ('UPDATE','DELETE') THEN
  IF OLD.id_permiso=p THEN roles:=array_append(roles,OLD.id_rol); END IF;
 END IF;
 IF TG_OP IN ('UPDATE','INSERT') THEN
  IF NEW.id_permiso=p THEN roles:=array_append(roles,NEW.id_rol); END IF;
 END IF;
 FOR persona IN SELECT DISTINCT u.id_persona FROM public.seg_usuarios u JOIN public.seg_usuarios_roles ur USING(id_usuario)
  WHERE ur.id_rol=ANY(roles) AND ur.activo AND ur.fecha_revocacion IS NULL ORDER BY u.id_persona
 LOOP PERFORM public.fn_crm_sincronizar_asesor(persona); END LOOP;
 RETURN NULL;
END; $fn$;
REVOKE ALL ON FUNCTION public.fn_crm_sync_asesor_por_capacidad_v1() FROM PUBLIC,anon,authenticated,service_role,sigi_app_user,sgi_backend_user;
-- Diferida: la matriz desactiva y reactiva permisos en varias sentencias de una transacción.
CREATE CONSTRAINT TRIGGER trg_crm_sync_asesor_capacidad AFTER INSERT OR UPDATE OR DELETE ON public.seg_roles_permisos
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.fn_crm_sync_asesor_por_capacidad_v1();

CREATE FUNCTION public.fn_crm_sync_asesor_catalogo_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public','pg_temp' AS $fn$
DECLARE persona bigint;
BEGIN
 IF TG_TABLE_NAME='seg_roles' THEN
  IF NOT public.fn_rbac_rol_operativo_asesor_v1(NEW.id_rol) THEN RETURN NULL; END IF;
  FOR persona IN SELECT DISTINCT u.id_persona FROM public.seg_usuarios u JOIN public.seg_usuarios_roles ur USING(id_usuario)
   WHERE ur.id_rol=NEW.id_rol AND ur.activo AND ur.fecha_revocacion IS NULL ORDER BY u.id_persona
  LOOP PERFORM public.fn_crm_sincronizar_asesor(persona); END LOOP;
 ELSE
  IF OLD.codigo<>'crm.operate_advisor' AND NEW.codigo<>'crm.operate_advisor' THEN RETURN NULL; END IF;
  FOR persona IN SELECT DISTINCT u.id_persona FROM public.seg_usuarios u JOIN public.seg_usuarios_roles ur USING(id_usuario)
   JOIN public.seg_roles_permisos rp USING(id_rol)
   WHERE rp.id_permiso=NEW.id_permiso AND rp.activo AND ur.activo AND ur.fecha_revocacion IS NULL ORDER BY u.id_persona
  LOOP PERFORM public.fn_crm_sincronizar_asesor(persona); END LOOP;
 END IF;
 RETURN NULL;
END; $fn$;
REVOKE ALL ON FUNCTION public.fn_crm_sync_asesor_catalogo_v1() FROM PUBLIC,anon,authenticated,service_role,sigi_app_user,sgi_backend_user;
CREATE TRIGGER trg_crm_sync_asesor_catalogo_rol AFTER UPDATE OF activo ON public.seg_roles
 FOR EACH ROW WHEN (OLD.activo IS DISTINCT FROM NEW.activo) EXECUTE FUNCTION public.fn_crm_sync_asesor_catalogo_v1();
CREATE TRIGGER trg_crm_sync_asesor_catalogo_permiso AFTER UPDATE OF activo,codigo ON public.seg_permisos
 FOR EACH ROW WHEN (OLD.activo IS DISTINCT FROM NEW.activo OR OLD.codigo IS DISTINCT FROM NEW.codigo) EXECUTE FUNCTION public.fn_crm_sync_asesor_catalogo_v1();

DO $verify$ BEGIN
 IF EXISTS((SELECT id_asesor FROM pg_temp.rbac_asesores_before EXCEPT SELECT id_asesor FROM public.sp_listar_asesores())
 UNION ALL (SELECT id_asesor FROM public.sp_listar_asesores() EXCEPT SELECT id_asesor FROM pg_temp.rbac_asesores_before))
 THEN RAISE EXCEPTION 'RBAC: cambió la lista de asesores vigentes'; END IF;
 IF EXISTS(SELECT 1 FROM pg_temp.rbac_legal_before b WHERE b.acceso IS DISTINCT FROM public.fn_crm_puede_acceder_expediente_legal_v1(b.id_usuario,b.id_solicitud))
 THEN RAISE EXCEPTION 'RBAC: cambió el acceso a expediente legal de cuentas existentes'; END IF;
END; $verify$;
COMMIT;
