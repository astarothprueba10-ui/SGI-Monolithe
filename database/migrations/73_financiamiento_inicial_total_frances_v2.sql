-- SGI-MONOLITHE | Sprint 4 | 5.2.2
-- SOLO NUEVAS VENTAS: inicial total minima S/ 5,000 y reserva de S/ 500
-- confirmada, con intereses frances 10% TNA y redondeo exacto en centimos.
-- No modifica registros existentes. Las versiones anteriores permanecen intactas.
-- Aplicar ANTES de desplegar core-service/backoffice de esta rama.

-- La reserva existe, pero solo se acredita si el pago esta CONFIRMADO,
-- sus comprobantes vigentes estan APROBADOS y no fue asignada a otra venta.
CREATE OR REPLACE FUNCTION public.fn_crm_reserva_acreditable_v1(p_reserva bigint)
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
 SELECT COALESCE((
   SELECT CASE WHEN r.monto_reserva=500.00
      AND er.codigo='VIGENTE' AND r.fecha_vencimiento>now()
      AND (
        SELECT count(*) FROM public.pag_pagos pg
        JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=pg.id_estado_pago
        WHERE pg.id_reserva=r.id_reserva AND ep.codigo<>'ANULADO'
      )=1
      AND EXISTS(
        SELECT 1 FROM public.pag_pagos pg
        JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=pg.id_estado_pago
        WHERE pg.id_reserva=r.id_reserva AND ep.codigo='CONFIRMADO'
          AND pg.monto=r.monto_reserva AND pg.id_moneda=r.id_moneda
          AND pg.id_venta IS NULL AND pg.id_plan_pago IS NULL
          AND EXISTS(
            SELECT 1 FROM public.pag_vouchers vo
            JOIN public.cfg_estados_voucher ev ON ev.id_estado_voucher=vo.id_estado_voucher
            WHERE vo.id_pago=pg.id_pago AND vo.activo AND ev.codigo='APROBADO'
          )
          AND NOT EXISTS(
            SELECT 1 FROM public.pag_vouchers vo
            JOIN public.cfg_estados_voucher ev ON ev.id_estado_voucher=vo.id_estado_voucher
            WHERE vo.id_pago=pg.id_pago AND vo.activo AND ev.codigo<>'APROBADO'
          )
          AND NOT EXISTS(
            SELECT 1 FROM public.pag_aplicaciones_pago ap
            JOIN public.cfg_tipos_aplicacion_pago tp ON tp.id_tipo_aplicacion_pago=ap.id_tipo_aplicacion_pago
            WHERE ap.id_pago=pg.id_pago AND ap.activo
              AND (tp.codigo<>'SEPARACION' OR ap.id_plan_pago IS NOT NULL OR ap.id_cuota IS NOT NULL)
          )
      )
      THEN r.monto_reserva ELSE 0::numeric END
   FROM public.ven_reservas r
   JOIN public.cfg_estados_reserva er ON er.id_estado_reserva=r.id_estado_reserva
   WHERE r.id_reserva=p_reserva
 ),0::numeric);
$fn$;

-- En esta version el parametro p_inicial_total INCLUYE cualquier reserva
-- acreditada. Se expone adicional=total-reserva; NO se descuenta dos veces.
-- La tasa mensual es 10/12 por ciento, no TEA 10%.
CREATE OR REPLACE FUNCTION public.fn_crm_simular_frances_v3(
 p_precio numeric,p_reserva numeric,p_inicial_total numeric,
 p_cuotas integer,p_tasa_mensual_pct numeric)
RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE
 v_capital numeric(14,2);
 v_saldo numeric(14,2);
 v_cuota_base numeric(14,2);
 v_amortizacion numeric(14,2);
 v_interes numeric(14,2);
 v_cuota numeric(14,2);
 v_intereses numeric(14,2):=0;
 v_items jsonb:='[]'::jsonb;
 v_i integer;
BEGIN
 IF p_precio IS NULL OR p_precio<=0 OR p_precio<>round(p_precio,2)
    OR p_reserva IS NULL OR p_reserva<0 OR p_reserva<>round(p_reserva,2)
    OR p_inicial_total IS NULL OR p_inicial_total<>round(p_inicial_total,2)
    OR p_inicial_total<5000 OR p_inicial_total>=p_precio
    OR p_reserva>p_inicial_total OR p_reserva>500
    OR p_cuotas IS NULL OR p_cuotas NOT BETWEEN 1 AND 36
    OR p_tasa_mensual_pct IS DISTINCT FROM (10::numeric/12)
 THEN
   RAISE EXCEPTION 'FINANCIAMIENTO_INVALIDO|Inicial total minima S/ 5000, reserva confirmada y 1 a 36 cuotas al 10%% nominal anual.';
 END IF;
 v_capital:=p_precio-p_inicial_total;
 v_saldo:=v_capital;
 -- Calculo de cuota base: conservar precision NUMERIC hasta redondear a centimos.
 v_cuota_base:=round(v_capital*(10::numeric/1200)*
     power(1+(10::numeric/1200),p_cuotas)/
     (power(1+(10::numeric/1200),p_cuotas)-1),2);
 FOR v_i IN 1..p_cuotas LOOP
   -- Importante: NO multiplicar por una tasa porcentual periodica truncada.
   v_interes:=round(v_saldo*10/1200,2);
   IF v_i=p_cuotas THEN
     v_amortizacion:=v_saldo;
     v_cuota:=v_amortizacion+v_interes;
   ELSE
     v_cuota:=v_cuota_base;
     v_amortizacion:=v_cuota-v_interes;
   END IF;
   IF v_amortizacion<=0 OR v_amortizacion>v_saldo OR v_cuota<=0 THEN
      RAISE EXCEPTION 'PLAN_INCONSISTENTE|La cuota no amortiza el capital.';
   END IF;
   v_saldo:=round(v_saldo-v_amortizacion,2);
   v_intereses:=v_intereses+v_interes;
   v_items:=v_items||jsonb_build_array(jsonb_build_object(
       'numero',v_i,'capital',v_amortizacion,'interes',v_interes,
       'cuota',v_cuota,'saldo',v_saldo));
 END LOOP;
 IF v_saldo<>0 THEN
    RAISE EXCEPTION 'PLAN_INCONSISTENTE|El cronograma deja saldo.';
 END IF;
 RETURN jsonb_build_object(
   'sistema','FRANCES','version','FRANCES_ANUAL_FIJA_10_V2',
   'tasaAnualPct',10,'tasaMensualPct',p_tasa_mensual_pct,
   'inicialTotal',p_inicial_total,
   'reservaAplicada',p_reserva,
   'inicialAdicional',p_inicial_total-p_reserva,
   'cuotaMensual',v_cuota_base,'capitalFinanciado',v_capital,
   'interesTotal',v_intereses,
   'totalCuotas',v_capital+v_intereses,
   'totalOperacion',p_precio+v_intereses,
   'cuotas',v_items);
END $fn$;

-- Conserva validacion de precio por lote, cartera y usuario de la v6.
-- p_monto_inicial es ahora INICIAL TOTAL para ventas FINANCIADAS.
CREATE OR REPLACE FUNCTION public.sp_crm_validar_formalizacion_v10(
 p_actor bigint,p_prospecto bigint,p_lote bigint,p_modalidad varchar,
 p_monto_total numeric,p_monto_inicial numeric,p_numero_cuotas integer,
 p_tasa_mensual_pct numeric)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE
 v_ctx jsonb;
 v_id_reserva bigint;
 v_reserva_nominal numeric:=0;
 v_reserva_acreditable numeric:=0;
 v_plan jsonb;
BEGIN
 IF p_tasa_mensual_pct IS NOT NULL THEN
   RAISE EXCEPTION 'TASA_FIJA|El servidor fija la tasa nominal anual del 10%%.';
 END IF;
 v_ctx:=public.sp_crm_validar_formalizacion_v6(
   p_actor,p_prospecto,p_lote,p_modalidad,p_monto_total,
   p_monto_inicial,p_numero_cuotas);
 SELECT r.id_reserva,r.monto_reserva
 INTO v_id_reserva,v_reserva_nominal
 FROM public.ven_reservas r
 JOIN public.cfg_estados_reserva er ON er.id_estado_reserva=r.id_estado_reserva
 WHERE r.id_persona=(v_ctx->>'idPersona')::bigint
   AND r.id_lote=p_lote AND er.codigo='VIGENTE'
   AND r.fecha_vencimiento>now()
 ORDER BY r.fecha_reserva DESC,r.id_reserva DESC LIMIT 1;
 v_reserva_nominal:=coalesce(v_reserva_nominal,0);
 IF v_id_reserva IS NOT NULL THEN
   v_reserva_acreditable:=public.fn_crm_reserva_acreditable_v1(v_id_reserva);
   -- No registrar la venta con un saldo y luego acreditar una separacion
   -- todavia no confirmada; eso generaria un doble descuento al firmar.
   IF v_reserva_acreditable<>v_reserva_nominal THEN
      RAISE EXCEPTION 'RESERVA_PENDIENTE|Finanzas debe confirmar el pago y aprobar su comprobante antes de formalizar esta reserva.';
   END IF;
 END IF;
 IF p_modalidad='FINANCIADA' THEN
   IF p_monto_inicial IS NULL OR p_monto_inicial<5000
       OR p_monto_inicial>=p_monto_total
       OR v_reserva_acreditable>p_monto_inicial THEN
      RAISE EXCEPTION 'INICIAL_INVALIDA|La inicial total minima es S/ 5000 y debe dejar saldo financiable.';
   END IF;
   v_plan:=public.fn_crm_simular_frances_v3(
     p_monto_total,v_reserva_acreditable,p_monto_inicial,
     p_numero_cuotas,(10::numeric/12));
 END IF;
 RETURN v_ctx||jsonb_build_object(
   'idReservaAplicable',CASE WHEN v_reserva_acreditable>0 THEN v_id_reserva ELSE NULL END,
   'montoReservaNominal',v_reserva_nominal,
   'montoReservaAplicable',v_reserva_acreditable,
   'montoInicialTotal',CASE WHEN p_modalidad='FINANCIADA' THEN p_monto_inicial ELSE NULL END,
   'montoInicialAdicional',CASE WHEN p_modalidad='FINANCIADA' THEN p_monto_inicial-v_reserva_acreditable ELSE NULL END,
   'saldoContado',p_monto_total-v_reserva_acreditable,
   'planFrances',v_plan);
END $fn$;

-- Versionar el registro existente SIN reescribir el procedimiento historico.
DO $clonar$
DECLARE
 v_def text;
BEGIN
 SELECT pg_get_functiondef(oid) INTO STRICT v_def FROM pg_proc
 WHERE pronamespace='public'::regnamespace
   AND proname='sp_crm_registrar_venta_pendiente_v9';
 IF strpos(v_def,'sp_crm_validar_formalizacion_v9(')=0
    OR strpos(v_def,'p_monto_inicial,p_numero_cuotas,p_observaciones);')=0
    OR strpos(v_def,'v_reserva_tras_registro<>v_reserva')=0
    OR strpos(v_def,'FRANCES_ANUAL_FIJA_10_V1|')=0 THEN
    RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Registro v9 no coincide con lo auditado.';
 END IF;
 v_def:=replace(v_def,'sp_crm_registrar_venta_pendiente_v9(',
      'sp_crm_registrar_venta_pendiente_v10(');
 v_def:=replace(v_def,'sp_crm_validar_formalizacion_v9(',
      'sp_crm_validar_formalizacion_v10(');
 v_def:=replace(v_def,'p_monto_inicial,p_numero_cuotas,p_observaciones);',
      '(v_ctx->>''montoInicialAdicional'')::numeric,p_numero_cuotas,p_observaciones);');
 -- Comprobar la RESERVA NOMINAL vinculada, no confundirla con el credito aprobado.
 v_def:=replace(v_def,'v_reserva_tras_registro<>v_reserva',
      'v_reserva_tras_registro<>(v_ctx->>''montoReservaNominal'')::numeric');
 v_def:=replace(v_def,'FRANCES_ANUAL_FIJA_10_V1|','FRANCES_ANUAL_FIJA_10_V2|');
 v_def:=replace(v_def,'''montoReservaAplicable'',v_reserva,',
      '''montoReservaAplicable'',v_reserva,''montoInicialTotal'',v_ctx->''montoInicialTotal'',''montoInicialAdicional'',v_ctx->''montoInicialAdicional'',');
 EXECUTE v_def;

 SELECT pg_get_functiondef(oid) INTO STRICT v_def FROM pg_proc
 WHERE pronamespace='public'::regnamespace
   AND proname='sp_crm_registrar_venta_pendiente_v13';
 IF strpos(v_def,'sp_crm_registrar_venta_pendiente_v9(')=0
   OR strpos(v_def,'THEN p_monto_inicial')=0
 THEN RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Registro atomico v13 cambio.'; END IF;
 v_def:=replace(v_def,'sp_crm_registrar_venta_pendiente_v13(',
      'sp_crm_registrar_venta_pendiente_v14(');
 v_def:=replace(v_def,'sp_crm_registrar_venta_pendiente_v9(',
      'sp_crm_registrar_venta_pendiente_v10(');
 -- Los comprobantes de inicial son para el ADICIONAL RESTANTE, no el total.
 v_def:=replace(v_def,'THEN p_monto_inicial',
      'THEN (v_resultado->>''montoInicialAdicional'')::numeric');
 EXECUTE v_def;
END $clonar$;

-- Nueva version de la firma: V1 y sistemas historicos se mantienen tal cual.
-- Solo V2 utiliza redondeo de tasa exacto en cuotas exigibles.
DO $clonar$
DECLARE v_def text;
BEGIN
 SELECT pg_get_functiondef(oid) INTO STRICT v_def FROM pg_proc
 WHERE pronamespace='public'::regnamespace
   AND proname='sp_crm_aprobar_firma_contrato_v6';
 IF strpos(v_def,'  v_es_frances boolean;')=0
    OR strpos(v_def,'FRANCES_ANUAL_FIJA_10_V1%')=0
    OR strpos(v_def,'INTO v_es_frances,v_tasa_aplicada')=0
    OR strpos(v_def,'v_interes_cuota:=round(v_saldo_restante*v_tasa_aplicada/100,2);')=0
 THEN RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Firma v6 no coincide con lo auditado.'; END IF;
 v_def:=replace(v_def,'sp_crm_aprobar_firma_contrato_v6(',
       'sp_crm_aprobar_firma_contrato_v7(');
 v_def:=replace(v_def,'  v_es_frances boolean;',
       '  v_es_frances boolean;'||E'\n'||'  v_frances_v2 boolean;');
 v_def:=replace(v_def,
       'OR descripcion_condiciones LIKE ''FRANCES_ANUAL_FIJA_10_V1%''',
       'OR descripcion_condiciones LIKE ''FRANCES_ANUAL_FIJA_10_V1%'''||E'\n'||
       '            OR descripcion_condiciones LIKE ''FRANCES_ANUAL_FIJA_10_V2%''');
 v_def:=replace(v_def,
       'OR pp.descripcion_condiciones LIKE ''FRANCES_ANUAL_FIJA_10_V1%''),',
       'OR pp.descripcion_condiciones LIKE ''FRANCES_ANUAL_FIJA_10_V1%'''||E'\n'||
       '        OR pp.descripcion_condiciones LIKE ''FRANCES_ANUAL_FIJA_10_V2%''),'||E'\n'||
       '      (pp.descripcion_condiciones LIKE ''FRANCES_ANUAL_FIJA_10_V2%''),');
 v_def:=replace(v_def,
       'WHEN pp.descripcion_condiciones LIKE ''FRANCES_ANUAL_FIJA_10_V1%''',
       'WHEN pp.descripcion_condiciones LIKE ''FRANCES_ANUAL_FIJA_10_V1%'''||E'\n'||
       '          OR pp.descripcion_condiciones LIKE ''FRANCES_ANUAL_FIJA_10_V2%''');
 v_def:=replace(v_def,'INTO v_es_frances,v_tasa_aplicada',
       'INTO v_es_frances,v_frances_v2,v_tasa_aplicada');
 v_def:=replace(v_def,'v_cuota_francesa:=round(',
       'v_cuota_francesa:=CASE WHEN v_frances_v2 THEN round('||
       'v_capital*(10::numeric/1200)*power(1+(10::numeric/1200),v_num_cuotas)/'||
       '(power(1+(10::numeric/1200),v_num_cuotas)-1),2) ELSE round(');
 -- Cerrar la expresion CASE de la cuota base antes de END IF.
 v_def:=replace(v_def,'(power(1+(v_tasa_aplicada/100),v_num_cuotas)-1),2);',
       '(power(1+(v_tasa_aplicada/100),v_num_cuotas)-1),2) END;');
 v_def:=replace(v_def,'v_interes_cuota:=round(v_saldo_restante*v_tasa_aplicada/100,2);',
       'v_interes_cuota:=CASE WHEN v_frances_v2 THEN round(v_saldo_restante*10/1200,2)'||
       ' ELSE round(v_saldo_restante*v_tasa_aplicada/100,2) END;');
 EXECUTE v_def;
END $clonar$;

-- Cronograma proyectado V2: la lectura usa el mismo redondeo que la firma.
DO $clonar$
DECLARE v_def text;
BEGIN
 SELECT pg_get_functiondef(oid) INTO STRICT v_def FROM pg_proc
 WHERE pronamespace='public'::regnamespace
   AND proname='sp_crm_cronograma_venta_v1';
 IF strpos(v_def,' v_interes numeric;')=0
  OR strpos(v_def,' v_interes:=10::numeric/1200;')=0
  OR strpos(v_def,'round(v_plan.capital_financiado*v_interes,2)')=0
  OR strpos(v_def,'round(r.saldo*v_interes,2)')=0
 THEN RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Cronograma v1 cambio.'; END IF;
 v_def:=replace(v_def,'sp_crm_cronograma_venta_v1(',
                    'sp_crm_cronograma_venta_v2(');
 v_def:=replace(v_def,' v_interes numeric;',
                    ' v_interes numeric;'||E'\n'||'  v_frances_v2 boolean;');
 v_def:=replace(v_def,' v_interes:=10::numeric/1200;',
                    '  v_frances_v2:=v_plan.descripcion_condiciones LIKE ''FRANCES_ANUAL_FIJA_10_V2%'';'||
                    E'\n'||' v_interes:=10::numeric/1200;');
 v_def:=replace(v_def,'round(v_plan.capital_financiado*v_interes,2)',
                    'CASE WHEN v_frances_v2 THEN round(v_plan.capital_financiado*10/1200,2)'||
                    ' ELSE round(v_plan.capital_financiado*v_interes,2) END');
 v_def:=replace(v_def,'round(r.saldo*v_interes,2)',
                    'CASE WHEN v_frances_v2 THEN round(r.saldo*10/1200,2)'||
                    ' ELSE round(r.saldo*v_interes,2) END');
 EXECUTE v_def;

 SELECT pg_get_functiondef(oid) INTO STRICT v_def FROM pg_proc
 WHERE pronamespace='public'::regnamespace
   AND proname='sp_crm_reservas_vigentes_para_venta_v1';
 IF strpos(v_def,'''montoReserva'',round(r.monto_reserva,2),')=0
 THEN RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Listado de reservas v1 cambio.'; END IF;
 v_def:=replace(v_def,'sp_crm_reservas_vigentes_para_venta_v1(',
                    'sp_crm_reservas_vigentes_para_venta_v2(');
 v_def:=replace(v_def,'''montoReserva'',round(r.monto_reserva,2),',
                    '''montoReserva'',round(r.monto_reserva,2),'||
                    E'\n'||'      ''montoReservaAplicable'',public.fn_crm_reserva_acreditable_v1(r.id_reserva),');
 EXECUTE v_def;
END $clonar$;

-- Nuevas versiones accesibles solo desde el backend con rol de aplicacion.
REVOKE ALL ON FUNCTION public.fn_crm_reserva_acreditable_v1(bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_crm_reserva_acreditable_v1(bigint)
 TO sigi_app_user;
REVOKE ALL ON FUNCTION public.fn_crm_simular_frances_v3(numeric,numeric,numeric,integer,numeric)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_crm_simular_frances_v3(numeric,numeric,numeric,integer,numeric)
 TO sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_crm_validar_formalizacion_v10(bigint,bigint,bigint,varchar,numeric,numeric,integer,numeric)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_validar_formalizacion_v10(bigint,bigint,bigint,varchar,numeric,numeric,integer,numeric)
 TO sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_crm_registrar_venta_pendiente_v10(bigint,bigint,bigint,varchar,numeric,numeric,integer,numeric,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_registrar_venta_pendiente_v10(bigint,bigint,bigint,varchar,numeric,numeric,integer,numeric,text)
 TO sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_crm_registrar_venta_pendiente_v14(bigint,bigint,bigint,varchar,numeric,numeric,integer,numeric,text,jsonb,jsonb)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_registrar_venta_pendiente_v14(bigint,bigint,bigint,varchar,numeric,numeric,integer,numeric,text,jsonb,jsonb)
 TO sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_crm_aprobar_firma_contrato_v7(bigint,bigint,bigint,date,boolean,varchar)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_aprobar_firma_contrato_v7(bigint,bigint,bigint,date,boolean,varchar)
 TO sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_crm_cronograma_venta_v2(bigint,bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_cronograma_venta_v2(bigint,bigint)
 TO sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_crm_reservas_vigentes_para_venta_v2(bigint,bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_reservas_vigentes_para_venta_v2(bigint,bigint)
 TO sigi_app_user;
