-- IDs de personas_* son GENERATED ALWAYS AS IDENTITY; usar DEFAULT.
DO $patch$
DECLARE v_def text;
BEGIN
 SELECT pg_get_functiondef(oid) INTO STRICT v_def FROM pg_proc
 WHERE pronamespace='public'::regnamespace
 AND proname='sp_crm_corregir_datos_personales_v1';
 v_def:=replace(v_def,
  'id_persona_documento,id_persona,id_tipo_documento,numero_documento,',
  'id_persona,id_tipo_documento,numero_documento,');
 v_def:=replace(v_def,
  'VALUES(nextval(''public.core_personas_documentos_id_persona_documento_seq''),',
  'VALUES(');
 v_def:=replace(v_def,
  'id_persona_contacto,id_persona,id_tipo_contacto,valor,principal,verificado,activo)',
  'id_persona,id_tipo_contacto,valor,principal,verificado,activo)');
 v_def:=replace(v_def,
  'VALUES(nextval(''public.core_personas_contactos_id_persona_contacto_seq''),',
  'VALUES(');
 v_def:=replace(v_def,
  'id_persona_direccion,id_persona,tipo,direccion,pais,principal,activo)',
  'id_persona,tipo,direccion,pais,principal,activo)');
 v_def:=replace(v_def,
  'VALUES(nextval(''public.core_personas_direcciones_id_persona_direccion_seq''),',
  'VALUES(');
 IF strpos(v_def,'nextval(''public.core_personas_')>0 THEN
   RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Secuencia manual restante.';
 END IF;
 EXECUTE v_def;
END $patch$;