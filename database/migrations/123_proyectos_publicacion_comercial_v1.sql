-- Publicacion opt-in por proyecto. No publica reglas ni modifica precios existentes.
BEGIN;

CREATE TABLE public.inm_politicas_comerciales_publicadas (
    id_proyecto bigint NOT NULL,
    version integer NOT NULL,
    id_usuario bigint NOT NULL REFERENCES public.seg_usuarios(id_usuario),
    fecha_publicacion timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id_proyecto, version),
    FOREIGN KEY (id_proyecto, version)
        REFERENCES public.inm_configuracion_comercial_borradores(id_proyecto, version)
);

CREATE TABLE public.inm_politicas_comerciales_lotes (
    id_proyecto bigint NOT NULL,
    version integer NOT NULL,
    id_lote bigint NOT NULL,
    codigo_etapa varchar(30),
    situacion varchar(15) NOT NULL CHECK (situacion IN ('HABILITADA','BLOQUEADA','PROTEGIDA')),
    id_lote_precio bigint REFERENCES public.inm_lotes_precios(id_lote_precio),
    precio_lista numeric(14,2),
    descuento numeric(14,2),
    precio_final numeric(14,2),
    vigente_hasta date,
    PRIMARY KEY (id_proyecto, version, id_lote),
    FOREIGN KEY (id_proyecto, version)
        REFERENCES public.inm_politicas_comerciales_publicadas(id_proyecto, version),
    FOREIGN KEY (id_lote, id_proyecto)
        REFERENCES public.inm_lotes(id_lote, id_proyecto),
    CHECK ((situacion = 'HABILITADA' AND codigo_etapa IS NOT NULL AND id_lote_precio IS NOT NULL
            AND precio_lista IS NOT NULL AND descuento IS NOT NULL AND precio_final IS NOT NULL
            AND descuento >= 0 AND precio_final > 0 AND precio_lista - descuento = precio_final)
        OR (situacion <> 'HABILITADA' AND id_lote_precio IS NULL AND precio_lista IS NULL
            AND descuento IS NULL AND precio_final IS NULL))
);

CREATE INDEX ix_politica_comercial_lote_precio ON public.inm_politicas_comerciales_lotes(id_lote_precio);
CREATE INDEX ix_politica_comercial_lote ON public.inm_politicas_comerciales_lotes(id_lote);
CREATE INDEX ix_politica_comercial_actor ON public.inm_politicas_comerciales_publicadas(id_usuario);

ALTER TABLE public.inm_politicas_comerciales_publicadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inm_politicas_comerciales_lotes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inm_politicas_comerciales_publicadas, public.inm_politicas_comerciales_lotes
    FROM PUBLIC, anon, authenticated, service_role, sgi_backend_user, sigi_app_user;
GRANT SELECT, INSERT ON public.inm_politicas_comerciales_publicadas, public.inm_politicas_comerciales_lotes
    TO sgi_backend_user, sigi_app_user;
CREATE POLICY politica_publicada_backend_select ON public.inm_politicas_comerciales_publicadas
    FOR SELECT TO sgi_backend_user USING (true);
CREATE POLICY politica_publicada_backend_insert ON public.inm_politicas_comerciales_publicadas
    FOR INSERT TO sgi_backend_user WITH CHECK (true);
CREATE POLICY politica_lotes_backend_select ON public.inm_politicas_comerciales_lotes
    FOR SELECT TO sgi_backend_user USING (true);
CREATE POLICY politica_lotes_backend_insert ON public.inm_politicas_comerciales_lotes
    FOR INSERT TO sgi_backend_user WITH CHECK (true);

ALTER TABLE public.ven_reservas ADD COLUMN politica_comercial_snapshot jsonb;
ALTER TABLE public.ven_ventas ADD COLUMN politica_comercial_snapshot jsonb;

-- Devuelve NULL si el proyecto no ha adoptado el motor comercial.
-- Para proyectos publicados, cualquier lote omitido, protegido, bloqueado,
-- vencido o con precio oficial distinto queda cerrado para operaciones nuevas.
CREATE FUNCTION public.fn_inm_comercial_snapshot_v1(p_lote bigint, p_moneda integer)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $function$
DECLARE
    v_proyecto bigint;
    v_version integer;
    v_regla public.inm_politicas_comerciales_lotes%ROWTYPE;
BEGIN
    SELECT id_proyecto INTO v_proyecto FROM public.inm_lotes WHERE id_lote=p_lote;
    SELECT max(version) INTO v_version FROM public.inm_politicas_comerciales_publicadas
        WHERE id_proyecto=v_proyecto;
    IF v_version IS NULL THEN RETURN NULL; END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.inm_lotes l
        JOIN public.inm_manzanas mz ON mz.id_manzana=l.id_manzana
        JOIN public.inm_etapas ef ON ef.id_etapa=mz.id_etapa
        JOIN public.inm_proyectos pr ON pr.id_proyecto=l.id_proyecto
        JOIN public.cfg_estados_lote el ON el.id_estado_lote=l.id_estado_lote
        WHERE l.id_lote=p_lote AND l.activo AND mz.activo AND ef.activo AND pr.activo
          AND el.activo AND el.codigo='DISPONIBLE'
    ) THEN
        RAISE EXCEPTION 'COMERCIAL_NO_DISPONIBLE|El inventario no esta disponible para una operacion nueva.';
    END IF;
    SELECT * INTO v_regla FROM public.inm_politicas_comerciales_lotes
        WHERE id_proyecto=v_proyecto AND version=v_version AND id_lote=p_lote;
    IF NOT FOUND OR v_regla.situacion <> 'HABILITADA'
       OR (v_regla.vigente_hasta IS NOT NULL
           AND v_regla.vigente_hasta < (now() AT TIME ZONE 'America/Lima')::date) THEN
        RAISE EXCEPTION 'COMERCIAL_NO_DISPONIBLE|El lote no esta habilitado por la politica comercial vigente.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.inm_lotes_precios p JOIN public.cfg_monedas m ON m.id_moneda=p.id_moneda
        WHERE p.id_lote_precio=v_regla.id_lote_precio AND p.id_lote=p_lote
          AND p.id_moneda=p_moneda AND m.codigo='PEN' AND m.activo
          AND p.activo AND p.fecha_desde<=now() AND (p.fecha_hasta IS NULL OR p.fecha_hasta>now())
          AND p.precio=v_regla.precio_final
    ) THEN RAISE EXCEPTION 'COMERCIAL_PRECIO_CAMBIO|El precio publicado no coincide con el precio oficial vigente.'; END IF;
    RETURN jsonb_build_object('idProyecto',v_proyecto,'version',v_version,'idLote',p_lote,
        'codigoEtapa',v_regla.codigo_etapa,'idLotePrecio',v_regla.id_lote_precio,'idMoneda',p_moneda,
        'precioLista',v_regla.precio_lista,'descuento',v_regla.descuento,'precioFinal',v_regla.precio_final);
END;
$function$;

CREATE FUNCTION public.fn_inm_congelar_politica_comercial_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $function$
DECLARE
    v_snapshot jsonb;
    v_reserva_valida boolean;
BEGIN
    IF TG_OP='UPDATE' THEN
        IF NEW.politica_comercial_snapshot IS DISTINCT FROM OLD.politica_comercial_snapshot THEN
            RAISE EXCEPTION 'COMERCIAL_INMUTABLE|La politica comercial de la operacion no admite cambios.';
        END IF;
        IF OLD.politica_comercial_snapshot IS NOT NULL THEN
            IF NEW.id_lote IS DISTINCT FROM OLD.id_lote OR NEW.id_moneda IS DISTINCT FROM OLD.id_moneda THEN
                RAISE EXCEPTION 'COMERCIAL_INMUTABLE|No se puede cambiar el lote o moneda de la operacion.';
            END IF;
            IF TG_TABLE_NAME='ven_ventas' THEN
                IF NEW.precio_venta IS DISTINCT FROM OLD.precio_venta
                   OR NEW.precio_lista IS DISTINCT FROM OLD.precio_lista
                   OR NEW.descuento IS DISTINCT FROM OLD.descuento
                   OR NEW.id_reserva IS DISTINCT FROM OLD.id_reserva THEN
                    RAISE EXCEPTION 'COMERCIAL_INMUTABLE|No se puede modificar el precio pactado.';
                END IF;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    -- Mismo bloqueo de lote empleado por los procedimientos de CRM.
    PERFORM 1 FROM public.inm_lotes WHERE id_lote=NEW.id_lote FOR UPDATE;
    IF NOT EXISTS (
        SELECT 1 FROM public.inm_politicas_comerciales_publicadas p
        JOIN public.inm_lotes l ON l.id_proyecto=p.id_proyecto WHERE l.id_lote=NEW.id_lote
    ) THEN
        NEW.politica_comercial_snapshot := NULL;
        RETURN NEW;
    END IF;
    IF TG_TABLE_NAME='ven_ventas' THEN
        IF NEW.id_reserva IS NOT NULL THEN
            SELECT r.politica_comercial_snapshot, true INTO v_snapshot, v_reserva_valida
            FROM public.ven_reservas r JOIN public.cfg_estados_reserva er ON er.id_estado_reserva=r.id_estado_reserva
            WHERE r.id_reserva=NEW.id_reserva AND r.id_lote=NEW.id_lote AND r.id_moneda=NEW.id_moneda
              AND er.codigo IN ('PENDIENTE','VIGENTE') AND r.fecha_vencimiento>now();
            IF NOT coalesce(v_reserva_valida,false) THEN
                RAISE EXCEPTION 'COMERCIAL_NO_DISPONIBLE|La separacion no esta vigente o no corresponde al lote.';
            END IF;
            -- Una reserva anterior a la adopcion del motor conserva el flujo anterior.
        ELSE
            v_snapshot := public.fn_inm_comercial_snapshot_v1(NEW.id_lote, NEW.id_moneda);
        END IF;
        IF v_snapshot IS NOT NULL THEN
            IF NEW.precio_venta IS DISTINCT FROM (v_snapshot->>'precioFinal')::numeric THEN
                RAISE EXCEPTION 'COMERCIAL_PRECIO_CAMBIO|El importe no coincide con la politica comercial aceptada.';
            END IF;
            NEW.precio_lista := (v_snapshot->>'precioLista')::numeric;
            NEW.descuento := (v_snapshot->>'descuento')::numeric;
        END IF;
    ELSE
        v_snapshot := public.fn_inm_comercial_snapshot_v1(NEW.id_lote, NEW.id_moneda);
    END IF;
    -- Ignorar cualquier snapshot aportado por el cliente.
    NEW.politica_comercial_snapshot := v_snapshot;
    RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_inm_comercial_snapshot_v1(bigint, integer),
    public.fn_inm_congelar_politica_comercial_v1() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_inm_comercial_snapshot_v1(bigint, integer)
    TO sgi_backend_user, sigi_app_user;

CREATE TRIGGER trg_inm_comercial_reserva BEFORE INSERT OR UPDATE OF politica_comercial_snapshot,id_lote,id_moneda
    ON public.ven_reservas FOR EACH ROW EXECUTE FUNCTION public.fn_inm_congelar_politica_comercial_v1();
CREATE TRIGGER trg_inm_comercial_venta BEFORE INSERT OR UPDATE OF politica_comercial_snapshot,id_lote,id_moneda,id_reserva,precio_venta,precio_lista,descuento
    ON public.ven_ventas FOR EACH ROW EXECUTE FUNCTION public.fn_inm_congelar_politica_comercial_v1();

COMMIT;
