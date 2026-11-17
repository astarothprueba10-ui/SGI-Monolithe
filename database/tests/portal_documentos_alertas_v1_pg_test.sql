-- Sprint 4 / 5.4.5 — PostgreSQL 17 efímero (no usa usuarios ni archivos reales).
DO $test$
DECLARE
 a jsonb; b jsonb; e jsonb; z jsonb; d jsonb; alerta jsonb;
 denegado boolean:=false;
BEGIN
 a:=public.sp_portal_cliente_documentos_v1(9);
 b:=public.sp_portal_cliente_documentos_v1(10);
 e:=public.sp_portal_cliente_documentos_v1(6);
 IF (a->>'total')::int<>2 OR (b->>'total')::int<>0 OR (e->>'total')::int<>0
 THEN RAISE EXCEPTION '545|Visibilidad de documentos incorrecta % % %',a,b,e; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(a->'items') j
    WHERE (j->>'idDocumento')::bigint IN(93004,93005))
    OR a::text LIKE '%claveArchivo%' OR a::text LIKE '%clave_archivo%'
    OR a::text LIKE '%hash_sha256%' OR a::text LIKE '%urlLectura%'
 THEN RAISE EXCEPTION '545|Archivo oculto, obsoleto o secreto en el listado'; END IF;
 d:=public.sp_portal_cliente_autorizar_documento_v1(9,'CONTRATO',93003);
 IF d->>'bucket'<>'contratos-firmados-private'
   OR d->>'claveArchivo'<>'contratos/93003/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.pdf'
 THEN RAISE EXCEPTION '545|Lectura contractual propia incorrecta'; END IF;
 d:=public.sp_portal_cliente_autorizar_documento_v1(9,'ANEXO',93003);
 IF d->>'categoria'<>'PLANO_LOTE'
 THEN RAISE EXCEPTION '545|Lectura de anexo propio incorrecta'; END IF;

 denegado:=false;
 BEGIN
   PERFORM public.sp_portal_cliente_autorizar_documento_v1(10,'CONTRATO',93003);
 EXCEPTION WHEN OTHERS THEN
   IF SQLERRM LIKE 'PORTAL_DOCUMENTO_NO_AUTORIZADO|%' THEN denegado:=true;
   ELSE RAISE; END IF;
 END;
 IF NOT denegado THEN RAISE EXCEPTION '545|Comprador ajeno leyó documento'; END IF;
 denegado:=false;
 BEGIN
   PERFORM public.sp_portal_cliente_autorizar_documento_v1(9,'CONTRATO',93004);
 EXCEPTION WHEN OTHERS THEN
   IF SQLERRM LIKE 'PORTAL_DOCUMENTO_NO_AUTORIZADO|%' THEN denegado:=true;
   ELSE RAISE; END IF;
 END;
 IF NOT denegado THEN RAISE EXCEPTION '545|Documento interno fue firmado'; END IF;

 -- El PDF publicado deja de verse cuando desaparece del bucket.
 BEGIN
   DELETE FROM storage.objects WHERE name=
     'contratos/93003/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.pdf';
   z:=public.sp_portal_cliente_documentos_v1(9);
   IF (z->>'total')::int<>1
   THEN RAISE EXCEPTION '545|Documento sin archivo físico sigue listado'; END IF;
   RAISE EXCEPTION 'ROLLBACK_545_FILE';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM<>'ROLLBACK_545_FILE' THEN RAISE; END IF;
 END;

 alerta:=public.sp_portal_cliente_alertas_v1(9);
 IF (alerta->>'total')::int<2
   OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(alerta->'items') x
      WHERE x->>'tipo'='DOCUMENTO_PUBLICADO' AND x->>'ruta'='/portal/documentos')
   OR EXISTS (SELECT 1 FROM jsonb_array_elements(alerta->'items') x
      WHERE x->>'ruta' NOT IN ('/portal/cronograma','/portal/pagos','/portal/documentos'))
 THEN RAISE EXCEPTION '545|Alertas de documentos u operaciones incorrectas %',alerta; END IF;
 IF (public.sp_portal_cliente_alertas_v1(6)->>'total')::int<>0
 THEN RAISE EXCEPTION '545|Alerta ajena en cliente sin ventas'; END IF;
 denegado:=false;
 BEGIN PERFORM public.sp_portal_cliente_alertas_v1(5);
 EXCEPTION WHEN OTHERS THEN
   IF SQLERRM LIKE 'PORTAL_ACCESO_DENEGADO|%' THEN denegado:=true;
   ELSE RAISE; END IF;
 END;
 IF NOT denegado THEN RAISE EXCEPTION '545|Empleado lee alertas de compradores'; END IF;

 IF EXISTS(SELECT 1 FROM pg_proc f WHERE f.pronamespace='public'::regnamespace
   AND f.proname IN('fn_portal_documentos_publicados_v1',
     'sp_portal_cliente_documentos_v1','sp_portal_cliente_autorizar_documento_v1',
     'sp_portal_cliente_alertas_v1')
   AND (has_function_privilege('anon',f.oid,'EXECUTE')
     OR has_function_privilege('authenticated',f.oid,'EXECUTE')
     OR NOT has_function_privilege('sigi_app_user',f.oid,'EXECUTE')))
 THEN RAISE EXCEPTION '545|Permisos de funciones inseguras'; END IF;
 RAISE NOTICE 'PORTAL_545_OK|Documentos propios, PDF físico, ocultos, anexos, alertas, roles';
END $test$;
