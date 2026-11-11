-- SGI-MONOLITHE / 5.2.6 | Datos sintéticos solo para CI PostgreSQL 17.
-- Después de las fixtures de cronograma y saldo, sin clientes reales.

CREATE TABLE public.core_personas(
 id_persona bigint PRIMARY KEY,nombres varchar,
 apellido_paterno varchar,apellido_materno varchar);
CREATE TABLE public.crm_clientes(id_cliente bigint PRIMARY KEY,id_persona bigint);
INSERT INTO public.core_personas VALUES
 (501,'Cliente','Uno','Prueba'),(502,'Cliente','Dos','Prueba'),
 (503,'Cliente','Tres','Prueba'),(504,'Cliente','Cuatro','Prueba');
INSERT INTO public.crm_clientes VALUES(700,501),(701,502),(702,503),(703,504);

CREATE OR REPLACE FUNCTION public.fn_usuario_tiene_permiso_seguridad(
 p_actor bigint,p_perm varchar) RETURNS boolean
LANGUAGE sql STABLE AS $fn$
 SELECT p_actor=5 AND p_perm IN('sales.view','financing.approve');
$fn$;

-- La última prueba de cuota anterior liquidó temporalmente la 1003;
-- restablecer el pago parcial para este nuevo conjunto de escenarios.
UPDATE public.pag_pagos SET monto=175,id_estado_pago=1 WHERE id_pago=1003;
UPDATE public.pag_aplicaciones_pago SET monto_aplicado=100
 WHERE id_aplicacion_pago=10031;
UPDATE public.pag_cuotas
 SET fecha_vencimiento=((now() AT TIME ZONE 'America/Lima')::date+3)
 WHERE id_cuota=1003;

INSERT INTO public.ven_ventas(id_venta,codigo,id_estado_venta,id_modalidad_venta)
VALUES
 (1004,'VENTA-CI-OVER',2,1),
 (1005,'VENTA-CI-PARTIAL',2,1),
 (1006,'VENTA-CI-PAID',2,1),
 (1007,'VENTA-CI-CLOSED',2,1),
 (1008,'VENTA-CI-CANCELED',2,1);
INSERT INTO public.ven_ventas_clientes VALUES
 (1004,701,true),(1005,702,true),(1006,703,true),
 (1007,701,true),(1008,703,true);

INSERT INTO public.pag_planes_pago(
 id_plan_pago,id_venta,id_estado_plan_pago,id_moneda,codigo,numero_version,
 monto_venta,monto_inicial,monto_reserva_aplicada,capital_financiado,
 tasa_interes_pct,monto_interes_total,monto_total_financiado,numero_cuotas,
 fecha_inicio,fecha_primera_cuota,descripcion_condiciones,es_vigente
) VALUES
 (1004,1004,2,1,'PLN-CI-OVER',1,7500,5000,0,2500,0,0,2500,1,
    DATE '2026-01-01',DATE '2026-02-01','Plan histórico',true),
 (1005,1005,2,1,'PLN-CI-PARTIAL',1,7400,5000,0,2400,0,0,2400,1,
    DATE '2026-01-01',DATE '2026-02-01','Plan histórico',true),
 (1006,1006,2,1,'PLN-CI-PAID',1,7500,5000,0,2500,0,0,2500,1,
    DATE '2026-01-01',DATE '2026-02-01','Plan histórico',true),
 (1007,1007,3,1,'PLN-CI-CLOSED',1,7500,5000,0,2500,0,0,2500,1,
    DATE '2026-01-01',DATE '2026-02-01','Plan histórico cerrado',true),
 (1008,1008,2,1,'PLN-CI-ANULADA',1,7500,5000,0,2500,0,0,2500,1,
    DATE '2026-01-01',DATE '2026-02-01','Plan histórico',true);

INSERT INTO public.cfg_estados_cuota VALUES(3,'ANULADA');
INSERT INTO public.pag_cuotas(
 id_cuota,id_plan_pago,id_estado_cuota,numero_cuota,
 fecha_vencimiento,monto_capital,monto_interes,monto_cuota)
VALUES
 (1004,1004,1,1,((now() AT TIME ZONE 'America/Lima')::date-1),2500,0,2500),
 (1005,1005,1,1,((now() AT TIME ZONE 'America/Lima')::date-2),2400,0,2400),
 (1006,1006,2,1,((now() AT TIME ZONE 'America/Lima')::date-2),2500,0,2500),
 (1007,1007,1,1,((now() AT TIME ZONE 'America/Lima')::date-4),2500,0,2500),
 (1008,1008,3,1,((now() AT TIME ZONE 'America/Lima')::date-4),2500,0,2500);

INSERT INTO public.pag_pagos(
 id_pago,id_reserva,id_estado_pago,monto,id_moneda,id_venta,id_plan_pago)
VALUES (1005,NULL,1,100,1,1005,1005),
       (1006,NULL,1,2500,1,1006,1006);
INSERT INTO public.pag_aplicaciones_pago(
 id_aplicacion_pago,id_pago,id_tipo_aplicacion_pago,activo,id_plan_pago,id_cuota,monto_aplicado)
VALUES (10051,1005,3,true,1005,1005,100),
       (10061,1006,3,true,1006,1006,2500);

-- Estructura preexistente de notificaciones: mismos campos, sin duplicar datos.
CREATE TABLE public.cfg_tipos_notificacion(
 id_tipo_notificacion integer PRIMARY KEY,codigo varchar UNIQUE,activo boolean);
INSERT INTO public.cfg_tipos_notificacion VALUES
 (12,'CUOTA_PROXIMA',true),(13,'CUOTA_VENCIDA',true);
CREATE TABLE public.cfg_canales_notificacion(
 id_canal_notificacion integer PRIMARY KEY,codigo varchar UNIQUE,activo boolean);
INSERT INTO public.cfg_canales_notificacion VALUES(4,'PORTAL',true);
CREATE TABLE public.not_preferencias(
 id_preferencia bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 id_persona bigint,id_tipo_notificacion integer,id_canal_notificacion integer,
 habilitado boolean);
CREATE TABLE public.not_notificaciones(
 id_notificacion bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 id_persona bigint,id_tipo_notificacion integer,titulo varchar,mensaje varchar,
 referencia_modulo varchar,referencia_entidad varchar,referencia_id varchar,
 datos_contexto jsonb,clave_deduplicacion varchar UNIQUE,
 id_usuario_generacion bigint,activo boolean,
 fecha_actualizacion timestamptz DEFAULT now());

-- Notificación antigua ya NO pertinente: alerta próxima sobre una cuota vencida.
INSERT INTO public.not_notificaciones(
 id_persona,id_tipo_notificacion,titulo,mensaje,referencia_modulo,
 referencia_entidad,referencia_id,datos_contexto,clave_deduplicacion,activo
) VALUES(
 503,12,'Aviso anterior','Vencimiento pendiente de revisión',
 'FINANCIAMIENTO','pag_cuotas','1005','{}'::jsonb,
 concat('FIN_CUOTA:1005:CUOTA_PROXIMA:',
  to_char((now() AT TIME ZONE 'America/Lima')::date-2,'YYYY-MM-DD')),true);
