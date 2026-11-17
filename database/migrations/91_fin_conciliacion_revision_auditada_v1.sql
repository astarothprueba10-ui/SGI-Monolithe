-- SGI MONOLITHE · 5.3.5 · Registrar cada cambio de seguimiento
-- No se borra ni altera ninguna operación de pago, cuota o separación.
CREATE TABLE IF NOT EXISTS public.pag_conciliacion_eventos_v1(
 id_evento bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 id_revision bigint NOT NULL REFERENCES public.pag_conciliacion_revisiones_v1(id_revision),
 id_pago bigint NOT NULL REFERENCES public.pag_pagos(id_pago),
 codigo_incidencia varchar(55) NOT NULL,
 estado varchar(15) NOT NULL,
 comentario varchar(500) NOT NULL,
 id_usuario bigint NOT NULL REFERENCES public.seg_usuarios(id_usuario),
 fecha_evento timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pag_conciliacion_eventos_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pag_conciliacion_eventos_v1 FROM PUBLIC,anon,authenticated,sigi_app_user;
CREATE INDEX IF NOT EXISTS idx_pag_conciliacion_eventos_v1_pago_fecha
 ON public.pag_conciliacion_eventos_v1(id_pago,fecha_evento DESC);

CREATE OR REPLACE FUNCTION public.fn_fin_evento_revision_conciliacion_v1()
RETURNS trigger LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
BEGIN
 INSERT INTO public.pag_conciliacion_eventos_v1(
 id_revision,id_pago,codigo_incidencia,estado,comentario,id_usuario)
 VALUES(NEW.id_revision,NEW.id_pago,NEW.codigo_incidencia,
   NEW.estado,NEW.comentario,NEW.id_usuario);
 RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION public.fn_fin_evento_revision_conciliacion_v1()
 FROM PUBLIC,anon,authenticated,sigi_app_user;
DROP TRIGGER IF EXISTS trg_fin_evento_revision_conciliacion
 ON public.pag_conciliacion_revisiones_v1;
CREATE TRIGGER trg_fin_evento_revision_conciliacion
 AFTER INSERT OR UPDATE ON public.pag_conciliacion_revisiones_v1
 FOR EACH ROW EXECUTE FUNCTION public.fn_fin_evento_revision_conciliacion_v1();

-- La API no acepta 'revisión de incidencia' inexistente o de otro código.
-- Usa el mismo clasificador que muestra la bandeja: evita notas falsas.
DO $patch$
DECLARE v_def text;
DECLARE v_mark text:=$m$ INSERT INTO public.pag_conciliacion_revisiones_v1($m$;
DECLARE v_guard text:=$m$ IF NOT EXISTS(
 SELECT 1 FROM jsonb_array_elements(
   public.sp_fin_conciliacion_integral_v1(
     p_actor,'CON_ALERTA'::varchar,p_pago::varchar,1,100)->'items'
 ) AS e(value)
 WHERE (value->>'id_pago')::bigint=p_pago
   AND value->>'codigo_incidencia'=p_codigo
 ) THEN
   RAISE EXCEPTION 'INCIDENCIA_NO_DISPONIBLE|La alerta cambió o ya no existe.';
 END IF;

$m$;
BEGIN
 SELECT pg_get_functiondef(oid) INTO STRICT v_def
 FROM pg_proc WHERE pronamespace='public'::regnamespace
   AND proname='sp_fin_marcar_revision_conciliacion_v1';
 IF strpos(v_def,v_mark)=0 THEN
   RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Procedimiento 90 cambió.';
 END IF;
 EXECUTE replace(v_def,v_mark,v_guard||v_mark);
END;
$patch$;

-- Devolver alertasPagina como conteo de los elementos mostrados,
-- y mantener totalGlobal de alertas independientemente de la paginación.
DO $patch$
DECLARE v_def text;
DECLARE v_mark text:=$m$'alertasPagina',v_alertas,$m$;
DECLARE v_new text:=$m$'alertasPagina',
    (SELECT count(*) FROM jsonb_array_elements(v_items) e
       WHERE (e->>'tiene_alerta')::boolean),
    'alertasFiltradas',v_alertas,$m$;
BEGIN
 SELECT pg_get_functiondef(oid) INTO STRICT v_def FROM pg_proc
 WHERE pronamespace='public'::regnamespace
   AND proname='sp_fin_conciliacion_integral_v1';
 IF strpos(v_def,v_mark)=0 THEN
    RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Bandeja 90 cambió.';
 END IF;
 EXECUTE replace(v_def,v_mark,v_new);
END;
$patch$;
