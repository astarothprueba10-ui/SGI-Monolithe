-- SGI MONOLITHE · cierre 5.3.5
-- Rechazar disponibilidad y lectura si MIME/tamaño del voucher no
-- coinciden con el objeto en Storage; no cambiar datos ni pagos previos.
DO $patch$
DECLARE
 v_def text;
 v_old text:=$old$AND lower(coalesce(o.metadata->>'mimetype','')) IN
         ('application/pdf','image/jpeg','image/png','image/webp')
       AND coalesce((o.metadata->>'size')::bigint,0) BETWEEN 1 AND 5242880$old$;
 v_new text:=$new$AND lower(coalesce(o.metadata->>'mimetype',''))=v.tipo_mime
       AND coalesce((o.metadata->>'size')::bigint,0)=v.tamanio_bytes
       AND coalesce(v.tamanio_bytes,0) BETWEEN 1 AND 5242880$new$;
BEGIN
 SELECT pg_get_functiondef(oid) INTO STRICT v_def FROM pg_proc
 WHERE pronamespace='public'::regnamespace
   AND proname='sp_finanzas_listar_vouchers_cuotas_v1';
 IF (length(v_def)-length(replace(v_def,v_old,'')))/length(v_old)<>2
 THEN RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Bandeja 84 distinta de la auditada.'; END IF;
 EXECUTE replace(v_def,v_old,v_new);
END;
$patch$;

DO $patch$
DECLARE
 v_def text;
 v_old text:=$old$AND lower(coalesce(o.metadata->>'mimetype','')) IN
       ('application/pdf','image/jpeg','image/png','image/webp')
     AND coalesce((o.metadata->>'size')::bigint,0) BETWEEN 1 AND 5242880$old$;
 v_new text:=$new$AND lower(coalesce(o.metadata->>'mimetype',''))=v_mime
     AND coalesce((o.metadata->>'size')::bigint,0)=v_bytes
     AND coalesce(v_bytes,0) BETWEEN 1 AND 5242880$new$;
BEGIN
 SELECT pg_get_functiondef(oid) INTO STRICT v_def FROM pg_proc
 WHERE pronamespace='public'::regnamespace
   AND proname='sp_finanzas_obtener_ruta_voucher_cuota_v1';
 IF strpos(v_def,v_old)=0
 THEN RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Lectura 84 distinta a la auditada.'; END IF;
 EXECUTE replace(v_def,v_old,v_new);
END;
$patch$;
