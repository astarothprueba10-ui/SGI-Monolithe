-- PostgreSQL 17 efímero | 5.3.2 | tras 5.3.1, sin datos reales.
-- El actor 5 representa Finanzas; 6 no tiene permisos.
CREATE OR REPLACE FUNCTION public.fn_usuario_tiene_permiso_seguridad(
 p_actor bigint,p_perm varchar) RETURNS boolean
LANGUAGE sql STABLE AS $f$
 SELECT p_actor=5 AND p_perm IN('sales.view','financing.approve','finance.view','finance.create');
$f$;

CREATE TABLE IF NOT EXISTS public.seg_usuarios(id_usuario bigint PRIMARY KEY);
INSERT INTO public.seg_usuarios(id_usuario) VALUES(5),(6) ON CONFLICT DO NOTHING;
ALTER TABLE public.ven_ventas ADD COLUMN id_lote bigint;
UPDATE public.ven_ventas SET id_lote=92 WHERE id_lote IS NULL;

ALTER TABLE public.cfg_metodos_pago ADD COLUMN codigo varchar;
ALTER TABLE public.cfg_metodos_pago ADD COLUMN activo boolean DEFAULT true;
UPDATE public.cfg_metodos_pago SET codigo='TRANSFERENCIA',activo=true;
ALTER TABLE public.cfg_estados_pago ADD COLUMN activo boolean DEFAULT true;
ALTER TABLE public.cfg_estados_voucher ADD COLUMN activo boolean DEFAULT true;

ALTER TABLE public.pag_pagos ADD COLUMN observaciones varchar;
ALTER TABLE public.pag_pagos ADD COLUMN id_usuario_registro bigint;
ALTER TABLE public.pag_vouchers ADD COLUMN id_usuario_carga bigint;

-- Claves ya presentes en el esquema de producción.
ALTER TABLE public.pag_pagos ADD CONSTRAINT pag_pagos_pk_ci PRIMARY KEY(id_pago);
ALTER TABLE public.pag_vouchers ADD CONSTRAINT pag_vouchers_pk_ci PRIMARY KEY(id_voucher);
ALTER TABLE public.pag_pagos ALTER COLUMN id_pago ADD GENERATED ALWAYS AS IDENTITY;
ALTER TABLE public.pag_vouchers ALTER COLUMN id_voucher ADD GENERATED ALWAYS AS IDENTITY;
SELECT setval(pg_get_serial_sequence('public.pag_pagos','id_pago'),
  (SELECT max(id_pago) FROM public.pag_pagos));
SELECT setval(pg_get_serial_sequence('public.pag_vouchers','id_voucher'),
  (SELECT max(id_voucher) FROM public.pag_vouchers));
-- La cuota 2016 / venta 2016 tiene contrato vigente y tres cuotas
-- sintéticas; las aplicaciones de pago no incluyen esta venta.
