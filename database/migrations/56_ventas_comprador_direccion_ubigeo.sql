-- SGI MONOLITHE | Dirección contractual completa y catálogo geográfico existente.
-- Nuevas versiones; no se alteran los SP de ventas ya registradas.

CREATE OR REPLACE FUNCTION public.sp_crm_datos_comprador_para_venta_v2(
  p_actor bigint,p_prospecto bigint
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $function$
DECLARE
  v_res jsonb;
  v_id_persona bigint;
  v_direccion record;
BEGIN
  -- v1 comprueba sales.create y alcance de cartera.
  v_res:=public.sp_crm_datos_comprador_para_venta_v1(p_actor,p_prospecto);
  IF v_res IS NULL THEN
    RAISE EXCEPTION 'PROSPECTO_NO_ENCONTRADO|No existe una ficha activa.';
  END IF;
  SELECT id_persona INTO STRICT v_id_persona
  FROM public.crm_prospectos WHERE id_prospecto=p_prospecto;

  SELECT d.direccion, d.referencia,
    pais.id_ubicacion AS id_pais,
    departamento.id_ubicacion AS id_departamento,
    provincia.id_ubicacion AS id_provincia,
    distrito.id_ubicacion AS id_distrito
  INTO v_direccion
  FROM public.core_personas_direcciones d
  LEFT JOIN public.cfg_ubicaciones_geograficas pais
    ON pais.tipo='PAIS' AND pais.activo AND pais.estado_verificacion='VALIDADO'
    AND upper(trim(pais.nombre))=upper(trim(coalesce(d.pais,'PERÚ')))
  LEFT JOIN public.cfg_ubicaciones_geograficas departamento
    ON departamento.id_ubicacion_padre=pais.id_ubicacion
    AND departamento.tipo='DEPARTAMENTO' AND departamento.activo
    AND departamento.estado_verificacion='VALIDADO'
    AND upper(trim(departamento.nombre))=upper(trim(coalesce(d.departamento,'')))
  LEFT JOIN public.cfg_ubicaciones_geograficas provincia
    ON provincia.id_ubicacion_padre=departamento.id_ubicacion
    AND provincia.tipo='PROVINCIA' AND provincia.activo
    AND provincia.estado_verificacion='VALIDADO'
    AND upper(trim(provincia.nombre))=upper(trim(coalesce(d.provincia,'')))
  LEFT JOIN public.cfg_ubicaciones_geograficas distrito
    ON distrito.id_ubicacion_padre=provincia.id_ubicacion
    AND distrito.tipo='DISTRITO' AND distrito.activo
    AND distrito.estado_verificacion='VALIDADO'
    AND upper(trim(distrito.nombre))=upper(trim(coalesce(d.distrito,'')))
  WHERE d.id_persona=v_id_persona AND d.activo
  ORDER BY d.principal DESC,d.id_persona_direccion DESC LIMIT 1;

  RETURN v_res || jsonb_build_object(
    'direccion',coalesce(v_direccion.direccion,v_res->>'direccion',''),
    'referencia',coalesce(v_direccion.referencia,''),
    'idPais',coalesce(v_direccion.id_pais,
      (SELECT id_ubicacion FROM public.cfg_ubicaciones_geograficas
       WHERE tipo='PAIS' AND pais_iso2='PE' AND activo
         AND estado_verificacion='VALIDADO' LIMIT 1)),
    'idDepartamento',v_direccion.id_departamento,
    'idProvincia',v_direccion.id_provincia,
    'idDistrito',v_direccion.id_distrito
  );
END $function$;

DO $patch$
DECLARE
  v_def text;
  v_old text;
  v_new text;
BEGIN
  SELECT pg_get_functiondef(oid) INTO STRICT v_def
  FROM pg_proc WHERE pronamespace='public'::regnamespace
    AND proname='sp_crm_registrar_venta_pendiente_v10';

  IF strpos(v_def,'sp_crm_registrar_venta_pendiente_v10(')=0 THEN
    RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|No se encontró v10.';
  END IF;

  v_def:=replace(v_def,'sp_crm_registrar_venta_pendiente_v10(',
                       'sp_crm_registrar_venta_pendiente_v11(');

  v_old:=' v_resultado jsonb; v_tipo_contacto integer;';
  v_new:=' v_resultado jsonb; v_tipo_contacto integer;
 v_referencia text; v_pais text; v_departamento text;
 v_provincia text; v_distrito text;
 v_id_pais bigint; v_id_departamento bigint; v_id_provincia bigint; v_id_distrito bigint;';
  IF strpos(v_def,v_old)=0 THEN
    RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Variables v10 modificadas.';
  END IF;
  v_def:=replace(v_def,v_old,v_new);

  v_old:=' v_direccion:=btrim(coalesce(p_datos->>''direccion'',''''));';
  v_new:=' v_direccion:=btrim(coalesce(p_datos->>''direccion'',''''));
 v_referencia:=btrim(coalesce(p_datos->>''referencia'',''''));';
  IF strpos(v_def,v_old)=0 THEN
    RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Lectura de dirección modificada.';
  END IF;
  v_def:=replace(v_def,v_old,v_new);

  v_old:='OR length(v_direccion)>255 OR length(v_motivo)=0 OR length(v_motivo)>150';
  v_new:='OR length(v_direccion)=0 OR length(v_direccion)>255
    OR length(v_referencia)>255 OR length(v_motivo)>150';
  IF strpos(v_def,v_old)=0 THEN
    RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Regla de motivo de contacto modificada.';
  END IF;
  v_def:=replace(v_def,v_old,v_new);
  v_def:=replace(v_def,
    'Revise nombres, contacto, direccion y motivo.',
    'Revise los datos personales, contacto y dirección del comprador.');

  v_old:=' UPDATE public.core_personas SET nombres=v_nombre,apellido_paterno=v_paterno,';
  v_new:=' -- Resolver jerarquía real desde el catálogo de ubicaciones:
 IF coalesce(p_datos->>''idPais'','''') !~ ''^[0-9]+$''
    OR coalesce(p_datos->>''idDepartamento'','''') !~ ''^[0-9]+$''
    OR coalesce(p_datos->>''idProvincia'','''') !~ ''^[0-9]+$''
    OR coalesce(p_datos->>''idDistrito'','''') !~ ''^[0-9]+$''
 THEN
   RAISE EXCEPTION ''UBICACION_INVALIDA|Seleccione país, departamento, provincia y distrito.'';
 END IF;
 v_id_pais:=(p_datos->>''idPais'')::bigint;
 v_id_departamento:=(p_datos->>''idDepartamento'')::bigint;
 v_id_provincia:=(p_datos->>''idProvincia'')::bigint;
 v_id_distrito:=(p_datos->>''idDistrito'')::bigint;

 SELECT pais.nombre,dep.nombre,prov.nombre,dist.nombre
 INTO v_pais,v_departamento,v_provincia,v_distrito
 FROM public.cfg_ubicaciones_geograficas pais
 JOIN public.cfg_ubicaciones_geograficas dep
   ON dep.id_ubicacion_padre=pais.id_ubicacion
 JOIN public.cfg_ubicaciones_geograficas prov
   ON prov.id_ubicacion_padre=dep.id_ubicacion
 JOIN public.cfg_ubicaciones_geograficas dist
   ON dist.id_ubicacion_padre=prov.id_ubicacion
 WHERE pais.id_ubicacion=v_id_pais AND pais.tipo=''PAIS''
   AND pais.pais_iso2=''PE''
   AND dep.id_ubicacion=v_id_departamento AND dep.tipo=''DEPARTAMENTO''
   AND prov.id_ubicacion=v_id_provincia AND prov.tipo=''PROVINCIA''
   AND dist.id_ubicacion=v_id_distrito AND dist.tipo=''DISTRITO''
   AND pais.activo AND dep.activo AND prov.activo AND dist.activo
   AND pais.estado_verificacion=''VALIDADO''
   AND dep.estado_verificacion=''VALIDADO''
   AND prov.estado_verificacion=''VALIDADO''
   AND dist.estado_verificacion=''VALIDADO'';
 IF NOT FOUND THEN
   RAISE EXCEPTION ''UBICACION_INVALIDA|La ubicación no corresponde a la jerarquía seleccionada.'';
 END IF;

 UPDATE public.core_personas SET nombres=v_nombre,apellido_paterno=v_paterno,';
  IF strpos(v_def,v_old)=0 THEN
    RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|No se localizó punto geográfico.';
  END IF;
  v_def:=replace(v_def,v_old,v_new);

  v_old:=' IF v_direccion<>'''' THEN
   SELECT id_persona_direccion INTO v_dir_id
   FROM public.core_personas_direcciones WHERE id_persona=v_persona AND activo
   ORDER BY principal DESC,id_persona_direccion DESC LIMIT 1 FOR UPDATE;
   IF v_dir_id IS NOT NULL THEN
     UPDATE public.core_personas_direcciones SET direccion=v_direccion,
       fecha_actualizacion=now() WHERE id_persona_direccion=v_dir_id;
   ELSE
     INSERT INTO public.core_personas_direcciones(id_persona,tipo,direccion,principal)
       VALUES(v_persona,''DOMICILIO'',v_direccion,true);
   END IF;
 END IF;';
  v_new:=' SELECT id_persona_direccion INTO v_dir_id
 FROM public.core_personas_direcciones WHERE id_persona=v_persona AND activo
 ORDER BY principal DESC,id_persona_direccion DESC LIMIT 1 FOR UPDATE;
 IF v_dir_id IS NOT NULL THEN
   UPDATE public.core_personas_direcciones
   SET direccion=v_direccion,referencia=nullif(v_referencia,''''),
       pais=v_pais,departamento=v_departamento,
       provincia=v_provincia,distrito=v_distrito,
       fecha_actualizacion=now()
   WHERE id_persona_direccion=v_dir_id;
 ELSE
   INSERT INTO public.core_personas_direcciones(
     id_persona,tipo,direccion,referencia,pais,departamento,
     provincia,distrito,principal
   ) VALUES(
     v_persona,''DOMICILIO'',v_direccion,nullif(v_referencia,''''),
     v_pais,v_departamento,v_provincia,v_distrito,true);
 END IF;';
  IF strpos(v_def,v_old)=0 THEN
    RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|No se localizó guardado de dirección.';
  END IF;
  v_def:=replace(v_def,v_old,v_new);
  EXECUTE v_def;
END $patch$;

REVOKE ALL ON FUNCTION public.sp_crm_datos_comprador_para_venta_v2(bigint,bigint)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_datos_comprador_para_venta_v2(bigint,bigint)
  TO sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_crm_registrar_venta_pendiente_v11(
  bigint,bigint,bigint,varchar,numeric,numeric,integer,numeric,text,jsonb
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_registrar_venta_pendiente_v11(
  bigint,bigint,bigint,varchar,numeric,numeric,integer,numeric,text,jsonb
) TO sigi_app_user;
