-- Solo se ejecuta en PostgreSQL 17 EFIMERO dentro de GitHub Actions.
-- Continúa el esquema sintético de financiamiento/cronograma V3.
ALTER TABLE public.ven_ventas ADD COLUMN id_estado_venta integer;
ALTER TABLE public.ven_ventas ADD COLUMN id_modalidad_venta integer;
ALTER TABLE public.pag_aplicaciones_pago ADD COLUMN id_aplicacion_pago bigint;
ALTER TABLE public.pag_aplicaciones_pago ADD COLUMN monto_aplicado numeric;
CREATE TABLE public.cfg_estados_venta(id_estado_venta integer,codigo varchar);
CREATE TABLE public.cfg_modalidades_venta(id_modalidad_venta integer,codigo varchar);
CREATE TABLE public.ven_ventas_clientes(id_venta bigint,id_cliente bigint,titular boolean);
INSERT INTO public.cfg_estados_venta VALUES(1,'PENDIENTE'),(2,'CONTRATADA');
INSERT INTO public.cfg_modalidades_venta VALUES(1,'FINANCIADA'),(2,'CONTADO');
UPDATE public.ven_ventas SET id_modalidad_venta=1,
  id_estado_venta=CASE WHEN id_venta=1003 THEN 2 ELSE 1 END;
INSERT INTO public.ven_ventas_clientes VALUES
 (1001,600,true),(1002,600,true),(1003,700,true);
INSERT INTO public.cfg_tipos_aplicacion_pago VALUES(3,'CUOTA');
-- Plan 1003 firmado, cuota 25,000. Inicial adicional 5,000.
-- Solo 100 de abono a cuota + 50 a inicial (CONFIRMADO).
-- 25 confirmados no aplicados no reducen el saldo.
INSERT INTO public.pag_pagos(
 id_pago,id_reserva,id_estado_pago,monto,id_moneda,id_venta,id_plan_pago
) VALUES(1003,NULL,1,175,1,1003,1003);
INSERT INTO public.pag_aplicaciones_pago(
 id_aplicacion_pago,id_pago,id_tipo_aplicacion_pago,activo,
 id_plan_pago,id_cuota,monto_aplicado
) VALUES
 (10031,1003,3,true,1003,1003,100),
 (10032,1003,2,true,1003,NULL,50);
-- REGISTRADO: su aplicación NO puede reducir el saldo.
INSERT INTO public.pag_pagos(
 id_pago,id_reserva,id_estado_pago,monto,id_moneda,id_venta,id_plan_pago
) VALUES(1004,NULL,2,700,1,1003,1003);
INSERT INTO public.pag_aplicaciones_pago(
 id_aplicacion_pago,id_pago,id_tipo_aplicacion_pago,activo,
 id_plan_pago,id_cuota,monto_aplicado
) VALUES(10041,1004,3,true,1003,1003,700);
