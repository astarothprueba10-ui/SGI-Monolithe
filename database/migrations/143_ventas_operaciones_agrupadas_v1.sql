-- 143 | Operación comercial multílote: expediente único, ventas y contratos individualizados.
-- Crear planificación NO reserva los lotes, NO genera contratos ni registra dinero.
BEGIN;
CREATE SEQUENCE IF NOT EXISTS public.ven_operaciones_agrupadas_codigo_seq;

CREATE TABLE IF NOT EXISTS public.ven_operaciones_agrupadas_v1(
 id_operacion BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 codigo VARCHAR(35) UNIQUE NOT NULL,
 id_persona BIGINT NOT NULL REFERENCES public.core_personas(id_persona) ON DELETE RESTRICT,
 id_prospecto BIGINT NOT NULL REFERENCES public.crm_prospectos(id_prospecto) ON DELETE RESTRICT,
 id_usuario_registro BIGINT NOT NULL REFERENCES public.seg_usuarios(id_usuario) ON DELETE RESTRICT,
 observaciones VARCHAR(500),
 fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
 fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT chk_ven_grupo_observaciones CHECK(length(COALESCE(observaciones,''))<=500)
);
CREATE TABLE IF NOT EXISTS public.ven_operaciones_agrupadas_lotes_v1(
 id_item BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 id_operacion BIGINT NOT NULL REFERENCES public.ven_operaciones_agrupadas_v1(id_operacion) ON DELETE RESTRICT,
 id_lote BIGINT NOT NULL REFERENCES public.inm_lotes(id_lote) ON DELETE RESTRICT,
 modalidad VARCHAR(12) NOT NULL CHECK(modalidad IN ('CONTADO','FINANCIADA')),
 id_venta BIGINT UNIQUE REFERENCES public.ven_ventas(id_venta) ON DELETE RESTRICT,
 fecha_agregada TIMESTAMPTZ NOT NULL DEFAULT now(),
 fecha_vinculacion TIMESTAMPTZ,
 CONSTRAINT ux_ven_operaciones_lote_grupo UNIQUE(id_operacion,id_lote),
 CONSTRAINT ck_ven_operaciones_vinculacion CHECK(
  (id_venta IS NULL AND fecha_vinculacion IS NULL)
  OR (id_venta IS NOT NULL AND fecha_vinculacion IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS ix_ven_operaciones_agrupadas_persona
 ON public.ven_operaciones_agrupadas_v1(id_persona,fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS ix_ven_operaciones_agrupadas_lote
 ON public.ven_operaciones_agrupadas_lotes_v1(id_lote);
ALTER TABLE public.ven_operaciones_agrupadas_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ven_operaciones_agrupadas_lotes_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ven_operaciones_agrupadas_v1,public.ven_operaciones_agrupadas_lotes_v1
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON SEQUENCE public.ven_operaciones_agrupadas_codigo_seq FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.sp_crm_crear_operacion_agrupada_v1(
 p_actor BIGINT,p_prospecto BIGINT,p_lotes JSONB,p_observaciones VARCHAR DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO pg_catalog,public,pg_temp
AS $fn$
DECLARE
 v_persona BIGINT;v_estado VARCHAR;
 v_lote JSONB;v_id_lote BIGINT;v_modalidad VARCHAR;
 v_estado_lote VARCHAR;v_proyecto BIGINT;v_activo BOOLEAN;
 v_id_operacion BIGINT;v_codigo VARCHAR;
 v_vistos BIGINT[]:='{}'::BIGINT[];
 v_cantidad INTEGER;
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.create'::varchar),FALSE)
   OR NOT coalesce(public.fn_crm_puede_consultar_prospecto(p_actor,p_prospecto),FALSE)
 THEN RAISE EXCEPTION 'DENEGADO|No tiene autorización para organizar la compra de esta persona.'; END IF;
 IF p_prospecto IS NULL OR p_prospecto<=0 OR jsonb_typeof(p_lotes)<>'array'
   OR length(COALESCE(p_observaciones,''))>500
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Indique comprador, lotes y condiciones válidas.'; END IF;
 v_cantidad:=jsonb_array_length(p_lotes);
 IF v_cantidad<2 OR v_cantidad>20 THEN
   RAISE EXCEPTION 'LOTES_INVALIDOS|Incluya entre dos y veinte lotes por operación comercial.'; END IF;

 SELECT p.id_persona,e.codigo INTO v_persona,v_estado
 FROM public.crm_prospectos p
 JOIN public.cfg_estados_prospecto e ON e.id_estado_prospecto=p.id_estado_prospecto
 JOIN public.core_personas c ON c.id_persona=p.id_persona
 WHERE p.id_prospecto=p_prospecto AND p.activo AND c.activo;
 IF v_persona IS NULL OR v_estado NOT IN('INTERESADO','NEGOCIACION','CON_RESERVA','CONVERTIDO')
 THEN RAISE EXCEPTION 'COMPRADOR_NO_APTO|Prospecto no habilitado para adquisición.'; END IF;
 IF v_estado='CONVERTIDO' AND NOT EXISTS(
   SELECT 1 FROM public.crm_clientes cc
   JOIN public.ven_ventas_clientes vc ON vc.id_cliente=cc.id_cliente AND vc.titular
   JOIN public.ven_ventas ve ON ve.id_venta=vc.id_venta
   JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=ve.id_estado_venta
   JOIN public.ven_contratos co ON co.id_venta=ve.id_venta
   JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=co.id_estado_contrato
   WHERE cc.id_persona=v_persona AND ev.codigo='CONTRATADA'
     AND ec.codigo IN('VIGENTE','FINALIZADO')
 ) THEN RAISE EXCEPTION 'COMPRADOR_NO_APTO|Cliente convertido sin compra formalizada verificable.'; END IF;

 -- Todas las comprobaciones se realizan antes de crear el encabezado.
 FOR v_lote IN SELECT value FROM jsonb_array_elements(p_lotes) LOOP
   IF jsonb_typeof(v_lote)<>'object'
     OR coalesce(v_lote->>'idLote','') !~ '^[1-9][0-9]{0,17}$'
     OR coalesce(v_lote->>'modalidad','') NOT IN('CONTADO','FINANCIADA')
   THEN RAISE EXCEPTION 'ITEM_INVALIDO|Indique un lote y modalidad por cada fila.'; END IF;
   v_id_lote:=(v_lote->>'idLote')::BIGINT;
   v_modalidad:=v_lote->>'modalidad';
   IF v_id_lote=ANY(v_vistos) THEN
     RAISE EXCEPTION 'LOTE_DUPLICADO|No se puede añadir el mismo lote dos veces.'; END IF;
   v_vistos:=array_append(v_vistos,v_id_lote);
 END LOOP;
 -- Bloqueo de lotes en orden estable evita deadlocks entre negociaciones concurrentes.
 FOR v_id_lote IN SELECT unnest(v_vistos) ORDER BY 1 LOOP
   SELECT e.codigo,l.id_proyecto,l.activo INTO v_estado_lote,v_proyecto,v_activo
   FROM public.inm_lotes l
   JOIN public.cfg_estados_lote e ON e.id_estado_lote=l.id_estado_lote
   JOIN public.inm_proyectos p ON p.id_proyecto=l.id_proyecto AND p.activo
   WHERE l.id_lote=v_id_lote FOR UPDATE OF l;
   IF NOT FOUND OR NOT v_activo OR v_estado_lote NOT IN('DISPONIBLE','RESERVADO')
   THEN RAISE EXCEPTION 'LOTE_NO_DISPONIBLE|Revise los lotes seleccionados; uno no está comercializable.'; END IF;
   IF v_estado_lote='RESERVADO' AND NOT EXISTS(
     SELECT 1 FROM public.ven_reservas r
     JOIN public.cfg_estados_reserva er ON er.id_estado_reserva=r.id_estado_reserva
     WHERE r.id_lote=v_id_lote AND r.id_persona=v_persona
       AND er.codigo='VIGENTE' AND r.fecha_vencimiento>now()
   ) THEN RAISE EXCEPTION 'RESERVA_AJENA|Un lote está reservado a otra persona o fuera de vigencia.'; END IF;
   IF EXISTS(
     SELECT 1 FROM public.ven_ventas v
     JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=v.id_estado_venta
     WHERE v.id_lote=v_id_lote AND ev.codigo<>'ANULADA'
   ) THEN RAISE EXCEPTION 'VENTA_EXISTENTE|Uno de los lotes tiene otra venta activa.'; END IF;
 END LOOP;

 v_codigo:='OCG-'||to_char(now() AT TIME ZONE 'America/Lima','YYYY')||'-'||
   lpad(nextval('public.ven_operaciones_agrupadas_codigo_seq')::text,6,'0');
 INSERT INTO public.ven_operaciones_agrupadas_v1(
   codigo,id_persona,id_prospecto,id_usuario_registro,observaciones
 ) VALUES(v_codigo,v_persona,p_prospecto,p_actor,nullif(btrim(p_observaciones),''))
 RETURNING id_operacion INTO v_id_operacion;
 INSERT INTO public.ven_operaciones_agrupadas_lotes_v1(id_operacion,id_lote,modalidad)
 SELECT v_id_operacion,(x.value->>'idLote')::BIGINT,(x.value->>'modalidad')::VARCHAR
 FROM jsonb_array_elements(p_lotes) x;
 RETURN jsonb_build_object('idOperacion',v_id_operacion,'codigo',v_codigo,
   'idProspecto',p_prospecto,'cantidadLotes',v_cantidad,
   'estado','PLANIFICADA','ventasCreadas',0,'dineroConfirmado',FALSE,
   'advertencia','Los lotes siguen sujetos a disponibilidad al formalizar cada venta.');
END $fn$;

CREATE OR REPLACE FUNCTION public.sp_crm_vincular_venta_operacion_agrupada_v1(
 p_actor BIGINT,p_operacion BIGINT,p_venta BIGINT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO pg_catalog,public,pg_temp
AS $fn$
DECLARE
 v_grupo RECORD;v_fila RECORD;v_venta RECORD;v_persona BIGINT;
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.create'::varchar),FALSE)
 THEN RAISE EXCEPTION 'DENEGADO|No puede modificar operaciones comerciales.'; END IF;
 IF p_operacion IS NULL OR p_operacion<=0 OR p_venta IS NULL OR p_venta<=0
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Operación o venta inválida.'; END IF;
 SELECT * INTO v_grupo FROM public.ven_operaciones_agrupadas_v1
 WHERE id_operacion=p_operacion FOR UPDATE;
 IF NOT FOUND OR NOT coalesce(
   public.fn_crm_puede_consultar_prospecto(p_actor,v_grupo.id_prospecto),FALSE
 ) THEN RAISE EXCEPTION 'DENEGADO|Operación no accesible.'; END IF;
 SELECT v.id_venta,v.id_lote,m.codigo AS modalidad,e.codigo AS estado
 INTO v_venta
 FROM public.ven_ventas v
 JOIN public.cfg_modalidades_venta m ON m.id_modalidad_venta=v.id_modalidad_venta
 JOIN public.cfg_estados_venta e ON e.id_estado_venta=v.id_estado_venta
 WHERE v.id_venta=p_venta FOR UPDATE OF v;
 IF NOT FOUND OR v_venta.estado='ANULADA' THEN
   RAISE EXCEPTION 'VENTA_NO_APTA|La venta no existe o está anulada.'; END IF;
 SELECT * INTO v_fila
 FROM public.ven_operaciones_agrupadas_lotes_v1
 WHERE id_operacion=p_operacion AND id_lote=v_venta.id_lote FOR UPDATE;
 IF NOT FOUND OR v_fila.modalidad<>v_venta.modalidad
 THEN RAISE EXCEPTION 'LOTE_NO_COINCIDE|Lote o modalidad no coincide con la negociación.'; END IF;
 IF v_fila.id_venta=p_venta THEN
  RETURN jsonb_build_object('idOperacion',p_operacion,'idVenta',p_venta,'reutilizado',TRUE);
 END IF;
 IF v_fila.id_venta IS NOT NULL OR EXISTS(
   SELECT 1 FROM public.ven_operaciones_agrupadas_lotes_v1 a
   WHERE a.id_venta=p_venta AND a.id_operacion<>p_operacion)
 THEN RAISE EXCEPTION 'VINCULO_EXISTENTE|Ya está asociada otra venta.'; END IF;
 SELECT cc.id_persona INTO v_persona
 FROM public.ven_ventas_clientes vc
 JOIN public.crm_clientes cc ON cc.id_cliente=vc.id_cliente
 WHERE vc.id_venta=p_venta AND vc.titular;
 IF v_persona IS DISTINCT FROM v_grupo.id_persona THEN
   RAISE EXCEPTION 'CLIENTE_NO_COINCIDE|La venta corresponde a otra persona.'; END IF;
 UPDATE public.ven_operaciones_agrupadas_lotes_v1
 SET id_venta=p_venta,fecha_vinculacion=now()
 WHERE id_item=v_fila.id_item;
 UPDATE public.ven_operaciones_agrupadas_v1
 SET fecha_actualizacion=now() WHERE id_operacion=p_operacion;
 RETURN jsonb_build_object('idOperacion',p_operacion,'idVenta',p_venta,
   'idLote',v_venta.id_lote,'reutilizado',FALSE);
END $fn$;

CREATE OR REPLACE FUNCTION public.sp_crm_listar_operaciones_agrupadas_v1(
 p_actor BIGINT,p_pagina INTEGER DEFAULT 1,p_tamano INTEGER DEFAULT 20
) RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO pg_catalog,public,pg_temp
AS $fn$
DECLARE v_total INTEGER;v_items JSONB;
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.view'::varchar),FALSE)
 THEN RAISE EXCEPTION 'DENEGADO|No tiene permiso para consultar ventas.'; END IF;
 IF p_pagina IS NULL OR p_tamano IS NULL OR p_pagina NOT BETWEEN 1 AND 10000
   OR p_tamano NOT BETWEEN 1 AND 50
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Paginación inválida.'; END IF;

 WITH visibles AS(
  SELECT g.id_operacion,g.codigo,g.id_persona,g.id_prospecto,
    g.fecha_creacion,g.observaciones,
    cp.nombres,cp.apellido_paterno,cp.apellido_materno,
    cl.codigo AS codigo_cliente
  FROM public.ven_operaciones_agrupadas_v1 g
  JOIN public.core_personas cp ON cp.id_persona=g.id_persona
  LEFT JOIN public.crm_clientes cl ON cl.id_persona=g.id_persona
  WHERE public.fn_crm_puede_consultar_prospecto(p_actor,g.id_prospecto)
 ),items AS(
  SELECT g.*,
  (
   SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'idItem',a.id_item,'idLote',a.id_lote,'codigoLote',l.codigo,
    'idProyecto',l.id_proyecto,'proyecto',pr.nombre,'modalidad',a.modalidad,
    'idVenta',a.id_venta,'codigoVenta',v.codigo,'estadoVenta',ev.codigo,
    'precioVenta',v.precio_venta,'monedaVenta',mo.codigo,
    'codigoContrato',ct.codigo,'estadoContrato',ec.codigo,
    'codigoPlan',pp.codigo
    ) ORDER BY a.id_item),'[]'::jsonb)
   FROM public.ven_operaciones_agrupadas_lotes_v1 a
   JOIN public.inm_lotes l ON l.id_lote=a.id_lote
   JOIN public.inm_proyectos pr ON pr.id_proyecto=l.id_proyecto
   LEFT JOIN public.ven_ventas v ON v.id_venta=a.id_venta
   LEFT JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=v.id_estado_venta
   LEFT JOIN public.cfg_monedas mo ON mo.id_moneda=v.id_moneda
   LEFT JOIN LATERAL (
     SELECT con.codigo,con.id_estado_contrato
     FROM public.ven_contratos con WHERE con.id_venta=v.id_venta
     ORDER BY con.id_contrato DESC LIMIT 1
   ) ct ON true
   LEFT JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=ct.id_estado_contrato
   LEFT JOIN LATERAL(
      SELECT pg.codigo FROM public.pag_planes_pago pg
      WHERE pg.id_venta=v.id_venta AND pg.es_vigente
      ORDER BY pg.id_plan_pago DESC LIMIT 1
   ) pp ON true
   WHERE a.id_operacion=g.id_operacion
  ) lotes
  FROM visibles g
 )
 SELECT (SELECT count(*)::integer FROM visibles),
   (SELECT coalesce(jsonb_agg(jsonb_build_object(
       'idOperacion',it.id_operacion,'codigo',it.codigo,
       'idProspecto',it.id_prospecto,'idPersona',it.id_persona,
       'codigoCliente',it.codigo_cliente,
       'comprador',btrim(concat_ws(' ',it.nombres,it.apellido_paterno,it.apellido_materno)),
       'fechaCreacion',it.fecha_creacion,'observaciones',it.observaciones,
       'lotes',it.lotes,
       'cantidadLotes',jsonb_array_length(it.lotes),
       'cantidadVentas',(
         SELECT count(*) FROM jsonb_array_elements(it.lotes) x
         WHERE (x->>'idVenta') IS NOT NULL
       )
     ) ORDER BY it.id_operacion DESC),'[]'::jsonb)
    FROM (SELECT * FROM items ORDER BY id_operacion DESC LIMIT p_tamano
       OFFSET (p_pagina-1)*p_tamano) it
   ) INTO v_total,v_items;
 RETURN jsonb_build_object('total',v_total,'pagina',p_pagina,'tamano',p_tamano,
  'paginas',greatest(1,ceil(v_total::numeric/p_tamano)::integer),
  'items',v_items);
END $fn$;

REVOKE ALL ON FUNCTION public.sp_crm_crear_operacion_agrupada_v1(BIGINT,BIGINT,JSONB,VARCHAR)
  FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.sp_crm_vincular_venta_operacion_agrupada_v1(BIGINT,BIGINT,BIGINT)
  FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.sp_crm_listar_operaciones_agrupadas_v1(BIGINT,INTEGER,INTEGER)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_crear_operacion_agrupada_v1(BIGINT,BIGINT,JSONB,VARCHAR)
  TO sigi_app_user;
GRANT EXECUTE ON FUNCTION public.sp_crm_vincular_venta_operacion_agrupada_v1(BIGINT,BIGINT,BIGINT)
  TO sigi_app_user;
GRANT EXECUTE ON FUNCTION public.sp_crm_listar_operaciones_agrupadas_v1(BIGINT,INTEGER,INTEGER)
  TO sigi_app_user;
COMMIT;
