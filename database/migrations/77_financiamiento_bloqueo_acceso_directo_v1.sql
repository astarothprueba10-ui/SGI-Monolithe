-- SGI-MONOLITHE · Sprint 4 · Seguridad de saldos y cuotas
-- Reglas 5.2.1/5.2.4: todas las lecturas financieras sensibles por Core Service.
-- RLS previa usa user_metadata editable en JWT; eliminar esa vía insegura.
-- SIN UPDATE/DELETE de planes, pagos, cuotas o contratos.
-- El portal cliente deberá utilizar endpoints backend con titularidad
-- comprobada, no SELECT directo desde Supabase.
DROP POLICY IF EXISTS "Cliente lee sus propios planes de pago"
 ON public.pag_planes_pago;
DROP POLICY IF EXISTS "Cliente lee sus propias cuotas"
 ON public.pag_cuotas;

REVOKE SELECT,INSERT,UPDATE,DELETE
 ON public.pag_planes_pago,public.pag_cuotas
 FROM anon,authenticated;

-- RLS existente se conserva; sigi_app_user y service_role no se alteran.
