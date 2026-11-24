-- 154: operación de separación acumulada, abonos reales y distribución por reserva.
-- El id_reserva de pag_pagos es un anclaje de compatibilidad para Finanzas;
-- las asignaciones monetarias por lote viven exclusivamente en la distribución.
BEGIN;
CREATE TABLE public.ven_separaciones_grupo_v1 (
 id_grupo uuid PRIMARY KEY,
 id_prospecto bigint NOT NULL REFERENCES public.crm_prospectos(id_prospecto),
 id_proyecto bigint NOT NULL REFERENCES public.inm_proyectos(id_proyecto),
 id_actor bigint NOT NULL REFERENCES public.seg_usuarios(id_usuario),
 total numeric(14,2) NOT NULL CHECK(total>0),
 estado text NOT NULL DEFAULT 'PENDIENTE' CHECK(estado IN ('PENDIENTE','VIGENTE','REQUIERE_REVISION')),
 solicitud jsonb NOT NULL,
 resultado jsonb,
 fecha_creacion timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.ven_separaciones_grupo_lotes_v1 (
 id_reserva bigint PRIMARY KEY REFERENCES public.ven_reservas(id_reserva),
 id_grupo uuid NOT NULL REFERENCES public.ven_separaciones_grupo_v1(id_grupo),
 monto numeric(14,2) NOT NULL CHECK(monto>0)
);
CREATE INDEX ON public.ven_separaciones_grupo_lotes_v1(id_grupo);
CREATE TABLE public.pag_separaciones_grupo_abonos_v1 (
 id_pago bigint PRIMARY KEY REFERENCES public.pag_pagos(id_pago),
 id_grupo uuid NOT NULL REFERENCES public.ven_separaciones_grupo_v1(id_grupo)
);
CREATE INDEX ON public.pag_separaciones_grupo_abonos_v1(id_grupo);
CREATE TABLE public.pag_separaciones_grupo_distribucion_v1 (
 id_pago bigint NOT NULL REFERENCES public.pag_separaciones_grupo_abonos_v1(id_pago),
 id_reserva bigint NOT NULL REFERENCES public.ven_separaciones_grupo_lotes_v1(id_reserva),
 monto numeric(14,2) NOT NULL CHECK(monto>0),
 PRIMARY KEY(id_pago,id_reserva)
);
ALTER TABLE public.ven_separaciones_grupo_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ven_separaciones_grupo_lotes_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pag_separaciones_grupo_abonos_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pag_separaciones_grupo_distribucion_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ven_separaciones_grupo_v1,public.ven_separaciones_grupo_lotes_v1,public.pag_separaciones_grupo_abonos_v1,public.pag_separaciones_grupo_distribucion_v1 FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
CREATE FUNCTION public.sp_crm_registrar_separacion_acumulada_v1(p_actor bigint,p_solicitud uuid,p_prospecto bigint,p_lotes jsonb,p_abonos jsonb,p_observaciones text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public','pg_temp' AS $$
DECLARE
 v_proyecto bigint; v_persona bigint; v_lote bigint; v_principal bigint; v_ancla bigint;
 v_moneda integer; v_estado_reserva integer; v_estado_lote integer; v_estado_anterior integer;
 v_estado_pago integer; v_estado_voucher integer; v_metodo integer; v_exige boolean;
 v_reserva bigint; v_pago bigint; v_voucher bigint; v_evento bigint;
 v_total numeric:=0; v_pagado numeric:=0; v_monto numeric; v_restante numeric; v_asignar numeric;
 v_precio numeric; v_politica jsonb; v_etapas jsonb; v_contexto jsonb; v_req jsonb; v_resultado jsonb;
 v_existente record; v_item jsonb; v_abono jsonb; v_r record; v_size bigint; v_mime text; v_ext text;
 v_ref text; v_hash text; v_ruta text; v_nombre text; v_reservas jsonb:='[]'; v_abonos jsonb:='[]';
BEGIN
 IF p_actor IS NULL OR p_solicitud IS NULL OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.create'::varchar),false)
 OR NOT coalesce(public.fn_crm_puede_consultar_prospecto(p_actor,p_prospecto),false)
 THEN RAISE EXCEPTION 'DENEGADO|No autorizado para registrar la separación.'; END IF;
 IF jsonb_typeof(p_lotes) IS DISTINCT FROM 'array' OR jsonb_typeof(p_abonos) IS DISTINCT FROM 'array'
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Lotes y abonos obligatorios.'; END IF;
 IF jsonb_array_length(p_lotes) NOT BETWEEN 1 AND 20 OR jsonb_array_length(p_abonos) NOT BETWEEN 1 AND 20
 OR length(coalesce(p_observaciones,''))>500 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Cantidad de lotes, abonos u observaciones inválidas.'; END IF;
 v_req:=jsonb_build_object('prospecto',p_prospecto,'lotes',p_lotes,'abonos',p_abonos,'observaciones',p_observaciones);
 PERFORM pg_advisory_xact_lock(hashtextextended(p_solicitud::text,154));
 SELECT * INTO v_existente FROM public.ven_separaciones_grupo_v1 WHERE id_grupo=p_solicitud;
 IF FOUND THEN
  IF v_existente.id_actor<>p_actor OR v_existente.solicitud IS DISTINCT FROM v_req THEN RAISE EXCEPTION 'OPERACION_INVALIDA|Solicitud reutilizada con otros datos.'; END IF;
  RETURN v_existente.resultado;
 END IF;
 IF (SELECT count(DISTINCT (x->>'idLote')::bigint) FROM jsonb_array_elements(p_lotes) x)<>jsonb_array_length(p_lotes)
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Los lotes deben ser distintos.'; END IF;
 v_principal:=(p_lotes->0->>'idLote')::bigint;
 -- Bloquear todos los lotes en orden estable, antes de las políticas.
 PERFORM 1 FROM public.inm_lotes WHERE id_lote IN (SELECT (x->>'idLote')::bigint FROM jsonb_array_elements(p_lotes) x) ORDER BY id_lote FOR UPDATE;
 SELECT id_proyecto INTO v_proyecto FROM public.inm_lotes WHERE id_lote=v_principal;
 IF v_proyecto IS NULL OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_lotes) x LEFT JOIN public.inm_lotes l ON l.id_lote=(x->>'idLote')::bigint WHERE l.id_proyecto IS DISTINCT FROM v_proyecto)
 THEN RAISE EXCEPTION 'PROYECTO_INVALIDO|Todos los lotes deben pertenecer al mismo proyecto.'; END IF;
 PERFORM 1 FROM public.cfg_fin_politica_activa WHERE id=1 FOR SHARE;
 PERFORM 1 FROM public.cfg_fin_politica_proyecto_activa WHERE id_proyecto=v_proyecto FOR SHARE;
 v_etapas:=public.sp_crm_etapas_operacion_v1(p_actor,p_prospecto,v_proyecto,false);
 SELECT id_moneda INTO STRICT v_moneda FROM public.cfg_monedas WHERE codigo='PEN' AND activo;
 SELECT id_estado_reserva INTO STRICT v_estado_reserva FROM public.cfg_estados_reserva WHERE codigo='PENDIENTE' AND activo;
 SELECT id_estado_lote INTO STRICT v_estado_lote FROM public.cfg_estados_lote WHERE codigo='RESERVADO' AND activo;
 SELECT id_estado_pago INTO STRICT v_estado_pago FROM public.cfg_estados_pago WHERE codigo='REGISTRADO' AND activo;
 SELECT id_estado_voucher INTO STRICT v_estado_voucher FROM public.cfg_estados_voucher WHERE codigo='PENDIENTE' AND activo;
 FOR v_item IN SELECT x FROM jsonb_array_elements(p_lotes) x LOOP
  v_lote:=(v_item->>'idLote')::bigint;
  v_contexto:=public.sp_crm_validar_preparacion_comprobante_v1(p_actor,p_prospecto,v_lote);
  v_persona:=(v_contexto->>'id_persona')::bigint;
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v_etapas) e CROSS JOIN LATERAL jsonb_array_elements(e->'idLotes') l WHERE (l#>>'{}')::bigint=v_lote)
  THEN RAISE EXCEPTION 'LOTE_NO_DISPONIBLE|Lote no comercializable.'; END IF;
  v_politica:=public.fn_fin_politica_lote_v2(v_lote);
  v_monto:=(v_politica->>'montoSeparacion')::numeric;
  SELECT precio INTO STRICT v_precio FROM public.inm_lotes_precios WHERE id_lote=v_lote AND id_moneda=v_moneda AND activo AND fecha_desde<=now() AND (fecha_hasta IS NULL OR fecha_hasta>now());
  IF v_monto IS NULL OR v_monto<=0 OR v_monto IS DISTINCT FROM (v_item->>'monto')::numeric
   OR (v_politica->>'idPolitica')::bigint IS DISTINCT FROM (v_item->>'idPolitica')::bigint
   OR v_precio IS DISTINCT FROM (v_item->>'precio')::numeric
  THEN RAISE EXCEPTION 'SEPARACION_MONTO_INVALIDO|Precio o política modificados; vuelva a consultar.'; END IF;
  v_total:=v_total+v_monto;
 END LOOP;
 -- Serializar huellas y referencias entre operaciones acumuladas.
 PERFORM pg_advisory_xact_lock(hashtextextended('separacion-acumulada-abonos-v1',154));
 IF (SELECT count(DISTINCT lower(x->>'hashSha256')) FROM jsonb_array_elements(p_abonos) x)<>jsonb_array_length(p_abonos)
 OR (SELECT count(DISTINCT x->>'claveArchivo') FROM jsonb_array_elements(p_abonos) x)<>jsonb_array_length(p_abonos)
 THEN RAISE EXCEPTION 'ARCHIVO_DUPLICADO|Comprobantes repetidos.'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_abonos) x WHERE nullif(btrim(x->>'numeroOperacion'),'') IS NOT NULL GROUP BY upper(btrim(x->>'numeroOperacion')) HAVING count(*)>1)
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Referencia duplicada.'; END IF;
 FOR v_abono IN SELECT x FROM jsonb_array_elements(p_abonos) x LOOP
  v_monto:=(v_abono->>'monto')::numeric;
  v_ref:=nullif(btrim(v_abono->>'numeroOperacion'),'');
  v_hash:=lower(v_abono->>'hashSha256');v_ruta:=v_abono->>'claveArchivo';v_nombre:=btrim(v_abono->>'nombreArchivo');
  v_mime:=v_abono->>'tipoMime';
  SELECT id_metodo_pago,requiere_numero_operacion INTO v_metodo,v_exige FROM public.cfg_metodos_pago WHERE codigo=v_abono->>'metodoPago' AND activo;
  v_ext:=CASE v_mime WHEN 'application/pdf' THEN 'pdf' WHEN 'image/jpeg' THEN 'jpg' WHEN 'image/png' THEN 'png' WHEN 'image/webp' THEN 'webp' END;
  IF v_monto IS NULL OR v_monto<=0 OR v_monto<>round(v_monto,2) OR v_monto>v_total
   OR v_metodo IS NULL OR (v_exige AND v_ref IS NULL) OR length(coalesce(v_ref,''))>80
   OR v_nombre IS NULL OR v_nombre='' OR length(v_nombre)>255 OR v_nombre~'[[:cntrl:]]'
   OR v_hash IS NULL OR v_hash!~'^[0-9a-f]{64}$' OR v_ext IS NULL OR v_ruta IS NULL
   OR v_ruta!~('^separaciones/p-'||p_prospecto||'/l-'||v_principal||'/[0-9a-fA-F-]{36}[.]'||v_ext||'$')
  THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Datos de abono o comprobante inválidos.'; END IF;
  SELECT (o.metadata->>'size')::bigint INTO v_size FROM storage.objects o
   WHERE o.bucket_id='vouchers-separacion-private' AND o.name=v_ruta AND o.archived_at IS NULL AND NOT o.is_delete_marker AND lower(o.metadata->>'mimetype')=v_mime;
  IF v_size IS NULL OR v_size NOT BETWEEN 1 AND 5242880 OR v_size IS DISTINCT FROM (v_abono->>'tamanioBytes')::bigint
  THEN RAISE EXCEPTION 'ARCHIVO_NO_EXISTE|Archivo o metadatos no válidos.'; END IF;
  IF EXISTS(SELECT 1 FROM public.pag_vouchers WHERE clave_archivo=v_ruta OR lower(hash_sha256)=v_hash)
  THEN RAISE EXCEPTION 'ARCHIVO_DUPLICADO|El comprobante ya se registró.'; END IF;
  v_pagado:=v_pagado+v_monto;
 END LOOP;
 IF v_pagado<>v_total THEN RAISE EXCEPTION 'SEPARACION_MONTO_INVALIDO|La suma de abonos debe ser igual al importe de separación.'; END IF;
 INSERT INTO public.ven_separaciones_grupo_v1(id_grupo,id_prospecto,id_proyecto,id_actor,total,solicitud) VALUES(p_solicitud,p_prospecto,v_proyecto,p_actor,v_total,v_req);
 FOR v_item IN SELECT x FROM jsonb_array_elements(p_lotes) x LOOP
  v_lote:=(v_item->>'idLote')::bigint;v_politica:=public.fn_fin_politica_lote_v2(v_lote);v_monto:=(v_politica->>'montoSeparacion')::numeric;
  SELECT id_estado_lote INTO v_estado_anterior FROM public.inm_lotes WHERE id_lote=v_lote;
  v_reserva:=nextval(pg_get_serial_sequence('public.ven_reservas','id_reserva'));
  INSERT INTO public.ven_reservas(id_reserva,id_lote,id_persona,id_estado_reserva,id_moneda,codigo,fecha_reserva,fecha_vencimiento,monto_reserva,observaciones,id_usuario_registro) OVERRIDING SYSTEM VALUE
  VALUES(v_reserva,v_lote,v_persona,v_estado_reserva,v_moneda,'RES-'||v_lote||'-'||v_reserva,now(),now()+make_interval(days=>(v_politica->>'diasVencimientoSeparacion')::integer),v_monto,nullif(btrim(p_observaciones),''),p_actor);
  IF v_lote=v_principal THEN v_ancla:=v_reserva; END IF;
  INSERT INTO public.ven_separaciones_grupo_lotes_v1 VALUES(v_reserva,p_solicitud,v_monto);
  UPDATE public.inm_lotes SET id_estado_lote=v_estado_lote,fecha_actualizacion=now() WHERE id_lote=v_lote;
  INSERT INTO public.inm_lotes_historial_estado(id_lote,id_estado_anterior,id_estado_nuevo,motivo,fecha_cambio,id_usuario)
   VALUES(v_lote,v_estado_anterior,v_estado_lote,'Separación acumulada '||p_solicitud,now(),p_actor);
  v_reservas:=v_reservas||jsonb_build_array(jsonb_build_object('idReserva',v_reserva,'idLote',v_lote,'monto',v_monto));
 END LOOP;
 FOR v_abono IN SELECT x FROM jsonb_array_elements(p_abonos) x LOOP
  v_monto:=(v_abono->>'monto')::numeric;
  SELECT id_metodo_pago INTO STRICT v_metodo FROM public.cfg_metodos_pago WHERE codigo=v_abono->>'metodoPago' AND activo;
  v_pago:=nextval(pg_get_serial_sequence('public.pag_pagos','id_pago'));
  INSERT INTO public.pag_pagos(id_pago,id_reserva,id_estado_pago,id_metodo_pago,id_moneda,codigo,monto,fecha_operacion,numero_operacion,observaciones,id_usuario_registro) OVERRIDING SYSTEM VALUE
  VALUES(v_pago,v_ancla,v_estado_pago,v_metodo,v_moneda,'PAG-SEP-'||v_pago,v_monto,now(),nullif(btrim(v_abono->>'numeroOperacion'),''),nullif(btrim(p_observaciones),''),p_actor);
  INSERT INTO public.pag_separaciones_grupo_abonos_v1 VALUES(v_pago,p_solicitud);
  v_voucher:=nextval(pg_get_serial_sequence('public.pag_vouchers','id_voucher'));
  INSERT INTO public.pag_vouchers(id_voucher,id_pago,id_estado_voucher,codigo,numero_version,nombre_archivo_original,clave_archivo,tipo_mime,tamanio_bytes,hash_sha256,fecha_carga,id_usuario_carga,activo) OVERRIDING SYSTEM VALUE
  VALUES(v_voucher,v_pago,v_estado_voucher,'VOU-SEP-'||v_voucher,1,btrim(v_abono->>'nombreArchivo'),v_abono->>'claveArchivo',v_abono->>'tipoMime',(v_abono->>'tamanioBytes')::bigint,lower(v_abono->>'hashSha256'),now(),p_actor,true);
  v_restante:=v_monto;
  FOR v_r IN SELECT l.id_reserva,l.monto-coalesce((SELECT sum(d.monto) FROM public.pag_separaciones_grupo_distribucion_v1 d WHERE d.id_reserva=l.id_reserva),0) saldo
   FROM public.ven_separaciones_grupo_lotes_v1 l WHERE l.id_grupo=p_solicitud ORDER BY l.id_reserva LOOP
    v_asignar:=least(v_restante,v_r.saldo);
    IF v_asignar>0 THEN INSERT INTO public.pag_separaciones_grupo_distribucion_v1 VALUES(v_pago,v_r.id_reserva,v_asignar);v_restante:=v_restante-v_asignar; END IF;
    EXIT WHEN v_restante=0;
  END LOOP;
  IF v_restante<>0 THEN RAISE EXCEPTION 'REGISTRO_INCOMPLETO|Distribución no balanceada.'; END IF;
  v_abonos:=v_abonos||jsonb_build_array(jsonb_build_object('idPago',v_pago,'idVoucher',v_voucher,'monto',v_monto));
 END LOOP;
 IF EXISTS(SELECT 1 FROM public.ven_separaciones_grupo_lotes_v1 l WHERE l.id_grupo=p_solicitud AND l.monto<>coalesce((SELECT sum(d.monto) FROM public.pag_separaciones_grupo_distribucion_v1 d WHERE d.id_reserva=l.id_reserva),0)) THEN RAISE EXCEPTION 'REGISTRO_INCOMPLETO|Distribución incompleta.'; END IF;
 v_resultado:=jsonb_build_object('success',true,'idGrupo',p_solicitud,'total',v_total,'reservas',v_reservas,'abonos',v_abonos);
 UPDATE public.ven_separaciones_grupo_v1 SET resultado=v_resultado WHERE id_grupo=p_solicitud;
 SELECT public.sp_registrar_auditoria(p_actor,'CRM'::varchar,'SEPARACION_ACUMULADA'::varchar,'SEPARACION_GRUPO'::varchar,p_solicitud::text::varchar,'EXITOSO'::varchar,'Registro de separación acumulada'::varchar,v_resultado) INTO v_evento;
 IF v_evento IS NULL THEN RAISE EXCEPTION 'AUDITORIA_FALLIDA|No se registró auditoría.'; END IF;
 RETURN v_resultado;
END; $$;
REVOKE ALL ON FUNCTION public.sp_crm_registrar_separacion_acumulada_v1(bigint,uuid,bigint,jsonb,jsonb,text) FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
GRANT EXECUTE ON FUNCTION public.sp_crm_registrar_separacion_acumulada_v1(bigint,uuid,bigint,jsonb,jsonb,text) TO sigi_app_user;

CREATE FUNCTION public.sp_fin_revisar_abono_separacion_grupo_v1(p_actor bigint,p_voucher bigint,p_aprobar boolean,p_motivo text,p_observaciones text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public','pg_temp' AS $$
DECLARE v_grupo uuid;v_pago bigint;v_estado text;v_ruta text;v_evento bigint;v_nuevo text;v_reserva bigint;
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.edit'::varchar),false) THEN RAISE EXCEPTION 'DENEGADO|Se requiere finance.edit.'; END IF;
 IF p_aprobar IS NULL OR length(coalesce(p_observaciones,''))>500 OR (NOT p_aprobar AND length(btrim(coalesce(p_motivo,''))) NOT BETWEEN 5 AND 255) THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Decisión inválida.'; END IF;
 SELECT a.id_grupo,a.id_pago INTO v_grupo,v_pago FROM public.pag_vouchers v JOIN public.pag_separaciones_grupo_abonos_v1 a USING(id_pago) WHERE v.id_voucher=p_voucher;
 IF v_grupo IS NULL THEN RAISE EXCEPTION 'ARCHIVO_NO_EXISTE|Abono no encontrado.'; END IF;
 PERFORM 1 FROM public.inm_lotes l JOIN public.ven_reservas r USING(id_lote) JOIN public.ven_separaciones_grupo_lotes_v1 g USING(id_reserva) WHERE g.id_grupo=v_grupo ORDER BY l.id_lote FOR UPDATE OF l;
 PERFORM 1 FROM public.ven_separaciones_grupo_v1 WHERE id_grupo=v_grupo FOR UPDATE;
 PERFORM 1 FROM public.ven_reservas r JOIN public.ven_separaciones_grupo_lotes_v1 g USING(id_reserva) WHERE g.id_grupo=v_grupo ORDER BY r.id_reserva FOR UPDATE OF r;
 PERFORM 1 FROM public.pag_pagos WHERE id_pago=v_pago FOR UPDATE;
 SELECT e.codigo,v.clave_archivo INTO v_estado,v_ruta FROM public.pag_vouchers v JOIN public.cfg_estados_voucher e USING(id_estado_voucher) WHERE v.id_voucher=p_voucher AND v.activo FOR UPDATE OF v;
 IF v_estado IS DISTINCT FROM 'PENDIENTE' OR NOT EXISTS(SELECT 1 FROM public.pag_pagos p JOIN public.cfg_estados_pago e USING(id_estado_pago) WHERE p.id_pago=v_pago AND e.codigo='REGISTRADO') THEN RAISE EXCEPTION 'OPERACION_INVALIDA|El abono ya fue revisado.'; END IF;
 IF p_aprobar AND NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='vouchers-separacion-private' AND name=v_ruta AND archived_at IS NULL AND NOT is_delete_marker) THEN RAISE EXCEPTION 'ARCHIVO_NO_EXISTE|Comprobante no disponible.'; END IF;
 IF p_aprobar THEN
  UPDATE public.pag_vouchers SET id_estado_voucher=(SELECT id_estado_voucher FROM public.cfg_estados_voucher WHERE codigo='APROBADO' AND activo),fecha_validacion=now(),id_usuario_validacion=p_actor,observaciones_validacion=nullif(btrim(p_observaciones),''),fecha_actualizacion=now() WHERE id_voucher=p_voucher;
  UPDATE public.pag_pagos SET id_estado_pago=(SELECT id_estado_pago FROM public.cfg_estados_pago WHERE codigo='CONFIRMADO' AND activo),fecha_confirmacion=now(),id_usuario_confirmacion=p_actor,fecha_actualizacion=now() WHERE id_pago=v_pago;
 ELSE
  UPDATE public.pag_vouchers SET id_estado_voucher=(SELECT id_estado_voucher FROM public.cfg_estados_voucher WHERE codigo='RECHAZADO' AND activo),fecha_validacion=now(),id_usuario_validacion=p_actor,motivo_rechazo=btrim(p_motivo),observaciones_validacion=nullif(btrim(p_observaciones),''),fecha_actualizacion=now() WHERE id_voucher=p_voucher;
  UPDATE public.pag_pagos SET id_estado_pago=(SELECT id_estado_pago FROM public.cfg_estados_pago WHERE codigo='ANULADO' AND activo),fecha_anulacion=now(),id_usuario_anulacion=p_actor,motivo_anulacion=btrim(p_motivo),fecha_actualizacion=now() WHERE id_pago=v_pago;
 END IF;
 IF EXISTS(SELECT 1 FROM public.pag_separaciones_grupo_abonos_v1 a JOIN public.pag_pagos p USING(id_pago) JOIN public.cfg_estados_pago e USING(id_estado_pago) WHERE a.id_grupo=v_grupo AND e.codigo='ANULADO')
 OR EXISTS(SELECT 1 FROM public.ven_separaciones_grupo_lotes_v1 g JOIN public.ven_reservas r USING(id_reserva) WHERE g.id_grupo=v_grupo AND r.fecha_vencimiento<=now()) THEN v_nuevo:='REQUIERE_REVISION';
 ELSIF NOT EXISTS(SELECT 1 FROM public.pag_separaciones_grupo_abonos_v1 a JOIN public.pag_pagos p USING(id_pago) JOIN public.cfg_estados_pago e USING(id_estado_pago) WHERE a.id_grupo=v_grupo AND e.codigo<>'CONFIRMADO') THEN v_nuevo:='VIGENTE';
 ELSE v_nuevo:='PENDIENTE'; END IF;
 UPDATE public.ven_separaciones_grupo_v1 SET estado=v_nuevo WHERE id_grupo=v_grupo;
 IF v_nuevo='VIGENTE' THEN
  UPDATE public.ven_reservas r SET id_estado_reserva=(SELECT id_estado_reserva FROM public.cfg_estados_reserva WHERE codigo='VIGENTE' AND activo),fecha_actualizacion=now() FROM public.ven_separaciones_grupo_lotes_v1 g WHERE g.id_reserva=r.id_reserva AND g.id_grupo=v_grupo;
 END IF;
 SELECT public.sp_registrar_auditoria(p_actor,'FINANCIAMIENTO'::varchar,'REVISION_ABONO_SEPARACION'::varchar,'SEPARACION_GRUPO'::varchar,v_grupo::text::varchar,'EXITOSO'::varchar,'Revisión de abono acumulado'::varchar,jsonb_build_object('idPago',v_pago,'idVoucher',p_voucher,'aprobar',p_aprobar,'estadoGrupo',v_nuevo,'motivo',p_motivo)) INTO v_evento;
 IF v_evento IS NULL THEN RAISE EXCEPTION 'AUDITORIA_FALLIDA|No se registró auditoría.'; END IF;
 SELECT id_reserva INTO v_reserva FROM public.pag_pagos WHERE id_pago=v_pago;
 RETURN jsonb_build_object('success',true,'id_voucher',p_voucher,'id_reserva',v_reserva,'estado_voucher',CASE WHEN p_aprobar THEN 'APROBADO' ELSE 'RECHAZADO' END,'estado_pago',CASE WHEN p_aprobar THEN 'CONFIRMADO' ELSE 'ANULADO' END,'estadoGrupo',v_nuevo,'message',CASE WHEN v_nuevo='VIGENTE' THEN 'Todos los abonos confirmados; reservas vigentes.' WHEN v_nuevo='REQUIERE_REVISION' THEN 'Operación retenida para revisión financiera.' ELSE 'Abono revisado; quedan pagos pendientes.' END);
END; $$;
REVOKE ALL ON FUNCTION public.sp_fin_revisar_abono_separacion_grupo_v1(bigint,bigint,boolean,text,text) FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;

-- Protecciones: los procesos históricos no pueden convertir, anular o caducar
-- parcialmente una operación compleja. La conversión/subsanación requieren flujo específico.
CREATE FUNCTION public.fn_guardar_reserva_grupo_v1() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public','pg_temp' AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.ven_separaciones_grupo_lotes_v1 g WHERE g.id_reserva=OLD.id_reserva)
 AND NEW.id_estado_reserva IS DISTINCT FROM OLD.id_estado_reserva
 AND NOT EXISTS(SELECT 1 FROM public.ven_separaciones_grupo_lotes_v1 g JOIN public.ven_separaciones_grupo_v1 op USING(id_grupo) JOIN public.cfg_estados_reserva e ON e.id_estado_reserva=NEW.id_estado_reserva WHERE g.id_reserva=OLD.id_reserva AND op.estado='VIGENTE' AND e.codigo='VIGENTE')
 THEN RAISE EXCEPTION 'OPERACION_INVALIDA|La reserva agrupada requiere gestión integral.'; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.fn_guardar_reserva_grupo_v1() FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
CREATE TRIGGER trg_reserva_grupo_v1 BEFORE UPDATE OF id_estado_reserva ON public.ven_reservas FOR EACH ROW EXECUTE FUNCTION public.fn_guardar_reserva_grupo_v1();
CREATE FUNCTION public.fn_guardar_venta_reserva_grupo_v1() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public','pg_temp' AS $$
BEGIN
 IF NEW.id_reserva IS NOT NULL AND EXISTS(SELECT 1 FROM public.ven_separaciones_grupo_lotes_v1 WHERE id_reserva=NEW.id_reserva)
 THEN RAISE EXCEPTION 'OPERACION_INVALIDA|La venta de una reserva agrupada requiere distribución financiera integrada.'; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.fn_guardar_venta_reserva_grupo_v1() FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
CREATE TRIGGER trg_venta_reserva_grupo_v1 BEFORE INSERT OR UPDATE OF id_reserva ON public.ven_ventas FOR EACH ROW EXECUTE FUNCTION public.fn_guardar_venta_reserva_grupo_v1();
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

CREATE OR REPLACE FUNCTION public.sp_finanzas_conciliar_pago_confirmado_v1(p_actor bigint, p_pago bigint, p_cuenta_financiera bigint, p_categoria bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_pago record;v_cuenta record;v_categoria record;v_movimiento record;
  v_estado_id integer;v_id_movimiento bigint;
  v_vouchers_aprobados integer;v_vouchers_no_aprobados integer;
BEGIN
  IF p_actor IS NULL OR p_actor<=0 OR p_pago IS NULL OR p_pago<=0
     OR p_cuenta_financiera IS NULL OR p_cuenta_financiera<=0
     OR p_categoria IS NULL OR p_categoria<=0 THEN
    RAISE EXCEPTION 'DATOS_INVALIDOS|Actor, pago, cuenta y categoria son obligatorios.';
  END IF;

  IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.edit'::varchar),false) THEN
    RAISE EXCEPTION 'DENEGADO|Se requiere finance.edit.';
  END IF;

  -- El bloqueo del pago serializa conciliaciones concurrentes del mismo recibo.
  SELECT pg.id_pago,pg.codigo,pg.monto,pg.id_moneda,pg.id_reserva,pg.id_venta,
         pg.fecha_operacion,pg.fecha_confirmacion,pg.numero_operacion,
         ep.codigo AS estado,mp.codigo AS metodo
    INTO v_pago
    FROM public.pag_pagos pg
    JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=pg.id_estado_pago
    JOIN public.cfg_metodos_pago mp ON mp.id_metodo_pago=pg.id_metodo_pago
   WHERE pg.id_pago=p_pago FOR UPDATE OF pg;

  IF NOT FOUND OR v_pago.estado<>'CONFIRMADO'
     OR v_pago.fecha_confirmacion IS NULL OR v_pago.id_reserva IS NULL
     OR v_pago.monto<=0 THEN
    RAISE EXCEPTION 'PAGO_NO_APTO|Se requiere un pago de separación confirmado.';
  END IF;

  IF NOT (
    EXISTS(SELECT 1 FROM public.pag_separaciones_grupo_abonos_v1 a WHERE a.id_pago=p_pago
      AND v_pago.monto=(SELECT sum(d.monto) FROM public.pag_separaciones_grupo_distribucion_v1 d WHERE d.id_pago=p_pago))
    OR (NOT EXISTS(SELECT 1 FROM public.pag_separaciones_grupo_abonos_v1 a WHERE a.id_pago=p_pago)
      AND EXISTS(SELECT 1 FROM public.ven_reservas r WHERE r.id_reserva=v_pago.id_reserva AND r.monto_reserva=v_pago.monto))
  ) OR (v_pago.id_venta IS NOT NULL AND NOT EXISTS (
     SELECT 1 FROM public.ven_ventas v
     WHERE v.id_venta=v_pago.id_venta AND v.id_reserva=v_pago.id_reserva
  )) THEN
    RAISE EXCEPTION 'PAGO_INCONSISTENTE|Pago no coincide con reserva o venta.';
  END IF;

  SELECT count(*) FILTER (WHERE ev.codigo='APROBADO'),
         count(*) FILTER (WHERE ev.codigo<>'APROBADO')
    INTO v_vouchers_aprobados,v_vouchers_no_aprobados
    FROM public.pag_vouchers pv
    JOIN public.cfg_estados_voucher ev ON ev.id_estado_voucher=pv.id_estado_voucher
   WHERE pv.id_pago=p_pago AND pv.activo=true;

  IF v_vouchers_aprobados<>1 OR v_vouchers_no_aprobados<>0 THEN
    RAISE EXCEPTION 'VOUCHER_NO_APTO|Se requiere un unico comprobante activo aprobado.';
  END IF;

  SELECT cu.id_moneda,cu.activo,cu.permite_ingresos,tc.codigo AS tipo
    INTO v_cuenta FROM public.fin_cuentas_financieras cu
    JOIN public.cfg_tipos_cuenta_financiera tc
      ON tc.id_tipo_cuenta_financiera=cu.id_tipo_cuenta_financiera
   WHERE cu.id_cuenta_financiera=p_cuenta_financiera FOR UPDATE OF cu;

  IF NOT FOUND OR v_cuenta.activo IS DISTINCT FROM true
     OR v_cuenta.permite_ingresos IS DISTINCT FROM true
     OR v_cuenta.id_moneda IS DISTINCT FROM v_pago.id_moneda THEN
    RAISE EXCEPTION 'CUENTA_NO_APTA|Cuenta receptora inactiva, no configurada o moneda incorrecta.';
  END IF;

  IF (v_pago.metodo IN ('TRANSFERENCIA','DEPOSITO') AND v_cuenta.tipo<>'BANCO')
     OR (v_pago.metodo='EFECTIVO' AND v_cuenta.tipo<>'CAJA')
     OR (v_pago.metodo='YAPE_PLIN' AND v_cuenta.tipo<>'BILLETERA_DIGITAL') THEN
    RAISE EXCEPTION 'CUENTA_NO_APTA|Tipo de cuenta incompatible con metodo de pago.';
  END IF;

  SELECT cat.activo,tipo.codigo AS tipo INTO v_categoria
    FROM public.fin_categorias cat
    JOIN public.cfg_tipos_movimiento_financiero tipo
      ON tipo.id_tipo_movimiento_financiero=cat.id_tipo_movimiento_financiero
   WHERE cat.id_categoria=p_categoria FOR UPDATE OF cat;

  IF NOT FOUND OR v_categoria.activo IS DISTINCT FROM true
     OR v_categoria.tipo<>'INGRESO' THEN
    RAISE EXCEPTION 'CATEGORIA_NO_APTA|Se requiere categoria activa de INGRESO.';
  END IF;

  SELECT e.id_estado_movimiento_financiero INTO v_estado_id
    FROM public.cfg_estados_movimiento_financiero e
   WHERE e.codigo='CONFIRMADO' AND e.activo=true;

  IF v_estado_id IS NULL THEN
    RAISE EXCEPTION 'CONFIGURACION_INVALIDA|Estado financiero confirmado no configurado.';
  END IF;

  SELECT fm.id_movimiento,fm.id_cuenta_financiera,fm.id_categoria,
         fm.monto,e.codigo AS estado
    INTO v_movimiento
    FROM public.fin_movimientos fm
    JOIN public.cfg_estados_movimiento_financiero e
      ON e.id_estado_movimiento_financiero=fm.id_estado_movimiento_financiero
   WHERE fm.id_pago=p_pago FOR UPDATE OF fm;

  IF FOUND THEN
    IF v_movimiento.id_cuenta_financiera<>p_cuenta_financiera
       OR v_movimiento.id_categoria<>p_categoria
       OR v_movimiento.monto<>v_pago.monto
       OR v_movimiento.estado<>'CONFIRMADO' THEN
      RAISE EXCEPTION 'CONCILIACION_CONFLICTO|Movimiento previo distinto. Requiere revision.';
    END IF;

    RETURN jsonb_build_object(
      'success',true,'estado','YA_CONCILIADO','idMovimiento',v_movimiento.id_movimiento,
      'idPago',p_pago,'codigoPago',v_pago.codigo,'idCuentaFinanciera',p_cuenta_financiera,
      'idCategoria',p_categoria,'monto',v_pago.monto
    );
  END IF;

  INSERT INTO public.fin_movimientos(
    id_categoria,id_cuenta_financiera,id_estado_movimiento_financiero,
    id_pago,codigo,monto,fecha_movimiento,numero_operacion,
    concepto,descripcion,id_usuario_registro,id_usuario_confirmacion,fecha_confirmacion
  ) VALUES (
    p_categoria,p_cuenta_financiera,v_estado_id,p_pago,
    'FIN-PAG-'||p_pago::text,v_pago.monto,v_pago.fecha_operacion,v_pago.numero_operacion,
    left('Ingreso por separacion - '||v_pago.codigo,180),
    left('Cobranza confirmada por Finanzas; pago '||v_pago.codigo||
      ', reserva '||v_pago.id_reserva::text,500),
    p_actor,p_actor,now()
  ) RETURNING id_movimiento INTO v_id_movimiento;

  RETURN jsonb_build_object(
    'success',true,'estado','CONCILIADO','idMovimiento',v_id_movimiento,
    'idPago',p_pago,'codigoPago',v_pago.codigo,'idCuentaFinanciera',p_cuenta_financiera,
    'idCategoria',p_categoria,'monto',v_pago.monto
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_caducar_separaciones_vencidas()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    r RECORD;
    v_estado_vencida integer;
    v_estado_disponible integer;
    v_estado_anterior integer;
    v_estado_lote text;
    v_estado_reserva text;
    v_vencimiento timestamptz;
    v_precios integer;
    v_caducadas integer := 0;
    v_liberados integer := 0;
    v_bloqueadas integer := 0;
    v_conciliacion integer := 0;
    v_confirmados_conciliacion integer := 0;
BEGIN
    SELECT id_estado_reserva INTO STRICT v_estado_vencida
      FROM public.cfg_estados_reserva WHERE codigo='VENCIDA' AND activo;
    SELECT id_estado_lote INTO STRICT v_estado_disponible
      FROM public.cfg_estados_lote WHERE codigo='DISPONIBLE' AND activo;

    -- Orden de bloqueo consistente con la revisión financiera: lote -> reserva.
    FOR r IN
        SELECT res.id_reserva, res.id_lote, res.codigo
        FROM public.ven_reservas res
        JOIN public.cfg_estados_reserva er
          ON er.id_estado_reserva=res.id_estado_reserva
        WHERE er.codigo IN ('PENDIENTE','VIGENTE')
          AND res.fecha_vencimiento <= now()
        ORDER BY res.id_lote,res.id_reserva
    LOOP
        SELECT l.id_estado_lote,el.codigo
          INTO v_estado_anterior,v_estado_lote
        FROM public.inm_lotes l
        JOIN public.cfg_estados_lote el ON el.id_estado_lote=l.id_estado_lote
        WHERE l.id_lote=r.id_lote AND l.activo
        FOR UPDATE OF l;
        IF NOT FOUND THEN
            v_bloqueadas := v_bloqueadas + 1;
            CONTINUE;
        END IF;

        SELECT er.codigo,res.fecha_vencimiento
          INTO v_estado_reserva,v_vencimiento
        FROM public.ven_reservas res
        JOIN public.cfg_estados_reserva er
          ON er.id_estado_reserva=res.id_estado_reserva
        WHERE res.id_reserva=r.id_reserva
        FOR UPDATE OF res;

        -- Se comprueba otra vez después del bloqueo: otra transacción pudo formalizar.
        IF NOT FOUND OR v_estado_reserva NOT IN ('PENDIENTE','VIGENTE')
           OR v_vencimiento > now() THEN
            CONTINUE;
        END IF;

        IF EXISTS(SELECT 1 FROM public.ven_separaciones_grupo_lotes_v1 g WHERE g.id_reserva=r.id_reserva) THEN
            v_bloqueadas := v_bloqueadas + 1; CONTINUE;
        END IF;
        -- No liberar si existe venta o una segunda separación activa del mismo lote.
        IF v_estado_lote <> 'RESERVADO'
           OR EXISTS (
                SELECT 1 FROM public.ven_ventas v
                JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=v.id_estado_venta
                WHERE v.id_lote=r.id_lote AND ev.codigo <> 'ANULADA'
           )
           OR EXISTS (
                SELECT 1 FROM public.ven_reservas o
                JOIN public.cfg_estados_reserva eo ON eo.id_estado_reserva=o.id_estado_reserva
                WHERE o.id_lote=r.id_lote AND o.id_reserva<>r.id_reserva
                  AND eo.codigo IN ('PENDIENTE','VIGENTE')
           )
        THEN
            v_bloqueadas := v_bloqueadas + 1;
            CONTINUE;
        END IF;

        SELECT count(*) INTO v_precios
        FROM public.inm_lotes_precios p
        JOIN public.cfg_monedas m ON m.id_moneda=p.id_moneda
        WHERE p.id_lote=r.id_lote AND m.codigo='PEN'
          AND p.activo AND p.fecha_desde<=now()
          AND (p.fecha_hasta IS NULL OR p.fecha_hasta>now())
          AND p.precio>0;

        IF v_precios <> 1 THEN
            v_bloqueadas := v_bloqueadas + 1;
            CONTINUE;
        END IF;

        -- Retencion financiera: la caducidad no equivale a anular dinero o comprobantes.
        -- Un pago no anulado, o un voucher no rechazado, requiere resolucion humana.
        -- La reserva conserva su estado y el lote sigue RESERVADO para evitar reventa.
        IF EXISTS (
            SELECT 1
            FROM public.pag_pagos pago
            JOIN public.cfg_estados_pago estado_pago
              ON estado_pago.id_estado_pago = pago.id_estado_pago
            WHERE pago.id_reserva = r.id_reserva
              AND estado_pago.codigo <> 'ANULADO'
        ) OR EXISTS (
            SELECT 1
            FROM public.pag_pagos pago
            JOIN public.pag_vouchers vo ON vo.id_pago = pago.id_pago
            JOIN public.cfg_estados_voucher estado_voucher
              ON estado_voucher.id_estado_voucher = vo.id_estado_voucher
            WHERE pago.id_reserva = r.id_reserva
              AND estado_voucher.codigo <> 'RECHAZADO'
        ) THEN
            IF EXISTS (
                SELECT 1 FROM public.pag_pagos pago
                JOIN public.pag_vouchers vo ON vo.id_pago = pago.id_pago
                JOIN public.cfg_estados_voucher estado_voucher
                  ON estado_voucher.id_estado_voucher = vo.id_estado_voucher
                WHERE pago.id_reserva = r.id_reserva
                  AND estado_voucher.codigo = 'PENDIENTE'
            ) THEN
                v_conciliacion := v_conciliacion + 1;
            END IF;
            IF EXISTS (
                SELECT 1 FROM public.pag_pagos pago
                JOIN public.cfg_estados_pago estado_pago
                  ON estado_pago.id_estado_pago = pago.id_estado_pago
                WHERE pago.id_reserva = r.id_reserva
                  AND estado_pago.codigo = 'CONFIRMADO'
            ) THEN
                v_confirmados_conciliacion := v_confirmados_conciliacion + 1;
            END IF;
            v_bloqueadas := v_bloqueadas + 1;
            CONTINUE;
        END IF;

        UPDATE public.ven_reservas
        SET id_estado_reserva=v_estado_vencida,fecha_actualizacion=now()
        WHERE id_reserva=r.id_reserva;

        UPDATE public.inm_lotes
        SET id_estado_lote=v_estado_disponible,fecha_actualizacion=now()
        WHERE id_lote=r.id_lote;

        INSERT INTO public.inm_lotes_historial_estado
          (id_lote,id_estado_anterior,id_estado_nuevo,motivo,fecha_cambio)
        VALUES
          (r.id_lote,v_estado_anterior,v_estado_disponible,
           'Vencimiento de separación '||r.codigo||' tras 7 días; sin venta activa',
           now());

        v_caducadas := v_caducadas+1;
        v_liberados := v_liberados+1;
    END LOOP;

    RETURN jsonb_build_object(
      'success',true,
      'reservas_vencidas',v_caducadas,
      'lotes_liberados',v_liberados,
      'reservas_bloqueadas_para_revision',v_bloqueadas,
      'comprobantes_pendientes_conciliacion',v_conciliacion,
      'pagos_confirmados_pendientes_conciliacion',v_confirmados_conciliacion
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_crm_reserva_acreditable_v1(p_reserva bigint)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
 SELECT CASE WHEN EXISTS(SELECT 1 FROM public.ven_separaciones_grupo_lotes_v1 g WHERE g.id_reserva=p_reserva) THEN 0::numeric ELSE COALESCE((
   SELECT CASE WHEN r.monto_reserva=coalesce((r.politica_financiera_snapshot->>'montoSeparacion')::numeric,500.00)
      AND er.codigo='VIGENTE' AND r.fecha_vencimiento>now()
      AND (
        SELECT count(*) FROM public.pag_pagos pg
        JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=pg.id_estado_pago
        WHERE pg.id_reserva=r.id_reserva AND ep.codigo<>'ANULADO'
      )=1
      AND EXISTS(
        SELECT 1 FROM public.pag_pagos pg
        JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=pg.id_estado_pago
        WHERE pg.id_reserva=r.id_reserva AND ep.codigo='CONFIRMADO'
          AND pg.monto=r.monto_reserva AND pg.id_moneda=r.id_moneda
          AND pg.id_venta IS NULL AND pg.id_plan_pago IS NULL
          AND EXISTS(
            SELECT 1 FROM public.pag_vouchers vo
            JOIN public.cfg_estados_voucher ev ON ev.id_estado_voucher=vo.id_estado_voucher
            WHERE vo.id_pago=pg.id_pago AND vo.activo AND ev.codigo='APROBADO'
          )
          AND NOT EXISTS(
            SELECT 1 FROM public.pag_vouchers vo
            JOIN public.cfg_estados_voucher ev ON ev.id_estado_voucher=vo.id_estado_voucher
            WHERE vo.id_pago=pg.id_pago AND vo.activo AND ev.codigo<>'APROBADO'
          )
          AND NOT EXISTS(
            SELECT 1 FROM public.pag_aplicaciones_pago ap
            JOIN public.cfg_tipos_aplicacion_pago tp ON tp.id_tipo_aplicacion_pago=ap.id_tipo_aplicacion_pago
            WHERE ap.id_pago=pg.id_pago AND ap.activo
              AND (tp.codigo<>'SEPARACION' OR ap.id_plan_pago IS NOT NULL OR ap.id_cuota IS NOT NULL)
          )
      )
      THEN r.monto_reserva ELSE 0::numeric END
   FROM public.ven_reservas r
   JOIN public.cfg_estados_reserva er ON er.id_estado_reserva=r.id_estado_reserva
   WHERE r.id_reserva=p_reserva
 ),0::numeric) END;
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
 IF upper(coalesce(p_tipo,''))='SEPARACION' AND EXISTS(SELECT 1 FROM public.ven_separaciones_grupo_lotes_v1 g WHERE g.id_reserva=p_id_operacion) THEN RAISE EXCEPTION 'OPERACION_INVALIDA|La separación agrupada requiere gestión integral de pagos.'; END IF;
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
          AND rol.codigo IN ('GERENCIA','ADMINISTRADOR','ASESOR','SUPERVISOR_COMERCIAL')
    ) THEN
        RAISE EXCEPTION 'DENEGADO|Este rol no puede registrar solicitudes comerciales.';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.seg_usuarios_roles ur
        JOIN public.seg_roles rol ON rol.id_rol=ur.id_rol
        WHERE ur.id_usuario=p_actor AND ur.activo
          AND ur.fecha_revocacion IS NULL AND rol.activo
          AND rol.codigo IN ('GERENCIA','ADMINISTRADOR')
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
        WHERE ((v_id_reserva IS NOT NULL AND p.id_reserva=v_id_reserva)
           OR (v_id_venta IS NOT NULL AND
              (p.id_venta=v_id_venta OR
                (v_reserva_venta IS NOT NULL AND p.id_reserva=v_reserva_venta))))
          AND ep.codigo<>'ANULADO'
    ) INTO v_hay_pagos;

    SELECT EXISTS (
        SELECT 1 FROM public.pag_vouchers vo
        JOIN public.cfg_estados_voucher ev ON ev.id_estado_voucher=vo.id_estado_voucher
        JOIN public.pag_pagos p ON p.id_pago=vo.id_pago
        WHERE ((v_id_reserva IS NOT NULL AND p.id_reserva=v_id_reserva)
           OR (v_id_venta IS NOT NULL AND
              (p.id_venta=v_id_venta OR
                (v_reserva_venta IS NOT NULL AND p.id_reserva=v_reserva_venta))))
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

CREATE OR REPLACE FUNCTION public.sp_crm_validar_formalizacion_v10(p_actor bigint, p_prospecto bigint, p_lote bigint, p_modalidad character varying, p_monto_total numeric, p_monto_inicial numeric, p_numero_cuotas integer, p_tasa_mensual_pct numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
 v_ctx jsonb;
 v_id_reserva bigint;
 v_reserva_nominal numeric:=0;
 v_reserva_acreditable numeric:=0;
 v_plan jsonb;
 v_politica jsonb;
BEGIN
 IF p_tasa_mensual_pct IS NOT NULL THEN
   RAISE EXCEPTION 'TASA_FIJA|El servidor selecciona la tasa nominal anual desde la política contractual.';
 END IF;
 v_ctx:=public.sp_crm_validar_formalizacion_v6(
   p_actor,p_prospecto,p_lote,p_modalidad,p_monto_total,
   p_monto_inicial,p_numero_cuotas);
 v_politica:=public.fn_fin_politica_para_venta_v1(p_prospecto,p_lote);
 SELECT r.id_reserva,r.monto_reserva
 INTO v_id_reserva,v_reserva_nominal
 FROM public.ven_reservas r
 JOIN public.cfg_estados_reserva er ON er.id_estado_reserva=r.id_estado_reserva
 WHERE r.id_persona=(v_ctx->>'idPersona')::bigint
   AND r.id_lote=p_lote AND er.codigo='VIGENTE'
   AND r.fecha_vencimiento>now()
 ORDER BY r.fecha_reserva DESC,r.id_reserva DESC LIMIT 1;
 v_reserva_nominal:=coalesce(v_reserva_nominal,0);
 IF v_id_reserva IS NOT NULL THEN
   IF EXISTS(SELECT 1 FROM public.ven_separaciones_grupo_lotes_v1 g WHERE g.id_reserva=v_id_reserva) THEN RAISE EXCEPTION 'OPERACION_INVALIDA|La separación agrupada requiere aplicación de pagos a ventas.'; END IF;
   v_reserva_acreditable:=public.fn_crm_reserva_acreditable_v1(v_id_reserva);
   -- No registrar la venta con un saldo y luego acreditar una separacion
   -- todavia no confirmada; eso generaria un doble descuento al firmar.
   IF v_reserva_acreditable<>v_reserva_nominal THEN
      RAISE EXCEPTION 'RESERVA_PENDIENTE|Finanzas debe confirmar el pago y aprobar su comprobante antes de formalizar esta reserva.';
   END IF;
 END IF;
 IF p_modalidad='FINANCIADA' THEN
   IF p_monto_inicial IS NULL
       OR p_monto_inicial>=p_monto_total
       OR v_reserva_acreditable>p_monto_inicial THEN
      RAISE EXCEPTION 'INICIAL_INVALIDA|La inicial debe cumplir la política y dejar capital financiable.';
   END IF;
   v_plan:=public.fn_fin_simular_frances_politica_v1(
     p_monto_total,v_reserva_acreditable,p_monto_inicial,
     p_numero_cuotas,(v_politica->>'idPolitica')::bigint);
 END IF;
 RETURN v_ctx||jsonb_build_object(
   'idPolitica',(v_politica->>'idPolitica')::bigint,
   'politicaVersion',(v_politica->>'version')::integer,
   'politicaFinanciera',v_politica,
   'idReservaAplicable',CASE WHEN v_reserva_acreditable>0 THEN v_id_reserva ELSE NULL END,
   'montoReservaNominal',v_reserva_nominal,
   'montoReservaAplicable',v_reserva_acreditable,
   'montoInicialTotal',CASE WHEN p_modalidad='FINANCIADA' THEN p_monto_inicial ELSE NULL END,
   'montoInicialAdicional',CASE WHEN p_modalidad='FINANCIADA' THEN p_monto_inicial-v_reserva_acreditable ELSE NULL END,
   'saldoContado',p_monto_total-v_reserva_acreditable,
   'planFrances',v_plan);
END $function$;

CREATE OR REPLACE FUNCTION public.sp_finanzas_listar_vouchers_separacion_v1(p_actor bigint, p_estado character varying, p_busqueda character varying, p_pagina integer, p_tamano integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_total bigint;
    v_items jsonb;
    v_pagina integer := coalesce(p_pagina,1);
    v_tamano integer := coalesce(p_tamano,20);
    v_estado varchar := coalesce(nullif(btrim(p_estado),''),'TODOS');
    v_busqueda text := coalesce(nullif(btrim(p_busqueda),''),'');
BEGIN
    IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor, 'finance.view'::varchar),false) THEN
        RAISE EXCEPTION 'DENEGADO|No tiene autorizacion para consultar Finanzas.';
    END IF;
    IF v_pagina<1 OR v_tamano<1 OR v_tamano>100 OR length(v_busqueda)>120
       OR v_estado NOT IN ('TODOS','PENDIENTE','APROBADO','RECHAZADO') THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|Filtros de comprobantes invalidos.';
    END IF;

    SELECT count(*) INTO v_total
      FROM public.pag_vouchers v
      JOIN public.pag_pagos p ON p.id_pago=v.id_pago AND p.id_reserva IS NOT NULL
      JOIN public.ven_reservas r ON r.id_reserva=p.id_reserva
      JOIN public.cfg_estados_voucher ev ON ev.id_estado_voucher=v.id_estado_voucher
      JOIN public.core_personas per ON per.id_persona=r.id_persona
      JOIN public.inm_lotes l ON l.id_lote=r.id_lote
     WHERE (v_estado='TODOS' OR ev.codigo=v_estado)
       AND (v_busqueda='' OR v.codigo ILIKE '%'||v_busqueda||'%'
            OR p.codigo ILIKE '%'||v_busqueda||'%'
            OR r.codigo ILIKE '%'||v_busqueda||'%'
            OR l.codigo ILIKE '%'||v_busqueda||'%'
            OR concat_ws(' ',per.nombres,per.apellido_paterno,per.apellido_materno) ILIKE '%'||v_busqueda||'%');

    SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id_voucher DESC),'[]'::jsonb)
      INTO v_items
    FROM (
        SELECT (SELECT a.id_grupo::text FROM public.pag_separaciones_grupo_abonos_v1 a WHERE a.id_pago=p.id_pago) AS id_grupo,
    (SELECT string_agg(l2.codigo, ', ' ORDER BY l2.codigo) FROM public.pag_separaciones_grupo_abonos_v1 a JOIN public.ven_separaciones_grupo_lotes_v1 g USING(id_grupo) JOIN public.ven_reservas r2 USING(id_reserva) JOIN public.inm_lotes l2 ON l2.id_lote=r2.id_lote WHERE a.id_pago=p.id_pago) AS lotes_grupo, v.id_voucher,v.codigo codigo_voucher,ev.codigo estado_voucher,
               ev.nombre nombre_estado_voucher,v.nombre_archivo_original nombre_archivo,
               v.clave_archivo,v.tipo_mime,v.tamanio_bytes,v.fecha_carga,
               p.id_pago,p.codigo codigo_pago,ep.codigo estado_pago,p.monto,
               mp.codigo metodo_pago,mp.nombre nombre_metodo_pago,p.numero_operacion,
               r.id_reserva,r.codigo codigo_reserva,r.fecha_reserva,r.fecha_vencimiento,
               r.id_lote,l.codigo codigo_lote,r.id_persona,
               btrim(concat_ws(' ',per.nombres,per.apellido_paterno,per.apellido_materno)) nombre_cliente,
               (SELECT d.numero_documento FROM public.core_personas_documentos d
                WHERE d.id_persona=r.id_persona AND d.activo=true
                ORDER BY d.principal DESC,d.id_persona_documento DESC LIMIT 1) documento_cliente,
               v.fecha_validacion,v.motivo_rechazo,v.observaciones_validacion
          FROM public.pag_vouchers v
          JOIN public.pag_pagos p ON p.id_pago=v.id_pago AND p.id_reserva IS NOT NULL
          JOIN public.ven_reservas r ON r.id_reserva=p.id_reserva
          JOIN public.cfg_estados_voucher ev ON ev.id_estado_voucher=v.id_estado_voucher
          JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago
          JOIN public.cfg_metodos_pago mp ON mp.id_metodo_pago=p.id_metodo_pago
          JOIN public.core_personas per ON per.id_persona=r.id_persona
          JOIN public.inm_lotes l ON l.id_lote=r.id_lote
         WHERE (v_estado='TODOS' OR ev.codigo=v_estado)
           AND (v_busqueda='' OR v.codigo ILIKE '%'||v_busqueda||'%'
                OR p.codigo ILIKE '%'||v_busqueda||'%'
                OR r.codigo ILIKE '%'||v_busqueda||'%'
                OR l.codigo ILIKE '%'||v_busqueda||'%'
                OR concat_ws(' ',per.nombres,per.apellido_paterno,per.apellido_materno) ILIKE '%'||v_busqueda||'%')
         ORDER BY v.id_voucher DESC
         LIMIT v_tamano OFFSET (v_pagina-1)*v_tamano
    ) x;

    RETURN jsonb_build_object('items',v_items,'total',v_total,'pagina',v_pagina,
                               'tamano',v_tamano,'paginas',greatest(1,ceil(v_total::numeric/v_tamano)::integer));
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_finanzas_listar_conciliaciones_separacion_v1(p_actor bigint, p_estado character varying DEFAULT 'TODOS'::character varying, p_busqueda character varying DEFAULT NULL::character varying, p_pagina integer DEFAULT 1, p_tamano integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
 v_estado varchar:=upper(coalesce(nullif(btrim(p_estado),''),'TODOS'));
 v_busqueda text:=coalesce(nullif(btrim(p_busqueda),''),'');
 v_pagina integer:=coalesce(p_pagina,1);
 v_tamano integer:=coalesce(p_tamano,20);
 v_total bigint;v_items jsonb;v_cuentas jsonb;v_categorias jsonb;
BEGIN
 IF p_actor IS NULL OR p_actor<=0 OR NOT coalesce(
  public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.view'::varchar),false
 ) THEN RAISE EXCEPTION 'DENEGADO|Se requiere finance.view.'; END IF;
 IF v_estado NOT IN ('TODOS','PENDIENTE','CONCILIADO','REQUIERE_REVISION')
 OR v_pagina<1 OR v_pagina>100000 OR v_tamano<1 OR v_tamano>100 OR length(v_busqueda)>120 THEN
   RAISE EXCEPTION 'DATOS_INVALIDOS|Filtros de conciliacion invalidos.';
 END IF;

 SELECT COUNT(*) INTO v_total
 FROM public.pag_pagos p
 JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago
 JOIN public.ven_reservas r ON r.id_reserva=p.id_reserva
 JOIN public.core_personas per ON per.id_persona=r.id_persona
 JOIN public.inm_lotes l ON l.id_lote=r.id_lote
 LEFT JOIN public.ven_ventas venta ON venta.id_venta=p.id_venta
 LEFT JOIN public.fin_movimientos fm ON fm.id_pago=p.id_pago
 LEFT JOIN public.cfg_estados_movimiento_financiero em
  ON em.id_estado_movimiento_financiero=fm.id_estado_movimiento_financiero
 WHERE ep.codigo='CONFIRMADO'
 AND EXISTS (
    SELECT 1 FROM public.pag_vouchers vou
    JOIN public.cfg_estados_voucher ev ON ev.id_estado_voucher=vou.id_estado_voucher
    WHERE vou.id_pago=p.id_pago AND vou.activo AND ev.codigo='APROBADO'
 )
 AND (v_estado='TODOS'
  OR (v_estado='PENDIENTE' AND fm.id_movimiento IS NULL)
  OR (v_estado='CONCILIADO' AND em.codigo='CONFIRMADO')
  OR (v_estado='REQUIERE_REVISION' AND fm.id_movimiento IS NOT NULL AND em.codigo<>'CONFIRMADO'))
 AND (v_busqueda='' OR p.codigo ILIKE '%'||v_busqueda||'%'
  OR r.codigo ILIKE '%'||v_busqueda||'%'
  OR l.codigo ILIKE '%'||v_busqueda||'%'
  OR coalesce(venta.codigo,'') ILIKE '%'||v_busqueda||'%'
  OR btrim(concat_ws(' ',per.nombres,per.apellido_paterno,per.apellido_materno)) ILIKE '%'||v_busqueda||'%');

 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id_pago DESC),'[]'::jsonb) INTO v_items
 FROM (
  SELECT (SELECT a.id_grupo::text FROM public.pag_separaciones_grupo_abonos_v1 a WHERE a.id_pago=p.id_pago) AS id_grupo,
    (SELECT string_agg(l2.codigo, ', ' ORDER BY l2.codigo) FROM public.pag_separaciones_grupo_abonos_v1 a JOIN public.ven_separaciones_grupo_lotes_v1 g USING(id_grupo) JOIN public.ven_reservas r2 USING(id_reserva) JOIN public.inm_lotes l2 ON l2.id_lote=r2.id_lote WHERE a.id_pago=p.id_pago) AS lotes_grupo, p.id_pago,p.codigo AS codigo_pago,p.monto,mo.codigo AS moneda,
    mp.codigo AS metodo_pago,p.numero_operacion,p.fecha_operacion,p.fecha_confirmacion,
    r.id_reserva,r.codigo AS codigo_reserva,l.codigo AS codigo_lote,
    btrim(concat_ws(' ',per.nombres,per.apellido_paterno,per.apellido_materno)) AS comprador,
    p.id_venta,venta.codigo AS codigo_venta,
    fm.id_movimiento,fm.codigo AS codigo_movimiento,fm.id_cuenta_financiera,fm.id_categoria,
    CASE WHEN fm.id_movimiento IS NULL THEN 'PENDIENTE'
         WHEN em.codigo='CONFIRMADO' THEN 'CONCILIADO'
         ELSE 'REQUIERE_REVISION' END AS estado_conciliacion,
    coalesce(cu.codigo,'') AS codigo_cuenta,
    (cu.codigo LIKE 'DEMO-%') AS cuenta_demo
  FROM public.pag_pagos p
  JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago
  JOIN public.cfg_metodos_pago mp ON mp.id_metodo_pago=p.id_metodo_pago
  JOIN public.cfg_monedas mo ON mo.id_moneda=p.id_moneda
  JOIN public.ven_reservas r ON r.id_reserva=p.id_reserva
  JOIN public.core_personas per ON per.id_persona=r.id_persona
  JOIN public.inm_lotes l ON l.id_lote=r.id_lote
  LEFT JOIN public.ven_ventas venta ON venta.id_venta=p.id_venta
  LEFT JOIN public.fin_movimientos fm ON fm.id_pago=p.id_pago
  LEFT JOIN public.cfg_estados_movimiento_financiero em
    ON em.id_estado_movimiento_financiero=fm.id_estado_movimiento_financiero
  LEFT JOIN public.fin_cuentas_financieras cu ON cu.id_cuenta_financiera=fm.id_cuenta_financiera
  WHERE ep.codigo='CONFIRMADO'
  AND EXISTS (SELECT 1 FROM public.pag_vouchers vou
    JOIN public.cfg_estados_voucher ev ON ev.id_estado_voucher=vou.id_estado_voucher
    WHERE vou.id_pago=p.id_pago AND vou.activo AND ev.codigo='APROBADO')
  AND (v_estado='TODOS'
   OR (v_estado='PENDIENTE' AND fm.id_movimiento IS NULL)
   OR (v_estado='CONCILIADO' AND em.codigo='CONFIRMADO')
   OR (v_estado='REQUIERE_REVISION' AND fm.id_movimiento IS NOT NULL AND em.codigo<>'CONFIRMADO'))
  AND (v_busqueda='' OR p.codigo ILIKE '%'||v_busqueda||'%'
   OR r.codigo ILIKE '%'||v_busqueda||'%'
   OR l.codigo ILIKE '%'||v_busqueda||'%'
   OR coalesce(venta.codigo,'') ILIKE '%'||v_busqueda||'%'
   OR btrim(concat_ws(' ',per.nombres,per.apellido_paterno,per.apellido_materno)) ILIKE '%'||v_busqueda||'%')
  ORDER BY p.id_pago DESC LIMIT v_tamano OFFSET (v_pagina-1)*v_tamano
 ) x;

 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'id_cuenta_financiera',cu.id_cuenta_financiera,'codigo',cu.codigo,
  'nombre',cu.nombre,'moneda',mo.codigo,'tipo',tc.codigo,
  'es_demo',cu.codigo LIKE 'DEMO-%'
 ) ORDER BY cu.codigo),'[]'::jsonb)
 INTO v_cuentas
 FROM public.fin_cuentas_financieras cu
 JOIN public.cfg_monedas mo ON mo.id_moneda=cu.id_moneda
 JOIN public.cfg_tipos_cuenta_financiera tc ON tc.id_tipo_cuenta_financiera=cu.id_tipo_cuenta_financiera
 WHERE cu.activo AND cu.permite_ingresos AND tc.activo;

 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'id_categoria',cat.id_categoria,'codigo',cat.codigo,'nombre',cat.nombre
 ) ORDER BY cat.codigo),'[]'::jsonb)
 INTO v_categorias
 FROM public.fin_categorias cat
 JOIN public.cfg_tipos_movimiento_financiero tipo
   ON tipo.id_tipo_movimiento_financiero=cat.id_tipo_movimiento_financiero
 WHERE cat.activo AND tipo.activo AND tipo.codigo='INGRESO';

 RETURN jsonb_build_object(
  'items',v_items,'total',v_total,'pagina',v_pagina,'tamano',v_tamano,
  'paginas',greatest(1,ceil(v_total::numeric/v_tamano)::integer),
  'cuentas',v_cuentas,'categorias',v_categorias
 );
END;
$function$;

COMMIT;
