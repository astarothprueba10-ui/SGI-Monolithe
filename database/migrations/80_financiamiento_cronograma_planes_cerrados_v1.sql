-- SGI-MONOLITHE | Sprint 4 | 5.2.5
-- Protege la lectura de contratos historicos anulados o resueltos.
-- No generar mora nueva en planes cerrados; su cronograma y estados
-- registrados se consultan solo con fines historicos.
-- No cambia datos de pagos, cuotas ni planes.
DO $patch$
DECLARE
 v_def text;
 v_buscar text;
 v_reemplazo text;
BEGIN
 SELECT pg_get_functiondef(oid) INTO STRICT v_def
 FROM pg_proc WHERE pronamespace='public'::regnamespace
   AND proname='sp_crm_cronograma_venta_v4';
 v_buscar:=$a$
 IF v_saldo->>'tipoSaldo'<>'FINANCIADA'
    OR v_saldo->>'estadoPlan' NOT IN('ACTIVO','COMPLETADO')
$a$;
 v_reemplazo:=$b$
 IF v_saldo->>'estadoPlan' IN('ANULADO','RESUELTO') THEN
   RETURN v_cronograma||jsonb_build_object(
     'fechaCorte',to_char(v_fecha_corte,'YYYY-MM-DD'),
     'fuenteEstados','HISTORICO_NO_EXIGIBLE',
     'cuotasPendientes',0,'cuotasParciales',0,
     'cuotasVencidas',0,'cuotasPagadas',0,
     'cuotasAnuladas',0,'cuotasProximas',0,'cuotasAtrasadas',0,
     'montoVencido',0,'montoProximo',0,
     'advertenciaEstados','Plan cerrado: la tabla conserva el historial y no representa cuotas exigibles.');
 END IF;
 IF v_saldo->>'tipoSaldo'<>'FINANCIADA'
    OR COALESCE(v_saldo->>'estadoPlan','') NOT IN('ACTIVO','COMPLETADO')
$b$;
 IF strpos(v_def,v_buscar)=0 THEN
   RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Cronograma v4 no coincide con versión auditada.';
 END IF;
 v_def:=replace(v_def,v_buscar,v_reemplazo);
 EXECUTE v_def;
END;
$patch$;
