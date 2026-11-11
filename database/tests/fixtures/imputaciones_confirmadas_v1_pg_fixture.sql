-- SGI-MONOLITHE · CI PostgreSQL 17 efímero · 5.3.4
-- Ejecutar tras 5.3.3; todos los datos son sintéticos.
INSERT INTO public.seg_usuarios(id_usuario) VALUES(7) ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION public.fn_usuario_tiene_permiso_seguridad(
 p_actor bigint,p_perm varchar
) RETURNS boolean LANGUAGE sql STABLE
AS $fn$
 SELECT (p_actor=5 AND p_perm IN('sales.view','financing.approve',
   'finance.view','finance.create','finance.edit'))
 OR (p_actor IN(6,7) AND p_perm IN('finance.view','finance.edit'));
$fn$;

ALTER TABLE public.pag_aplicaciones_pago
 ADD COLUMN id_usuario_aplicacion bigint,
 ADD COLUMN observaciones varchar(255),
 ADD COLUMN fecha_anulacion timestamptz,
 ADD COLUMN id_usuario_anulacion bigint,
 ADD COLUMN motivo_anulacion varchar(255),
 ADD COLUMN fecha_actualizacion timestamptz DEFAULT now();

-- Los procedimientos legados de los fixtures insertaron aplicaciones sin ID.
-- Solo CI: completar sus IDs antes de añadir PK; nunca tocar producción.
WITH sin_id AS (
 SELECT ctid,row_number() OVER(ORDER BY ctid) ordinal
 FROM public.pag_aplicaciones_pago WHERE id_aplicacion_pago IS NULL
)
UPDATE public.pag_aplicaciones_pago a
SET id_aplicacion_pago=200000+sin_id.ordinal
FROM sin_id WHERE a.ctid=sin_id.ctid;
-- En las fixtures previas la columna existía, pero no la PK real.
ALTER TABLE public.pag_aplicaciones_pago
 ADD CONSTRAINT pag_aplicaciones_pago_ci_pk PRIMARY KEY(id_aplicacion_pago);

-- Producción ya dispone de la secuencia asociada al PK.
CREATE SEQUENCE IF NOT EXISTS public.pag_aplicaciones_pago_id_aplicacion_pago_seq START WITH 400000;
ALTER TABLE public.pag_aplicaciones_pago
 ALTER COLUMN id_aplicacion_pago SET DEFAULT
 nextval('public.pag_aplicaciones_pago_id_aplicacion_pago_seq'::regclass);

-- El fixture 5.3.2 se corrigió para preservar PK de pagos y vouchers.
-- El fixture 5.3.3 permite actores 5 (cargador) y 6 (revisor).
