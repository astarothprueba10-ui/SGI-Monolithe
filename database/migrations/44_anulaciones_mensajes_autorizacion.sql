-- Mensajes de autorización coherentes con el catálogo Anulaciones.
DO $patch$
DECLARE r record; v_def text;
BEGIN
    FOR r IN SELECT * FROM (VALUES
      ('sp_crm_listar_solicitudes_anulacion_v1',
        $old$DENEGADO|Se requiere sales.view.$old$,
        $new$DENEGADO|No tiene permiso para ver Anulaciones.$new$),
      ('sp_crm_listar_historial_anulaciones_v1',
        $old$DENEGADO|Se requiere sales.view.$old$,
        $new$DENEGADO|No tiene permiso para ver Anulaciones.$new$),
      ('sp_crm_solicitar_anulacion_v1',
        $old$DENEGADO|Se requiere sales.view.$old$,
        $new$DENEGADO|No tiene permiso para crear solicitudes de Anulaciones.$new$),
      ('sp_crm_decidir_solicitud_anulacion_v1',
        $old$DENEGADO|Solo Gerencia con sales.annul puede decidir anulaciones.$old$,
        $new$DENEGADO|Solo Gerencia con permiso de aprobación o rechazo puede decidir anulaciones.$new$)
    ) patches(funcion,antes,despues)
    LOOP
        SELECT pg_get_functiondef(oid) INTO STRICT v_def
        FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname=r.funcion;
        IF strpos(v_def,r.despues)>0 THEN CONTINUE; END IF;
        IF strpos(v_def,r.antes)=0 THEN
            RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Mensaje de autorizacion modificado en %.',r.funcion;
        END IF;
        EXECUTE replace(v_def,r.antes,r.despues);
    END LOOP;
END $patch$;
