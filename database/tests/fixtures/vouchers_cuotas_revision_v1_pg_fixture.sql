-- SGI-MONOLITHE | CI PostgreSQL 17 efímero | fixture 5.3.3
-- Se ejecuta luego de las pruebas 5.3.2 y NO contiene compradores reales.
-- Actor 5 registra; actor 6 revisa (finance.view + finance.edit).
CREATE OR REPLACE FUNCTION public.fn_usuario_tiene_permiso_seguridad(
 p_actor bigint,p_perm varchar
) RETURNS boolean LANGUAGE sql STABLE
AS $fn$
 SELECT (p_actor=5 AND p_perm IN(
   'sales.view','financing.approve','finance.view','finance.create'))
 OR (p_actor=6 AND p_perm IN('finance.view','finance.edit'));
$fn$;

-- Extender fixtures de columnas sintéticas para igualar las de producción.
ALTER TABLE public.pag_pagos
 ADD COLUMN id_usuario_confirmacion bigint,
 ADD COLUMN fecha_confirmacion timestamptz,
 ADD COLUMN id_usuario_anulacion bigint,
 ADD COLUMN fecha_anulacion timestamptz,
 ADD COLUMN motivo_anulacion varchar(255),
 ADD COLUMN fecha_actualizacion timestamptz DEFAULT now();
ALTER TABLE public.pag_vouchers
 ADD COLUMN id_usuario_validacion bigint,
 ADD COLUMN fecha_actualizacion timestamptz DEFAULT now();

-- Estado ANULADO sólo para pagos de cuota rechazados en esta prueba.
INSERT INTO public.cfg_estados_pago(id_estado_pago,codigo,activo)
VALUES(3,'ANULADO',true);

-- Cuota elegible: venta 2016, plan activo firmado y aún con saldo.
-- Cuenta con archivo sintético que el revisor puede verificar por metadatos.
