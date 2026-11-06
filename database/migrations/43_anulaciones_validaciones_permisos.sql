-- SGI MONOLITHE | Autorizacion SQL propia de Anulaciones.
-- Cambia exclusivamente las funciones existentes del flujo de anulaciones;
-- conserva alcance por cartera, bloqueo transaccional y segregacion de roles.
-- Cada sustitucion verifica su punto de insercion para evitar parches parciales.
DO $migration$
DECLARE
    r record;
    v_def text;
BEGIN
    FOR r IN SELECT * FROM (VALUES
        ('fn_crm_puede_consultar_operacion_anulacion_v1',
            $old$'sales.view'$old$, $new$'annulments.view'$new$),

        ('sp_crm_listar_solicitudes_anulacion_v1',
            $old$'sales.view'$old$, $new$'annulments.view'$new$),

        ('sp_crm_listar_historial_anulaciones_v1',
            $old$'sales.view'$old$, $new$'annulments.view'$new$),

        ('sp_crm_solicitar_anulacion_v1',
            $old$'sales.view'$old$, $new$'annulments.create'$new$),

        ('sp_crm_decidir_solicitud_anulacion_v1',
            $old$p_actor,'sales.annul'::varchar$old$,
            $new$p_actor,CASE WHEN v_accion='RECHAZAR'
                 THEN 'annulments.reject'::varchar
                 ELSE 'annulments.approve'::varchar END$new$),

        ('sp_crm_decidir_solicitud_anulacion_v1',
            $old$'sales.legal.review'$old$, $new$'annulments.review_legal'$new$),

        ('sp_crm_registrar_revision_financiera_anulacion_v1',
            $old$'finance.edit'$old$, $new$'annulments.review_finance'$new$),

        ('sp_crm_registrar_revision_legal_anulacion_v1',
            $old$'sales.legal.review'$old$, $new$'annulments.review_legal'$new$),

        ('sp_crm_listar_casos_revision_legal_v1',
            $old$'sales.legal.review'$old$, $new$'annulments.review_legal'$new$),

        ('fn_crm_puede_acceder_expediente_legal_v1',
            $old$'sales.annul'$old$, $new$'annulments.approve'$new$),

        ('fn_crm_puede_acceder_expediente_legal_v1',
            $old$'sales.legal.review'$old$, $new$'annulments.review_legal'$new$),

        ('sp_crm_autorizar_carga_evidencia_legal_v1',
            $old$'sales.annul'$old$, $new$'annulments.approve'$new$)
    ) AS patches(funcion, antes, despues)
    LOOP
        SELECT pg_get_functiondef(p.oid) INTO STRICT v_def
        FROM pg_proc p
        WHERE p.pronamespace='public'::regnamespace
          AND p.proname=r.funcion;

        IF strpos(v_def,r.despues)>0 THEN CONTINUE; END IF;
        IF strpos(v_def,r.antes)=0 THEN
            RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|No se localizo permiso en %: %',
                r.funcion, r.antes;
        END IF;

        v_def:=replace(v_def,r.antes,r.despues);
        EXECUTE v_def;
    END LOOP;

    -- El acceso al expediente legal siempre necesita acceso al modulo.
    SELECT pg_get_functiondef(oid) INTO STRICT v_def
    FROM pg_proc WHERE pronamespace='public'::regnamespace
      AND proname='fn_crm_puede_acceder_expediente_legal_v1';
    IF strpos(v_def,$insert$AND coalesce(public.fn_usuario_tiene_permiso_seguridad(
    p_actor,'annulments.view'::varchar),false)$insert$)=0 THEN
        IF strpos(v_def,$old$WHERE p_actor IS NOT NULL AND p_actor>0$old$)=0 THEN
            RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Punto de control del expediente legal modificado.';
        END IF;
        v_def:=replace(v_def,
            $old$WHERE p_actor IS NOT NULL AND p_actor>0$old$,
            $new$WHERE p_actor IS NOT NULL AND p_actor>0
  AND coalesce(public.fn_usuario_tiene_permiso_seguridad(
    p_actor,'annulments.view'::varchar),false)$new$);
        EXECUTE v_def;
    END IF;
END
$migration$;
