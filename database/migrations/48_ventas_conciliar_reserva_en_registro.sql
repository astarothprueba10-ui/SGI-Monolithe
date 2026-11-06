-- Impedir que la reserva cambie entre la validacion y la escritura.
-- La venta y el plan se revierten si el abono acreditado ya no coincide.
DO $patch$
DECLARE v_def text;
BEGIN
 SELECT pg_get_functiondef(oid) INTO STRICT v_def
 FROM pg_proc WHERE pronamespace='public'::regnamespace
 AND proname='sp_crm_registrar_venta_pendiente_v7';
 IF strpos(v_def,'v_reserva_tras_registro numeric;')>0 THEN RETURN; END IF;
 IF strpos(v_def,' v_reserva numeric;')=0 OR strpos(v_def,' IF p_modalidad=''FINANCIADA'' THEN')=0 THEN
  RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Firma de registro de venta modificada.';
 END IF;
 v_def:=replace(v_def,' v_reserva numeric;',
  ' v_reserva numeric;
 v_reserva_tras_registro numeric;');
 v_def:=replace(v_def,
   ' IF p_modalidad=''FINANCIADA'' THEN',
   ' SELECT coalesce(r.monto_reserva,0) INTO STRICT v_reserva_tras_registro
     FROM public.ven_ventas venta
     LEFT JOIN public.ven_reservas r ON r.id_reserva=venta.id_reserva
     WHERE venta.id_venta=(v_resultado->>''idVenta'')::bigint;
   IF v_reserva_tras_registro<>v_reserva THEN
     RAISE EXCEPTION ''RESERVA_CAMBIO|La reserva cambió durante el registro; revalide la operación.'';
   END IF;
   IF p_modalidad=''FINANCIADA'' THEN');
 EXECUTE v_def;
END $patch$;
