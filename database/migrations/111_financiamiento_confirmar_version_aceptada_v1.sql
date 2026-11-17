-- SGI MONOLITHE | Bloque 2.4: versión aceptada inmutable hasta registro.
BEGIN;
CREATE OR REPLACE FUNCTION public.sp_crm_registrar_venta_pendiente_v14(p_actor bigint, p_prospecto bigint, p_lote bigint, p_modalidad character varying, p_monto_total numeric, p_monto_inicial numeric, p_numero_cuotas integer, p_tasa_mensual_pct numeric, p_observaciones text, p_datos jsonb, p_pago jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
 v_id_politica_esperada bigint;
 v_persona bigint; v_origen integer; v_doc_tipo integer; v_asignado bigint; v_nuevo_asesor bigint;
 v_nombre text; v_paterno text; v_materno text; v_email text; v_telefono text;
 v_doc text; v_tipo text; v_direccion text; v_motivo text; v_mensaje text;
 v_proyecto bigint; v_contacto_id bigint; v_doc_id bigint; v_dir_id bigint;
 v_valor text; v_verificado boolean; v_actual_tipo integer;
 v_cantidad_documentos integer;
 v_resultado jsonb; v_tipo_contacto integer;
 v_metodo text; v_id_metodo integer; v_requiere_numero boolean;
 v_numero_operacion text; v_archivos jsonb; v_archivo jsonb;
 v_key text; v_nombre_archivo text; v_mime text; v_size bigint;
 v_archivos_vistos text[]:='{}'::text[];
 v_cantidad integer; v_id_venta bigint; v_monto_objetivo numeric;
 v_estado_civil text; v_conyuge jsonb;
 v_conyuge_nombres text; v_conyuge_paterno text;
 v_conyuge_materno text; v_conyuge_telefono text;
 v_conyuge_correo text; v_conyuge_tipo text;
 v_conyuge_documento text;
 v_referencia text; v_pais text; v_departamento text;
 v_provincia text; v_distrito text;
 v_id_pais bigint; v_id_departamento bigint; v_id_provincia bigint; v_id_distrito bigint;
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.create'::varchar),false)
    OR NOT coalesce(public.fn_crm_puede_consultar_prospecto(p_actor,p_prospecto),false)
 THEN RAISE EXCEPTION 'DENEGADO|No puede registrar esta venta.'; END IF;
 IF p_pago IS NULL OR jsonb_typeof(p_pago)<>'object' THEN
   RAISE EXCEPTION 'PAGO_INVALIDO|Seleccione método de pago y adjunte los comprobantes necesarios.';
 END IF;
 v_metodo:=upper(trim(coalesce(p_pago->>'metodoPago','')));
 SELECT id_metodo_pago,requiere_numero_operacion
  INTO v_id_metodo,v_requiere_numero
 FROM public.cfg_metodos_pago WHERE codigo=v_metodo AND activo;
 IF v_id_metodo IS NULL THEN
   RAISE EXCEPTION 'METODO_PAGO_INVALIDO|Seleccione un método de pago activo.';
 END IF;
 v_numero_operacion:=trim(coalesce(p_pago->>'numeroOperacion',''));
 IF length(v_numero_operacion)>80 OR
    (v_requiere_numero AND v_numero_operacion='')
 THEN RAISE EXCEPTION 'OPERACION_REQUERIDA|Indique el número de operación del pago.';
 END IF;
 v_archivos:=p_pago->'comprobantes';
 IF v_archivos IS NULL OR jsonb_typeof(v_archivos)<>'array'
 THEN RAISE EXCEPTION 'ARCHIVOS_INVALIDOS|Se esperaba lista de comprobantes.';
 END IF;
 v_cantidad:=jsonb_array_length(v_archivos);
 IF v_cantidad>8 OR (v_metodo<>'EFECTIVO' AND v_cantidad=0)
 THEN RAISE EXCEPTION 'VOUCHER_REQUERIDO|Adjunte de 1 a 8 comprobantes, excepto si paga en efectivo.';
 END IF;
 FOR v_archivo IN SELECT value FROM jsonb_array_elements(v_archivos) LOOP
   v_key:=coalesce(v_archivo->>'claveArchivo','');
   v_nombre_archivo:=coalesce(v_archivo->>'nombreArchivo','');
   v_mime:=coalesce(v_archivo->>'tipoMime','');
   IF coalesce(v_archivo->>'tamanioBytes','') !~ '^[0-9]+$' THEN
     RAISE EXCEPTION 'ARCHIVO_INVALIDO|Tamaño de comprobante inválido.';
   END IF;
   v_size:=(v_archivo->>'tamanioBytes')::bigint;
   IF v_key !~ ('^ventas/p-'||p_prospecto::text||'/l-'||
       p_lote::text||'/[a-f0-9-]{36}\.(pdf|jpg|png|webp)$')
      OR v_nombre_archivo='' OR length(v_nombre_archivo)>255
      OR v_mime NOT IN('application/pdf','image/jpeg','image/png','image/webp')
      OR v_size<1 OR v_size>5242880 OR v_key=ANY(v_archivos_vistos)
      OR EXISTS(SELECT 1 FROM public.ven_ventas_comprobantes WHERE clave_archivo=v_key)
   THEN RAISE EXCEPTION 'ARCHIVO_INVALIDO|Referencia de comprobante inválida o duplicada.';
   END IF;
   IF NOT EXISTS (
      SELECT 1 FROM storage.objects obj WHERE obj.bucket_id='vouchers-ventas-private'
       AND obj.name=v_key AND obj.metadata->>'mimetype'=v_mime
       AND (obj.metadata->>'size') ~ '^[0-9]+$'
       AND (obj.metadata->>'size')::bigint=v_size
   ) THEN RAISE EXCEPTION 'VOUCHER_NO_CARGADO|Archivo no encontrado o distinto del enviado.';
   END IF;
   v_archivos_vistos:=array_append(v_archivos_vistos,v_key);
 END LOOP;

 IF p_datos IS NULL OR jsonb_typeof(p_datos)<>'object'
    OR (p_datos->>'idProspecto') IS DISTINCT FROM p_prospecto::text
 THEN RAISE EXCEPTION 'DATOS_COMPRADOR_REQUERIDOS|Revise los datos del cliente antes de registrar.'; END IF;
 IF p_datos->'identidadVerificada' IS DISTINCT FROM 'true'::jsonb THEN
  RAISE EXCEPTION 'IDENTIDAD_NO_VERIFICADA|Debe confirmar el cotejo del documento del comprador.';
 END IF;
 PERFORM 1 FROM public.inm_lotes WHERE id_lote=p_lote FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'LOTE_NO_DISPONIBLE|Lote inexistente.'; END IF;
 -- Esta confirmación queda vinculada exactamente a la política aceptada.
 PERFORM 1 FROM public.cfg_fin_politica_activa WHERE id=1 FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'POLITICA_NO_DISPONIBLE|No hay política activa.'; END IF;
 IF coalesce(p_pago->>'idPoliticaEsperada','') !~ '^[1-9][0-9]{0,17}$' THEN
   RAISE EXCEPTION 'POLITICA_REQUERIDA|Actualice el formulario y confirme nuevamente las condiciones.';
 END IF;
 v_id_politica_esperada:=(p_pago->>'idPoliticaEsperada')::bigint;
 IF v_id_politica_esperada IS DISTINCT FROM
      (public.fn_fin_politica_para_venta_v1(p_prospecto,p_lote)->>'idPolitica')::bigint THEN
   RAISE EXCEPTION 'POLITICA_CAMBIO|La política cambió: revise cuotas e intereses antes de confirmar.';
 END IF;
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
 v_referencia:=btrim(coalesce(p_datos->>'referencia',''));
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
    OR length(v_direccion)=0 OR length(v_direccion)>255
    OR length(v_referencia)>255 OR length(v_motivo)>150
    OR length(v_mensaje)>4000
 THEN RAISE EXCEPTION 'DATOS_COMPRADOR_INVALIDOS|Revise los datos personales, contacto y dirección del comprador.'; END IF;
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

 -- El cotejo expreso de identidad se guarda atomicamente con la venta pendiente.
 SELECT count(*) INTO v_cantidad_documentos FROM public.core_personas_documentos d
 WHERE d.id_persona=v_persona AND d.principal IS TRUE AND d.activo IS TRUE
  AND d.id_tipo_documento=v_doc_tipo AND upper(btrim(d.numero_documento))=v_doc;
 IF v_cantidad_documentos <> 1 OR EXISTS (
  SELECT 1 FROM public.core_personas_documentos d
  WHERE d.id_persona<>v_persona AND d.id_tipo_documento=v_doc_tipo
   AND upper(btrim(d.numero_documento))=v_doc
 ) THEN
  RAISE EXCEPTION 'IDENTIDAD_NO_APTA|Documento principal ambiguo, duplicado o inconsistente.';
 END IF;
 UPDATE public.core_personas_documentos SET verificado=TRUE,fecha_actualizacion=now()
 WHERE id_persona=v_persona AND principal IS TRUE AND activo IS TRUE
  AND id_tipo_documento=v_doc_tipo AND upper(btrim(numero_documento))=v_doc;

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

 -- Resolver jerarquía real desde el catálogo de ubicaciones:
 IF coalesce(p_datos->>'idPais','') !~ '^[0-9]+$'
    OR coalesce(p_datos->>'idDepartamento','') !~ '^[0-9]+$'
    OR coalesce(p_datos->>'idProvincia','') !~ '^[0-9]+$'
    OR coalesce(p_datos->>'idDistrito','') !~ '^[0-9]+$'
 THEN
   RAISE EXCEPTION 'UBICACION_INVALIDA|Seleccione país, departamento, provincia y distrito.';
 END IF;
 v_id_pais:=(p_datos->>'idPais')::bigint;
 v_id_departamento:=(p_datos->>'idDepartamento')::bigint;
 v_id_provincia:=(p_datos->>'idProvincia')::bigint;
 v_id_distrito:=(p_datos->>'idDistrito')::bigint;

 SELECT pais.nombre,dep.nombre,prov.nombre,dist.nombre
 INTO v_pais,v_departamento,v_provincia,v_distrito
 FROM public.cfg_ubicaciones_geograficas pais
 JOIN public.cfg_ubicaciones_geograficas dep
   ON dep.id_ubicacion_padre=pais.id_ubicacion
 JOIN public.cfg_ubicaciones_geograficas prov
   ON prov.id_ubicacion_padre=dep.id_ubicacion
 JOIN public.cfg_ubicaciones_geograficas dist
   ON dist.id_ubicacion_padre=prov.id_ubicacion
 WHERE pais.id_ubicacion=v_id_pais AND pais.tipo='PAIS'
   AND pais.pais_iso2='PE'
   AND dep.id_ubicacion=v_id_departamento AND dep.tipo='DEPARTAMENTO'
   AND prov.id_ubicacion=v_id_provincia AND prov.tipo='PROVINCIA'
   AND dist.id_ubicacion=v_id_distrito AND dist.tipo='DISTRITO'
   AND pais.activo AND dep.activo AND prov.activo AND dist.activo
   AND pais.estado_verificacion='VALIDADO'
   AND dep.estado_verificacion='VALIDADO'
   AND prov.estado_verificacion='VALIDADO'
   AND dist.estado_verificacion='VALIDADO';
 IF NOT FOUND THEN
   RAISE EXCEPTION 'UBICACION_INVALIDA|La ubicación no corresponde a la jerarquía seleccionada.';
 END IF;

 -- Estado civil solicitado para la preparación contractual.
 v_estado_civil:=upper(trim(coalesce(p_datos->>'estadoCivil','')));
 IF v_estado_civil NOT IN ('SOLTERO','CASADO','DIVORCIADO','VIUDO') THEN
    RAISE EXCEPTION 'ESTADO_CIVIL_INVALIDO|Seleccione un estado civil válido.';
 END IF;
 IF v_estado_civil='CASADO' THEN
    v_conyuge:=p_datos->'conyuge';
    IF v_conyuge IS NULL OR jsonb_typeof(v_conyuge)<>'object' THEN
      RAISE EXCEPTION 'CONYUGE_REQUERIDO|Complete la información del cónyuge.';
    END IF;
    v_conyuge_nombres:=trim(coalesce(v_conyuge->>'nombres',''));
    v_conyuge_paterno:=trim(coalesce(v_conyuge->>'apellidoPaterno',''));
    v_conyuge_materno:=trim(coalesce(v_conyuge->>'apellidoMaterno',''));
    v_conyuge_telefono:=trim(coalesce(v_conyuge->>'telefono',''));
    v_conyuge_correo:=lower(trim(coalesce(v_conyuge->>'correo','')));
    v_conyuge_tipo:=upper(trim(coalesce(v_conyuge->>'tipoDocumento','')));
    v_conyuge_documento:=upper(trim(coalesce(v_conyuge->>'numeroDocumento','')));
    IF v_conyuge_nombres !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
       OR length(v_conyuge_nombres)<2 OR length(v_conyuge_nombres)>120
       OR v_conyuge_paterno !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
       OR length(v_conyuge_paterno)<2 OR length(v_conyuge_paterno)>80
       OR (v_conyuge_materno<>'' AND (length(v_conyuge_materno)>80 OR
          v_conyuge_materno !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'))
       OR v_conyuge_telefono !~ '^([0-9]{7,15}|\+[1-9][0-9]{6,14})$'
       OR v_conyuge_correo !~ '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$'
       OR length(v_conyuge_correo)>180
       OR NOT (CASE v_conyuge_tipo
         WHEN 'DNI' THEN v_conyuge_documento ~ '^[0-9]{8}$'
         WHEN 'RUC' THEN v_conyuge_documento ~ '^[0-9]{11}$'
         WHEN 'CE' THEN v_conyuge_documento ~ '^[0-9]{9,12}$'
         WHEN 'PASAPORTE' THEN v_conyuge_documento ~ '^[A-Z0-9]{6,20}$'
         ELSE false END)
       OR (v_conyuge_tipo=v_tipo AND v_conyuge_documento=v_doc)
    THEN
      RAISE EXCEPTION 'CONYUGE_INVALIDO|Revise nombres, contacto y documento del cónyuge.';
    END IF;
 END IF;

 UPDATE public.core_personas SET estado_civil_codigo=v_estado_civil
  WHERE id_persona=v_persona;
 IF v_estado_civil='CASADO' THEN
   INSERT INTO public.core_personas_conyuges(
    id_persona,nombres,apellido_paterno,apellido_materno,
    telefono,correo,tipo_documento,numero_documento,activo,fecha_actualizacion)
   VALUES(v_persona,v_conyuge_nombres,v_conyuge_paterno,nullif(v_conyuge_materno,''),
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

 UPDATE public.core_personas SET nombres=v_nombre,apellido_paterno=v_paterno,
   apellido_materno=nullif(v_materno,''),fecha_actualizacion=now()
 WHERE id_persona=v_persona;

 SELECT id_persona_direccion INTO v_dir_id
 FROM public.core_personas_direcciones WHERE id_persona=v_persona AND activo
 ORDER BY principal DESC,id_persona_direccion DESC LIMIT 1 FOR UPDATE;
 IF v_dir_id IS NOT NULL THEN
   UPDATE public.core_personas_direcciones
   SET direccion=v_direccion,referencia=nullif(v_referencia,''),
       pais=v_pais,departamento=v_departamento,
       provincia=v_provincia,distrito=v_distrito,
       fecha_actualizacion=now()
   WHERE id_persona_direccion=v_dir_id;
 ELSE
   INSERT INTO public.core_personas_direcciones(
     id_persona,tipo,direccion,referencia,pais,departamento,
     provincia,distrito,principal
   ) VALUES(
     v_persona,'DOMICILIO',v_direccion,nullif(v_referencia,''),
     v_pais,v_departamento,v_provincia,v_distrito,true);
 END IF;
 UPDATE public.crm_prospectos SET id_origen_prospecto=v_origen,
   fecha_actualizacion=now() WHERE id_prospecto=p_prospecto;
 UPDATE public.crm_prospectos_intereses
   SET fecha_interes=now(),fecha_actualizacion=now()
 WHERE id_prospecto=p_prospecto AND id_proyecto=v_proyecto AND activo;
 IF NOT FOUND THEN
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
 v_resultado:=public.sp_crm_registrar_venta_pendiente_v10(
   p_actor,p_prospecto,p_lote,p_modalidad,p_monto_total,
   p_monto_inicial,p_numero_cuotas,p_tasa_mensual_pct,p_observaciones);
 -- El registro sigue siendo pendiente de auditoría; no constituye pago aprobado.
 v_id_venta:=(v_resultado->>'idVenta')::bigint;
 v_monto_objetivo:=CASE WHEN p_modalidad='FINANCIADA'
   THEN (v_resultado->>'montoInicialAdicional')::numeric
   ELSE (v_resultado->>'saldoContado')::numeric END;
 IF v_monto_objetivo IS NULL THEN
   v_monto_objetivo:=p_monto_total-coalesce((v_resultado->>'montoReservaAplicable')::numeric,0);
 END IF;
 INSERT INTO public.ven_ventas_medios_pago(
   id_venta,id_metodo_pago,numero_operacion,monto_pendiente_revision,
   tipo_abono,id_usuario_registro
 ) VALUES (v_id_venta,v_id_metodo,nullif(v_numero_operacion,''),
   v_monto_objetivo,CASE WHEN p_modalidad='FINANCIADA' THEN 'INICIAL' ELSE 'CONTADO' END,p_actor);
 FOR v_archivo IN SELECT value FROM jsonb_array_elements(v_archivos) LOOP
   INSERT INTO public.ven_ventas_comprobantes(
     id_venta,clave_archivo,nombre_archivo,tipo_mime,tamanio_bytes)
   VALUES (v_id_venta,v_archivo->>'claveArchivo',
     v_archivo->>'nombreArchivo',v_archivo->>'tipoMime',
     (v_archivo->>'tamanioBytes')::bigint);
 END LOOP;
 INSERT INTO public.crm_ventas_datos_comprador(
   id_venta,id_prospecto,id_persona,id_usuario_revision,datos_revisados
 ) VALUES(
   (v_resultado->>'idVenta')::bigint,p_prospecto,v_persona,p_actor,
   p_datos||jsonb_build_object('revisadoEn',now(),'modalidad',p_modalidad,
     'idLote',p_lote,'precioVenta',p_monto_total)
 );
 PERFORM public.sp_registrar_auditoria(
  p_actor,'CRM','VERIFICAR_IDENTIDAD_COMPRADOR','core_personas_documentos',
  v_persona::varchar,'EXITOSO',
  'Cotejo de identidad efectuado al registrar la venta pendiente.',
  jsonb_build_object('idPersona',v_persona,'idProspecto',p_prospecto,
   'idVenta',v_id_venta,'tipoDocumento',v_tipo)
 );
 RETURN v_resultado||jsonb_build_object('datosCompradorRevisados',true,'identidadVerificada',true);
END $function$;
COMMIT;
