-- SGI MONOLITHE · 5.3.5 · verificar MIME/tamaño igual a Storage.
DO $test$
DECLARE
 id_v bigint;
 original_mime varchar;
 b jsonb;v jsonb;
 acceso jsonb;
 rechazo bool;
BEGIN
 SELECT vv.id_voucher,vv.tipo_mime INTO STRICT id_v,original_mime
 FROM public.pag_vouchers vv
 WHERE vv.codigo LIKE 'VOU-INI-%' ORDER BY vv.id_voucher DESC LIMIT 1;
 b:=public.sp_finanzas_listar_vouchers_financiamiento_v2(5,'TODOS',NULL,1,100);
 SELECT value INTO v FROM jsonb_array_elements(b->'items')
 WHERE (value->>'id_voucher')::bigint=id_v;
 IF v IS NULL OR NOT (v->>'archivo_disponible')::boolean
 THEN RAISE EXCEPTION '535_PRIVATE|No se detectó voucher inicial disponible'; END IF;
 BEGIN
  UPDATE public.pag_vouchers SET tipo_mime='image/png'
  WHERE id_voucher=id_v;
  b:=public.sp_finanzas_listar_vouchers_financiamiento_v2(5,'TODOS',NULL,1,100);
  SELECT value INTO v FROM jsonb_array_elements(b->'items')
  WHERE (value->>'id_voucher')::bigint=id_v;
  IF (v->>'archivo_disponible')::boolean
  THEN RAISE EXCEPTION '535_PRIVATE|Bandeja mostró MIME fraudulento disponible'; END IF;
  rechazo:=false;
  BEGIN PERFORM public.sp_finanzas_obtener_ruta_voucher_cuota_v1(5,id_v);
  EXCEPTION WHEN others THEN rechazo:=true; END;
  IF NOT rechazo THEN RAISE EXCEPTION '535_PRIVATE|Lectura permitió MIME falso'; END IF;
  RAISE EXCEPTION 'ROLLBACK_PRIVATE_535';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'ROLLBACK_PRIVATE_535' THEN RAISE; END IF;
 END;
 SELECT tipo_mime INTO original_mime FROM public.pag_vouchers WHERE id_voucher=id_v;
 IF original_mime<>'application/pdf'
 THEN RAISE EXCEPTION '535_PRIVATE|La prueba cambió evidencia permanente'; END IF;
 RAISE NOTICE 'PRIVADO_535_OK|Bandeja y lectura validan MIME/tamaño; cambios reversibles';
END;
$test$;
