-- Esquema MINIMO para compilar funciones financieras sin datos de produccion.
-- Funciones legadas capturadas por SELECT pg_get_functiondef de la BD activa
-- en la auditoria del 11/11/2026. NO contiene registros de compradores.
CREATE ROLE sigi_app_user NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE TABLE public.pag_planes_pago(
  id_plan_pago bigint,id_venta bigint,id_estado_plan_pago integer,id_moneda integer,
  codigo varchar,numero_version integer,monto_venta numeric,monto_inicial numeric,
  capital_financiado numeric,tasa_interes_pct numeric,monto_interes_total numeric,
  monto_total_financiado numeric,numero_cuotas integer,fecha_inicio date,
  fecha_primera_cuota date,descripcion_condiciones varchar,es_vigente boolean,
  id_venta_vigente bigint,fecha_cierre timestamptz,motivo_cierre varchar,
  fecha_creacion timestamptz,fecha_actualizacion timestamptz,monto_reserva_aplicada numeric
);
CREATE TABLE public.ven_reservas (
  id_reserva bigint,id_estado_reserva integer,monto_reserva numeric,
  fecha_vencimiento timestamptz,id_moneda integer,codigo varchar
);
CREATE TABLE public.cfg_estados_reserva (id_estado_reserva integer,codigo varchar);
CREATE TABLE public.pag_pagos (
  id_pago bigint,id_reserva bigint,id_estado_pago integer,monto numeric,id_moneda integer,
  id_venta bigint,id_plan_pago bigint
);
CREATE TABLE public.cfg_estados_pago (id_estado_pago integer,codigo varchar);
CREATE TABLE public.pag_vouchers (
  id_pago bigint,id_estado_voucher integer,activo boolean
);
CREATE TABLE public.cfg_estados_voucher (id_estado_voucher integer,codigo varchar);
CREATE TABLE public.pag_aplicaciones_pago (
  id_pago bigint,id_tipo_aplicacion_pago integer,activo boolean,
  id_plan_pago bigint,id_cuota bigint
);
CREATE TABLE public.cfg_tipos_aplicacion_pago (id_tipo_aplicacion_pago integer,codigo varchar);

-- BASELINE sp_crm_validar_formalizacion_v6
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
       OR v_estado NOT IN ('INTERESADO','NEGOCIACION','CON_RESERVA')
    THEN
        RAISE EXCEPTION
            'PROSPECTO_NO_ELEGIBLE|Se requiere un potencial activo.';
    END IF;

    -- 6. Evitar formalizacion duplicada.
    IF EXISTS (
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
            'YA_COMPRADOR|Esta persona ya es comprador.';
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

-- BASELINE sp_crm_registrar_venta_pendiente_v6
CREATE OR REPLACE FUNCTION public.sp_crm_registrar_venta_pendiente_v6(p_actor bigint, p_prospecto bigint, p_lote bigint, p_modalidad character varying, p_monto_total numeric, p_monto_inicial numeric, p_numero_cuotas integer, p_observaciones text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_contexto jsonb;
  v_persona bigint;
  v_asesor bigint;
  v_moneda integer;
  v_estado_venta integer;
  v_estado_contrato integer;
  v_tipo_contrato integer;
  v_estado_lote_reservado integer;
  v_estado_lote_anterior integer;
  v_estado_reserva_convertida integer;
  v_estado_plan integer;
  v_cliente bigint;
  v_venta bigint;
  v_contrato bigint;
  v_plan bigint;
  v_reserva bigint;
  v_proyecto bigint;
  v_tipo_seguimiento integer;
  v_codigo_venta varchar;
  v_codigo_contrato varchar;
  v_codigo_plan varchar;
  v_codigo_cliente varchar;
  v_codigo_estado_lote varchar;
  v_codigo_modalidad integer;
BEGIN
  IF p_observaciones IS NOT NULL AND length(p_observaciones)>1000 THEN
    RAISE EXCEPTION 'DATOS_INVALIDOS|Observaciones demasiado extensas.';
  END IF;

  IF p_actor IS NULL OR p_actor<=0 OR p_prospecto IS NULL OR p_prospecto<=0
     OR p_lote IS NULL OR p_lote<=0 THEN
    RAISE EXCEPTION 'DATOS_INVALIDOS|Identificadores de operacion invalidos.';
  END IF;

  -- El candado de lote serializa intentos de compra concurrentes.
  PERFORM 1 FROM public.inm_lotes WHERE id_lote=p_lote FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'LOTE_NO_DISPONIBLE|El lote no existe.';
  END IF;

  -- Evita conversiones concurrentes del mismo potencial en lotes diferentes.
  PERFORM 1 FROM public.crm_prospectos
  WHERE id_prospecto=p_prospecto FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROSPECTO_NO_ELEGIBLE|El prospecto no existe.';
  END IF;

  -- La totalidad de reglas comerciales vive en el procedimiento validado.
  v_contexto := public.sp_crm_validar_formalizacion_v6(
    p_actor,p_prospecto,p_lote,p_modalidad,p_monto_total,
    p_monto_inicial,p_numero_cuotas
  );

  IF NOT coalesce((v_contexto->>'elegible')::boolean,false) THEN
    RAISE EXCEPTION 'OPERACION_INVALIDA|La validacion comercial no fue aprobada.';
  END IF;

  v_persona := (v_contexto->>'idPersona')::bigint;
  v_asesor := (v_contexto->>'idAsesor')::bigint;
  v_moneda := (v_contexto->>'idMoneda')::integer;
  v_proyecto := (v_contexto->>'idProyecto')::bigint;

  SELECT id_estado_venta INTO STRICT v_estado_venta
  FROM public.cfg_estados_venta WHERE codigo='PENDIENTE' AND activo;

  SELECT id_estado_contrato INTO STRICT v_estado_contrato
  FROM public.cfg_estados_contrato WHERE codigo='PENDIENTE_FIRMA' AND activo;

  SELECT id_tipo_contrato INTO STRICT v_tipo_contrato
  FROM public.cfg_tipos_contrato WHERE codigo='COMPRAVENTA' AND activo;

  SELECT id_estado_lote INTO STRICT v_estado_lote_reservado
  FROM public.cfg_estados_lote WHERE codigo='RESERVADO' AND activo;

  SELECT id_estado_reserva INTO STRICT v_estado_reserva_convertida
  FROM public.cfg_estados_reserva WHERE codigo='CONVERTIDA' AND activo;

  SELECT id_modalidad_venta INTO STRICT v_codigo_modalidad
  FROM public.cfg_modalidades_venta WHERE codigo=p_modalidad AND activo;

  IF p_modalidad='FINANCIADA' THEN
    SELECT id_estado_plan_pago INTO STRICT v_estado_plan
    FROM public.cfg_estados_plan_pago WHERE codigo='PENDIENTE' AND activo;
  END IF;

  SELECT l.id_estado_lote,el.codigo INTO STRICT v_estado_lote_anterior,v_codigo_estado_lote
  FROM public.inm_lotes l
  JOIN public.cfg_estados_lote el ON el.id_estado_lote=l.id_estado_lote
  WHERE l.id_lote=p_lote;

  -- Reutiliza exclusivamente la reserva vigente del comprador correcto.
  SELECT r.id_reserva INTO v_reserva
  FROM public.ven_reservas r
  JOIN public.cfg_estados_reserva er ON er.id_estado_reserva=r.id_estado_reserva
  WHERE r.id_lote=p_lote AND r.id_persona=v_persona
    AND er.codigo='VIGENTE' AND r.fecha_vencimiento>now()
  ORDER BY r.fecha_reserva DESC,r.id_reserva DESC
  LIMIT 1 FOR UPDATE OF r;

  SELECT c.id_cliente INTO v_cliente
  FROM public.crm_clientes c WHERE c.id_persona=v_persona FOR UPDATE;

  IF v_cliente IS NULL THEN
    v_cliente := nextval(pg_get_serial_sequence('public.crm_clientes','id_cliente'));
    v_codigo_cliente := 'CLI-'||lpad(v_cliente::text,6,'0');
    INSERT INTO public.crm_clientes(id_cliente,id_persona,codigo,fecha_alta)
      OVERRIDING SYSTEM VALUE
    VALUES (v_cliente,v_persona,v_codigo_cliente,now());
  ELSE
    UPDATE public.crm_clientes
    SET activo=true,fecha_actualizacion=now()
    WHERE id_cliente=v_cliente AND NOT activo;
  END IF;

  v_venta := nextval(pg_get_serial_sequence('public.ven_ventas','id_venta'));
  v_codigo_venta := 'VTA-PND-'||to_char(CURRENT_DATE,'YYYY')||'-'||lpad(v_venta::text,6,'0');

  INSERT INTO public.ven_ventas(
    id_venta,id_lote,id_reserva,id_estado_venta,id_modalidad_venta,id_moneda,
    codigo,fecha_venta,precio_lista,descuento,precio_venta,observaciones,id_usuario_registro
  ) OVERRIDING SYSTEM VALUE
  VALUES (
    v_venta,p_lote,v_reserva,v_estado_venta,v_codigo_modalidad,v_moneda,
    v_codigo_venta,now(),p_monto_total,0,p_monto_total,p_observaciones,p_actor
  );

  INSERT INTO public.ven_ventas_clientes(
    id_venta,id_cliente,titular,porcentaje_participacion
  ) VALUES(v_venta,v_cliente,true,100);

  INSERT INTO public.com_ventas_asesores(
    id_venta,id_asesor,es_principal,porcentaje_participacion,id_usuario_registro
  ) VALUES (v_venta,v_asesor,true,100,p_actor);

  v_contrato := nextval(pg_get_serial_sequence('public.ven_contratos','id_contrato'));
  v_codigo_contrato := 'CON-PND-'||to_char(CURRENT_DATE,'YYYY')||'-'||lpad(v_contrato::text,6,'0');

  INSERT INTO public.ven_contratos(
    id_contrato,id_venta,id_tipo_contrato,id_estado_contrato,
    codigo,numero_contrato,fecha_emision,fecha_firma,
    fecha_inicio_vigencia,observaciones,id_usuario_registro
  ) OVERRIDING SYSTEM VALUE
  VALUES (
    v_contrato,v_venta,v_tipo_contrato,v_estado_contrato,
    v_codigo_contrato,v_codigo_contrato,CURRENT_DATE,NULL,NULL,
    'Contrato pendiente de firma',p_actor
  );

  -- Las condiciones se conservan, pero no se generan cuotas exigibles antes de la firma.
  IF p_modalidad='FINANCIADA' THEN
    v_plan := nextval(pg_get_serial_sequence('public.pag_planes_pago','id_plan_pago'));
    v_codigo_plan := 'PLN-PND-'||to_char(CURRENT_DATE,'YYYY')||'-'||lpad(v_plan::text,6,'0');
    INSERT INTO public.pag_planes_pago(
      id_plan_pago,id_venta,id_estado_plan_pago,id_moneda,codigo,numero_version,
      monto_venta,monto_inicial,capital_financiado,tasa_interes_pct,
      monto_interes_total,monto_total_financiado,numero_cuotas,
      fecha_inicio,fecha_primera_cuota,descripcion_condiciones,es_vigente
    ) OVERRIDING SYSTEM VALUE VALUES (
      v_plan,v_venta,v_estado_plan,v_moneda,v_codigo_plan,1,
      p_monto_total,p_monto_inicial,p_monto_total-p_monto_inicial,0,
      0,p_monto_total-p_monto_inicial,p_numero_cuotas,
      CURRENT_DATE,(CURRENT_DATE+interval '1 month')::date,
      'Plan pendiente de firma; fechas de cuotas por confirmar',true
    );
  END IF;

  IF v_reserva IS NOT NULL THEN
    UPDATE public.ven_reservas
    SET id_estado_reserva=v_estado_reserva_convertida,fecha_actualizacion=now()
    WHERE id_reserva=v_reserva;
  END IF;

  IF v_codigo_estado_lote='DISPONIBLE' THEN
    UPDATE public.inm_lotes
    SET id_estado_lote=v_estado_lote_reservado,fecha_actualizacion=now()
    WHERE id_lote=p_lote;

    INSERT INTO public.inm_lotes_historial_estado(
      id_lote,id_estado_anterior,id_estado_nuevo,motivo,fecha_cambio,id_usuario
    ) VALUES (
      p_lote,v_estado_lote_anterior,v_estado_lote_reservado,
      'Venta pendiente de firma '||v_codigo_venta,now(),p_actor
    );
  END IF;

  SELECT id_tipo_seguimiento INTO v_tipo_seguimiento
  FROM public.cfg_tipos_seguimiento WHERE codigo='OTRO' AND activo;

  IF v_tipo_seguimiento IS NOT NULL THEN
    INSERT INTO public.crm_seguimientos(
      id_prospecto,id_tipo_seguimiento,asunto,detalle,resultado,
      requiere_seguimiento,id_usuario_registro
    ) VALUES(
      p_prospecto,v_tipo_seguimiento,
      'Venta pendiente de firma',
      'Venta '||v_codigo_venta||'; contrato '||v_codigo_contrato||
      '; modalidad '||p_modalidad||'; asesor '||v_asesor::text,
      'Pendiente de firma',true,p_actor
    );
  END IF;

  RETURN jsonb_build_object(
    'success',true,'estadoVenta','PENDIENTE',
    'estadoContrato','PENDIENTE_FIRMA','estadoLote','RESERVADO',
    'esComprador',false,'idProspecto',p_prospecto,
    'idPersona',v_persona,'idAsesor',v_asesor,'idProyecto',v_proyecto,
    'idLote',p_lote,'idVenta',v_venta,'codigoVenta',v_codigo_venta,
    'idContrato',v_contrato,'codigoContrato',v_codigo_contrato,
    'idPlanPago',v_plan,'codigoPlanPago',v_codigo_plan,
    'modalidad',p_modalidad,'montoTotal',p_monto_total,
    'mensaje','Venta registrada pendiente de firma. El prospecto aun no es comprador.'
  );
EXCEPTION
  WHEN no_data_found OR too_many_rows THEN
    RAISE EXCEPTION 'CONFIGURACION_INVALIDA|Falta un catalogo requerido o existen duplicados.';
END
$function$;

-- BASELINE sp_crm_validar_formalizacion_v9
CREATE OR REPLACE FUNCTION public.sp_crm_validar_formalizacion_v9(p_actor bigint, p_prospecto bigint, p_lote bigint, p_modalidad character varying, p_monto_total numeric, p_monto_inicial numeric, p_numero_cuotas integer, p_tasa_mensual_pct numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
 v_contexto jsonb;
 v_reserva numeric:=0;
 v_persona bigint;
 v_simulacion jsonb;
BEGIN
  IF p_tasa_mensual_pct IS NOT NULL THEN
    RAISE EXCEPTION 'TASA_FIJA|La tasa de interes anual se calcula en el servidor y no se puede modificar.';
  END IF;
  v_contexto:=public.sp_crm_validar_formalizacion_v6(
    p_actor,p_prospecto,p_lote,p_modalidad,p_monto_total,
    p_monto_inicial,p_numero_cuotas
  );
  v_persona:=(v_contexto->>'idPersona')::bigint;

  SELECT r.monto_reserva INTO v_reserva
  FROM public.ven_reservas r
  JOIN public.cfg_estados_reserva er ON er.id_estado_reserva=r.id_estado_reserva
  WHERE r.id_persona=v_persona
    AND r.id_lote=p_lote AND er.codigo='VIGENTE'
    AND r.fecha_vencimiento>now()
  ORDER BY r.fecha_reserva DESC,r.id_reserva DESC LIMIT 1;
  v_reserva:=coalesce(v_reserva,0);
  IF v_reserva<0 OR v_reserva<>round(v_reserva,2)
     OR v_reserva>p_monto_total THEN
    RAISE EXCEPTION 'RESERVA_INVALIDA|Monto de reserva no valido.';
  END IF;

  IF p_modalidad='FINANCIADA' THEN
    IF p_monto_inicial IS NULL OR p_monto_inicial<5000
       OR p_monto_inicial+v_reserva>=p_monto_total THEN
      RAISE EXCEPTION 'INICIAL_INVALIDA|La inicial adicional debe ser al menos S/ 5000 y dejar saldo financiable despues de la reserva.';
    END IF;
    v_simulacion:=public.fn_crm_simular_frances_v2(
      p_monto_total,v_reserva,p_monto_inicial,p_numero_cuotas,(10::numeric/12));
  ELSIF p_tasa_mensual_pct IS NOT NULL THEN
    RAISE EXCEPTION 'DATOS_INVALIDOS|La venta al contado no requiere tasa de interes.';
  END IF;

  RETURN v_contexto || jsonb_build_object(
    'montoReservaAplicable',v_reserva,
    'saldoContado',p_monto_total-v_reserva,
    'planFrances',v_simulacion
  );
END $function$;

-- BASELINE sp_crm_registrar_venta_pendiente_v9
CREATE OR REPLACE FUNCTION public.sp_crm_registrar_venta_pendiente_v9(p_actor bigint, p_prospecto bigint, p_lote bigint, p_modalidad character varying, p_monto_total numeric, p_monto_inicial numeric, p_numero_cuotas integer, p_tasa_mensual_pct numeric, p_observaciones text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
 v_ctx jsonb;
 v_resultado jsonb;
 v_plan jsonb;
 v_id_plan bigint;
 v_reserva numeric;
 v_reserva_tras_registro numeric;
BEGIN
 -- La validación v7 aplica el alcance comercial, precio y titular de reserva.
 v_ctx:=public.sp_crm_validar_formalizacion_v9(
   p_actor,p_prospecto,p_lote,p_modalidad,p_monto_total,
   p_monto_inicial,p_numero_cuotas,p_tasa_mensual_pct);
 v_reserva:=(v_ctx->>'montoReservaAplicable')::numeric;
 v_plan:=v_ctx->'planFrances';

 -- La versión estable v6 registra venta y contrato pendiente de firma.
 v_resultado:=public.sp_crm_registrar_venta_pendiente_v6(
   p_actor,p_prospecto,p_lote,p_modalidad,p_monto_total,
   p_monto_inicial,p_numero_cuotas,p_observaciones);

 SELECT coalesce(r.monto_reserva,0) INTO STRICT v_reserva_tras_registro
     FROM public.ven_ventas venta
     LEFT JOIN public.ven_reservas r ON r.id_reserva=venta.id_reserva
     WHERE venta.id_venta=(v_resultado->>'idVenta')::bigint;
   IF v_reserva_tras_registro<>v_reserva THEN
     RAISE EXCEPTION 'RESERVA_CAMBIO|La reserva cambió durante el registro; revalide la operación.';
   END IF;
   IF p_modalidad='FINANCIADA' THEN
   v_id_plan:=(v_resultado->>'idPlanPago')::bigint;
   IF v_id_plan IS NULL OR v_plan IS NULL OR v_plan='null'::jsonb THEN
     RAISE EXCEPTION 'PLAN_INCONSISTENTE|La venta financiada requiere un plan confirmado.';
   END IF;
   UPDATE public.pag_planes_pago
   SET monto_reserva_aplicada=v_reserva,
       capital_financiado=(v_plan->>'capitalFinanciado')::numeric,
       tasa_interes_pct=round(10::numeric/12,6),
       monto_interes_total=(v_plan->>'interesTotal')::numeric,
       monto_total_financiado=(v_plan->>'totalCuotas')::numeric,
       descripcion_condiciones='FRANCES_ANUAL_FIJA_10_V1|Cuota fija francesa; tasa nominal anual fija 10%; mensual 10/12%; reserva e inicial independientes',
       fecha_actualizacion=now()
   WHERE id_plan_pago=v_id_plan AND id_venta=(v_resultado->>'idVenta')::bigint;
   IF NOT FOUND THEN
      RAISE EXCEPTION 'PLAN_INCONSISTENTE|No fue posible asociar el plan francés.';
   END IF;
 END IF;
 RETURN v_resultado || jsonb_build_object(
   'montoReservaAplicable',v_reserva,
   'saldoContado',v_ctx->'saldoContado',
   'planFrances',v_plan);
END $function$;

-- BASELINE sp_crm_registrar_venta_pendiente_v13
CREATE OR REPLACE FUNCTION public.sp_crm_registrar_venta_pendiente_v13(p_actor bigint, p_prospecto bigint, p_lote bigint, p_modalidad character varying, p_monto_total numeric, p_monto_inicial numeric, p_numero_cuotas integer, p_tasa_mensual_pct numeric, p_observaciones text, p_datos jsonb, p_pago jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
 v_persona bigint; v_origen integer; v_doc_tipo integer; v_asignado bigint; v_nuevo_asesor bigint;
 v_nombre text; v_paterno text; v_materno text; v_email text; v_telefono text;
 v_doc text; v_tipo text; v_direccion text; v_motivo text; v_mensaje text;
 v_proyecto bigint; v_contacto_id bigint; v_doc_id bigint; v_dir_id bigint;
 v_valor text; v_verificado boolean; v_actual_tipo integer;
 v_resultado jsonb; v_tipo_contacto integer;
 v_metodo text; v_id_metodo integer; v_requiere_numero boolean;
 v_numero_operacion text; v_archivos jsonb; v_archivo jsonb;
 v_key text; v_nombre_archivo text; v_mime text; v_size bigint;
 v_archivos_vistos text[]:='{}'::text[];
 v_cantidad integer; v_id_venta bigint; v_monto_objetivo numeric;
 v_estado_civil text; v_conyuge jsonb;
 v_conyuge_nombres text; v_conyuge_paterno text;
 v_conyuge_materno text; v_conyuge_telefono text;
 v_conyuge_correo text; v_conyuge_tipo text;
 v_conyuge_documento text;
 v_referencia text; v_pais text; v_departamento text;
 v_provincia text; v_distrito text;
 v_id_pais bigint; v_id_departamento bigint; v_id_provincia bigint; v_id_distrito bigint;
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.create'::varchar),false)
    OR NOT coalesce(public.fn_crm_puede_consultar_prospecto(p_actor,p_prospecto),false)
 THEN RAISE EXCEPTION 'DENEGADO|No puede registrar esta venta.'; END IF;
 IF p_pago IS NULL OR jsonb_typeof(p_pago)<>'object' THEN
   RAISE EXCEPTION 'PAGO_INVALIDO|Seleccione método de pago y adjunte los comprobantes necesarios.';
 END IF;
 v_metodo:=upper(trim(coalesce(p_pago->>'metodoPago','')));
 SELECT id_metodo_pago,requiere_numero_operacion
  INTO v_id_metodo,v_requiere_numero
 FROM public.cfg_metodos_pago WHERE codigo=v_metodo AND activo;
 IF v_id_metodo IS NULL THEN
   RAISE EXCEPTION 'METODO_PAGO_INVALIDO|Seleccione un método de pago activo.';
 END IF;
 v_numero_operacion:=trim(coalesce(p_pago->>'numeroOperacion',''));
 IF length(v_numero_operacion)>80 OR
    (v_requiere_numero AND v_numero_operacion='')
 THEN RAISE EXCEPTION 'OPERACION_REQUERIDA|Indique el número de operación del pago.';
 END IF;
 v_archivos:=p_pago->'comprobantes';
 IF v_archivos IS NULL OR jsonb_typeof(v_archivos)<>'array'
 THEN RAISE EXCEPTION 'ARCHIVOS_INVALIDOS|Se esperaba lista de comprobantes.';
 END IF;
 v_cantidad:=jsonb_array_length(v_archivos);
 IF v_cantidad>8 OR (v_metodo<>'EFECTIVO' AND v_cantidad=0)
 THEN RAISE EXCEPTION 'VOUCHER_REQUERIDO|Adjunte de 1 a 8 comprobantes, excepto si paga en efectivo.';
 END IF;
 FOR v_archivo IN SELECT value FROM jsonb_array_elements(v_archivos) LOOP
   v_key:=coalesce(v_archivo->>'claveArchivo','');
   v_nombre_archivo:=coalesce(v_archivo->>'nombreArchivo','');
   v_mime:=coalesce(v_archivo->>'tipoMime','');
   IF coalesce(v_archivo->>'tamanioBytes','') !~ '^[0-9]+$' THEN
     RAISE EXCEPTION 'ARCHIVO_INVALIDO|Tamaño de comprobante inválido.';
   END IF;
   v_size:=(v_archivo->>'tamanioBytes')::bigint;
   IF v_key !~ ('^ventas/p-'||p_prospecto::text||'/l-'||
       p_lote::text||'/[a-f0-9-]{36}\.(pdf|jpg|png|webp)$')
      OR v_nombre_archivo='' OR length(v_nombre_archivo)>255
      OR v_mime NOT IN('application/pdf','image/jpeg','image/png','image/webp')
      OR v_size<1 OR v_size>5242880 OR v_key=ANY(v_archivos_vistos)
      OR EXISTS(SELECT 1 FROM public.ven_ventas_comprobantes WHERE clave_archivo=v_key)
   THEN RAISE EXCEPTION 'ARCHIVO_INVALIDO|Referencia de comprobante inválida o duplicada.';
   END IF;
   IF NOT EXISTS (
      SELECT 1 FROM storage.objects obj WHERE obj.bucket_id='vouchers-ventas-private'
       AND obj.name=v_key AND obj.metadata->>'mimetype'=v_mime
       AND (obj.metadata->>'size') ~ '^[0-9]+$'
       AND (obj.metadata->>'size')::bigint=v_size
   ) THEN RAISE EXCEPTION 'VOUCHER_NO_CARGADO|Archivo no encontrado o distinto del enviado.';
   END IF;
   v_archivos_vistos:=array_append(v_archivos_vistos,v_key);
 END LOOP;

 IF p_datos IS NULL OR jsonb_typeof(p_datos)<>'object'
    OR (p_datos->>'idProspecto') IS DISTINCT FROM p_prospecto::text
 THEN RAISE EXCEPTION 'DATOS_COMPRADOR_REQUERIDOS|Revise los datos del cliente antes de registrar.'; END IF;
 PERFORM 1 FROM public.inm_lotes WHERE id_lote=p_lote FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'LOTE_NO_DISPONIBLE|Lote inexistente.'; END IF;
 SELECT id_persona INTO STRICT v_persona FROM public.crm_prospectos
 WHERE id_prospecto=p_prospecto AND activo FOR UPDATE;
 PERFORM 1 FROM public.core_personas
 WHERE id_persona=v_persona AND activo FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'PERSONA_INVALIDA|La persona no esta activa.'; END IF;

 v_nombre:=btrim(coalesce(p_datos->>'nombres',''));
 v_paterno:=btrim(coalesce(p_datos->>'apellidoPaterno',''));
 v_materno:=btrim(coalesce(p_datos->>'apellidoMaterno',''));
 v_email:=lower(btrim(coalesce(p_datos->>'correo','')));
 v_telefono:=btrim(coalesce(p_datos->>'telefono',''));
 v_tipo:=upper(btrim(coalesce(p_datos->>'tipoDocumento','')));
 v_doc:=upper(btrim(coalesce(p_datos->>'numeroDocumento','')));
 v_direccion:=btrim(coalesce(p_datos->>'direccion',''));
 v_referencia:=btrim(coalesce(p_datos->>'referencia',''));
 v_motivo:=btrim(coalesce(p_datos->>'motivoContacto',''));
 v_mensaje:=btrim(coalesce(p_datos->>'mensaje',''));
 IF v_nombre !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
    OR length(v_nombre)<2 OR length(v_nombre)>120
    OR v_paterno !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
    OR length(v_paterno)<2 OR length(v_paterno)>80
    OR (v_materno<>'' AND
       (v_materno !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
       OR length(v_materno)>80))
    OR length(concat_ws(' ',v_nombre,v_paterno,nullif(v_materno,'')))>150
    OR v_email !~ '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$'
    OR length(v_email)>180 OR v_telefono !~ '^([0-9]{7,15}|\+[1-9][0-9]{6,14})$'
    OR length(v_direccion)=0 OR length(v_direccion)>255
    OR length(v_referencia)>255 OR length(v_motivo)>150
    OR length(v_mensaje)>4000
 THEN RAISE EXCEPTION 'DATOS_COMPRADOR_INVALIDOS|Revise los datos personales, contacto y dirección del comprador.'; END IF;
 IF NOT (CASE v_tipo
   WHEN 'DNI' THEN v_doc ~ '^[0-9]{8}$'
   WHEN 'RUC' THEN v_doc ~ '^[0-9]{11}$'
   WHEN 'CE' THEN v_doc ~ '^[0-9]{9,12}$'
   WHEN 'PASAPORTE' THEN v_doc ~ '^[A-Z0-9]{6,20}$'
   ELSE false END)
 THEN RAISE EXCEPTION 'DOCUMENTO_INVALIDO|El documento no cumple el formato indicado.'; END IF;
 SELECT id_tipo_documento INTO v_doc_tipo FROM public.cfg_tipos_documento
 WHERE codigo=v_tipo AND activo;
 SELECT id_origen_prospecto INTO v_origen FROM public.cfg_origenes_prospecto
 WHERE codigo=p_datos->>'origenCodigo' AND activo;
 IF v_doc_tipo IS NULL OR v_origen IS NULL
 THEN RAISE EXCEPTION 'CATALOGO_INVALIDO|Documento u origen no valido.'; END IF;
 IF coalesce(p_datos->>'idProyectoInteres','') !~ '^[0-9]+$'
 THEN RAISE EXCEPTION 'PROYECTO_INVALIDO|Seleccione un proyecto.'; END IF;
 v_proyecto:=(p_datos->>'idProyectoInteres')::bigint;
 IF NOT EXISTS(SELECT 1 FROM public.inm_proyectos WHERE id_proyecto=v_proyecto AND activo)
 THEN RAISE EXCEPTION 'PROYECTO_INVALIDO|Proyecto inactivo o inexistente.'; END IF;

 -- Un cambio en documentos/contactos verificados requiere su flujo formal de evidencias.
 SELECT d.id_persona_documento,d.id_tipo_documento,d.numero_documento,d.verificado
 INTO v_doc_id,v_actual_tipo,v_valor,v_verificado
 FROM public.core_personas_documentos d
 WHERE d.id_persona=v_persona AND d.activo
 ORDER BY d.principal DESC,d.id_persona_documento DESC LIMIT 1 FOR UPDATE;
 IF v_doc_id IS NOT NULL AND
     (v_actual_tipo<>v_doc_tipo OR upper(btrim(v_valor))<>v_doc) THEN
   IF v_verificado THEN
     RAISE EXCEPTION 'DOCUMENTO_VERIFICADO|El cambio requiere revision documental con evidencias.';
   END IF;
   UPDATE public.core_personas_documentos SET
     id_tipo_documento=v_doc_tipo,numero_documento=v_doc,verificado=false,
     fecha_actualizacion=now()
   WHERE id_persona_documento=v_doc_id;
 ELSIF v_doc_id IS NULL THEN
   INSERT INTO public.core_personas_documentos(
     id_persona,id_tipo_documento,numero_documento,principal,verificado
   ) VALUES(v_persona,v_doc_tipo,v_doc,true,false);
 END IF;

 SELECT id_tipo_contacto INTO STRICT v_tipo_contacto FROM public.cfg_tipos_contacto
 WHERE codigo='EMAIL' AND activo;
 SELECT id_persona_contacto,valor,verificado INTO v_contacto_id,v_valor,v_verificado
 FROM public.core_personas_contactos
 WHERE id_persona=v_persona AND id_tipo_contacto=v_tipo_contacto AND activo
 ORDER BY principal DESC,id_persona_contacto DESC LIMIT 1 FOR UPDATE;
 IF v_contacto_id IS NOT NULL AND lower(btrim(v_valor))<>v_email THEN
   IF v_verificado THEN
     RAISE EXCEPTION 'CORREO_VERIFICADO|El cambio de correo requiere confirmacion de identidad.';
   END IF;
   UPDATE public.core_personas_contactos SET valor=v_email,verificado=false,
      fecha_actualizacion=now() WHERE id_persona_contacto=v_contacto_id;
 ELSIF v_contacto_id IS NULL THEN
   INSERT INTO public.core_personas_contactos(
     id_persona,id_tipo_contacto,valor,principal,verificado,permite_notificaciones)
   VALUES(v_persona,v_tipo_contacto,v_email,true,false,false);
 END IF;

 SELECT id_tipo_contacto INTO STRICT v_tipo_contacto FROM public.cfg_tipos_contacto
 WHERE codigo='CELULAR' AND activo;
 v_contacto_id:=NULL;v_valor:=NULL;v_verificado:=NULL;
 SELECT id_persona_contacto,valor,verificado INTO v_contacto_id,v_valor,v_verificado
 FROM public.core_personas_contactos
 WHERE id_persona=v_persona AND id_tipo_contacto=v_tipo_contacto AND activo
 ORDER BY principal DESC,id_persona_contacto DESC LIMIT 1 FOR UPDATE;
 IF v_contacto_id IS NOT NULL AND regexp_replace(v_valor,'[ ()-]','','g')<>v_telefono THEN
   IF v_verificado THEN
     RAISE EXCEPTION 'TELEFONO_VERIFICADO|El cambio de telefono requiere verificacion.';
   END IF;
   UPDATE public.core_personas_contactos SET valor=v_telefono,verificado=false,
      fecha_actualizacion=now() WHERE id_persona_contacto=v_contacto_id;
 ELSIF v_contacto_id IS NULL THEN
   INSERT INTO public.core_personas_contactos(
     id_persona,id_tipo_contacto,valor,principal,verificado,permite_notificaciones)
   VALUES(v_persona,v_tipo_contacto,v_telefono,true,false,false);
 END IF;

 -- Resolver jerarquía real desde el catálogo de ubicaciones:
 IF coalesce(p_datos->>'idPais','') !~ '^[0-9]+$'
    OR coalesce(p_datos->>'idDepartamento','') !~ '^[0-9]+$'
    OR coalesce(p_datos->>'idProvincia','') !~ '^[0-9]+$'
    OR coalesce(p_datos->>'idDistrito','') !~ '^[0-9]+$'
 THEN
   RAISE EXCEPTION 'UBICACION_INVALIDA|Seleccione país, departamento, provincia y distrito.';
 END IF;
 v_id_pais:=(p_datos->>'idPais')::bigint;
 v_id_departamento:=(p_datos->>'idDepartamento')::bigint;
 v_id_provincia:=(p_datos->>'idProvincia')::bigint;
 v_id_distrito:=(p_datos->>'idDistrito')::bigint;

 SELECT pais.nombre,dep.nombre,prov.nombre,dist.nombre
 INTO v_pais,v_departamento,v_provincia,v_distrito
 FROM public.cfg_ubicaciones_geograficas pais
 JOIN public.cfg_ubicaciones_geograficas dep
   ON dep.id_ubicacion_padre=pais.id_ubicacion
 JOIN public.cfg_ubicaciones_geograficas prov
   ON prov.id_ubicacion_padre=dep.id_ubicacion
 JOIN public.cfg_ubicaciones_geograficas dist
   ON dist.id_ubicacion_padre=prov.id_ubicacion
 WHERE pais.id_ubicacion=v_id_pais AND pais.tipo='PAIS'
   AND pais.pais_iso2='PE'
   AND dep.id_ubicacion=v_id_departamento AND dep.tipo='DEPARTAMENTO'
   AND prov.id_ubicacion=v_id_provincia AND prov.tipo='PROVINCIA'
   AND dist.id_ubicacion=v_id_distrito AND dist.tipo='DISTRITO'
   AND pais.activo AND dep.activo AND prov.activo AND dist.activo
   AND pais.estado_verificacion='VALIDADO'
   AND dep.estado_verificacion='VALIDADO'
   AND prov.estado_verificacion='VALIDADO'
   AND dist.estado_verificacion='VALIDADO';
 IF NOT FOUND THEN
   RAISE EXCEPTION 'UBICACION_INVALIDA|La ubicación no corresponde a la jerarquía seleccionada.';
 END IF;

 -- Estado civil solicitado para la preparación contractual.
 v_estado_civil:=upper(trim(coalesce(p_datos->>'estadoCivil','')));
 IF v_estado_civil NOT IN ('SOLTERO','CASADO','DIVORCIADO','VIUDO') THEN
    RAISE EXCEPTION 'ESTADO_CIVIL_INVALIDO|Seleccione un estado civil válido.';
 END IF;
 IF v_estado_civil='CASADO' THEN
    v_conyuge:=p_datos->'conyuge';
    IF v_conyuge IS NULL OR jsonb_typeof(v_conyuge)<>'object' THEN
      RAISE EXCEPTION 'CONYUGE_REQUERIDO|Complete la información del cónyuge.';
    END IF;
    v_conyuge_nombres:=trim(coalesce(v_conyuge->>'nombres',''));
    v_conyuge_paterno:=trim(coalesce(v_conyuge->>'apellidoPaterno',''));
    v_conyuge_materno:=trim(coalesce(v_conyuge->>'apellidoMaterno',''));
    v_conyuge_telefono:=trim(coalesce(v_conyuge->>'telefono',''));
    v_conyuge_correo:=lower(trim(coalesce(v_conyuge->>'correo','')));
    v_conyuge_tipo:=upper(trim(coalesce(v_conyuge->>'tipoDocumento','')));
    v_conyuge_documento:=upper(trim(coalesce(v_conyuge->>'numeroDocumento','')));
    IF v_conyuge_nombres !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
       OR length(v_conyuge_nombres)<2 OR length(v_conyuge_nombres)>120
       OR v_conyuge_paterno !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
       OR length(v_conyuge_paterno)<2 OR length(v_conyuge_paterno)>80
       OR (v_conyuge_materno<>'' AND (length(v_conyuge_materno)>80 OR
          v_conyuge_materno !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'))
       OR v_conyuge_telefono !~ '^([0-9]{7,15}|\+[1-9][0-9]{6,14})$'
       OR v_conyuge_correo !~ '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$'
       OR length(v_conyuge_correo)>180
       OR NOT (CASE v_conyuge_tipo
         WHEN 'DNI' THEN v_conyuge_documento ~ '^[0-9]{8}$'
         WHEN 'RUC' THEN v_conyuge_documento ~ '^[0-9]{11}$'
         WHEN 'CE' THEN v_conyuge_documento ~ '^[0-9]{9,12}$'
         WHEN 'PASAPORTE' THEN v_conyuge_documento ~ '^[A-Z0-9]{6,20}$'
         ELSE false END)
       OR (v_conyuge_tipo=v_tipo AND v_conyuge_documento=v_doc)
    THEN
      RAISE EXCEPTION 'CONYUGE_INVALIDO|Revise nombres, contacto y documento del cónyuge.';
    END IF;
 END IF;

 UPDATE public.core_personas SET estado_civil_codigo=v_estado_civil
  WHERE id_persona=v_persona;
 IF v_estado_civil='CASADO' THEN
   INSERT INTO public.core_personas_conyuges(
    id_persona,nombres,apellido_paterno,apellido_materno,
    telefono,correo,tipo_documento,numero_documento,activo,fecha_actualizacion)
   VALUES(v_persona,v_conyuge_nombres,v_conyuge_paterno,nullif(v_conyuge_materno,''),
     v_conyuge_telefono,v_conyuge_correo,v_conyuge_tipo,v_conyuge_documento,true,now())
   ON CONFLICT(id_persona) DO UPDATE SET
     nombres=excluded.nombres,apellido_paterno=excluded.apellido_paterno,
     apellido_materno=excluded.apellido_materno,telefono=excluded.telefono,
     correo=excluded.correo,tipo_documento=excluded.tipo_documento,
     numero_documento=excluded.numero_documento,activo=true,fecha_actualizacion=now();
 ELSE
   UPDATE public.core_personas_conyuges SET activo=false,fecha_actualizacion=now()
   WHERE id_persona=v_persona;
 END IF;

 UPDATE public.core_personas SET nombres=v_nombre,apellido_paterno=v_paterno,
   apellido_materno=nullif(v_materno,''),fecha_actualizacion=now()
 WHERE id_persona=v_persona;

 SELECT id_persona_direccion INTO v_dir_id
 FROM public.core_personas_direcciones WHERE id_persona=v_persona AND activo
 ORDER BY principal DESC,id_persona_direccion DESC LIMIT 1 FOR UPDATE;
 IF v_dir_id IS NOT NULL THEN
   UPDATE public.core_personas_direcciones
   SET direccion=v_direccion,referencia=nullif(v_referencia,''),
       pais=v_pais,departamento=v_departamento,
       provincia=v_provincia,distrito=v_distrito,
       fecha_actualizacion=now()
   WHERE id_persona_direccion=v_dir_id;
 ELSE
   INSERT INTO public.core_personas_direcciones(
     id_persona,tipo,direccion,referencia,pais,departamento,
     provincia,distrito,principal
   ) VALUES(
     v_persona,'DOMICILIO',v_direccion,nullif(v_referencia,''),
     v_pais,v_departamento,v_provincia,v_distrito,true);
 END IF;
 UPDATE public.crm_prospectos SET id_origen_prospecto=v_origen,
   fecha_actualizacion=now() WHERE id_prospecto=p_prospecto;
 UPDATE public.crm_prospectos_intereses
   SET fecha_interes=now(),fecha_actualizacion=now()
 WHERE id_prospecto=p_prospecto AND id_proyecto=v_proyecto AND activo;
 IF NOT FOUND THEN
   INSERT INTO public.crm_prospectos_intereses(id_prospecto,id_proyecto,activo)
   VALUES(p_prospecto,v_proyecto,true);
 END IF;

 SELECT id_asesor INTO v_asignado FROM public.com_asignaciones_prospecto
 WHERE id_prospecto_vigente=p_prospecto AND fecha_fin IS NULL LIMIT 1;
 IF p_datos ? 'idAsesor' AND p_datos->>'idAsesor' IS NOT NULL THEN
   IF (p_datos->>'idAsesor') !~ '^[0-9]+$'
   THEN RAISE EXCEPTION 'ASESOR_INVALIDO|Seleccione un asesor valido.'; END IF;
   v_nuevo_asesor:=(p_datos->>'idAsesor')::bigint;
   IF v_nuevo_asesor IS DISTINCT FROM v_asignado THEN
     IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'crm.edit'::varchar),false)
       OR NOT EXISTS(
         SELECT 1 FROM public.seg_usuarios_roles ur JOIN public.seg_roles r ON r.id_rol=ur.id_rol
         WHERE ur.id_usuario=p_actor AND ur.activo AND ur.fecha_revocacion IS NULL AND r.activo
           AND r.codigo IN('GERENCIA','SUPERVISOR_COMERCIAL')
       ) THEN RAISE EXCEPTION 'DENEGADO|Solo Gerencia o Supervisor comercial pueden reasignar asesor.'; END IF;
     PERFORM public.sp_crm_asignar_asesor_v3(
       p_actor,p_prospecto,v_nuevo_asesor,'Reasignacion durante validacion contractual');
   END IF;
 END IF;

 -- Crear una venta y vincular su cliente en el mismo contexto transaccional.
 v_resultado:=public.sp_crm_registrar_venta_pendiente_v9(
   p_actor,p_prospecto,p_lote,p_modalidad,p_monto_total,
   p_monto_inicial,p_numero_cuotas,p_tasa_mensual_pct,p_observaciones);
 -- El registro sigue siendo pendiente de auditoría; no constituye pago aprobado.
 v_id_venta:=(v_resultado->>'idVenta')::bigint;
 v_monto_objetivo:=CASE WHEN p_modalidad='FINANCIADA'
   THEN p_monto_inicial
   ELSE (v_resultado->>'saldoContado')::numeric END;
 IF v_monto_objetivo IS NULL THEN
   v_monto_objetivo:=p_monto_total-coalesce((v_resultado->>'montoReservaAplicable')::numeric,0);
 END IF;
 INSERT INTO public.ven_ventas_medios_pago(
   id_venta,id_metodo_pago,numero_operacion,monto_pendiente_revision,
   tipo_abono,id_usuario_registro
 ) VALUES (v_id_venta,v_id_metodo,nullif(v_numero_operacion,''),
   v_monto_objetivo,CASE WHEN p_modalidad='FINANCIADA' THEN 'INICIAL' ELSE 'CONTADO' END,p_actor);
 FOR v_archivo IN SELECT value FROM jsonb_array_elements(v_archivos) LOOP
   INSERT INTO public.ven_ventas_comprobantes(
     id_venta,clave_archivo,nombre_archivo,tipo_mime,tamanio_bytes)
   VALUES (v_id_venta,v_archivo->>'claveArchivo',
     v_archivo->>'nombreArchivo',v_archivo->>'tipoMime',
     (v_archivo->>'tamanioBytes')::bigint);
 END LOOP;
 INSERT INTO public.crm_ventas_datos_comprador(
   id_venta,id_prospecto,id_persona,id_usuario_revision,datos_revisados
 ) VALUES(
   (v_resultado->>'idVenta')::bigint,p_prospecto,v_persona,p_actor,
   p_datos||jsonb_build_object('revisadoEn',now(),'modalidad',p_modalidad,
     'idLote',p_lote,'precioVenta',p_monto_total)
 );
 RETURN v_resultado||jsonb_build_object('datosCompradorRevisados',true);
END $function$;

-- BASELINE sp_crm_aprobar_firma_contrato_v6
CREATE OR REPLACE FUNCTION public.sp_crm_aprobar_firma_contrato_v6(p_actor bigint, p_contrato bigint, p_archivo bigint, p_fecha_firma date, p_firma_revisada boolean, p_observaciones character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_lote bigint;
  v_venta bigint;
  v_prospecto bigint;
  v_estado_lote varchar;
  v_estado_venta varchar;
  v_estado_contrato varchar;
  v_modalidad varchar;
  v_codigo_venta varchar;
  v_codigo_contrato varchar;
  v_precio_venta numeric;
  v_fecha_emision date;
  v_fecha_venta date;
  v_id_estado_lote_actual integer;
  v_id_estado_lote_vendido integer;
  v_id_estado_venta_contratada integer;
  v_id_estado_contrato_vigente integer;
  v_id_estado_prospecto_convertido integer;
  v_id_estado_plan_activo integer;
  v_id_estado_cuota_pendiente integer;
  v_id_tipo_seguimiento integer;
  v_clave_archivo varchar;
  v_mime_archivo varchar;
  v_tamano_archivo bigint;
  v_storage_id uuid;
  v_mime_storage varchar;
  v_tamano_storage bigint;
  v_plan bigint;
  v_estado_plan varchar;
  v_num_cuotas integer;
  v_capital numeric;
  v_monto_plan numeric;
  v_inicial numeric;
  v_cuota_base numeric;
  v_tasa_mensual numeric;
  v_tasa_aplicada numeric;
  v_es_frances boolean;
  v_cuota_francesa numeric;
  v_saldo_restante numeric;
  v_interes_cuota numeric;
  v_interes_acumulado numeric;
  v_interes_previsto numeric;
  v_importe_cuota numeric;
  v_primer_vencimiento date;
  v_cuotas_creadas integer := 0;
  v_aprobacion bigint;
  v_pago_separacion jsonb;
  v_i integer;
BEGIN
  IF p_actor IS NULL OR p_actor <= 0
     OR p_contrato IS NULL OR p_contrato <= 0
     OR p_archivo IS NULL OR p_archivo <= 0 THEN
    RAISE EXCEPTION 'DATOS_INVALIDOS|Identificadores obligatorios invalidos.';
  END IF;

  IF NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.approve'),false) THEN
    RAISE EXCEPTION 'DENEGADO|Se requiere sales.approve.';
  END IF;

  IF p_firma_revisada IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'FIRMA_INVALIDA|La revision manual de firma debe estar confirmada.';
  END IF;

  IF p_fecha_firma IS NULL OR p_fecha_firma > current_date THEN
    RAISE EXCEPTION 'FIRMA_INVALIDA|Fecha de firma invalida o futura.';
  END IF;

  IF p_observaciones IS NULL OR length(btrim(p_observaciones)) NOT BETWEEN 15 AND 500 THEN
    RAISE EXCEPTION 'DATOS_INVALIDOS|Indicar observaciones de revision de 15 a 500 caracteres.';
  END IF;

  -- Orden de bloqueo: lote -> venta y contrato -> evidencia -> plan.
  SELECT v.id_lote INTO v_lote
  FROM public.ven_contratos c
  JOIN public.ven_ventas v ON v.id_venta=c.id_venta
  WHERE c.id_contrato=p_contrato;

  IF v_lote IS NULL THEN
    RAISE EXCEPTION 'CONTRATO_NO_EXISTE|El contrato no existe.';
  END IF;

  PERFORM 1 FROM public.inm_lotes WHERE id_lote=v_lote FOR UPDATE;

  SELECT v.id_venta,v.codigo,ev.codigo,c.codigo,ec.codigo,
         m.codigo,v.precio_venta,c.fecha_emision,v.fecha_venta::date,
         el.codigo,l.id_estado_lote
  INTO v_venta,v_codigo_venta,v_estado_venta,v_codigo_contrato,v_estado_contrato,
       v_modalidad,v_precio_venta,v_fecha_emision,v_fecha_venta,
       v_estado_lote,v_id_estado_lote_actual
  FROM public.ven_contratos c
  JOIN public.ven_ventas v ON v.id_venta=c.id_venta
  JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=v.id_estado_venta
  JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=c.id_estado_contrato
  JOIN public.cfg_modalidades_venta m ON m.id_modalidad_venta=v.id_modalidad_venta
  JOIN public.inm_lotes l ON l.id_lote=v.id_lote
  JOIN public.cfg_estados_lote el ON el.id_estado_lote=l.id_estado_lote
  WHERE c.id_contrato=p_contrato AND v.id_lote=v_lote
  FOR UPDATE OF v,c;

  IF v_venta IS NULL
     OR v_estado_venta<>'PENDIENTE'
     OR v_estado_contrato<>'PENDIENTE_FIRMA'
     OR v_estado_lote<>'RESERVADO'
     OR v_codigo_venta NOT LIKE 'VTA-PND-%'
     OR v_codigo_contrato NOT LIKE 'CON-PND-%' THEN
    RAISE EXCEPTION 'CONTRATO_NO_APROBABLE|Venta, contrato o lote no admiten la aprobacion.';
  END IF;

  IF p_fecha_firma < greatest(coalesce(v_fecha_emision,v_fecha_venta),v_fecha_venta) THEN
    RAISE EXCEPTION 'FIRMA_INVALIDA|La firma no puede ser anterior a la venta o emision.';
  END IF;

  IF EXISTS(SELECT 1 FROM public.ven_contratos_aprobaciones WHERE id_contrato=p_contrato) THEN
    RAISE EXCEPTION 'CONTRATO_NO_APROBABLE|El contrato ya cuenta con aprobacion.';
  END IF;

  SELECT a.clave_archivo,a.tipo_mime,a.tamano_bytes
  INTO v_clave_archivo,v_mime_archivo,v_tamano_archivo
  FROM public.ven_contratos_archivos a
  WHERE a.id_contrato_archivo=p_archivo
    AND a.id_contrato=p_contrato
    AND a.vigente=true
  FOR UPDATE OF a;

  IF v_clave_archivo IS NULL OR v_clave_archivo !~
    ('^contratos/'||p_contrato::text||
     '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$') THEN
    RAISE EXCEPTION 'FIRMA_SIN_EVIDENCIA|PDF vigente no vinculado al contrato.';
  END IF;

  SELECT o.id, o.metadata->>'mimetype', (o.metadata->>'size')::bigint
  INTO v_storage_id,v_mime_storage,v_tamano_storage
  FROM storage.objects o
  WHERE o.bucket_id='contratos-firmados-private'
    AND o.name=v_clave_archivo;

  IF v_storage_id IS NULL
     OR v_mime_archivo IS DISTINCT FROM 'application/pdf'
     OR v_mime_storage IS DISTINCT FROM 'application/pdf'
     OR v_tamano_archivo IS NULL
     OR v_tamano_archivo <= 0
     OR v_tamano_archivo>10485760
     OR v_tamano_storage IS DISTINCT FROM v_tamano_archivo THEN
    RAISE EXCEPTION 'FIRMA_SIN_EVIDENCIA|Archivo PDF no disponible o alterado en Storage.';
  END IF;

  SELECT pr.id_prospecto INTO v_prospecto
  FROM public.ven_ventas_clientes vc
  JOIN public.crm_clientes cli ON cli.id_cliente=vc.id_cliente
  JOIN public.crm_prospectos pr ON pr.id_persona=cli.id_persona
  WHERE vc.id_venta=v_venta AND vc.titular AND cli.activo AND pr.activo
  LIMIT 1;

  IF v_prospecto IS NULL THEN
    RAISE EXCEPTION 'CONTRATO_NO_APROBABLE|No existe prospecto titular activo.';
  END IF;

  SELECT id_estado_lote INTO v_id_estado_lote_vendido
  FROM public.cfg_estados_lote WHERE codigo='VENDIDO' AND activo=true;

  SELECT id_estado_venta INTO v_id_estado_venta_contratada
  FROM public.cfg_estados_venta WHERE codigo='CONTRATADA' AND activo=true;

  SELECT id_estado_contrato INTO v_id_estado_contrato_vigente
  FROM public.cfg_estados_contrato WHERE codigo='VIGENTE' AND activo=true;

  SELECT id_estado_prospecto INTO v_id_estado_prospecto_convertido
  FROM public.cfg_estados_prospecto WHERE codigo='CONVERTIDO' AND activo=true;

  IF v_id_estado_lote_vendido IS NULL OR v_id_estado_venta_contratada IS NULL
     OR v_id_estado_contrato_vigente IS NULL OR v_id_estado_prospecto_convertido IS NULL THEN
    RAISE EXCEPTION 'CONFIGURACION_INVALIDA|Faltan estados necesarios.';
  END IF;

  IF v_modalidad='FINANCIADA' THEN
    SELECT p.id_plan_pago, ep.codigo,p.numero_cuotas,p.capital_financiado,
           p.monto_venta,p.monto_inicial+p.monto_reserva_aplicada,p.tasa_interes_pct,p.monto_interes_total
    INTO v_plan,v_estado_plan,v_num_cuotas,v_capital,v_monto_plan,v_inicial,v_tasa_mensual,v_interes_previsto
    FROM public.pag_planes_pago p
    JOIN public.cfg_estados_plan_pago ep
      ON ep.id_estado_plan_pago=p.id_estado_plan_pago
    WHERE p.id_venta=v_venta AND p.es_vigente=true
    FOR UPDATE OF p;

    IF v_plan IS NULL OR v_estado_plan<>'PENDIENTE'
       OR v_num_cuotas NOT BETWEEN 1 AND 36 OR v_capital<=0
       OR v_monto_plan<>v_precio_venta
       OR v_capital<>(v_monto_plan-v_inicial)
       OR EXISTS (SELECT 1 FROM public.pag_cuotas cu WHERE cu.id_plan_pago=v_plan)
       OR EXISTS (SELECT 1 FROM public.pag_pagos pg WHERE pg.id_venta=v_venta)
    THEN
      RAISE EXCEPTION 'PLAN_INCONSISTENTE|Plan financiado no apto para activar.';
    END IF;

    SELECT id_estado_plan_pago INTO v_id_estado_plan_activo
    FROM public.cfg_estados_plan_pago
    WHERE codigo='ACTIVO' AND activo=true;

    SELECT id_estado_cuota INTO v_id_estado_cuota_pendiente
    FROM public.cfg_estados_cuota
    WHERE codigo='PENDIENTE' AND activo=true;

    IF v_id_estado_plan_activo IS NULL OR v_id_estado_cuota_pendiente IS NULL THEN
      RAISE EXCEPTION 'CONFIGURACION_INVALIDA|Faltan estados del plan/cuotas.';
    END IF;

  ELSIF v_modalidad='CONTADO' THEN
    IF EXISTS (SELECT 1 FROM public.pag_planes_pago p WHERE p.id_venta=v_venta AND p.es_vigente)
       OR EXISTS (SELECT 1 FROM public.pag_pagos pg WHERE pg.id_venta=v_venta) THEN
      RAISE EXCEPTION 'PLAN_INCONSISTENTE|La venta contado requiere revision financiera.';
    END IF;
  ELSE
    RAISE EXCEPTION 'CONTRATO_NO_APROBABLE|Modalidad de venta no admitida.';
  END IF;

  UPDATE public.ven_contratos
  SET id_estado_contrato=v_id_estado_contrato_vigente,
      fecha_firma=p_fecha_firma,
      fecha_inicio_vigencia=p_fecha_firma,
      observaciones=concat('Firma revisada; aprobacion usuario ',p_actor::text),
      fecha_actualizacion=now()
  WHERE id_contrato=p_contrato;

  UPDATE public.ven_ventas
  SET id_estado_venta=v_id_estado_venta_contratada,
      fecha_actualizacion=now()
  WHERE id_venta=v_venta;

  UPDATE public.inm_lotes
  SET id_estado_lote=v_id_estado_lote_vendido,
      fecha_actualizacion=now()
  WHERE id_lote=v_lote;

  INSERT INTO public.inm_lotes_historial_estado(
    id_lote,id_estado_anterior,id_estado_nuevo,motivo,fecha_cambio,id_usuario
  ) VALUES(
    v_lote,v_id_estado_lote_actual,v_id_estado_lote_vendido,
    left('Venta contratada '||v_codigo_venta,255),now(),p_actor
  );

  UPDATE public.crm_prospectos
  SET id_estado_prospecto=v_id_estado_prospecto_convertido,
      fecha_conversion=now(),fecha_actualizacion=now()
  WHERE id_prospecto=v_prospecto;

  IF v_modalidad='FINANCIADA' THEN
    v_primer_vencimiento:=(p_fecha_firma + interval '1 month')::date;

    UPDATE public.pag_planes_pago
    SET id_estado_plan_pago=v_id_estado_plan_activo,
        fecha_inicio=p_fecha_firma,
        fecha_primera_cuota=v_primer_vencimiento,
        descripcion_condiciones=CASE
          WHEN descripcion_condiciones LIKE 'ALEMAN_ANUAL_FIJA_5_V1%'
            OR descripcion_condiciones LIKE 'FRANCES_ANUAL_FIJA_5_V1%'
            OR descripcion_condiciones LIKE 'FRANCES_ANUAL_FIJA_10_V1%'
            THEN descripcion_condiciones
          ELSE 'Plan activo desde firma contractual validada'
        END,
        fecha_actualizacion=now()
    WHERE id_plan_pago=v_plan;

    INSERT INTO public.pag_planes_pago_historial_estado(
      id_plan_pago,id_estado_anterior,id_estado_nuevo,
      fecha_cambio,motivo,id_usuario_cambio
    )
    SELECT v_plan,e.id_estado_plan_pago,v_id_estado_plan_activo,
           now(),'Activacion por aprobacion de contrato '||v_codigo_contrato,p_actor
    FROM public.cfg_estados_plan_pago e
    WHERE e.codigo='PENDIENTE' AND e.activo=true;

    v_cuota_base:=trunc(v_capital/v_num_cuotas,2);
    SELECT
      (pp.descripcion_condiciones LIKE 'FRANCES_ANUAL_FIJA_5_V1%'
       OR pp.descripcion_condiciones LIKE 'FRANCES_ANUAL_FIJA_10_V1%'),
      CASE
        WHEN pp.descripcion_condiciones LIKE 'FRANCES_ANUAL_FIJA_10_V1%'
          THEN 10::numeric/12
        WHEN pp.descripcion_condiciones LIKE 'FRANCES_ANUAL_FIJA_5_V1%'
          OR pp.descripcion_condiciones LIKE 'ALEMAN_ANUAL_FIJA_5_V1%'
          THEN 5::numeric/12
        ELSE coalesce(v_tasa_mensual,0)
      END
    INTO v_es_frances,v_tasa_aplicada
    FROM public.pag_planes_pago pp WHERE pp.id_plan_pago=v_plan;
    IF v_es_frances THEN
      v_cuota_francesa:=round(
          v_capital*(v_tasa_aplicada/100)*
          power(1+(v_tasa_aplicada/100),v_num_cuotas)/
          (power(1+(v_tasa_aplicada/100),v_num_cuotas)-1),2);
    END IF;
    v_saldo_restante:=v_capital;
    v_interes_acumulado:=0;

    FOR v_i IN 1..v_num_cuotas LOOP
      IF v_es_frances THEN
        v_interes_cuota:=round(v_saldo_restante*v_tasa_aplicada/100,2);
        v_importe_cuota:=CASE
          WHEN v_i=v_num_cuotas THEN v_saldo_restante
          ELSE v_cuota_francesa-v_interes_cuota
        END;
      ELSE
        v_importe_cuota:=CASE
          WHEN v_i=v_num_cuotas THEN v_capital-v_cuota_base*(v_num_cuotas-1)
          ELSE v_cuota_base
        END;
      END IF;

      IF v_importe_cuota <= 0 THEN
        RAISE EXCEPTION 'PLAN_INCONSISTENTE|Importe de cuota invalido.';
      END IF;

      v_interes_cuota:=round(v_saldo_restante*v_tasa_aplicada/100,2);
      v_saldo_restante:=round(v_saldo_restante-v_importe_cuota,2);
      v_interes_acumulado:=v_interes_acumulado+v_interes_cuota;

      INSERT INTO public.pag_cuotas(
        id_plan_pago,id_estado_cuota,numero_cuota,
        fecha_vencimiento,monto_capital,monto_interes,
        monto_cuota,observaciones
      ) VALUES (
        v_plan,v_id_estado_cuota_pendiente,v_i,
        (p_fecha_firma + make_interval(months=>v_i))::date,
        v_importe_cuota,v_interes_cuota,v_importe_cuota+v_interes_cuota,
        'Cuota generada por contrato firmado'
      );
      v_cuotas_creadas:=v_cuotas_creadas+1;
    END LOOP;
    IF v_interes_acumulado<>coalesce(v_interes_previsto,0)
       OR v_saldo_restante<>0 THEN
      RAISE EXCEPTION 'PLAN_INCONSISTENTE|Intereses del cronograma no coinciden con el plan pactado.';
    END IF;
  END IF;

  UPDATE public.ven_contratos_archivos
  SET observaciones='Documento firmado revisado y aprobado manualmente',
      fecha_documento=(p_fecha_firma::timestamp AT TIME ZONE 'UTC'),
      fecha_actualizacion=now()
  WHERE id_contrato_archivo=p_archivo;

  INSERT INTO public.ven_contratos_aprobaciones(
    id_contrato,id_contrato_archivo,id_usuario_aprobacion,
    fecha_firma,firma_revisada,observaciones
  ) VALUES(
    p_contrato,p_archivo,p_actor,p_fecha_firma,true,btrim(p_observaciones)
  ) RETURNING id_aprobacion INTO v_aprobacion;

  SELECT id_tipo_seguimiento INTO v_id_tipo_seguimiento
  FROM public.cfg_tipos_seguimiento WHERE codigo='OTRO' AND activo=true;

  IF v_id_tipo_seguimiento IS NOT NULL THEN
    INSERT INTO public.crm_seguimientos(
      id_prospecto,id_tipo_seguimiento,asunto,detalle,resultado,
      requiere_seguimiento,id_usuario_registro
    ) VALUES(
      v_prospecto,v_id_tipo_seguimiento,
      'Firma contractual aprobada',
      'Contrato '||v_codigo_contrato||', venta '||v_codigo_venta||
      ', archivo '||p_archivo::text||'; aprobado por usuario '||p_actor::text,
      'Comprador convertido',false,p_actor
    );
  END IF;

  -- El credito del pago es atomico con la firma contractual.
  v_pago_separacion := public.sp_crm_aplicar_separacion_a_venta_v1(p_actor,v_venta);

  RETURN jsonb_build_object(
    'success',true,
    'pagoSeparacion',v_pago_separacion,
    'idContrato',p_contrato,'codigoContrato',v_codigo_contrato,
    'idVenta',v_venta,'codigoVenta',v_codigo_venta,
    'idContratoArchivo',p_archivo,'idAprobacion',v_aprobacion,
    'idProspecto',v_prospecto,'idLote',v_lote,
    'estadoContrato','VIGENTE','estadoVenta','CONTRATADA',
    'estadoLote','VENDIDO','esComprador',true,
    'idPlanPago',v_plan,'cuotasGeneradas',v_cuotas_creadas,
    'mensaje','Contrato aprobado y prospecto convertido a comprador.'
  );
END;
$function$;

-- BASELINE sp_crm_cronograma_venta_v1
CREATE OR REPLACE FUNCTION public.sp_crm_cronograma_venta_v1(p_actor bigint, p_venta bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
 v_plan public.pag_planes_pago%ROWTYPE;
 v_codigo text;
 v_cuotas jsonb;
 v_registros integer;
 v_mensual numeric;
 v_interes numeric;
BEGIN
 IF NOT coalesce(public.fn_crm_puede_consultar_venta_v1(p_actor,p_venta),false)
 THEN RAISE EXCEPTION 'VENTA_NO_DISPONIBLE|Venta fuera de su cartera autorizada.'; END IF;
 SELECT codigo INTO v_codigo FROM public.ven_ventas WHERE id_venta=p_venta;
 SELECT * INTO v_plan FROM public.pag_planes_pago
  WHERE id_venta=p_venta
  ORDER BY es_vigente DESC,numero_version DESC,id_plan_pago DESC LIMIT 1;
 IF v_plan.id_plan_pago IS NULL THEN
  RETURN jsonb_build_object('idVenta',p_venta,'codigoVenta',v_codigo,
   'tipoCronograma','SIN_PLAN','items','[]'::jsonb);
 END IF;
 SELECT count(*) INTO v_registros FROM public.pag_cuotas WHERE id_plan_pago=v_plan.id_plan_pago;
 IF v_registros>0 THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'numero',c.numero_cuota,
    'fechaVencimiento',to_char(c.fecha_vencimiento,'YYYY-MM-DD'),
    'capital',c.monto_capital,'interes',c.monto_interes,
    'cuota',c.monto_cuota,'estado',est.codigo,
    'fechaPagoCompleto',c.fecha_pago_completo
   ) ORDER BY c.numero_cuota),'[]'::jsonb)
  INTO v_cuotas FROM public.pag_cuotas c
  JOIN public.cfg_estados_cuota est ON est.id_estado_cuota=c.id_estado_cuota
  WHERE c.id_plan_pago=v_plan.id_plan_pago;
  RETURN jsonb_build_object('idVenta',p_venta,'codigoVenta',v_codigo,
   'codigoPlan',v_plan.codigo,'tipoCronograma','REGISTRADO',
   'numeroCuotas',v_plan.numero_cuotas,'capitalFinanciado',v_plan.capital_financiado,
   'fechaPrimeraCuota',v_plan.fecha_primera_cuota,
   'items',v_cuotas);
 END IF;
 IF v_plan.fecha_primera_cuota IS NULL OR v_plan.capital_financiado<=0
    OR v_plan.numero_cuotas NOT BETWEEN 1 AND 36
    OR v_plan.descripcion_condiciones NOT LIKE 'FRANCES_ANUAL_FIJA_10_%'
 THEN
  RETURN jsonb_build_object('idVenta',p_venta,'codigoVenta',v_codigo,
   'codigoPlan',v_plan.codigo,'tipoCronograma','SIN_CUOTAS',
   'numeroCuotas',v_plan.numero_cuotas,
   'fechaPrimeraCuota',v_plan.fecha_primera_cuota,
   'items','[]'::jsonb);
 END IF;
 v_interes:=10::numeric/1200;
 v_mensual:=round(v_plan.capital_financiado*v_interes/
         (1-power(1+v_interes,-v_plan.numero_cuotas)),2);
 WITH RECURSIVE amort(n,saldo_inicio,interes,capital,cuota) AS (
  SELECT 1,
    (v_plan.capital_financiado + 0::numeric),
    round(v_plan.capital_financiado*v_interes,2),
    CASE WHEN v_plan.numero_cuotas=1 THEN v_plan.capital_financiado
         ELSE round(v_mensual-round(v_plan.capital_financiado*v_interes,2),2) END,
    CASE WHEN v_plan.numero_cuotas=1 THEN
       v_plan.capital_financiado+round(v_plan.capital_financiado*v_interes,2)
       ELSE v_mensual END
  UNION ALL
  SELECT a.n+1,
    r.saldo,
    round(r.saldo*v_interes,2),
    CASE WHEN a.n+1=v_plan.numero_cuotas THEN r.saldo
         ELSE least(r.saldo,round(v_mensual-round(r.saldo*v_interes,2),2)) END,
    CASE WHEN a.n+1=v_plan.numero_cuotas
      THEN r.saldo+round(r.saldo*v_interes,2) ELSE v_mensual END
  FROM amort a
  CROSS JOIN LATERAL (SELECT greatest(0,a.saldo_inicio-a.capital) saldo) r
  WHERE a.n<v_plan.numero_cuotas
 )
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'numero',n,
  'fechaVencimiento',to_char((v_plan.fecha_primera_cuota+
    make_interval(months=>n-1))::date,'YYYY-MM-DD'),
  'capital',capital,'interes',interes,'cuota',cuota,'estado','PROYECTADA'
 ) ORDER BY n),'[]'::jsonb) INTO v_cuotas
 FROM amort;
 RETURN jsonb_build_object('idVenta',p_venta,'codigoVenta',v_codigo,
   'codigoPlan',v_plan.codigo,'tipoCronograma','PROYECTADO',
   'numeroCuotas',v_plan.numero_cuotas,
   'capitalFinanciado',v_plan.capital_financiado,
   'fechaPrimeraCuota',v_plan.fecha_primera_cuota,
   'tasaAnualNominal',10,
   'advertencia','Proyección orientativa. Las fechas e importes exigibles dependen del contrato firmado y el cronograma aprobado.',
   'items',v_cuotas);
END $function$;

-- BASELINE sp_crm_reservas_vigentes_para_venta_v1
CREATE OR REPLACE FUNCTION public.sp_crm_reservas_vigentes_para_venta_v1(p_actor bigint, p_prospecto bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_autorizado jsonb;
  v_reservas jsonb;
BEGIN
  v_autorizado := public.sp_crm_listar_lotes_reservados_prospecto_v1(
      p_actor,p_prospecto);
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'idReserva',r.id_reserva,'codigoReserva',r.codigo,
      'idLote',l.id_lote,'idProyecto',l.id_proyecto,'idEtapa',man.id_etapa,
      'montoReserva',round(r.monto_reserva,2),
      'fechaVencimiento',r.fecha_vencimiento
  ) ORDER BY r.fecha_reserva DESC,r.id_reserva DESC),'[]'::jsonb)
  INTO v_reservas
  FROM public.ven_reservas r
  JOIN public.inm_lotes l ON l.id_lote=r.id_lote
  JOIN public.inm_manzanas man ON man.id_manzana=l.id_manzana
  JOIN public.crm_prospectos p ON p.id_persona=r.id_persona
  JOIN public.cfg_estados_reserva e ON e.id_estado_reserva=r.id_estado_reserva
  WHERE p.id_prospecto=p_prospecto
    AND e.codigo='VIGENTE' AND r.fecha_vencimiento>now()
    AND l.id_lote IN (
      SELECT (x)::bigint
      FROM jsonb_array_elements_text(v_autorizado->'idLotes') x
    );
  RETURN jsonb_build_object('reservas',v_reservas,
                            'idLotes',v_autorizado->'idLotes');
END $function$;
