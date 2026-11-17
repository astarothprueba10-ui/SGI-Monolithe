-- SGI MONOLITHE | Bloque 4/1
-- Normalización y vista previa de propuestas; publicación inicialmente DESHABILITADA.
BEGIN;
CREATE TABLE public.cfg_fin_publicacion_control (
  id integer PRIMARY KEY CHECK(id=1),
  habilitado boolean NOT NULL DEFAULT false,
  habilitado_en timestamptz,
  autorizado_por bigint REFERENCES public.seg_usuarios(id_usuario),
  justificacion text,
  CHECK ((NOT habilitado) OR (habilitado_en IS NOT NULL AND autorizado_por IS NOT NULL
      AND length(btrim(justificacion)) >= 20))
);
INSERT INTO public.cfg_fin_publicacion_control(id,habilitado) VALUES(1,false);
ALTER TABLE public.cfg_fin_publicacion_control ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.cfg_fin_publicacion_control
  FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
COMMENT ON TABLE public.cfg_fin_publicacion_control IS
  'Interruptor cerrado por defecto: activar SOLO tras prueba funcional del Bloque 3, revisión de seguridad y aprobación trazable. Prohibido conceder UPDATE al backend.';

CREATE FUNCTION public.fn_fin_normalizar_borrador_v1(p_json jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE
SET search_path TO 'pg_catalog','public','pg_temp'
AS $$
DECLARE
 v_clave text; v_sep numeric; v_min numeric; v_max numeric; v_fija numeric; v_tasa numeric;
 v_cuotas_min integer; v_cuotas_max integer; v_dias integer;
 v_modo text; v_motivo text;
BEGIN
 IF p_json IS NULL OR jsonb_typeof(p_json)<>'object' THEN
   RAISE EXCEPTION 'BORRADOR_INVALIDO|Se requiere una propuesta financiera completa.';
 END IF;
 FOR v_clave IN SELECT jsonb_object_keys(p_json) LOOP
   IF v_clave NOT IN ('montoSeparacion','modoInicial','inicialMinima','inicialMaxima','inicialFija',
     'tasaNominalAnualPct','cuotasMin','cuotasMax','diasVencimientoSeparacion',
     'sistemaAmortizacion','moneda','motivoPublicacion') THEN
     RAISE EXCEPTION 'BORRADOR_INVALIDO|La propuesta contiene un campo desconocido: %',v_clave;
   END IF;
 END LOOP;
 IF NOT (p_json ?& ARRAY['montoSeparacion','modoInicial','tasaNominalAnualPct',
       'cuotasMin','cuotasMax','diasVencimientoSeparacion','sistemaAmortizacion',
       'moneda','motivoPublicacion']) THEN
   RAISE EXCEPTION 'BORRADOR_INVALIDO|Faltan campos financieros obligatorios.';
 END IF;
 BEGIN
   v_sep := (p_json->>'montoSeparacion')::numeric;
   v_tasa := (p_json->>'tasaNominalAnualPct')::numeric;
   v_cuotas_min := (p_json->>'cuotasMin')::integer;
   v_cuotas_max := (p_json->>'cuotasMax')::integer;
   v_dias := (p_json->>'diasVencimientoSeparacion')::integer;
   v_min := CASE WHEN p_json->>'inicialMinima' IS NOT NULL THEN (p_json->>'inicialMinima')::numeric END;
   v_max := CASE WHEN p_json->>'inicialMaxima' IS NOT NULL THEN (p_json->>'inicialMaxima')::numeric END;
   v_fija := CASE WHEN p_json->>'inicialFija' IS NOT NULL THEN (p_json->>'inicialFija')::numeric END;
 EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
   RAISE EXCEPTION 'BORRADOR_INVALIDO|Formato numérico incorrecto.';
 END;
 v_modo := p_json->>'modoInicial';
 v_motivo := btrim(coalesce(p_json->>'motivoPublicacion',''));
 IF v_sep IS NULL OR v_sep<=0 OR v_sep>999999999999.99 OR v_sep<>round(v_sep,2)
    OR v_tasa IS NULL OR v_tasa<0 OR v_tasa>100 OR v_tasa<>round(v_tasa,4)
    OR v_cuotas_min NOT BETWEEN 1 AND 120 OR v_cuotas_max NOT BETWEEN v_cuotas_min AND 120
    OR v_dias NOT BETWEEN 1 AND 90
    OR v_modo NOT IN ('MINIMA','RANGO','FIJA')
    OR p_json->>'sistemaAmortizacion' IS DISTINCT FROM 'FRANCES'
    OR p_json->>'moneda' IS DISTINCT FROM 'PEN'
    OR length(v_motivo) NOT BETWEEN 12 AND 500 THEN
   RAISE EXCEPTION 'BORRADOR_INVALIDO|La propuesta no cumple las reglas financieras.';
 END IF;
 IF (v_min IS NOT NULL AND (v_min<v_sep OR v_min>999999999999.99 OR v_min<>round(v_min,2)))
    OR (v_max IS NOT NULL AND (v_max<v_sep OR v_max>999999999999.99 OR v_max<>round(v_max,2)))
    OR (v_fija IS NOT NULL AND (v_fija<v_sep OR v_fija>999999999999.99 OR v_fija<>round(v_fija,2)))
    OR NOT (
      (v_modo='MINIMA' AND v_min IS NOT NULL AND v_max IS NULL AND v_fija IS NULL)
      OR (v_modo='RANGO' AND v_min IS NOT NULL AND v_max IS NOT NULL AND v_max>=v_min AND v_fija IS NULL)
      OR (v_modo='FIJA' AND v_min IS NULL AND v_max IS NULL AND v_fija IS NOT NULL)
    ) THEN
   RAISE EXCEPTION 'BORRADOR_INVALIDO|La inicial debe respetar la modalidad y superar la separación.';
 END IF;
 RETURN jsonb_build_object(
   'montoSeparacion',v_sep,'modoInicial',v_modo,
   'inicialMinima',v_min,'inicialMaxima',v_max,'inicialFija',v_fija,
   'tasaNominalAnualPct',v_tasa,
   'cuotasMin',v_cuotas_min,'cuotasMax',v_cuotas_max,
   'diasVencimientoSeparacion',v_dias,'sistemaAmortizacion','FRANCES',
   'moneda','PEN','motivoPublicacion',v_motivo
 );
END;
$$;
CREATE FUNCTION public.fn_fin_hash_borrador_v1(p_version integer,p_normal jsonb)
RETURNS char(64) LANGUAGE plpgsql IMMUTABLE
SET search_path TO 'pg_catalog','public','pg_temp'
AS $$
BEGIN
 IF p_version IS NULL OR p_version<1 OR p_normal IS NULL THEN
   RAISE EXCEPTION 'BORRADOR_INVALIDO|Versión o contenido nulos.';
 END IF;
 RETURN encode(sha256(convert_to(p_version::text||':'||p_normal::text,'UTF8')),'hex')::char(64);
END;
$$;

CREATE FUNCTION public.fn_fin_gerencia_autorizada_v1(p_actor bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $$
 SELECT p_actor IS NOT NULL
   AND coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'financing.configure'::varchar),false)
   AND EXISTS (
     SELECT 1 FROM public.seg_usuarios u
     JOIN public.cfg_estados_usuario eu ON eu.id_estado_usuario=u.id_estado_usuario
     JOIN public.core_personas persona ON persona.id_persona=u.id_persona
     JOIN public.seg_usuarios_roles ur ON ur.id_usuario=u.id_usuario
     JOIN public.seg_roles r ON r.id_rol=ur.id_rol
     WHERE u.id_usuario=p_actor AND eu.codigo='ACTIVO' AND eu.activo AND eu.permite_acceso
       AND persona.activo AND NOT u.requiere_cambio_password
       AND (u.bloqueado_hasta IS NULL OR u.bloqueado_hasta<=now())
       AND ur.activo AND ur.fecha_revocacion IS NULL AND r.activo AND r.codigo='GERENCIA'
   );
$$;

CREATE FUNCTION public.sp_fin_previsualizar_borrador_v1(
 p_actor bigint,p_version integer,p_borrador jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $$
DECLARE
 v_actual public.cfg_fin_politicas_versiones%ROWTYPE;
 v_normal jsonb;
 v_anterior jsonb;
 v_habilitado boolean;
BEGIN
 IF NOT public.fn_fin_gerencia_autorizada_v1(p_actor) THEN
   RAISE EXCEPTION 'ACCESO_DENEGADO|Solo Gerencia activa puede evaluar políticas.';
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
$$;

REVOKE ALL ON FUNCTION public.fn_fin_normalizar_borrador_v1(jsonb),
 public.fn_fin_hash_borrador_v1(integer,jsonb),
 public.fn_fin_gerencia_autorizada_v1(bigint),
 public.sp_fin_previsualizar_borrador_v1(bigint,integer,jsonb)
 FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
GRANT EXECUTE ON FUNCTION public.sp_fin_previsualizar_borrador_v1(bigint,integer,jsonb)
 TO sigi_app_user;
-- Los auxiliares solo son invocados dentro de funciones SECURITY DEFINER.
COMMIT;
