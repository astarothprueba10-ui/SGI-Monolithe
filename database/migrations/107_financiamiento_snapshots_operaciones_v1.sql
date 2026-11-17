-- SGI MONOLITHE | BLOQUE 2.1
-- Registra política aceptada por separación/venta/plan; sin recalcular transacciones históricas.
-- La versión activa sigue bloqueada hasta introducir TOTP y publicación auditada.

BEGIN;

-- Hasta que se amplíe explícitamente el motor contractual, no ofrecer más de 36 cuotas.
ALTER TABLE public.cfg_fin_politicas_versiones
 ADD CONSTRAINT ck_fin_cuotas_compatibles_36 CHECK (cuotas_max<=36);

ALTER TABLE public.ven_reservas
 ADD COLUMN id_politica_financiera bigint REFERENCES public.cfg_fin_politicas_versiones(id_politica),
 ADD COLUMN politica_financiera_snapshot jsonb;
ALTER TABLE public.ven_ventas
 ADD COLUMN id_politica_financiera bigint REFERENCES public.cfg_fin_politicas_versiones(id_politica),
 ADD COLUMN politica_financiera_snapshot jsonb;
ALTER TABLE public.pag_planes_pago
 ADD COLUMN id_politica_financiera bigint REFERENCES public.cfg_fin_politicas_versiones(id_politica),
 ADD COLUMN politica_financiera_snapshot jsonb;

ALTER TABLE public.ven_reservas ADD CONSTRAINT ck_fin_reserva_snapshot_completo
 CHECK ((id_politica_financiera IS NULL) = (politica_financiera_snapshot IS NULL));
ALTER TABLE public.ven_ventas ADD CONSTRAINT ck_fin_venta_snapshot_completo
 CHECK ((id_politica_financiera IS NULL) = (politica_financiera_snapshot IS NULL));
ALTER TABLE public.pag_planes_pago ADD CONSTRAINT ck_fin_plan_snapshot_completo
 CHECK ((id_politica_financiera IS NULL) = (politica_financiera_snapshot IS NULL));

CREATE INDEX idx_fin_reservas_politica ON public.ven_reservas(id_politica_financiera)
 WHERE id_politica_financiera IS NOT NULL;
CREATE INDEX idx_fin_ventas_politica ON public.ven_ventas(id_politica_financiera)
 WHERE id_politica_financiera IS NOT NULL;
CREATE INDEX idx_fin_planes_politica ON public.pag_planes_pago(id_politica_financiera)
 WHERE id_politica_financiera IS NOT NULL;

-- Una copia estable de las condiciones, sin secretos ni datos personales.
CREATE FUNCTION public.fn_fin_snapshot_politica_v1(p_id bigint)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $$
 SELECT jsonb_build_object(
   'idPolitica',p.id_politica,'codigo',p.codigo,'version',p.version,
   'vigenteDesde',p.vigente_desde,
   'montoSeparacion',p.monto_separacion,'modoInicial',p.modo_inicial,
   'inicialMinima',p.inicial_minima,'inicialMaxima',p.inicial_maxima,
   'inicialFija',p.inicial_fija,'tasaNominalAnualPct',p.tasa_nominal_anual_pct,
   'cuotasMin',p.cuotas_min,'cuotasMax',p.cuotas_max,
   'diasVencimientoSeparacion',p.dias_vencimiento_separacion,
   'sistemaAmortizacion',p.sistema_amortizacion,'moneda',p.moneda
 )
 FROM public.cfg_fin_politicas_versiones p WHERE p.id_politica=p_id
$$;

CREATE FUNCTION public.fn_fin_politica_activa_v1()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $$
 SELECT public.fn_fin_snapshot_politica_v1(pa.id_politica)
 FROM public.cfg_fin_politica_activa pa WHERE pa.id=1 AND pa.codigo='GENERAL'
$$;

-- Si existe separación aceptada, conserva su política original.
-- Reservas anteriores a la migración 107: se tratan como versión histórica 1.
CREATE FUNCTION public.fn_fin_politica_para_venta_v1(p_prospecto bigint,p_lote bigint)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $$
DECLARE
 v_reserva bigint;
 v_politica bigint;
 v_snapshot jsonb;
BEGIN
 SELECT r.id_reserva,coalesce(r.id_politica_financiera,
   (SELECT id_politica FROM public.cfg_fin_politicas_versiones
     WHERE codigo='GENERAL' AND version=1))
 INTO v_reserva,v_politica
 FROM public.crm_prospectos cp
 JOIN public.ven_reservas r ON r.id_persona=cp.id_persona
 JOIN public.cfg_estados_reserva er ON er.id_estado_reserva=r.id_estado_reserva
 WHERE cp.id_prospecto=p_prospecto AND cp.activo
   AND r.id_lote=p_lote AND er.codigo='VIGENTE'
   AND r.fecha_vencimiento>now()
 ORDER BY r.fecha_reserva DESC,r.id_reserva DESC LIMIT 1;
 IF v_reserva IS NULL THEN
   v_snapshot:=public.fn_fin_politica_activa_v1();
 ELSE
   v_snapshot:=public.fn_fin_snapshot_politica_v1(v_politica);
 END IF;
 IF v_snapshot IS NULL THEN RAISE EXCEPTION
   'POLITICA_NO_DISPONIBLE|No existe la versión financiera asociada a la operación.';
 END IF;
 RETURN v_snapshot;
END;
$$;

-- Garantía DB: nuevos registros guardan id y copia de condiciones en la misma transacción.
CREATE FUNCTION public.fn_fin_congelar_condiciones_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $$
DECLARE v_id bigint; v_snap jsonb;
BEGIN
 IF TG_OP='INSERT' THEN
   IF NEW.id_politica_financiera IS NOT NULL OR NEW.politica_financiera_snapshot IS NOT NULL THEN
     RAISE EXCEPTION 'POLITICA_INVALIDA|El registro no puede suministrar condiciones financieras propias.';
   END IF;

   IF TG_TABLE_NAME='ven_reservas' THEN
     v_snap:=public.fn_fin_politica_activa_v1();
   ELSIF TG_TABLE_NAME='ven_ventas' THEN
     IF NEW.id_reserva IS NOT NULL THEN
       SELECT id_politica_financiera,politica_financiera_snapshot INTO v_id,v_snap
       FROM public.ven_reservas WHERE id_reserva=NEW.id_reserva;
       IF NOT FOUND THEN RAISE EXCEPTION 'POLITICA_INVALIDA|La reserva no existe.'; END IF;
       IF v_snap IS NULL THEN
         -- Reserva legítima anterior a la configuración: no recibe condiciones nuevas.
         SELECT id_politica INTO v_id FROM public.cfg_fin_politicas_versiones
           WHERE codigo='GENERAL' AND version=1;
         v_snap:=public.fn_fin_snapshot_politica_v1(v_id);
       END IF;
     ELSE
       v_snap:=public.fn_fin_politica_activa_v1();
     END IF;
   ELSIF TG_TABLE_NAME='pag_planes_pago' THEN
     SELECT id_politica_financiera,politica_financiera_snapshot INTO v_id,v_snap
       FROM public.ven_ventas WHERE id_venta=NEW.id_venta;
     IF NOT FOUND THEN RAISE EXCEPTION 'POLITICA_INVALIDA|La venta no existe.'; END IF;
     IF v_snap IS NULL THEN
       -- No imponer condiciones actuales a un plan que provenga de una venta histórica.
       RETURN NEW;
     END IF;
   END IF;

   IF v_snap IS NULL THEN RAISE EXCEPTION
      'POLITICA_NO_DISPONIBLE|Sin política vigente para el registro.'; END IF;
   NEW.id_politica_financiera:=(v_snap->>'idPolitica')::bigint;
   NEW.politica_financiera_snapshot:=v_snap;
   RETURN NEW;
 END IF;

 IF NEW.id_politica_financiera IS DISTINCT FROM OLD.id_politica_financiera OR
    NEW.politica_financiera_snapshot IS DISTINCT FROM OLD.politica_financiera_snapshot THEN
   RAISE EXCEPTION
     'POLITICA_INMUTABLE|Las condiciones financieras aceptadas no pueden modificarse.';
 END IF;
 RETURN NEW;
END;
$$;

CREATE TRIGGER trg_fin_reserva_condiciones
 BEFORE INSERT OR UPDATE OF id_politica_financiera,politica_financiera_snapshot
 ON public.ven_reservas FOR EACH ROW
 EXECUTE FUNCTION public.fn_fin_congelar_condiciones_v1();

CREATE TRIGGER trg_fin_venta_condiciones
 BEFORE INSERT OR UPDATE OF id_politica_financiera,politica_financiera_snapshot
 ON public.ven_ventas FOR EACH ROW
 EXECUTE FUNCTION public.fn_fin_congelar_condiciones_v1();

CREATE TRIGGER trg_fin_plan_condiciones
 BEFORE INSERT OR UPDATE OF id_politica_financiera,politica_financiera_snapshot
 ON public.pag_planes_pago FOR EACH ROW
 EXECUTE FUNCTION public.fn_fin_congelar_condiciones_v1();

-- El asesor consulta condiciones de la operación concreta; no hay ruta de escritura.
CREATE FUNCTION public.sp_fin_terminos_operacion_v1(
 p_actor bigint,p_prospecto bigint,p_lote bigint
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $$
DECLARE v_politica jsonb;
BEGIN
 IF p_actor IS NULL OR p_actor<=0
   OR p_prospecto IS NULL OR p_prospecto<=0
   OR p_lote IS NULL OR p_lote<=0
   OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.create'::varchar),false)
   OR NOT coalesce(public.fn_crm_puede_consultar_prospecto(p_actor,p_prospecto),false)
   OR NOT EXISTS (
     SELECT 1 FROM public.crm_prospectos_intereses i
     JOIN public.inm_lotes l ON l.id_proyecto=i.id_proyecto
     WHERE i.id_prospecto=p_prospecto AND i.activo
       AND l.id_lote=p_lote AND l.activo
   )
 THEN RAISE EXCEPTION 'DENEGADO|No tiene acceso a las condiciones de esta operación.';
 END IF;
 v_politica:=public.fn_fin_politica_para_venta_v1(p_prospecto,p_lote);
 RETURN v_politica;
END;
$$;

-- No exponer las funciones auxiliares ni el trigger como RPC públicas.
REVOKE ALL ON FUNCTION public.fn_fin_snapshot_politica_v1(bigint)
 FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
REVOKE ALL ON FUNCTION public.fn_fin_politica_activa_v1()
 FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
REVOKE ALL ON FUNCTION public.fn_fin_politica_para_venta_v1(bigint,bigint)
 FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
REVOKE ALL ON FUNCTION public.fn_fin_congelar_condiciones_v1()
 FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_fin_terminos_operacion_v1(bigint,bigint,bigint)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.sp_fin_terminos_operacion_v1(bigint,bigint,bigint)
 TO sigi_app_user;

COMMIT;