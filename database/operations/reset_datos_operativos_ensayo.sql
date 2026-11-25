-- Ensayo de reinicio operativo: nunca confirma modificaciones.
-- Proyecto existente, exclusivamente durante mantenimiento. No es una migracion.
-- No borra objetos Storage, no crea cuentas reales ni rota claves.
-- Mantiene todos los roles hasta que se apruebe la lista definitiva.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '25s';

DO $ensayo$
DECLARE
    v_vaciar text[] := ARRAY[
        'auth_mfa.estado',
        'public.aud_eventos',
        'public.cfg_fin_politica_activa',
        'public.cfg_fin_politica_proyecto_activa',
        'public.cfg_fin_politicas_versiones',
        'public.cfg_fin_publicacion_control',
        'public.cms_borrador_imagenes',
        'public.cms_borradores',
        'public.cms_consultas_web',
        'public.cms_multimedia',
        'public.cms_multimedia_asignaciones',
        'public.cms_paginas',
        'public.cms_proyectos',
        'public.cms_proyectos_visibilidad',
        'public.cms_publicacion_historial',
        'public.cms_publicacion_versiones',
        'public.cms_seccion_items',
        'public.cms_secciones',
        'public.cms_visibilidad_historial',
        'public.com_asesores',
        'public.com_asignaciones_prospecto',
        'public.com_comisiones',
        'public.com_reglas_comision',
        'public.com_ventas_asesores',
        'public.core_personas',
        'public.core_personas_contactos',
        'public.core_personas_conyuges',
        'public.core_personas_direcciones',
        'public.core_personas_documentos',
        'public.core_solicitudes_correccion_identidad',
        'public.core_verificaciones_cambio_correo',
        'public.crm_anulaciones_evidencias_legales',
        'public.crm_anulaciones_historial',
        'public.crm_anulaciones_revisiones',
        'public.crm_cambios_datos_personales',
        'public.crm_captaciones',
        'public.crm_clientes',
        'public.crm_consentimientos',
        'public.crm_prospectos',
        'public.crm_prospectos_intereses',
        'public.crm_seguimientos',
        'public.crm_solicitudes_anulacion',
        'public.crm_solicitudes_cambio_reserva_v1',
        'public.crm_solicitudes_retroceso_etapa',
        'public.crm_ventas_datos_comprador',
        'public.crm_visitas',
        'public.fin_cargas_subsanacion_venta_v1',
        'public.fin_cuentas_financieras',
        'public.fin_cuentas_receptoras_auditoria_v1',
        'public.fin_movimientos',
        'public.fin_revisiones_comprobantes_venta_v1',
        'public.fin_saldos_iniciales',
        'public.fin_transferencias',
        'public.fin_ventas_desglose_comprobantes_v1',
        'public.fin_ventas_desglose_eventos_v1',
        'public.inm_ajustes_tipo_lote',
        'public.inm_configuracion_comercial_borradores',
        'public.inm_etapas',
        'public.inm_etapas_comerciales',
        'public.inm_lotes',
        'public.inm_lotes_geometrias',
        'public.inm_lotes_historial_estado',
        'public.inm_lotes_precios',
        'public.inm_manzanas',
        'public.inm_planos_cad_archivos',
        'public.inm_planos_interactivos',
        'public.inm_planos_svg_proyecto',
        'public.inm_politicas_comerciales_lotes',
        'public.inm_politicas_comerciales_publicadas',
        'public.inm_proyectos',
        'public.inm_tarifas_zona_etapa',
        'public.inm_zonas',
        'public.not_envios',
        'public.not_notificaciones',
        'public.not_preferencias',
        'public.pag_aplicaciones_pago',
        'public.pag_cargas_voucher_cuota',
        'public.pag_cargas_voucher_inicial_v1',
        'public.pag_conciliacion_eventos_v1',
        'public.pag_conciliacion_revisiones_v1',
        'public.pag_cuotas',
        'public.pag_imputaciones_operaciones_v1',
        'public.pag_pagos',
        'public.pag_planes_pago',
        'public.pag_planes_pago_historial_estado',
        'public.pag_separaciones_grupo_abonos_v1',
        'public.pag_separaciones_grupo_distribucion_v1',
        'public.pag_vouchers',
        'public.pag_vouchers_cuota_revisiones',
        'public.pag_vouchers_inicial_revisiones_v1',
        'public.rrhh_solicitudes_reincorporacion',
        'public.rrhh_suspensiones_laborales',
        'public.rrhh_trabajadores',
        'public.rrhh_trabajadores_historial_laboral',
        'public.seg_control_estados_laborales_usuario',
        'public.seg_fin_totp_autorizaciones',
        'public.seg_fin_totp_cuentas',
        'public.seg_fin_totp_recuperacion',
        'public.seg_restricciones_acceso_manual',
        'public.seg_sesiones',
        'public.seg_tokens_recuperacion',
        'public.seg_usuarios',
        'public.seg_usuarios_roles',
        'public.seg_verificaciones_recuperacion',
        'public.ven_contratos',
        'public.ven_contratos_anexos',
        'public.ven_contratos_aprobaciones',
        'public.ven_contratos_archivos',
        'public.ven_contratos_pdf_reemplazos',
        'public.ven_operaciones_agrupadas_lotes_v1',
        'public.ven_operaciones_agrupadas_v1',
        'public.ven_reservas',
        'public.ven_separaciones_grupo_lotes_v1',
        'public.ven_separaciones_grupo_v1',
        'public.ven_ventas',
        'public.ven_ventas_clientes',
        'public.ven_ventas_comprobantes',
        'public.ven_ventas_medios_pago'
    ];
    v_conservar text[] := ARRAY[
        'public.cfg_canales_notificacion',
        'public.cfg_estados_asesor',
        'public.cfg_estados_comision',
        'public.cfg_estados_consulta_web',
        'public.cfg_estados_contrato',
        'public.cfg_estados_cuota',
        'public.cfg_estados_envio_notificacion',
        'public.cfg_estados_etapa',
        'public.cfg_estados_lote',
        'public.cfg_estados_manzana',
        'public.cfg_estados_movimiento_financiero',
        'public.cfg_estados_pago',
        'public.cfg_estados_plan_pago',
        'public.cfg_estados_prospecto',
        'public.cfg_estados_proyecto',
        'public.cfg_estados_publicacion',
        'public.cfg_estados_reserva',
        'public.cfg_estados_trabajador',
        'public.cfg_estados_usuario',
        'public.cfg_estados_venta',
        'public.cfg_estados_voucher',
        'public.cfg_metodos_pago',
        'public.cfg_modalidades_venta',
        'public.cfg_monedas',
        'public.cfg_motivos_retroceso_crm',
        'public.cfg_origenes_prospecto',
        'public.cfg_tipos_ajuste_precio',
        'public.cfg_tipos_aplicacion_pago',
        'public.cfg_tipos_asesor',
        'public.cfg_tipos_calculo_comision',
        'public.cfg_tipos_consentimiento',
        'public.cfg_tipos_contacto',
        'public.cfg_tipos_contrato',
        'public.cfg_tipos_cuenta_financiera',
        'public.cfg_tipos_documento',
        'public.cfg_tipos_lote',
        'public.cfg_tipos_movimiento_financiero',
        'public.cfg_tipos_multimedia',
        'public.cfg_tipos_notificacion',
        'public.cfg_tipos_seccion',
        'public.cfg_tipos_seguimiento',
        'public.cfg_tipos_tarifa',
        'public.cfg_tipos_vinculo_laboral',
        'public.cfg_ubicaciones_geograficas',
        'public.cfg_usos_multimedia',
        'public.fin_categorias',
        'public.not_plantillas',
        'public.rrhh_areas',
        'public.rrhh_cargos',
        'public.rrhh_horarios',
        'public.rrhh_horarios_detalle',
        'public.seg_permisos',
        'public.seg_roles',
        'public.seg_roles_permisos'
    ];
    v_reconstruir text[] := ARRAY['public.cfg_fin_politica_activa', 'public.cfg_fin_politicas_versiones', 'public.cfg_fin_publicacion_control', 'public.cms_paginas', 'public.cms_secciones'];
    v_tabla text;
    v_cantidad bigint;
    v_politica bigint;
    v_fingerprint text;
    v_original text;
    v_total integer := 0;
    v_actual text[];
    v_esperado text[];
BEGIN
    -- Bloque interno: el error controlado del final revierte TODOS los cambios.
    BEGIN
        SELECT array_agg(n.nspname || '.' || c.relname ORDER BY n.nspname, c.relname)
        INTO v_actual
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind IN ('r','p') AND n.nspname IN ('public','auth_mfa');
        SELECT array_agg(t ORDER BY t) INTO v_esperado
        FROM unnest(v_vaciar || v_conservar) AS x(t);
        IF v_actual IS DISTINCT FROM v_esperado THEN
            RAISE EXCEPTION 'Inventario distinto del auditado; detener ensayo';
        END IF;
        -- NOWAIT: no esperar por aplicaciones que esten utilizando las tablas.
        EXECUTE 'LOCK TABLE ' || array_to_string(v_vaciar ||
            ARRAY['public.seg_roles_permisos','public.not_plantillas'], ', ')
            || ' IN ACCESS EXCLUSIVE MODE NOWAIT';

        CREATE TEMP TABLE reset_preservadas(tabla text PRIMARY KEY, huella text)
        ON COMMIT DROP;
        FOREACH v_tabla IN ARRAY v_conservar LOOP
            -- Solo se excluyen las atribuciones que deben quedar sin usuario previo.
            EXECUTE format('SELECT md5(coalesce(string_agg(j::text, chr(10) ORDER BY j::text), '''')) FROM (SELECT to_jsonb(t) %s AS j FROM %s t) q',
                CASE v_tabla WHEN 'public.seg_roles_permisos' THEN '- ''asignado_por'''
                WHEN 'public.not_plantillas' THEN '- ''id_usuario_registro''' ELSE '' END,
                v_tabla) INTO v_fingerprint;
            INSERT INTO reset_preservadas(tabla, huella) VALUES(v_tabla, v_fingerprint);
        END LOOP;

        CREATE TEMP TABLE reset_politica ON COMMIT DROP AS
        SELECT p.monto_separacion, p.modo_inicial, p.inicial_minima, p.inicial_maxima,
               p.inicial_fija, p.tasa_nominal_anual_pct, p.cuotas_min, p.cuotas_max,
               p.dias_vencimiento_separacion, p.sistema_amortizacion, p.moneda,
               p.modo_aplicacion
        FROM public.cfg_fin_politicas_versiones p
        JOIN public.cfg_fin_politica_activa a ON a.id_politica = p.id_politica
        WHERE a.codigo = 'GENERAL' AND p.codigo = 'GENERAL';
        IF (SELECT count(*) FROM reset_politica) <> 1 THEN
            RAISE EXCEPTION 'No existe una politica general vigente unica';
        END IF;

        CREATE TEMP TABLE reset_cms_paginas ON COMMIT DROP AS
        SELECT id_pagina AS anterior, codigo, slug, orden, mostrar_menu
        FROM public.cms_paginas WHERE codigo = 'INICIO';
        CREATE TEMP TABLE reset_cms_secciones ON COMMIT DROP AS
        SELECT s.id_tipo_seccion, s.codigo, s.orden
        FROM public.cms_secciones s JOIN reset_cms_paginas p ON p.anterior = s.id_pagina;
        IF (SELECT count(*) FROM reset_cms_paginas) <> 1 OR
           (SELECT count(*) FROM reset_cms_secciones) <> 3 OR
           (SELECT count(*) FROM public.cms_paginas) <> 1 OR
           (SELECT count(*) FROM public.cms_secciones) <> 3 THEN
            RAISE EXCEPTION 'Estructura CMS distinta de la auditada';
        END IF;
        IF (SELECT count(*) FROM pg_trigger WHERE
             (tgrelid = 'public.cms_publicacion_historial'::regclass AND tgname = 'tg_cms_m36_no_truncate'
              OR tgrelid = 'public.cms_visibilidad_historial'::regclass AND tgname = 'tr_cms_visibilidad_historial_no_vaciar')
             AND tgenabled = 'O') <> 2 THEN
            RAISE EXCEPTION 'Protecciones CMS distintas de las auditadas';
        END IF;

        -- Excepcion de mantenimiento puntual y reversible; no desactivar otros triggers.
        ALTER TABLE public.cms_publicacion_historial DISABLE TRIGGER tg_cms_m36_no_truncate;
        ALTER TABLE public.cms_visibilidad_historial DISABLE TRIGGER tr_cms_visibilidad_historial_no_vaciar;
        TRUNCATE TABLE
            auth_mfa.estado,
            public.aud_eventos,
            public.cfg_fin_politica_activa,
            public.cfg_fin_politica_proyecto_activa,
            public.cfg_fin_politicas_versiones,
            public.cfg_fin_publicacion_control,
            public.cms_borrador_imagenes,
            public.cms_borradores,
            public.cms_consultas_web,
            public.cms_multimedia,
            public.cms_multimedia_asignaciones,
            public.cms_paginas,
            public.cms_proyectos,
            public.cms_proyectos_visibilidad,
            public.cms_publicacion_historial,
            public.cms_publicacion_versiones,
            public.cms_seccion_items,
            public.cms_secciones,
            public.cms_visibilidad_historial,
            public.com_asesores,
            public.com_asignaciones_prospecto,
            public.com_comisiones,
            public.com_reglas_comision,
            public.com_ventas_asesores,
            public.core_personas_contactos,
            public.core_personas_conyuges,
            public.core_personas_direcciones,
            public.core_personas_documentos,
            public.core_solicitudes_correccion_identidad,
            public.core_verificaciones_cambio_correo,
            public.crm_anulaciones_evidencias_legales,
            public.crm_anulaciones_historial,
            public.crm_anulaciones_revisiones,
            public.crm_cambios_datos_personales,
            public.crm_captaciones,
            public.crm_clientes,
            public.crm_consentimientos,
            public.crm_prospectos,
            public.crm_prospectos_intereses,
            public.crm_seguimientos,
            public.crm_solicitudes_anulacion,
            public.crm_solicitudes_cambio_reserva_v1,
            public.crm_solicitudes_retroceso_etapa,
            public.crm_ventas_datos_comprador,
            public.crm_visitas,
            public.fin_cargas_subsanacion_venta_v1,
            public.fin_cuentas_financieras,
            public.fin_cuentas_receptoras_auditoria_v1,
            public.fin_movimientos,
            public.fin_revisiones_comprobantes_venta_v1,
            public.fin_saldos_iniciales,
            public.fin_transferencias,
            public.fin_ventas_desglose_comprobantes_v1,
            public.fin_ventas_desglose_eventos_v1,
            public.inm_ajustes_tipo_lote,
            public.inm_configuracion_comercial_borradores,
            public.inm_etapas,
            public.inm_etapas_comerciales,
            public.inm_lotes,
            public.inm_lotes_geometrias,
            public.inm_lotes_historial_estado,
            public.inm_lotes_precios,
            public.inm_manzanas,
            public.inm_planos_cad_archivos,
            public.inm_planos_interactivos,
            public.inm_planos_svg_proyecto,
            public.inm_politicas_comerciales_lotes,
            public.inm_politicas_comerciales_publicadas,
            public.inm_proyectos,
            public.inm_tarifas_zona_etapa,
            public.inm_zonas,
            public.not_envios,
            public.not_notificaciones,
            public.not_preferencias,
            public.pag_aplicaciones_pago,
            public.pag_cargas_voucher_cuota,
            public.pag_cargas_voucher_inicial_v1,
            public.pag_conciliacion_eventos_v1,
            public.pag_conciliacion_revisiones_v1,
            public.pag_cuotas,
            public.pag_imputaciones_operaciones_v1,
            public.pag_pagos,
            public.pag_planes_pago,
            public.pag_planes_pago_historial_estado,
            public.pag_separaciones_grupo_abonos_v1,
            public.pag_separaciones_grupo_distribucion_v1,
            public.pag_vouchers,
            public.pag_vouchers_cuota_revisiones,
            public.pag_vouchers_inicial_revisiones_v1,
            public.rrhh_solicitudes_reincorporacion,
            public.rrhh_suspensiones_laborales,
            public.rrhh_trabajadores,
            public.rrhh_trabajadores_historial_laboral,
            public.seg_control_estados_laborales_usuario,
            public.seg_fin_totp_autorizaciones,
            public.seg_fin_totp_cuentas,
            public.seg_fin_totp_recuperacion,
            public.seg_restricciones_acceso_manual,
            public.seg_sesiones,
            public.seg_tokens_recuperacion,
            public.seg_usuarios_roles,
            public.seg_verificaciones_recuperacion,
            public.ven_contratos,
            public.ven_contratos_anexos,
            public.ven_contratos_aprobaciones,
            public.ven_contratos_archivos,
            public.ven_contratos_pdf_reemplazos,
            public.ven_operaciones_agrupadas_lotes_v1,
            public.ven_operaciones_agrupadas_v1,
            public.ven_reservas,
            public.ven_separaciones_grupo_lotes_v1,
            public.ven_separaciones_grupo_v1,
            public.ven_ventas,
            public.ven_ventas_clientes,
            public.ven_ventas_comprobantes,
            public.ven_ventas_medios_pago
        RESTART IDENTITY RESTRICT;
        ALTER TABLE public.cms_publicacion_historial ENABLE TRIGGER tg_cms_m36_no_truncate;
        ALTER TABLE public.cms_visibilidad_historial ENABLE TRIGGER tr_cms_visibilidad_historial_no_vaciar;

        -- TRUNCATE de usuarios/personas esta impedido por FKs de tablas conservadas.
        SET CONSTRAINTS ALL IMMEDIATE;
        UPDATE public.seg_roles_permisos SET asignado_por = NULL WHERE asignado_por IS NOT NULL;
        UPDATE public.not_plantillas SET id_usuario_registro = NULL WHERE id_usuario_registro IS NOT NULL;
        DELETE FROM public.seg_usuarios;
        DELETE FROM public.core_personas;
        ALTER TABLE public.seg_usuarios ALTER COLUMN id_usuario RESTART WITH 1;
        ALTER TABLE public.core_personas ALTER COLUMN id_persona RESTART WITH 1;
        ALTER SEQUENCE public.inm_proyectos_codigo_seq RESTART WITH 1;
        ALTER SEQUENCE public.rrhh_trabajadores_codigo_seq RESTART WITH 1;
        ALTER SEQUENCE public.ven_operaciones_agrupadas_codigo_seq RESTART WITH 1;

        INSERT INTO public.cfg_fin_politicas_versiones
            (codigo, version, monto_separacion, modo_inicial, inicial_minima, inicial_maxima,
             inicial_fija, tasa_nominal_anual_pct, cuotas_min, cuotas_max,
             dias_vencimiento_separacion, sistema_amortizacion, moneda, modo_aplicacion,
             vigente_desde, motivo_publicacion)
        SELECT 'GENERAL', 1, monto_separacion, modo_inicial, inicial_minima, inicial_maxima,
               inicial_fija, tasa_nominal_anual_pct, cuotas_min, cuotas_max,
               dias_vencimiento_separacion, sistema_amortizacion, moneda, modo_aplicacion,
               now(), 'Inicializacion de politica general tras reinicio operativo'
        FROM reset_politica RETURNING id_politica INTO v_politica;
        IF v_politica <> 1 THEN RAISE EXCEPTION 'ID inicial de politica incorrecto'; END IF;
        INSERT INTO public.cfg_fin_politica_activa(codigo, id_politica) VALUES ('GENERAL', v_politica);
        INSERT INTO public.cfg_fin_publicacion_control(id, habilitado) VALUES (1, false);

        INSERT INTO public.cms_paginas(id_estado_publicacion, codigo, slug, titulo, orden, mostrar_menu)
        SELECT e.id_estado_publicacion, p.codigo, p.slug, 'Inicio', p.orden, p.mostrar_menu
        FROM reset_cms_paginas p CROSS JOIN public.cfg_estados_publicacion e WHERE e.codigo = 'BORRADOR';
        INSERT INTO public.cms_secciones(id_pagina, id_tipo_seccion, codigo, orden, visible)
        SELECT p.id_pagina, s.id_tipo_seccion, s.codigo, s.orden, false
        FROM reset_cms_secciones s CROSS JOIN public.cms_paginas p WHERE p.codigo = 'INICIO';

        FOREACH v_tabla IN ARRAY v_vaciar LOOP
            IF v_tabla = ANY(v_reconstruir) THEN CONTINUE; END IF;
            EXECUTE format('SELECT count(*) FROM %s', v_tabla) INTO v_cantidad;
            IF v_cantidad <> 0 THEN RAISE EXCEPTION 'Tabla no vacia: %', v_tabla; END IF;
            v_total := v_total + 1;
        END LOOP;
        FOREACH v_tabla IN ARRAY v_conservar LOOP
            SELECT huella INTO v_original FROM reset_preservadas WHERE tabla = v_tabla;
            EXECUTE format('SELECT md5(coalesce(string_agg(j::text, chr(10) ORDER BY j::text), '''')) FROM (SELECT to_jsonb(t) %s AS j FROM %s t) q',
                CASE v_tabla WHEN 'public.seg_roles_permisos' THEN '- ''asignado_por'''
                WHEN 'public.not_plantillas' THEN '- ''id_usuario_registro''' ELSE '' END,
                v_tabla) INTO v_fingerprint;
            IF v_fingerprint IS DISTINCT FROM v_original THEN
                RAISE EXCEPTION 'Configuracion alterada: %', v_tabla;
            END IF;
        END LOOP;
        IF (SELECT count(*) FROM public.cms_paginas WHERE id_pagina=1) <> 1
           OR (SELECT count(*) FROM public.cms_secciones) <> 3
           OR (SELECT count(*) FROM public.cfg_fin_politicas_versiones WHERE id_politica=1 AND version=1) <> 1
           OR (SELECT count(*) FROM public.cfg_fin_publicacion_control WHERE NOT habilitado) <> 1
           OR (SELECT count(*) FROM public.seg_roles_permisos WHERE asignado_por IS NOT NULL) <> 0
           OR v_total <> 113 THEN
            RAISE EXCEPTION 'No se cumplen las condiciones del ensayo';
        END IF;
        IF (SELECT count(*) FROM pg_trigger WHERE
            (tgrelid = 'public.cms_publicacion_historial'::regclass AND tgname = 'tg_cms_m36_no_truncate'
             OR tgrelid = 'public.cms_visibilidad_historial'::regclass AND tgname = 'tr_cms_visibilidad_historial_no_vaciar')
            AND tgenabled = 'O') <> 2 THEN
            RAISE EXCEPTION 'Proteccion CMS no restaurada';
        END IF;
        -- Este SQLSTATE exclusivo revierte el bloque aun si un cliente hace autocommit.
        RAISE EXCEPTION USING ERRCODE = 'ZX001', MESSAGE = 'ENSAYO_RESET_VALIDADO_REVERTIR';
    EXCEPTION WHEN SQLSTATE 'ZX001' THEN
        IF SQLERRM <> 'ENSAYO_RESET_VALIDADO_REVERTIR' THEN RAISE; END IF;
        RAISE NOTICE 'Ensayo revertido: 113 tablas vacias, 54 configuraciones conservadas, 5 reconstruidas';
    END;
END;
$ensayo$;

ROLLBACK;
