-- 5.3.1 | PostgreSQL 17 efímero. No contiene datos de producción.
-- Fixture ejecutada tras tests de financiamiento y revisión de contratos.

-- En este fixture anterior, el actor 5 simula Finanzas con finance.view.
CREATE OR REPLACE FUNCTION public.fn_usuario_tiene_permiso_seguridad(
 p_actor bigint,p_perm varchar) RETURNS boolean
LANGUAGE sql STABLE
AS $fn$ SELECT p_actor=5 AND p_perm IN(
  'sales.view','financing.approve','finance.view'); $fn$;

-- Tablas parciales existentes en fixtures de bloques anteriores.
ALTER TABLE public.pag_pagos
  ADD COLUMN id_metodo_pago integer,
  ADD COLUMN codigo varchar,
  ADD COLUMN fecha_operacion timestamptz,
  ADD COLUMN numero_operacion varchar;
UPDATE public.pag_pagos SET id_metodo_pago=1,
  codigo='PAG-CI-'||id_pago,fecha_operacion=now();

ALTER TABLE public.pag_vouchers
  ADD COLUMN id_voucher bigint,
  ADD COLUMN codigo varchar,
  ADD COLUMN numero_version integer,
  ADD COLUMN nombre_archivo_original varchar,
  ADD COLUMN clave_archivo varchar,
  ADD COLUMN tipo_mime varchar,
  ADD COLUMN tamanio_bytes bigint,
  ADD COLUMN fecha_carga timestamptz,
  ADD COLUMN fecha_validacion timestamptz,
  ADD COLUMN motivo_rechazo varchar,
  ADD COLUMN observaciones_validacion varchar;

ALTER TABLE public.cfg_estados_voucher ADD COLUMN nombre varchar;
UPDATE public.cfg_estados_voucher SET nombre=codigo;
INSERT INTO public.cfg_estados_voucher VALUES(3,'PENDIENTE','Pendiente');

CREATE TABLE public.cfg_metodos_pago(
 id_metodo_pago integer PRIMARY KEY,nombre varchar);
INSERT INTO public.cfg_metodos_pago VALUES(1,'Transferencia bancaria');

CREATE SCHEMA IF NOT EXISTS storage;
CREATE TABLE storage.objects(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 bucket_id text,
 name text,
 metadata jsonb,
 archived_at timestamptz,
 is_delete_marker boolean DEFAULT false
);

-- Pago 1003: CONFIRMADO, asociado a venta 1003 y al plan 1003.
-- Archivo sintético válido y presente en Storage.
INSERT INTO public.pag_vouchers(
 id_voucher,id_pago,id_estado_voucher,codigo,numero_version,
 nombre_archivo_original,clave_archivo,tipo_mime,tamanio_bytes,
 fecha_carga,activo)
VALUES(
 103,1003,1,'VOU-CI-103',1,'cuota.pdf',
 'ventas/p-5/l-92/11111111-2222-3333-4444-555555555555.pdf',
 'application/pdf',1200,now(),true);

INSERT INTO storage.objects(bucket_id,name,metadata)
VALUES('vouchers-ventas-private',
 'ventas/p-5/l-92/11111111-2222-3333-4444-555555555555.pdf',
 '{"mimetype":"application/pdf","size":1200}'::jsonb);

-- Pago 1004 REGISTRADO; voucher con ruta antigua de archivo ausente.
INSERT INTO public.pag_vouchers(
 id_voucher,id_pago,id_estado_voucher,codigo,numero_version,
 nombre_archivo_original,clave_archivo,tipo_mime,tamanio_bytes,
 fecha_carga,activo)
VALUES(
 104,1004,3,'VOU-CI-104',1,'legacy.pdf',
 'vouchers/2026/voucher_cuota_legacy.pdf',
 'application/pdf',1200,now(),true);

-- Comprobante de SEPARACION, nunca aparece en la bandeja de cuotas.
INSERT INTO public.pag_vouchers(
 id_voucher,id_pago,id_estado_voucher,codigo,numero_version,
 nombre_archivo_original,clave_archivo,tipo_mime,tamanio_bytes,
 fecha_carga,activo)
VALUES(
 105,1,2,'VOU-CI-SEP',1,'separacion.pdf',
 'separaciones/p-5/l-92/11111111-2222-3333-4444-555555555555.pdf',
 'application/pdf',1200,now(),true);

-- Funciones legadas simuladas exclusivamente para verificar REVOKE.
CREATE FUNCTION public.sp_registrar_pago_voucher(
 bigint,bigint,numeric,integer,varchar,varchar,varchar,varchar,bigint)
 RETURNS jsonb LANGUAGE sql AS $$SELECT '{}'::jsonb$$;
CREATE FUNCTION public.sp_validar_voucher(bigint,varchar,bigint,varchar)
 RETURNS jsonb LANGUAGE sql AS $$SELECT '{}'::jsonb$$;
CREATE FUNCTION public.sp_listar_vouchers_tesoreria()
 RETURNS jsonb LANGUAGE sql AS $$SELECT '{}'::jsonb$$;
GRANT EXECUTE ON FUNCTION public.sp_registrar_pago_voucher(
 bigint,bigint,numeric,integer,varchar,varchar,varchar,varchar,bigint)
 TO sigi_app_user;
GRANT EXECUTE ON FUNCTION public.sp_validar_voucher(bigint,varchar,bigint,varchar)
 TO sigi_app_user;
GRANT EXECUTE ON FUNCTION public.sp_listar_vouchers_tesoreria()
 TO sigi_app_user;
