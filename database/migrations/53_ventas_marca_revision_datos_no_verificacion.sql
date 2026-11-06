-- La revisión comercial no equivale a verificación documental o de identidad.
DO $patch$
DECLARE v_def text;
BEGIN
 SELECT pg_get_functiondef(oid) INTO STRICT v_def
 FROM pg_proc WHERE pronamespace='public'::regnamespace
   AND proname='sp_crm_registrar_venta_pendiente_v10';
 IF strpos(v_def,'''datosCompradorVerificados'',true')>0 THEN
   EXECUTE replace(v_def,'''datosCompradorVerificados'',true',
                          '''datosCompradorRevisados'',true');
 ELSIF strpos(v_def,'''datosCompradorRevisados'',true')=0 THEN
   RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|No se encontro marca de revision.';
 END IF;
END $patch$;