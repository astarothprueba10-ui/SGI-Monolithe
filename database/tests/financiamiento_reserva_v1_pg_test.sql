-- Test de credito de reserva: Postgres efimero CI, sin datos de produccion.
DO $test$
DECLARE
 v_perm record;
 v_num integer:=0;
BEGIN
 INSERT INTO public.cfg_estados_reserva(id_estado_reserva,codigo) VALUES(1,'VIGENTE');
 INSERT INTO public.cfg_estados_pago(id_estado_pago,codigo)
 VALUES (1,'CONFIRMADO'),(2,'REGISTRADO');
 INSERT INTO public.cfg_estados_voucher(id_estado_voucher,codigo)
 VALUES(1,'APROBADO'),(2,'RECHAZADO');
 INSERT INTO public.cfg_tipos_aplicacion_pago(id_tipo_aplicacion_pago,codigo)
 VALUES (1,'SEPARACION'),(2,'INICIAL');

 INSERT INTO public.ven_reservas(
   id_reserva,id_estado_reserva,monto_reserva,fecha_vencimiento,id_moneda,codigo)
 VALUES (1,1,500,now()+interval '1 day',1,'RES-CI-001');
 INSERT INTO public.pag_pagos(
   id_pago,id_reserva,id_estado_pago,monto,id_moneda,id_venta,id_plan_pago)
 VALUES (1,1,1,500,1,NULL,NULL);
 INSERT INTO public.pag_vouchers(id_pago,id_estado_voucher,activo)
 VALUES (1,1,true);

 IF public.fn_crm_reserva_acreditable_v1(1)<>500 THEN
   RAISE EXCEPTION 'Una reserva CONFIRMADA y APROBADA debe acreditar 500.';
 END IF;
 -- Pago no confirmado: nunca acredita.
 UPDATE public.pag_pagos SET id_estado_pago=2 WHERE id_pago=1;
 IF public.fn_crm_reserva_acreditable_v1(1)<>0 THEN
   RAISE EXCEPTION 'Reserva no confirmada se acredito indebidamente.';
 END IF;
 UPDATE public.pag_pagos SET id_estado_pago=1 WHERE id_pago=1;
 -- Comprobante rechazado: nunca acredita.
 UPDATE public.pag_vouchers SET id_estado_voucher=2 WHERE id_pago=1;
 IF public.fn_crm_reserva_acreditable_v1(1)<>0 THEN
   RAISE EXCEPTION 'Comprobante rechazado se acredito indebidamente.';
 END IF;
 UPDATE public.pag_vouchers SET id_estado_voucher=1 WHERE id_pago=1;
 -- El mismo pago usado en otro concepto queda excluido.
 INSERT INTO public.pag_aplicaciones_pago(
   id_pago,id_tipo_aplicacion_pago,activo,id_plan_pago,id_cuota)
 VALUES (1,2,true,10,NULL);
 IF public.fn_crm_reserva_acreditable_v1(1)<>0 THEN
   RAISE EXCEPTION 'Se duplico un pago aplicado previamente.';
 END IF;
 DELETE FROM public.pag_aplicaciones_pago WHERE id_pago=1;
 -- Una aplicacion previa de SEPARACION aun no convertida es apta.
 INSERT INTO public.pag_aplicaciones_pago(
   id_pago,id_tipo_aplicacion_pago,activo,id_plan_pago,id_cuota)
 VALUES (1,1,true,NULL,NULL);
 IF public.fn_crm_reserva_acreditable_v1(1)<>500 THEN
   RAISE EXCEPTION 'Se rechazo una separacion valida no convertida.';
 END IF;
 -- Un segundo pago activo de una misma reserva debe bloquear su acreditacion.
 INSERT INTO public.pag_pagos(
   id_pago,id_reserva,id_estado_pago,monto,id_moneda,id_venta,id_plan_pago)
 VALUES(2,1,2,500,1,NULL,NULL);
 IF public.fn_crm_reserva_acreditable_v1(1)<>0 THEN
   RAISE EXCEPTION 'Se acredito reserva con multiples pagos activos.';
 END IF;

 FOR v_perm IN
  SELECT oid,proname FROM pg_proc
  WHERE pronamespace='public'::regnamespace AND proname IN (
    'fn_crm_reserva_acreditable_v1','fn_crm_simular_frances_v3',
    'sp_crm_validar_formalizacion_v10',
    'sp_crm_registrar_venta_pendiente_v10',
    'sp_crm_registrar_venta_pendiente_v14',
    'sp_crm_aprobar_firma_contrato_v7',
    'sp_crm_cronograma_venta_v2',
    'sp_crm_reservas_vigentes_para_venta_v2')
 LOOP
   v_num:=v_num+1;
   IF has_function_privilege('anon',v_perm.oid,'EXECUTE')
      OR has_function_privilege('authenticated',v_perm.oid,'EXECUTE')
      OR NOT has_function_privilege('sigi_app_user',v_perm.oid,'EXECUTE')
   THEN
     RAISE EXCEPTION 'Permisos indebidos en %',v_perm.proname;
   END IF;
 END LOOP;
 IF v_num<>8 THEN
   RAISE EXCEPTION 'No se crearon todos los procedimientos versionados: %',v_num;
 END IF;
 RAISE NOTICE 'EXITO: 6 casos de reserva y 8 funciones autorizadas solo al backend.';
END $test$;
