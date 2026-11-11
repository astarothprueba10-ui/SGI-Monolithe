-- SGI-MONOLITHE · Sprint 4 · 5.3.5
-- Conciliación SOLO LECTURA: jamás reinterpreta ni corrige los pagos históricos.
-- Emite alertas operativas, no acciones automáticas sobre la contabilidad.
CREATE TABLE IF NOT EXISTS public.pag_conciliacion_revisiones_v1 (
 id_revision bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 id_pago bigint NOT NULL REFERENCES public.pag_pagos(id_pago) ON DELETE RESTRICT,
 codigo_incidencia varchar(55) NOT NULL,
 estado varchar(15) NOT NULL CHECK(estado IN('EN_REVISION','REVISADA')),
 comentario varchar(500) NOT NULL CHECK(length(btrim(comentario)) BETWEEN 10 AND 500),
 id_usuario bigint NOT NULL REFERENCES public.seg_usuarios(id_usuario) ON DELETE RESTRICT,
 fecha_revision timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id_pago,codigo_incidencia)
);
ALTER TABLE public.pag_conciliacion_revisiones_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pag_conciliacion_revisiones_v1
 FROM PUBLIC,anon,authenticated,sigi_app_user;
CREATE INDEX IF NOT EXISTS idx_pag_conciliacion_revisiones_v1_fecha
 ON public.pag_conciliacion_revisiones_v1(fecha_revision DESC);

-- Fila por pago; detecta:
-- - divergencias de estado voucher/pago y aplicaciones de pagos no confirmados;
-- - sobre-aplicación; saldo confirmado sin aplicar, incluso separaciones;
-- - evidencia no verificable SIN cambiar la validez de pagos históricos;
-- - bandeja de revisión y código de incidencia independiente de rutas privadas.
CREATE OR REPLACE FUNCTION public.sp_fin_conciliacion_integral_v1(
 p_actor bigint,p_estado varchar DEFAULT 'TODOS',
 p_busqueda varchar DEFAULT NULL,p_pagina integer DEFAULT 1,
 p_tamano integer DEFAULT 20
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE
 v_estado varchar:=coalesce(nullif(btrim(p_estado),''),'TODOS');
 v_busqueda varchar:=coalesce(nullif(btrim(p_busqueda),''),'');
 v_items jsonb:='[]'::jsonb;
 v_recuento integer:=0;
 v_alertas integer:=0;
 v_monto_sin_aplicar numeric:=0;
 v_total_confirmado numeric:=0;
 v_huerfanos integer:=0;
 v_planes jsonb:='[]'::jsonb;
BEGIN
 IF p_actor IS NULL OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(
    p_actor,'finance.view'::varchar),false)
 THEN RAISE EXCEPTION 'DENEGADO|Se requiere finance.view.'; END IF;
 IF v_estado NOT IN('TODOS','CON_ALERTA','SIN_ALERTA')
    OR p_pagina IS NULL OR p_pagina NOT BETWEEN 1 AND 10000
    OR p_tamano IS NULL OR p_tamano NOT BETWEEN 1 AND 100
    OR length(v_busqueda)>120
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Filtros de conciliación inválidos.'; END IF;

 WITH pagos AS (
  SELECT p.id_pago,p.codigo AS codigo_pago,p.id_venta,p.id_plan_pago,
   p.id_reserva,p.monto,p.fecha_operacion,
   e.codigo AS estado_pago,
   coalesce((SELECT sum(a.monto_aplicado)
     FROM public.pag_aplicaciones_pago a WHERE a.id_pago=p.id_pago AND a.activo),0) aplicado,
   coalesce((SELECT count(*) FROM public.pag_aplicaciones_pago a
     WHERE a.id_pago=p.id_pago AND a.activo),0) n_aplicaciones,
   v.id_voucher,v.codigo AS codigo_voucher,ev.codigo AS estado_voucher,
   v.clave_archivo,v.tipo_mime,v.tamanio_bytes,
   -- Comprobación documental, sin exponer rutas ni URL de Storage.
   EXISTS(
    SELECT 1 FROM storage.objects o
    WHERE o.bucket_id=CASE
       WHEN v.clave_archivo LIKE 'separaciones/%' THEN 'vouchers-separacion-private'
       WHEN v.clave_archivo LIKE 'ventas/%' THEN 'vouchers-ventas-private'
       ELSE 'NO_RECONOCIDO' END
      AND o.name=v.clave_archivo
      AND o.archived_at IS NULL AND o.is_delete_marker=false
      AND lower(coalesce(o.metadata->>'mimetype',''))=v.tipo_mime
      AND coalesce((o.metadata->>'size')::bigint,0)=v.tamanio_bytes
      AND coalesce(v.tamanio_bytes,0) BETWEEN 1 AND 5242880
   ) archivo_disponible,
   CASE WHEN p.id_reserva IS NOT NULL THEN 'SEPARACION'
        WHEN EXISTS(SELECT 1 FROM public.pag_cargas_voucher_cuota cc WHERE cc.id_pago=p.id_pago)
           THEN 'CUOTA'
        WHEN EXISTS(SELECT 1 FROM public.pag_aplicaciones_pago a
         JOIN public.cfg_tipos_aplicacion_pago ta ON ta.id_tipo_aplicacion_pago=a.id_tipo_aplicacion_pago
         WHERE a.id_pago=p.id_pago AND ta.codigo='CUOTA') THEN 'CUOTA'
        WHEN p.id_plan_pago IS NOT NULL THEN 'INICIAL'
        ELSE 'SIN_DESTINO' END AS concepto
  FROM public.pag_pagos p
  JOIN public.cfg_estados_pago e ON e.id_estado_pago=p.id_estado_pago
  LEFT JOIN LATERAL (
    SELECT x.* FROM public.pag_vouchers x
    WHERE x.id_pago=p.id_pago AND x.activo
    ORDER BY x.numero_version DESC,x.id_voucher DESC LIMIT 1
  ) v ON true
  LEFT JOIN public.cfg_estados_voucher ev ON ev.id_estado_voucher=v.id_estado_voucher
 ), categorizados AS (
  SELECT p.*,
   greatest(0,p.monto-p.aplicado) AS saldo_no_aplicado,
   CASE
    WHEN p.aplicado>p.monto THEN 'SOBREAPLICACION'
    WHEN p.estado_pago<>'CONFIRMADO' AND p.aplicado>0 THEN 'APLICACION_NO_CONFIRMADA'
    WHEN p.estado_pago='CONFIRMADO' AND p.estado_voucher IS DISTINCT FROM 'APROBADO'
      THEN 'CONFIRMADO_SIN_VOUCHER_APROBADO'
    WHEN p.estado_pago='REGISTRADO' AND p.estado_voucher='PENDIENTE'
      THEN 'PENDIENTE_DE_REVISION'
    WHEN p.id_voucher IS NULL THEN 'PAGO_SIN_VOUCHER'
    WHEN p.estado_pago='CONFIRMADO' AND NOT p.archivo_disponible
      THEN 'EVIDENCIA_HISTORICA_NO_VERIFICABLE'
    WHEN p.estado_pago='CONFIRMADO' AND p.monto>p.aplicado
      THEN 'PAGO_CONFIRMADO_SIN_IMPUTAR'
    ELSE 'SIN_ALERTA'
   END AS codigo_incidencia
  FROM pagos p
 ), enriched AS (
  SELECT p.*,r.estado estado_revision,r.comentario comentario_revision,
     r.id_usuario revisor,r.fecha_revision,
     (p.codigo_incidencia<>'SIN_ALERTA') tiene_alerta
  FROM categorizados p
  LEFT JOIN public.pag_conciliacion_revisiones_v1 r
    ON r.id_pago=p.id_pago AND r.codigo_incidencia=p.codigo_incidencia
 ), filtrados AS (
  SELECT * FROM enriched
  WHERE (v_estado='TODOS'
     OR (v_estado='CON_ALERTA' AND tiene_alerta)
     OR (v_estado='SIN_ALERTA' AND NOT tiene_alerta))
    AND (v_busqueda='' OR codigo_pago ILIKE '%'||v_busqueda||'%'
      OR coalesce(codigo_voucher,'') ILIKE '%'||v_busqueda||'%'
      OR id_pago::text=v_busqueda)
 )
 SELECT count(*)::integer,
   count(*) FILTER (WHERE tiene_alerta)::integer,
   coalesce(sum(saldo_no_aplicado)
       FILTER(WHERE estado_pago='CONFIRMADO'),0),
   coalesce(sum(monto) FILTER(WHERE estado_pago='CONFIRMADO'),0),
   coalesce(jsonb_agg(to_jsonb(t) - 'clave_archivo' - 'tipo_mime'
     - 'tamanio_bytes'
      ORDER BY t.id_pago DESC),'[]'::jsonb)
 INTO v_recuento,v_alertas,v_monto_sin_aplicar,v_total_confirmado,v_items
 FROM (
    SELECT * FROM filtrados ORDER BY id_pago DESC
    LIMIT p_tamano OFFSET (p_pagina-1)*p_tamano
 ) t;

 -- Totales globales del estado (no solo de la página).
 WITH montos AS (
  SELECT e.codigo estado_pago,p.monto,
   coalesce((SELECT sum(a.monto_aplicado) FROM public.pag_aplicaciones_pago a
    WHERE a.id_pago=p.id_pago AND a.activo),0) aplicado
  FROM public.pag_pagos p JOIN public.cfg_estados_pago e USING(id_estado_pago)
 )
 SELECT coalesce(sum(greatest(0,monto-aplicado))
    FILTER(WHERE estado_pago='CONFIRMADO'),0),
    coalesce(sum(monto) FILTER(WHERE estado_pago='CONFIRMADO'),0)
 INTO v_monto_sin_aplicar,v_total_confirmado FROM montos;

 -- Candidatos a limpieza solo si son carga de cuota expirada, no
 -- registrada y su archivo no existe. No se borran archivos ni filas.
 SELECT count(*) INTO v_huerfanos
 FROM public.pag_cargas_voucher_cuota c
 WHERE c.id_pago IS NULL AND c.expira_en<now()-interval '7 days'
   AND NOT EXISTS(SELECT 1 FROM storage.objects o
     WHERE o.bucket_id='vouchers-ventas-private' AND o.name=c.clave_archivo);

 -- Diferencias históricas de cronograma: reportar, jamás recalcular.
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'idPlanPago',d.id_plan_pago,'idVenta',d.id_venta,
   'estadoPlan',d.estado_plan,'numeroCuotas',d.cuotas,
   'numeroCuotasPactadas',d.numero_cuotas,
   'importeCuotas',d.importe_cuotas,'totalFinanciado',d.total_financiado,
   'diferencia',d.total_financiado-d.importe_cuotas)
   ORDER BY d.id_plan_pago),'[]'::jsonb)
 INTO v_planes
 FROM (
   SELECT pp.id_plan_pago,pp.id_venta,ep.codigo estado_plan,
    pp.numero_cuotas,count(c.id_cuota)::integer cuotas,
    coalesce(sum(c.monto_cuota),0) importe_cuotas,
    coalesce(pp.monto_total_financiado,
      pp.capital_financiado+coalesce(pp.monto_interes_total,0)) total_financiado
   FROM public.pag_planes_pago pp
   JOIN public.cfg_estados_plan_pago ep ON ep.id_estado_plan_pago=pp.id_estado_plan_pago
   LEFT JOIN public.pag_cuotas c ON c.id_plan_pago=pp.id_plan_pago
   GROUP BY pp.id_plan_pago,ep.codigo
   HAVING count(c.id_cuota)>0 AND
     (count(c.id_cuota)<>pp.numero_cuotas OR
       sum(c.monto_cuota) IS DISTINCT FROM
       coalesce(pp.monto_total_financiado,
         pp.capital_financiado+coalesce(pp.monto_interes_total,0)))
 ) d;
 RETURN jsonb_build_object('items',v_items,'total',v_recuento,
    'pagina',p_pagina,'tamano',p_tamano,
    'paginas',greatest(1,ceil(v_recuento::numeric/p_tamano)::integer),
    'alertasPagina',v_alertas,'montoConfirmado',v_total_confirmado,
    'confirmadoSinAplicar',v_monto_sin_aplicar,
    'cargasHuerfanasSinArchivoCandidatas',v_huerfanos,
    'planesConDiferenciasHistoricas',v_planes,
    'advertencia','La conciliación no altera pagos, cuotas, reservas ni historial. REVISADA no significa RESUELTA.');
END;
$fn$;

-- Nota humana, NO cierre de incidencia: ninguna revisión elimina alertas.
CREATE OR REPLACE FUNCTION public.sp_fin_marcar_revision_conciliacion_v1(
 p_actor bigint,p_pago bigint,p_codigo varchar,
 p_estado varchar,p_comentario varchar
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE v_id bigint;
BEGIN
 IF p_actor IS NULL OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(
     p_actor,'finance.view'::varchar),false)
    OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(
     p_actor,'finance.edit'::varchar),false)
 THEN RAISE EXCEPTION 'DENEGADO|Requiere finance.view y finance.edit.'; END IF;
 IF p_pago IS NULL OR p_pago<=0
    OR p_codigo IS NULL OR p_codigo NOT IN (
      'SOBREAPLICACION','APLICACION_NO_CONFIRMADA',
      'CONFIRMADO_SIN_VOUCHER_APROBADO','PENDIENTE_DE_REVISION',
      'PAGO_SIN_VOUCHER','EVIDENCIA_HISTORICA_NO_VERIFICABLE',
      'PAGO_CONFIRMADO_SIN_IMPUTAR')
    OR p_estado NOT IN('EN_REVISION','REVISADA') OR p_estado IS NULL
    OR p_comentario IS NULL OR length(btrim(p_comentario)) NOT BETWEEN 10 AND 500
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Revisión o comentario inválidos.'; END IF;
 -- No permitir comentarios sobre un pago que no existe. No permite
 -- cierre contable, reajustes, edición ni eliminaciones de dinero.
 PERFORM 1 FROM public.pag_pagos WHERE id_pago=p_pago;
 IF NOT FOUND THEN RAISE EXCEPTION 'PAGO_NO_DISPONIBLE|Pago inexistente.'; END IF;
 INSERT INTO public.pag_conciliacion_revisiones_v1(
   id_pago,codigo_incidencia,estado,comentario,id_usuario)
 VALUES(p_pago,p_codigo,p_estado,btrim(p_comentario),p_actor)
 ON CONFLICT(id_pago,codigo_incidencia) DO UPDATE SET
   estado=excluded.estado,comentario=excluded.comentario,
   id_usuario=excluded.id_usuario,fecha_revision=now()
 RETURNING id_revision INTO v_id;
 RETURN jsonb_build_object('idRevision',v_id,
    'idPago',p_pago,'codigo',p_codigo,'estado',p_estado,
    'requiereVerificacion',true);
END;
$fn$;

REVOKE ALL ON FUNCTION public.sp_fin_conciliacion_integral_v1(
 bigint,varchar,varchar,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_fin_conciliacion_integral_v1(
 bigint,varchar,varchar,integer,integer) TO sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_fin_marcar_revision_conciliacion_v1(
 bigint,bigint,varchar,varchar,varchar) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_fin_marcar_revision_conciliacion_v1(
 bigint,bigint,varchar,varchar,varchar) TO sigi_app_user;
