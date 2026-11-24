-- 156: anulación comercial automática; no altera pagos ni vouchers.
BEGIN;
ALTER TABLE public.crm_solicitudes_anulacion ALTER COLUMN id_usuario_solicitante DROP NOT NULL;
ALTER TABLE public.crm_solicitudes_anulacion DROP CONSTRAINT crm_solicitudes_anulacion_categoria_motivo_check,
 DROP CONSTRAINT ck_crm_solicitud_decision, DROP CONSTRAINT ck_crm_solicitud_ejecucion;
ALTER TABLE public.crm_solicitudes_anulacion
 ADD CONSTRAINT crm_solicitudes_anulacion_categoria_motivo_check CHECK(categoria_motivo IN ('DESISTIMIENTO_CLIENTE','MUTUO_ACUERDO','ERROR_COMERCIAL','INCUMPLIMIENTO','OTRO','PLAZO_VENCIDO')),
 ADD CONSTRAINT ck_crm_solicitud_origen_sistema CHECK(
 (categoria_motivo='PLAZO_VENCIDO' AND tipo_operacion='SEPARACION' AND estado='EJECUTADA' AND id_usuario_solicitante IS NULL AND id_usuario_decision IS NULL AND id_usuario_ejecucion IS NULL)
 OR (categoria_motivo<>'PLAZO_VENCIDO' AND id_usuario_solicitante IS NOT NULL)),
 ADD CONSTRAINT ck_crm_solicitud_decision CHECK(estado NOT IN ('APROBADA','RECHAZADA','EJECUTADA') OR (fecha_decision IS NOT NULL AND (id_usuario_decision IS NOT NULL OR categoria_motivo='PLAZO_VENCIDO'))),
 ADD CONSTRAINT ck_crm_solicitud_ejecucion CHECK(estado<>'EJECUTADA' OR (fecha_ejecucion IS NOT NULL AND (id_usuario_ejecucion IS NOT NULL OR categoria_motivo='PLAZO_VENCIDO')));
CREATE UNIQUE INDEX uq_crm_anulacion_plazo_reserva_v1 ON public.crm_solicitudes_anulacion(id_reserva) WHERE categoria_motivo='PLAZO_VENCIDO';
CREATE OR REPLACE FUNCTION public.fn_guardar_reserva_grupo_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE v_anterior text;v_nuevo text;
BEGIN
 IF NEW.id_estado_reserva IS NOT DISTINCT FROM OLD.id_estado_reserva OR NOT EXISTS(SELECT 1 FROM public.ven_separaciones_grupo_lotes_v1 WHERE id_reserva=OLD.id_reserva) THEN RETURN NEW; END IF;
 SELECT codigo INTO v_anterior FROM public.cfg_estados_reserva WHERE id_estado_reserva=OLD.id_estado_reserva;
 SELECT codigo INTO v_nuevo FROM public.cfg_estados_reserva WHERE id_estado_reserva=NEW.id_estado_reserva;
 IF v_anterior IN ('PENDIENTE','VIGENTE') AND v_nuevo='VENCIDA' AND OLD.fecha_vencimiento<=now()
 AND NOT EXISTS(SELECT 1 FROM public.ven_ventas v JOIN public.cfg_estados_venta e USING(id_estado_venta) WHERE v.id_lote=OLD.id_lote AND e.codigo<>'ANULADA') THEN RETURN NEW; END IF;
 IF v_anterior='PENDIENTE' AND v_nuevo='VIGENTE' AND public.fn_sep_grupo_credito_reserva_v1(OLD.id_reserva,NULL)=OLD.monto_reserva THEN RETURN NEW; END IF;
 IF v_anterior='VIGENTE' AND v_nuevo='CONVERTIDA' AND OLD.fecha_vencimiento>now()
 AND public.fn_sep_grupo_credito_reserva_v1(OLD.id_reserva,NULL)=OLD.monto_reserva
 AND EXISTS(SELECT 1 FROM public.ven_ventas v JOIN public.cfg_estados_venta e USING(id_estado_venta) WHERE v.id_reserva=OLD.id_reserva AND v.id_lote=OLD.id_lote AND e.codigo='PENDIENTE') THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'OPERACION_INVALIDA|La reserva agrupada requiere gestión integral.';
END; $function$;
CREATE OR REPLACE FUNCTION public.sp_caducar_separaciones_vencidas()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public','pg_temp' AS $expire$
DECLARE
 r record; v_vencida integer; v_disponible integer; v_solicitud bigint; v_caducadas integer:=0; v_bloqueadas integer:=0; v_impacto jsonb; v_fin boolean;
BEGIN
 PERFORM pg_advisory_xact_lock(156,1);
 SELECT id_estado_reserva INTO STRICT v_vencida FROM public.cfg_estados_reserva WHERE codigo='VENCIDA' AND activo;
 SELECT id_estado_lote INTO STRICT v_disponible FROM public.cfg_estados_lote WHERE codigo='DISPONIBLE' AND activo;
 -- Mismo orden de bloqueo que Finanzas: lote, grupo, reserva.
 PERFORM 1 FROM public.inm_lotes l WHERE l.id_lote IN (
 SELECT x.id_lote FROM public.ven_reservas x JOIN public.cfg_estados_reserva e USING(id_estado_reserva) WHERE e.codigo IN ('PENDIENTE','VIGENTE') AND x.fecha_vencimiento<=now()
 UNION
 SELECT x.id_lote FROM public.ven_reservas x JOIN public.ven_separaciones_grupo_lotes_v1 gl USING(id_reserva)
 WHERE gl.id_grupo IN (SELECT g.id_grupo FROM public.ven_separaciones_grupo_lotes_v1 g JOIN public.ven_reservas y USING(id_reserva) JOIN public.cfg_estados_reserva e USING(id_estado_reserva) WHERE e.codigo IN ('PENDIENTE','VIGENTE') AND y.fecha_vencimiento<=now())
 ) ORDER BY l.id_lote FOR UPDATE OF l;
 FOR r IN SELECT res.id_reserva,res.id_lote,res.codigo,res.id_persona,res.fecha_vencimiento,
 er.codigo estado_reserva,l.id_estado_lote,el.codigo estado_lote,l.activo,gl.id_grupo
 FROM public.ven_reservas res JOIN public.cfg_estados_reserva er USING(id_estado_reserva)
 JOIN public.inm_lotes l USING(id_lote) JOIN public.cfg_estados_lote el USING(id_estado_lote)
 LEFT JOIN public.ven_separaciones_grupo_lotes_v1 gl USING(id_reserva)
 WHERE er.codigo IN ('PENDIENTE','VIGENTE') AND res.fecha_vencimiento<=now()
 ORDER BY res.id_lote,res.id_reserva
 LOOP
 IF NOT r.activo OR r.estado_lote<>'RESERVADO' OR EXISTS(
 SELECT 1 FROM public.ven_ventas v JOIN public.cfg_estados_venta e USING(id_estado_venta) WHERE v.id_lote=r.id_lote AND e.codigo<>'ANULADA')
 OR EXISTS(SELECT 1 FROM public.ven_reservas o JOIN public.cfg_estados_reserva e USING(id_estado_reserva) WHERE o.id_lote=r.id_lote AND o.id_reserva<>r.id_reserva AND e.codigo IN ('PENDIENTE','VIGENTE'))
 OR (SELECT count(*) FROM public.inm_lotes_precios pr JOIN public.cfg_monedas m USING(id_moneda)
 WHERE pr.id_lote=r.id_lote AND pr.activo AND m.activo AND trim(m.codigo)='PEN' AND pr.precio>0 AND pr.fecha_desde<=now() AND (pr.fecha_hasta IS NULL OR pr.fecha_hasta>now()))<>1
 THEN v_bloqueadas:=v_bloqueadas+1; CONTINUE; END IF;
 IF r.id_grupo IS NOT NULL THEN PERFORM 1 FROM public.ven_separaciones_grupo_v1 WHERE id_grupo=r.id_grupo FOR UPDATE; END IF;
 PERFORM 1 FROM public.ven_reservas res JOIN public.cfg_estados_reserva er USING(id_estado_reserva)
 WHERE res.id_reserva=r.id_reserva AND er.codigo IN ('PENDIENTE','VIGENTE') AND res.fecha_vencimiento<=now() FOR UPDATE OF res;
 IF NOT FOUND THEN CONTINUE; END IF;
 v_impacto:=public.fn_crm_resumen_financiero_anulacion_v1('SEPARACION',r.id_reserva);
 v_fin:=coalesce((v_impacto->>'pagosNoAnulados')::bigint,0)>0 OR coalesce((v_impacto->>'vouchersNoRechazados')::bigint,0)>0;
 -- Conservar expedientes anteriores; no quedan solicitudes manuales abiertas sobre una reserva anulada.
 UPDATE public.crm_solicitudes_anulacion SET estado='CANCELADA',justificacion_decision='Sustituida por anulación automática por plazo vencido.',fecha_actualizacion=now(),version=version+1
 WHERE id_reserva=r.id_reserva AND estado IN ('SOLICITADA','EN_REVISION','PENDIENTE_FINANZAS','PENDIENTE_LEGAL','APROBADA');
 INSERT INTO public.crm_solicitudes_anulacion(tipo_operacion,id_reserva,categoria_motivo,motivo,estado,requiere_revision_financiera,requiere_revision_legal,justificacion_decision,fecha_decision,fecha_ejecucion)
 VALUES('SEPARACION',r.id_reserva,'PLAZO_VENCIDO','Plazo vencido: anulación comercial automática por el sistema.','EJECUTADA',v_fin,false,'Vencimiento automático; no modifica pagos ni comprobantes.',now(),now()) RETURNING id_solicitud INTO v_solicitud;
 UPDATE public.ven_reservas SET id_estado_reserva=v_vencida,fecha_actualizacion=now() WHERE id_reserva=r.id_reserva;
 UPDATE public.inm_lotes SET id_estado_lote=v_disponible,fecha_actualizacion=now() WHERE id_lote=r.id_lote;
 IF r.id_grupo IS NOT NULL THEN UPDATE public.ven_separaciones_grupo_v1 SET estado='REQUIERE_REVISION' WHERE id_grupo=r.id_grupo; END IF;
 INSERT INTO public.inm_lotes_historial_estado(id_lote,id_estado_anterior,id_estado_nuevo,motivo,fecha_cambio)
 VALUES(r.id_lote,r.id_estado_lote,v_disponible,'Plazo vencido: separación '||r.codigo||' anulada automáticamente',now());
 INSERT INTO public.crm_anulaciones_historial(id_solicitud,tipo_operacion,id_reserva,evento,origen,motivo,estado_anterior_operacion,estado_nuevo_operacion,estados_antes,estados_despues,impacto_financiero,detalles)
 VALUES(v_solicitud,'SEPARACION',r.id_reserva,'ANULACION_PLAZO_VENCIDO','SISTEMA','Plazo vencido: anulación automática y liberación del lote.',r.estado_reserva,'VENCIDA',jsonb_build_object('reserva',r.estado_reserva,'lote',r.estado_lote),jsonb_build_object('reserva','VENCIDA','lote','DISPONIBLE'),coalesce(v_impacto,'{}'::jsonb),jsonb_build_object('fechaVencimiento',r.fecha_vencimiento,'pagosConservados',true,'idGrupo',r.id_grupo));
 v_caducadas:=v_caducadas+1;
 END LOOP;
 RETURN jsonb_build_object('success',true,'reservas_vencidas',v_caducadas,'lotes_liberados',v_caducadas,'reservas_bloqueadas_para_revision',v_bloqueadas);
END; $expire$;
REVOKE ALL ON FUNCTION public.sp_caducar_separaciones_vencidas() FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
CREATE OR REPLACE FUNCTION public.sp_fin_reservas_vencidas_revision_v1(p_actor bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
 IF NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.view'::varchar),FALSE)
 THEN RAISE EXCEPTION 'DENEGADO|Se requiere finance.view.'; END IF;
 RETURN jsonb_build_object(
  'items',COALESCE((
    SELECT jsonb_agg(to_jsonb(x) ORDER BY x."fechaVencimiento",x."idReserva")
    FROM (
      SELECT r.id_reserva AS "idReserva",r.codigo::text AS "codigo",
        r.fecha_vencimiento AS "fechaVencimiento",
        e.codigo::text AS "estadoReserva",el.codigo::text AS "estadoLote",
        l.codigo::text AS "codigoLote",pr.nombre::text AS "proyecto",
        r.monto_reserva AS "montoReserva",
        CASE WHEN EXISTS(SELECT 1 FROM public.ven_separaciones_grupo_lotes_v1 g WHERE g.id_reserva=r.id_reserva) THEN
          coalesce((SELECT sum(d.monto) FROM public.pag_separaciones_grupo_distribucion_v1 d JOIN public.pag_pagos p USING(id_pago) JOIN public.cfg_estados_pago ep USING(id_estado_pago) WHERE d.id_reserva=r.id_reserva AND ep.codigo='CONFIRMADO'),0)
          ELSE coalesce((SELECT SUM(p.monto) FROM public.pag_pagos p JOIN public.cfg_estados_pago ep USING(id_estado_pago) WHERE p.id_reserva=r.id_reserva AND ep.codigo='CONFIRMADO'),0) END::numeric AS "montoConfirmado",
        COALESCE((
          SELECT COUNT(*) FROM public.pag_pagos p
          JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago
          WHERE ep.codigo='REGISTRADO' AND ((p.id_reserva=r.id_reserva AND NOT EXISTS(SELECT 1 FROM public.pag_separaciones_grupo_abonos_v1 a WHERE a.id_pago=p.id_pago)) OR EXISTS(SELECT 1 FROM public.pag_separaciones_grupo_distribucion_v1 d WHERE d.id_pago=p.id_pago AND d.id_reserva=r.id_reserva))
        ),0)::int AS "pagosEnRevision",
        (EXISTS(SELECT 1 FROM public.ven_separaciones_grupo_lotes_v1 g WHERE g.id_reserva=r.id_reserva) OR EXISTS (
          SELECT 1 FROM public.pag_pagos p
          JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago
          WHERE p.id_reserva=r.id_reserva AND ep.codigo<>'ANULADO'
        ) OR EXISTS (
          SELECT 1 FROM public.ven_ventas v JOIN public.cfg_estados_venta ev
            ON ev.id_estado_venta=v.id_estado_venta
          WHERE v.id_lote=r.id_lote AND ev.codigo<>'ANULADA'
        )) AS "requiereRevision",
        r.fecha_reserva AS "fechaReserva"
      FROM public.ven_reservas r
      JOIN public.cfg_estados_reserva e ON e.id_estado_reserva=r.id_estado_reserva
      JOIN public.inm_lotes l ON l.id_lote=r.id_lote
      JOIN public.cfg_estados_lote el ON el.id_estado_lote=l.id_estado_lote
      JOIN public.inm_proyectos pr ON pr.id_proyecto=l.id_proyecto
      WHERE e.codigo IN('PENDIENTE','VIGENTE','VENCIDA') AND r.fecha_vencimiento <= now()
      ORDER BY r.fecha_vencimiento,r.id_reserva LIMIT 100
    ) x
  ),'[]'::jsonb),
  'soloConsulta',true
 );
END $function$;
CREATE OR REPLACE FUNCTION public.sp_finanzas_revisar_voucher_separacion_v1(p_actor bigint, p_id_voucher bigint, p_aprobar boolean, p_motivo text, p_observaciones text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_lote bigint;
    v_reserva bigint;
    v_pago bigint;
    v_estado_voucher varchar;
    v_estado_pago varchar;
    v_estado_reserva varchar;
    v_estado_lote varchar;
    v_vencimiento timestamptz;
    v_estado_voucher_nuevo integer;
    v_estado_pago_nuevo integer;
    v_estado_reserva_nuevo integer;
    v_estado_lote_nuevo integer;
    v_estado_lote_anterior integer;
    v_clave_archivo varchar;
BEGIN
    IF EXISTS(SELECT 1 FROM public.pag_vouchers v JOIN public.pag_separaciones_grupo_abonos_v1 a USING(id_pago) WHERE v.id_voucher=p_id_voucher) THEN
      RETURN public.sp_fin_revisar_abono_separacion_grupo_v1(p_actor,p_id_voucher,p_aprobar,p_motivo,p_observaciones);
    END IF;
    IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor, 'finance.edit'::varchar),false) THEN
        RAISE EXCEPTION 'DENEGADO|Se requiere finance.edit para aprobar o rechazar.';
    END IF;
    IF p_id_voucher IS NULL OR p_id_voucher<=0 OR p_aprobar IS NULL THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|Datos de decision invalidos.';
    END IF;
    IF p_observaciones IS NOT NULL AND length(p_observaciones)>500 THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|Observaciones mayores a 500 caracteres.';
    END IF;
    IF NOT p_aprobar AND (p_motivo IS NULL OR length(btrim(p_motivo))<5
                         OR length(p_motivo)>255) THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|Se requiere un motivo claro de rechazo.';
    END IF;

    SELECT r.id_lote,r.id_reserva,p.id_pago
      INTO v_lote,v_reserva,v_pago
      FROM public.pag_vouchers v
      JOIN public.pag_pagos p ON p.id_pago=v.id_pago AND p.id_reserva IS NOT NULL
      JOIN public.ven_reservas r ON r.id_reserva=p.id_reserva
     WHERE v.id_voucher=p_id_voucher;
    IF v_lote IS NULL THEN
        RAISE EXCEPTION 'ARCHIVO_NO_EXISTE|Voucher de separacion no existe.';
    END IF;

    -- Lock ordenado: lote -> reserva -> pago -> voucher.
    SELECT l.id_estado_lote, el.codigo INTO v_estado_lote_anterior, v_estado_lote
      FROM public.inm_lotes l
      JOIN public.cfg_estados_lote el ON el.id_estado_lote=l.id_estado_lote
     WHERE l.id_lote=v_lote FOR UPDATE OF l;
    PERFORM 1 FROM public.ven_reservas WHERE id_reserva=v_reserva FOR UPDATE;
    PERFORM 1 FROM public.pag_pagos WHERE id_pago=v_pago FOR UPDATE;
    PERFORM 1 FROM public.pag_vouchers WHERE id_voucher=p_id_voucher FOR UPDATE;

    SELECT ev.codigo,ep.codigo,er.codigo,r.fecha_vencimiento,v.clave_archivo
      INTO v_estado_voucher,v_estado_pago,v_estado_reserva,v_vencimiento,v_clave_archivo
      FROM public.pag_vouchers v
      JOIN public.cfg_estados_voucher ev ON ev.id_estado_voucher=v.id_estado_voucher
      JOIN public.pag_pagos p ON p.id_pago=v.id_pago
      JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago
      JOIN public.ven_reservas r ON r.id_reserva=p.id_reserva
      JOIN public.cfg_estados_reserva er ON er.id_estado_reserva=r.id_estado_reserva
     WHERE v.id_voucher=p_id_voucher AND p.id_pago=v_pago AND r.id_reserva=v_reserva;
    -- Revisión documental independiente; jamás reactiva una reserva vencida.
    IF v_estado_reserva='VENCIDA' AND v_vencimiento<=now() THEN
      IF v_estado_voucher IS DISTINCT FROM 'PENDIENTE' OR v_estado_pago IS DISTINCT FROM 'REGISTRADO' THEN
        RAISE EXCEPTION 'OPERACION_INVALIDA|El comprobante ya fue evaluado.';
      END IF;
      IF p_aprobar AND NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id='vouchers-separacion-private' AND o.name=v_clave_archivo AND o.archived_at IS NULL AND o.is_delete_marker=false) THEN
        RAISE EXCEPTION 'ARCHIVO_NO_EXISTE|El comprobante ya no existe en Storage.';
      END IF;
      UPDATE public.pag_vouchers SET id_estado_voucher=(SELECT id_estado_voucher FROM public.cfg_estados_voucher WHERE codigo=CASE WHEN p_aprobar THEN 'APROBADO' ELSE 'RECHAZADO' END AND activo),
        fecha_validacion=now(),id_usuario_validacion=p_actor,observaciones_validacion=nullif(btrim(p_observaciones),''),motivo_rechazo=CASE WHEN NOT p_aprobar THEN btrim(p_motivo) END,fecha_actualizacion=now() WHERE id_voucher=p_id_voucher;
      UPDATE public.pag_pagos SET id_estado_pago=(SELECT id_estado_pago FROM public.cfg_estados_pago WHERE codigo=CASE WHEN p_aprobar THEN 'CONFIRMADO' ELSE 'ANULADO' END AND activo),
        fecha_confirmacion=CASE WHEN p_aprobar THEN now() END,id_usuario_confirmacion=CASE WHEN p_aprobar THEN p_actor END,
        fecha_anulacion=CASE WHEN NOT p_aprobar THEN now() END,id_usuario_anulacion=CASE WHEN NOT p_aprobar THEN p_actor END,motivo_anulacion=CASE WHEN NOT p_aprobar THEN btrim(p_motivo) END,fecha_actualizacion=now() WHERE id_pago=v_pago;
      RETURN jsonb_build_object('success',true,'id_voucher',p_id_voucher,'id_reserva',v_reserva,'estado_voucher',CASE WHEN p_aprobar THEN 'APROBADO' ELSE 'RECHAZADO' END,'estado_pago',CASE WHEN p_aprobar THEN 'CONFIRMADO' ELSE 'ANULADO' END,'estado_reserva','VENCIDA','message','Comprobante revisado sin reactivar la separación vencida.');
    END IF;
    IF v_estado_voucher IS DISTINCT FROM 'PENDIENTE'
       OR v_estado_pago IS DISTINCT FROM 'REGISTRADO'
       OR v_estado_reserva IS DISTINCT FROM 'PENDIENTE' THEN
        RAISE EXCEPTION 'OPERACION_INVALIDA|El voucher ya fue evaluado o la reserva cambio de estado.';
    END IF;
    IF v_estado_lote IS DISTINCT FROM 'RESERVADO' THEN
        RAISE EXCEPTION 'LOTE_NO_DISPONIBLE|La reserva no controla un lote reservado.';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.ven_ventas ve
        JOIN public.cfg_estados_venta es ON es.id_estado_venta=ve.id_estado_venta
        WHERE ve.id_lote=v_lote AND es.codigo<>'ANULADA'
    ) THEN
        RAISE EXCEPTION 'VENTA_EXISTENTE|Existe un proceso de venta en curso; requiere revision manual.';
    END IF;

    IF p_aprobar THEN
        IF NOT EXISTS (SELECT 1 FROM storage.objects o
           WHERE o.bucket_id='vouchers-separacion-private' AND o.name=v_clave_archivo
             AND o.archived_at IS NULL AND o.is_delete_marker=false) THEN
            RAISE EXCEPTION 'ARCHIVO_NO_EXISTE|El comprobante ya no existe en Storage.';
        END IF;
        IF v_vencimiento<=now() THEN
            RAISE EXCEPTION 'RESERVA_INVALIDA|La reserva ya vencio; requiere gestion comercial.';
        END IF;
        SELECT id_estado_voucher INTO STRICT v_estado_voucher_nuevo
          FROM public.cfg_estados_voucher WHERE codigo='APROBADO' AND activo=true;
        SELECT id_estado_pago INTO STRICT v_estado_pago_nuevo
          FROM public.cfg_estados_pago WHERE codigo='CONFIRMADO' AND activo=true;
        SELECT id_estado_reserva INTO STRICT v_estado_reserva_nuevo
          FROM public.cfg_estados_reserva WHERE codigo='VIGENTE' AND activo=true;

        UPDATE public.pag_vouchers
           SET id_estado_voucher=v_estado_voucher_nuevo,
               fecha_validacion=now(),id_usuario_validacion=p_actor,
               observaciones_validacion=nullif(btrim(p_observaciones),''),
               fecha_actualizacion=now()
         WHERE id_voucher=p_id_voucher;
        UPDATE public.pag_pagos
           SET id_estado_pago=v_estado_pago_nuevo,
               fecha_confirmacion=now(),id_usuario_confirmacion=p_actor,
               fecha_actualizacion=now()
         WHERE id_pago=v_pago;
        UPDATE public.ven_reservas
           SET id_estado_reserva=v_estado_reserva_nuevo,fecha_actualizacion=now()
         WHERE id_reserva=v_reserva;
        RETURN jsonb_build_object('success',true,'id_voucher',p_id_voucher,
          'id_reserva',v_reserva,'estado_voucher','APROBADO',
          'estado_pago','CONFIRMADO','estado_reserva','VIGENTE',
          'message','Pago confirmado y reserva vigente.');
    END IF;

    SELECT id_estado_voucher INTO STRICT v_estado_voucher_nuevo
      FROM public.cfg_estados_voucher WHERE codigo='RECHAZADO' AND activo=true;
    SELECT id_estado_pago INTO STRICT v_estado_pago_nuevo
      FROM public.cfg_estados_pago WHERE codigo='ANULADO' AND activo=true;
    SELECT id_estado_reserva INTO STRICT v_estado_reserva_nuevo
      FROM public.cfg_estados_reserva WHERE codigo='CANCELADA' AND activo=true;
    SELECT id_estado_lote INTO STRICT v_estado_lote_nuevo
      FROM public.cfg_estados_lote WHERE codigo='DISPONIBLE' AND activo=true;

    UPDATE public.pag_vouchers
       SET id_estado_voucher=v_estado_voucher_nuevo,
           fecha_validacion=now(),id_usuario_validacion=p_actor,
           motivo_rechazo=btrim(p_motivo),
           observaciones_validacion=nullif(btrim(p_observaciones),''),
           fecha_actualizacion=now()
     WHERE id_voucher=p_id_voucher;
    UPDATE public.pag_pagos
       SET id_estado_pago=v_estado_pago_nuevo,
           fecha_anulacion=now(),id_usuario_anulacion=p_actor,
           motivo_anulacion=btrim(p_motivo),fecha_actualizacion=now()
     WHERE id_pago=v_pago;
    UPDATE public.ven_reservas
       SET id_estado_reserva=v_estado_reserva_nuevo,fecha_actualizacion=now()
     WHERE id_reserva=v_reserva;
    UPDATE public.inm_lotes
       SET id_estado_lote=v_estado_lote_nuevo,fecha_actualizacion=now()
     WHERE id_lote=v_lote;
    INSERT INTO public.inm_lotes_historial_estado (
        id_lote,id_estado_anterior,id_estado_nuevo,motivo,fecha_cambio,id_usuario
    ) VALUES (
        v_lote,v_estado_lote_anterior,v_estado_lote_nuevo,
        'Voucher rechazado - separacion '||v_reserva||': '||left(btrim(p_motivo),150),
        now(),p_actor
    );
    RETURN jsonb_build_object('success',true,'id_voucher',p_id_voucher,
      'id_reserva',v_reserva,'estado_voucher','RECHAZADO',
      'estado_pago','ANULADO','estado_reserva','CANCELADA',
      'estado_lote','DISPONIBLE','message','Pago anulado y reserva cancelada.');
END;
$function$;
DO $schedule$
DECLARE j bigint;
BEGIN
 IF to_regclass('cron.job') IS NOT NULL THEN
 EXECUTE 'SELECT jobid FROM cron.job WHERE active AND command ILIKE ''%sp_caducar_separaciones_vencidas%'' ORDER BY jobid LIMIT 1' INTO j;
 IF j IS NOT NULL THEN EXECUTE 'SELECT cron.alter_job($1,schedule := $2)' USING j,'* * * * *';
 ELSE EXECUTE 'SELECT cron.schedule($1,$2,$3)' USING 'sgi-caducar-separaciones','* * * * *','SELECT public.sp_caducar_separaciones_vencidas();'; END IF;
 END IF;
END; $schedule$;
SELECT public.sp_caducar_separaciones_vencidas();
COMMIT;
