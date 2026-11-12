-- 5.4.1-5.4.2 | Solo PostgreSQL 17 efímero al final del Job financiero.
-- Completa tablas sintéticas mínimas para probar aislamiento del Portal.
ALTER TABLE public.core_personas ADD COLUMN IF NOT EXISTS activo boolean DEFAULT true;
ALTER TABLE public.crm_clientes ADD COLUMN IF NOT EXISTS activo boolean DEFAULT true;
ALTER TABLE public.seg_usuarios ADD COLUMN IF NOT EXISTS id_persona bigint;
ALTER TABLE public.seg_usuarios ADD COLUMN IF NOT EXISTS id_estado_usuario integer;
ALTER TABLE public.seg_usuarios ADD COLUMN IF NOT EXISTS bloqueado_hasta timestamptz;
CREATE TABLE IF NOT EXISTS public.cfg_estados_usuario(
 id_estado_usuario integer PRIMARY KEY,activo boolean,permite_acceso boolean);
CREATE TABLE IF NOT EXISTS public.seg_roles(
 id_rol integer PRIMARY KEY,codigo varchar,activo boolean);
CREATE TABLE IF NOT EXISTS public.seg_usuarios_roles(
 id_usuario bigint,id_rol integer,activo boolean);
INSERT INTO public.cfg_estados_usuario VALUES(1,true,true),(2,true,false);
INSERT INTO public.seg_roles VALUES(12,'CLIENTE',true),(7,'ADMINISTRADOR',true);
INSERT INTO public.core_personas(id_persona,nombres,apellido_paterno,apellido_materno,activo)
 VALUES(9999,'Cliente','Sin','Ventas',true);
INSERT INTO public.seg_usuarios(id_usuario,id_persona,id_estado_usuario)
 VALUES (9,501,1),(10,502,1)
 ON CONFLICT(id_usuario) DO UPDATE SET
  id_persona=excluded.id_persona,id_estado_usuario=excluded.id_estado_usuario;
UPDATE public.seg_usuarios SET id_persona=9999,id_estado_usuario=1 WHERE id_usuario IN(5,6);
INSERT INTO public.seg_usuarios_roles VALUES
 (9,12,true),(10,12,true),(6,12,true),(5,7,true);

ALTER TABLE public.ven_ventas ADD COLUMN IF NOT EXISTS precio_venta numeric;
UPDATE public.ven_ventas SET precio_venta=30000 WHERE precio_venta IS NULL;

CREATE TABLE IF NOT EXISTS public.inm_proyectos(
 id_proyecto bigint PRIMARY KEY,codigo varchar,nombre varchar,
 distrito varchar,provincia varchar,departamento varchar,pais varchar,
 direccion varchar,ubicacion_referencia varchar,area_total_m2 numeric,
 fecha_inicio date,fecha_fin_estimada date);
CREATE TABLE IF NOT EXISTS public.cfg_estados_lote(
 id_estado_lote integer PRIMARY KEY,codigo varchar);
CREATE TABLE IF NOT EXISTS public.cfg_tipos_lote(
 id_tipo_lote integer PRIMARY KEY,nombre varchar);
CREATE TABLE IF NOT EXISTS public.inm_etapas(
 id_etapa bigint PRIMARY KEY,nombre varchar);
CREATE TABLE IF NOT EXISTS public.inm_manzanas(
 id_manzana bigint PRIMARY KEY,id_etapa bigint,nombre varchar,codigo varchar);
CREATE TABLE IF NOT EXISTS public.inm_lotes(
 id_lote bigint PRIMARY KEY);
ALTER TABLE public.inm_lotes ADD COLUMN IF NOT EXISTS id_proyecto bigint;
ALTER TABLE public.inm_lotes ADD COLUMN IF NOT EXISTS id_manzana bigint;
ALTER TABLE public.inm_lotes ADD COLUMN IF NOT EXISTS id_tipo_lote integer;
ALTER TABLE public.inm_lotes ADD COLUMN IF NOT EXISTS id_estado_lote integer;
ALTER TABLE public.inm_lotes ADD COLUMN IF NOT EXISTS codigo varchar;
ALTER TABLE public.inm_lotes ADD COLUMN IF NOT EXISTS numero varchar;
ALTER TABLE public.inm_lotes ADD COLUMN IF NOT EXISTS area_m2 numeric;
ALTER TABLE public.inm_lotes ADD COLUMN IF NOT EXISTS frente_m numeric;
ALTER TABLE public.inm_lotes ADD COLUMN IF NOT EXISTS fondo_m numeric;
ALTER TABLE public.inm_lotes ADD COLUMN IF NOT EXISTS lateral_derecho_m numeric;
ALTER TABLE public.inm_lotes ADD COLUMN IF NOT EXISTS lateral_izquierdo_m numeric;
INSERT INTO public.inm_proyectos(
 id_proyecto,codigo,nombre,distrito,provincia,departamento,pais,area_total_m2,
 fecha_inicio,fecha_fin_estimada)
 VALUES(91,'PROY-CI-91','Proyecto sintético','Picsi','Chiclayo','Lambayeque','Peru',50000,
  DATE '2026-04-01',DATE '2029-04-01');
INSERT INTO public.cfg_estados_lote VALUES(1,'VENDIDO');
INSERT INTO public.cfg_tipos_lote VALUES(1,'Residencial');
INSERT INTO public.inm_etapas VALUES(91,'Preventa');
INSERT INTO public.inm_manzanas VALUES(91,91,'Manzana CI','MZ-CI');
INSERT INTO public.inm_lotes(
 id_lote,id_proyecto,id_manzana,id_tipo_lote,id_estado_lote,
 codigo,numero,area_m2,frente_m,fondo_m)
 VALUES(92,91,91,1,1,'MZ-CI-L01','01',450,15,30),
       (93,91,91,1,1,'MZ-CI-L02','02',450,15,30);
UPDATE public.ven_ventas SET id_lote=93 WHERE id_venta=1004;

CREATE TABLE IF NOT EXISTS public.cfg_tipos_contrato(
 id_tipo_contrato integer PRIMARY KEY,nombre varchar);
INSERT INTO public.cfg_tipos_contrato VALUES(1,'Compraventa');
ALTER TABLE public.ven_contratos ADD COLUMN IF NOT EXISTS codigo varchar;
ALTER TABLE public.ven_contratos ADD COLUMN IF NOT EXISTS numero_contrato varchar;
ALTER TABLE public.ven_contratos ADD COLUMN IF NOT EXISTS id_tipo_contrato integer;
ALTER TABLE public.ven_contratos ADD COLUMN IF NOT EXISTS fecha_emision date;
ALTER TABLE public.ven_contratos ADD COLUMN IF NOT EXISTS fecha_inicio_vigencia date;
ALTER TABLE public.ven_contratos ADD COLUMN IF NOT EXISTS fecha_fin_vigencia date;
INSERT INTO public.ven_contratos(
 id_contrato,id_venta,id_estado_contrato,id_tipo_contrato,
 codigo,numero_contrato,fecha_emision,fecha_firma,fecha_inicio_vigencia)
 VALUES(93003,1003,9,1,'CON-CI-1003','CON-CI-1003',
   DATE '2026-10-31',DATE '2026-11-01',DATE '2026-11-01');
CREATE TABLE IF NOT EXISTS public.ven_contratos_archivos(
 id_contrato_archivo bigint PRIMARY KEY,
 id_contrato bigint, vigente boolean,visible_cliente boolean,
 fecha_publicacion_cliente timestamptz);
CREATE TABLE IF NOT EXISTS public.ven_contratos_anexos(
 id_anexo bigint PRIMARY KEY,
 id_contrato bigint,vigente boolean,visible_cliente boolean,
 fecha_publicacion_cliente timestamptz);
INSERT INTO public.ven_contratos_archivos VALUES
 (93003,93003,true,true,now()),
 (93004,93003,true,false,NULL),
 (93005,93003,false,true,now());
INSERT INTO public.ven_contratos_anexos VALUES
 (93003,93003,true,true,NULL);

-- Campos reales de pagos ausentes del esquema mínimo histórico de CI.
-- Se incorporan únicamente a PostgreSQL 17 efímero (no a Supabase).
ALTER TABLE public.pag_pagos ADD COLUMN IF NOT EXISTS codigo varchar;
ALTER TABLE public.pag_pagos ADD COLUMN IF NOT EXISTS fecha_operacion timestamptz;
ALTER TABLE public.pag_aplicaciones_pago ADD COLUMN IF NOT EXISTS fecha_aplicacion timestamptz;
UPDATE public.pag_pagos SET codigo='PAG-CI-'||id_pago::text,
  fecha_operacion=TIMESTAMPTZ '2026-11-01 12:00:00-05'
  WHERE id_pago IN (1003,1004);
UPDATE public.pag_aplicaciones_pago
  SET fecha_aplicacion=TIMESTAMPTZ '2026-11-01 13:00:00-05'
  WHERE id_pago IN (1003,1004);
