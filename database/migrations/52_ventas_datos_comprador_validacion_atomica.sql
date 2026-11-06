-- SGI MONOLITHE | Revisión del comprador antes de registrar una venta.
-- No se convierten prospectos a COMPRADOR antes de formalizar contrato.
-- Los datos de core_personas, contactos, documento y crm_clientes se escriben
-- en la misma transacción que el registro pendiente. Captaciones originales
-- permanecen como evidencia histórica y se conserva snapshot contractual.
CREATE TABLE IF NOT EXISTS public.crm_ventas_datos_comprador (
  id_venta bigint PRIMARY KEY REFERENCES public.ven_ventas(id_venta),
  id_prospecto bigint NOT NULL REFERENCES public.crm_prospectos(id_prospecto),
  id_persona bigint NOT NULL REFERENCES public.core_personas(id_persona),
  id_usuario_revision bigint NOT NULL REFERENCES public.seg_usuarios(id_usuario),
  datos_revisados jsonb NOT NULL,
  fecha_revision timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_ventas_datos_comprador ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.crm_ventas_datos_comprador FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.sp_crm_datos_comprador_para_venta_v1(
  p_actor bigint,p_prospecto bigint
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $f$
DECLARE v_persona bigint; v_origen text; v_res jsonb;
BEGIN
  IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.create'::varchar),false)
     OR NOT coalesce(public.fn_crm_puede_consultar_prospecto(p_actor,p_prospecto),false)
  THEN RAISE EXCEPTION 'DENEGADO|No puede revisar los datos de este comprador.'; END IF;
  SELECT id_persona INTO STRICT v_persona FROM public.crm_prospectos
   WHERE id_prospecto=p_prospecto AND activo;
  SELECT jsonb_build_object(
    'idProspecto',p.id_prospecto,
    'nombres',per.nombres,
    'apellidoPaterno',coalesce(per.apellido_paterno,''),
    'apellidoMaterno',coalesce(per.apellido_materno,''),
    'telefono',coalesce((
      SELECT c.valor FROM public.core_personas_contactos c
      JOIN public.cfg_tipos_contacto t ON t.id_tipo_contacto=c.id_tipo_contacto
      WHERE c.id_persona=v_persona AND c.activo AND t.codigo IN ('CELULAR','TELEFONO','WHATSAPP')
      ORDER BY (t.codigo='CELULAR') DESC,c.principal DESC,c.id_persona_contacto DESC LIMIT 1),''),
    'correo',coalesce((
      SELECT c.valor FROM public.core_personas_contactos c
      JOIN public.cfg_tipos_contacto t ON t.id_tipo_contacto=c.id_tipo_contacto
      WHERE c.id_persona=v_persona AND c.activo AND t.codigo='EMAIL'
      ORDER BY c.principal DESC,c.id_persona_contacto DESC LIMIT 1),''),
    'tipoDocumento',coalesce((
      SELECT t.codigo FROM public.core_personas_documentos d
      JOIN public.cfg_tipos_documento t ON t.id_tipo_documento=d.id_tipo_documento
      WHERE d.id_persona=v_persona AND d.activo
      ORDER BY d.principal DESC,d.id_persona_documento DESC LIMIT 1),'DNI'),
    'numeroDocumento',coalesce((
      SELECT d.numero_documento FROM public.core_personas_documentos d
      WHERE d.id_persona=v_persona AND d.activo
      ORDER BY d.principal DESC,d.id_persona_documento DESC LIMIT 1),''),
    'direccion',coalesce((
      SELECT d.direccion FROM public.core_personas_direcciones d
      WHERE d.id_persona=v_persona AND d.activo
      ORDER BY d.principal DESC,d.id_persona_direccion DESC LIMIT 1),''),
    'origenCodigo',o.codigo,
    'idProyectoInteres',coalesce((
      SELECT i.id_proyecto FROM public.crm_prospectos_intereses i
      WHERE i.id_prospecto=p_prospecto AND i.activo
      ORDER BY i.fecha_interes DESC,i.id_prospecto_interes DESC LIMIT 1),0),
    'motivoContacto',coalesce((
      SELECT c.datos->>'motivoContacto' FROM public.crm_captaciones c
      WHERE c.id_prospecto=p_prospecto
      ORDER BY c.fecha_creacion DESC,c.id_captacion DESC LIMIT 1),''),
    'mensaje',coalesce((
      SELECT c.datos->>'mensaje' FROM public.crm_captaciones c
      WHERE c.id_prospecto=p_prospecto
      ORDER BY c.fecha_creacion DESC,c.id_captacion DESC LIMIT 1),coalesce(p.observaciones,'')),
    'idAsesor',(
      SELECT a.id_asesor FROM public.com_asignaciones_prospecto a
      WHERE a.id_prospecto_vigente=p_prospecto AND a.fecha_fin IS NULL
      ORDER BY a.fecha_asignacion DESC LIMIT 1)
  ) INTO v_res
  FROM public.crm_prospectos p
  JOIN public.core_personas per ON per.id_persona=p.id_persona
  JOIN public.cfg_origenes_prospecto o ON o.id_origen_prospecto=p.id_origen_prospecto
  WHERE p.id_prospecto=p_prospecto AND p.activo AND per.activo;
  RETURN v_res;
END $f$;

-- Único punto de escritura. Las comprobaciones de permisos y cartera se
-- repiten en BD aunque se salten el formulario o manipulen el navegador.
CREATE OR REPLACE FUNCTION public.sp_crm_registrar_venta_pendiente_v10(
 p_actor bigint,p_prospecto bigint,p_lote bigint,p_modalidad varchar,
 p_monto_total numeric,p_monto_inicial numeric,p_numero_cuotas integer,
 p_tasa_mensual_pct numeric,p_observaciones text,p_datos jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $f$
DECLARE
 v_persona bigint; v_origen integer; v_doc_tipo integer; v_asignado bigint; v_nuevo_asesor bigint;
 v_nombre text; v_paterno text; v_materno text; v_email text; v_telefono text;
 v_doc text; v_tipo text; v_direccion text; v_motivo text; v_mensaje text;
 v_proyecto bigint; v_contacto_id bigint; v_doc_id bigint; v_dir_id bigint;
 v_valor text; v_verificado boolean; v_actual_tipo integer;
 v_resultado jsonb; v_tipo_contacto integer;
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.create'::varchar),false)
    OR NOT coalesce(public.fn_crm_puede_consultar_prospecto(p_actor,p_prospecto),false)
 THEN RAISE EXCEPTION 'DENEGADO|No puede registrar esta venta.'; END IF;
 IF p_datos IS NULL OR jsonb_typeof(p_datos)<>'object'
    OR (p_datos->>'idProspecto') IS DISTINCT FROM p_prospecto::text
 THEN RAISE EXCEPTION 'DATOS_COMPRADOR_REQUERIDOS|Revise los datos del cliente antes de registrar.'; END IF;
 SELECT id_persona INTO STRICT v_persona FROM public.crm_prospectos
 WHERE id_prospecto=p_prospecto AND activo FOR UPDATE;
 PERFORM 1 FROM public.core_personas
 WHERE id_persona=v_persona AND activo FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'PERSONA_INVALIDA|La persona no esta activa.'; END IF;

 v_nombre:=btrim(coalesce(p_datos->>'nombres',''));
 v_paterno:=btrim(coalesce(p_datos->>'apellidoPaterno',''));
 v_materno:=btrim(coalesce(p_datos->>'apellidoMaterno',''));
 v_email:=lower(btrim(coalesce(p_datos->>'correo','')));
 v_telefono:=btrim(coalesce(p_datos->>'telefono',''));
 v_tipo:=upper(btrim(coalesce(p_datos->>'tipoDocumento','')));
 v_doc:=upper(btrim(coalesce(p_datos->>'numeroDocumento','')));
 v_direccion:=btrim(coalesce(p_datos->>'direccion',''));
 v_motivo:=btrim(coalesce(p_datos->>'motivoContacto',''));
 v_mensaje:=btrim(coalesce(p_datos->>'mensaje',''));
 IF v_nombre !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
    OR length(v_nombre)<2 OR length(v_nombre)>120
    OR v_paterno !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
    OR length(v_paterno)<2 OR length(v_paterno)>80
    OR (v_materno<>'' AND
       (v_materno !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
       OR length(v_materno)>80))
    OR length(concat_ws(' ',v_nombre,v_paterno,nullif(v_materno,'')))>150
    OR v_email !~ '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$'
    OR length(v_email)>180 OR v_telefono !~ '^([0-9]{7,15}|\+[1-9][0-9]{6,14})$'
    OR length(v_direccion)>255 OR length(v_motivo)=0 OR length(v_motivo)>150
    OR length(v_mensaje)>4000
 THEN RAISE EXCEPTION 'DATOS_COMPRADOR_INVALIDOS|Revise nombres, contacto, direccion y motivo.'; END IF;
 IF NOT (CASE v_tipo
   WHEN 'DNI' THEN v_doc ~ '^[0-9]{8}$'
   WHEN 'RUC' THEN v_doc ~ '^[0-9]{11}$'
   WHEN 'CE' THEN v_doc ~ '^[0-9]{9,12}$'
   WHEN 'PASAPORTE' THEN v_doc ~ '^[A-Z0-9]{6,20}$'
   ELSE false END)
 THEN RAISE EXCEPTION 'DOCUMENTO_INVALIDO|El documento no cumple el formato indicado.'; END IF;
 SELECT id_tipo_documento INTO v_doc_tipo FROM public.cfg_tipos_documento
 WHERE codigo=v_tipo AND activo;
 SELECT id_origen_prospecto INTO v_origen FROM public.cfg_origenes_prospecto
 WHERE codigo=p_datos->>'origenCodigo' AND activo;
 IF v_doc_tipo IS NULL OR v_origen IS NULL
 THEN RAISE EXCEPTION 'CATALOGO_INVALIDO|Documento u origen no valido.'; END IF;
 IF coalesce(p_datos->>'idProyectoInteres','') !~ '^[0-9]+$'
 THEN RAISE EXCEPTION 'PROYECTO_INVALIDO|Seleccione un proyecto.'; END IF;
 v_proyecto:=(p_datos->>'idProyectoInteres')::bigint;
 IF NOT EXISTS(SELECT 1 FROM public.inm_proyectos WHERE id_proyecto=v_proyecto AND activo)
 THEN RAISE EXCEPTION 'PROYECTO_INVALIDO|Proyecto inactivo o inexistente.'; END IF;

 -- Un cambio en documentos/contactos verificados requiere su flujo formal de evidencias.
 SELECT d.id_persona_documento,d.id_tipo_documento,d.numero_documento,d.verificado
 INTO v_doc_id,v_actual_tipo,v_valor,v_verificado
 FROM public.core_personas_documentos d
 WHERE d.id_persona=v_persona AND d.activo
 ORDER BY d.principal DESC,d.id_persona_documento DESC LIMIT 1 FOR UPDATE;
 IF v_doc_id IS NOT NULL AND
     (v_actual_tipo<>v_doc_tipo OR upper(btrim(v_valor))<>v_doc) THEN
   IF v_verificado THEN
     RAISE EXCEPTION 'DOCUMENTO_VERIFICADO|El cambio requiere revision documental con evidencias.';
   END IF;
   UPDATE public.core_personas_documentos SET
     id_tipo_documento=v_doc_tipo,numero_documento=v_doc,verificado=false,
     fecha_actualizacion=now()
   WHERE id_persona_documento=v_doc_id;
 ELSIF v_doc_id IS NULL THEN
   INSERT INTO public.core_personas_documentos(
     id_persona,id_tipo_documento,numero_documento,principal,verificado
   ) VALUES(v_persona,v_doc_tipo,v_doc,true,false);
 END IF;

 SELECT id_tipo_contacto INTO STRICT v_tipo_contacto FROM public.cfg_tipos_contacto
 WHERE codigo='EMAIL' AND activo;
 SELECT id_persona_contacto,valor,verificado INTO v_contacto_id,v_valor,v_verificado
 FROM public.core_personas_contactos
 WHERE id_persona=v_persona AND id_tipo_contacto=v_tipo_contacto AND activo
 ORDER BY principal DESC,id_persona_contacto DESC LIMIT 1 FOR UPDATE;
 IF v_contacto_id IS NOT NULL AND lower(btrim(v_valor))<>v_email THEN
   IF v_verificado THEN
     RAISE EXCEPTION 'CORREO_VERIFICADO|El cambio de correo requiere confirmacion de identidad.';
   END IF;
   UPDATE public.core_personas_contactos SET valor=v_email,verificado=false,
      fecha_actualizacion=now() WHERE id_persona_contacto=v_contacto_id;
 ELSIF v_contacto_id IS NULL THEN
   INSERT INTO public.core_personas_contactos(
     id_persona,id_tipo_contacto,valor,principal,verificado,permite_notificaciones)
   VALUES(v_persona,v_tipo_contacto,v_email,true,false,false);
 END IF;

 SELECT id_tipo_contacto INTO STRICT v_tipo_contacto FROM public.cfg_tipos_contacto
 WHERE codigo='CELULAR' AND activo;
 v_contacto_id:=NULL;v_valor:=NULL;v_verificado:=NULL;
 SELECT id_persona_contacto,valor,verificado INTO v_contacto_id,v_valor,v_verificado
 FROM public.core_personas_contactos
 WHERE id_persona=v_persona AND id_tipo_contacto=v_tipo_contacto AND activo
 ORDER BY principal DESC,id_persona_contacto DESC LIMIT 1 FOR UPDATE;
 IF v_contacto_id IS NOT NULL AND regexp_replace(v_valor,'[ ()-]','','g')<>v_telefono THEN
   IF v_verificado THEN
     RAISE EXCEPTION 'TELEFONO_VERIFICADO|El cambio de telefono requiere verificacion.';
   END IF;
   UPDATE public.core_personas_contactos SET valor=v_telefono,verificado=false,
      fecha_actualizacion=now() WHERE id_persona_contacto=v_contacto_id;
 ELSIF v_contacto_id IS NULL THEN
   INSERT INTO public.core_personas_contactos(
     id_persona,id_tipo_contacto,valor,principal,verificado,permite_notificaciones)
   VALUES(v_persona,v_tipo_contacto,v_telefono,true,false,false);
 END IF;

 UPDATE public.core_personas SET nombres=v_nombre,apellido_paterno=v_paterno,
   apellido_materno=nullif(v_materno,''),fecha_actualizacion=now()
 WHERE id_persona=v_persona;

 IF v_direccion<>'' THEN
   SELECT id_persona_direccion INTO v_dir_id
   FROM public.core_personas_direcciones WHERE id_persona=v_persona AND activo
   ORDER BY principal DESC,id_persona_direccion DESC LIMIT 1 FOR UPDATE;
   IF v_dir_id IS NOT NULL THEN
     UPDATE public.core_personas_direcciones SET direccion=v_direccion,
       fecha_actualizacion=now() WHERE id_persona_direccion=v_dir_id;
   ELSE
     INSERT INTO public.core_personas_direcciones(id_persona,tipo,direccion,principal)
       VALUES(v_persona,'DOMICILIO',v_direccion,true);
   END IF;
 END IF;
 UPDATE public.crm_prospectos SET id_origen_prospecto=v_origen,
   fecha_actualizacion=now() WHERE id_prospecto=p_prospecto;
 IF NOT EXISTS (SELECT 1 FROM public.crm_prospectos_intereses
   WHERE id_prospecto=p_prospecto AND id_proyecto=v_proyecto AND activo)
 THEN
   INSERT INTO public.crm_prospectos_intereses(id_prospecto,id_proyecto,activo)
   VALUES(p_prospecto,v_proyecto,true);
 END IF;

 SELECT id_asesor INTO v_asignado FROM public.com_asignaciones_prospecto
 WHERE id_prospecto_vigente=p_prospecto AND fecha_fin IS NULL LIMIT 1;
 IF p_datos ? 'idAsesor' AND p_datos->>'idAsesor' IS NOT NULL THEN
   IF (p_datos->>'idAsesor') !~ '^[0-9]+$'
   THEN RAISE EXCEPTION 'ASESOR_INVALIDO|Seleccione un asesor valido.'; END IF;
   v_nuevo_asesor:=(p_datos->>'idAsesor')::bigint;
   IF v_nuevo_asesor IS DISTINCT FROM v_asignado THEN
     IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'crm.edit'::varchar),false)
       OR NOT EXISTS(
         SELECT 1 FROM public.seg_usuarios_roles ur JOIN public.seg_roles r ON r.id_rol=ur.id_rol
         WHERE ur.id_usuario=p_actor AND ur.activo AND ur.fecha_revocacion IS NULL AND r.activo
           AND r.codigo IN('GERENCIA','SUPERVISOR_COMERCIAL')
       ) THEN RAISE EXCEPTION 'DENEGADO|Solo Gerencia o Supervisor comercial pueden reasignar asesor.'; END IF;
     PERFORM public.sp_crm_asignar_asesor_v3(
       p_actor,p_prospecto,v_nuevo_asesor,'Reasignacion durante validacion contractual');
   END IF;
 END IF;

 -- Crear una venta y vincular su cliente en el mismo contexto transaccional.
 v_resultado:=public.sp_crm_registrar_venta_pendiente_v9(
   p_actor,p_prospecto,p_lote,p_modalidad,p_monto_total,
   p_monto_inicial,p_numero_cuotas,p_tasa_mensual_pct,p_observaciones);
 INSERT INTO public.crm_ventas_datos_comprador(
   id_venta,id_prospecto,id_persona,id_usuario_revision,datos_revisados
 ) VALUES(
   (v_resultado->>'idVenta')::bigint,p_prospecto,v_persona,p_actor,
   p_datos||jsonb_build_object('revisadoEn',now(),'modalidad',p_modalidad,
     'idLote',p_lote,'precioVenta',p_monto_total)
 );
 RETURN v_resultado||jsonb_build_object('datosCompradorVerificados',true);
END $f$;

REVOKE ALL ON FUNCTION public.sp_crm_datos_comprador_para_venta_v1(bigint,bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_datos_comprador_para_venta_v1(bigint,bigint)
 TO sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_crm_registrar_venta_pendiente_v10(
 bigint,bigint,bigint,varchar,numeric,numeric,integer,numeric,text,jsonb)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_registrar_venta_pendiente_v10(
 bigint,bigint,bigint,varchar,numeric,numeric,integer,numeric,text,jsonb)
 TO sigi_app_user;
