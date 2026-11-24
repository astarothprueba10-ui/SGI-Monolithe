-- 149: Flujo comercial de recompra, etapas publicadas y reserva histórica.
-- No modifica clientes, intereses ni operaciones existentes. Registro explícito y auditado.
BEGIN;
CREATE FUNCTION public.sp_crm_registrar_interes_recompra_v1(p_actor bigint,p_prospecto bigint,p_proyecto bigint)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $$
DECLARE v_persona bigint; v_id bigint; v_auditoria bigint;
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.create'::varchar),false)
    OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'crm.view'::varchar),false)
    OR NOT coalesce(public.fn_crm_puede_consultar_prospecto(p_actor,p_prospecto),false)
 THEN RAISE EXCEPTION 'DENEGADO|No puede registrar el interés de este cliente.'; END IF;
 SELECT p.id_persona INTO v_persona
 FROM public.crm_prospectos p JOIN public.cfg_estados_prospecto e USING(id_estado_prospecto)
 JOIN public.core_personas pe ON pe.id_persona=p.id_persona
 WHERE p.id_prospecto=p_prospecto AND p.activo AND pe.activo AND e.codigo='CONVERTIDO' FOR UPDATE OF p;
 IF NOT FOUND OR NOT EXISTS(
    SELECT 1 FROM public.crm_clientes c
    JOIN public.ven_ventas_clientes vc USING(id_cliente)
    JOIN public.ven_ventas v USING(id_venta)
    JOIN public.cfg_estados_venta ev USING(id_estado_venta)
    JOIN public.ven_contratos ct ON ct.id_venta=v.id_venta
    JOIN public.cfg_estados_contrato ec USING(id_estado_contrato)
    WHERE c.id_persona=v_persona AND c.activo
      AND ev.codigo IN ('CONFIRMADA','CONTRATADA','COMPLETADA')
      AND ec.codigo IN ('VIGENTE','FINALIZADO')
 ) THEN RAISE EXCEPTION 'PROSPECTO_NO_ELEGIBLE|Se requiere comprador con contrato formalizado.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.inm_proyectos p WHERE p.id_proyecto=p_proyecto AND p.activo)
 THEN RAISE EXCEPTION 'PROYECTO_INVALIDO|Proyecto inactivo o inexistente.'; END IF;
 SELECT id_prospecto_interes INTO v_id FROM public.crm_prospectos_intereses
 WHERE id_prospecto=p_prospecto AND id_proyecto=p_proyecto AND activo
 ORDER BY id_prospecto_interes DESC LIMIT 1;
 IF FOUND THEN RETURN jsonb_build_object('idInteres',v_id,'creado',false); END IF;
 INSERT INTO public.crm_prospectos_intereses(id_prospecto,id_proyecto,comentario,activo)
 VALUES(p_prospecto,p_proyecto,'Interés registrado expresamente para una nueva adquisición.',true)
 RETURNING id_prospecto_interes INTO v_id;
 SELECT public.sp_registrar_auditoria(p_actor,'CRM'::varchar,'INTERES_RECOMPRA'::varchar,
   'PROSPECTO_INTERES'::varchar,v_id::varchar,'EXITOSO'::varchar,
   'Registro expreso de interés de comprador existente'::varchar,
   jsonb_build_object('idProspecto',p_prospecto,'idProyecto',p_proyecto)) INTO v_auditoria;
 IF v_auditoria IS NULL THEN RAISE EXCEPTION 'AUDITORIA_FALLIDA|No se registró la auditoría.'; END IF;
 RETURN jsonb_build_object('idInteres',v_id,'creado',true);
END;
$$;
REVOKE ALL ON FUNCTION public.sp_crm_registrar_interes_recompra_v1(bigint,bigint,bigint) FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
GRANT EXECUTE ON FUNCTION public.sp_crm_registrar_interes_recompra_v1(bigint,bigint,bigint) TO sigi_app_user;

CREATE FUNCTION public.sp_crm_etapas_operacion_v1(p_actor bigint,p_prospecto bigint,p_proyecto bigint,p_incluir_reservas boolean)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $$
DECLARE v_resultado jsonb; v_version integer; v_persona bigint;
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.create'::varchar),false)
    OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'lots.view'::varchar),false)
    OR NOT coalesce(public.fn_crm_puede_consultar_prospecto(p_actor,p_prospecto),false)
 THEN RAISE EXCEPTION 'DENEGADO|No puede consultar estas etapas.'; END IF;
 SELECT p.id_persona INTO v_persona FROM public.crm_prospectos p
 JOIN public.core_personas pe USING(id_persona)
 WHERE p.id_prospecto=p_prospecto AND p.activo AND pe.activo;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.crm_prospectos_intereses i
   JOIN public.inm_proyectos p USING(id_proyecto)
   WHERE i.id_prospecto=p_prospecto AND i.id_proyecto=p_proyecto AND i.activo AND p.activo)
 THEN RAISE EXCEPTION 'PROYECTO_INVALIDO|Registre primero el interés comercial.'; END IF;
 SELECT max(version) INTO v_version FROM public.inm_politicas_comerciales_publicadas WHERE id_proyecto=p_proyecto;
 WITH inventario AS (
 SELECT l.id_lote,
   CASE WHEN el.codigo='RESERVADO' AND rv.id_reserva IS NOT NULL THEN
       coalesce(rv.politica_comercial_snapshot->>'codigoEtapa',pl.codigo_etapa,ec.codigo)
     WHEN v_version IS NOT NULL THEN pl.codigo_etapa ELSE ec.codigo END codigo_etapa,
   CASE WHEN v_version IS NOT NULL THEN 'PUBLICADA' ELSE 'LEGACY' END fuente
 FROM public.inm_lotes l
 JOIN public.cfg_estados_lote el USING(id_estado_lote)
 JOIN public.inm_manzanas m USING(id_manzana)
 JOIN public.inm_etapas ef ON ef.id_etapa=m.id_etapa
 LEFT JOIN public.inm_politicas_comerciales_lotes pl
   ON pl.id_proyecto=l.id_proyecto AND pl.id_lote=l.id_lote AND pl.version=v_version
 LEFT JOIN LATERAL (
   SELECT pr.id_lote_precio,pr.id_tarifa,pr.precio FROM public.inm_lotes_precios pr
   JOIN public.cfg_monedas mo USING(id_moneda)
   WHERE pr.id_lote=l.id_lote AND pr.activo AND mo.activo AND mo.codigo='PEN'
     AND pr.fecha_desde<=now() AND (pr.fecha_hasta IS NULL OR pr.fecha_hasta>now())
   ORDER BY pr.fecha_desde DESC,pr.id_lote_precio DESC LIMIT 1
 ) precio ON true
 LEFT JOIN public.inm_tarifas_zona_etapa t ON t.id_tarifa=precio.id_tarifa AND t.id_proyecto=l.id_proyecto
 LEFT JOIN public.inm_etapas_comerciales ec ON ec.id_etapa_comercial=t.id_etapa_comercial AND ec.id_proyecto=l.id_proyecto
 LEFT JOIN LATERAL (
   SELECT r.id_reserva,r.politica_comercial_snapshot FROM public.ven_reservas r
   JOIN public.cfg_estados_reserva er USING(id_estado_reserva)
   WHERE r.id_lote=l.id_lote AND r.id_persona=v_persona AND er.codigo='VIGENTE' AND r.fecha_vencimiento>now()
   ORDER BY r.fecha_reserva DESC,r.id_reserva DESC LIMIT 1
 ) rv ON true
 WHERE l.id_proyecto=p_proyecto AND l.activo AND el.activo AND m.activo AND ef.activo
   AND ((el.codigo='DISPONIBLE' AND precio.precio>0 AND (v_version IS NULL OR
     (pl.situacion='HABILITADA' AND pl.id_lote_precio=precio.id_lote_precio AND pl.precio_final=precio.precio
     AND (pl.vigente_hasta IS NULL OR pl.vigente_hasta >= (now() AT TIME ZONE 'America/Lima')::date))))
     OR (coalesce(p_incluir_reservas,false) AND el.codigo='RESERVADO' AND rv.id_reserva IS NOT NULL))
 ), agrupados AS (
 SELECT coalesce(codigo_etapa,CASE WHEN fuente='PUBLICADA' THEN '__RESERVA_HISTORICA__' ELSE '__SIN_ETAPA__' END) codigo,
   coalesce(
      (SELECT e->>'nombre' FROM public.inm_configuracion_comercial_borradores b
       CROSS JOIN LATERAL jsonb_array_elements(coalesce(b.configuracion->'etapas','[]'::jsonb)) e
       WHERE b.id_proyecto=p_proyecto AND b.version=v_version AND e->>'codigo'=i.codigo_etapa LIMIT 1),
      (SELECT ec.nombre FROM public.inm_etapas_comerciales ec WHERE ec.id_proyecto=p_proyecto AND ec.codigo=i.codigo_etapa LIMIT 1),
      codigo_etapa,
      CASE WHEN fuente='PUBLICADA' THEN 'Reserva histórica sin etapa registrada' ELSE 'Sin etapa comercial asignada (precio vigente)' END
   ) nombre,
   jsonb_agg(id_lote ORDER BY id_lote) ids
 FROM inventario i GROUP BY codigo_etapa,fuente
 )
 SELECT coalesce(jsonb_agg(jsonb_build_object('codigo',codigo,'nombre',nombre,'idLotes',ids) ORDER BY nombre,codigo),'[]'::jsonb)
 INTO v_resultado FROM agrupados;
 RETURN v_resultado;
END;
$$;
REVOKE ALL ON FUNCTION public.sp_crm_etapas_operacion_v1(bigint,bigint,bigint,boolean) FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
GRANT EXECUTE ON FUNCTION public.sp_crm_etapas_operacion_v1(bigint,bigint,bigint,boolean) TO sigi_app_user;
COMMIT;
