BEGIN;
-- Mantener la validación histórica por lote y eliminar únicamente el bloqueo global.
CREATE OR REPLACE FUNCTION public.sp_crm_validar_formalizacion_v6(p_actor bigint, p_prospecto bigint, p_lote bigint, p_modalidad character varying, p_monto_total numeric, p_monto_inicial numeric, p_numero_cuotas integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_persona BIGINT;
    v_codigo_prospecto VARCHAR;
    v_estado VARCHAR;
    v_asesor BIGINT;
    v_proyecto BIGINT;
    v_codigo_lote VARCHAR;
    v_estado_lote VARCHAR;
    v_precio NUMERIC;
    v_id_moneda INTEGER;
    v_reserva_persona BIGINT;
    v_monto_reserva NUMERIC;
BEGIN
    -- 1. Validar permiso para registrar ventas.
    IF p_actor IS NULL OR p_actor <= 0
       OR NOT COALESCE(
           public.fn_usuario_tiene_permiso_seguridad(
               p_actor, 'sales.create'
           ), FALSE
       )
    THEN
        RAISE EXCEPTION
            'DENEGADO|Se requiere sales.create.';
    END IF;

    -- 2. Validar datos comerciales recibidos.
    IF p_prospecto IS NULL OR p_prospecto <= 0
       OR p_lote IS NULL OR p_lote <= 0
       OR p_modalidad IS NULL
       OR p_modalidad NOT IN ('CONTADO','FINANCIADA')
       OR p_monto_total IS NULL
       OR p_monto_total <= 0
       OR p_monto_total <> ROUND(p_monto_total, 2)
    THEN
        RAISE EXCEPTION
            'DATOS_INVALIDOS|Prospecto, lote, modalidad o monto invalido.';
    END IF;

    -- 3. NUEVO CANDADO DE SEGURIDAD.
    -- Un asesor solo puede formalizar ventas
    -- de prospectos de su cartera vigente.
    -- Gerencia conserva su alcance global.
    IF NOT COALESCE(
        public.fn_crm_puede_consultar_prospecto(
            p_actor,
            p_prospecto
        ), FALSE
    )
    THEN
        RAISE EXCEPTION
            'DENEGADO|No tiene autorizacion comercial sobre este prospecto.';
    END IF;

    -- Una reserva de otro lote no impide una nueva adquisición; no se traslada su crédito.
    IF EXISTS(SELECT 1 FROM public.ven_reservas r JOIN public.crm_prospectos p ON p.id_persona=r.id_persona
        JOIN public.cfg_estados_reserva e USING(id_estado_reserva)
        WHERE p.id_prospecto=p_prospecto AND p.activo AND r.id_lote=p_lote AND e.codigo='PENDIENTE' AND r.fecha_vencimiento>now())
    THEN RAISE EXCEPTION 'RESERVA_PENDIENTE|Finanzas debe aprobar la separación antes de formalizar.'; END IF;
    IF EXISTS(SELECT 1 FROM public.crm_solicitudes_cambio_reserva_v1 c WHERE c.id_prospecto=p_prospecto AND (c.id_lote_anterior=p_lote OR c.id_lote_nuevo=p_lote) AND c.estado='PENDIENTE')
    THEN RAISE EXCEPTION 'OPERACION_INVALIDA|Existe una solicitud de cambio de este lote pendiente de resolución.'; END IF;

    -- 4. Validar modalidad y condiciones de pago.
    IF p_modalidad = 'FINANCIADA' THEN

        IF p_monto_inicial IS NULL
           OR p_monto_inicial <= 0
           OR p_monto_inicial >= p_monto_total
           OR p_monto_inicial <> ROUND(p_monto_inicial, 2)
           OR p_numero_cuotas IS NULL
           OR p_numero_cuotas NOT BETWEEN 1 AND 36
        THEN
            RAISE EXCEPTION
                'DATOS_INVALIDOS|Condiciones de financiamiento invalidas.';
        END IF;

    ELSIF COALESCE(p_monto_inicial, 0) <> 0
       OR p_numero_cuotas IS NOT NULL
    THEN
        RAISE EXCEPTION
            'DATOS_INVALIDOS|La venta al contado no debe incluir cuotas ni inicial.';
    END IF;

    -- 5. Validar prospecto y estado comercial.
    SELECT
        p.id_persona,
        p.codigo,
        e.codigo
    INTO
        v_persona,
        v_codigo_prospecto,
        v_estado

    FROM public.crm_prospectos p

    JOIN public.core_personas per
        ON per.id_persona = p.id_persona
       AND per.activo

    JOIN public.cfg_estados_prospecto e
        ON e.id_estado_prospecto = p.id_estado_prospecto

    WHERE p.id_prospecto = p_prospecto
      AND p.activo;

    IF NOT FOUND
       OR v_estado NOT IN ('INTERESADO','NEGOCIACION','CON_RESERVA','CONVERTIDO')
    THEN
        RAISE EXCEPTION
            'PROSPECTO_NO_ELEGIBLE|Se requiere un potencial activo.';
    END IF;

    -- 6. Una persona CONVERTIDA puede volver a comprar, pero solo si existe contrato formalizado. 
    --    Conserva el cliente y su identidad; no habilita un prospecto convertido por error.
    IF v_estado='CONVERTIDO' AND NOT EXISTS (
        SELECT 1
        FROM public.crm_clientes c

        JOIN public.ven_ventas_clientes vc
            ON vc.id_cliente = c.id_cliente

        JOIN public.ven_ventas v
            ON v.id_venta = vc.id_venta

        JOIN public.cfg_estados_venta ev
            ON ev.id_estado_venta = v.id_estado_venta

        JOIN public.ven_contratos ct
            ON ct.id_venta = v.id_venta

        JOIN public.cfg_estados_contrato ec
            ON ec.id_estado_contrato =
               ct.id_estado_contrato

        WHERE c.id_persona = v_persona
          AND c.activo

          AND ev.codigo IN (
              'CONFIRMADA',
              'CONTRATADA',
              'COMPLETADA'
          )

          AND ec.codigo IN (
              'VIGENTE',
              'FINALIZADO'
          )
    )
    THEN
        RAISE EXCEPTION
            'PROSPECTO_NO_ELEGIBLE|El comprador convertido no tiene una venta formalizada verificable.';
    END IF;

    -- 7. Obtener asesor comercial activo.
    SELECT a.id_asesor
    INTO v_asesor

    FROM public.com_asignaciones_prospecto a

    JOIN public.com_asesores ca
        ON ca.id_asesor = a.id_asesor

    JOIN public.cfg_estados_asesor ea
        ON ea.id_estado_asesor = ca.id_estado_asesor

    WHERE a.id_prospecto = p_prospecto
      AND a.fecha_fin IS NULL
      AND ea.codigo = 'ACTIVO'
      AND ca.fecha_inicio <= CURRENT_DATE
      AND (
          ca.fecha_fin IS NULL
          OR ca.fecha_fin >= CURRENT_DATE
      )

    ORDER BY
        a.fecha_asignacion DESC,
        a.id_asignacion_prospecto DESC

    LIMIT 1;

    IF v_asesor IS NULL THEN
        RAISE EXCEPTION
            'ASESOR_INVALIDO|Se requiere un asesor comercial activo asignado.';
    END IF;

    -- 8. Validar disponibilidad del lote.
    SELECT
        l.id_proyecto,
        l.codigo,
        el.codigo
    INTO
        v_proyecto,
        v_codigo_lote,
        v_estado_lote

    FROM public.inm_lotes l

    JOIN public.cfg_estados_lote el
        ON el.id_estado_lote = l.id_estado_lote

    WHERE l.id_lote = p_lote
      AND l.activo;

    IF NOT FOUND
       OR v_estado_lote NOT IN ('DISPONIBLE','RESERVADO')
    THEN
        RAISE EXCEPTION
            'LOTE_NO_DISPONIBLE|El lote no esta disponible para formalizar.';
    END IF;

    -- 9. Comprobar proyecto de interes.
    IF NOT EXISTS (
        SELECT 1
        FROM public.crm_prospectos_intereses i
        WHERE i.id_prospecto = p_prospecto
          AND i.id_proyecto = v_proyecto
          AND i.activo
    )
    AND v_estado <> 'CONVERTIDO'
    THEN
        RAISE EXCEPTION
            'PROYECTO_INVALIDO|El lote no pertenece al proyecto de interes.';
    END IF;

    -- 10. Comprobar ventas anteriores del lote.
    IF EXISTS (
        SELECT 1
        FROM public.ven_ventas v

        JOIN public.cfg_estados_venta ev
            ON ev.id_estado_venta = v.id_estado_venta

        WHERE v.id_lote = p_lote
          AND ev.codigo <> 'ANULADA'
    )
    THEN
        RAISE EXCEPTION
            'VENTA_EXISTENTE|El lote ya tiene una venta no anulada.';
    END IF;

    -- 11. Verificar reserva vigente.
    SELECT r.id_persona, r.monto_reserva
    INTO v_reserva_persona,v_monto_reserva

    FROM public.ven_reservas r

    JOIN public.cfg_estados_reserva er
        ON er.id_estado_reserva = r.id_estado_reserva

    WHERE r.id_lote = p_lote
      AND er.codigo = 'VIGENTE'
      AND r.fecha_vencimiento > NOW()

    ORDER BY r.fecha_reserva DESC

    LIMIT 1;

    IF v_estado_lote = 'RESERVADO' THEN

        IF v_reserva_persona IS NULL
           OR v_reserva_persona <> v_persona
        THEN
            RAISE EXCEPTION
                'RESERVA_INVALIDA|Se requiere reserva vigente del mismo comprador.';
        END IF;

        -- La separacion acreditada se descuenta de la inicial, no del capital.
        IF p_modalidad='FINANCIADA' AND p_monto_inicial<v_monto_reserva THEN
            RAISE EXCEPTION
                'INICIAL_INVALIDA|La inicial debe ser al menos el monto de separacion.';
        END IF;

    ELSIF v_reserva_persona IS NOT NULL THEN

        RAISE EXCEPTION
            'RESERVA_INVALIDA|El lote tiene una reserva vigente inconsistente.';
    END IF;

    -- 12. Obtener moneda.
    SELECT m.id_moneda
    INTO v_id_moneda
    FROM public.cfg_monedas m
    WHERE m.codigo = 'PEN'
      AND m.activo
    LIMIT 1;

    IF v_id_moneda IS NULL THEN
        RAISE EXCEPTION
            'CONFIGURACION_INVALIDA|Moneda PEN no configurada.';
    END IF;

    -- 13. Validar precio vigente.
    SELECT lp.precio
    INTO v_precio

    FROM public.inm_lotes_precios lp

    WHERE lp.id_lote = p_lote
      AND lp.activo
      AND lp.id_moneda = v_id_moneda
      AND lp.fecha_desde <= NOW()
      AND (
          lp.fecha_hasta IS NULL
          OR lp.fecha_hasta > NOW()
      )

    ORDER BY
        lp.fecha_desde DESC,
        lp.id_lote_precio DESC

    LIMIT 1;

    IF v_precio IS NULL OR v_precio <= 0 THEN
        RAISE EXCEPTION
            'PRECIO_NO_DISPONIBLE|El lote no tiene un precio vigente en PEN.';
    END IF;

    IF ROUND(v_precio, 2) <> p_monto_total THEN
        RAISE EXCEPTION
            'PRECIO_NO_COINCIDE|El monto debe coincidir con el precio vigente.';
    END IF;

    -- 14. Conservar contrato de respuesta JSON.
    RETURN JSONB_BUILD_OBJECT(
        'elegible', TRUE,
        'idProspecto', p_prospecto,
        'codigoProspecto', v_codigo_prospecto,
        'idPersona', v_persona,
        'idAsesor', v_asesor,
        'idLote', p_lote,
        'codigoLote', v_codigo_lote,
        'idProyecto', v_proyecto,
        'modalidad', p_modalidad,
        'precioVigente', ROUND(v_precio, 2),
        'idMoneda', v_id_moneda,
        'mensaje',
            'Validacion comercial preliminar satisfactoria.'
    );
END;
$function$;

-- Formalización conjunta de lotes disponibles y reservas propias vigentes.
-- Se conserva la función histórica v1 para clientes anteriores.
CREATE OR REPLACE FUNCTION public.sp_crm_registrar_ventas_multiples_v2(p_actor bigint,p_ventas jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $function$
DECLARE
 v_prospecto bigint; v_persona bigint; v_lote bigint; v_proyecto bigint;
 v_ids bigint[] := '{}'::bigint[]; v_refs text[] := '{}'::text[];
 v_item jsonb; v_validacion jsonb; v_pago jsonb; v_datos jsonb; v_comprador jsonb;
 v_agrupada jsonb; v_operacion bigint; v_resultado jsonb; v_ventas jsonb := '[]'::jsonb;
 v_debe numeric; v_total numeric := 0; v_ref text; v_cantidad integer;
BEGIN
 IF jsonb_typeof(p_ventas) IS DISTINCT FROM 'array' OR jsonb_array_length(p_ventas) NOT BETWEEN 1 AND 20
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Incluya entre uno y veinte lotes.'; END IF;
 v_prospecto := (p_ventas->0->>'idProspecto')::bigint;
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.create'::varchar),false)
 OR NOT coalesce(public.fn_crm_puede_consultar_prospecto(p_actor,v_prospecto),false)
 THEN RAISE EXCEPTION 'DENEGADO|No puede formalizar los lotes de este comprador.'; END IF;
 SELECT id_persona INTO STRICT v_persona FROM public.crm_prospectos WHERE id_prospecto=v_prospecto AND activo;
 v_comprador := p_ventas->0->'datosComprador';
 IF jsonb_typeof(v_comprador) IS DISTINCT FROM 'object' OR v_comprador->'identidadVerificada' IS DISTINCT FROM 'true'::jsonb
 THEN RAISE EXCEPTION 'IDENTIDAD_NO_VERIFICADA|Revise la ficha contractual del comprador.'; END IF;
 FOR v_item IN SELECT value FROM jsonb_array_elements(p_ventas) LOOP
   IF jsonb_typeof(v_item) IS DISTINCT FROM 'object' OR (v_item->>'idProspecto')::bigint IS DISTINCT FROM v_prospecto
      OR coalesce(v_item->>'idLote','') !~ '^[1-9][0-9]{0,17}$'
      OR coalesce(v_item->>'modalidad','') NOT IN ('CONTADO','FINANCIADA')
      OR ((v_item->'datosComprador')-'idProyectoInteres'::text) IS DISTINCT FROM (v_comprador-'idProyectoInteres'::text)
   THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Los lotes deben pertenecer al mismo comprador y ficha contractual.'; END IF;
   v_lote := (v_item->>'idLote')::bigint;
   IF v_lote=ANY(v_ids) THEN RAISE EXCEPTION 'LOTE_DUPLICADO|Un lote no puede formalizarse dos veces.'; END IF;
   v_ids := array_append(v_ids,v_lote);
 END LOOP;
 -- Igual orden de inventario que el cambio de reserva y la separación acumulada.
 PERFORM l.id_lote FROM public.inm_lotes l
 WHERE l.id_lote=ANY(v_ids) OR l.id_lote IN (
   SELECT r2.id_lote FROM public.ven_reservas r2
   JOIN public.ven_separaciones_grupo_lotes_v1 g2 ON g2.id_reserva=r2.id_reserva
   WHERE g2.id_grupo IN (
     SELECT g.id_grupo FROM public.ven_separaciones_grupo_lotes_v1 g
     JOIN public.ven_reservas r ON r.id_reserva=g.id_reserva
     JOIN public.cfg_estados_reserva e ON e.id_estado_reserva=r.id_estado_reserva
     WHERE r.id_lote=ANY(v_ids) AND r.id_persona=v_persona AND e.codigo='VIGENTE'
   )
 ) ORDER BY l.id_lote FOR UPDATE OF l;
 -- Verificar todos los montos, políticas, créditos y comprobantes antes de crear ventas.
 FOR v_item IN SELECT value FROM jsonb_array_elements(p_ventas) ORDER BY (value->>'idLote')::bigint LOOP
   v_lote := (v_item->>'idLote')::bigint;
   -- El inventario ya está bloqueado. La venta directa no crea una reserva ficticia.
   IF NOT EXISTS (
      SELECT 1 FROM public.inm_lotes l JOIN public.cfg_estados_lote e USING(id_estado_lote)
      JOIN public.inm_proyectos p USING(id_proyecto)
      WHERE l.id_lote=v_lote AND l.activo AND e.activo AND p.activo
      AND ( (e.codigo='DISPONIBLE' AND NOT EXISTS (
        SELECT 1 FROM public.ven_reservas r JOIN public.cfg_estados_reserva er USING(id_estado_reserva)
        WHERE r.id_lote=l.id_lote AND er.codigo IN ('PENDIENTE','VIGENTE') AND r.fecha_vencimiento>now()
      )) OR (e.codigo='RESERVADO' AND EXISTS (
        SELECT 1 FROM public.ven_reservas r JOIN public.cfg_estados_reserva er USING(id_estado_reserva)
        WHERE r.id_lote=l.id_lote AND r.id_persona=v_persona AND er.codigo='VIGENTE' AND r.fecha_vencimiento>now()
      )))
   ) THEN RAISE EXCEPTION 'LOTE_NO_DISPONIBLE|El lote debe estar disponible o tener una reserva propia vigente y confirmada.'; END IF;
   -- Exige interés activo y etapa comercial habilitada; incluye reservas propias.
   SELECT id_proyecto INTO STRICT v_proyecto FROM public.inm_lotes WHERE id_lote=v_lote;
   IF NOT EXISTS (
     SELECT 1 FROM jsonb_array_elements(public.sp_crm_etapas_operacion_v1(p_actor,v_prospecto,v_proyecto,true)) e
     CROSS JOIN LATERAL jsonb_array_elements_text(e->'idLotes') i
     WHERE i::bigint=v_lote
   ) THEN RAISE EXCEPTION 'LOTE_NO_DISPONIBLE|El lote no está autorizado para esta operación comercial.'; END IF;
   v_validacion:=public.sp_crm_validar_formalizacion_v10(p_actor,v_prospecto,v_lote,
     (v_item->>'modalidad')::varchar,(v_item->>'montoTotal')::numeric,(v_item->>'montoInicial')::numeric,
     (v_item->>'numeroCuotas')::integer,(v_item->>'tasaInteresMensualPct')::numeric);
   IF coalesce((v_validacion->>'elegible')::boolean,false)=false
   THEN RAISE EXCEPTION 'VENTA_NO_APTA|Revise las condiciones del lote.'; END IF;
   v_pago:=v_item->'datosPago';
   v_debe:=CASE WHEN v_item->>'modalidad'='FINANCIADA' THEN (v_validacion->>'montoInicialAdicional')::numeric ELSE (v_validacion->>'saldoContado')::numeric END;
   IF v_debe IS NULL OR v_debe<0 OR (v_pago->>'idPoliticaEsperada')::bigint IS DISTINCT FROM (v_validacion->>'idPolitica')::bigint
      OR (v_item->>'creditoEsperado')::numeric IS DISTINCT FROM (v_validacion->>'montoReservaAplicable')::numeric
      OR (v_item->>'pagoEsperado')::numeric IS DISTINCT FROM v_debe
   THEN RAISE EXCEPTION 'CONDICIONES_CAMBIO|El crédito, política o saldo cambió; vuelva a cotizar.'; END IF;
   IF jsonb_typeof(v_pago->'comprobantes') IS DISTINCT FROM 'array'
   THEN RAISE EXCEPTION 'VOUCHER_REQUERIDO|Revise los comprobantes por lote.'; END IF;
   v_cantidad:=jsonb_array_length(v_pago->'comprobantes');
   IF (v_debe>0 AND v_cantidad<>1) OR (v_debe=0 AND (v_cantidad<>0 OR v_pago->>'metodoPago'<>'EFECTIVO'))
   THEN RAISE EXCEPTION 'VOUCHER_REQUERIDO|Adjunte exactamente un comprobante por pago; si no hay saldo, no adjunte comprobante.'; END IF;
   v_ref:=upper(btrim(coalesce(v_pago->>'numeroOperacion','')));
   IF v_debe>0 AND v_ref<>'' THEN
     IF v_ref=ANY(v_refs) THEN RAISE EXCEPTION 'PAGO_DUPLICADO|Use una operación de pago distinta para cada lote.'; END IF;
     v_refs:=array_append(v_refs,v_ref);
   END IF;
   v_total:=v_total+v_debe;
 END LOOP;
 IF cardinality(v_ids)>1 THEN
   v_agrupada:=public.sp_crm_crear_operacion_agrupada_v1(p_actor,v_prospecto,
     (SELECT jsonb_agg(jsonb_build_object('idLote',(x->>'idLote')::bigint,'modalidad',x->>'modalidad')) FROM jsonb_array_elements(p_ventas) x),
     'Formalización conjunta de lotes'::varchar);
   v_operacion:=(v_agrupada->>'idOperacion')::bigint;
 END IF;
 FOR v_item IN SELECT value FROM jsonb_array_elements(p_ventas) ORDER BY (value->>'idLote')::bigint LOOP
   v_lote:=(v_item->>'idLote')::bigint;
   SELECT id_proyecto INTO STRICT v_proyecto FROM public.inm_lotes WHERE id_lote=v_lote;
   v_datos:=v_comprador||jsonb_build_object('idProyectoInteres',v_proyecto);
   v_resultado:=public.sp_crm_registrar_venta_pendiente_v14(p_actor,v_prospecto,v_lote,
     (v_item->>'modalidad')::varchar,(v_item->>'montoTotal')::numeric,(v_item->>'montoInicial')::numeric,
     (v_item->>'numeroCuotas')::integer,(v_item->>'tasaInteresMensualPct')::numeric,
     v_item->>'observaciones',v_datos,v_item->'datosPago');
   IF (v_resultado->>'idVenta')::bigint IS NULL THEN RAISE EXCEPTION 'VENTA_NO_REGISTRADA|No se registró el lote.'; END IF;
   IF v_operacion IS NOT NULL THEN
     PERFORM public.sp_crm_vincular_venta_operacion_agrupada_v1(p_actor,v_operacion,(v_resultado->>'idVenta')::bigint);
   END IF;
   v_ventas:=v_ventas||jsonb_build_array(v_resultado);
 END LOOP;
 RETURN jsonb_build_object('success',true,'idOperacion',v_operacion,'codigoOperacion',v_agrupada->>'codigo','ventas',v_ventas,'totalPago',v_total);
END $function$;
REVOKE ALL ON FUNCTION public.sp_crm_registrar_ventas_multiples_v2(bigint,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.sp_crm_registrar_ventas_multiples_v2(bigint,jsonb) TO sigi_app_user,sgi_backend_user;

COMMIT;
