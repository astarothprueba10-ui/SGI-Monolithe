-- SGI MONOLITHE | Configuración de Financiamiento - Bloque 1
-- Versión inicial INMUTABLE, catálogo exclusivo de Gerencia y consulta de solo lectura.
-- NO sustituye aún los motores de cálculo actuales ni habilita cambios.
-- IMPORTANTE: ninguna política podrá publicarse sin un flujo posterior de MFA + auditoría.

BEGIN;

CREATE TABLE public.cfg_fin_politicas_versiones (
  id_politica bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo varchar(32) NOT NULL DEFAULT 'GENERAL',
  version integer NOT NULL CHECK (version >= 1),
  monto_separacion numeric(14,2) NOT NULL CHECK (monto_separacion > 0),
  modo_inicial varchar(12) NOT NULL CHECK (modo_inicial IN ('MINIMA','RANGO','FIJA')),
  inicial_minima numeric(14,2) NULL CHECK (inicial_minima >= 0),
  inicial_maxima numeric(14,2) NULL CHECK (inicial_maxima >= 0),
  inicial_fija numeric(14,2) NULL CHECK (inicial_fija > 0),
  tasa_nominal_anual_pct numeric(8,4) NOT NULL CHECK (tasa_nominal_anual_pct BETWEEN 0 AND 100),
  cuotas_min integer NOT NULL CHECK (cuotas_min BETWEEN 1 AND 120),
  cuotas_max integer NOT NULL CHECK (cuotas_max BETWEEN 1 AND 120),
  dias_vencimiento_separacion integer NOT NULL CHECK (dias_vencimiento_separacion BETWEEN 1 AND 90),
  sistema_amortizacion varchar(16) NOT NULL CHECK (sistema_amortizacion = 'FRANCES'),
  moneda varchar(3) NOT NULL CHECK (moneda = 'PEN'),
  vigente_desde timestamptz NOT NULL,
  publicado_en timestamptz NOT NULL DEFAULT now(),
  id_usuario_publicador bigint NULL REFERENCES public.seg_usuarios(id_usuario),
  motivo_publicacion text NOT NULL CHECK (length(btrim(motivo_publicacion)) BETWEEN 12 AND 500),
  CONSTRAINT ck_fin_modalidad_inicial CHECK (
    (modo_inicial='MINIMA' AND inicial_minima IS NOT NULL AND inicial_maxima IS NULL AND inicial_fija IS NULL)
    OR (modo_inicial='RANGO' AND inicial_minima IS NOT NULL AND inicial_maxima IS NOT NULL
        AND inicial_maxima >= inicial_minima AND inicial_fija IS NULL)
    OR (modo_inicial='FIJA' AND inicial_minima IS NULL AND inicial_maxima IS NULL AND inicial_fija IS NOT NULL)
  ),
  CONSTRAINT ck_fin_rango_cuotas CHECK (cuotas_max >= cuotas_min),
  CONSTRAINT uk_fin_codigo_version UNIQUE (codigo,version),
  CONSTRAINT uk_fin_politica_codigo UNIQUE (id_politica,codigo)
);
COMMENT ON TABLE public.cfg_fin_politicas_versiones IS
 'Versiones financieras inmutables. El motor actual sigue fijo hasta conectar TOTP, snapshots y autorización.';
CREATE INDEX idx_fin_politicas_historial ON public.cfg_fin_politicas_versiones(codigo,version DESC);

CREATE TABLE public.cfg_fin_politica_activa (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  codigo varchar(32) NOT NULL DEFAULT 'GENERAL' CHECK (codigo = 'GENERAL'),
  id_politica bigint NOT NULL,
  actualizada_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_fin_politica_activa
    FOREIGN KEY (id_politica,codigo)
    REFERENCES public.cfg_fin_politicas_versiones(id_politica,codigo)
);
COMMENT ON TABLE public.cfg_fin_politica_activa IS
 'Puntero único de la política vigente; solo se cambiará por la operación MFA autorizada en futuras migraciones.';

ALTER TABLE public.cfg_fin_politicas_versiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cfg_fin_politica_activa ENABLE ROW LEVEL SECURITY;
-- Sin políticas de acceso directo: se consulta por una función con comprobación de rol y permiso.
REVOKE ALL ON TABLE public.cfg_fin_politicas_versiones,public.cfg_fin_politica_activa
  FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
REVOKE ALL ON SEQUENCE public.cfg_fin_politicas_versiones_id_politica_seq
  FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;

CREATE FUNCTION public.fn_fin_bloquear_version_historica_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog','public','pg_temp'
AS $$
BEGIN
 RAISE EXCEPTION 'POLITICA_INMUTABLE|Una política publicada no puede editarse ni eliminarse.';
END;
$$;
CREATE TRIGGER trg_fin_politica_version_inmutable
BEFORE UPDATE OR DELETE ON public.cfg_fin_politicas_versiones
FOR EACH ROW EXECUTE FUNCTION public.fn_fin_bloquear_version_historica_v1();

-- Versión 1: reproducción EXACTA de las condiciones que hoy valida el motor productivo.
INSERT INTO public.cfg_fin_politicas_versiones(
  codigo,version,monto_separacion,modo_inicial,inicial_minima,inicial_maxima,inicial_fija,
  tasa_nominal_anual_pct,cuotas_min,cuotas_max,dias_vencimiento_separacion,
  sistema_amortizacion,moneda,vigente_desde,motivo_publicacion
) VALUES (
  'GENERAL',1,500.00,'MINIMA',5000.00,NULL,NULL,
  10.0000,1,36,7,'FRANCES','PEN',now(),
  'Carga inicial de referencia de las condiciones financieras vigentes.'
);
INSERT INTO public.cfg_fin_politica_activa(id,codigo,id_politica)
SELECT 1,codigo,id_politica FROM public.cfg_fin_politicas_versiones
 WHERE codigo='GENERAL' AND version=1;

INSERT INTO public.seg_permisos(codigo,modulo,recurso,accion,nombre,descripcion,activo)
VALUES(
 'financing.configure','financing','financing','configure',
 'Configurar políticas de financiamiento',
 'Consulta de políticas y, tras habilitar MFA, autorización de nuevas versiones solo para Gerencia.',true
)
ON CONFLICT (codigo) DO NOTHING;

-- Función de consulta explícitamente protegida: permiso activo + rol GERENCIA activo.
-- Nunca habilita escritura ni recibe el rol declarado por el cliente.
CREATE FUNCTION public.sp_fin_consultar_politicas_v1(p_actor bigint)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $$
DECLARE
 v public.cfg_fin_politicas_versiones%ROWTYPE;
 v_historial jsonb;
BEGIN
 IF p_actor IS NULL
    OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'financing.configure'::varchar),false)
    OR NOT EXISTS(
      SELECT 1
        FROM public.seg_usuarios_roles ur
        JOIN public.seg_roles r ON r.id_rol=ur.id_rol AND r.activo
       WHERE ur.id_usuario=p_actor AND ur.activo AND ur.fecha_revocacion IS NULL
         AND r.codigo='GERENCIA'
    )
 THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO|Solo Gerencia autorizada puede consultar configuraciones financieras.';
 END IF;

 SELECT pv.* INTO v
   FROM public.cfg_fin_politica_activa pa
   JOIN public.cfg_fin_politicas_versiones pv
     ON pv.id_politica=pa.id_politica AND pv.codigo=pa.codigo
  WHERE pa.id=1 AND pa.codigo='GENERAL';

 IF NOT FOUND THEN
   RAISE EXCEPTION 'POLITICA_NO_DISPONIBLE|No existe una política financiera activa.';
 END IF;

 SELECT coalesce(jsonb_agg(jsonb_build_object(
    'idPolitica',h.id_politica,'version',h.version,
    'vigenteDesde',h.vigente_desde,'publicadoEn',h.publicado_en,
    'motivo',h.motivo_publicacion,'idPublicador',h.id_usuario_publicador
 ) ORDER BY h.version DESC),'[]'::jsonb) INTO v_historial
 FROM (
    SELECT id_politica,version,vigente_desde,publicado_en,motivo_publicacion,id_usuario_publicador
      FROM public.cfg_fin_politicas_versiones
     WHERE codigo='GENERAL'
     ORDER BY version DESC LIMIT 30
 ) h;

 RETURN jsonb_build_object(
   'codigo',v.codigo,
   'version',v.version,
   'idPolitica',v.id_politica,
   'vigenteDesde',v.vigente_desde,
   'montoSeparacion',v.monto_separacion,
   'modoInicial',v.modo_inicial,
   'inicialMinima',v.inicial_minima,
   'inicialMaxima',v.inicial_maxima,
   'inicialFija',v.inicial_fija,
   'tasaNominalAnualPct',v.tasa_nominal_anual_pct,
   'cuotasMin',v.cuotas_min,
   'cuotasMax',v.cuotas_max,
   'diasVencimientoSeparacion',v.dias_vencimiento_separacion,
   'sistemaAmortizacion',v.sistema_amortizacion,
   'moneda',v.moneda,
   'historial',v_historial,
   'publicacionHabilitada',false,
   'requiereTotp',true
 );
END;
$$;
REVOKE ALL ON FUNCTION public.fn_fin_bloquear_version_historica_v1()
  FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_fin_consultar_politicas_v1(bigint)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.sp_fin_consultar_politicas_v1(bigint) TO sigi_app_user;
COMMIT;