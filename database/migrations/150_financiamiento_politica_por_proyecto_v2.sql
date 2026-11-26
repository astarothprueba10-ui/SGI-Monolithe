-- 150: alcance financiero por proyecto. No cambia datos de operaciones anteriores.
BEGIN;
ALTER TABLE public.cfg_fin_politicas_versiones
 ADD COLUMN modo_aplicacion varchar(8) NOT NULL DEFAULT 'PROPIA'
 CHECK (modo_aplicacion IN ('GENERAL','PROPIA'));
CREATE TABLE public.cfg_fin_politica_proyecto_activa (
 id_proyecto bigint PRIMARY KEY REFERENCES public.inm_proyectos(id_proyecto),
 codigo varchar(32) NOT NULL CHECK(codigo='PROYECTO:'||id_proyecto::text),
 id_politica bigint NOT NULL,
 actualizada_en timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(id_politica,codigo) REFERENCES public.cfg_fin_politicas_versiones(id_politica,codigo)
);
ALTER TABLE public.cfg_fin_politica_proyecto_activa ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cfg_fin_politica_proyecto_activa FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
CREATE FUNCTION public.fn_fin_politica_proyecto_id_v2(p_proyecto bigint)
RETURNS bigint LANGUAGE sql STABLE SET search_path TO 'pg_catalog','public','pg_temp' AS $$
 SELECT coalesce(
   (SELECT p.id_politica FROM public.cfg_fin_politica_proyecto_activa a
    JOIN public.cfg_fin_politicas_versiones p USING(id_politica,codigo)
    WHERE a.id_proyecto=p_proyecto AND p.modo_aplicacion='PROPIA'),
   (SELECT id_politica FROM public.cfg_fin_politica_activa WHERE id=1))
 WHERE EXISTS(SELECT 1 FROM public.inm_proyectos WHERE id_proyecto=p_proyecto)
$$;
CREATE FUNCTION public.fn_fin_politica_lote_v2(p_lote bigint)
RETURNS jsonb LANGUAGE sql STABLE SET search_path TO 'pg_catalog','public','pg_temp' AS $$
 SELECT public.fn_fin_snapshot_politica_v1(public.fn_fin_politica_proyecto_id_v2(l.id_proyecto))
 FROM public.inm_lotes l WHERE l.id_lote=p_lote
$$;
CREATE FUNCTION public.sp_fin_consultar_politicas_proyecto_v2(p_actor bigint,p_proyecto bigint)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','public','pg_temp' AS $$
DECLARE v_id bigint; v_local public.cfg_fin_politicas_versiones%ROWTYPE; v_hist jsonb;
BEGIN
 IF NOT public.fn_fin_gerencia_autorizada_v1(p_actor) THEN
  RAISE EXCEPTION 'ACCESO_DENEGADO|Solo Gerencia autorizada.';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.inm_proyectos WHERE id_proyecto=p_proyecto AND activo) THEN
  RAISE EXCEPTION 'BORRADOR_INVALIDO|Proyecto inexistente o inactivo.';
 END IF;
 v_id:=public.fn_fin_politica_proyecto_id_v2(p_proyecto);
 IF v_id IS NULL THEN RAISE EXCEPTION 'POLITICA_NO_DISPONIBLE|Falta política vigente.'; END IF;
 SELECT p.* INTO v_local FROM public.cfg_fin_politica_proyecto_activa a
 JOIN public.cfg_fin_politicas_versiones p USING(id_politica,codigo)
 WHERE a.id_proyecto=p_proyecto;
 SELECT coalesce(jsonb_agg(jsonb_build_object('idPolitica',h.id_politica,'version',h.version,
  'vigenteDesde',h.vigente_desde,'publicadoEn',h.publicado_en,'motivo',h.motivo_publicacion,
  'idPublicador',h.id_usuario_publicador,'modoAplicacion',h.modo_aplicacion)
  ORDER BY h.version DESC),'[]'::jsonb) INTO v_hist
 FROM (SELECT * FROM public.cfg_fin_politicas_versiones WHERE codigo='PROYECTO:'||p_proyecto::text
 ORDER BY version DESC LIMIT 30) h;
 RETURN public.fn_fin_snapshot_politica_v1(v_id)||jsonb_build_object(
  'idProyecto',p_proyecto,'modoAplicacion',coalesce(v_local.modo_aplicacion,'GENERAL'),
  'idPoliticaProyecto',v_local.id_politica,'versionSiguiente',coalesce(v_local.version,0)+1,
  'politicaGeneral',public.fn_fin_politica_activa_v1(),'historial',v_hist,'requiereTotp',true,
  'publicacionHabilitada',coalesce((SELECT habilitado FROM public.cfg_fin_publicacion_control WHERE id=1),false));
END;
$$;
CREATE FUNCTION public.fn_fin_propuesta_proyecto_v2(p_version integer,p_borrador jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'pg_catalog','public','pg_temp' AS $$
DECLARE v_proyecto bigint; v_base bigint; v_local_base bigint; v_actual bigint;
 v_local public.cfg_fin_politicas_versiones%ROWTYPE; v_version integer; v_modo text;
 v_general jsonb; v_anterior jsonb; v_normal jsonb;
BEGIN
 IF NOT (p_borrador ?& ARRAY['idProyecto','modoAplicacion','idPoliticaBase','idPoliticaProyectoBase']) THEN
  RAISE EXCEPTION 'BORRADOR_INVALIDO|Alcance del proyecto incompleto.';
 END IF;
 BEGIN
  v_proyecto:=(p_borrador->>'idProyecto')::bigint;
  v_base:=(p_borrador->>'idPoliticaBase')::bigint;
  v_local_base:=(p_borrador->>'idPoliticaProyectoBase')::bigint;
 EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RAISE EXCEPTION 'BORRADOR_INVALIDO|Identificadores de política inválidos.';
 END;
 v_modo:=p_borrador->>'modoAplicacion';
 IF v_proyecto IS NULL OR v_base IS NULL OR v_modo IS NULL OR v_modo NOT IN ('GENERAL','PROPIA')
  OR NOT EXISTS(SELECT 1 FROM public.inm_proyectos WHERE id_proyecto=v_proyecto AND activo) THEN
  RAISE EXCEPTION 'BORRADOR_INVALIDO|Proyecto o modo inválido.';
 END IF;
 SELECT p.* INTO v_local FROM public.cfg_fin_politica_proyecto_activa a
 JOIN public.cfg_fin_politicas_versiones p USING(id_politica,codigo) WHERE a.id_proyecto=v_proyecto;
 v_actual:=public.fn_fin_politica_proyecto_id_v2(v_proyecto);
 SELECT version INTO v_version FROM public.cfg_fin_politicas_versiones WHERE id_politica=v_actual;
 IF v_actual IS DISTINCT FROM v_base OR v_local.id_politica IS DISTINCT FROM v_local_base
    OR v_version IS DISTINCT FROM p_version THEN
  RAISE EXCEPTION 'POLITICA_CAMBIO|Cambió la política del proyecto.';
 END IF;
 v_general:=public.fn_fin_politica_activa_v1();
 v_anterior:=public.fn_fin_snapshot_politica_v1(v_actual)-ARRAY['idPolitica','codigo','version','vigenteDesde'];
 v_normal:=public.fn_fin_normalizar_borrador_v1(p_borrador-ARRAY['idProyecto','modoAplicacion','idPoliticaBase','idPoliticaProyectoBase']);
 IF v_modo='GENERAL' THEN
  v_normal:=(v_general-ARRAY['idPolitica','codigo','version','vigenteDesde'])
     ||jsonb_build_object('motivoPublicacion',v_normal->>'motivoPublicacion');
 END IF;
 IF v_modo='PROPIA' AND (v_normal->>'cuotasMax')::int>36 THEN
  RAISE EXCEPTION 'BORRADOR_INVALIDO|La política propia admite hasta 36 cuotas en esta versión.';
 END IF;
 IF v_normal-'motivoPublicacion'=v_anterior AND v_modo=coalesce(v_local.modo_aplicacion,'GENERAL') THEN
  RAISE EXCEPTION 'POLITICA_SIN_CAMBIOS|No cambió el modo ni las condiciones.';
 END IF;
 v_normal:=v_normal||jsonb_build_object('idProyecto',v_proyecto,'modoAplicacion',v_modo,
   'idPoliticaBase',v_base,'idPoliticaProyectoBase',v_local_base,'idPoliticaGeneralBase',v_general->'idPolitica');
 RETURN jsonb_build_object('normal',v_normal,'anterior',v_anterior,
   'idPoliticaActual',v_actual,'versionActual',v_version,'versionNueva',coalesce(v_local.version,0)+1);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_fin_politica_proyecto_id_v2(bigint),public.fn_fin_politica_lote_v2(bigint),
 public.fn_fin_propuesta_proyecto_v2(integer,jsonb) FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_fin_consultar_politicas_proyecto_v2(bigint,bigint)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.sp_fin_consultar_politicas_proyecto_v2(bigint,bigint) TO sigi_app_user;
CREATE OR REPLACE FUNCTION public.sp_fin_previsualizar_borrador_v1(p_actor bigint, p_version integer, p_borrador jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
 v_actual public.cfg_fin_politicas_versiones%ROWTYPE;
 v_normal jsonb;
 v_anterior jsonb;
 v_habilitado boolean;
 v_scope jsonb;
BEGIN
 IF NOT public.fn_fin_gerencia_autorizada_v1(p_actor) THEN
   RAISE EXCEPTION 'ACCESO_DENEGADO|Solo Gerencia activa puede evaluar políticas.';
 END IF;
 IF p_borrador ? 'idProyecto' THEN
   v_scope:=public.fn_fin_propuesta_proyecto_v2(p_version,p_borrador);
   SELECT habilitado INTO v_habilitado FROM public.cfg_fin_publicacion_control WHERE id=1;
   RETURN jsonb_build_object('versionActual',v_scope->'versionActual','versionNueva',v_scope->'versionNueva',
    'idPoliticaActual',v_scope->'idPoliticaActual','condiciones',v_scope->'normal',
    'hashPropuesta',public.fn_fin_hash_borrador_v1(p_version,v_scope->'normal'),
    'publicacionHabilitada',coalesce(v_habilitado,false),'mensaje','Propuesta de proyecto validada; requiere TOTP.');
 END IF;
 SELECT pv.* INTO v_actual
 FROM public.cfg_fin_politica_activa a
 JOIN public.cfg_fin_politicas_versiones pv ON pv.id_politica=a.id_politica
 WHERE a.id=1;
 IF NOT FOUND THEN
   RAISE EXCEPTION 'POLITICA_NO_DISPONIBLE|No hay versión activa.';
 END IF;
 IF p_version IS DISTINCT FROM v_actual.version THEN
   RAISE EXCEPTION 'POLITICA_CAMBIO|La versión vigente cambió. Actualice y revise su propuesta.';
 END IF;
 v_normal:=public.fn_fin_normalizar_borrador_v1(p_borrador);
 v_anterior:=jsonb_build_object(
  'montoSeparacion',v_actual.monto_separacion,'modoInicial',v_actual.modo_inicial,
  'inicialMinima',v_actual.inicial_minima,'inicialMaxima',v_actual.inicial_maxima,
  'inicialFija',v_actual.inicial_fija,'tasaNominalAnualPct',v_actual.tasa_nominal_anual_pct,
  'cuotasMin',v_actual.cuotas_min,'cuotasMax',v_actual.cuotas_max,
  'diasVencimientoSeparacion',v_actual.dias_vencimiento_separacion,
  'sistemaAmortizacion',v_actual.sistema_amortizacion,'moneda',v_actual.moneda);
 IF v_normal-'motivoPublicacion'=v_anterior THEN
   RAISE EXCEPTION 'POLITICA_SIN_CAMBIOS|Modifique al menos una condición antes de publicar.';
 END IF;
 SELECT habilitado INTO v_habilitado FROM public.cfg_fin_publicacion_control WHERE id=1;
 RETURN jsonb_build_object(
   'versionActual',v_actual.version,'versionNueva',v_actual.version+1,
   'idPoliticaActual',v_actual.id_politica,
   'condiciones',v_normal,
   'hashPropuesta',public.fn_fin_hash_borrador_v1(p_version,v_normal),
   'publicacionHabilitada',coalesce(v_habilitado,false),
   'mensaje',CASE WHEN coalesce(v_habilitado,false)
      THEN 'Propuesta validada: requiere nueva confirmación y TOTP.'
      ELSE 'Propuesta validada, pero la publicación está bloqueada hasta finalizar MFA y pruebas.' END
 );
END;
$function$;
CREATE OR REPLACE FUNCTION public.sp_fin_publicar_politica_v1(p_actor bigint, p_version_sesion bigint, p_jti text, p_autorizacion uuid, p_nonce uuid, p_version_esperada integer, p_borrador jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_guard public.cfg_fin_publicacion_control%ROWTYPE;
  v_version_sesion bigint;
  v_actual public.cfg_fin_politicas_versiones%ROWTYPE;
  v_normal jsonb;
  v_anterior jsonb;
  v_hash char(64);
  v_aut public.seg_fin_totp_autorizaciones%ROWTYPE;
  v_cuenta public.seg_fin_totp_cuentas%ROWTYPE;
  v_nuevo bigint;
  v_evento bigint;
  v_scope jsonb; v_proyecto bigint; v_codigo varchar(32):='GENERAL';
  v_modo varchar(8):='PROPIA'; v_version_nueva integer;
BEGIN
  -- Bloquear el interruptor primero evita habilitar o deshabilitar durante la transacción.
  SELECT * INTO v_guard FROM public.cfg_fin_publicacion_control
   WHERE id=1 FOR UPDATE;
  IF NOT FOUND OR v_guard.habilitado IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'PUBLICACION_BLOQUEADA|MFA funcional y autorización operativa pendientes.';
  END IF;
  IF p_actor IS NULL OR p_version_sesion IS NULL OR p_jti IS NULL
     OR length(p_jti) NOT BETWEEN 1 AND 128
     OR p_autorizacion IS NULL OR p_nonce IS NULL OR p_version_esperada IS NULL THEN
    RAISE EXCEPTION 'AUTORIZACION_INVALIDA|Los parámetros de seguridad son obligatorios.';
  END IF;
  SELECT u.version_sesiones INTO v_version_sesion
    FROM public.seg_usuarios u WHERE u.id_usuario=p_actor FOR SHARE;
  IF NOT FOUND OR v_version_sesion IS DISTINCT FROM p_version_sesion
     OR NOT public.fn_fin_gerencia_autorizada_v1(p_actor) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO|La sesión o el permiso de Gerencia no son vigentes.';
  END IF;
  IF NOT EXISTS (
      SELECT 1 FROM public.seg_usuarios u
      JOIN public.core_personas_contactos c ON c.id_persona=u.id_persona
      JOIN public.cfg_tipos_contacto tc ON tc.id_tipo_contacto=c.id_tipo_contacto
      WHERE u.id_usuario=p_actor AND tc.codigo='EMAIL' AND tc.activo
        AND c.principal AND c.verificado AND c.activo
        AND nullif(btrim(c.valor),'') IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'MFA_REQUERIDA|Correo principal registrado no verificado.';
  END IF;
  SELECT * INTO v_cuenta FROM public.seg_fin_totp_cuentas
   WHERE id_usuario=p_actor FOR SHARE;
  IF NOT FOUND OR v_cuenta.secreto_cifrado IS NULL OR v_cuenta.habilitado_en IS NULL
     OR (v_cuenta.bloqueo_hasta IS NOT NULL AND v_cuenta.bloqueo_hasta>now()) THEN
    RAISE EXCEPTION 'MFA_REQUERIDA|El factor TOTP activo es obligatorio.';
  END IF;

  -- El puntero se bloquea: dos gerentes no pueden publicar sobre la misma versión.
  SELECT pv.* INTO v_actual
    FROM public.cfg_fin_politica_activa a
    JOIN public.cfg_fin_politicas_versiones pv ON pv.id_politica=a.id_politica
    WHERE a.id=1 FOR UPDATE OF a;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'POLITICA_NO_DISPONIBLE|Falta la política activa.';
  END IF;
  IF p_borrador ? 'idProyecto' THEN
    v_scope:=public.fn_fin_propuesta_proyecto_v2(p_version_esperada,p_borrador);
    v_normal:=v_scope->'normal'; v_anterior:=v_scope->'anterior';
    v_proyecto:=(v_normal->>'idProyecto')::bigint;
    v_codigo:='PROYECTO:'||v_proyecto::text; v_modo:=v_normal->>'modoAplicacion';
    v_version_nueva:=(v_scope->>'versionNueva')::int;
    SELECT * INTO STRICT v_actual FROM public.cfg_fin_politicas_versiones
     WHERE id_politica=(v_scope->>'idPoliticaActual')::bigint;
  ELSE
  IF v_actual.version IS DISTINCT FROM p_version_esperada THEN
    RAISE EXCEPTION 'POLITICA_CAMBIO|La versión financiera cambió. Actualice el formulario.';
  END IF;

  -- Se recalcula en PostgreSQL; no se acepta ningún hash aportado por el cliente.
  v_normal:=public.fn_fin_normalizar_borrador_v1(p_borrador);
  v_anterior:=jsonb_build_object(
    'montoSeparacion',v_actual.monto_separacion,'modoInicial',v_actual.modo_inicial,
    'inicialMinima',v_actual.inicial_minima,'inicialMaxima',v_actual.inicial_maxima,
    'inicialFija',v_actual.inicial_fija,'tasaNominalAnualPct',v_actual.tasa_nominal_anual_pct,
    'cuotasMin',v_actual.cuotas_min,'cuotasMax',v_actual.cuotas_max,
    'diasVencimientoSeparacion',v_actual.dias_vencimiento_separacion,
    'sistemaAmortizacion',v_actual.sistema_amortizacion,'moneda',v_actual.moneda);
  IF v_normal-'motivoPublicacion'=v_anterior THEN
    RAISE EXCEPTION 'POLITICA_SIN_CAMBIOS|No hay cambios financieros a publicar.';
  END IF;
  v_version_nueva:=v_actual.version+1;
  END IF;
  v_hash:=public.fn_fin_hash_borrador_v1(p_version_esperada,v_normal);
  SELECT * INTO v_aut
    FROM public.seg_fin_totp_autorizaciones
    WHERE id_autorizacion=p_autorizacion FOR UPDATE;
  IF NOT FOUND OR v_aut.id_usuario IS DISTINCT FROM p_actor
    OR v_aut.token_jti IS DISTINCT FROM p_jti
    OR v_aut.version_esperada IS DISTINCT FROM p_version_esperada
    OR v_aut.hash_propuesta IS DISTINCT FROM v_hash
    OR v_aut.nonce IS DISTINCT FROM p_nonce
    OR v_aut.consumido_en IS NOT NULL
    OR v_aut.expira_en<=clock_timestamp() THEN
    RAISE EXCEPTION 'AUTORIZACION_INVALIDA|TOTP vencido, reutilizado o no corresponde a esta propuesta.';
  END IF;

  UPDATE public.seg_fin_totp_autorizaciones
   SET consumido_en=clock_timestamp()
   WHERE id_autorizacion=p_autorizacion AND consumido_en IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'AUTORIZACION_INVALIDA|El recibo ya fue consumido.';
  END IF;

  INSERT INTO public.cfg_fin_politicas_versiones(
      codigo,version,monto_separacion,modo_inicial,
      inicial_minima,inicial_maxima,inicial_fija,
      tasa_nominal_anual_pct,cuotas_min,cuotas_max,dias_vencimiento_separacion,
      sistema_amortizacion,moneda,vigente_desde,id_usuario_publicador,
      motivo_publicacion,modo_aplicacion
  ) VALUES(
      v_codigo,v_version_nueva,
      (v_normal->>'montoSeparacion')::numeric,(v_normal->>'modoInicial')::varchar,
      (v_normal->>'inicialMinima')::numeric,(v_normal->>'inicialMaxima')::numeric,
      (v_normal->>'inicialFija')::numeric,
      (v_normal->>'tasaNominalAnualPct')::numeric,
      (v_normal->>'cuotasMin')::integer,(v_normal->>'cuotasMax')::integer,
      (v_normal->>'diasVencimientoSeparacion')::integer,
      'FRANCES','PEN',clock_timestamp(),p_actor,v_normal->>'motivoPublicacion',v_modo
  ) RETURNING id_politica INTO v_nuevo;

  IF v_proyecto IS NULL THEN
  UPDATE public.cfg_fin_politica_activa
    SET id_politica=v_nuevo,actualizada_en=clock_timestamp()
    WHERE id=1 AND id_politica=v_actual.id_politica;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'POLITICA_CAMBIO|La política activa fue modificada.';
  END IF;

  ELSE
    INSERT INTO public.cfg_fin_politica_proyecto_activa(id_proyecto,codigo,id_politica)
    VALUES(v_proyecto,v_codigo,v_nuevo)
    ON CONFLICT(id_proyecto) DO UPDATE SET id_politica=excluded.id_politica,actualizada_en=clock_timestamp();
  END IF;
  -- Si falla auditoría o actualización: ROLLBACK de recibo, inserción y puntero.
  SELECT public.sp_registrar_auditoria(
    p_actor,'FINANCIAMIENTO'::varchar,'POLITICA_PUBLICADA'::varchar,
    'POLITICA_FINANCIERA'::varchar,v_nuevo::varchar,'EXITOSO'::varchar,
    'Publicación de nueva política financiera bajo TOTP'::varchar,
    jsonb_build_object(
      'version_anterior',v_actual.version,'id_politica_anterior',v_actual.id_politica,
      'version_nueva',v_version_nueva,'id_politica_nueva',v_nuevo,'idProyecto',v_proyecto,'modoAplicacion',v_modo,
      'hash_propuesta',v_hash,'id_autorizacion',p_autorizacion,
      'nonce',p_nonce,'jti',p_jti,'motivo',v_normal->>'motivoPublicacion',
      'parametros_anteriores',v_anterior,'parametros_nuevos',v_normal
    )
  ) INTO v_evento;
  IF v_evento IS NULL THEN
    RAISE EXCEPTION 'AUDITORIA_FALLIDA|No se registró la publicación.';
  END IF;
  RETURN jsonb_build_object(
    'idPolitica',v_nuevo,'version',v_version_nueva,
    'idPoliticaAnterior',v_actual.id_politica,
    'eventoAuditoria',v_evento,'publicado',true,
    'hashPropuesta',v_hash
  );
END;
$function$;
CREATE OR REPLACE FUNCTION public.fn_fin_politica_para_venta_v1(p_prospecto bigint, p_lote bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
 v_reserva bigint;
 v_politica bigint;
 v_snapshot jsonb;
BEGIN
 SELECT r.id_reserva,coalesce(r.id_politica_financiera,
   (SELECT id_politica FROM public.cfg_fin_politicas_versiones
     WHERE codigo='GENERAL' AND version=1))
 INTO v_reserva,v_politica
 FROM public.crm_prospectos cp
 JOIN public.ven_reservas r ON r.id_persona=cp.id_persona
 JOIN public.cfg_estados_reserva er ON er.id_estado_reserva=r.id_estado_reserva
 WHERE cp.id_prospecto=p_prospecto AND cp.activo
   AND r.id_lote=p_lote AND er.codigo='VIGENTE'
   AND r.fecha_vencimiento>now()
 ORDER BY r.fecha_reserva DESC,r.id_reserva DESC LIMIT 1;
 IF v_reserva IS NULL THEN
   v_snapshot:=public.fn_fin_politica_lote_v2(p_lote);
 ELSE
   v_snapshot:=public.fn_fin_snapshot_politica_v1(v_politica);
 END IF;
 IF v_snapshot IS NULL THEN RAISE EXCEPTION
   'POLITICA_NO_DISPONIBLE|No existe la versión financiera asociada a la operación.';
 END IF;
 RETURN v_snapshot;
END;
$function$;
CREATE OR REPLACE FUNCTION public.fn_fin_congelar_condiciones_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE v_id bigint; v_snap jsonb;
BEGIN
 IF TG_OP='INSERT' THEN
   IF NEW.id_politica_financiera IS NOT NULL OR NEW.politica_financiera_snapshot IS NOT NULL THEN
     RAISE EXCEPTION 'POLITICA_INVALIDA|El registro no puede suministrar condiciones financieras propias.';
   END IF;

   IF TG_TABLE_NAME='ven_reservas' THEN
     v_snap:=public.fn_fin_politica_lote_v2(NEW.id_lote);
   ELSIF TG_TABLE_NAME='ven_ventas' THEN
     IF NEW.id_reserva IS NOT NULL THEN
       SELECT id_politica_financiera,politica_financiera_snapshot INTO v_id,v_snap
       FROM public.ven_reservas WHERE id_reserva=NEW.id_reserva;
       IF NOT FOUND THEN RAISE EXCEPTION 'POLITICA_INVALIDA|La reserva no existe.'; END IF;
       IF v_snap IS NULL THEN
         -- Reserva legítima anterior a la configuración: no recibe condiciones nuevas.
         SELECT id_politica INTO v_id FROM public.cfg_fin_politicas_versiones
           WHERE codigo='GENERAL' AND version=1;
         v_snap:=public.fn_fin_snapshot_politica_v1(v_id);
       END IF;
     ELSE
       v_snap:=public.fn_fin_politica_lote_v2(NEW.id_lote);
     END IF;
   ELSIF TG_TABLE_NAME='pag_planes_pago' THEN
     SELECT id_politica_financiera,politica_financiera_snapshot INTO v_id,v_snap
       FROM public.ven_ventas WHERE id_venta=NEW.id_venta;
     IF NOT FOUND THEN RAISE EXCEPTION 'POLITICA_INVALIDA|La venta no existe.'; END IF;
     IF v_snap IS NULL THEN
       -- No imponer condiciones actuales a un plan que provenga de una venta histórica.
       RETURN NEW;
     END IF;
   END IF;

   IF v_snap IS NULL THEN RAISE EXCEPTION
      'POLITICA_NO_DISPONIBLE|Sin política vigente para el registro.'; END IF;
   NEW.id_politica_financiera:=(v_snap->>'idPolitica')::bigint;
   NEW.politica_financiera_snapshot:=v_snap;
   RETURN NEW;
 END IF;

 IF NEW.id_politica_financiera IS DISTINCT FROM OLD.id_politica_financiera OR
    NEW.politica_financiera_snapshot IS DISTINCT FROM OLD.politica_financiera_snapshot THEN
   RAISE EXCEPTION
     'POLITICA_INMUTABLE|Las condiciones financieras aceptadas no pueden modificarse.';
 END IF;
 RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.sp_crm_registrar_separacion_v2(p_actor bigint, p_prospecto bigint, p_lote bigint, p_metodo_pago character varying, p_numero_operacion character varying, p_monto numeric, p_observaciones text, p_clave_archivo character varying, p_nombre_archivo character varying, p_tipo_mime character varying, p_tamanio_bytes bigint, p_hash_sha256 character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_contexto jsonb;
    v_persona bigint;
    v_moneda integer;
    v_estado_lote_anterior integer;
    v_estado_lote_reservado integer;
    v_estado_reserva integer;
    v_estado_pago integer;
    v_estado_voucher integer;
    v_metodo integer;
    v_exige_numero boolean;
    v_reserva bigint;
    v_pago bigint;
    v_voucher bigint;
    v_codigo_reserva varchar;
    v_codigo_pago varchar;
    v_codigo_voucher varchar;
    v_fecha timestamptz;
    v_vencimiento timestamptz;
    v_size bigint;
    v_mime text;
    v_extension text;
    v_monto_politica numeric(14,2);
    v_dias_politica integer;
BEGIN
    IF p_observaciones IS NOT NULL AND length(p_observaciones) > 500 THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|Observaciones demasiado extensas.';
    END IF;
    IF p_metodo_pago IS NULL OR p_metodo_pago NOT IN
        ('EFECTIVO','DEPOSITO','TRANSFERENCIA','YAPE_PLIN','OTRO') THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|Metodo de pago no valido.';
    END IF;
    IF p_numero_operacion IS NOT NULL AND length(p_numero_operacion)>100 THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|Numero de operacion demasiado extenso.';
    END IF;
    IF p_nombre_archivo IS NULL OR btrim(p_nombre_archivo)=''
       OR length(p_nombre_archivo)>255 OR p_nombre_archivo ~ '[[:cntrl:]]' THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|Nombre de comprobante invalido.';
    END IF;
    IF p_tipo_mime IS NULL OR p_tipo_mime NOT IN
        ('application/pdf','image/jpeg','image/png','image/webp') THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|Formato de comprobante no permitido.';
    END IF;
    IF p_tamanio_bytes IS NULL OR p_tamanio_bytes < 1 OR p_tamanio_bytes>5242880 THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|El comprobante excede el tamano maximo de 5MB.';
    END IF;
    IF p_hash_sha256 IS NOT NULL AND p_hash_sha256 !~ '^[0-9A-Fa-f]{64}$' THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|Hash SHA256 invalido.';
    END IF;

    SELECT id_metodo_pago, requiere_numero_operacion INTO v_metodo, v_exige_numero
      FROM public.cfg_metodos_pago
     WHERE codigo=p_metodo_pago AND activo=true;
    IF v_metodo IS NULL THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|Metodo de pago no habilitado.';
    END IF;
    IF v_exige_numero AND nullif(btrim(p_numero_operacion), '') IS NULL THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|Este metodo de pago requiere numero de operacion.';
    END IF;

    v_extension := CASE p_tipo_mime
        WHEN 'application/pdf' THEN 'pdf'
        WHEN 'image/jpeg' THEN 'jpg'
        WHEN 'image/png' THEN 'png'
        WHEN 'image/webp' THEN 'webp'
    END;
    IF p_clave_archivo IS NULL OR length(p_clave_archivo)>500
       OR p_clave_archivo !~ (
         '^separaciones/p-'||p_prospecto||'/l-'||p_lote||
         '/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.'||v_extension||'$'
       ) THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|La ruta del comprobante es invalida.';
    END IF;

    -- Bloqueo primero del lote, para impedir dobles separaciones concurrentes.
    SELECT l.id_estado_lote INTO v_estado_lote_anterior
      FROM public.inm_lotes l WHERE l.id_lote=p_lote FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'LOTE_NO_DISPONIBLE|El lote no existe.';
    END IF;

    -- Orden de bloqueo: lote y luego política activa para evitar deadlocks.
    PERFORM 1 FROM public.cfg_fin_politica_activa WHERE id=1 FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'POLITICA_NO_DISPONIBLE|Falta política general.'; END IF;
    SELECT p.monto_separacion,p.dias_vencimiento_separacion
      INTO STRICT v_monto_politica,v_dias_politica
      FROM public.cfg_fin_politicas_versiones p
      WHERE p.id_politica=(public.fn_fin_politica_lote_v2(p_lote)->>'idPolitica')::bigint;
    IF p_monto IS DISTINCT FROM v_monto_politica THEN
       RAISE EXCEPTION 'SEPARACION_MONTO_INVALIDO|El importe no coincide con la política vigente.';
    END IF;
    v_contexto := public.sp_crm_validar_preparacion_comprobante_v1(
        p_actor, p_prospecto, p_lote
    );
    v_persona := (v_contexto->>'id_persona')::bigint;

    -- Verificar archivo realmente subido al bucket PRIVADO, sus metadatos y que no fue reutilizado.
    SELECT (o.metadata->>'size')::bigint, lower(o.metadata->>'mimetype')
      INTO v_size, v_mime
      FROM storage.objects o
     WHERE o.bucket_id='vouchers-separacion-private'
       AND o.name=p_clave_archivo
       AND o.archived_at IS NULL
       AND o.is_delete_marker=false
       AND jsonb_typeof(o.metadata->'size')='number'
       AND (o.metadata->>'size') ~ '^[0-9]+$';
    IF v_size IS NULL OR v_size<>p_tamanio_bytes
       OR v_mime IS DISTINCT FROM lower(p_tipo_mime) THEN
        RAISE EXCEPTION 'ARCHIVO_NO_EXISTE|El comprobante no existe en Storage o los metadatos no coinciden.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.pag_vouchers WHERE clave_archivo=p_clave_archivo) THEN
        RAISE EXCEPTION 'ARCHIVO_DUPLICADO|Este comprobante ya esta registrado.';
    END IF;

    SELECT id_moneda INTO STRICT v_moneda
      FROM public.cfg_monedas WHERE codigo='PEN' AND activo=true;
    SELECT id_estado_lote INTO STRICT v_estado_lote_reservado
      FROM public.cfg_estados_lote WHERE codigo='RESERVADO' AND activo=true;
    SELECT id_estado_reserva INTO STRICT v_estado_reserva
      FROM public.cfg_estados_reserva WHERE codigo='PENDIENTE' AND activo=true;
    SELECT id_estado_pago INTO STRICT v_estado_pago
      FROM public.cfg_estados_pago WHERE codigo='REGISTRADO' AND activo=true;
    SELECT id_estado_voucher INTO STRICT v_estado_voucher
      FROM public.cfg_estados_voucher WHERE codigo='PENDIENTE' AND activo=true;

    v_fecha := now();
    v_vencimiento := v_fecha + make_interval(days=>v_dias_politica);
    v_reserva := nextval(pg_get_serial_sequence('public.ven_reservas','id_reserva'));
    v_codigo_reserva := 'RES-'||p_lote||'-'||v_reserva;
    INSERT INTO public.ven_reservas (
        id_reserva,id_lote,id_persona,id_estado_reserva,id_moneda,codigo,
        fecha_reserva,fecha_vencimiento,monto_reserva,observaciones,id_usuario_registro
    ) OVERRIDING SYSTEM VALUE VALUES (
        v_reserva,p_lote,v_persona,v_estado_reserva,v_moneda,v_codigo_reserva,
        v_fecha,v_vencimiento,p_monto,nullif(btrim(p_observaciones),''),p_actor
    );

    v_pago := nextval(pg_get_serial_sequence('public.pag_pagos','id_pago'));
    v_codigo_pago := 'PAG-SEP-'||v_pago;
    INSERT INTO public.pag_pagos (
        id_pago,id_reserva,id_estado_pago,id_metodo_pago,id_moneda,codigo,
        monto,fecha_operacion,numero_operacion,observaciones,id_usuario_registro
    ) OVERRIDING SYSTEM VALUE VALUES (
        v_pago,v_reserva,v_estado_pago,v_metodo,v_moneda,v_codigo_pago,
        p_monto,v_fecha,nullif(btrim(p_numero_operacion),''),
        nullif(btrim(p_observaciones),''),p_actor
    );

    v_voucher := nextval(pg_get_serial_sequence('public.pag_vouchers','id_voucher'));
    v_codigo_voucher := 'VOU-SEP-'||v_voucher;
    INSERT INTO public.pag_vouchers (
        id_voucher,id_pago,id_estado_voucher,codigo,numero_version,
        nombre_archivo_original,clave_archivo,tipo_mime,tamanio_bytes,hash_sha256,
        fecha_carga,id_usuario_carga,activo
    ) OVERRIDING SYSTEM VALUE VALUES (
        v_voucher,v_pago,v_estado_voucher,v_codigo_voucher,1,
        btrim(p_nombre_archivo),p_clave_archivo,p_tipo_mime,p_tamanio_bytes,p_hash_sha256,
        v_fecha,p_actor,true
    );

    UPDATE public.inm_lotes
       SET id_estado_lote=v_estado_lote_reservado,fecha_actualizacion=now()
     WHERE id_lote=p_lote;
    INSERT INTO public.inm_lotes_historial_estado (
        id_lote,id_estado_anterior,id_estado_nuevo,motivo,fecha_cambio,id_usuario
    ) VALUES (
        p_lote,v_estado_lote_anterior,v_estado_lote_reservado,
        'Separacion pendiente de verificacion '||v_codigo_reserva,now(),p_actor
    );

    RETURN jsonb_build_object(
        'success',true,'id_reserva',v_reserva,'codigo_reserva',v_codigo_reserva,
        'id_pago',v_pago,'codigo_pago',v_codigo_pago,
        'id_voucher',v_voucher,'codigo_voucher',v_codigo_voucher,
        'id_lote',p_lote,'monto_reserva',p_monto,'fecha_reserva',v_fecha,
        'fecha_vencimiento',v_vencimiento,'estado_lote','RESERVADO',
        'estado_pago','REGISTRADO','estado_voucher','PENDIENTE',
        'message','Separacion registrada, pago pendiente de validacion por Finanzas.'
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
CREATE OR REPLACE FUNCTION public.sp_crm_registrar_venta_pendiente_v10(p_actor bigint, p_prospecto bigint, p_lote bigint, p_modalidad character varying, p_monto_total numeric, p_monto_inicial numeric, p_numero_cuotas integer, p_tasa_mensual_pct numeric, p_observaciones text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
 v_ctx jsonb;
 v_resultado jsonb;
 v_plan jsonb;
 v_id_plan bigint;
 v_reserva numeric;
 v_reserva_tras_registro numeric;
BEGIN
 -- Orden de bloqueo lote -> política activa; compatible con el registro de separaciones.
 PERFORM 1 FROM public.inm_lotes WHERE id_lote=p_lote FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'LOTE_NO_DISPONIBLE|Lote inexistente.'; END IF;
 PERFORM 1 FROM public.cfg_fin_politica_activa WHERE id=1 FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'POLITICA_NO_DISPONIBLE|No hay configuración financiera.'; END IF;
 -- La validación v7 aplica el alcance comercial, precio y titular de reserva.
 v_ctx:=public.sp_crm_validar_formalizacion_v10(
   p_actor,p_prospecto,p_lote,p_modalidad,p_monto_total,
   p_monto_inicial,p_numero_cuotas,p_tasa_mensual_pct);
 v_reserva:=(v_ctx->>'montoReservaAplicable')::numeric;
 v_plan:=v_ctx->'planFrances';

 -- La versión estable v6 registra venta y contrato pendiente de firma.
 v_resultado:=public.sp_crm_registrar_venta_pendiente_v6(
   p_actor,p_prospecto,p_lote,p_modalidad,p_monto_total,
   p_monto_inicial,p_numero_cuotas,p_observaciones);

 SELECT coalesce(r.monto_reserva,0) INTO STRICT v_reserva_tras_registro
     FROM public.ven_ventas venta
     LEFT JOIN public.ven_reservas r ON r.id_reserva=venta.id_reserva
     WHERE venta.id_venta=(v_resultado->>'idVenta')::bigint;
   IF v_reserva_tras_registro<>(v_ctx->>'montoReservaNominal')::numeric THEN
     RAISE EXCEPTION 'RESERVA_CAMBIO|La reserva cambió durante el registro; revalide la operación.';
   END IF;
   IF p_modalidad='FINANCIADA' THEN
   v_id_plan:=(v_resultado->>'idPlanPago')::bigint;
   IF v_id_plan IS NULL OR v_plan IS NULL OR v_plan='null'::jsonb THEN
     RAISE EXCEPTION 'PLAN_INCONSISTENTE|La venta financiada requiere un plan confirmado.';
   END IF;
   UPDATE public.pag_planes_pago
   SET monto_reserva_aplicada=v_reserva,
       monto_inicial=(v_ctx->>'montoInicialAdicional')::numeric,
       capital_financiado=(v_plan->>'capitalFinanciado')::numeric,
       tasa_interes_pct=round((v_ctx->'politicaFinanciera'->>'tasaNominalAnualPct')::numeric/12,6),
       monto_interes_total=(v_plan->>'interesTotal')::numeric,
       monto_total_financiado=(v_plan->>'totalCuotas')::numeric,
       descripcion_condiciones='FRANCES_POLITICA_V'||(v_ctx->>'politicaVersion')
         ||'|TNA '||(v_ctx->'politicaFinanciera'->>'tasaNominalAnualPct')
         ||'%; condiciones financieras inmovilizadas al registro',
       fecha_actualizacion=now()
   WHERE id_plan_pago=v_id_plan AND id_venta=(v_resultado->>'idVenta')::bigint;
   IF NOT FOUND THEN
      RAISE EXCEPTION 'PLAN_INCONSISTENTE|No fue posible asociar el plan francés.';
   END IF;
 END IF;
 RETURN v_resultado || jsonb_build_object(
   'montoReservaAplicable',v_reserva,'montoInicialTotal',v_ctx->'montoInicialTotal','montoInicialAdicional',v_ctx->'montoInicialAdicional',
   'saldoContado',v_ctx->'saldoContado',
   'idPolitica',v_ctx->'idPolitica','politicaVersion',v_ctx->'politicaVersion',
   'planFrances',v_plan);
END $function$;

COMMIT;
