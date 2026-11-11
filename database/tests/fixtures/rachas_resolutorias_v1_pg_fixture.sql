-- CI exclusivo PostgreSQL 17 · 5.2.7 · contratos y cuotas SINTÉTICOS.
-- Después de las pruebas 5.2.6: no añade tablas al esquema real.
CREATE TABLE public.cfg_estados_contrato(
 id_estado_contrato integer PRIMARY KEY,codigo varchar);
CREATE TABLE public.ven_contratos(
 id_contrato bigint PRIMARY KEY,id_venta bigint,id_estado_contrato integer,
 fecha_firma date);
INSERT INTO public.cfg_estados_contrato VALUES
 (9,'VIGENTE'),(8,'PENDIENTE_FIRMA'),(11,'RESUELTO');

-- 2010 = 3 vencidas consecutivas, segunda parcialmente pagada.
-- 2011 = vencidas 1,3,5 (2,4 ya pagadas).
-- 2012 = vencidas 1,3, segunda pagada.
-- 2013 = cuota 2 anulada, por lo que no existen tres consecutivas.
-- 2014 = plan pendiente y contrato sin firma.
-- 2015 = plan ANULADO y contrato RESUELTO.
-- 2016 = cuota 3 vence hoy, aún no vencida.
-- 2017 = cuatro vencidas consecutivas.
-- 2018 = 1-3 morosas, 4 pagada, 5-7 morosas: escoger la más reciente.
-- 2019 = 3 de 4 cuotas registradas (incompleto).
-- 2020 = plan histórico no vigente.
-- 2021 = plan ACTIVO pero contrato RESUELTO.
INSERT INTO public.ven_ventas(id_venta,codigo,id_estado_venta,id_modalidad_venta)
SELECT i,'VENTA-CI-RACHA-'||i,2,1
FROM generate_series(2010,2021) i;
INSERT INTO public.ven_ventas_clientes(id_venta,id_cliente,titular)
SELECT i,700+(i%4),true FROM generate_series(2010,2021) i;

INSERT INTO public.pag_planes_pago(
 id_plan_pago,id_venta,id_estado_plan_pago,id_moneda,codigo,numero_version,
 monto_venta,monto_inicial,monto_reserva_aplicada,capital_financiado,
 tasa_interes_pct,monto_interes_total,monto_total_financiado,numero_cuotas,
 fecha_inicio,fecha_primera_cuota,descripcion_condiciones,es_vigente
)
SELECT i,i,
 CASE WHEN i=2014 THEN 1 WHEN i=2015 THEN 3 ELSE 2 END,
 1,'PLN-CI-RACHA-'||i,1,
 5000+(CASE i WHEN 2010 THEN 4 WHEN 2011 THEN 5
   WHEN 2017 THEN 4 WHEN 2018 THEN 7 WHEN 2019 THEN 4 ELSE 3 END)*100,
 5000,0,
 (CASE i WHEN 2010 THEN 4 WHEN 2011 THEN 5
   WHEN 2017 THEN 4 WHEN 2018 THEN 7 WHEN 2019 THEN 4 ELSE 3 END)*100,
 0,0,
 (CASE i WHEN 2010 THEN 4 WHEN 2011 THEN 5
   WHEN 2017 THEN 4 WHEN 2018 THEN 7 WHEN 2019 THEN 4 ELSE 3 END)*100,
 (CASE i WHEN 2010 THEN 4 WHEN 2011 THEN 5
   WHEN 2017 THEN 4 WHEN 2018 THEN 7 WHEN 2019 THEN 4 ELSE 3 END),
 DATE '2026-01-01',DATE '2026-02-01','REGRESION_HISTORICO',i<>2020
FROM generate_series(2010,2021) i;

INSERT INTO public.ven_contratos(
 id_contrato,id_venta,id_estado_contrato,fecha_firma
)
SELECT i+10000,i,
 CASE WHEN i=2014 THEN 8 WHEN i IN(2015,2021) THEN 11 ELSE 9 END,
 CASE WHEN i=2014 THEN NULL::date ELSE DATE '2026-03-01' END
FROM generate_series(2010,2021) i;

INSERT INTO public.pag_cuotas(
 id_cuota,id_plan_pago,id_estado_cuota,numero_cuota,
 fecha_vencimiento,monto_capital,monto_interes,monto_cuota)
SELECT 100000+i*10+n, i,
 CASE WHEN i=2013 AND n=2 THEN 3 ELSE 1 END,
 n,
 CASE
   WHEN i=2010 AND n=4 THEN (now() AT TIME ZONE 'America/Lima')::date+30
   WHEN i=2016 AND n=3 THEN (now() AT TIME ZONE 'America/Lima')::date
   ELSE (now() AT TIME ZONE 'America/Lima')::date-(30*(8-n))
 END,
 100,0,100
FROM generate_series(2010,2021) i
CROSS JOIN LATERAL generate_series(1,
  CASE i WHEN 2010 THEN 4 WHEN 2011 THEN 5
   WHEN 2017 THEN 4 WHEN 2018 THEN 7 WHEN 2019 THEN 3 ELSE 3 END
) n;

-- Pagos CONFIRMADOS que interrumpen la serie: aplicada a cuota.
-- Pago parcial de 40 en la cuota 2 del plan 2010 no interrumpe la racha.
INSERT INTO public.pag_pagos(
 id_pago,id_reserva,id_estado_pago,monto,id_moneda,id_venta,id_plan_pago)
SELECT 300000+i*10+n,NULL,1,
 CASE WHEN i=2010 THEN 40 ELSE 100 END,1,i,i
FROM (VALUES(2010,2),(2011,2),(2011,4),
           (2012,2),(2018,4)) AS x(i,n);
INSERT INTO public.pag_aplicaciones_pago(
 id_aplicacion_pago,id_pago,id_tipo_aplicacion_pago,
 activo,id_plan_pago,id_cuota,monto_aplicado)
SELECT 300000+i*10+n,300000+i*10+n,3,true,i,
 100000+i*10+n,
 CASE WHEN i=2010 THEN 40 ELSE 100 END
FROM (VALUES(2010,2),(2011,2),(2011,4),
           (2012,2),(2018,4)) AS x(i,n);
