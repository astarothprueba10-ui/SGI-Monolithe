-- SGI MONOLITHE | Correcciones personales auditadas para leads y prospectos.
-- Control de acceso: crm.edit y cartera propia; conserva documentos verificados.
CREATE TABLE IF NOT EXISTS public.crm_cambios_datos_personales (
  id_cambio bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_prospecto bigint NOT NULL REFERENCES public.crm_prospectos(id_prospecto),
  id_persona bigint NOT NULL REFERENCES public.core_personas(id_persona),
  id_usuario_actor bigint NOT NULL REFERENCES public.seg_usuarios(id_usuario),
  datos_anteriores jsonb NOT NULL,
  datos_nuevos jsonb NOT NULL,
  motivo varchar(500) NOT NULL,
  fecha_cambio timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_cambios_datos_prospecto
 ON public.crm_cambios_datos_personales(id_prospecto,fecha_cambio DESC);
ALTER TABLE public.crm_cambios_datos_personales ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.crm_cambios_datos_personales
 FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.sp_crm_datos_personales_edicion_v1(
 p_actor bigint,p_prospecto bigint
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE v_persona bigint; v_result jsonb;
BEGIN
 IF NOT coalesce(public.fn_crm_puede_consultar_prospecto(p_actor,p_prospecto),false)
 THEN RAISE EXCEPTION 'DENEGADO|No tiene acceso al prospecto.'; END IF;
 SELECT id_persona INTO STRICT v_persona FROM public.crm_prospectos
 WHERE id_prospecto=p_prospecto AND activo;
 SELECT jsonb_build_object(
    'idProspecto',p_prospecto,
    'nombres',per.nombres,
    'apellidoPaterno',coalesce(per.apellido_paterno,''),
    'apellidoMaterno',coalesce(per.apellido_materno,''),
    'tipoDocumento',coalesce(doc.tipo,'DNI'),
    'numeroDocumento',coalesce(doc.numero,''),
    'documentoVerificado',coalesce(doc.verificado,false),
    'telefono',coalesce(cel.valor,''),
    'correo',coalesce(mail.valor,''),
    'direccion',coalesce(dir.direccion,''),
    'historial',coalesce((
      SELECT jsonb_agg(jsonb_build_object(
       'id',h.id_cambio,
       'fecha',h.fecha_cambio,
       'motivo',h.motivo,
       'actor',coalesce(
          nullif(trim(concat_ws(' ',act.nombres,act.apellido_paterno,act.apellido_materno)),''),
          'Usuario interno'),
       'antes',h.datos_anteriores,'despues',h.datos_nuevos
      ) ORDER BY h.fecha_cambio DESC,h.id_cambio DESC)
      FROM (SELECT * FROM public.crm_cambios_datos_personales
        WHERE id_prospecto=p_prospecto ORDER BY fecha_cambio DESC LIMIT 50) h
      JOIN public.seg_usuarios u ON u.id_usuario=h.id_usuario_actor
      LEFT JOIN public.core_personas act ON act.id_persona=u.id_persona
    ),'[]'::jsonb)
 ) INTO v_result FROM public.core_personas per
 LEFT JOIN LATERAL (
   SELECT t.codigo tipo,d.numero_documento numero,d.verificado
   FROM public.core_personas_documentos d
   JOIN public.cfg_tipos_documento t ON t.id_tipo_documento=d.id_tipo_documento
   WHERE d.id_persona=per.id_persona AND d.activo
   ORDER BY d.principal DESC,d.id_persona_documento DESC LIMIT 1
 ) doc ON true
 LEFT JOIN LATERAL (
   SELECT c.valor FROM public.core_personas_contactos c
   JOIN public.cfg_tipos_contacto t ON t.id_tipo_contacto=c.id_tipo_contacto
   WHERE c.id_persona=per.id_persona AND c.activo AND t.codigo='EMAIL'
   ORDER BY c.principal DESC,c.id_persona_contacto DESC LIMIT 1
 ) mail ON true
 LEFT JOIN LATERAL (
   SELECT c.valor FROM public.core_personas_contactos c
   JOIN public.cfg_tipos_contacto t ON t.id_tipo_contacto=c.id_tipo_contacto
   WHERE c.id_persona=per.id_persona AND c.activo
   AND t.codigo IN ('CELULAR','WHATSAPP','TELEFONO')
   ORDER BY CASE WHEN t.codigo='CELULAR' THEN 0 WHEN t.codigo='WHATSAPP' THEN 1 ELSE 2 END,
      c.principal DESC,c.id_persona_contacto DESC LIMIT 1
 ) cel ON true
 LEFT JOIN LATERAL (
    SELECT d.direccion FROM public.core_personas_direcciones d
    WHERE d.id_persona=per.id_persona AND d.activo
    ORDER BY d.principal DESC,d.id_persona_direccion DESC LIMIT 1
 ) dir ON true
 WHERE per.id_persona=v_persona AND per.activo;
 RETURN v_result;
END $fn$;

CREATE OR REPLACE FUNCTION public.sp_crm_corregir_datos_personales_v1(
  p_actor bigint,p_prospecto bigint,p_datos jsonb,p_motivo text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE
 v_persona bigint;
 v_antes jsonb; v_despues jsonb;
 v_nombres text; v_paterno text; v_materno text;
 v_tel text; v_email text; v_dir text; v_doc text; v_tipo text;
 v_tipo_id integer; v_actual_doc_id bigint; v_actual_tipo text;
 v_actual_num text; v_verificado boolean;
 v_tel_id bigint; v_email_id bigint; v_dir_id bigint;
 v_tipo_cel integer; v_tipo_email integer;
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'crm.edit'::varchar),false)
 OR NOT coalesce(public.fn_crm_puede_consultar_prospecto(p_actor,p_prospecto),false)
 THEN RAISE EXCEPTION 'DENEGADO|No autorizado para corregir los datos de este prospecto.'; END IF;
 IF p_datos IS NULL OR jsonb_typeof(p_datos)<>'object'
 OR p_motivo IS NULL OR length(trim(p_motivo)) NOT BETWEEN 8 AND 500
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Indique los datos y el motivo de la corrección (8-500 caracteres).'; END IF;
 SELECT p.id_persona INTO STRICT v_persona
 FROM public.crm_prospectos p JOIN public.core_personas per ON per.id_persona=p.id_persona
 WHERE p.id_prospecto=p_prospecto AND p.activo AND per.activo
 FOR UPDATE OF p,per;
 -- Sólo leads y potenciales: no permitir alterar la identidad de un cliente comprador.
 IF EXISTS (
   SELECT 1 FROM public.crm_clientes c
   JOIN public.ven_ventas_clientes vc ON vc.id_cliente=c.id_cliente
   JOIN public.ven_ventas v ON v.id_venta=vc.id_venta
   WHERE c.id_persona=v_persona
 ) THEN RAISE EXCEPTION 'COMPRADOR_PROTEGIDO|Los datos de un cliente comprador se corrigen por su procedimiento contractual.'; END IF;
 v_nombres:=trim(coalesce(p_datos->>'nombres',''));
 v_paterno:=trim(coalesce(p_datos->>'apellidoPaterno',''));
 v_materno:=trim(coalesce(p_datos->>'apellidoMaterno',''));
 v_tel:=trim(coalesce(p_datos->>'telefono',''));
 v_email:=lower(trim(coalesce(p_datos->>'correo','')));
 v_dir:=trim(coalesce(p_datos->>'direccion',''));
 v_tipo:=upper(trim(coalesce(p_datos->>'tipoDocumento','')));
 v_doc:=upper(trim(coalesce(p_datos->>'numeroDocumento','')));
 IF length(v_nombres) NOT BETWEEN 2 AND 120
    OR length(v_paterno) NOT BETWEEN 2 AND 80
    OR length(v_materno)>80
    OR (length(v_nombres)+length(v_paterno)+length(v_materno))>148
    OR v_nombres !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
    OR v_paterno !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
    OR (v_materno<>'' AND v_materno !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$')
    OR v_tel !~ '^([0-9]{7,15}|\+[1-9][0-9]{6,14})$'
    OR v_email !~ '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$'
    OR length(v_email)>180 OR length(v_dir)>255
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Revise nombres, teléfono, correo y dirección.'; END IF;
 IF NOT (CASE v_tipo
  WHEN 'DNI' THEN v_doc ~ '^[0-9]{8}$'
  WHEN 'RUC' THEN v_doc ~ '^[0-9]{11}$'
  WHEN 'CE' THEN v_doc ~ '^[0-9]{9,12}$'
  WHEN 'PASAPORTE' THEN v_doc ~ '^[A-Z0-9]{6,20}$'
  ELSE false END)
 THEN RAISE EXCEPTION 'DOCUMENTO_INVALIDO|Número de documento inválido para el tipo seleccionado.'; END IF;
 SELECT id_tipo_documento INTO STRICT v_tipo_id FROM public.cfg_tipos_documento
 WHERE codigo=v_tipo AND activo;
 SELECT id_tipo_contacto INTO STRICT v_tipo_email
 FROM public.cfg_tipos_contacto WHERE codigo='EMAIL' AND activo;
 SELECT id_tipo_contacto INTO STRICT v_tipo_cel
 FROM public.cfg_tipos_contacto WHERE codigo='CELULAR' AND activo;
 v_antes:=public.sp_crm_datos_personales_edicion_v1(p_actor,p_prospecto)-'historial';

 SELECT d.id_persona_documento,td.codigo,d.numero_documento,d.verificado
 INTO v_actual_doc_id,v_actual_tipo,v_actual_num,v_verificado
 FROM public.core_personas_documentos d JOIN public.cfg_tipos_documento td
 ON td.id_tipo_documento=d.id_tipo_documento
 WHERE d.id_persona=v_persona AND d.activo
 ORDER BY d.principal DESC,d.id_persona_documento DESC LIMIT 1 FOR UPDATE OF d;
 IF (v_actual_tipo IS DISTINCT FROM v_tipo OR v_actual_num IS DISTINCT FROM v_doc)
 AND (coalesce(v_verificado,false)
   OR EXISTS (SELECT 1 FROM public.seg_usuarios WHERE id_persona=v_persona))
 THEN RAISE EXCEPTION 'IDENTIDAD_PROTEGIDA|El documento está verificado o asociado a una cuenta. Requiere validación de identidad.'; END IF;
 IF EXISTS (
  SELECT 1 FROM public.core_personas_documentos d
  WHERE d.id_tipo_documento=v_tipo_id
    AND upper(trim(d.numero_documento))=v_doc
    AND d.id_persona<>v_persona
 ) THEN RAISE EXCEPTION 'DOCUMENTO_DUPLICADO|El documento ya pertenece a otra persona.'; END IF;

 UPDATE public.core_personas SET nombres=v_nombres,
   apellido_paterno=v_paterno,apellido_materno=nullif(v_materno,''),
   fecha_actualizacion=now() WHERE id_persona=v_persona;

 IF v_actual_doc_id IS NULL THEN
  INSERT INTO public.core_personas_documentos(
   id_persona_documento,id_persona,id_tipo_documento,numero_documento,
   pais_emision,principal,verificado,activo)
  VALUES(nextval('public.core_personas_documentos_id_persona_documento_seq'),
   v_persona,v_tipo_id,v_doc,'PE',true,false,true);
 ELSIF v_actual_tipo IS DISTINCT FROM v_tipo OR v_actual_num IS DISTINCT FROM v_doc THEN
  UPDATE public.core_personas_documentos SET
   id_tipo_documento=v_tipo_id,numero_documento=v_doc,
   verificado=false,fecha_actualizacion=now()
  WHERE id_persona_documento=v_actual_doc_id;
 END IF;

 SELECT c.id_persona_contacto INTO v_email_id FROM public.core_personas_contactos c
 WHERE c.id_persona=v_persona AND c.id_tipo_contacto=v_tipo_email AND c.activo
 ORDER BY c.principal DESC,c.id_persona_contacto DESC LIMIT 1 FOR UPDATE;
 IF v_email_id IS NULL THEN
   INSERT INTO public.core_personas_contactos(
     id_persona_contacto,id_persona,id_tipo_contacto,valor,principal,verificado,activo)
   VALUES(nextval('public.core_personas_contactos_id_persona_contacto_seq'),
     v_persona,v_tipo_email,v_email,true,false,true);
 ELSE
   UPDATE public.core_personas_contactos SET valor=v_email,verificado=
    CASE WHEN lower(trim(valor))=v_email THEN verificado ELSE false END,
    fecha_actualizacion=now() WHERE id_persona_contacto=v_email_id;
 END IF;
 SELECT c.id_persona_contacto INTO v_tel_id FROM public.core_personas_contactos c
 JOIN public.cfg_tipos_contacto t ON t.id_tipo_contacto=c.id_tipo_contacto
 WHERE c.id_persona=v_persona AND t.codigo IN ('CELULAR','WHATSAPP','TELEFONO')
 AND c.activo ORDER BY c.principal DESC,c.id_persona_contacto DESC LIMIT 1 FOR UPDATE OF c;
 IF v_tel_id IS NULL THEN
   INSERT INTO public.core_personas_contactos(
    id_persona_contacto,id_persona,id_tipo_contacto,valor,principal,verificado,activo)
   VALUES(nextval('public.core_personas_contactos_id_persona_contacto_seq'),
     v_persona,v_tipo_cel,v_tel,true,false,true);
 ELSE
   UPDATE public.core_personas_contactos SET valor=v_tel,
    verificado=CASE WHEN trim(valor)=v_tel THEN verificado ELSE false END,
    fecha_actualizacion=now() WHERE id_persona_contacto=v_tel_id;
 END IF;
 SELECT id_persona_direccion INTO v_dir_id FROM public.core_personas_direcciones
 WHERE id_persona=v_persona AND activo ORDER BY principal DESC,id_persona_direccion DESC
 LIMIT 1 FOR UPDATE;
 IF v_dir_id IS NULL AND v_dir<>'' THEN
  INSERT INTO public.core_personas_direcciones(
   id_persona_direccion,id_persona,tipo,direccion,pais,principal,activo)
  VALUES(nextval('public.core_personas_direcciones_id_persona_direccion_seq'),
    v_persona,'DOMICILIO',v_dir,'Perú',true,true);
 ELSIF v_dir_id IS NOT NULL AND v_dir<>'' THEN
  UPDATE public.core_personas_direcciones SET direccion=v_dir,fecha_actualizacion=now()
  WHERE id_persona_direccion=v_dir_id;
 ELSIF v_dir_id IS NOT NULL THEN
  UPDATE public.core_personas_direcciones SET activo=false,principal=false,fecha_actualizacion=now()
  WHERE id_persona_direccion=v_dir_id;
 END IF;

 v_despues:=public.sp_crm_datos_personales_edicion_v1(p_actor,p_prospecto)-'historial';
 IF v_antes=v_despues
 THEN RAISE EXCEPTION 'SIN_CAMBIOS|No se encontraron modificaciones en la ficha.'; END IF;
 INSERT INTO public.crm_cambios_datos_personales(
  id_prospecto,id_persona,id_usuario_actor,datos_anteriores,datos_nuevos,motivo)
 VALUES (p_prospecto,v_persona,p_actor,v_antes,v_despues,trim(p_motivo));
 RETURN jsonb_build_object('actualizado',true,'idProspecto',p_prospecto,
 'datos',v_despues);
END $fn$;

REVOKE ALL ON FUNCTION public.sp_crm_datos_personales_edicion_v1(bigint,bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_datos_personales_edicion_v1(bigint,bigint)
 TO sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_crm_corregir_datos_personales_v1(bigint,bigint,jsonb,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_corregir_datos_personales_v1(bigint,bigint,jsonb,text)
 TO sigi_app_user;