-- SGI MONOLITHE | Evitar bajas de prospectos con pagos/reservas abiertas.
-- Respetar flujo actual de seguridad, roles, ventas y visitas.
DO $patch$
DECLARE v_def text;
BEGIN
    SELECT pg_get_functiondef(oid) INTO STRICT v_def
    FROM pg_proc
    WHERE pronamespace='public'::regnamespace
      AND proname='sp_crm_desactivar_prospecto_v5';

    IF strpos(v_def,'RESERVA_ACTIVA|Debe resolver las separaciones pendientes o vigentes')>0 THEN
        RETURN;
    END IF;
    IF strpos(v_def,'-- 6. No desactivar prospectos con ventas vigentes.')=0 THEN
        RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|La rutina de baja CRM cambio de estructura.';
    END IF;

    v_def:=replace(
      v_def,
      '-- 6. No desactivar prospectos con ventas vigentes.',
      $guard$-- No permitir baja con dinero en revision o una reserva vigente.
    IF EXISTS (
        SELECT 1 FROM public.ven_reservas res
        JOIN public.cfg_estados_reserva er
          ON er.id_estado_reserva=res.id_estado_reserva
        WHERE res.id_persona=v_persona
          AND er.codigo IN ('PENDIENTE','VIGENTE')
    ) THEN
        RAISE EXCEPTION 'RESERVA_ACTIVA|Debe resolver las separaciones pendientes o vigentes antes de desactivar al prospecto.';
    END IF;

    -- 6. No desactivar prospectos con ventas vigentes.$guard$
    );
    EXECUTE v_def;
END
$patch$;
