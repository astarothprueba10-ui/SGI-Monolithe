-- 140 | Alta segura de cuentas bancarias receptoras para Ventas.
-- Nunca introduce cuentas DEMO, no modifica pagos, no revela números bancarios en listados.
BEGIN;

CREATE TABLE IF NOT EXISTS public.fin_cuentas_receptoras_auditoria_v1 (
 id_evento BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 id_cuenta_financiera BIGINT NOT NULL REFERENCES public.fin_cuentas_financieras(id_cuenta_financiera) ON DELETE RESTRICT,
 id_actor BIGINT NOT NULL REFERENCES public.seg_usuarios(id_usuario) ON DELETE RESTRICT,
 accion VARCHAR(30) NOT NULL CHECK(accion='CREACION_CUENTA'),
 codigo_cuenta VARCHAR(40) NOT NULL,
 tipo_cuenta VARCHAR(30) NOT NULL,
 moneda VARCHAR(5) NOT NULL,
 ultimos_cuatro CHAR(4) NOT NULL,
 fecha TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_fin_cuentas_receptoras_alta_v1
 ON public.fin_cuentas_receptoras_auditoria_v1(id_cuenta_financiera);
ALTER TABLE public.fin_cuentas_receptoras_auditoria_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fin_cuentas_receptoras_auditoria_v1 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON SEQUENCE public.fin_cuentas_receptoras_auditoria_v1_id_evento_seq FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.fn_fin_gerencia_configura_cuentas_v1(p_actor BIGINT)
 RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path TO pg_catalog,public,pg_temp
AS $fn$
 SELECT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.view'::varchar),FALSE)
  AND COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.edit'::varchar),FALSE)
  AND EXISTS(
    SELECT 1 FROM public.seg_usuarios_roles ur
    JOIN public.seg_roles r ON r.id_rol=ur.id_rol
    WHERE ur.id_usuario=p_actor AND ur.activo AND ur.fecha_revocacion IS NULL
      AND r.activo AND r.codigo='GERENCIA'
  );
$fn$;

CREATE OR REPLACE FUNCTION public.sp_fin_crear_cuenta_receptora_v1(
 p_actor BIGINT,p_nombre VARCHAR,p_banco VARCHAR,p_titular VARCHAR,
 p_numero_cuenta VARCHAR,p_cci VARCHAR,p_moneda VARCHAR DEFAULT 'PEN'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO pg_catalog,public,pg_temp
AS $fn$
DECLARE
 v_numero TEXT:=regexp_replace(coalesce(p_numero_cuenta,''),'[[:space:]-]','','g');
 v_cci TEXT:=regexp_replace(coalesce(p_cci,''),'[[:space:]-]','','g');
 v_nombre TEXT:=btrim(coalesce(p_nombre,''));
 v_banco TEXT:=btrim(coalesce(p_banco,''));
 v_titular TEXT:=btrim(coalesce(p_titular,''));
 v_tipo INT;v_moneda INT;v_cuenta BIGINT;v_codigo VARCHAR(40);
 v_ultimos CHAR(4);
BEGIN
 IF NOT public.fn_fin_gerencia_configura_cuentas_v1(p_actor)
 THEN RAISE EXCEPTION 'DENEGADO|Solo Gerencia con permisos financieros puede registrar cuentas.'; END IF;
 IF length(v_nombre) NOT BETWEEN 5 AND 120
    OR length(v_banco) NOT BETWEEN 3 AND 120
    OR length(v_titular) NOT BETWEEN 5 AND 180
    OR p_moneda NOT IN('PEN','USD')
    OR v_numero !~ '^[0-9]{8,30}$'
    OR (v_cci<>'' AND v_cci !~ '^[0-9]{20}$')
    OR v_numero ~ '^([0-9])\1+$'
    OR (v_cci<>'' AND v_cci ~ '^([0-9])\1+$')
    OR length(coalesce(p_numero_cuenta,''))>80
    OR length(coalesce(p_cci,''))>40
    OR v_nombre ~* '(demo|prueba|test)'
    OR v_banco ~* '(demo|prueba|test)'
    OR v_titular ~* '(demo|prueba|test)'
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Cuenta bancaria, titular o moneda inválidos; no se aceptan datos ficticios.'; END IF;
 SELECT id_tipo_cuenta_financiera INTO v_tipo
 FROM public.cfg_tipos_cuenta_financiera WHERE codigo='BANCO' AND activo;
 SELECT id_moneda INTO v_moneda FROM public.cfg_monedas WHERE codigo=p_moneda;
 IF v_tipo IS NULL OR v_moneda IS NULL
 THEN RAISE EXCEPTION 'CONFIGURACION|Falta moneda o tipo BANCO.'; END IF;
 -- Bloqueo de serialización de altas simultáneas con el mismo número.
 PERFORM pg_advisory_xact_lock(hashtextextended('FIN_CUENTA_RECEP:'||v_numero,0));
 IF EXISTS(
   SELECT 1 FROM public.fin_cuentas_financieras c
   WHERE regexp_replace(coalesce(c.numero_cuenta,''),'[[:space:]-]','','g')=v_numero
      OR (v_cci<>'' AND regexp_replace(coalesce(c.cci,''),'[[:space:]-]','','g')=v_cci)
 ) THEN RAISE EXCEPTION 'CUENTA_EXISTENTE|La cuenta o CCI ya están registrados.'; END IF;
 v_codigo:='FIN-REC-'||upper(left(replace(gen_random_uuid()::text,'-',''),12));
 INSERT INTO public.fin_cuentas_financieras(
  id_tipo_cuenta_financiera,id_moneda,codigo,nombre,entidad_financiera,
  numero_cuenta,cci,titular,permite_ingresos,permite_egresos,
  observaciones,activo,id_usuario_registro
 ) VALUES(
  v_tipo,v_moneda,v_codigo,v_nombre,v_banco,v_numero,nullif(v_cci,''),v_titular,
  TRUE,FALSE,'Cuenta receptora registrada y autorizada por Gerencia.',TRUE,p_actor
 ) RETURNING id_cuenta_financiera INTO v_cuenta;
 v_ultimos:=right(v_numero,4);
 INSERT INTO public.fin_cuentas_receptoras_auditoria_v1(
  id_cuenta_financiera,id_actor,accion,codigo_cuenta,tipo_cuenta,moneda,ultimos_cuatro
 ) VALUES(v_cuenta,p_actor,'CREACION_CUENTA',v_codigo,'BANCO',p_moneda,v_ultimos);
 RETURN jsonb_build_object('idCuenta',v_cuenta,'codigo',v_codigo,
  'nombre',v_nombre,'banco',v_banco,'terminaEn',v_ultimos,'moneda',p_moneda,
  'auditoriaRegistrada',TRUE);
END $fn$;

-- No cambia la política de acceso del RPC existente, solo añade datos enmascarados
-- y un permiso explicito de configuración para la pantalla de Gerencia.
CREATE OR REPLACE FUNCTION public.sp_fin_cuentas_venta_receptoras_v1(p_actor BIGINT)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO pg_catalog,public,pg_temp
AS $fn$
BEGIN
 IF NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.view'::varchar),FALSE)
 THEN RAISE EXCEPTION 'DENEGADO|Se requiere finance.view.'; END IF;
 RETURN jsonb_build_object(
  'puedeConfigurar',public.fn_fin_gerencia_configura_cuentas_v1(p_actor),
  'cuentas',COALESCE((
    SELECT jsonb_agg(jsonb_build_object('idCuenta',c.id_cuenta_financiera,
      'codigo',c.codigo,'nombre',c.nombre,'banco',c.entidad_financiera,
      'terminaEn',right(coalesce(c.numero_cuenta,''),4),
      'tipo',t.codigo,'idMoneda',c.id_moneda,'moneda',m.codigo)
      ORDER BY c.nombre)
    FROM public.fin_cuentas_financieras c
    JOIN public.cfg_tipos_cuenta_financiera t ON t.id_tipo_cuenta_financiera=c.id_tipo_cuenta_financiera
    JOIN public.cfg_monedas m ON m.id_moneda=c.id_moneda
    WHERE c.activo AND c.permite_ingresos AND c.fecha_cierre IS NULL
      AND c.codigo NOT ILIKE 'DEMO-%'
  ),'[]'::jsonb),
  'categorias',COALESCE((
    SELECT jsonb_agg(jsonb_build_object('codigo',c.codigo,'nombre',c.nombre) ORDER BY c.codigo)
    FROM public.fin_categorias c
    JOIN public.cfg_tipos_movimiento_financiero t ON t.id_tipo_movimiento_financiero=c.id_tipo_movimiento_financiero
    WHERE c.activo AND t.codigo='INGRESO'
      AND c.codigo IN('INGRESO_VENTA_LOTE','INGRESO_INICIAL_VENTA')
  ),'[]'::jsonb)
 );
END $fn$;

REVOKE ALL ON FUNCTION public.fn_fin_gerencia_configura_cuentas_v1(BIGINT) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.sp_fin_crear_cuenta_receptora_v1(BIGINT,VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.sp_fin_cuentas_venta_receptoras_v1(BIGINT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_fin_gerencia_configura_cuentas_v1(BIGINT) TO sigi_app_user;
GRANT EXECUTE ON FUNCTION public.sp_fin_crear_cuenta_receptora_v1(BIGINT,VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR) TO sigi_app_user;
GRANT EXECUTE ON FUNCTION public.sp_fin_cuentas_venta_receptoras_v1(BIGINT) TO sigi_app_user;
COMMIT;
