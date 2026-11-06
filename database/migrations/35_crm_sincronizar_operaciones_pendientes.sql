-- SGI MONOLITHE | Backfill de CON_RESERVA para operaciones previas.
-- Recalcula solo prospectos con reserva VIGENTE o venta PENDIENTE;
-- no crea ventas, reservas, clientes ni modifica documentos.
DO $backfill$
DECLARE
    v_persona record;
BEGIN
    FOR v_persona IN
        SELECT DISTINCT id_persona FROM (
            SELECT r.id_persona
            FROM public.ven_reservas r
            JOIN public.cfg_estados_reserva er ON er.id_estado_reserva=r.id_estado_reserva
            WHERE er.codigo='VIGENTE' AND r.fecha_vencimiento>now()
            UNION
            SELECT c.id_persona
            FROM public.ven_ventas v
            JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=v.id_estado_venta
            JOIN public.ven_ventas_clientes vc ON vc.id_venta=v.id_venta AND vc.titular
            JOIN public.crm_clientes c ON c.id_cliente=vc.id_cliente
            WHERE ev.codigo='PENDIENTE'
        ) personas
        ORDER BY id_persona
    LOOP
        PERFORM public.fn_crm_sincronizar_con_reserva_v1(v_persona.id_persona);
    END LOOP;
END
$backfill$;
