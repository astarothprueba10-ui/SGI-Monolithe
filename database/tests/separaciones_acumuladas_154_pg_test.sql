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
ROLLBACK;
