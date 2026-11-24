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
 id_venta bigint REFERENCES public.ven_ventas(id_venta),
 id_actor_aplicacion bigint REFERENCES public.seg_usuarios(id_usuario),
 fecha_aplicacion timestamptz,
 CHECK ((id_venta IS NULL AND id_actor_aplicacion IS NULL AND fecha_aplicacion IS NULL) OR (id_venta IS NOT NULL AND id_actor_aplicacion IS NOT NULL AND fecha_aplicacion IS NOT NULL)),
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
 v_existente record; v_item jsonb; v_abono jsonb; v_r record; v_size bigint; v_mime text; v_ext text; v_legacy jsonb;
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
 -- El caso individual de un solo abono conserva exactamente el contrato histórico.
 IF jsonb_array_length(p_lotes)=1 AND jsonb_array_length(p_abonos)=1 THEN
  v_abono:=p_abonos->0;
  v_legacy:=public.sp_crm_registrar_separacion_v2(p_actor,p_prospecto,v_principal,
   (v_abono->>'metodoPago')::varchar,nullif(btrim(v_abono->>'numeroOperacion'),'')::varchar,v_total,p_observaciones,
   (v_abono->>'claveArchivo')::varchar,(v_abono->>'nombreArchivo')::varchar,(v_abono->>'tipoMime')::varchar,
   (v_abono->>'tamanioBytes')::bigint,(v_abono->>'hashSha256')::varchar);
  v_resultado:=jsonb_build_object('success',true,'idGrupo',p_solicitud,'total',v_total,
    'reservas',jsonb_build_array(jsonb_build_object('idReserva',v_legacy->'id_reserva','idLote',v_principal,'monto',v_total)),
    'abonos',jsonb_build_array(jsonb_build_object('idPago',v_legacy->'id_pago','idVoucher',v_legacy->'id_voucher','monto',v_total)));
  -- Solo conserva la solicitud idempotente; no vincula el pago individual a las tablas agrupadas.
  INSERT INTO public.ven_separaciones_grupo_v1(id_grupo,id_prospecto,id_proyecto,id_actor,total,solicitud,resultado)
   VALUES(p_solicitud,p_prospecto,v_proyecto,p_actor,v_total,v_req,v_resultado);
  RETURN v_resultado;
 END IF;
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
    IF v_asignar>0 THEN INSERT INTO public.pag_separaciones_grupo_distribucion_v1(id_pago,id_reserva,monto) VALUES(v_pago,v_r.id_reserva,v_asignar);v_restante:=v_restante-v_asignar; END IF;
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
CREATE FUNCTION public.sp_crm_buscar_separacion_acumulada_v1(p_actor bigint,p_solicitud uuid,p_prospecto bigint,p_lotes jsonb,p_abonos jsonb,p_observaciones text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','public','pg_temp' AS $$
DECLARE r record;
BEGIN
 IF p_actor IS NULL OR p_solicitud IS NULL OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.create'::varchar),false)
 OR NOT coalesce(public.fn_crm_puede_consultar_prospecto(p_actor,p_prospecto),false) THEN RAISE EXCEPTION 'DENEGADO|No autorizado.'; END IF;
 SELECT * INTO r FROM public.ven_separaciones_grupo_v1 WHERE id_grupo=p_solicitud;
 IF NOT FOUND THEN RETURN jsonb_build_object('encontrado',false); END IF;
 IF r.id_actor<>p_actor OR r.solicitud IS DISTINCT FROM jsonb_build_object('prospecto',p_prospecto,'lotes',p_lotes,'abonos',p_abonos,'observaciones',p_observaciones)
 THEN RAISE EXCEPTION 'OPERACION_INVALIDA|Solicitud reutilizada con otros datos.'; END IF;
 RETURN jsonb_build_object('encontrado',true,'resultado',r.resultado);
END; $$;
REVOKE ALL ON FUNCTION public.sp_crm_buscar_separacion_acumulada_v1(bigint,uuid,bigint,jsonb,jsonb,text) FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
GRANT EXECUTE ON FUNCTION public.sp_crm_buscar_separacion_acumulada_v1(bigint,uuid,bigint,jsonb,jsonb,text) TO sigi_app_user;

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


-- Los créditos de reserva no son cobros adicionales. El pago real nunca cambia
-- de propietario ni se duplica para satisfacer una venta por lote.
CREATE FUNCTION public.fn_sep_grupo_credito_reserva_v1(p_reserva bigint,p_venta bigint DEFAULT NULL)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','public','pg_temp' AS $credito$
 SELECT coalesce((
   SELECT gl.monto
   FROM public.ven_separaciones_grupo_lotes_v1 gl
   JOIN public.ven_separaciones_grupo_v1 g USING(id_grupo)
   JOIN public.ven_reservas r USING(id_reserva)
   WHERE gl.id_reserva=p_reserva AND g.estado='VIGENTE'
     AND gl.monto=r.monto_reserva
     AND r.monto_reserva=coalesce((r.politica_financiera_snapshot->>'montoSeparacion')::numeric,r.monto_reserva)
     AND gl.monto=(SELECT coalesce(sum(d.monto),0) FROM public.pag_separaciones_grupo_distribucion_v1 d WHERE d.id_reserva=p_reserva)
     AND NOT EXISTS(
       SELECT 1 FROM public.pag_separaciones_grupo_distribucion_v1 d
       JOIN public.pag_pagos pg USING(id_pago) JOIN public.cfg_estados_pago ep USING(id_estado_pago)
       JOIN public.pag_separaciones_grupo_abonos_v1 a USING(id_pago)
       WHERE d.id_reserva=p_reserva AND (
          a.id_grupo<>gl.id_grupo OR ep.codigo<>'CONFIRMADO' OR pg.id_moneda<>r.id_moneda
          OR pg.id_venta IS NOT NULL OR pg.id_plan_pago IS NOT NULL
          OR (d.id_venta IS NOT NULL AND d.id_venta IS DISTINCT FROM p_venta)
          OR EXISTS(SELECT 1 FROM public.pag_aplicaciones_pago ap WHERE ap.id_pago=pg.id_pago AND ap.activo)
          OR NOT EXISTS(SELECT 1 FROM public.pag_vouchers vo JOIN public.cfg_estados_voucher ev USING(id_estado_voucher)
                        WHERE vo.id_pago=pg.id_pago AND vo.activo AND ev.codigo='APROBADO')
          OR EXISTS(SELECT 1 FROM public.pag_vouchers vo JOIN public.cfg_estados_voucher ev USING(id_estado_voucher)
                        WHERE vo.id_pago=pg.id_pago AND vo.activo AND ev.codigo<>'APROBADO')
       )
     )
 ),0::numeric);
$credito$;
REVOKE ALL ON FUNCTION public.fn_sep_grupo_credito_reserva_v1(bigint,bigint) FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;

CREATE FUNCTION public.fn_sep_credito_venta_confirmado_v1(p_venta bigint,p_reserva bigint)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','public','pg_temp' AS $credito$
 SELECT CASE WHEN EXISTS(SELECT 1 FROM public.ven_separaciones_grupo_lotes_v1 WHERE id_reserva=p_reserva)
 THEN coalesce((SELECT sum(d.monto) FROM public.pag_separaciones_grupo_distribucion_v1 d
    JOIN public.pag_pagos pg USING(id_pago) JOIN public.cfg_estados_pago ep USING(id_estado_pago)
    WHERE d.id_reserva=p_reserva AND d.id_venta=p_venta AND ep.codigo='CONFIRMADO'),0)
 ELSE coalesce((SELECT sum(pg.monto) FROM public.pag_pagos pg JOIN public.cfg_estados_pago ep USING(id_estado_pago)
    WHERE pg.id_reserva=p_reserva AND ep.codigo='CONFIRMADO'),0) END;
$credito$;
REVOKE ALL ON FUNCTION public.fn_sep_credito_venta_confirmado_v1(bigint,bigint) FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;

CREATE FUNCTION public.fn_sep_grupo_pago_aplicado_v1(p_pago bigint)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','public','pg_temp' AS $credito$
 SELECT coalesce(sum(d.monto),0) FROM public.pag_separaciones_grupo_distribucion_v1 d WHERE d.id_pago=p_pago AND d.id_venta IS NOT NULL;
$credito$;
REVOKE ALL ON FUNCTION public.fn_sep_grupo_pago_aplicado_v1(bigint) FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;

CREATE FUNCTION public.sp_crm_aplicar_credito_grupo_v1(p_actor bigint,p_venta bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public','pg_temp' AS $credito$
DECLARE v record;r record;v_plan bigint;v_inicial numeric;v_capital numeric;v_estado_plan text;v_credito numeric;v_nuevo boolean;
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.approve'::varchar),false) THEN RAISE EXCEPTION 'DENEGADO|Se requiere sales.approve.'; END IF;
 SELECT ve.id_reserva,ve.id_lote,ve.id_moneda,ve.precio_venta,mo.codigo modalidad,ev.codigo estado
 INTO v FROM public.ven_ventas ve JOIN public.cfg_modalidades_venta mo USING(id_modalidad_venta) JOIN public.cfg_estados_venta ev USING(id_estado_venta)
 WHERE ve.id_venta=p_venta FOR UPDATE OF ve;
 IF NOT FOUND OR v.estado<>'CONTRATADA' OR NOT EXISTS(SELECT 1 FROM public.ven_contratos c
 JOIN public.cfg_estados_contrato ec USING(id_estado_contrato)
 JOIN public.ven_contratos_aprobaciones a USING(id_contrato)
 WHERE c.id_venta=p_venta AND ec.codigo='VIGENTE' AND a.firma_revisada)
 THEN RAISE EXCEPTION 'VENTA_NO_APTA|Se requiere contrato vigente y firma aprobada.'; END IF;
 SELECT res.id_persona,res.id_moneda,res.monto_reserva,er.codigo estado INTO r
 FROM public.ven_reservas res JOIN public.cfg_estados_reserva er USING(id_estado_reserva)
 WHERE res.id_reserva=v.id_reserva AND res.id_lote=v.id_lote FOR UPDATE OF res;
 IF NOT FOUND OR r.estado<>'CONVERTIDA' OR r.id_moneda<>v.id_moneda OR r.monto_reserva>v.precio_venta
 OR NOT EXISTS(SELECT 1 FROM public.ven_ventas_clientes vc JOIN public.crm_clientes cli USING(id_cliente)
   WHERE vc.id_venta=p_venta AND vc.titular AND cli.id_persona=r.id_persona)
 THEN RAISE EXCEPTION 'SEPARACION_INVALIDA|La reserva no corresponde a la venta o titular.'; END IF;
 -- Un mismo abono puede financiar dos lotes, pero cada distribución se acredita una única vez.
 PERFORM 1 FROM public.pag_separaciones_grupo_distribucion_v1 d WHERE d.id_reserva=v.id_reserva ORDER BY d.id_pago FOR UPDATE;
 v_credito:=public.fn_sep_grupo_credito_reserva_v1(v.id_reserva,p_venta);
 IF v_credito<>r.monto_reserva OR v_credito<=0 THEN RAISE EXCEPTION 'PAGO_NO_APTO|La distribución de la reserva no está confirmada.'; END IF;
 IF v.modalidad='FINANCIADA' THEN
  SELECT pl.id_plan_pago,pl.monto_inicial+pl.monto_reserva_aplicada,pl.capital_financiado,ep.codigo
  INTO v_plan,v_inicial,v_capital,v_estado_plan
  FROM public.pag_planes_pago pl JOIN public.cfg_estados_plan_pago ep USING(id_estado_plan_pago)
  WHERE pl.id_venta=p_venta AND pl.es_vigente FOR UPDATE OF pl;
  IF NOT FOUND OR v_estado_plan<>'ACTIVO' OR v_inicial<v_credito OR v_capital<>v.precio_venta-v_inicial
   OR NOT EXISTS(SELECT 1 FROM public.pag_planes_pago WHERE id_plan_pago=v_plan AND monto_reserva_aplicada=v_credito)
  THEN RAISE EXCEPTION 'INICIAL_INVALIDA|El plan debe conservar el crédito de la reserva.'; END IF;
 ELSIF v.modalidad<>'CONTADO' OR EXISTS(SELECT 1 FROM public.pag_planes_pago WHERE id_venta=p_venta AND es_vigente)
 THEN RAISE EXCEPTION 'MODALIDAD_INVALIDA|Modalidad no soportada.'; END IF;
 UPDATE public.pag_separaciones_grupo_distribucion_v1 SET id_venta=p_venta,id_actor_aplicacion=p_actor,fecha_aplicacion=now()
 WHERE id_reserva=v.id_reserva AND id_venta IS NULL;
 v_nuevo:=FOUND;
 IF public.fn_sep_credito_venta_confirmado_v1(p_venta,v.id_reserva)<>v_credito THEN RAISE EXCEPTION 'PAGO_DUPLICADO|Distribución de venta incompatible.'; END IF;
 IF v_nuevo THEN PERFORM public.sp_registrar_auditoria(p_actor,'CRM'::varchar,'CREDITO_SEPARACION'::varchar,'VENTA'::varchar,p_venta::text::varchar,'EXITOSO'::varchar,'Crédito de separación acumulada'::varchar,jsonb_build_object('idReserva',v.id_reserva,'monto',v_credito)); END IF;
 RETURN jsonb_build_object('success',true,'aplicado',true,'estado',CASE WHEN v_nuevo THEN 'APLICADO' ELSE 'YA_APLICADO' END,'idVenta',p_venta,'idReserva',v.id_reserva,'idPlanPago',v_plan,'modalidad',v.modalidad,'montoAplicado',v_credito,'saldoPendienteVenta',v.precio_venta-v_credito,'saldoPendienteInicial',CASE WHEN v.modalidad='FINANCIADA' THEN v_inicial-v_credito ELSE NULL END,'capitalFinanciado',v_capital);
END; $credito$;
REVOKE ALL ON FUNCTION public.sp_crm_aplicar_credito_grupo_v1(bigint,bigint) FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;

-- Protecciones: la conversión conserva la distribución y los otros lotes.
CREATE FUNCTION public.fn_guardar_reserva_grupo_v1() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public','pg_temp' AS $guard$
DECLARE v_anterior text;v_nuevo text;
BEGIN
 IF NEW.id_estado_reserva IS NOT DISTINCT FROM OLD.id_estado_reserva OR NOT EXISTS(SELECT 1 FROM public.ven_separaciones_grupo_lotes_v1 WHERE id_reserva=OLD.id_reserva) THEN RETURN NEW; END IF;
 SELECT codigo INTO v_anterior FROM public.cfg_estados_reserva WHERE id_estado_reserva=OLD.id_estado_reserva;
 SELECT codigo INTO v_nuevo FROM public.cfg_estados_reserva WHERE id_estado_reserva=NEW.id_estado_reserva;
 IF v_anterior='PENDIENTE' AND v_nuevo='VIGENTE' AND public.fn_sep_grupo_credito_reserva_v1(OLD.id_reserva,NULL)=OLD.monto_reserva THEN RETURN NEW; END IF;
 IF v_anterior='VIGENTE' AND v_nuevo='CONVERTIDA' AND OLD.fecha_vencimiento>now()
 AND public.fn_sep_grupo_credito_reserva_v1(OLD.id_reserva,NULL)=OLD.monto_reserva
 AND EXISTS(SELECT 1 FROM public.ven_ventas v JOIN public.cfg_estados_venta e USING(id_estado_venta) WHERE v.id_reserva=OLD.id_reserva AND v.id_lote=OLD.id_lote AND e.codigo='PENDIENTE') THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'OPERACION_INVALIDA|La reserva agrupada requiere gestión integral.';
END; $guard$;
REVOKE ALL ON FUNCTION public.fn_guardar_reserva_grupo_v1() FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
CREATE TRIGGER trg_reserva_grupo_v1 BEFORE UPDATE OF id_estado_reserva ON public.ven_reservas FOR EACH ROW EXECUTE FUNCTION public.fn_guardar_reserva_grupo_v1();
CREATE FUNCTION public.fn_guardar_venta_reserva_grupo_v1() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public','pg_temp' AS $guard$
DECLARE r record;
BEGIN
 IF TG_OP='UPDATE' THEN
   IF NEW.id_reserva IS NOT DISTINCT FROM OLD.id_reserva AND NEW.id_lote IS NOT DISTINCT FROM OLD.id_lote THEN RETURN NEW; END IF;
   IF EXISTS(SELECT 1 FROM public.ven_separaciones_grupo_lotes_v1 WHERE id_reserva=OLD.id_reserva) THEN RAISE EXCEPTION 'OPERACION_INVALIDA|No se puede reasignar la reserva agrupada.'; END IF;
 END IF;
 SELECT res.id_reserva,res.id_lote,res.id_moneda,res.monto_reserva,res.fecha_vencimiento,e.codigo estado
 INTO r FROM public.ven_separaciones_grupo_lotes_v1 g JOIN public.ven_reservas res USING(id_reserva) JOIN public.cfg_estados_reserva e USING(id_estado_reserva)
 WHERE (res.id_reserva=NEW.id_reserva OR res.id_lote=NEW.id_lote) AND e.codigo IN ('PENDIENTE','VIGENTE') ORDER BY res.id_reserva DESC LIMIT 1;
 IF FOUND AND (NEW.id_reserva IS DISTINCT FROM r.id_reserva OR NEW.id_lote<>r.id_lote OR NEW.id_moneda<>r.id_moneda
 OR r.estado<>'VIGENTE' OR r.fecha_vencimiento<=now() OR public.fn_sep_grupo_credito_reserva_v1(r.id_reserva,NULL)<>r.monto_reserva)
 THEN RAISE EXCEPTION 'RESERVA_INVALIDA|La reserva agrupada debe estar vigente y completamente acreditada.'; END IF;
 RETURN NEW;
END; $guard$;
REVOKE ALL ON FUNCTION public.fn_guardar_venta_reserva_grupo_v1() FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
CREATE TRIGGER trg_venta_reserva_grupo_v1 BEFORE INSERT OR UPDATE OF id_reserva,id_lote ON public.ven_ventas FOR EACH ROW EXECUTE FUNCTION public.fn_guardar_venta_reserva_grupo_v1();
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
 SELECT CASE WHEN EXISTS(SELECT 1 FROM public.ven_separaciones_grupo_lotes_v1 g WHERE g.id_reserva=p_reserva) THEN coalesce((SELECT public.fn_sep_grupo_credito_reserva_v1(r.id_reserva,NULL) FROM public.ven_reservas r JOIN public.cfg_estados_reserva e USING(id_estado_reserva) WHERE r.id_reserva=p_reserva AND e.codigo='VIGENTE' AND r.fecha_vencimiento>now()),0::numeric) ELSE COALESCE((
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

CREATE OR REPLACE FUNCTION public.sp_crm_aplicar_separacion_a_venta_v1(p_actor bigint, p_venta bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v record;
  r record;
  pago record;
  aplic record;
  v_plan bigint;
  v_inicial numeric;
  v_capital numeric;
  v_estado_plan varchar;
  v_tipo varchar;
  v_tipo_id integer;
  v_total integer;
  v_id_aplicacion bigint;
  v_estado_aplicacion text;
BEGIN
  IF p_actor IS NULL OR p_actor<=0 OR p_venta IS NULL OR p_venta<=0 THEN
    RAISE EXCEPTION 'DATOS_INVALIDOS|Actor o venta invalidos.';
  END IF;
  IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.approve'::varchar),false) THEN
    RAISE EXCEPTION 'DENEGADO|Se requiere sales.approve.';
  END IF;

  SELECT ve.id_reserva,ve.id_lote,ve.id_moneda,ve.precio_venta,
         mo.codigo AS modalidad,ev.codigo AS estado_venta
    INTO v
    FROM public.ven_ventas ve
    JOIN public.cfg_modalidades_venta mo ON mo.id_modalidad_venta=ve.id_modalidad_venta
    JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=ve.id_estado_venta
   WHERE ve.id_venta=p_venta
   FOR UPDATE OF ve;

  IF NOT FOUND OR v.estado_venta<>'CONTRATADA'
     OR NOT EXISTS (
       SELECT 1 FROM public.ven_contratos c
       JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=c.id_estado_contrato
       WHERE c.id_venta=p_venta AND ec.codigo='VIGENTE'
         AND EXISTS (
           SELECT 1 FROM public.ven_contratos_aprobaciones a
           WHERE a.id_contrato=c.id_contrato AND a.firma_revisada=true
         )
     ) THEN
    RAISE EXCEPTION 'VENTA_NO_APTA|Se requiere contrato vigente con firma aprobada.';
  END IF;

  IF EXISTS(SELECT 1 FROM public.ven_separaciones_grupo_lotes_v1 WHERE id_reserva=v.id_reserva) THEN
    RETURN public.sp_crm_aplicar_credito_grupo_v1(p_actor,p_venta);
  END IF;
  IF v.id_reserva IS NULL THEN
    RETURN jsonb_build_object('success',true,'aplicado',false,'estado','SIN_SEPARACION',
      'idVenta',p_venta,'montoAplicado',0,'saldoPendienteVenta',v.precio_venta);
  END IF;

  SELECT res.id_persona,res.id_moneda,res.monto_reserva,res.politica_financiera_snapshot,er.codigo AS estado_reserva
    INTO r FROM public.ven_reservas res
    JOIN public.cfg_estados_reserva er ON er.id_estado_reserva=res.id_estado_reserva
   WHERE res.id_reserva=v.id_reserva AND res.id_lote=v.id_lote
   FOR UPDATE OF res;

  IF NOT FOUND OR r.estado_reserva<>'CONVERTIDA'
     OR r.id_moneda<>v.id_moneda OR r.monto_reserva<>coalesce((r.politica_financiera_snapshot->>'montoSeparacion')::numeric,500.00)
     OR v.precio_venta<r.monto_reserva
     OR NOT EXISTS (
       SELECT 1 FROM public.ven_ventas_clientes vc
       JOIN public.crm_clientes cli ON cli.id_cliente=vc.id_cliente
       WHERE vc.id_venta=p_venta AND vc.titular=true AND cli.id_persona=r.id_persona
     ) THEN
    RAISE EXCEPTION 'SEPARACION_INVALIDA|Reserva, titular, moneda o importe incorrectos.';
  END IF;

  IF v.modalidad='FINANCIADA' THEN
    SELECT pl.id_plan_pago,pl.monto_inicial+pl.monto_reserva_aplicada,pl.capital_financiado,ep.codigo
      INTO v_plan,v_inicial,v_capital,v_estado_plan
      FROM public.pag_planes_pago pl
      JOIN public.cfg_estados_plan_pago ep ON ep.id_estado_plan_pago=pl.id_estado_plan_pago
     WHERE pl.id_venta=p_venta AND pl.es_vigente=true
     FOR UPDATE OF pl;
    IF NOT FOUND OR v_estado_plan<>'ACTIVO'
       OR v_inicial<r.monto_reserva
       OR v_capital<>(v.precio_venta-v_inicial) THEN
      RAISE EXCEPTION 'INICIAL_INVALIDA|La inicial debe cubrir el importe pactado de la separación.';
    END IF;
    v_tipo:='INICIAL';
  ELSIF v.modalidad='CONTADO' THEN
    IF EXISTS(SELECT 1 FROM public.pag_planes_pago pl
              WHERE pl.id_venta=p_venta AND pl.es_vigente=true) THEN
      RAISE EXCEPTION 'PLAN_INCONSISTENTE|Venta al contado no admite plan vigente.';
    END IF;
    v_plan:=NULL;
    v_inicial:=NULL;
    v_capital:=NULL;
    v_tipo:='VENTA_CONTADO';
  ELSE
    RAISE EXCEPTION 'MODALIDAD_INVALIDA|Modalidad no soportada.';
  END IF;

  SELECT count(*) INTO v_total
  FROM public.pag_pagos pg
  JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=pg.id_estado_pago
  WHERE pg.id_reserva=v.id_reserva AND ep.codigo<>'ANULADO';

  IF v_total=0 THEN
    RETURN jsonb_build_object('success',true,'aplicado',false,
      'estado','SIN_PAGO_CONFIRMADO','idVenta',p_venta,
      'idReserva',v.id_reserva,'montoAplicado',0,
      'saldoPendienteVenta',v.precio_venta,'saldoPendienteInicial',v_inicial);
  END IF;
  IF v_total<>1 THEN
    RAISE EXCEPTION 'PAGOS_INCONSISTENTES|Separacion con mas de un pago activo.';
  END IF;

  SELECT pg.id_pago,pg.id_venta,pg.id_plan_pago,pg.id_moneda,pg.monto,ep.codigo AS estado_pago
    INTO pago
    FROM public.pag_pagos pg
    JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=pg.id_estado_pago
   WHERE pg.id_reserva=v.id_reserva AND ep.codigo<>'ANULADO'
   FOR UPDATE OF pg;

  IF pago.estado_pago<>'CONFIRMADO' OR pago.monto<>r.monto_reserva
     OR pago.id_moneda<>v.id_moneda
     OR (pago.id_venta IS NOT NULL AND pago.id_venta<>p_venta)
     OR (pago.id_plan_pago IS NOT NULL AND pago.id_plan_pago IS DISTINCT FROM v_plan)
     OR NOT EXISTS (
       SELECT 1 FROM public.pag_vouchers vo
       JOIN public.cfg_estados_voucher e ON e.id_estado_voucher=vo.id_estado_voucher
       WHERE vo.id_pago=pago.id_pago AND vo.activo=true AND e.codigo='APROBADO'
     )
     OR EXISTS (
       SELECT 1 FROM public.pag_vouchers vo
       JOIN public.cfg_estados_voucher e ON e.id_estado_voucher=vo.id_estado_voucher
       WHERE vo.id_pago=pago.id_pago AND vo.activo=true AND e.codigo<>'APROBADO'
     ) THEN
    RAISE EXCEPTION 'PAGO_NO_APTO|Pago o comprobante no conciliados para esta venta.';
  END IF;

  SELECT id_tipo_aplicacion_pago INTO v_tipo_id
    FROM public.cfg_tipos_aplicacion_pago
   WHERE codigo=v_tipo AND activo=true;
  IF v_tipo_id IS NULL THEN
    RAISE EXCEPTION 'CONFIGURACION_INVALIDA|Tipo de aplicacion no configurado.';
  END IF;

  SELECT count(*) INTO v_total
    FROM public.pag_aplicaciones_pago ap
   WHERE ap.id_pago=pago.id_pago AND ap.activo=true;
  IF v_total>1 THEN
    RAISE EXCEPTION 'PAGO_DUPLICADO|Existen multiples aplicaciones activas.';
  END IF;

  SELECT ap.id_aplicacion_pago,ap.monto_aplicado,ap.id_plan_pago,ap.id_cuota,
         t.codigo AS tipo
    INTO aplic
    FROM public.pag_aplicaciones_pago ap
    JOIN public.cfg_tipos_aplicacion_pago t
      ON t.id_tipo_aplicacion_pago=ap.id_tipo_aplicacion_pago
   WHERE ap.id_pago=pago.id_pago AND ap.activo=true
   FOR UPDATE OF ap;

  IF FOUND AND (
       aplic.monto_aplicado<>pago.monto
       OR aplic.id_cuota IS NOT NULL
       OR aplic.tipo NOT IN ('SEPARACION',v_tipo)
       OR (aplic.tipo='SEPARACION' AND aplic.id_plan_pago IS NOT NULL)
       OR (aplic.tipo=v_tipo AND aplic.id_plan_pago IS DISTINCT FROM v_plan)
  ) THEN
    RAISE EXCEPTION 'PAGO_DUPLICADO|Aplicacion previa incompatible con esta venta.';
  END IF;

  -- Vincular la cobranza original, sin crear un segundo pago.
  UPDATE public.pag_pagos
     SET id_venta=p_venta,id_plan_pago=v_plan,fecha_actualizacion=now()
   WHERE id_pago=pago.id_pago
     AND (id_venta IS DISTINCT FROM p_venta OR id_plan_pago IS DISTINCT FROM v_plan);

  IF aplic.id_aplicacion_pago IS NULL THEN
    INSERT INTO public.pag_aplicaciones_pago(
      id_pago,id_tipo_aplicacion_pago,id_plan_pago,id_cuota,monto_aplicado,
      fecha_aplicacion,observaciones,activo,id_usuario_aplicacion
    ) VALUES (
      pago.id_pago,v_tipo_id,v_plan,NULL,pago.monto,now(),
      'Separacion aplicada a venta '||p_venta::text,true,p_actor
    ) RETURNING id_aplicacion_pago INTO v_id_aplicacion;
    v_estado_aplicacion:='APLICADO';
  ELSIF aplic.tipo='SEPARACION' THEN
    UPDATE public.pag_aplicaciones_pago
       SET id_tipo_aplicacion_pago=v_tipo_id,id_plan_pago=v_plan,
           observaciones='Separacion convertida a venta '||p_venta::text,
           fecha_actualizacion=now()
     WHERE id_aplicacion_pago=aplic.id_aplicacion_pago;
    v_id_aplicacion:=aplic.id_aplicacion_pago;
    v_estado_aplicacion:='CONVERTIDO';
  ELSE
    v_id_aplicacion:=aplic.id_aplicacion_pago;
    v_estado_aplicacion:='YA_APLICADO';
  END IF;

  RETURN jsonb_build_object(
    'success',true,'aplicado',true,'estado',v_estado_aplicacion,
    'idVenta',p_venta,'idReserva',v.id_reserva,'idPago',pago.id_pago,
    'idAplicacionPago',v_id_aplicacion,'idPlanPago',v_plan,
    'modalidad',v.modalidad,'montoAplicado',pago.monto,
    'saldoPendienteVenta',v.precio_venta-pago.monto,
    'saldoPendienteInicial',CASE WHEN v.modalidad='FINANCIADA'
      THEN v_inicial-pago.monto ELSE NULL END,
    'capitalFinanciado',v_capital
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_fin_conciliar_cobro_venta_v1(p_actor bigint, p_venta bigint, p_cuenta bigint, p_fecha_operacion date, p_referencia character varying DEFAULT NULL::character varying, p_observaciones character varying DEFAULT NULL::character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
 v_m RECORD; v_comp RECORD; v_rev RECORD; v_cta RECORD;
 v_plan RECORD; v_plan_id BIGINT; v_tipo VARCHAR; v_codigo_categoria VARCHAR; v_metodo VARCHAR;
 v_est_pago INT;v_est_voucher INT;v_est_mov INT;v_categoria BIGINT;
 v_pago BIGINT;v_voucher BIGINT;v_mov BIGINT;v_credito NUMERIC:=0;
 v_ref TEXT:=nullif(btrim(p_referencia),'');
 v_codigo VARCHAR; v_aplicacion JSONB;
BEGIN
 IF p_actor IS NULL OR NOT coalesce(
   public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.view'::varchar),FALSE)
   OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.edit'::varchar),FALSE)
 THEN RAISE EXCEPTION 'DENEGADO|Se requieren permisos de edición de Finanzas.'; END IF;
 IF p_venta IS NULL OR p_venta<=0 OR p_cuenta IS NULL OR p_cuenta<=0
   OR p_fecha_operacion IS NULL OR p_fecha_operacion>(now() AT TIME ZONE 'America/Lima')::date
   OR p_fecha_operacion<DATE '2000-01-01'
   OR length(COALESCE(p_referencia,''))>100
   OR length(COALESCE(p_observaciones,''))>300
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Cuenta, fecha o referencia inválida.'; END IF;

 SELECT m.id_venta,m.id_usuario_registro,m.estado_revision,m.id_metodo_pago,
   m.monto_pendiente_revision,m.tipo_abono,m.numero_operacion,
   v.id_reserva,v.id_moneda,v.precio_venta,v.fecha_venta,
   ev.codigo AS estado_venta,mv.codigo AS modalidad
 INTO v_m
 FROM public.ven_ventas_medios_pago m
 JOIN public.ven_ventas v ON v.id_venta=m.id_venta
 JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=v.id_estado_venta
 JOIN public.cfg_modalidades_venta mv ON mv.id_modalidad_venta=v.id_modalidad_venta
 WHERE m.id_venta=p_venta FOR UPDATE OF m;
 IF NOT FOUND OR v_m.estado_revision<>'APROBADO'
   OR v_m.estado_venta<>'CONTRATADA' OR v_m.monto_pendiente_revision<=0
   OR p_actor=v_m.id_usuario_registro
   OR NOT EXISTS (
     SELECT 1 FROM public.ven_contratos ct
     JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=ct.id_estado_contrato
     WHERE ct.id_venta=p_venta AND ec.codigo='VIGENTE' AND ct.fecha_firma IS NOT NULL
   ) THEN
   RAISE EXCEPTION 'COBRO_NO_APTO|Requiere evidencia aprobada, firma vigente y segregación de funciones.';
 END IF;

 SELECT * INTO v_rev
 FROM public.fin_revisiones_comprobantes_venta_v1 r
 WHERE r.id_venta=p_venta AND r.decision='APROBADO'
 FOR UPDATE;
 IF NOT FOUND OR v_rev.id_pago IS NOT NULL
 THEN RAISE EXCEPTION 'CONCILIACION_DUPLICADA|Revisión inexistente o ya contabilizada.'; END IF;

 SELECT c.* INTO v_comp FROM public.ven_ventas_comprobantes c
 WHERE c.id_venta=p_venta AND c.id_comprobante=v_rev.id_comprobante
 FOR UPDATE;
 IF NOT FOUND OR v_comp.estado_revision<>'APROBADO'
   OR (SELECT COUNT(*) FROM public.ven_ventas_comprobantes WHERE id_venta=p_venta)<>1
   OR NOT EXISTS (
      SELECT 1 FROM storage.objects o
      WHERE o.bucket_id='vouchers-ventas-private' AND o.name=v_comp.clave_archivo
        AND o.archived_at IS NULL AND o.is_delete_marker=FALSE
        AND lower(COALESCE(o.metadata->>'mimetype',''))=v_comp.tipo_mime
        AND COALESCE((o.metadata->>'size')::BIGINT,0)=v_comp.tamanio_bytes
   )
 THEN RAISE EXCEPTION 'COMPROBANTE_NO_APTO|Evidencia aprobada no verificable o múltiple.'; END IF;

 SELECT c.id_cuenta_financiera,c.codigo AS codigo_cuenta,c.id_moneda,
   c.permite_ingresos,c.activo,c.fecha_cierre,t.codigo AS tipo
 INTO v_cta
 FROM public.fin_cuentas_financieras c
 JOIN public.cfg_tipos_cuenta_financiera t ON t.id_tipo_cuenta_financiera=c.id_tipo_cuenta_financiera
 WHERE c.id_cuenta_financiera=p_cuenta
 FOR UPDATE OF c;
 IF NOT FOUND OR NOT v_cta.activo OR NOT v_cta.permite_ingresos
   OR v_cta.fecha_cierre IS NOT NULL OR v_cta.id_moneda<>v_m.id_moneda
   OR v_cta.codigo_cuenta ILIKE 'DEMO-%'
 THEN RAISE EXCEPTION 'CUENTA_NO_APTA|Configure una cuenta receptora real y de la misma moneda.'; END IF;

 SELECT codigo INTO v_metodo FROM public.cfg_metodos_pago WHERE id_metodo_pago=v_m.id_metodo_pago AND activo;
 IF v_metodo IS NULL
   OR (v_metodo IN ('TRANSFERENCIA','DEPOSITO') AND v_cta.tipo<>'BANCO')
   OR (v_metodo='EFECTIVO' AND v_cta.tipo<>'CAJA')
   OR (v_metodo='YAPE_PLIN' AND v_cta.tipo<>'BILLETERA_DIGITAL')
   OR v_metodo='OTRO'
 THEN RAISE EXCEPTION 'METODO_INCOMPATIBLE|El tipo de cuenta no corresponde al medio de cobro.'; END IF;
 IF v_metodo<>'EFECTIVO' AND length(COALESCE(v_ref,''))<4
 THEN RAISE EXCEPTION 'REFERENCIA_OBLIGATORIA|Introduzca referencia bancaria verificada.'; END IF;
 -- Serializa referencias iguales entre operaciones diferentes: hasta tener cobros agrupados,
 -- no atribuir una misma transferencia a ventas múltiples.
 IF v_ref IS NOT NULL THEN
   PERFORM pg_advisory_xact_lock(hashtextextended(
      'FIN_VENTA:'||v_m.id_moneda::text||':'||lower(v_ref),0));
   IF EXISTS (
     SELECT 1 FROM public.pag_pagos p
     JOIN public.cfg_estados_pago e ON e.id_estado_pago=p.id_estado_pago
     WHERE p.id_moneda=v_m.id_moneda AND lower(btrim(COALESCE(p.numero_operacion,'')))=lower(v_ref)
       AND e.codigo='CONFIRMADO'
   ) THEN RAISE EXCEPTION 'REFERENCIA_DUPLICADA|Transferencia ya registrada en otra operación.'; END IF;
 END IF;

 -- Los pagos de separación acreditados son independientes de los nuevos cobros.
 IF v_m.modalidad='CONTADO' AND v_m.tipo_abono='CONTADO' THEN
   IF v_m.id_reserva IS NOT NULL THEN
     v_credito:=public.fn_sep_credito_venta_confirmado_v1(p_venta,v_m.id_reserva);
   END IF;
   IF v_m.monto_pendiente_revision<>ROUND(v_m.precio_venta-v_credito,2)
   THEN RAISE EXCEPTION 'MONTO_INCONSISTENTE|Contado y separación no cuadran.'; END IF;
 ELSIF v_m.modalidad='FINANCIADA' AND v_m.tipo_abono='INICIAL' THEN
   SELECT pp.id_plan_pago,pp.monto_inicial,pp.id_moneda,pp.es_vigente
   INTO v_plan FROM public.pag_planes_pago pp
   WHERE pp.id_venta=p_venta AND pp.es_vigente FOR UPDATE;
   IF NOT FOUND THEN
      RAISE EXCEPTION 'INICIAL_INCONSISTENTE|Plan de financiamiento no encontrado.';
   END IF;
   v_plan_id:=v_plan.id_plan_pago;
   IF NOT v_plan.es_vigente OR v_plan.id_moneda<>v_m.id_moneda
     OR v_plan.monto_inicial<>v_m.monto_pendiente_revision
   THEN RAISE EXCEPTION 'INICIAL_INCONSISTENTE|El plan y la inicial no cuadran.'; END IF;
   IF EXISTS (
     SELECT 1 FROM public.pag_cargas_voucher_inicial_v1 c
     WHERE c.id_venta=p_venta AND c.id_pago IS NOT NULL
   ) OR EXISTS (
     SELECT 1 FROM public.pag_aplicaciones_pago a
     JOIN public.cfg_tipos_aplicacion_pago t ON t.id_tipo_aplicacion_pago=a.id_tipo_aplicacion_pago
     WHERE a.id_plan_pago=v_plan.id_plan_pago AND a.activo AND t.codigo='INICIAL'
   ) THEN RAISE EXCEPTION 'INICIAL_DUPLICADA|Ya hay pagos de inicial por otra vía.'; END IF;
 ELSE
   RAISE EXCEPTION 'MODALIDAD_INCONSISTENTE|Tipo de abono no corresponde con la venta.';
 END IF;

 IF EXISTS (
   SELECT 1 FROM public.pag_pagos p JOIN public.cfg_estados_pago e ON e.id_estado_pago=p.id_estado_pago
   WHERE p.id_venta=p_venta AND p.id_reserva IS NULL AND e.codigo<>'ANULADO'
     AND NOT EXISTS(SELECT 1 FROM public.pag_cargas_voucher_cuota c WHERE c.id_pago=p.id_pago)
 ) THEN
   RAISE EXCEPTION 'PAGO_PREEXISTENTE|Existe cobro no relacionado a cuotas. Conciliar manualmente.';
 END IF;

 v_codigo_categoria:=CASE WHEN v_m.tipo_abono='CONTADO'
   THEN 'INGRESO_VENTA_LOTE' ELSE 'INGRESO_INICIAL_VENTA' END;
 SELECT cat.id_categoria INTO v_categoria FROM public.fin_categorias cat
 JOIN public.cfg_tipos_movimiento_financiero t ON t.id_tipo_movimiento_financiero=cat.id_tipo_movimiento_financiero
 WHERE cat.codigo=v_codigo_categoria AND cat.activo AND t.codigo='INGRESO';
 IF v_categoria IS NULL THEN RAISE EXCEPTION 'CATEGORIA_NO_APTA|Categoría de ingreso inexistente.'; END IF;
 SELECT id_estado_pago INTO STRICT v_est_pago FROM public.cfg_estados_pago WHERE codigo='CONFIRMADO' AND activo;
 SELECT id_estado_voucher INTO STRICT v_est_voucher FROM public.cfg_estados_voucher WHERE codigo='APROBADO' AND activo;
 SELECT id_estado_movimiento_financiero INTO STRICT v_est_mov
   FROM public.cfg_estados_movimiento_financiero WHERE codigo='CONFIRMADO' AND activo;

 v_codigo:='PAG-VTA-'||p_venta;
 INSERT INTO public.pag_pagos(
   id_reserva,id_venta,id_plan_pago,id_estado_pago,id_metodo_pago,id_moneda,
   codigo,monto,fecha_operacion,numero_operacion,observaciones,id_usuario_registro,
   id_usuario_confirmacion,fecha_confirmacion
 ) VALUES(
   NULL,p_venta,v_plan_id,
   v_est_pago,v_m.id_metodo_pago,v_m.id_moneda,
   v_codigo,v_m.monto_pendiente_revision,
   (p_fecha_operacion::TIMESTAMP AT TIME ZONE 'America/Lima'),v_ref,
   left(COALESCE(p_observaciones,'Cobro de venta validado por Finanzas'),255),
   v_m.id_usuario_registro,p_actor,now()
 ) RETURNING id_pago INTO v_pago;

 INSERT INTO public.pag_vouchers(
   id_pago,id_estado_voucher,codigo,numero_version,nombre_archivo_original,
   clave_archivo,tipo_mime,tamanio_bytes,fecha_carga,id_usuario_carga,
   fecha_validacion,id_usuario_validacion,observaciones_validacion,activo
 ) VALUES(
   v_pago,v_est_voucher,'VOU-VTA-'||p_venta,1,v_comp.nombre_archivo,
   v_comp.clave_archivo,v_comp.tipo_mime,v_comp.tamanio_bytes,v_comp.fecha_carga,
   v_m.id_usuario_registro,now(),p_actor,
   'Comprobante original revisado bajo expediente de venta '||p_venta,TRUE
 ) RETURNING id_voucher INTO v_voucher;

 INSERT INTO public.fin_movimientos(
   id_categoria,id_cuenta_financiera,id_estado_movimiento_financiero,id_pago,
   codigo,monto,fecha_movimiento,numero_operacion,concepto,descripcion,
   id_usuario_registro,id_usuario_confirmacion,fecha_confirmacion
 ) VALUES(
   v_categoria,p_cuenta,v_est_mov,v_pago,
   'FIN-VTA-'||p_venta,v_m.monto_pendiente_revision,
   (p_fecha_operacion::TIMESTAMP AT TIME ZONE 'America/Lima'),v_ref,
   CASE WHEN v_m.tipo_abono='INICIAL' THEN 'Inicial de lote ' ELSE 'Venta de lote ' END||p_venta,
   left(COALESCE(p_observaciones,'Conciliación de pago aprobado'),500),
   p_actor,p_actor,now()
 ) RETURNING id_movimiento INTO v_mov;

 IF v_m.tipo_abono='INICIAL' THEN
   v_aplicacion:=public.sp_fin_aplicar_pago_confirmado_v1(
     p_actor,gen_random_uuid(),v_pago,'INICIAL',NULL,
     v_m.monto_pendiente_revision,'Aplicación de inicial aprobada y conciliada');
 END IF;

 UPDATE public.fin_revisiones_comprobantes_venta_v1 SET
   id_pago=v_pago,id_movimiento=v_mov,
   id_usuario_conciliacion=p_actor,fecha_conciliacion=now()
 WHERE id_revision=v_rev.id_revision;

 RETURN jsonb_build_object('estado','CONCILIADO','idVenta',p_venta,
   'idPago',v_pago,'idVoucher',v_voucher,'idMovimiento',v_mov,
   'idAplicacionInicial',v_aplicacion->'idAplicacion','monto',v_m.monto_pendiente_revision,
   'codigoCategoria',v_codigo_categoria);
END $function$;

CREATE OR REPLACE FUNCTION public.sp_fin_conciliar_desglose_venta_v1(p_actor bigint, p_desglose bigint, p_cuenta bigint, p_fecha date, p_observaciones character varying DEFAULT NULL::character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
 v_d RECORD;v_m RECORD;v_doc RECORD;v_cuenta RECORD;v_plan RECORD;
 v_plan_id BIGINT;v_ref TEXT;v_metodo VARCHAR;v_categoria BIGINT;
 v_est_pago INT;v_est_voucher INT;v_est_mov INT;
 v_pago BIGINT;v_voucher BIGINT;v_mov BIGINT;v_aplicacion JSONB;
 v_codigo_categoria VARCHAR;v_saldo INTEGER;v_count INTEGER;
 v_reserva NUMERIC:=0;v_inicial NUMERIC:=0;
BEGIN
 IF p_actor IS NULL
   OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.view'::varchar),FALSE)
   OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.edit'::varchar),FALSE)
 THEN RAISE EXCEPTION 'DENEGADO|Se requiere finance.edit para conciliar.'; END IF;
 IF p_desglose IS NULL OR p_desglose<=0 OR p_cuenta IS NULL OR p_cuenta<=0
   OR p_fecha IS NULL OR p_fecha<DATE '2000-01-01'
   OR p_fecha>(now() AT TIME ZONE 'America/Lima')::DATE
   OR length(coalesce(p_observaciones,''))>300
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Fecha o cuenta receptora inválidas.'; END IF;

 -- Mantener el mismo orden de bloqueos que el procedimiento de desglose.
 SELECT d.id_venta INTO v_d FROM public.fin_ventas_desglose_comprobantes_v1 d
 WHERE d.id_desglose=p_desglose;
 IF NOT FOUND THEN RAISE EXCEPTION 'DESGLOSE_NO_APTO|Comprobante no disponible.'; END IF;
 SELECT m.id_venta,m.id_usuario_registro,m.estado_revision,m.id_metodo_pago,
    m.monto_pendiente_revision,m.tipo_abono,
    v.id_reserva,v.id_moneda,v.precio_venta,ev.codigo AS estado_venta,
    mv.codigo AS modalidad
 INTO v_m FROM public.ven_ventas_medios_pago m
 JOIN public.ven_ventas v ON v.id_venta=m.id_venta
 JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=v.id_estado_venta
 JOIN public.cfg_modalidades_venta mv ON mv.id_modalidad_venta=v.id_modalidad_venta
 WHERE m.id_venta=v_d.id_venta FOR UPDATE OF m;
 IF NOT FOUND OR v_m.estado_revision<>'PENDIENTE'
   OR v_m.estado_venta<>'CONTRATADA'
   OR p_actor=v_m.id_usuario_registro
   OR NOT EXISTS(
      SELECT 1 FROM public.ven_contratos ct
      JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=ct.id_estado_contrato
      WHERE ct.id_venta=v_m.id_venta AND ec.codigo='VIGENTE' AND ct.fecha_firma IS NOT NULL)
 THEN RAISE EXCEPTION 'VENTA_NO_APTA|Requiere venta contratada y revisión aprobada.'; END IF;
 SELECT d.* INTO v_d FROM public.fin_ventas_desglose_comprobantes_v1 d
 WHERE d.id_desglose=p_desglose AND d.id_venta=v_m.id_venta FOR UPDATE;
 IF NOT FOUND OR v_d.estado<>'APROBADO' OR v_d.id_pago IS NOT NULL
 THEN RAISE EXCEPTION 'DESGLOSE_NO_APTO|Soporte sin aprobar, ya conciliado o no disponible.'; END IF;
 IF EXISTS(
   SELECT 1 FROM public.fin_ventas_desglose_comprobantes_v1 d
   WHERE d.id_venta=v_m.id_venta AND d.estado='OBSERVADO')
 THEN RAISE EXCEPTION 'DESGLOSE_OBSERVADO|Resuelva los soportes observados antes de conciliar.'; END IF;
 IF (SELECT count(*) FROM public.ven_ventas_comprobantes c WHERE c.id_venta=v_m.id_venta)
      <>(SELECT count(*) FROM public.fin_ventas_desglose_comprobantes_v1 d WHERE d.id_venta=v_m.id_venta)
   OR (SELECT sum(d.monto) FROM public.fin_ventas_desglose_comprobantes_v1 d
       WHERE d.id_venta=v_m.id_venta)<>v_m.monto_pendiente_revision
 THEN RAISE EXCEPTION 'DESGLOSE_INCOMPLETO|La distribución no cubre todos los comprobantes o el total.'; END IF;
 SELECT c.* INTO v_doc FROM public.ven_ventas_comprobantes c
 WHERE c.id_comprobante=v_d.id_comprobante AND c.id_venta=v_d.id_venta FOR UPDATE;
 IF NOT FOUND OR v_doc.estado_revision<>'APROBADO'
 OR NOT EXISTS(
   SELECT 1 FROM storage.objects o
   WHERE o.bucket_id='vouchers-ventas-private' AND o.name=v_doc.clave_archivo
     AND o.archived_at IS NULL AND o.is_delete_marker=FALSE
     AND lower(coalesce(o.metadata->>'mimetype',''))=v_doc.tipo_mime
     AND coalesce((o.metadata->>'size')::BIGINT,0)=v_doc.tamanio_bytes
 )
 THEN RAISE EXCEPTION 'ARCHIVO_NO_VERIFICABLE|El archivo aprobado no está disponible.'; END IF;

 SELECT c.id_cuenta_financiera,c.codigo,c.id_moneda,c.permite_ingresos,
   c.activo,c.fecha_cierre,t.codigo AS tipo
 INTO v_cuenta
 FROM public.fin_cuentas_financieras c
 JOIN public.cfg_tipos_cuenta_financiera t ON t.id_tipo_cuenta_financiera=c.id_tipo_cuenta_financiera
 WHERE c.id_cuenta_financiera=p_cuenta FOR UPDATE OF c;
 IF NOT FOUND OR NOT v_cuenta.activo OR NOT v_cuenta.permite_ingresos
   OR v_cuenta.fecha_cierre IS NOT NULL OR v_cuenta.codigo ILIKE 'DEMO-%'
   OR v_cuenta.id_moneda<>v_m.id_moneda
 THEN RAISE EXCEPTION 'CUENTA_NO_APTA|Elija una cuenta receptora real y en la moneda correcta.'; END IF;
 SELECT codigo INTO v_metodo FROM public.cfg_metodos_pago
 WHERE id_metodo_pago=v_m.id_metodo_pago AND activo;
 IF v_metodo NOT IN('TRANSFERENCIA','DEPOSITO','YAPE_PLIN','EFECTIVO')
   OR (v_metodo IN('TRANSFERENCIA','DEPOSITO') AND v_cuenta.tipo<>'BANCO')
   OR (v_metodo='YAPE_PLIN' AND v_cuenta.tipo<>'BILLETERA_DIGITAL')
   OR (v_metodo='EFECTIVO' AND v_cuenta.tipo<>'CAJA')
 THEN RAISE EXCEPTION 'METODO_INCOMPATIBLE|Medio de pago incompatible con la cuenta.'; END IF;
 v_ref:=NULLIF(btrim(v_d.numero_operacion),'');
 IF v_metodo<>'EFECTIVO' AND length(coalesce(v_ref,''))<4
 THEN RAISE EXCEPTION 'REFERENCIA_OBLIGATORIA|No se identificó el abono bancario.'; END IF;
 IF v_ref IS NOT NULL THEN
   PERFORM pg_advisory_xact_lock(hashtextextended(
     'FIN_VENTA:'||v_m.id_moneda::TEXT||':'||lower(v_ref),0));
   IF EXISTS(
     SELECT 1 FROM public.pag_pagos p JOIN public.cfg_estados_pago ep USING(id_estado_pago)
     WHERE p.id_moneda=v_m.id_moneda AND ep.codigo='CONFIRMADO'
       AND lower(btrim(coalesce(p.numero_operacion,'')))=lower(v_ref)
   ) THEN RAISE EXCEPTION 'REFERENCIA_DUPLICADA|Abono ya registrado en una operación.'; END IF;
 END IF;

 IF v_m.modalidad='CONTADO' AND v_m.tipo_abono='CONTADO' THEN
   IF v_m.id_reserva IS NOT NULL THEN
     v_reserva:=public.fn_sep_credito_venta_confirmado_v1(v_m.id_venta,v_m.id_reserva);
   END IF;
   IF v_m.monto_pendiente_revision<>round(v_m.precio_venta-v_reserva,2)
   THEN RAISE EXCEPTION 'MONTO_INCONSISTENTE|El saldo al contado no cuadra con la separación.'; END IF;
 ELSIF v_m.modalidad='FINANCIADA' AND v_m.tipo_abono='INICIAL' THEN
   SELECT pp.id_plan_pago,pp.monto_inicial,pp.id_moneda,pp.es_vigente,e.codigo AS estado_plan
   INTO v_plan FROM public.pag_planes_pago pp
   JOIN public.cfg_estados_plan_pago e ON e.id_estado_plan_pago=pp.id_estado_plan_pago
   WHERE pp.id_venta=v_m.id_venta AND pp.es_vigente FOR UPDATE OF pp;
   IF NOT FOUND OR NOT v_plan.es_vigente OR v_plan.estado_plan<>'ACTIVO'
     OR v_plan.id_moneda<>v_m.id_moneda
     OR v_plan.monto_inicial<>v_m.monto_pendiente_revision
   THEN RAISE EXCEPTION 'INICIAL_INCONSISTENTE|El cronograma no coincide con la inicial.'; END IF;
   v_plan_id:=v_plan.id_plan_pago;
   -- Nunca utilizar abonos de otras vías como si fueran parte de esta distribución.
   IF EXISTS(
     SELECT 1 FROM public.pag_aplicaciones_pago a
     JOIN public.cfg_tipos_aplicacion_pago t ON t.id_tipo_aplicacion_pago=a.id_tipo_aplicacion_pago
     WHERE a.id_plan_pago=v_plan_id AND a.activo AND t.codigo='INICIAL'
       AND NOT EXISTS(
         SELECT 1 FROM public.fin_ventas_desglose_comprobantes_v1 d
         WHERE d.id_pago=a.id_pago AND d.id_venta=v_m.id_venta AND d.estado='CONCILIADO')
   ) THEN RAISE EXCEPTION 'INICIAL_PREEXISTENTE|Otra vía ya registró una inicial: conciliar manualmente.'; END IF;
 ELSE RAISE EXCEPTION 'MODALIDAD_INCONSISTENTE|El comprobante no coincide con modalidad de venta.'; END IF;

 IF EXISTS(
   SELECT 1 FROM public.pag_pagos p
   JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago
   WHERE p.id_venta=v_m.id_venta AND p.id_reserva IS NULL AND ep.codigo<>'ANULADO'
     AND NOT EXISTS(SELECT 1 FROM public.pag_cargas_voucher_cuota c WHERE c.id_pago=p.id_pago)
     AND NOT EXISTS(SELECT 1 FROM public.fin_ventas_desglose_comprobantes_v1 d
       WHERE d.id_pago=p.id_pago AND d.id_venta=v_m.id_venta AND d.estado='CONCILIADO')
 ) THEN RAISE EXCEPTION 'PAGO_PREEXISTENTE|Existe un abono adicional no conciliado con el desglose.'; END IF;

 v_codigo_categoria:=CASE WHEN v_m.tipo_abono='INICIAL'
   THEN 'INGRESO_INICIAL_VENTA' ELSE 'INGRESO_VENTA_LOTE' END;
 SELECT cat.id_categoria INTO v_categoria FROM public.fin_categorias cat
 JOIN public.cfg_tipos_movimiento_financiero t ON t.id_tipo_movimiento_financiero=cat.id_tipo_movimiento_financiero
 WHERE cat.codigo=v_codigo_categoria AND cat.activo AND t.codigo='INGRESO';
 IF v_categoria IS NULL THEN RAISE EXCEPTION 'CATEGORIA_NO_APTA|No existe categoría contable adecuada.'; END IF;
 SELECT id_estado_pago INTO STRICT v_est_pago FROM public.cfg_estados_pago
 WHERE codigo='CONFIRMADO' AND activo;
 SELECT id_estado_voucher INTO STRICT v_est_voucher FROM public.cfg_estados_voucher
 WHERE codigo='APROBADO' AND activo;
 SELECT id_estado_movimiento_financiero INTO STRICT v_est_mov FROM public.cfg_estados_movimiento_financiero
 WHERE codigo='CONFIRMADO' AND activo;

 INSERT INTO public.pag_pagos(
   id_reserva,id_venta,id_plan_pago,id_estado_pago,id_metodo_pago,id_moneda,
   codigo,monto,fecha_operacion,numero_operacion,observaciones,id_usuario_registro,
   id_usuario_confirmacion,fecha_confirmacion
 ) VALUES(
   NULL,v_m.id_venta,v_plan_id,v_est_pago,v_m.id_metodo_pago,v_m.id_moneda,
   'PAG-VTD-'||v_d.id_desglose,v_d.monto,
   p_fecha::TIMESTAMP AT TIME ZONE 'America/Lima',v_ref,
   left(coalesce(p_observaciones,'Conciliación del comprobante de venta'),255),
   v_m.id_usuario_registro,p_actor,now()
 ) RETURNING id_pago INTO v_pago;

 INSERT INTO public.pag_vouchers(
   id_pago,id_estado_voucher,codigo,numero_version,nombre_archivo_original,
   clave_archivo,tipo_mime,tamanio_bytes,fecha_carga,id_usuario_carga,
   fecha_validacion,id_usuario_validacion,observaciones_validacion,activo
 ) VALUES(
   v_pago,v_est_voucher,'VOU-VTD-'||v_d.id_desglose,1,v_doc.nombre_archivo,
   v_doc.clave_archivo,v_doc.tipo_mime,v_doc.tamanio_bytes,v_doc.fecha_carga,
   v_m.id_usuario_registro,now(),p_actor,
   'Evidencia individual revisada del desglose de venta',TRUE
 ) RETURNING id_voucher INTO v_voucher;

 INSERT INTO public.fin_movimientos(
   id_categoria,id_cuenta_financiera,id_estado_movimiento_financiero,id_pago,
   codigo,monto,fecha_movimiento,numero_operacion,concepto,descripcion,
   id_usuario_registro,id_usuario_confirmacion,fecha_confirmacion
 ) VALUES(
   v_categoria,p_cuenta,v_est_mov,v_pago,
   'FIN-VTD-'||v_d.id_desglose,v_d.monto,
   p_fecha::TIMESTAMP AT TIME ZONE 'America/Lima',v_ref,
   CASE WHEN v_m.tipo_abono='INICIAL' THEN 'Inicial de venta ' ELSE 'Cobro de venta ' END||v_m.id_venta,
   left(coalesce(p_observaciones,'Conciliación bancaria por evidencia'),500),
   p_actor,p_actor,now()
 ) RETURNING id_movimiento INTO v_mov;

 IF v_m.tipo_abono='INICIAL' THEN
   v_aplicacion:=public.sp_fin_aplicar_pago_confirmado_v1(
     p_actor,gen_random_uuid(),v_pago,'INICIAL',NULL,v_d.monto,
     'Inicial conciliada por comprobante individual');
 END IF;

 UPDATE public.fin_ventas_desglose_comprobantes_v1 SET
   estado='CONCILIADO',id_pago=v_pago,id_movimiento=v_mov,
   id_cuenta_financiera=p_cuenta,id_conciliador=p_actor,fecha_conciliacion=now()
 WHERE id_desglose=v_d.id_desglose;
 INSERT INTO public.fin_ventas_desglose_eventos_v1(
   id_venta,id_comprobante,id_actor,accion,datos
 ) VALUES(v_d.id_venta,v_d.id_comprobante,p_actor,'CONCILIAR_EVIDENCIA',
   jsonb_build_object('idDesglose',v_d.id_desglose,'idPago',v_pago,'idMovimiento',v_mov,
    'monto',v_d.monto,'numeroOperacion',v_ref,'idCuenta',p_cuenta));

 SELECT count(*) INTO v_count
 FROM public.fin_ventas_desglose_comprobantes_v1
 WHERE id_venta=v_m.id_venta AND estado<>'CONCILIADO';
 IF v_count=0 THEN
   UPDATE public.ven_ventas_medios_pago SET estado_revision='APROBADO'
     WHERE id_venta=v_m.id_venta;
 END IF;
 RETURN jsonb_build_object(
   'estado','CONCILIADO','idVenta',v_d.id_venta,'idDesglose',v_d.id_desglose,
   'idPago',v_pago,'idVoucher',v_voucher,'idMovimiento',v_mov,
   'idAplicacionInicial',v_aplicacion->'idAplicacion','monto',v_d.monto,
   'comprobantesRestantes',v_count,'dineroConfirmado',TRUE
 );
END $function$;

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
      WHERE e.codigo IN('PENDIENTE','VIGENTE') AND r.fecha_vencimiento <= now()
      ORDER BY r.fecha_vencimiento,r.id_reserva LIMIT 100
    ) x
  ),'[]'::jsonb),
  'soloConsulta',true
 );
END $function$;

CREATE OR REPLACE FUNCTION public.sp_fin_conciliacion_integral_v1(p_actor bigint, p_estado character varying DEFAULT 'TODOS'::character varying, p_busqueda character varying DEFAULT NULL::character varying, p_pagina integer DEFAULT 1, p_tamano integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
 v_estado varchar:=coalesce(nullif(btrim(p_estado),''),'TODOS');
 v_busqueda varchar:=coalesce(nullif(btrim(p_busqueda),''),'');
 v_items jsonb:='[]'::jsonb;
 v_recuento integer:=0;
 v_alertas integer:=0;
 v_monto_sin_aplicar numeric:=0;
 v_total_confirmado numeric:=0;
 v_huerfanos integer:=0;
 v_planes jsonb:='[]'::jsonb;
BEGIN
 IF p_actor IS NULL OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(
    p_actor,'finance.view'::varchar),false)
 THEN RAISE EXCEPTION 'DENEGADO|Se requiere finance.view.'; END IF;
 IF v_estado NOT IN('TODOS','CON_ALERTA','SIN_ALERTA')
    OR p_pagina IS NULL OR p_pagina NOT BETWEEN 1 AND 10000
    OR p_tamano IS NULL OR p_tamano NOT BETWEEN 1 AND 100
    OR length(v_busqueda)>120
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Filtros de conciliación inválidos.'; END IF;

 WITH pagos AS (
  SELECT p.id_pago,p.codigo AS codigo_pago,p.id_venta,p.id_plan_pago,
   p.id_reserva,p.monto,p.fecha_operacion,
   e.codigo AS estado_pago,
   coalesce((SELECT sum(a.monto_aplicado)
     FROM public.pag_aplicaciones_pago a WHERE a.id_pago=p.id_pago AND a.activo),0)+public.fn_sep_grupo_pago_aplicado_v1(p.id_pago) aplicado,
   coalesce((SELECT count(*) FROM public.pag_aplicaciones_pago a
     WHERE a.id_pago=p.id_pago AND a.activo),0) n_aplicaciones,
   v.id_voucher,v.codigo AS codigo_voucher,ev.codigo AS estado_voucher,
   v.clave_archivo,v.tipo_mime,v.tamanio_bytes,
   -- Comprobación documental, sin exponer rutas ni URL de Storage.
   EXISTS(
    SELECT 1 FROM storage.objects o
    WHERE o.bucket_id=CASE
       WHEN v.clave_archivo LIKE 'separaciones/%' THEN 'vouchers-separacion-private'
       WHEN v.clave_archivo LIKE 'ventas/%' THEN 'vouchers-ventas-private'
       ELSE 'NO_RECONOCIDO' END
      AND o.name=v.clave_archivo
      AND o.archived_at IS NULL AND o.is_delete_marker=false
      AND lower(coalesce(o.metadata->>'mimetype',''))=v.tipo_mime
      AND coalesce((o.metadata->>'size')::bigint,0)=v.tamanio_bytes
      AND coalesce(v.tamanio_bytes,0) BETWEEN 1 AND 5242880
   ) archivo_disponible,
   CASE WHEN p.id_reserva IS NOT NULL THEN 'SEPARACION'
        WHEN EXISTS(SELECT 1 FROM public.pag_cargas_voucher_cuota cc WHERE cc.id_pago=p.id_pago)
           THEN 'CUOTA'
        WHEN EXISTS(SELECT 1 FROM public.pag_aplicaciones_pago a
         JOIN public.cfg_tipos_aplicacion_pago ta ON ta.id_tipo_aplicacion_pago=a.id_tipo_aplicacion_pago
         WHERE a.id_pago=p.id_pago AND ta.codigo='CUOTA') THEN 'CUOTA'
        WHEN p.id_plan_pago IS NOT NULL THEN 'INICIAL'
        ELSE 'SIN_DESTINO' END AS concepto
  FROM public.pag_pagos p
  JOIN public.cfg_estados_pago e ON e.id_estado_pago=p.id_estado_pago
  LEFT JOIN LATERAL (
    SELECT x.* FROM public.pag_vouchers x
    WHERE x.id_pago=p.id_pago AND x.activo
    ORDER BY x.numero_version DESC,x.id_voucher DESC LIMIT 1
  ) v ON true
  LEFT JOIN public.cfg_estados_voucher ev ON ev.id_estado_voucher=v.id_estado_voucher
 ), categorizados AS (
  SELECT p.*,
   greatest(0,p.monto-p.aplicado) AS saldo_no_aplicado,
   CASE
    WHEN p.aplicado>p.monto THEN 'SOBREAPLICACION'
    WHEN p.estado_pago<>'CONFIRMADO' AND p.aplicado>0 THEN 'APLICACION_NO_CONFIRMADA'
    WHEN p.estado_pago='CONFIRMADO' AND p.estado_voucher IS DISTINCT FROM 'APROBADO'
      THEN 'CONFIRMADO_SIN_VOUCHER_APROBADO'
    WHEN p.estado_pago='REGISTRADO' AND p.estado_voucher='PENDIENTE'
      THEN 'PENDIENTE_DE_REVISION'
    WHEN p.id_voucher IS NULL THEN 'PAGO_SIN_VOUCHER'
    WHEN p.estado_pago='CONFIRMADO' AND NOT p.archivo_disponible
      THEN 'EVIDENCIA_HISTORICA_NO_VERIFICABLE'
    WHEN p.estado_pago='CONFIRMADO' AND p.monto>p.aplicado
      THEN 'PAGO_CONFIRMADO_SIN_IMPUTAR'
    ELSE 'SIN_ALERTA'
   END AS codigo_incidencia
  FROM pagos p
 ), enriched AS (
  SELECT p.*,r.estado estado_revision,r.comentario comentario_revision,
     r.id_usuario revisor,r.fecha_revision,
     (p.codigo_incidencia<>'SIN_ALERTA') tiene_alerta
  FROM categorizados p
  LEFT JOIN public.pag_conciliacion_revisiones_v1 r
    ON r.id_pago=p.id_pago AND r.codigo_incidencia=p.codigo_incidencia
 ), filtrados AS (
  SELECT * FROM enriched
  WHERE (v_estado='TODOS'
     OR (v_estado='CON_ALERTA' AND tiene_alerta)
     OR (v_estado='SIN_ALERTA' AND NOT tiene_alerta))
    AND (v_busqueda='' OR codigo_pago ILIKE '%'||v_busqueda||'%'
      OR coalesce(codigo_voucher,'') ILIKE '%'||v_busqueda||'%'
      OR id_pago::text=v_busqueda)
 )
 SELECT count(*)::integer,
   count(*) FILTER (WHERE tiene_alerta)::integer,
   coalesce(sum(saldo_no_aplicado)
       FILTER(WHERE estado_pago='CONFIRMADO'),0),
   coalesce(sum(monto) FILTER(WHERE estado_pago='CONFIRMADO'),0),
   coalesce(jsonb_agg(to_jsonb(t) - 'clave_archivo' - 'tipo_mime'
     - 'tamanio_bytes'
      ORDER BY t.id_pago DESC),'[]'::jsonb)
 INTO v_recuento,v_alertas,v_monto_sin_aplicar,v_total_confirmado,v_items
 FROM (
    SELECT * FROM filtrados ORDER BY id_pago DESC
 ) t;
 -- La cantidad y los filtros se calculan ANTES de paginar.
 SELECT coalesce(jsonb_agg(value ORDER BY ord),'[]'::jsonb)
 INTO v_items
 FROM jsonb_array_elements(v_items) WITH ORDINALITY AS e(value,ord)
 WHERE ord>(p_pagina-1)*p_tamano AND ord<=p_pagina*p_tamano;

 -- Totales globales del estado (no solo de la página).
 WITH montos AS (
  SELECT e.codigo estado_pago,p.monto,
   coalesce((SELECT sum(a.monto_aplicado) FROM public.pag_aplicaciones_pago a
    WHERE a.id_pago=p.id_pago AND a.activo),0)+public.fn_sep_grupo_pago_aplicado_v1(p.id_pago) aplicado
  FROM public.pag_pagos p JOIN public.cfg_estados_pago e USING(id_estado_pago)
 )
 SELECT coalesce(sum(greatest(0,monto-aplicado))
    FILTER(WHERE estado_pago='CONFIRMADO'),0),
    coalesce(sum(monto) FILTER(WHERE estado_pago='CONFIRMADO'),0)
 INTO v_monto_sin_aplicar,v_total_confirmado FROM montos;

 -- Candidatos a limpieza solo si son carga de cuota expirada, no
 -- registrada y su archivo no existe. No se borran archivos ni filas.
 SELECT count(*) INTO v_huerfanos
 FROM public.pag_cargas_voucher_cuota c
 WHERE c.id_pago IS NULL AND c.expira_en<now()-interval '7 days'
   AND NOT EXISTS(SELECT 1 FROM storage.objects o
     WHERE o.bucket_id='vouchers-ventas-private' AND o.name=c.clave_archivo);

 -- Diferencias históricas de cronograma: reportar, jamás recalcular.
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'idPlanPago',d.id_plan_pago,'idVenta',d.id_venta,
   'estadoPlan',d.estado_plan,'numeroCuotas',d.cuotas,
   'numeroCuotasPactadas',d.numero_cuotas,
   'importeCuotas',d.importe_cuotas,'totalFinanciado',d.total_financiado,
   'diferencia',d.total_financiado-d.importe_cuotas)
   ORDER BY d.id_plan_pago),'[]'::jsonb)
 INTO v_planes
 FROM (
   SELECT pp.id_plan_pago,pp.id_venta,ep.codigo estado_plan,
    pp.numero_cuotas,count(c.id_cuota)::integer cuotas,
    coalesce(sum(c.monto_cuota),0) importe_cuotas,
    coalesce(pp.monto_total_financiado,
      pp.capital_financiado+coalesce(pp.monto_interes_total,0)) total_financiado
   FROM public.pag_planes_pago pp
   JOIN public.cfg_estados_plan_pago ep ON ep.id_estado_plan_pago=pp.id_estado_plan_pago
   LEFT JOIN public.pag_cuotas c ON c.id_plan_pago=pp.id_plan_pago
   GROUP BY pp.id_plan_pago,ep.codigo
   HAVING count(c.id_cuota)>0 AND
     (count(c.id_cuota)<>pp.numero_cuotas OR
       sum(c.monto_cuota) IS DISTINCT FROM
       coalesce(pp.monto_total_financiado,
         pp.capital_financiado+coalesce(pp.monto_interes_total,0)))
 ) d;
 RETURN jsonb_build_object('items',v_items,'total',v_recuento,
    'pagina',p_pagina,'tamano',p_tamano,
    'paginas',greatest(1,ceil(v_recuento::numeric/p_tamano)::integer),
    'alertasPagina',
    (SELECT count(*) FROM jsonb_array_elements(v_items) e
       WHERE (e->>'tiene_alerta')::boolean),
    'alertasFiltradas',v_alertas,'montoConfirmado',v_total_confirmado,
    'confirmadoSinAplicar',v_monto_sin_aplicar,
    'cargasHuerfanasSinArchivoCandidatas',v_huerfanos,
    'planesConDiferenciasHistoricas',v_planes,
    'advertencia','La conciliación no altera pagos, cuotas, reservas ni historial. REVISADA no significa RESUELTA.');
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_fin_movimientos_backoffice_v1(p_actor bigint, p_busqueda text DEFAULT ''::text, p_pagina integer DEFAULT 1, p_tamano integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
 v_items jsonb;
 v_total integer;
 v_confirmado numeric;
 v_registrado numeric;
 v_anulado numeric;
 v_aplicado numeric;
 v_no_imputado numeric;
 v_meses jsonb;
 v_filtro text:=lower(btrim(coalesce(p_busqueda,'')));
BEGIN
 IF p_actor IS NULL OR p_actor<=0
   OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.view'::varchar),false)
 THEN RAISE EXCEPTION 'ACCESO_DENEGADO|Requiere finance.view.'; END IF;
 IF length(v_filtro)>120 OR p_pagina IS NULL OR p_pagina NOT BETWEEN 1 AND 100000
   OR p_tamano IS NULL OR p_tamano NOT BETWEEN 1 AND 100
 THEN RAISE EXCEPTION 'FILTROS_INVALIDOS|Filtros de movimientos invalidos.'; END IF;

 SELECT count(*)::integer,
   coalesce(sum(p.monto) FILTER(WHERE ep.codigo='CONFIRMADO'),0),
   coalesce(sum(p.monto) FILTER(WHERE ep.codigo='REGISTRADO'),0),
   coalesce(sum(p.monto) FILTER(WHERE ep.codigo='ANULADO'),0)
 INTO v_total,v_confirmado,v_registrado,v_anulado
 FROM public.pag_pagos p JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago
 LEFT JOIN public.ven_ventas v ON v.id_venta=p.id_venta
 WHERE v_filtro='' OR lower(concat_ws(' ',p.codigo,p.numero_operacion,ep.codigo,v.codigo)) LIKE '%'||v_filtro||'%';

 SELECT coalesce(sum(a.monto_aplicado),0) INTO v_aplicado
 FROM public.pag_aplicaciones_pago a
 JOIN public.pag_pagos p ON p.id_pago=a.id_pago
 JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago
 WHERE a.activo AND ep.codigo='CONFIRMADO';
 SELECT v_aplicado+coalesce(sum(public.fn_sep_grupo_pago_aplicado_v1(p.id_pago)),0) INTO v_aplicado FROM public.pag_pagos p JOIN public.cfg_estados_pago ep USING(id_estado_pago) WHERE ep.codigo='CONFIRMADO';

 -- Los pagos de separacion no generan por si mismos aplicaciones a cuotas.
 SELECT coalesce(sum(greatest(p.monto - coalesce(x.aplicado,0)-public.fn_sep_grupo_pago_aplicado_v1(p.id_pago),0)),0)
 INTO v_no_imputado
 FROM public.pag_pagos p
 JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago AND ep.codigo='CONFIRMADO'
 LEFT JOIN LATERAL (SELECT sum(a.monto_aplicado) AS aplicado
   FROM public.pag_aplicaciones_pago a WHERE a.id_pago=p.id_pago AND a.activo) x ON true
 WHERE p.id_plan_pago IS NOT NULL;

 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'idPago',r.id_pago,'codigo',r.codigo,'fechaOperacion',r.fecha_operacion,
   'fechaConfirmacion',r.fecha_confirmacion,'monto',r.monto,'estado',r.estado,
   'tipo',r.tipo,'venta',r.venta,'referencia',r.referencia,
   'comprobante',r.comprobante,'estadoVoucher',r.estado_voucher,
   'montoAplicado',r.aplicado
 ) ORDER BY r.fecha_operacion DESC,r.id_pago DESC),'[]'::jsonb)
 INTO v_items
 FROM (
   SELECT p.id_pago,p.codigo,p.fecha_operacion,p.fecha_confirmacion,p.monto,
     ep.codigo AS estado,
     CASE WHEN p.id_reserva IS NOT NULL THEN 'SEPARACION'
          WHEN p.id_plan_pago IS NOT NULL THEN 'FINANCIAMIENTO'
          WHEN p.id_venta IS NOT NULL THEN 'VENTA'
          ELSE 'OTRO' END AS tipo,
     v.codigo AS venta,p.numero_operacion AS referencia,
     vo.codigo AS comprobante,ev.codigo AS estado_voucher,
     coalesce(ap.aplicado,0)+public.fn_sep_grupo_pago_aplicado_v1(p.id_pago) AS aplicado
   FROM public.pag_pagos p
   JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago
   LEFT JOIN public.ven_ventas v ON v.id_venta=p.id_venta
   LEFT JOIN LATERAL (
     SELECT z.codigo,z.id_estado_voucher FROM public.pag_vouchers z
     WHERE z.id_pago=p.id_pago AND z.activo ORDER BY z.numero_version DESC,z.id_voucher DESC LIMIT 1
   ) vo ON true
   LEFT JOIN public.cfg_estados_voucher ev ON ev.id_estado_voucher=vo.id_estado_voucher
   LEFT JOIN LATERAL (SELECT sum(a.monto_aplicado) AS aplicado
     FROM public.pag_aplicaciones_pago a WHERE a.id_pago=p.id_pago AND a.activo) ap ON true
   WHERE v_filtro='' OR lower(concat_ws(' ',p.codigo,p.numero_operacion,ep.codigo,v.codigo)) LIKE '%'||v_filtro||'%'
   ORDER BY p.fecha_operacion DESC,p.id_pago DESC
   LIMIT p_tamano OFFSET (p_pagina-1)*p_tamano
 ) r;

 SELECT coalesce(jsonb_agg(jsonb_build_object('mes',to_char(g.mes,'MM/YYYY'),
    'confirmado',coalesce(m.monto,0)) ORDER BY g.mes),'[]'::jsonb)
 INTO v_meses
 FROM generate_series(date_trunc('month',now())-interval '5 months',
                      date_trunc('month',now()),interval '1 month') g(mes)
 LEFT JOIN LATERAL (
    SELECT sum(p.monto) AS monto FROM public.pag_pagos p
    JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago
    WHERE ep.codigo='CONFIRMADO' AND p.fecha_confirmacion>=g.mes
      AND p.fecha_confirmacion<g.mes+interval '1 month'
 ) m ON true;
 RETURN jsonb_build_object(
   'pagina',p_pagina,'tamano',p_tamano,'total',v_total,
   'paginas',ceil(v_total::numeric/p_tamano)::integer,'items',v_items,
   'resumen',jsonb_build_object('confirmado',v_confirmado,
     'registrado',v_registrado,'anulado',v_anulado,
     'aplicado',v_aplicado,'confirmadoSinImputarFinanciamiento',v_no_imputado),
   'meses',v_meses);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_crm_cancelar_venta_pendiente_v6(p_actor bigint, p_venta bigint, p_motivo character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  x_lote bigint;
  x_reserva bigint;
  x_estado_lote integer;
  x_estado_nombre varchar;
  x_venta_codigo varchar;
  x_contrato bigint;
  x_contrato_codigo varchar;
  x_plan bigint;
  x_prospecto bigint;
  x_estado integer;
  x_lote_disponible integer;
  x_contrato_anulado integer;
  x_reserva_cancelada integer;
  x_plan_anulado integer;
  x_otra_venta boolean;
  x_otra_reserva boolean;
  x_tipo_seguimiento integer;
BEGIN
  IF p_actor IS NULL OR p_actor<=0 OR p_venta IS NULL OR p_venta<=0
     OR p_motivo IS NULL OR length(btrim(p_motivo)) NOT BETWEEN 10 AND 250 THEN
    RAISE EXCEPTION 'DATOS_INVALIDOS|Venta y motivo de 10-250 caracteres requeridos.';
  END IF;
  IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.reject'),false) THEN
    RAISE EXCEPTION 'DENEGADO|Se requiere sales.reject.';
  END IF;

  IF EXISTS(SELECT 1 FROM public.ven_ventas v JOIN public.ven_separaciones_grupo_lotes_v1 g USING(id_reserva) WHERE v.id_venta=p_venta) THEN
    RAISE EXCEPTION 'VENTA_NO_CANCELABLE|La venta tiene una reserva acumulada. Solicite revisión financiera; no se libera el lote automáticamente.';
  END IF;
  SELECT id_lote INTO x_lote FROM public.ven_ventas WHERE id_venta=p_venta;
  IF x_lote IS NULL THEN
    RAISE EXCEPTION 'VENTA_NO_EXISTE|No existe la venta.';
  END IF;

  SELECT l.id_estado_lote,el.codigo INTO x_estado_lote,x_estado_nombre
  FROM public.inm_lotes l
  JOIN public.cfg_estados_lote el ON el.id_estado_lote=l.id_estado_lote
  WHERE l.id_lote=x_lote FOR UPDATE OF l;

  IF x_estado_nombre IS DISTINCT FROM 'RESERVADO' THEN
    RAISE EXCEPTION 'VENTA_NO_CANCELABLE|El lote ya no esta reservado.';
  END IF;

  SELECT v.codigo,v.id_reserva INTO x_venta_codigo,x_reserva
  FROM public.ven_ventas v
  JOIN public.cfg_estados_venta e ON e.id_estado_venta=v.id_estado_venta
  WHERE v.id_venta=p_venta AND e.codigo='PENDIENTE'
    AND v.codigo LIKE 'VTA-PND-%' FOR UPDATE OF v;
  IF x_venta_codigo IS NULL THEN
    RAISE EXCEPTION 'VENTA_NO_CANCELABLE|Solo se anulan las nuevas ventas pendientes.';
  END IF;

  SELECT c.id_contrato,c.codigo INTO x_contrato,x_contrato_codigo
  FROM public.ven_contratos c
  JOIN public.cfg_estados_contrato e ON e.id_estado_contrato=c.id_estado_contrato
  WHERE c.id_venta=p_venta AND e.codigo='PENDIENTE_FIRMA' AND c.fecha_firma IS NULL
  FOR UPDATE OF c;
  IF x_contrato IS NULL OR
    (SELECT count(*) FROM public.ven_contratos WHERE id_venta=p_venta)<>1 THEN
    RAISE EXCEPTION 'VENTA_NO_CANCELABLE|El contrato no esta pendiente de firma.';
  END IF;

  SELECT p.id_plan_pago INTO x_plan
  FROM public.pag_planes_pago p
  JOIN public.cfg_estados_plan_pago e ON e.id_estado_plan_pago=p.id_estado_plan_pago
  WHERE p.id_venta=p_venta AND e.codigo='PENDIENTE' AND p.es_vigente
  FOR UPDATE OF p;
  IF (SELECT count(*) FROM public.pag_planes_pago WHERE id_venta=p_venta)
     <> (CASE WHEN x_plan IS NULL THEN 0 ELSE 1 END)
     OR EXISTS (SELECT 1 FROM public.pag_cuotas WHERE id_plan_pago=x_plan) THEN
    RAISE EXCEPTION 'VENTA_NO_CANCELABLE|Existe actividad en el plan de pago.';
  END IF;

  SELECT id_estado_venta INTO STRICT x_estado FROM public.cfg_estados_venta
  WHERE codigo='ANULADA' AND activo;
  SELECT id_estado_contrato INTO STRICT x_contrato_anulado
  FROM public.cfg_estados_contrato WHERE codigo='ANULADO' AND activo;
  SELECT id_estado_lote INTO STRICT x_lote_disponible
  FROM public.cfg_estados_lote WHERE codigo='DISPONIBLE' AND activo;
  SELECT id_estado_reserva INTO STRICT x_reserva_cancelada
  FROM public.cfg_estados_reserva WHERE codigo='CANCELADA' AND activo;
  IF x_plan IS NOT NULL THEN
    SELECT id_estado_plan_pago INTO STRICT x_plan_anulado
    FROM public.cfg_estados_plan_pago WHERE codigo='ANULADO' AND activo;
  END IF;

  UPDATE public.ven_ventas SET id_estado_venta=x_estado,
    observaciones=concat_ws(' / ',nullif(observaciones,''),
      'CANCELADA por usuario '||p_actor||': '||btrim(p_motivo)),
    fecha_actualizacion=now()
  WHERE id_venta=p_venta;

  UPDATE public.ven_contratos
  SET id_estado_contrato=x_contrato_anulado,
    observaciones=concat_ws(' / ',nullif(observaciones,''),
      'ANULADO: '||btrim(p_motivo)),fecha_actualizacion=now()
  WHERE id_contrato=x_contrato;

  IF x_plan IS NOT NULL THEN
    UPDATE public.pag_planes_pago
    SET id_estado_plan_pago=x_plan_anulado,es_vigente=false,
      fecha_cierre=now(),motivo_cierre=left(btrim(p_motivo),255),
      fecha_actualizacion=now()
    WHERE id_plan_pago=x_plan;
  END IF;

  IF x_reserva IS NOT NULL THEN
    UPDATE public.ven_reservas r
    SET id_estado_reserva=x_reserva_cancelada,fecha_actualizacion=now()
    WHERE r.id_reserva=x_reserva AND r.id_lote=x_lote AND
      EXISTS (SELECT 1 FROM public.cfg_estados_reserva er
              WHERE er.id_estado_reserva=r.id_estado_reserva AND er.codigo='CONVERTIDA');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.ven_ventas v
    JOIN public.cfg_estados_venta e ON e.id_estado_venta=v.id_estado_venta
    WHERE v.id_lote=x_lote AND v.id_venta<>p_venta AND e.codigo<>'ANULADA'
  ) INTO x_otra_venta;

  SELECT EXISTS (
    SELECT 1 FROM public.ven_reservas r
    JOIN public.cfg_estados_reserva e ON e.id_estado_reserva=r.id_estado_reserva
    WHERE r.id_lote=x_lote AND e.codigo='VIGENTE' AND r.fecha_vencimiento>now()
  ) INTO x_otra_reserva;

  IF NOT x_otra_venta AND NOT x_otra_reserva THEN
    UPDATE public.inm_lotes
    SET id_estado_lote=x_lote_disponible,fecha_actualizacion=now()
    WHERE id_lote=x_lote;
    INSERT INTO public.inm_lotes_historial_estado
      (id_lote,id_estado_anterior,id_estado_nuevo,motivo,fecha_cambio,id_usuario)
    VALUES (x_lote,x_estado_lote,x_lote_disponible,
      left('Anulacion '||x_venta_codigo||': '||btrim(p_motivo),255),now(),p_actor);
  END IF;

  SELECT p.id_prospecto INTO x_prospecto
  FROM public.ven_ventas_clientes vc
  JOIN public.crm_clientes cl ON cl.id_cliente=vc.id_cliente
  JOIN public.crm_prospectos p ON p.id_persona=cl.id_persona
  WHERE vc.id_venta=p_venta AND vc.titular
  ORDER BY p.id_prospecto DESC LIMIT 1;

  IF x_prospecto IS NOT NULL THEN
    SELECT id_tipo_seguimiento INTO x_tipo_seguimiento
    FROM public.cfg_tipos_seguimiento WHERE codigo='OTRO' AND activo;
    IF x_tipo_seguimiento IS NOT NULL THEN
      INSERT INTO public.crm_seguimientos
        (id_prospecto,id_tipo_seguimiento,asunto,detalle,resultado,
         requiere_seguimiento,id_usuario_registro)
      VALUES (x_prospecto,x_tipo_seguimiento,'Venta pendiente cancelada',
        'Venta '||x_venta_codigo||'; motivo: '||btrim(p_motivo),
        'Cancelada',false,p_actor);
    END IF;
  END IF;

  RETURN jsonb_build_object('success',true,'idVenta',p_venta,
    'codigoVenta',x_venta_codigo,'codigoContrato',x_contrato_codigo,
    'estadoVenta','ANULADA','estadoContrato','ANULADO',
    'estadoLote',CASE WHEN NOT x_otra_venta AND NOT x_otra_reserva
       THEN 'DISPONIBLE' ELSE 'RESERVADO' END,
    'motivo',btrim(p_motivo),'mensaje','Venta pendiente cancelada.');
EXCEPTION
  WHEN no_data_found OR too_many_rows THEN
    RAISE EXCEPTION 'CONFIGURACION_INVALIDA|Catalogos incompletos o duplicados.';
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_crm_resumen_financiero_anulacion_v1(p_tipo character varying, p_id_operacion bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
 v_reserva bigint;
 v_snapshot jsonb;
 v_huella text;
BEGIN
 IF p_tipo NOT IN ('VENTA','SEPARACION')
    OR p_id_operacion IS NULL OR p_id_operacion<=0 THEN
   RAISE EXCEPTION 'DATOS_INVALIDOS|Identificadores de resumen financiero.';
 END IF;
 IF p_tipo='VENTA' THEN
   SELECT id_reserva INTO v_reserva FROM public.ven_ventas
   WHERE id_venta=p_id_operacion;
   IF NOT FOUND THEN RAISE EXCEPTION 'OPERACION_NO_EXISTE|No existe la venta.'; END IF;
 ELSE
   IF NOT EXISTS(SELECT 1 FROM public.ven_reservas WHERE id_reserva=p_id_operacion)
   THEN RAISE EXCEPTION 'OPERACION_NO_EXISTE|No existe la separacion.'; END IF;
   v_reserva:=p_id_operacion;
 END IF;

 WITH pagos AS (
   SELECT p.*
   FROM public.pag_pagos p
   WHERE (NOT EXISTS(SELECT 1 FROM public.pag_separaciones_grupo_abonos_v1 a WHERE a.id_pago=p.id_pago) AND
     ((p_tipo='SEPARACION' AND p.id_reserva=p_id_operacion) OR (p_tipo='VENTA' AND (p.id_venta=p_id_operacion OR p.id_reserva=v_reserva))))
     OR EXISTS(SELECT 1 FROM public.pag_separaciones_grupo_distribucion_v1 d WHERE d.id_pago=p.id_pago AND d.id_reserva=v_reserva)
 ), vouchers AS (
   SELECT vo.* FROM public.pag_vouchers vo
   JOIN pagos p ON p.id_pago=vo.id_pago
 ), planes AS (
   SELECT pp.* FROM public.pag_planes_pago pp
   WHERE p_tipo='VENTA' AND pp.id_venta=p_id_operacion
 ), cuotas AS (
   SELECT c.* FROM public.pag_cuotas c
   JOIN planes pp ON pp.id_plan_pago=c.id_plan_pago
 )
 SELECT jsonb_build_object(
   'pagosNoAnulados',
     (SELECT count(*) FROM pagos p JOIN public.cfg_estados_pago e
       ON e.id_estado_pago=p.id_estado_pago
       WHERE e.codigo<>'ANULADO'),
   'vouchersNoRechazados',
     (SELECT count(*) FROM vouchers vo JOIN public.cfg_estados_voucher e
       ON e.id_estado_voucher=vo.id_estado_voucher
       WHERE e.codigo<>'RECHAZADO'),
   'planesAbiertos',
     (SELECT count(*) FROM planes pp JOIN public.cfg_estados_plan_pago e
       ON e.id_estado_plan_pago=pp.id_estado_plan_pago
       WHERE pp.es_vigente OR e.codigo IN ('ACTIVO','PENDIENTE')),
   'cuotasNoAnuladas',
     (SELECT count(*) FROM cuotas c JOIN public.cfg_estados_cuota e
       ON e.id_estado_cuota=c.id_estado_cuota
       WHERE e.codigo<>'ANULADA'),
   'pagosHistoricos',(SELECT count(*) FROM pagos),
   'creditoDistribuido',coalesce((SELECT sum(d.monto) FROM public.pag_separaciones_grupo_distribucion_v1 d JOIN public.pag_pagos pg USING(id_pago) JOIN public.cfg_estados_pago ep USING(id_estado_pago) WHERE d.id_reserva=v_reserva AND ep.codigo='CONFIRMADO'),0),
   'vouchersHistoricos',(SELECT count(*) FROM vouchers),
   'planesHistoricos',(SELECT count(*) FROM planes),
   'cuotasHistoricas',(SELECT count(*) FROM cuotas)
 ) INTO v_snapshot;

 WITH pagos AS (
   SELECT p.id_pago,p.id_estado_pago,p.monto,p.fecha_actualizacion
   FROM public.pag_pagos p
   WHERE (NOT EXISTS(SELECT 1 FROM public.pag_separaciones_grupo_abonos_v1 a WHERE a.id_pago=p.id_pago) AND
     ((p_tipo='SEPARACION' AND p.id_reserva=p_id_operacion) OR (p_tipo='VENTA' AND (p.id_venta=p_id_operacion OR p.id_reserva=v_reserva))))
     OR EXISTS(SELECT 1 FROM public.pag_separaciones_grupo_distribucion_v1 d WHERE d.id_pago=p.id_pago AND d.id_reserva=v_reserva)
 ), vouchers AS (
   SELECT vo.id_voucher,vo.id_estado_voucher,vo.fecha_actualizacion
   FROM public.pag_vouchers vo
   JOIN pagos p ON p.id_pago=vo.id_pago
 ), planes AS (
   SELECT pp.id_plan_pago,pp.id_estado_plan_pago,pp.es_vigente,
          pp.fecha_actualizacion
   FROM public.pag_planes_pago pp
   WHERE p_tipo='VENTA' AND pp.id_venta=p_id_operacion
 ), cuotas AS (
   SELECT c.id_cuota,c.id_estado_cuota,c.monto_cuota,c.fecha_actualizacion
   FROM public.pag_cuotas c JOIN planes pp ON pp.id_plan_pago=c.id_plan_pago
 )
 SELECT md5((
   jsonb_build_object(
    'pagos',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.id_pago) FROM pagos p),'[]'::jsonb),
    'vouchers',coalesce((SELECT jsonb_agg(to_jsonb(vo) ORDER BY vo.id_voucher) FROM vouchers vo),'[]'::jsonb),
    'planes',coalesce((SELECT jsonb_agg(to_jsonb(pp) ORDER BY pp.id_plan_pago) FROM planes pp),'[]'::jsonb),
    'cuotas',coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.id_cuota) FROM cuotas c),'[]'::jsonb)
   )
 )::text) INTO v_huella;

 RETURN v_snapshot || jsonb_build_object('huella',v_huella);
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

    -- No basta con permiso: se exige tambien el rol activo GERENCIA.
    IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(
       p_actor,CASE WHEN v_accion='RECHAZAR'
                 THEN 'annulments.reject'::varchar
                 ELSE 'annulments.approve'::varchar END),false)
       OR NOT EXISTS (
          SELECT 1 FROM public.seg_usuarios_roles ur
          JOIN public.seg_roles rol ON rol.id_rol=ur.id_rol
          WHERE ur.id_usuario=p_actor
            AND ur.activo AND ur.fecha_revocacion IS NULL
            AND rol.activo AND rol.codigo='GERENCIA'
       ) THEN
        RAISE EXCEPTION 'DENEGADO|Solo Gerencia con permiso de aprobación o rechazo puede decidir anulaciones.';
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
                      AND rol.activo AND rol.codigo='ASESORIA_LEGAL'
                )
                AND NOT EXISTS(
                    SELECT 1 FROM public.seg_usuarios_roles ur
                    JOIN public.seg_roles rol ON rol.id_rol=ur.id_rol
                    WHERE ur.id_usuario=v_legal_revision.id_usuario_revisor
                      AND ur.activo AND ur.fecha_revocacion IS NULL
                      AND rol.activo AND rol.codigo='GERENCIA'
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

COMMIT;
