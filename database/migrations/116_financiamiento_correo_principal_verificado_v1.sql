-- SGI MONOLITHE | Regla MFA: usar correo principal registrado y verificado, personal o corporativo.
-- Esta migración cambia SOLAMENTE el requisito de dominio para la publicación.
-- Conserva JTI, rol GERENCIA, permiso, TOTP, hash, caducidad, auditoría y guard apagado.
-- No modifica direcciones ni estados de verificación de ninguna cuenta.
BEGIN;
CREATE OR REPLACE FUNCTION public.sp_fin_publicar_politica_v1(
  p_actor bigint, p_version_sesion bigint, p_jti text,
  p_autorizacion uuid, p_nonce uuid, p_version_esperada integer,
  p_borrador jsonb
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $$
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
      motivo_publicacion
  ) VALUES(
      'GENERAL',v_actual.version+1,
      (v_normal->>'montoSeparacion')::numeric,(v_normal->>'modoInicial')::varchar,
      (v_normal->>'inicialMinima')::numeric,(v_normal->>'inicialMaxima')::numeric,
      (v_normal->>'inicialFija')::numeric,
      (v_normal->>'tasaNominalAnualPct')::numeric,
      (v_normal->>'cuotasMin')::integer,(v_normal->>'cuotasMax')::integer,
      (v_normal->>'diasVencimientoSeparacion')::integer,
      'FRANCES','PEN',clock_timestamp(),p_actor,v_normal->>'motivoPublicacion'
  ) RETURNING id_politica INTO v_nuevo;

  UPDATE public.cfg_fin_politica_activa
    SET id_politica=v_nuevo,actualizada_en=clock_timestamp()
    WHERE id=1 AND id_politica=v_actual.id_politica;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'POLITICA_CAMBIO|La política activa fue modificada.';
  END IF;

  -- Si falla auditoría o actualización: ROLLBACK de recibo, inserción y puntero.
  SELECT public.sp_registrar_auditoria(
    p_actor,'FINANCIAMIENTO'::varchar,'POLITICA_PUBLICADA'::varchar,
    'POLITICA_FINANCIERA'::varchar,v_nuevo::varchar,'EXITOSO'::varchar,
    'Publicación de nueva política financiera bajo TOTP'::varchar,
    jsonb_build_object(
      'version_anterior',v_actual.version,'id_politica_anterior',v_actual.id_politica,
      'version_nueva',v_actual.version+1,'id_politica_nueva',v_nuevo,
      'hash_propuesta',v_hash,'id_autorizacion',p_autorizacion,
      'nonce',p_nonce,'jti',p_jti,'motivo',v_normal->>'motivoPublicacion',
      'parametros_anteriores',v_anterior,'parametros_nuevos',v_normal
    )
  ) INTO v_evento;
  IF v_evento IS NULL THEN
    RAISE EXCEPTION 'AUDITORIA_FALLIDA|No se registró la publicación.';
  END IF;
  RETURN jsonb_build_object(
    'idPolitica',v_nuevo,'version',v_actual.version+1,
    'idPoliticaAnterior',v_actual.id_politica,
    'eventoAuditoria',v_evento,'publicado',true,
    'hashPropuesta',v_hash
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sp_fin_publicar_politica_v1(
  bigint,bigint,text,uuid,uuid,integer,jsonb)
  FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
GRANT EXECUTE ON FUNCTION public.sp_fin_publicar_politica_v1(
  bigint,bigint,text,uuid,uuid,integer,jsonb) TO sigi_app_user;
COMMIT;
