-- 101: Cotejo expreso de identidad en Ventas y contrato de Gerencia para crear CLIENTE.
-- No se verifican documentos historicos ni se crean usuarios automaticamente.
BEGIN;
CREATE OR REPLACE FUNCTION public.fn_seguridad_cliente_contrato_aprobado_v1(p_id_persona bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','public','pg_temp'
AS $contract$
 SELECT EXISTS (
  SELECT 1 FROM public.crm_clientes c
  JOIN public.ven_ventas_clientes vc ON vc.id_cliente=c.id_cliente
  JOIN public.ven_ventas v ON v.id_venta=vc.id_venta
  JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=v.id_estado_venta
  JOIN public.ven_contratos co ON co.id_venta=v.id_venta
  JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=co.id_estado_contrato
  JOIN public.ven_contratos_aprobaciones ap ON ap.id_contrato=co.id_contrato
  WHERE c.id_persona=p_id_persona AND c.activo IS TRUE AND vc.titular IS TRUE
   AND co.fecha_firma IS NOT NULL AND ap.firma_revisada IS TRUE
   AND ev.codigo IN ('CONTRATADA','CONFIRMADA','COMPLETADA')
   AND ec.codigo IN ('VIGENTE','FINALIZADO')
 );
$contract$;
REVOKE ALL ON FUNCTION public.fn_seguridad_cliente_contrato_aprobado_v1(bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_seguridad_cliente_contrato_aprobado_v1(bigint) TO sigi_app_user;

CREATE OR REPLACE FUNCTION public.sp_crm_registrar_venta_pendiente_v14(p_actor bigint, p_prospecto bigint, p_lote bigint, p_modalidad character varying, p_monto_total numeric, p_monto_inicial numeric, p_numero_cuotas integer, p_tasa_mensual_pct numeric, p_observaciones text, p_datos jsonb, p_pago jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
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

CREATE OR REPLACE PROCEDURE public.sp_listar_personas_sin_usuario(IN p_id_actor bigint, OUT p_resultado jsonb, OUT p_estado character varying, OUT p_mensaje character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $procedure$
BEGIN
 p_resultado := '[]'::jsonb;
 IF p_id_actor IS NULL OR NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_id_actor,'users.create'),FALSE) THEN
  p_estado := 'DENEGADO'; p_mensaje := 'No tiene permisos para crear usuarios.'; RETURN;
 END IF;

 SELECT COALESCE(jsonb_agg(x.dato ORDER BY x.nombre_completo),'[]'::jsonb)
 INTO p_resultado
 FROM (
  SELECT
   CONCAT_WS(' ',p.nombres,p.apellido_paterno,p.apellido_materno) AS nombre_completo,
   jsonb_build_object(
    'idPersona',p.id_persona,
    'nombres',p.nombres,
    'apellidoPaterno',p.apellido_paterno,
    'apellidoMaterno',p.apellido_materno,
    'nombreCompleto',CONCAT_WS(' ',p.nombres,p.apellido_paterno,p.apellido_materno),
    'correo',pc.valor,
    'correoVerificado',COALESCE(pc.verificado,FALSE),
    'tipoPersona',rel.tipo_persona,
    'relaciones',rel.relaciones,
    'elegible',(p.activo IS TRUE AND COALESCE(apto.documento_listo,FALSE)),
    'tipoDocumento',doc.codigo,
    'numeroDocumento',UPPER(BTRIM(doc.numero_documento)),
    'documentoVerificado',COALESCE(doc.verificado,FALSE),
    'contratoAprobado',CASE WHEN rel.tipo_persona='CLIENTE'
     THEN public.fn_seguridad_cliente_contrato_aprobado_v1(p.id_persona)
     ELSE NULL END,
    'documentoActivo',COALESCE(doc.activo,FALSE),
    'documentoListo',COALESCE(apto.documento_listo,FALSE)
   ) AS dato
  FROM public.core_personas p
  LEFT JOIN LATERAL (
    SELECT c.valor,c.verificado
    FROM public.core_personas_contactos c
    JOIN public.cfg_tipos_contacto tc ON tc.id_tipo_contacto=c.id_tipo_contacto
    WHERE c.id_persona=p.id_persona AND tc.codigo='EMAIL' AND tc.activo IS TRUE
      AND c.principal IS TRUE AND c.activo IS TRUE
    ORDER BY c.id_persona_contacto DESC LIMIT 1
  ) pc ON TRUE
  LEFT JOIN LATERAL (
    SELECT d.id_persona_documento,d.numero_documento,d.activo,d.verificado,
      d.fecha_emision,d.fecha_vencimiento,t.codigo,t.activo AS tipo_activo,
      t.longitud_minima,t.longitud_maxima,t.solo_numerico
    FROM public.core_personas_documentos d
    JOIN public.cfg_tipos_documento t ON t.id_tipo_documento=d.id_tipo_documento
    WHERE d.id_persona=p.id_persona AND d.principal IS TRUE
    ORDER BY d.id_persona_documento DESC LIMIT 1
  ) doc ON TRUE
  CROSS JOIN LATERAL (
    SELECT
     CASE
      WHEN EXISTS(SELECT 1 FROM public.crm_clientes c WHERE c.id_persona=p.id_persona)
       THEN 'CLIENTE'
      WHEN EXISTS(SELECT 1 FROM public.rrhh_trabajadores t WHERE t.id_persona=p.id_persona)
       THEN 'TRABAJADOR'
      ELSE 'SIN_RELACION'
     END AS tipo_persona,
     to_jsonb(array_remove(ARRAY[
       CASE WHEN EXISTS(SELECT 1 FROM public.crm_clientes c WHERE c.id_persona=p.id_persona AND c.activo IS TRUE)
         THEN 'CLIENTE'::text ELSE NULL::text END,
       CASE WHEN EXISTS(SELECT 1 FROM public.rrhh_trabajadores t WHERE t.id_persona=p.id_persona)
         THEN 'TRABAJADOR'::text ELSE NULL::text END
     ], NULL)) AS relaciones
  ) rel
  CROSS JOIN LATERAL (
    SELECT (
      p.activo IS TRUE AND doc.id_persona_documento IS NOT NULL
      AND doc.activo IS TRUE AND doc.tipo_activo IS TRUE
      AND doc.codigo IN ('DNI','CE','RUC','PASAPORTE')
      AND doc.longitud_minima IS NOT NULL AND doc.longitud_maxima IS NOT NULL
      AND doc.solo_numerico IS NOT NULL
      AND CHAR_LENGTH(UPPER(BTRIM(doc.numero_documento)))
          BETWEEN doc.longitud_minima AND doc.longitud_maxima
      AND (
       (doc.solo_numerico IS TRUE AND UPPER(BTRIM(doc.numero_documento)) ~ '^[0-9]+$')
       OR (doc.solo_numerico IS FALSE AND UPPER(BTRIM(doc.numero_documento)) ~ '^[A-Z0-9]+$')
      )
      AND public.fn_login_corporativo_valido(UPPER(BTRIM(doc.numero_documento))::VARCHAR)
      AND (doc.fecha_emision IS NULL OR doc.fecha_emision <= CURRENT_DATE)
      AND (doc.fecha_vencimiento IS NULL OR doc.fecha_vencimiento >= CURRENT_DATE)
      AND NOT EXISTS (
       SELECT 1 FROM public.seg_usuarios u2
       WHERE UPPER(BTRIM(u2.usuario_login))=UPPER(BTRIM(doc.numero_documento))
      )
      AND public.fn_seguridad_acceso_laboral_permitido(p.id_persona)
      AND (
       (rel.tipo_persona='CLIENTE' AND doc.verificado IS TRUE
        AND public.fn_seguridad_cliente_contrato_aprobado_v1(p.id_persona)
        AND EXISTS(SELECT 1 FROM public.crm_clientes c
          WHERE c.id_persona=p.id_persona AND c.activo IS TRUE))
       OR
       (rel.tipo_persona='TRABAJADOR' AND EXISTS(
         SELECT 1 FROM public.rrhh_trabajadores t
         JOIN public.cfg_estados_trabajador et
           ON et.id_estado_trabajador=t.id_estado_trabajador
         WHERE t.id_persona=p.id_persona
           AND et.codigo='ACTIVO' AND et.activo IS TRUE
       ))
      )
    ) AS documento_listo
  ) apto
  WHERE p.activo IS TRUE
   AND NOT EXISTS (SELECT 1 FROM public.seg_usuarios u WHERE u.id_persona=p.id_persona)
 ) x;
 p_estado := 'OK'; p_mensaje := 'Personas disponibles consultadas correctamente.';
END;
$procedure$;

CREATE OR REPLACE PROCEDURE public.sp_crear_usuario_seguridad(IN p_id_actor bigint, IN p_id_persona bigint, IN p_usuario_login character varying, IN p_password_hash character varying, OUT p_id_usuario bigint, OUT p_estado character varying, OUT p_mensaje character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $procedure$
DECLARE
 v_login VARCHAR(120);
 v_tipo_documento VARCHAR(40);
 v_longitud_minima INTEGER;
 v_longitud_maxima INTEGER;
 v_solo_numerico BOOLEAN;
 v_cantidad_documentos INTEGER;
 v_id_estado_inactivo INTEGER;
 v_tipo_persona VARCHAR(20);
 v_id_rol_cliente INTEGER;
BEGIN
 p_id_usuario := NULL; p_estado := 'INVALIDO'; p_mensaje := 'No fue posible crear la cuenta.';
 IF p_id_actor IS NULL OR NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_id_actor,'users.create'),FALSE) THEN
  p_estado := 'DENEGADO'; p_mensaje := 'No posee permiso para crear usuarios.'; RETURN;
 END IF;

 PERFORM 1 FROM public.core_personas p
 WHERE p.id_persona=p_id_persona AND p.activo IS TRUE FOR SHARE;
 IF NOT FOUND THEN
  p_estado:='PERSONA_INVALIDA';p_mensaje:='La persona no existe o se encuentra inactiva.';RETURN;
 END IF;
 IF EXISTS(SELECT 1 FROM public.seg_usuarios WHERE id_persona=p_id_persona) THEN
  p_estado:='PERSONA_CON_USUARIO';p_mensaje:='La persona ya posee una cuenta de acceso.';RETURN;
 END IF;

 -- Si la persona es cliente y trabajador, aplica la politica documental de cliente.
 IF EXISTS(SELECT 1 FROM public.crm_clientes c WHERE c.id_persona=p_id_persona) THEN
  v_tipo_persona:='CLIENTE';
  PERFORM 1 FROM public.crm_clientes c
  WHERE c.id_persona=p_id_persona AND c.activo IS TRUE FOR SHARE;
  IF NOT FOUND THEN
   p_estado:='PERSONA_NO_ELEGIBLE';p_mensaje:='El cliente no se encuentra activo.';RETURN;
  END IF;
  SELECT id_rol INTO v_id_rol_cliente
  FROM public.seg_roles WHERE codigo='CLIENTE' AND activo IS TRUE;
  IF v_id_rol_cliente IS NULL THEN
   p_estado:='CONFIGURACION_INVALIDA';p_mensaje:='No existe el rol CLIENTE activo.';RETURN;
  END IF;
  IF NOT public.fn_seguridad_cliente_contrato_aprobado_v1(p_id_persona) THEN
   p_estado:='CONTRATO_PENDIENTE';p_mensaje:='Se requiere contrato firmado y aprobado por Gerencia.';RETURN;
  END IF;
 ELSIF EXISTS(SELECT 1 FROM public.rrhh_trabajadores t WHERE t.id_persona=p_id_persona) THEN
  v_tipo_persona:='TRABAJADOR';
  PERFORM 1 FROM public.rrhh_trabajadores t
  JOIN public.cfg_estados_trabajador et ON et.id_estado_trabajador=t.id_estado_trabajador
  WHERE t.id_persona=p_id_persona AND et.codigo='ACTIVO' AND et.activo IS TRUE
  FOR SHARE OF t;
  IF NOT FOUND THEN
   p_estado:='ESTADO_LABORAL_NO_APTO';p_mensaje:='El trabajador debe encontrarse ACTIVO.';RETURN;
  END IF;
 ELSE
  p_estado:='PERSONA_NO_ELEGIBLE';
  p_mensaje:='La persona no pertenece a Trabajadores ni Clientes.'; RETURN;
 END IF;

 IF NOT public.fn_seguridad_acceso_laboral_permitido(p_id_persona) THEN
  p_estado:='ESTADO_LABORAL_NO_APTO';p_mensaje:='El estado laboral impide crear la cuenta.';RETURN;
 END IF;

 SELECT COUNT(*) INTO v_cantidad_documentos
 FROM public.core_personas_documentos d
 JOIN public.cfg_tipos_documento t ON t.id_tipo_documento=d.id_tipo_documento
 WHERE d.id_persona=p_id_persona AND d.principal IS TRUE AND d.activo IS TRUE
  AND (v_tipo_persona='TRABAJADOR' OR d.verificado IS TRUE)
  AND t.activo IS TRUE AND t.codigo IN ('DNI','CE','RUC','PASAPORTE')
  AND (d.fecha_emision IS NULL OR d.fecha_emision <= CURRENT_DATE)
  AND (d.fecha_vencimiento IS NULL OR d.fecha_vencimiento >= CURRENT_DATE);

 IF v_cantidad_documentos=0 THEN
  p_estado:='DOCUMENTO_NO_APTO';
  p_mensaje:='La persona requiere un documento principal activo y valido.';RETURN;
 ELSIF v_cantidad_documentos>1 THEN
  p_estado:='DOCUMENTO_AMBIGUO';
  p_mensaje:='La persona tiene mas de un documento principal apto.';RETURN;
 END IF;

 SELECT UPPER(BTRIM(d.numero_documento)),t.codigo,t.longitud_minima,t.longitud_maxima,t.solo_numerico
 INTO v_login,v_tipo_documento,v_longitud_minima,v_longitud_maxima,v_solo_numerico
 FROM public.core_personas_documentos d
 JOIN public.cfg_tipos_documento t ON t.id_tipo_documento=d.id_tipo_documento
 WHERE d.id_persona=p_id_persona AND d.principal IS TRUE AND d.activo IS TRUE
  AND (v_tipo_persona='TRABAJADOR' OR d.verificado IS TRUE)
  AND t.activo IS TRUE AND t.codigo IN ('DNI','CE','RUC','PASAPORTE')
  AND (d.fecha_emision IS NULL OR d.fecha_emision <= CURRENT_DATE)
  AND (d.fecha_vencimiento IS NULL OR d.fecha_vencimiento >= CURRENT_DATE)
 FOR SHARE OF d;

 IF v_login IS NULL OR v_longitud_minima IS NULL OR v_longitud_maxima IS NULL
  OR v_solo_numerico IS NULL OR CHAR_LENGTH(v_login) NOT BETWEEN v_longitud_minima AND v_longitud_maxima THEN
  p_estado:='DOCUMENTO_INVALIDO';p_mensaje:='El numero de documento no cumple la longitud configurada.';RETURN;
 END IF;
 IF (v_solo_numerico IS TRUE AND v_login !~ '^[0-9]+$')
  OR (v_solo_numerico IS FALSE AND v_login !~ '^[A-Z0-9]+$') THEN
  p_estado:='DOCUMENTO_INVALIDO';p_mensaje:='El documento contiene caracteres no permitidos.';RETURN;
 END IF;
 IF NOT public.fn_login_corporativo_valido(v_login) THEN
  p_estado:='DOCUMENTO_INVALIDO';p_mensaje:='El documento no cumple el formato de acceso.';RETURN;
 END IF;
 IF NULLIF(BTRIM(p_usuario_login),'') IS NOT NULL
  AND UPPER(BTRIM(p_usuario_login))<>v_login THEN
  p_estado:='LOGIN_DOCUMENTO_NO_COINCIDE';
  p_mensaje:='El identificador de acceso debe coincidir con el documento principal de la persona.';RETURN;
 END IF;
 IF EXISTS(SELECT 1 FROM public.seg_usuarios u WHERE UPPER(BTRIM(u.usuario_login))=v_login) THEN
  p_estado:='LOGIN_EXISTENTE';p_mensaje:='Este numero de documento ya esta asociado a una cuenta de usuario.';RETURN;
 END IF;
 IF p_password_hash IS NULL OR p_password_hash !~ '^[$]2[aby][$][0-9]{2}[$][./A-Za-z0-9]{53}$' THEN
  p_estado:='PASSWORD_HASH_INVALIDO';
  p_mensaje:='La contraseña debe llegar codificada de forma segura.';RETURN;
 END IF;

 SELECT id_estado_usuario INTO v_id_estado_inactivo FROM public.cfg_estados_usuario
 WHERE codigo='INACTIVO' AND activo IS TRUE LIMIT 1;
 IF v_id_estado_inactivo IS NULL THEN
  p_estado:='CONFIGURACION_INVALIDA';
  p_mensaje:='No existe el estado INACTIVO para usuarios.';RETURN;
 END IF;

 BEGIN
  INSERT INTO public.seg_usuarios (
    id_persona,id_estado_usuario,usuario_login,password_hash,
    requiere_cambio_password,intentos_fallidos,bloqueado_hasta,password_actualizado_en
  ) VALUES (
    p_id_persona,v_id_estado_inactivo,v_login,p_password_hash,
    TRUE,0,NULL,timezone('utc'::text,NOW())
  ) RETURNING id_usuario INTO p_id_usuario;
 EXCEPTION WHEN unique_violation THEN
  p_id_usuario:=NULL;p_estado:='CONFLICTO';
  p_mensaje:='La persona o documento ya posee una cuenta registrada.';RETURN;
 END;

 -- Un cliente siempre recibe CLIENTE incluso si se invoca SQL fuera del frontend.
 IF v_tipo_persona='CLIENTE' THEN
  INSERT INTO public.seg_usuarios_roles(
    id_usuario,id_rol,fecha_asignacion,fecha_revocacion,activo,asignado_por
  ) VALUES(
    p_id_usuario,v_id_rol_cliente,timezone('utc'::text,NOW()),NULL,TRUE,p_id_actor
  )
  ON CONFLICT (id_usuario,id_rol) DO UPDATE
  SET activo=TRUE,fecha_revocacion=NULL,fecha_asignacion=timezone('utc'::text,NOW()),asignado_por=p_id_actor;

  PERFORM public.sp_registrar_auditoria(
   p_id_actor,'SEGURIDAD','ASIGNAR_ROL','seg_usuarios_roles',p_id_usuario::VARCHAR,
   'EXITOSO','Rol CLIENTE asignado automaticamente por vinculacion de cliente.',
   jsonb_build_object('id_usuario',p_id_usuario,'rol','CLIENTE','asignacionAutomatica',TRUE)
  );
 END IF;

 PERFORM public.sp_registrar_auditoria(
  p_id_actor,'SEGURIDAD','CREAR_USUARIO','seg_usuarios',p_id_usuario::VARCHAR,
  'EXITOSO','Cuenta creada con identificador documental en estado INACTIVO.',
  jsonb_build_object('id_persona',p_id_persona,'usuario_login',v_login,'tipo_documento',v_tipo_documento)
 );
 p_estado:='CREADO';p_mensaje:='Usuario creado correctamente en estado INACTIVO.';
END;
$procedure$;

CREATE OR REPLACE PROCEDURE public.sp_activar_usuario_seguridad(IN p_id_actor bigint, IN p_id_usuario bigint, IN p_password_hash character varying, IN p_password_temporal_expira_en timestamp with time zone, OUT p_usuario_login character varying, OUT p_correo character varying, OUT p_estado character varying, OUT p_mensaje character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $procedure$
DECLARE
 v_id_estado_activo integer;
 v_codigo_estado_actual varchar(40);
 v_usuario_login varchar(120);
 v_correo varchar(180);
 v_id_persona bigint;
 v_tipo_persona varchar(20);
 v_cantidad_documentos integer;
 v_numero_documento text;
 v_tipo_documento varchar(40);
 v_longitud_minima integer;
 v_longitud_maxima integer;
 v_solo_numerico boolean;
BEGIN
 p_usuario_login:=NULL; p_correo:=NULL; p_estado:='INVALIDO';
 p_mensaje:='No fue posible activar el usuario.';
 IF NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_id_actor,'users.activate'),FALSE) THEN
  p_estado:='DENEGADO'; p_mensaje:='No tiene permisos para activar usuarios.'; RETURN;
 END IF;

 SELECT u.id_persona,u.usuario_login,e.codigo
 INTO v_id_persona,v_usuario_login,v_codigo_estado_actual
 FROM public.seg_usuarios u
 JOIN public.cfg_estados_usuario e ON e.id_estado_usuario=u.id_estado_usuario
 WHERE u.id_usuario=p_id_usuario FOR UPDATE OF u;
 IF NOT FOUND THEN
  p_estado:='USUARIO_NO_ENCONTRADO'; p_mensaje:='El usuario indicado no existe.'; RETURN;
 END IF;
 IF NOT COALESCE(public.fn_usuario_objetivo_gestionable(p_id_actor,p_id_usuario),FALSE) THEN
  p_estado:='DENEGADO'; p_mensaje:='No tiene permisos para gestionar este usuario.'; RETURN;
 END IF;
 IF v_codigo_estado_actual='ACTIVO' THEN
  p_estado:='YA_ACTIVO'; p_mensaje:='El usuario ya se encuentra activo.'; RETURN;
 END IF;

 IF NOT EXISTS(
  SELECT 1 FROM public.seg_usuarios_roles ur
  JOIN public.seg_roles r ON r.id_rol=ur.id_rol
  WHERE ur.id_usuario=p_id_usuario AND ur.activo IS TRUE AND r.activo IS TRUE
 ) THEN
  p_estado:='SIN_ROL'; p_mensaje:='Debe asignarse al menos un rol antes de activar el usuario.'; RETURN;
 END IF;

 -- Relacion CRM prevalece cuando tambien existe vinculacion laboral.
 IF EXISTS(SELECT 1 FROM public.crm_clientes c WHERE c.id_persona=v_id_persona) THEN
  v_tipo_persona:='CLIENTE';
  PERFORM 1 FROM public.crm_clientes c
  WHERE c.id_persona=v_id_persona AND c.activo IS TRUE FOR SHARE;
  IF NOT FOUND THEN
   p_estado:='PERSONA_NO_ELEGIBLE'; p_mensaje:='El cliente no se encuentra activo.'; RETURN;
  END IF;
  IF NOT EXISTS(
   SELECT 1 FROM public.seg_usuarios_roles ur
   JOIN public.seg_roles r ON r.id_rol=ur.id_rol
   WHERE ur.id_usuario=p_id_usuario
     AND ur.activo IS TRUE AND r.activo IS TRUE AND r.codigo='CLIENTE'
  ) THEN
   p_estado:='ROL_CLIENTE_OBLIGATORIO';
   p_mensaje:='La persona vinculada a CRM debe conservar el rol CLIENTE.'; RETURN;
  END IF;
  IF NOT public.fn_seguridad_cliente_contrato_aprobado_v1(v_id_persona) THEN
   p_estado:='CONTRATO_PENDIENTE';p_mensaje:='Firma contractual no aprobada por Gerencia.';RETURN;
  END IF;
 ELSIF EXISTS(SELECT 1 FROM public.rrhh_trabajadores t WHERE t.id_persona=v_id_persona) THEN
  v_tipo_persona:='TRABAJADOR';
  PERFORM 1 FROM public.rrhh_trabajadores t
  JOIN public.cfg_estados_trabajador e ON e.id_estado_trabajador=t.id_estado_trabajador
  WHERE t.id_persona=v_id_persona AND e.codigo='ACTIVO' AND e.activo IS TRUE
  FOR SHARE OF t;
  IF NOT FOUND THEN
   p_estado:='ESTADO_LABORAL_NO_APTO';
   p_mensaje:='El trabajador debe encontrarse ACTIVO.'; RETURN;
  END IF;
 ELSE
  p_estado:='PERSONA_NO_ELEGIBLE';
  p_mensaje:='La persona no pertenece a Trabajadores ni Clientes.'; RETURN;
 END IF;

 IF NOT public.fn_seguridad_acceso_laboral_permitido(v_id_persona) THEN
  p_estado:='ESTADO_LABORAL_NO_APTO';
  p_mensaje:='El estado laboral impide activar la cuenta.'; RETURN;
 END IF;

 SELECT COUNT(*) INTO v_cantidad_documentos
 FROM public.core_personas_documentos d
 JOIN public.cfg_tipos_documento t ON t.id_tipo_documento=d.id_tipo_documento
 WHERE d.id_persona=v_id_persona AND d.principal IS TRUE AND d.activo IS TRUE
   AND (v_tipo_persona='TRABAJADOR' OR d.verificado IS TRUE)
   AND t.activo IS TRUE AND t.codigo IN ('DNI','CE','RUC','PASAPORTE')
   AND (d.fecha_emision IS NULL OR d.fecha_emision<=CURRENT_DATE)
   AND (d.fecha_vencimiento IS NULL OR d.fecha_vencimiento>=CURRENT_DATE);
 IF v_cantidad_documentos<>1 THEN
  p_estado:='DOCUMENTO_NO_APTO';
  p_mensaje:='Se requiere un unico documento principal activo y valido segun la vinculacion.'; RETURN;
 END IF;

 SELECT UPPER(BTRIM(d.numero_documento)),t.codigo,t.longitud_minima,
        t.longitud_maxima,t.solo_numerico
 INTO v_numero_documento,v_tipo_documento,v_longitud_minima,v_longitud_maxima,v_solo_numerico
 FROM public.core_personas_documentos d
 JOIN public.cfg_tipos_documento t ON t.id_tipo_documento=d.id_tipo_documento
 WHERE d.id_persona=v_id_persona AND d.principal IS TRUE AND d.activo IS TRUE
   AND (v_tipo_persona='TRABAJADOR' OR d.verificado IS TRUE)
   AND t.activo IS TRUE AND t.codigo IN ('DNI','CE','RUC','PASAPORTE')
   AND (d.fecha_emision IS NULL OR d.fecha_emision<=CURRENT_DATE)
   AND (d.fecha_vencimiento IS NULL OR d.fecha_vencimiento>=CURRENT_DATE)
 FOR SHARE OF d;

 IF v_numero_documento IS NULL OR v_longitud_minima IS NULL
    OR v_longitud_maxima IS NULL OR v_solo_numerico IS NULL
    OR CHAR_LENGTH(v_numero_documento) NOT BETWEEN v_longitud_minima AND v_longitud_maxima
    OR (v_solo_numerico IS TRUE AND v_numero_documento !~ '^[0-9]+$')
    OR (v_solo_numerico IS FALSE AND v_numero_documento !~ '^[A-Z0-9]+$') THEN
  p_estado:='DOCUMENTO_INVALIDO'; p_mensaje:='El documento no cumple las reglas configuradas.'; RETURN;
 END IF;
 IF UPPER(BTRIM(v_usuario_login)) IS DISTINCT FROM v_numero_documento THEN
  p_estado:='LOGIN_DOCUMENTO_NO_COINCIDE';
  p_mensaje:='Debe actualizarse el login al documento principal antes de activar la cuenta.'; RETURN;
 END IF;
 IF p_password_hash IS NULL OR p_password_hash !~ '^[$]2[aby][$][0-9]{2}[$][./A-Za-z0-9]{53}$' THEN
  p_estado:='PASSWORD_HASH_INVALIDO';
  p_mensaje:='La credencial temporal no posee un hash valido.'; RETURN;
 END IF;
 IF p_password_temporal_expira_en IS NULL OR p_password_temporal_expira_en<=NOW() THEN
  p_estado:='EXPIRACION_INVALIDA';
  p_mensaje:='La fecha de expiracion de la contraseña temporal es invalida.'; RETURN;
 END IF;

 -- Correo inicial: obligatorio como contacto principal activo y valido,
 -- pero verificado puede ser FALSE. No modificar el indicador de verificacion.
 SELECT BTRIM(pc.valor) INTO v_correo
 FROM public.core_personas_contactos pc
 JOIN public.cfg_tipos_contacto tc ON tc.id_tipo_contacto=pc.id_tipo_contacto
 WHERE pc.id_persona=v_id_persona AND tc.codigo='EMAIL' AND tc.activo IS TRUE
   AND pc.principal IS TRUE AND pc.activo IS TRUE
   AND BTRIM(pc.valor)<>''
   AND CHAR_LENGTH(BTRIM(pc.valor))<=180
   AND BTRIM(pc.valor) ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
 LIMIT 1;
 IF v_correo IS NULL THEN
  p_estado:='CORREO_NO_APTO';
  p_mensaje:='El usuario requiere un correo principal activo y de formato valido.'; RETURN;
 END IF;

 SELECT id_estado_usuario INTO v_id_estado_activo
 FROM public.cfg_estados_usuario
 WHERE codigo='ACTIVO' AND activo IS TRUE AND permite_acceso IS TRUE LIMIT 1;
 IF v_id_estado_activo IS NULL THEN
  p_estado:='CONFIGURACION_INVALIDA'; p_mensaje:='No se encontro configurado el estado ACTIVO.'; RETURN;
 END IF;

 UPDATE public.seg_usuarios
 SET id_estado_usuario=v_id_estado_activo,
     password_hash=p_password_hash,
     requiere_cambio_password=TRUE,
     password_temporal_expira_en=p_password_temporal_expira_en,
     intentos_fallidos=0, bloqueado_hasta=NULL,
     password_actualizado_en=timezone('utc'::text,NOW()),
     fecha_actualizacion=timezone('utc'::text,NOW())
 WHERE id_usuario=p_id_usuario;

 UPDATE public.seg_sesiones
 SET fecha_revocacion=timezone('utc'::text,NOW()),
     motivo_revocacion='ACTIVACION_CREDENCIAL_TEMPORAL'
 WHERE id_usuario=p_id_usuario AND fecha_revocacion IS NULL;
 UPDATE public.seg_tokens_recuperacion
 SET fecha_uso=timezone('utc'::text,NOW())
 WHERE id_usuario=p_id_usuario AND fecha_uso IS NULL;

 PERFORM public.sp_registrar_auditoria(
  p_id_actor,'SEGURIDAD','ACTIVAR_USUARIO','seg_usuarios',p_id_usuario::varchar,
  'EXITOSO','Usuario activado con correo principal registrado y credencial temporal.',
  jsonb_build_object('requiere_cambio_password',TRUE,
   'password_temporal_expira_en',p_password_temporal_expira_en,
   'usuario_login',v_usuario_login,'tipo_documento',v_tipo_documento)
 );

 -- La activación manual autorizada libera la restricción manual previa
 -- solo al concluir todas las validaciones del procedimiento.
 UPDATE public.seg_restricciones_acceso_manual
 SET restriccion_activa=FALSE,
     fecha_actualizacion=NOW()
 WHERE id_usuario=p_id_usuario AND restriccion_activa=TRUE;
 p_usuario_login:=v_usuario_login;
 p_correo:=v_correo;
 p_estado:='ACTIVADO';
 p_mensaje:='Usuario activado correctamente con credencial temporal.';
END;
$procedure$;

CREATE OR REPLACE PROCEDURE public.sp_asignar_rol_usuario(IN p_id_actor bigint, IN p_id_usuario bigint, IN p_codigo_rol character varying, OUT p_estado character varying, OUT p_mensaje character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $procedure$
DECLARE
 v_id_rol INT;
 v_codigo_rol VARCHAR(40);
 v_asignable_rrhh BOOLEAN;
 v_es_interno BOOLEAN;
 v_actor_privilegiado BOOLEAN;
 v_id_persona BIGINT;
 v_rol_cliente_valido BOOLEAN;
 v_trabajador_activo BOOLEAN;
BEGIN
 p_estado:='INVALIDO';p_mensaje:='No fue posible asignar el rol.';

 IF p_id_actor IS NULL OR NOT COALESCE(
   public.fn_usuario_tiene_permiso_seguridad(p_id_actor,'users.assign_role'),FALSE) THEN
  p_estado:='DENEGADO';p_mensaje:='No posee permiso para asignar roles a usuarios.';RETURN;
 END IF;

 IF p_id_actor=p_id_usuario THEN
  p_estado:='USUARIO_PROTEGIDO';
  p_mensaje:='No es posible modificar roles de la propia cuenta.'; RETURN;
 END IF;
 SELECT u.id_persona INTO v_id_persona FROM public.seg_usuarios u
 WHERE u.id_usuario=p_id_usuario FOR UPDATE;
 IF NOT FOUND THEN
  p_estado:='USUARIO_NO_ENCONTRADO';p_mensaje:='El usuario no existe.';RETURN;
 END IF;

 v_codigo_rol:=UPPER(BTRIM(p_codigo_rol));
 SELECT r.id_rol,r.asignable_rrhh,r.es_interno
 INTO v_id_rol,v_asignable_rrhh,v_es_interno
 FROM public.seg_roles r WHERE r.codigo=v_codigo_rol AND r.activo IS TRUE LIMIT 1;
 IF v_id_rol IS NULL THEN
  p_estado:='ROL_NO_ENCONTRADO';p_mensaje:='El rol indicado no existe o se encuentra inactivo.';RETURN;
 END IF;

 v_rol_cliente_valido:=EXISTS (
  SELECT 1 FROM public.crm_clientes c WHERE c.id_persona=v_id_persona AND c.activo IS TRUE
 );
 v_trabajador_activo:=EXISTS (
  SELECT 1 FROM public.rrhh_trabajadores t
  JOIN public.cfg_estados_trabajador e ON e.id_estado_trabajador=t.id_estado_trabajador
  WHERE t.id_persona=v_id_persona AND e.codigo='ACTIVO' AND e.activo IS TRUE
 );

 -- CLIENTE solo corresponde a una vinculación CRM real y vigente.
 IF v_codigo_rol='CLIENTE' AND NOT v_rol_cliente_valido THEN
  p_estado:='RELACION_CLIENTE_REQUERIDA';
  p_mensaje:='El rol CLIENTE requiere una vinculacion CRM activa.';RETURN;
 END IF;

 IF v_codigo_rol='CLIENTE' AND NOT public.fn_seguridad_cliente_contrato_aprobado_v1(v_id_persona) THEN
  p_estado:='CONTRATO_PENDIENTE';p_mensaje:='Firma contractual no aprobada por Gerencia.';RETURN;
 END IF;

 -- Los roles internos solo corresponden a trabajadores activos.
 IF v_es_interno IS TRUE AND NOT v_trabajador_activo THEN
  p_estado:='ESTADO_LABORAL_NO_APTO';
  p_mensaje:='Los roles internos requieren trabajador ACTIVO.';RETURN;
 END IF;

 v_actor_privilegiado:=COALESCE(
  public.fn_usuario_tiene_permiso_seguridad(p_id_actor,'roles.assign_permissions'),FALSE)
  AND EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ar
        JOIN public.seg_roles ar_rol ON ar_rol.id_rol=ar.id_rol
        WHERE ar.id_usuario=p_id_actor AND ar.activo IS TRUE
          AND ar.fecha_revocacion IS NULL
          AND ar_rol.activo IS TRUE
          AND ar_rol.codigo IN ('ADMINISTRADOR','GERENCIA')
    );

 IF NOT v_actor_privilegiado THEN
  -- Un actor delegado no puede asignar roles internos protegidos.
  -- CLIENTE es la excepcion, pero solo para clientes autenticos.
  IF v_codigo_rol<>'CLIENTE' AND NOT COALESCE(v_asignable_rrhh,FALSE) THEN
   p_estado:='ROL_PROTEGIDO';
   p_mensaje:='El rol solicitado no puede ser asignado por RRHH.';RETURN;
  END IF;

  -- Bloquea gestionar cuentas con roles protegidos diferentes de CLIENTE.
  -- Permite completar los roles de un trabajador que tambien es cliente.
  IF EXISTS (
   SELECT 1 FROM public.seg_usuarios_roles ur
   JOIN public.seg_roles r ON r.id_rol=ur.id_rol
   WHERE ur.id_usuario=p_id_usuario AND ur.activo IS TRUE
   AND (r.activo IS FALSE OR (r.asignable_rrhh IS FALSE AND r.codigo<>'CLIENTE'))
  ) THEN
   p_estado:='USUARIO_PROTEGIDO';
   p_mensaje:='No posee autorizacion para modificar los roles de esta cuenta.';RETURN;
  END IF;
 END IF;

 INSERT INTO public.seg_usuarios_roles (
  id_usuario,id_rol,fecha_asignacion,fecha_revocacion,activo,asignado_por
 ) VALUES (
  p_id_usuario,v_id_rol,timezone('utc'::text,NOW()),NULL,TRUE,p_id_actor
 )
 ON CONFLICT (id_usuario,id_rol) DO UPDATE
 SET fecha_asignacion=timezone('utc'::text,NOW()),
     fecha_revocacion=NULL,activo=TRUE,asignado_por=p_id_actor;

 UPDATE public.seg_sesiones SET fecha_revocacion=timezone('utc'::text,NOW()),
  motivo_revocacion='CAMBIO_ROLES'
 WHERE id_usuario=p_id_usuario AND fecha_revocacion IS NULL;

 PERFORM public.sp_registrar_auditoria(
  p_id_actor,'SEGURIDAD','ASIGNAR_ROL','seg_usuarios_roles',p_id_usuario::VARCHAR,
  'EXITOSO','Rol asignado a usuario.',
  jsonb_build_object('id_usuario',p_id_usuario,'rol',v_codigo_rol)
 );
 p_estado:='ASIGNADO';p_mensaje:='Rol asignado correctamente.';
END;
$procedure$;

REVOKE ALL ON FUNCTION public.sp_crm_registrar_venta_pendiente_v14(bigint,bigint,bigint,character varying,numeric,numeric,integer,numeric,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_registrar_venta_pendiente_v14(bigint,bigint,bigint,character varying,numeric,numeric,integer,numeric,text,jsonb,jsonb) TO sigi_app_user;
COMMIT;
