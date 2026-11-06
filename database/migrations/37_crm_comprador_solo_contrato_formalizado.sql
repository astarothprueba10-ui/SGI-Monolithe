-- SGI MONOLITHE | El expediente no considera comprador a una venta pendiente.
-- Sin afectar idCliente ni el historial de ventas que aun esperan firma.
DO $patch$
DECLARE
    v_def text;
    v_anterior text := $old$JOIN public.ven_ventas_clientes vc
                ON vc.id_cliente = c.id_cliente
            WHERE c.id_persona = v_persona$old$;
    v_nuevo text := $new$JOIN public.ven_ventas_clientes vc
                ON vc.id_cliente = c.id_cliente
            JOIN public.ven_ventas ve
                ON ve.id_venta = vc.id_venta
            JOIN public.cfg_estados_venta ev
                ON ev.id_estado_venta = ve.id_estado_venta
               AND ev.codigo IN ('CONFIRMADA','CONTRATADA','COMPLETADA')
            JOIN public.ven_contratos ct
                ON ct.id_venta = ve.id_venta
            JOIN public.cfg_estados_contrato ec
                ON ec.id_estado_contrato = ct.id_estado_contrato
               AND ec.codigo IN ('VIGENTE','FINALIZADO')
            WHERE c.id_persona = v_persona$new$;
BEGIN
    SELECT pg_get_functiondef(oid) INTO STRICT v_def
    FROM pg_proc
    WHERE pronamespace='public'::regnamespace
      AND proname='sp_crm_detalle_prospecto_v4';

    v_def := replace(v_def,chr(13),'');
    IF strpos(v_def,
        $already$ev.codigo IN ('CONFIRMADA','CONTRATADA','COMPLETADA')$already$)>0 THEN
        RETURN;
    END IF;
    IF strpos(v_def,v_anterior)=0 THEN
        RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|La definicion de expediente CRM cambio.';
    END IF;

    v_def := replace(v_def,v_anterior,v_nuevo);
    EXECUTE v_def;
END
$patch$;
