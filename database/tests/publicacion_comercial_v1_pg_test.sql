-- Pruebas sobre el fixture aislado y las migraciones reales 122, 123.
BEGIN;
INSERT INTO public.inm_configuracion_comercial_borradores(id_proyecto,version,configuracion,id_usuario) VALUES(1,1,'{}',1),(1,2,'{}',1);
-- Reserva historica anterior a la adopcion.
INSERT INTO public.ven_reservas(id_reserva,id_lote,id_moneda,id_estado_reserva) VALUES(100,13,1,1);
INSERT INTO public.inm_politicas_comerciales_publicadas VALUES(1,1,1,now());
INSERT INTO public.inm_politicas_comerciales_lotes(id_proyecto,version,id_lote,codigo_etapa,situacion,id_lote_precio,precio_lista,descuento,precio_final,vigente_hasta) VALUES
 (1,1,10,'E1','HABILITADA',10,30000,3000,27000,NULL),
 (1,1,11,'E4','BLOQUEADA',NULL,NULL,NULL,NULL,NULL),
 (1,1,12,'E2','HABILITADA',12,30000,0,30000,((now() AT TIME ZONE 'America/Lima')::date-1)),
 (1,1,13,NULL,'PROTEGIDA',NULL,NULL,NULL,NULL,NULL),
 (1,1,15,'E2','HABILITADA',15,30000,0,30000,NULL);
DO $test$
DECLARE s jsonb;
BEGIN
 IF has_table_privilege('anon','public.inm_politicas_comerciales_publicadas','SELECT') OR
    has_function_privilege('authenticated','public.fn_inm_comercial_snapshot_v1(bigint,integer)','EXECUTE')
 THEN RAISE EXCEPTION 'acceso publico inesperado'; END IF;
 IF public.fn_inm_comercial_snapshot_v1(20,1) IS NOT NULL THEN RAISE EXCEPTION 'proyecto legado alterado'; END IF;
 BEGIN
    INSERT INTO public.ven_reservas(id_lote,id_moneda,id_estado_reserva) VALUES(11,1,1);
    RAISE EXCEPTION 'lote bloqueado no rechazado';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE 'COMERCIAL_NO_DISPONIBLE|%' THEN RAISE; END IF; END;
 BEGIN
    INSERT INTO public.ven_ventas(id_lote,id_moneda,precio_lista,descuento,precio_venta) VALUES(12,1,30000,0,30000);
    RAISE EXCEPTION 'tarifa vencida no rechazada';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE 'COMERCIAL_NO_DISPONIBLE|%' THEN RAISE; END IF; END;
 BEGIN
    INSERT INTO public.ven_reservas(id_lote,id_moneda,id_estado_reserva) VALUES(14,1,1);
    RAISE EXCEPTION 'lote sin asignacion no rechazado';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE 'COMERCIAL_NO_DISPONIBLE|%' THEN RAISE; END IF; END;
 BEGIN
    INSERT INTO public.ven_ventas(id_lote,id_moneda,precio_lista,descuento,precio_venta) VALUES(10,1,1,0,1);
    RAISE EXCEPTION 'precio manipulado no rechazado';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE 'COMERCIAL_PRECIO_CAMBIO|%' THEN RAISE; END IF; END;
 INSERT INTO public.ven_reservas(id_reserva,id_lote,id_moneda,id_estado_reserva,politica_comercial_snapshot)
 VALUES(101,10,1,1,'{"version":999}');
 SELECT politica_comercial_snapshot INTO s FROM public.ven_reservas WHERE id_reserva=101;
 IF s->>'version' IS DISTINCT FROM '1' OR (s->>'precioFinal')::numeric IS DISTINCT FROM 27000 THEN RAISE EXCEPTION 'snapshot incorrecto'; END IF;
 UPDATE public.inm_lotes SET id_estado_lote=2 WHERE id_lote=10;
 INSERT INTO public.ven_ventas(id_lote,id_moneda,id_reserva,precio_lista,descuento,precio_venta) VALUES(13,1,100,30000,0,30000);
 -- Publicacion posterior bloquea la etapa, pero conserva la reserva ya registrada.
 INSERT INTO public.inm_politicas_comerciales_publicadas VALUES(1,2,1,now());
 INSERT INTO public.inm_politicas_comerciales_lotes(id_proyecto,version,id_lote,situacion) VALUES(1,2,10,'PROTEGIDA');
 INSERT INTO public.ven_ventas(id_lote,id_moneda,id_reserva,precio_lista,descuento,precio_venta) VALUES(10,1,101,27000,0,27000);
 IF NOT EXISTS(SELECT 1 FROM public.ven_ventas WHERE id_reserva=101 AND precio_lista=30000 AND descuento=3000 AND precio_venta=27000 AND politica_comercial_snapshot->>'version'='1') THEN
    RAISE EXCEPTION 'venta no conserva condiciones de la reserva';
 END IF;
 BEGIN
    UPDATE public.ven_ventas SET precio_venta=1 WHERE id_reserva=101;
    RAISE EXCEPTION 'precio historico mutable';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE 'COMERCIAL_INMUTABLE|%' THEN RAISE; END IF; END;
 INSERT INTO public.ven_ventas(id_lote,id_moneda,precio_lista,descuento,precio_venta) VALUES(20,1,30000,0,30000);
 IF EXISTS(SELECT 1 FROM public.ven_ventas WHERE id_lote=20 AND politica_comercial_snapshot IS NOT NULL) THEN RAISE EXCEPTION 'proyecto legado alterado'; END IF;
END;
$test$;
ROLLBACK;
