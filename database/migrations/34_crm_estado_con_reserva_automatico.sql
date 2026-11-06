-- SGI MONOLITHE | Bloque 1: integracion comercial de reservas.
-- CON_RESERVA es automatico; las separaciones PENDIENTES no convierten prospectos.
-- Ejecutar con rol administrador de BD. No modifica ventas ni reservas existentes.
BEGIN;

INSERT INTO public.cfg_estados_prospecto
    (codigo, nombre, descripcion, es_estado_final, activo, orden)
SELECT
    'CON_RESERVA', 'Con Reserva',
    'Etapa automatica: reserva acreditada vigente o venta pendiente de firma.',
    false, true, 6
WHERE NOT EXISTS (
    SELECT 1 FROM public.cfg_estados_prospecto WHERE codigo = 'CON_RESERVA'
);

UPDATE public.cfg_estados_prospecto
SET orden = CASE codigo
      WHEN 'CONVERTIDO' THEN 7 WHEN 'NO_INTERESADO' THEN 8
      WHEN 'DESCARTADO' THEN 9 ELSE orden END,
    fecha_actualizacion = now()
WHERE codigo IN ('CONVERTIDO','NO_INTERESADO','DESCARTADO');

ALTER TABLE public.crm_prospectos
    ADD COLUMN IF NOT EXISTS id_estado_pre_reserva integer;

DO $ddl$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.crm_prospectos'::regclass
          AND conname = 'fk_crm_prospectos_etapa_pre_reserva'
    ) THEN
        ALTER TABLE public.crm_prospectos
            ADD CONSTRAINT fk_crm_prospectos_etapa_pre_reserva
            FOREIGN KEY (id_estado_pre_reserva)
            REFERENCES public.cfg_estados_prospecto(id_estado_prospecto)
            ON DELETE RESTRICT;
    END IF;
END
$ddl$;

-- Funcion interna invocada por triggers: opera en la misma transaccion del evento.
-- Nunca infiere conversion a cliente de una mera separacion.
CREATE OR REPLACE FUNCTION public.fn_crm_sincronizar_con_reserva_v1(p_persona bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_prospecto bigint;
    v_etapa_actual text;
    v_etapa_id integer;
    v_etapa_previa integer;
    v_etapa_reserva integer;
    v_restaurar integer;
    v_requiere_reserva boolean;
    v_venta_formalizada boolean;
    v_tipo_seguimiento integer;
    v_etapa_restaurada text;
BEGIN
    SELECT p.id_prospecto, e.codigo, p.id_estado_prospecto,
           p.id_estado_pre_reserva
      INTO v_prospecto, v_etapa_actual, v_etapa_id, v_etapa_previa
    FROM public.crm_prospectos p
    JOIN public.cfg_estados_prospecto e ON e.id_estado_prospecto=p.id_estado_prospecto
    WHERE p.id_persona=p_persona AND p.activo
    FOR UPDATE OF p;
    IF v_prospecto IS NULL THEN RETURN; END IF;

    -- La etapa definitiva CONVERTIDO tiene prioridad absoluta.
    IF v_etapa_actual='CONVERTIDO' THEN
        IF v_etapa_previa IS NOT NULL THEN
            UPDATE public.crm_prospectos SET id_estado_pre_reserva=NULL
            WHERE id_prospecto=v_prospecto;
        END IF;
        RETURN;
    END IF;

    -- Evitar deshacer CON_RESERVA dentro de la aprobacion de contrato:
    -- la rutina contractual cambia a CONVERTIDO en esta misma transaccion.
    SELECT EXISTS (
        SELECT 1 FROM public.ven_ventas v
        JOIN public.ven_ventas_clientes vc ON vc.id_venta=v.id_venta AND vc.titular
        JOIN public.crm_clientes c ON c.id_cliente=vc.id_cliente AND c.activo
        JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=v.id_estado_venta
        JOIN public.ven_contratos ct ON ct.id_venta=v.id_venta
        JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=ct.id_estado_contrato
        WHERE c.id_persona=p_persona AND ev.codigo IN ('CONTRATADA','COMPLETADA','CONFIRMADA')
          AND ec.codigo IN ('VIGENTE','FINALIZADO')
    ) INTO v_venta_formalizada;
    IF v_venta_formalizada THEN RETURN; END IF;

    SELECT (
       EXISTS (
         SELECT 1 FROM public.ven_reservas r
         JOIN public.cfg_estados_reserva er ON er.id_estado_reserva=r.id_estado_reserva
         WHERE r.id_persona=p_persona AND er.codigo='VIGENTE'
           AND r.fecha_vencimiento>now()
       )
       OR EXISTS (
         SELECT 1 FROM public.ven_ventas v
         JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=v.id_estado_venta
         JOIN public.ven_ventas_clientes vc ON vc.id_venta=v.id_venta AND vc.titular
         JOIN public.crm_clientes c ON c.id_cliente=vc.id_cliente
         WHERE c.id_persona=p_persona AND ev.codigo='PENDIENTE'
       )
    ) INTO v_requiere_reserva;

    SELECT id_estado_prospecto INTO STRICT v_etapa_reserva
    FROM public.cfg_estados_prospecto
    WHERE codigo='CON_RESERVA' AND activo;

    IF v_requiere_reserva THEN
        IF v_etapa_actual='CON_RESERVA' THEN RETURN; END IF;
        IF v_etapa_actual NOT IN
            ('NUEVO','CONTACTADO','EN_SEGUIMIENTO','INTERESADO','NEGOCIACION') THEN
            RAISE EXCEPTION 'ETAPA_INVALIDA|El prospecto no puede ingresar a Con Reserva desde %.',v_etapa_actual;
        END IF;

        UPDATE public.crm_prospectos SET
            id_estado_pre_reserva=COALESCE(id_estado_pre_reserva,v_etapa_id),
            id_estado_prospecto=v_etapa_reserva,
            fecha_actualizacion=now()
        WHERE id_prospecto=v_prospecto;

    ELSIF v_etapa_actual='CON_RESERVA' THEN
        SELECT e.id_estado_prospecto, e.codigo
          INTO v_restaurar, v_etapa_restaurada
        FROM public.cfg_estados_prospecto e
        WHERE e.id_estado_prospecto=v_etapa_previa
          AND e.codigo IN ('NUEVO','CONTACTADO','EN_SEGUIMIENTO','INTERESADO','NEGOCIACION')
          AND e.activo;

        IF v_restaurar IS NULL THEN
            SELECT id_estado_prospecto, codigo
              INTO STRICT v_restaurar, v_etapa_restaurada
            FROM public.cfg_estados_prospecto
            WHERE codigo='NEGOCIACION' AND activo;
        END IF;

        UPDATE public.crm_prospectos SET
            id_estado_prospecto=v_restaurar,
            id_estado_pre_reserva=NULL,
            fecha_actualizacion=now()
        WHERE id_prospecto=v_prospecto;
    ELSE
        RETURN;
    END IF;

    SELECT id_tipo_seguimiento INTO v_tipo_seguimiento
    FROM public.cfg_tipos_seguimiento WHERE codigo='OTRO' AND activo;

    IF v_tipo_seguimiento IS NOT NULL THEN
        INSERT INTO public.crm_seguimientos (
            id_prospecto,id_tipo_seguimiento,asunto,detalle,resultado,
            requiere_seguimiento,id_usuario_registro
        )
        VALUES (
            v_prospecto,v_tipo_seguimiento,'Sincronizacion automatica de reserva',
            CASE WHEN v_requiere_reserva
                THEN v_etapa_actual||' -> CON_RESERVA | Reserva vigente o venta pendiente'
                ELSE 'CON_RESERVA -> '||v_etapa_restaurada||' | Sin reserva vigente ni venta pendiente'
            END,
            'Etapa sincronizada',true,NULL
        );
    END IF;
END
$function$;

REVOKE ALL ON FUNCTION public.fn_crm_sincronizar_con_reserva_v1(bigint)
FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_crm_sincronizar_con_reserva_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE v_persona bigint;
BEGIN
    IF TG_TABLE_NAME='ven_reservas' THEN
        PERFORM public.fn_crm_sincronizar_con_reserva_v1(NEW.id_persona);
    ELSIF TG_TABLE_NAME='ven_ventas_clientes' THEN
        SELECT c.id_persona INTO v_persona
        FROM public.crm_clientes c WHERE c.id_cliente=NEW.id_cliente;
        IF v_persona IS NOT NULL THEN
            PERFORM public.fn_crm_sincronizar_con_reserva_v1(v_persona);
        END IF;
    ELSIF TG_TABLE_NAME='ven_ventas' THEN
        FOR v_persona IN
            SELECT DISTINCT c.id_persona FROM public.ven_ventas_clientes vc
            JOIN public.crm_clientes c ON c.id_cliente=vc.id_cliente
            WHERE vc.id_venta=NEW.id_venta AND vc.titular
        LOOP
            PERFORM public.fn_crm_sincronizar_con_reserva_v1(v_persona);
        END LOOP;
    END IF;
    RETURN NULL;
END
$function$;

REVOKE ALL ON FUNCTION public.trg_crm_sincronizar_con_reserva_v1()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS tr_crm_reserva_etapa ON public.ven_reservas;
CREATE TRIGGER tr_crm_reserva_etapa
    AFTER UPDATE OF id_estado_reserva, fecha_vencimiento ON public.ven_reservas
    FOR EACH ROW
    WHEN (
        OLD.id_estado_reserva IS DISTINCT FROM NEW.id_estado_reserva
        OR OLD.fecha_vencimiento IS DISTINCT FROM NEW.fecha_vencimiento
    )
    EXECUTE FUNCTION public.trg_crm_sincronizar_con_reserva_v1();

DROP TRIGGER IF EXISTS tr_crm_venta_cliente_etapa ON public.ven_ventas_clientes;
CREATE TRIGGER tr_crm_venta_cliente_etapa
    AFTER INSERT ON public.ven_ventas_clientes
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_crm_sincronizar_con_reserva_v1();

DROP TRIGGER IF EXISTS tr_crm_venta_estado_etapa ON public.ven_ventas;
CREATE TRIGGER tr_crm_venta_estado_etapa
    AFTER UPDATE OF id_estado_venta ON public.ven_ventas
    FOR EACH ROW
    WHEN (OLD.id_estado_venta IS DISTINCT FROM NEW.id_estado_venta)
    EXECUTE FUNCTION public.trg_crm_sincronizar_con_reserva_v1();

-- Actualizar funciones de lectura y validacion de ventas preservando
-- sus permisos, filtros, limites, paginacion y definiciones existentes.
DO $patch$
DECLARE v_fn text; v_def text;
BEGIN
    FOREACH v_fn IN ARRAY ARRAY[
        'sp_crm_buscar_v5','sp_crm_buscar_v6',
        'sp_crm_exportar_v5','sp_crm_indicadores_v5',
        'sp_crm_indicadores_periodo_v6','sp_crm_evolucion_mensual_v6',
        'sp_crm_fuentes_periodo_v6','sp_crm_validar_formalizacion_v6'
    ]
    LOOP
        SELECT pg_get_functiondef(p.oid) INTO STRICT v_def
        FROM pg_proc p
        WHERE p.pronamespace='public'::regnamespace AND p.proname=v_fn;
        IF strpos(v_def, $old$'NEGOCIACION'$old$)=0 THEN
            RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|No se encontro NEGOCIACION en %.',v_fn;
        END IF;
        v_def:=replace(v_def,
            $old$'NEGOCIACION'$old$,
            $new$'NEGOCIACION','CON_RESERVA'$new$);
        EXECUTE v_def;
    END LOOP;
END
$patch$;

-- El catalogo sigue listando CON_RESERVA para filtros,
-- pero las operaciones manuales no pueden asignarlo ni retirarlo.
DO $patch$
DECLARE v_def text;
BEGIN
    SELECT pg_get_functiondef(oid) INTO STRICT v_def
    FROM pg_proc WHERE pronamespace='public'::regnamespace
      AND proname='sp_crm_cambiar_etapa_v3';

    IF strpos(v_def,'-- Conservar respuesta cuando no existen cambios.')=0 THEN
        RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|No se encontro punto de validacion de etapa.';
    END IF;
    v_def:=replace(v_def,
        '-- Conservar respuesta cuando no existen cambios.',
        $new$IF v_actual = 'CON_RESERVA' OR v_destino = 'CON_RESERVA' THEN
        RAISE EXCEPTION 'ETAPA_AUTOMATICA|Con Reserva se asigna o retira exclusivamente por operaciones comerciales.';
    END IF;

    -- Conservar respuesta cuando no existen cambios.$new$);
    EXECUTE v_def;
END
$patch$;

-- Ruta heredada de cambios de etapa: bloquear asignacion y salida manual.
DO $patch$
DECLARE v_def text;
BEGIN
    SELECT pg_get_functiondef(oid) INTO STRICT v_def
    FROM pg_proc WHERE pronamespace='public'::regnamespace
      AND proname='sp_cambiar_etapa_prospecto';
    IF strpos(v_def,'-- Ruta heredada: impedir que salte la aprobacion obligatoria.')=0 THEN
        RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|No se encontro validacion en ruta heredada.';
    END IF;
    v_def:=replace(v_def,
        '-- Ruta heredada: impedir que salte la aprobacion obligatoria.',
        $new$IF EXISTS (
        SELECT 1 FROM public.cfg_estados_prospecto e
        WHERE e.id_estado_prospecto=p_id_estado
          AND e.codigo='CON_RESERVA'
    ) OR EXISTS (
        SELECT 1 FROM public.crm_prospectos p
        JOIN public.cfg_estados_prospecto e ON e.id_estado_prospecto=p.id_estado_prospecto
        WHERE p.id_prospecto=p_id_prospecto
          AND e.codigo='CON_RESERVA'
    ) THEN
        RAISE EXCEPTION 'ETAPA_AUTOMATICA|Con Reserva no admite cambios de etapa manuales.';
    END IF;

    -- Ruta heredada: impedir que salte la aprobacion obligatoria.$new$);
    EXECUTE v_def;
END
$patch$;

-- No permitir separacion nueva a prospectos cerrados por perdida.
DO $patch$
DECLARE v_def text;
BEGIN
    SELECT pg_get_functiondef(oid) INTO STRICT v_def
    FROM pg_proc WHERE pronamespace='public'::regnamespace
      AND proname='sp_crm_validar_preparacion_comprobante_v1';
    IF strpos(v_def,'SELECT l.id_proyecto, el.codigo INTO v_proyecto, v_lote_estado')=0 THEN
        RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|No se encontro punto de validacion comercial.';
    END IF;
    v_def:=replace(v_def,
        'SELECT l.id_proyecto, el.codigo INTO v_proyecto, v_lote_estado',
        $new$IF EXISTS (
        SELECT 1 FROM public.crm_prospectos p
        JOIN public.cfg_estados_prospecto e ON e.id_estado_prospecto=p.id_estado_prospecto
        WHERE p.id_prospecto=p_prospecto AND e.codigo IN ('NO_INTERESADO','DESCARTADO')
    ) THEN
        RAISE EXCEPTION 'PROSPECTO_NO_ELEGIBLE|El prospecto tiene una etapa comercial final.';
    END IF;

    SELECT l.id_proyecto, el.codigo INTO v_proyecto, v_lote_estado$new$);
    EXECUTE v_def;
END
$patch$;

COMMIT;
