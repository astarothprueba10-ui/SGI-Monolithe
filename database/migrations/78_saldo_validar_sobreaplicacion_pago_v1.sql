-- SGI-MONOLITHE | Sprint 4 | 5.2.4
-- Guarda complementaria: un solo pago confirmado no puede financiar
-- aplicaciones cuyo total supere el dinero efectivamente recibido.
-- Solo actualiza DEFINICION del procedimiento de consulta; sin DML de datos.
DO $patch$
DECLARE v_def text;
DECLARE v_marker text:=' IF v_abonado_inicial>v_plan.monto_inicial THEN';
DECLARE v_guard text;
BEGIN
 SELECT pg_get_functiondef(oid) INTO STRICT v_def FROM pg_proc
 WHERE pronamespace='public'::regnamespace
   AND proname='sp_crm_saldo_venta_v1';
 IF strpos(v_def,v_marker)=0
    OR strpos(v_def,'sp_crm_saldo_venta_v1(')=0
 THEN
   RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Saldo de venta V1 distinto al auditado.';
 END IF;
 v_guard:=$sql$
 -- Una suma de aplicaciones puede exceder el pago incluso cuando cada
 -- cuota individual queda por debajo de su monto. Rechazar ese supuesto.
 IF EXISTS(
   SELECT 1 FROM public.pag_pagos pg
   JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=pg.id_estado_pago
   LEFT JOIN public.pag_aplicaciones_pago a ON a.id_pago=pg.id_pago
   WHERE pg.id_plan_pago=v_plan.id_plan_pago AND pg.id_venta=p_venta
     AND ep.codigo='CONFIRMADO'
   GROUP BY pg.id_pago,pg.monto
   HAVING COALESCE(SUM(a.monto_aplicado) FILTER(WHERE a.activo),0)>pg.monto
 ) THEN
   RAISE EXCEPTION 'PAGO_INCONSISTENTE|El total de aplicaciones supera el pago confirmado.';
 END IF;

$sql$;
 v_def:=replace(v_def,v_marker,v_guard||v_marker);
 EXECUTE v_def;
END;
$patch$;
