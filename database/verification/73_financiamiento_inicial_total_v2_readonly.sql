-- SGI-MONOLITHE | 5.2.2 | Pruebas POST-MIGRACION — SOLO LECTURA
-- Ejecutar en entorno de pruebas DESPUES de aplicar migracion 73.
-- No utilizar para formalizar ventas ni aprobar contratos de produccion.
-- Un contador de inconsistencias mayor a 0 bloquea el despliegue.

-- 1) Tasa, inicial total, reserva y 120 cronogramas (5 precios, 3 iniciales,
--    4 plazos, con y sin reserva confirmada simulada matematicamente).
WITH escenarios AS (
 SELECT precio,inicial_total,reserva,plazo,
   public.fn_crm_simular_frances_v3(
     precio,reserva,inicial_total,plazo,10::numeric/12) simulacion
 FROM (VALUES(29900::numeric),(30000::numeric),(31865.63::numeric),
             (52560::numeric),(85250::numeric)) p(precio)
 CROSS JOIN (VALUES(5000::numeric),(8000::numeric),(10000::numeric)) i(inicial_total)
 CROSS JOIN (VALUES(0::numeric),(500::numeric)) r(reserva)
 CROSS JOIN (VALUES(1),(12),(24),(36)) n(plazo)
), montos AS (
 SELECT e.*,
  (SELECT sum((c->>'capital')::numeric) FROM jsonb_array_elements(e.simulacion->'cuotas') c) capital_sumado,
  (SELECT sum((c->>'interes')::numeric) FROM jsonb_array_elements(e.simulacion->'cuotas') c) interes_sumado,
  (SELECT sum((c->>'cuota')::numeric) FROM jsonb_array_elements(e.simulacion->'cuotas') c) cuota_sumada,
  (SELECT (c->>'saldo')::numeric FROM jsonb_array_elements(e.simulacion->'cuotas')
    WITH ORDINALITY t(c,orden) ORDER BY orden DESC LIMIT 1) saldo_final
 FROM escenarios e
)
SELECT count(*) AS escenarios,
 count(*) FILTER (WHERE (simulacion->>'capitalFinanciado')::numeric<>precio-inicial_total) error_capital,
 count(*) FILTER (WHERE (simulacion->>'inicialAdicional')::numeric<>inicial_total-reserva) error_adicional,
 count(*) FILTER (WHERE capital_sumado<>(simulacion->>'capitalFinanciado')::numeric) error_suma_capital,
 count(*) FILTER (WHERE interes_sumado<>(simulacion->>'interesTotal')::numeric) error_suma_interes,
 count(*) FILTER (WHERE cuota_sumada<>(simulacion->>'totalCuotas')::numeric) error_suma_cuotas,
 count(*) FILTER (WHERE saldo_final<>0) error_saldo,
 count(*) FILTER (WHERE jsonb_array_length(simulacion->'cuotas')<>plazo) error_plazo
FROM montos;

-- 2) Regresiones monetarias de referencia; todos deben indicar COINCIDE.
WITH casos(codigo,precio,reserva,inicial,plazo,interes_esperado) AS (
 VALUES
 ('P01',30000::numeric,0::numeric,5000::numeric,12,1374.75::numeric),
 ('P02',30000,500,5000,12,1374.75),
 ('P03',30000,500,8000,36,3555.59),
 ('P04',30000,0,5000,36,4040.50),
 ('P05',29900,0,5000,36,4024.35),
 ('P06',30000,0,5000,1,208.33),
 ('P07',85250,0,5000,36,12969.91)
), calculos AS (
 SELECT codigo,interes_esperado,
 (public.fn_crm_simular_frances_v3(precio,reserva,inicial,plazo,10::numeric/12)->>'interesTotal')::numeric interes_calculado
 FROM casos
)
SELECT *,CASE WHEN interes_esperado=interes_calculado THEN 'COINCIDE' ELSE 'ERROR' END resultado
FROM calculos ORDER BY codigo;

-- 3) Reservas vigentes: credito solo si cumple pago confirmado, comprobante
-- aprobado y sin doble asignacion. No cambia ningun estado.
SELECT r.id_reserva,r.codigo,
       r.monto_reserva,
       public.fn_crm_reserva_acreditable_v1(r.id_reserva) monto_acreditable
FROM public.ven_reservas r
JOIN public.cfg_estados_reserva er ON er.id_estado_reserva=r.id_estado_reserva
WHERE er.codigo='VIGENTE' AND r.fecha_vencimiento>now()
ORDER BY r.id_reserva;

-- 4) Permisos del backend para cada version; anon/auth deben ser false.
SELECT p.proname,
 has_function_privilege('anon',p.oid,'EXECUTE') ejecuta_anon,
 has_function_privilege('authenticated',p.oid,'EXECUTE') ejecuta_auth,
 has_function_privilege('sigi_app_user',p.oid,'EXECUTE') ejecuta_backend
FROM pg_proc p
WHERE p.pronamespace='public'::regnamespace
 AND p.proname IN (
   'fn_crm_reserva_acreditable_v1','fn_crm_simular_frances_v3',
   'sp_crm_validar_formalizacion_v10',
   'sp_crm_registrar_venta_pendiente_v10',
   'sp_crm_registrar_venta_pendiente_v14',
   'sp_crm_aprobar_firma_contrato_v7',
   'sp_crm_cronograma_venta_v2',
   'sp_crm_reservas_vigentes_para_venta_v2')
ORDER BY p.proname;

-- 5) Auditoria de planes historicos (no corregir automaticamente).
SELECT pp.id_plan_pago,pp.id_venta,pp.descripcion_condiciones,
 ep.codigo estado_plan,pp.capital_financiado,
 count(c.id_cuota) cuotas_generadas,
 coalesce(sum(c.monto_capital),0) capital_programado
FROM public.pag_planes_pago pp
JOIN public.cfg_estados_plan_pago ep USING(id_estado_plan_pago)
LEFT JOIN public.pag_cuotas c USING(id_plan_pago)
GROUP BY pp.id_plan_pago,ep.codigo
ORDER BY pp.id_plan_pago;

-- Pruebas de escritura/aprobacion/autorizacion requieren fixture aislada:
-- validarVenta -> registrarVenta -> firmarContrato -> cronograma.
-- Nunca invocar dichos procedimientos de mutacion en el sistema productivo
-- como parte de este script de solo lectura.
