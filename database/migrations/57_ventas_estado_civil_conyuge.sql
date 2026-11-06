-- SGI MONOLITHE / CRM Ventas: estado civil RENIEC y datos contractuales del cónyuge.
-- Estados civiles del DNI: SOLTERO, CASADO, DIVORCIADO, VIUDO.
-- Convivencia / unión de hecho no se añade como estado civil RENIEC.
ALTER TABLE public.core_personas
  ADD COLUMN IF NOT EXISTS estado_civil_codigo varchar(12);
ALTER TABLE public.core_personas DROP CONSTRAINT IF EXISTS ck_core_personas_estado_civil;
ALTER TABLE public.core_personas ADD CONSTRAINT ck_core_personas_estado_civil
  CHECK (estado_civil_codigo IS NULL OR estado_civil_codigo IN
    ('SOLTERO','CASADO','DIVORCIADO','VIUDO'));

CREATE TABLE IF NOT EXISTS public.core_personas_conyuges (
  id_persona bigint PRIMARY KEY REFERENCES public.core_personas(id_persona),
  nombres varchar(120) NOT NULL,
  apellido_paterno varchar(80) NOT NULL,
  apellido_materno varchar(80),
  telefono varchar(18) NOT NULL,
  correo varchar(180) NOT NULL,
  tipo_documento varchar(12) NOT NULL
    CHECK (tipo_documento IN ('DNI','CE','RUC','PASAPORTE')),
  numero_documento varchar(20) NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  fecha_actualizacion timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.core_personas_conyuges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.core_personas_conyuges FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.sp_crm_datos_comprador_para_venta_v3(
  p_actor bigint, p_prospecto bigint
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE
  v_res jsonb;
  v_persona bigint;
  v_conyuge jsonb;
  v_estado text;
BEGIN
  v_res := public.sp_crm_datos_comprador_para_venta_v2(p_actor,p_prospecto);
  SELECT id_persona INTO STRICT v_persona FROM public.crm_prospectos
   WHERE id_prospecto=p_prospecto AND activo;
  SELECT estado_civil_codigo INTO v_estado FROM public.core_personas
   WHERE id_persona=v_persona;
  SELECT jsonb_build_object(
    'nombres',c.nombres, 'apellidoPaterno',c.apellido_paterno,
    'apellidoMaterno',coalesce(c.apellido_materno,''),
    'telefono',c.telefono,'correo',c.correo,
    'tipoDocumento',c.tipo_documento,'numeroDocumento',c.numero_documento)
    INTO v_conyuge FROM public.core_personas_conyuges c
   WHERE c.id_persona=v_persona AND c.activo;
  RETURN v_res||jsonb_build_object(
    'estadoCivil',v_estado,'conyuge',v_conyuge);
END $fn$;

DO $patch$
DECLARE v_def text;
BEGIN
 SELECT pg_get_functiondef(oid) INTO STRICT v_def FROM pg_proc
  WHERE pronamespace='public'::regnamespace
   AND proname='sp_crm_registrar_venta_pendiente_v11';
 IF strpos(v_def,'sp_crm_registrar_venta_pendiente_v11(')=0 THEN
  RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Version 11 no encontrada.';
 END IF;
 v_def:=replace(v_def,'sp_crm_registrar_venta_pendiente_v11(',
                      'sp_crm_registrar_venta_pendiente_v12(');
 v_def:=replace(v_def,' v_resultado jsonb; v_tipo_contacto integer;',
   ' v_resultado jsonb; v_tipo_contacto integer;
 v_estado_civil text; v_conyuge jsonb;
 v_conyuge_nombres text; v_conyuge_paterno text;
 v_conyuge_materno text; v_conyuge_telefono text;
 v_conyuge_correo text; v_conyuge_tipo text;
 v_conyuge_documento text;');
 IF strpos(v_def,' v_estado_civil text;')=0 THEN
  RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Variables de v11 modificadas.';
 END IF;

 v_def:=replace(v_def,
   ' UPDATE public.core_personas SET nombres=v_nombre,apellido_paterno=v_paterno,',
   ' -- Estado civil solicitado para la preparación contractual.
 v_estado_civil:=upper(trim(coalesce(p_datos->>''estadoCivil'','''')));
 IF v_estado_civil NOT IN (''SOLTERO'',''CASADO'',''DIVORCIADO'',''VIUDO'') THEN
    RAISE EXCEPTION ''ESTADO_CIVIL_INVALIDO|Seleccione un estado civil válido.'';
 END IF;
 IF v_estado_civil=''CASADO'' THEN
    v_conyuge:=p_datos->''conyuge'';
    IF v_conyuge IS NULL OR jsonb_typeof(v_conyuge)<>''object'' THEN
      RAISE EXCEPTION ''CONYUGE_REQUERIDO|Complete la información del cónyuge.'';
    END IF;
    v_conyuge_nombres:=trim(coalesce(v_conyuge->>''nombres'',''''));
    v_conyuge_paterno:=trim(coalesce(v_conyuge->>''apellidoPaterno'',''''));
    v_conyuge_materno:=trim(coalesce(v_conyuge->>''apellidoMaterno'',''''));
    v_conyuge_telefono:=trim(coalesce(v_conyuge->>''telefono'',''''));
    v_conyuge_correo:=lower(trim(coalesce(v_conyuge->>''correo'','''')));
    v_conyuge_tipo:=upper(trim(coalesce(v_conyuge->>''tipoDocumento'','''')));
    v_conyuge_documento:=upper(trim(coalesce(v_conyuge->>''numeroDocumento'','''')));
    IF v_conyuge_nombres !~ ''^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$''
       OR length(v_conyuge_nombres)<2 OR length(v_conyuge_nombres)>120
       OR v_conyuge_paterno !~ ''^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$''
       OR length(v_conyuge_paterno)<2 OR length(v_conyuge_paterno)>80
       OR (v_conyuge_materno<>'''' AND (length(v_conyuge_materno)>80 OR
          v_conyuge_materno !~ ''^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$''))
       OR v_conyuge_telefono !~ ''^([0-9]{7,15}|\+[1-9][0-9]{6,14})$''
       OR v_conyuge_correo !~ ''^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$''
       OR length(v_conyuge_correo)>180
       OR NOT (CASE v_conyuge_tipo
         WHEN ''DNI'' THEN v_conyuge_documento ~ ''^[0-9]{8}$''
         WHEN ''RUC'' THEN v_conyuge_documento ~ ''^[0-9]{11}$''
         WHEN ''CE'' THEN v_conyuge_documento ~ ''^[0-9]{9,12}$''
         WHEN ''PASAPORTE'' THEN v_conyuge_documento ~ ''^[A-Z0-9]{6,20}$''
         ELSE false END)
       OR (v_conyuge_tipo=v_tipo AND v_conyuge_documento=v_doc)
    THEN
      RAISE EXCEPTION ''CONYUGE_INVALIDO|Revise nombres, contacto y documento del cónyuge.'';
    END IF;
 END IF;

 UPDATE public.core_personas SET estado_civil_codigo=v_estado_civil
  WHERE id_persona=v_persona;
 IF v_estado_civil=''CASADO'' THEN
   INSERT INTO public.core_personas_conyuges(
    id_persona,nombres,apellido_paterno,apellido_materno,
    telefono,correo,tipo_documento,numero_documento,activo,fecha_actualizacion)
   VALUES(v_persona,v_conyuge_nombres,v_conyuge_paterno,nullif(v_conyuge_materno,''''),
     v_conyuge_telefono,v_conyuge_correo,v_conyuge_tipo,v_conyuge_documento,true,now())
   ON CONFLICT(id_persona) DO UPDATE SET
     nombres=excluded.nombres,apellido_paterno=excluded.apellido_paterno,
     apellido_materno=excluded.apellido_materno,telefono=excluded.telefono,
     correo=excluded.correo,tipo_documento=excluded.tipo_documento,
     numero_documento=excluded.numero_documento,activo=true,fecha_actualizacion=now();
 ELSE
   UPDATE public.core_personas_conyuges SET activo=false,fecha_actualizacion=now()
   WHERE id_persona=v_persona;
 END IF;

 UPDATE public.core_personas SET nombres=v_nombre,apellido_paterno=v_paterno,');
 IF strpos(v_def,'core_personas_conyuges')=0 THEN
  RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Inserción estado civil incompleta.';
 END IF;
 EXECUTE v_def;
END $patch$;

REVOKE ALL ON FUNCTION public.sp_crm_datos_comprador_para_venta_v3(bigint,bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_datos_comprador_para_venta_v3(bigint,bigint)
 TO sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_crm_registrar_venta_pendiente_v12(
 bigint,bigint,bigint,varchar,numeric,numeric,integer,numeric,text,jsonb)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_registrar_venta_pendiente_v12(
 bigint,bigint,bigint,varchar,numeric,numeric,integer,numeric,text,jsonb)
 TO sigi_app_user;
