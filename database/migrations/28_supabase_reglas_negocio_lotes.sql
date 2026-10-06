-- ==============================================================================
-- SGI MONOLITHE
-- MIGRACION 28 - REGLAS DE NEGOCIO DE LOTES Y SEPARACIONES
-- ==============================================================================
-- Objetivos:
--   1. Proteger las transiciones de estado de los lotes.
--   2. Impedir cambios comerciales manuales.
--   3. Mantener trazabilidad obligatoria.
--   4. Fortalecer el proceso de separación.
--   5. Eliminar la sobrecarga legacy de sp_registrar_separacion.
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. ELIMINAR SOBRECARGA LEGACY DE SEPARACION
-- ==============================================================================
-- Esta version antigua utiliza:
--   id_prospecto
--   id_asesor
--   estado ACTIVA
--   estado de lote SEPARADO
--
-- Ya no corresponde al modelo actual.
-- ==============================================================================

DROP FUNCTION IF EXISTS public.sp_registrar_separacion(
    BIGINT,
    BIGINT,
    BIGINT,
    NUMERIC,
    BIGINT,
    CHARACTER VARYING
);


-- ==============================================================================
-- 2. ENDURECER CAMBIO DE ESTADO DE LOTE
-- ==============================================================================
--
-- TRANSICIONES ADMINISTRATIVAS PERMITIDAS:
--
-- DISPONIBLE
--   -> BLOQUEADO
--   -> NO_DISPONIBLE
--
-- BLOQUEADO
--   -> DISPONIBLE
--   -> NO_DISPONIBLE
--
-- NO_DISPONIBLE
--   -> DISPONIBLE
--   -> BLOQUEADO
--
-- TRANSICIONES COMERCIALES:
--
-- DISPONIBLE -> RESERVADO
-- Solo si existe una reserva VIGENTE para el lote.
--
-- VENDIDO:
-- No puede asignarse mediante esta funcion.
-- Debe provenir exclusivamente del proceso formal de venta.
--
-- RESERVADO:
-- No puede liberarse manualmente mediante esta funcion.
-- Debe gestionarse mediante el flujo de reserva:
-- vencimiento, cancelacion o conversion en venta.
--
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.sp_cambiar_estado_lote(
    p_id_lote BIGINT,
    p_codigo_nuevo_estado VARCHAR,
    p_id_usuario BIGINT DEFAULT NULL,
    p_motivo VARCHAR DEFAULT 'Cambio de estado operativo'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_estado_actual      INT;
    v_codigo_estado_actual  VARCHAR;
    v_id_nuevo_estado       INT;
    v_codigo_nuevo_estado   VARCHAR;
    v_lote_activo           BOOLEAN;
    v_tiene_permiso         BOOLEAN;
    v_reserva_vigente       BOOLEAN;
    v_motivo                VARCHAR;
BEGIN

    -- --------------------------------------------------------------------------
    -- Usuario obligatorio
    -- --------------------------------------------------------------------------

    IF p_id_usuario IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message',
            'No fue posible identificar al usuario que solicita la operacion.'
        );
    END IF;


    -- --------------------------------------------------------------------------
    -- RBAC
    -- --------------------------------------------------------------------------

    SELECT EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ur
        INNER JOIN public.seg_roles r
            ON r.id_rol = ur.id_rol
        INNER JOIN public.seg_roles_permisos rp
            ON rp.id_rol = r.id_rol
        INNER JOIN public.seg_permisos p
            ON p.id_permiso = rp.id_permiso
        WHERE ur.id_usuario = p_id_usuario
          AND ur.activo = TRUE
          AND r.activo = TRUE
          AND rp.activo = TRUE
          AND p.activo = TRUE
          AND p.codigo = 'lots.edit'
    )
    INTO v_tiene_permiso;

    IF NOT v_tiene_permiso THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message',
            'Permiso denegado para modificar el estado del lote.'
        );
    END IF;


    -- --------------------------------------------------------------------------
    -- Bloquear el lote durante la transaccion
    -- --------------------------------------------------------------------------

    SELECT
        l.id_estado_lote,
        el.codigo,
        l.activo
    INTO
        v_id_estado_actual,
        v_codigo_estado_actual,
        v_lote_activo
    FROM public.inm_lotes l
    INNER JOIN public.cfg_estados_lote el
        ON el.id_estado_lote = l.id_estado_lote
    WHERE l.id_lote = p_id_lote
    FOR UPDATE OF l;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message',
            'El lote especificado no existe.'
        );
    END IF;

    IF NOT COALESCE(v_lote_activo, FALSE) THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message',
            'No se puede modificar el estado de un lote inactivo.'
        );
    END IF;


    -- --------------------------------------------------------------------------
    -- Validar nuevo estado
    -- --------------------------------------------------------------------------

    v_codigo_nuevo_estado := UPPER(TRIM(p_codigo_nuevo_estado));

    SELECT id_estado_lote
    INTO v_id_nuevo_estado
    FROM public.cfg_estados_lote
    WHERE codigo = v_codigo_nuevo_estado
      AND activo = TRUE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message',
            'El estado especificado no existe o no se encuentra activo.'
        );
    END IF;


    -- --------------------------------------------------------------------------
    -- Sin cambios
    -- --------------------------------------------------------------------------

    IF v_id_estado_actual = v_id_nuevo_estado THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'message',
            'El lote ya se encuentra en dicho estado.',
            'id_lote',
            p_id_lote,
            'nuevo_estado',
            v_codigo_nuevo_estado
        );
    END IF;


    -- --------------------------------------------------------------------------
    -- VENDIDO es terminal para cambios administrativos
    -- --------------------------------------------------------------------------

    IF v_codigo_estado_actual = 'VENDIDO' THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message',
            'Un lote vendido no puede cambiar de estado mediante una operacion administrativa.'
        );
    END IF;


    -- --------------------------------------------------------------------------
    -- VENDIDO nunca puede asignarse manualmente
    -- --------------------------------------------------------------------------

    IF v_codigo_nuevo_estado = 'VENDIDO' THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message',
            'El estado VENDIDO solo puede asignarse mediante el proceso formal de venta.'
        );
    END IF;


    -- --------------------------------------------------------------------------
    -- RESERVADO no puede liberarse administrativamente
    -- --------------------------------------------------------------------------

    IF v_codigo_estado_actual = 'RESERVADO' THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message',
            'El estado de un lote reservado debe gestionarse mediante el proceso de reserva.'
        );
    END IF;


    -- --------------------------------------------------------------------------
    -- DISPONIBLE -> RESERVADO
    -- Solo si existe una reserva VIGENTE real.
    -- --------------------------------------------------------------------------

    IF v_codigo_nuevo_estado = 'RESERVADO' THEN

        IF v_codigo_estado_actual <> 'DISPONIBLE' THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'message',
                'Solo un lote DISPONIBLE puede pasar a RESERVADO.'
            );
        END IF;

        SELECT EXISTS (
            SELECT 1
            FROM public.ven_reservas vr
            INNER JOIN public.cfg_estados_reserva er
                ON er.id_estado_reserva = vr.id_estado_reserva
            WHERE vr.id_lote = p_id_lote
              AND er.codigo = 'VIGENTE'
              AND er.activo = TRUE
              AND vr.fecha_vencimiento > timezone('utc'::text, now())
        )
        INTO v_reserva_vigente;

        IF NOT v_reserva_vigente THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'message',
                'El lote no puede pasar a RESERVADO porque no existe una reserva vigente.'
            );
        END IF;

    ELSE

        -- ----------------------------------------------------------------------
        -- Transiciones administrativas permitidas
        -- ----------------------------------------------------------------------

        IF NOT (
            (
                v_codigo_estado_actual = 'DISPONIBLE'
                AND v_codigo_nuevo_estado IN (
                    'BLOQUEADO',
                    'NO_DISPONIBLE'
                )
            )
            OR
            (
                v_codigo_estado_actual = 'BLOQUEADO'
                AND v_codigo_nuevo_estado IN (
                    'DISPONIBLE',
                    'NO_DISPONIBLE'
                )
            )
            OR
            (
                v_codigo_estado_actual = 'NO_DISPONIBLE'
                AND v_codigo_nuevo_estado IN (
                    'DISPONIBLE',
                    'BLOQUEADO'
                )
            )
        ) THEN

            RETURN jsonb_build_object(
                'success', FALSE,
                'message',
                CONCAT(
                    'Transicion de estado no permitida: ',
                    v_codigo_estado_actual,
                    ' -> ',
                    v_codigo_nuevo_estado,
                    '.'
                )
            );

        END IF;

    END IF;


    -- --------------------------------------------------------------------------
    -- Normalizar motivo
    -- --------------------------------------------------------------------------

    v_motivo := NULLIF(TRIM(p_motivo), '');

    IF v_motivo IS NULL THEN
        v_motivo := 'Cambio de estado operativo';
    END IF;


    -- --------------------------------------------------------------------------
    -- Actualizar lote
    -- --------------------------------------------------------------------------

    UPDATE public.inm_lotes
    SET
        id_estado_lote = v_id_nuevo_estado,
        fecha_actualizacion = timezone('utc'::text, now())
    WHERE id_lote = p_id_lote;


    -- --------------------------------------------------------------------------
    -- Historial obligatorio
    -- --------------------------------------------------------------------------

    INSERT INTO public.inm_lotes_historial_estado (
        id_lote,
        id_estado_anterior,
        id_estado_nuevo,
        motivo,
        fecha_cambio,
        id_usuario
    )
    VALUES (
        p_id_lote,
        v_id_estado_actual,
        v_id_nuevo_estado,
        v_motivo,
        timezone('utc'::text, now()),
        p_id_usuario
    );


    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'Estado del lote actualizado correctamente.',
        'id_lote', p_id_lote,
        'estado_anterior', v_codigo_estado_actual,
        'nuevo_estado', v_codigo_nuevo_estado
    );

END;
$$;


-- ==============================================================================
-- 3. FORTALECER SEPARACION DE LOTE
-- ==============================================================================
--
-- Reglas:
--   - usuario obligatorio;
--   - permiso lots.edit;
--   - lote existente y activo;
--   - lote DISPONIBLE;
--   - lock FOR UPDATE para evitar doble reserva concurrente;
--   - estado de reserva VIGENTE tomado por codigo;
--   - moneda PEN tomada por codigo;
--   - S/ 500;
--   - vigencia 7 dias;
--   - si falla cambio de estado, rollback completo.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.sp_registrar_separacion(
    p_id_lote BIGINT,
    p_id_persona BIGINT,
    p_id_usuario BIGINT DEFAULT NULL,
    p_observaciones VARCHAR DEFAULT 'Separacion regular de lote'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_estado_actual              VARCHAR;
    v_lote_activo                BOOLEAN;

    v_id_estado_reserva_vigente  INT;
    v_id_moneda_pen              INT;

    v_id_reserva                 BIGINT;
    v_fecha_vencimiento          TIMESTAMPTZ;

    v_monto_reserva CONSTANT NUMERIC(14,2) := 500.00;

    v_tiene_permiso              BOOLEAN;
    v_resultado_estado           JSONB;
BEGIN

    -- --------------------------------------------------------------------------
    -- Usuario obligatorio
    -- --------------------------------------------------------------------------

    IF p_id_usuario IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message',
            'No fue posible identificar al usuario que solicita la separacion.'
        );
    END IF;


    -- --------------------------------------------------------------------------
    -- RBAC
    -- --------------------------------------------------------------------------

    SELECT EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ur
        INNER JOIN public.seg_roles r
            ON r.id_rol = ur.id_rol
        INNER JOIN public.seg_roles_permisos rp
            ON rp.id_rol = r.id_rol
        INNER JOIN public.seg_permisos p
            ON p.id_permiso = rp.id_permiso
        WHERE ur.id_usuario = p_id_usuario
          AND ur.activo = TRUE
          AND r.activo = TRUE
          AND rp.activo = TRUE
          AND p.activo = TRUE
          AND p.codigo = 'lots.edit'
    )
    INTO v_tiene_permiso;

    IF NOT v_tiene_permiso THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message',
            'Permiso denegado para registrar la separacion del lote.'
        );
    END IF;


    -- --------------------------------------------------------------------------
    -- Validar persona
    -- --------------------------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM public.core_personas
        WHERE id_persona = p_id_persona
    ) THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message',
            'La persona indicada no existe.'
        );
    END IF;


    -- --------------------------------------------------------------------------
    -- Lock del lote
    -- --------------------------------------------------------------------------

    SELECT
        el.codigo,
        l.activo
    INTO
        v_estado_actual,
        v_lote_activo
    FROM public.inm_lotes l
    INNER JOIN public.cfg_estados_lote el
        ON el.id_estado_lote = l.id_estado_lote
    WHERE l.id_lote = p_id_lote
    FOR UPDATE OF l;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message',
            'El lote especificado no existe.'
        );
    END IF;

    IF NOT COALESCE(v_lote_activo, FALSE) THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message',
            'No se puede separar un lote inactivo.'
        );
    END IF;

    IF v_estado_actual <> 'DISPONIBLE' THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message',
            CONCAT(
                'No se puede separar el lote porque se encuentra en estado ',
                v_estado_actual,
                '.'
            )
        );
    END IF;


    -- --------------------------------------------------------------------------
    -- Catálogos reales
    -- --------------------------------------------------------------------------

    SELECT id_estado_reserva
    INTO v_id_estado_reserva_vigente
    FROM public.cfg_estados_reserva
    WHERE codigo = 'VIGENTE'
      AND activo = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'No existe un estado de reserva VIGENTE activo';
    END IF;


    SELECT id_moneda
    INTO v_id_moneda_pen
    FROM public.cfg_monedas
    WHERE codigo = 'PEN'
      AND activo = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'No existe la moneda PEN activa';
    END IF;


    -- --------------------------------------------------------------------------
    -- Evitar reserva vigente duplicada
    -- --------------------------------------------------------------------------

    IF EXISTS (
        SELECT 1
        FROM public.ven_reservas vr
        INNER JOIN public.cfg_estados_reserva er
            ON er.id_estado_reserva = vr.id_estado_reserva
        WHERE vr.id_lote = p_id_lote
          AND er.codigo = 'VIGENTE'
          AND vr.fecha_vencimiento > timezone('utc'::text, now())
    ) THEN

        RETURN jsonb_build_object(
            'success', FALSE,
            'message',
            'El lote ya posee una reserva vigente.'
        );

    END IF;


    -- --------------------------------------------------------------------------
    -- Crear reserva
    -- --------------------------------------------------------------------------

    v_fecha_vencimiento :=
        timezone('utc'::text, now()) + INTERVAL '7 days';

    INSERT INTO public.ven_reservas (
        id_lote,
        id_persona,
        id_estado_reserva,
        id_moneda,
        codigo,
        fecha_reserva,
        fecha_vencimiento,
        monto_reserva,
        observaciones,
        id_usuario_registro
    )
    VALUES (
        p_id_lote,
        p_id_persona,
        v_id_estado_reserva_vigente,
        v_id_moneda_pen,
        CONCAT(
            'RES-',
            p_id_lote,
            '-',
            EXTRACT(EPOCH FROM clock_timestamp())::BIGINT
        ),
        timezone('utc'::text, now()),
        v_fecha_vencimiento,
        v_monto_reserva,
        NULLIF(TRIM(p_observaciones), ''),
        p_id_usuario
    )
    RETURNING id_reserva
    INTO v_id_reserva;


    -- --------------------------------------------------------------------------
    -- Cambiar a RESERVADO
    -- --------------------------------------------------------------------------

    v_resultado_estado := public.sp_cambiar_estado_lote(
        p_id_lote,
        'RESERVADO',
        p_id_usuario,
        CONCAT(
            'Separacion generada: #',
            v_id_reserva,
            ' con vigencia de 7 dias'
        )
    );


    -- --------------------------------------------------------------------------
    -- Si falla cambio de estado:
    -- lanzar excepción para revertir también el INSERT de reserva.
    -- --------------------------------------------------------------------------

    IF NOT COALESCE(
        (v_resultado_estado ->> 'success')::BOOLEAN,
        FALSE
    ) THEN

        RAISE EXCEPTION
            '%',
            COALESCE(
                v_resultado_estado ->> 'message',
                'No fue posible cambiar el lote a RESERVADO'
            );

    END IF;


    RETURN jsonb_build_object(
        'success', TRUE,
        'message',
        'Lote separado exitosamente por 7 dias calendario.',
        'id_reserva',
        v_id_reserva,
        'fecha_vencimiento',
        v_fecha_vencimiento,
        'monto_reserva',
        v_monto_reserva
    );

END;
$$;


-- ==============================================================================
-- 4. COMENTARIOS DE DOCUMENTACION
-- ==============================================================================

COMMENT ON FUNCTION public.sp_cambiar_estado_lote(
    BIGINT,
    VARCHAR,
    BIGINT,
    VARCHAR
)
IS
'Cambio auditado de estado de lote. Solo permite transiciones administrativas
y DISPONIBLE->RESERVADO cuando existe una reserva VIGENTE. VENDIDO se gestiona
exclusivamente mediante el flujo formal de ventas.';


COMMENT ON FUNCTION public.sp_registrar_separacion(
    BIGINT,
    BIGINT,
    BIGINT,
    VARCHAR
)
IS
'Registra una separacion de lote por S/ 500 durante 7 dias. Bloquea el lote
durante la transaccion y cambia su estado de DISPONIBLE a RESERVADO con
trazabilidad.';


COMMIT;