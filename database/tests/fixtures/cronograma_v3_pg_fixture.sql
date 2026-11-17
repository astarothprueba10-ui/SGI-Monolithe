-- Solo PostgreSQL efimero de GitHub Actions.
-- Extiende la fixture de migracion 73 con datos financieros SINTETICOS.
CREATE TABLE public.ven_ventas(id_venta bigint PRIMARY KEY,codigo varchar);
CREATE TABLE public.cfg_estados_cuota(id_estado_cuota integer PRIMARY KEY,codigo varchar);
ALTER TABLE public.pag_cuotas
 ADD COLUMN numero_cuota integer,
 ADD COLUMN fecha_vencimiento date,
 ADD COLUMN monto_interes numeric,
 ADD COLUMN monto_cuota numeric,
 ADD COLUMN id_estado_cuota integer,
 ADD COLUMN fecha_pago_completo timestamptz;
CREATE OR REPLACE FUNCTION public.fn_crm_puede_consultar_venta_v1(p_actor bigint,p_venta bigint)
RETURNS boolean LANGUAGE sql STABLE
AS $fn$
 SELECT p_actor=5 AND EXISTS(
   SELECT 1 FROM public.ven_ventas WHERE id_venta=p_venta);
$fn$;
INSERT INTO public.cfg_estados_plan_pago VALUES(1,'PENDIENTE'),(2,'ACTIVO');
INSERT INTO public.cfg_estados_cuota VALUES(1,'PENDIENTE'),(2,'PAGADA');
INSERT INTO public.ven_ventas(id_venta,codigo) VALUES
 (1001,'VENTA-CI-V2'),(1002,'VENTA-CI-V1'),(1003,'VENTA-CI-REG');
INSERT INTO public.pag_planes_pago(
 id_plan_pago,id_venta,id_estado_plan_pago,id_moneda,codigo,numero_version,
 monto_venta,monto_inicial,monto_reserva_aplicada,capital_financiado,
 tasa_interes_pct,monto_interes_total,monto_total_financiado,numero_cuotas,
 fecha_inicio,fecha_primera_cuota,descripcion_condiciones,es_vigente
) VALUES(
 1001,1001,1,1,'PLN-CI-V2',1,
 30000,4500,500,25000,
 0.833333,4040.50,29040.50,36,
 DATE '2028-01-31',DATE '2028-02-29',
 'FRANCES_ANUAL_FIJA_10_V2|Prueba aislada',true
),(
 1002,1002,1,1,'PLN-CI-V1',1,
 30000,5000,0,25000,
 0.833333,1374.75,26374.75,12,
 DATE '2028-01-31',DATE '2028-02-29',
 'FRANCES_ANUAL_FIJA_10_V1|Prueba aislada',true
),(
 1003,1003,2,1,'PLN-CI-ACT',1,
 30000,5000,0,25000,
 0,0,25000,1,
 DATE '2026-10-31',DATE '2026-11-30',
 'Plan historico ya firmado',true
);
INSERT INTO public.pag_cuotas(id_cuota,id_plan_pago,id_estado_cuota,
 numero_cuota,fecha_vencimiento,monto_capital,monto_interes,monto_cuota)
VALUES(1003,1003,2,1,DATE '2026-11-30',25000,0,25000);
