-- Solo PostgreSQL aislado. Los objetos de storage son filas sintéticas de la fixture.
BEGIN;
CREATE FUNCTION pg_temp.lote(id bigint,monto numeric DEFAULT 500) RETURNS jsonb LANGUAGE sql AS $$SELECT jsonb_build_object('idLote',id,'monto',monto,'precio',30000,'idPolitica',CASE WHEN id=109 THEN 2 ELSE 1 END)$$;
CREATE FUNCTION pg_temp.abono(lote bigint,idx integer,monto numeric,metodo text DEFAULT 'TRANSFERENCIA') RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE ruta text;
BEGIN
 ruta:='separaciones/p-1/l-'||lote||'/00000000-0000-4000-8000-'||lpad(idx::text,12,'0')||'.pdf';
 INSERT INTO storage.objects(bucket_id,name,metadata) VALUES('vouchers-separacion-private',ruta,'{"size":100,"mimetype":"application/pdf"}'::jsonb) ON CONFLICT DO NOTHING;
 RETURN jsonb_build_object('metodoPago',metodo,'numeroOperacion','OP-'||idx,'monto',monto,'claveArchivo',ruta,'nombreArchivo','voucher.pdf','tipoMime','application/pdf','tamanioBytes',100,'hashSha256',lpad(idx::text,64,'0'));
END; $$;
DO $$
DECLARE r jsonb;rep jsonb;a jsonb;b jsonb;ls jsonb;ps jsonb;pid bigint;vid bigint;g uuid:='00000000-0000-4000-8000-000000000001';n bigint;
BEGIN
 ls:=jsonb_build_array(pg_temp.lote(101),pg_temp.lote(102));ps:=jsonb_build_array(pg_temp.abono(101,1,1000));
 r:=public.sp_crm_registrar_separacion_acumulada_v1(1,g,1,ls,ps,NULL);
 IF jsonb_array_length(r->'reservas')<>2 OR jsonb_array_length(r->'abonos')<>1 OR (r->>'total')::numeric<>1000 THEN RAISE EXCEPTION 'Registro acumulado incorrecto';END IF;
 IF (SELECT count(*) FROM public.ven_reservas)<>2 OR (SELECT count(*) FROM public.pag_pagos)<>1 OR (SELECT sum(monto) FROM public.pag_pagos)<>1000
 OR (SELECT count(*) FROM public.pag_separaciones_grupo_distribucion_v1)<>2 OR (SELECT sum(monto) FROM public.pag_separaciones_grupo_distribucion_v1)<>1000 THEN RAISE EXCEPTION 'Distribución o dinero duplicado';END IF;
 rep:=public.sp_crm_registrar_separacion_acumulada_v1(1,g,1,ls,ps,NULL);
 IF rep IS DISTINCT FROM r OR (SELECT count(*) FROM public.pag_pagos)<>1 THEN RAISE EXCEPTION 'Idempotencia incorrecta';END IF;
 IF public.sp_crm_buscar_separacion_acumulada_v1(1,g,1,ls,ps,NULL)->'resultado' IS DISTINCT FROM r THEN RAISE EXCEPTION 'Consulta idempotente incorrecta';END IF;
 pid:=(r->'abonos'->0->>'idPago')::bigint;vid:=(r->'abonos'->0->>'idVoucher')::bigint;
 rep:=public.sp_finanzas_revisar_voucher_separacion_v1(1,vid,true,NULL,NULL);
 IF rep->>'estadoGrupo'<>'VIGENTE' OR (SELECT count(*) FROM public.ven_reservas WHERE id_estado_reserva=2)<>2 THEN RAISE EXCEPTION 'No se activaron ambas reservas';END IF;
 PERFORM public.sp_finanzas_conciliar_pago_confirmado_v1(1,pid,1,1);
 rep:=public.sp_finanzas_conciliar_pago_confirmado_v1(1,pid,1,1);
 IF rep->>'estado'<>'YA_CONCILIADO' OR (SELECT count(*) FROM public.fin_movimientos)<>1 OR (SELECT sum(monto) FROM public.fin_movimientos)<>1000 THEN RAISE EXCEPTION 'Conciliación duplicada';END IF;
 IF (public.sp_finanzas_listar_vouchers_separacion_v1(1,'TODOS','',1,20)->'items'->0->>'lotes_grupo') IS DISTINCT FROM 'LOTE-101, LOTE-102' THEN RAISE EXCEPTION 'Listado financiero incompleto';END IF;
 BEGIN
  PERFORM public.sp_crm_registrar_separacion_acumulada_v1(1,'00000000-0000-4000-8000-000000000002',1,jsonb_build_array(pg_temp.lote(103),pg_temp.lote(104)),jsonb_build_array(pg_temp.abono(103,2,999)),NULL);
  RAISE EXCEPTION 'Se admitió pago insuficiente';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE 'SEPARACION_MONTO_INVALIDO|%' THEN RAISE;END IF; END;
 IF (SELECT count(*) FROM public.ven_reservas)<>2 THEN RAISE EXCEPTION 'Reserva parcial';END IF;
 a:=pg_temp.abono(103,3,700);b:=pg_temp.abono(103,4,300,'YAPE_PLIN');
 r:=public.sp_crm_registrar_separacion_acumulada_v1(1,'00000000-0000-4000-8000-000000000003',1,jsonb_build_array(pg_temp.lote(103),pg_temp.lote(104)),jsonb_build_array(a,b),NULL);
 IF (SELECT count(*) FROM public.pag_separaciones_grupo_distribucion_v1 d JOIN public.ven_separaciones_grupo_lotes_v1 l USING(id_reserva) WHERE l.id_grupo='00000000-0000-4000-8000-000000000003')<>3 THEN RAISE EXCEPTION 'Distribución 700/300 incorrecta';END IF;
 rep:=public.sp_finanzas_revisar_voucher_separacion_v1(1,(r->'abonos'->0->>'idVoucher')::bigint,true,NULL,NULL);
 IF rep->>'estadoGrupo'<>'PENDIENTE' THEN RAISE EXCEPTION 'Activación prematura';END IF;
 rep:=public.sp_finanzas_revisar_voucher_separacion_v1(1,(r->'abonos'->1->>'idVoucher')::bigint,false,'Comprobante rechazado',NULL);
 IF rep->>'estadoGrupo'<>'REQUIERE_REVISION' OR EXISTS(SELECT 1 FROM public.inm_lotes WHERE id_lote IN (103,104) AND id_estado_lote<>2) THEN RAISE EXCEPTION 'Rechazo liberó lotes';END IF;
 BEGIN
  PERFORM public.sp_crm_registrar_separacion_acumulada_v1(2,'00000000-0000-4000-8000-000000000004',1,jsonb_build_array(pg_temp.lote(105),pg_temp.lote(106)),jsonb_build_array(pg_temp.abono(105,5,1000)),NULL);
  RAISE EXCEPTION 'Actor no autorizado';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE 'DENEGADO|%' THEN RAISE;END IF; END;
 r:=public.sp_crm_registrar_separacion_acumulada_v1(1,'00000000-0000-4000-8000-000000000005',1,jsonb_build_array(pg_temp.lote(109,300)),jsonb_build_array(pg_temp.abono(109,6,300)),NULL);
 pid:=(r->'abonos'->0->>'idPago')::bigint;vid:=(r->'abonos'->0->>'idVoucher')::bigint;
 IF EXISTS(SELECT 1 FROM public.pag_separaciones_grupo_abonos_v1 WHERE id_pago=pid) THEN RAISE EXCEPTION 'Separación individual dejó de ser compatible';END IF;
 PERFORM public.sp_finanzas_revisar_voucher_separacion_v1(1,vid,true,NULL,NULL);
 rep:=public.sp_finanzas_conciliar_pago_confirmado_v1(1,pid,1,1);
 IF (rep->>'monto')::numeric<>300 THEN RAISE EXCEPTION 'La conciliación sigue exigiendo S/500';END IF;
 IF has_function_privilege('anon','public.sp_crm_registrar_separacion_acumulada_v1(bigint,uuid,bigint,jsonb,jsonb,text)','EXECUTE') OR has_table_privilege('authenticated','public.pag_separaciones_grupo_distribucion_v1','SELECT') THEN RAISE EXCEPTION 'Privilegios indebidos';END IF;
END $$;

-- Convertir dos reservas distintas a modalidades distintas sin duplicar el abono original.
DO $$
DECLARE r1 bigint;r2 bigint;v1 bigint;v2 bigint;c1 bigint;c2 bigint;pl bigint;pg bigint;x jsonb;g uuid:='00000000-0000-4000-8000-000000000001';
BEGIN
 SELECT r.id_reserva INTO STRICT r1 FROM public.ven_reservas r WHERE r.id_lote=101;
 SELECT r.id_reserva INTO STRICT r2 FROM public.ven_reservas r WHERE r.id_lote=102;
 SELECT a.id_pago INTO STRICT pg FROM public.pag_separaciones_grupo_abonos_v1 a WHERE a.id_grupo=g;
 IF public.fn_crm_reserva_acreditable_v1(r1)<>500 OR public.fn_crm_reserva_acreditable_v1(r2)<>500 THEN RAISE EXCEPTION 'Crédito individual incorrecto'; END IF;
 INSERT INTO public.ven_ventas(id_lote,id_reserva,id_estado_venta,id_modalidad_venta,id_moneda,codigo,precio_venta,precio_lista,descuento)
 VALUES(101,r1,1,1,1,'TEST-VTA-1',30000,30000,0) RETURNING id_venta INTO v1;
 INSERT INTO public.ven_ventas_clientes(id_venta,id_cliente,titular) VALUES(v1,1,true);
 UPDATE public.ven_reservas SET id_estado_reserva=5 WHERE id_reserva=r1;
 INSERT INTO public.ven_contratos(id_venta,id_estado_contrato,codigo) VALUES(v1,2,'TEST-CON-1') RETURNING id_contrato INTO c1;
 INSERT INTO public.ven_contratos_aprobaciones(id_contrato,firma_revisada) VALUES(c1,true);
 UPDATE public.ven_ventas SET id_estado_venta=2 WHERE id_venta=v1;
 x:=public.sp_crm_aplicar_separacion_a_venta_v1(1,v1);
 IF (x->>'montoAplicado')::numeric<>500 OR (x->>'saldoPendienteVenta')::numeric<>29500 THEN RAISE EXCEPTION 'Saldo contado incorrecto'; END IF;
 IF public.fn_sep_grupo_pago_aplicado_v1(pg)<>500 OR public.fn_crm_reserva_acreditable_v1(r2)<>500 THEN RAISE EXCEPTION 'La primera venta consume el segundo lote'; END IF;
 IF public.sp_crm_aplicar_separacion_a_venta_v1(1,v1)->>'estado'<>'YA_APLICADO' THEN RAISE EXCEPTION 'Crédito no idempotente'; END IF;
 INSERT INTO public.ven_ventas(id_lote,id_reserva,id_estado_venta,id_modalidad_venta,id_moneda,codigo,precio_venta,precio_lista,descuento)
 VALUES(102,r2,1,2,1,'TEST-VTA-2',30000,30000,0) RETURNING id_venta INTO v2;
 INSERT INTO public.ven_ventas_clientes(id_venta,id_cliente,titular) VALUES(v2,1,true);
 UPDATE public.ven_reservas SET id_estado_reserva=5 WHERE id_reserva=r2;
 INSERT INTO public.ven_contratos(id_venta,id_estado_contrato,codigo) VALUES(v2,2,'TEST-CON-2') RETURNING id_contrato INTO c2;
 INSERT INTO public.ven_contratos_aprobaciones(id_contrato,firma_revisada) VALUES(c2,true);
 INSERT INTO public.pag_planes_pago(id_venta,id_estado_plan_pago,monto_inicial,monto_reserva_aplicada,capital_financiado,es_vigente)
 VALUES(v2,2,4500,500,25000,true) RETURNING id_plan_pago INTO pl;
 UPDATE public.ven_ventas SET id_estado_venta=2 WHERE id_venta=v2;
 x:=public.sp_crm_aplicar_separacion_a_venta_v1(1,v2);
 IF (x->>'montoAplicado')::numeric<>500 OR (x->>'saldoPendienteInicial')::numeric<>4500 OR (x->>'capitalFinanciado')::numeric<>25000 THEN RAISE EXCEPTION 'Saldo financiado incorrecto'; END IF;
 IF public.fn_sep_grupo_pago_aplicado_v1(pg)<>1000 OR public.fn_sep_credito_venta_confirmado_v1(v1,r1)<>500 OR public.fn_sep_credito_venta_confirmado_v1(v2,r2)<>500 THEN RAISE EXCEPTION 'Crédito total incorrecto'; END IF;
 IF (SELECT count(*) FROM public.pag_pagos WHERE id_pago=pg AND monto=1000 AND id_venta IS NULL AND id_plan_pago IS NULL)<>1 OR (SELECT count(*) FROM public.fin_movimientos WHERE id_pago=pg AND monto=1000)<>1 THEN RAISE EXCEPTION 'Cobranza original alterada o duplicada'; END IF;
 BEGIN
  PERFORM public.sp_crm_aplicar_separacion_a_venta_v1(2,v2);
  RAISE EXCEPTION 'Se admitió actor no autorizado';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE 'DENEGADO|%' THEN RAISE; END IF; END;
 IF (public.fn_crm_resumen_financiero_anulacion_v1('VENTA',v2)->>'creditoDistribuido')::numeric<>500 THEN RAISE EXCEPTION 'La anulación no reconoce el crédito del lote'; END IF;
END $$;
ROLLBACK;
