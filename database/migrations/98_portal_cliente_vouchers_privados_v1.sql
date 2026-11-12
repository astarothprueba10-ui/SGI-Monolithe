-- SGI-MONOLITHE | Sprint 4 | 5.4.4
-- Carga privada de vouchers del comprador y seguimiento sin imputaciones automáticas.
-- Reutiliza las tablas/revisión de Finanzas 85,86,92,93 y los saldos 76.
-- Seguridad: actor = JWT (Core Service); identidad y ventas verificadas por función 95.

CREATE OR REPLACE FUNCTION public.sp_portal_cliente_vouchers_v1(p_actor bigint)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE
  v_resumen jsonb;
  v_operaciones jsonb;
  v_metodos jsonb;
  v_comprobantes jsonb;
BEGIN
  v_resumen := public.sp_portal_cliente_resumen_v1(p_actor);

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'idVenta',(op.value->>'id_venta')::bigint,
    'codigoVenta',op.value->>'codigo_venta',
    'proyecto',op.value->>'proyecto',
    'manzana',op.value->>'manzana',
    'numeroLote',op.value->>'numero_lote',
    'planActivo',(op.value->'financiamiento'->>'idPlanPago') IS NOT NULL,
    'saldoInicial',coalesce((op.value->'financiamiento'->>'saldoInicial')::numeric,0),
    'cuotas',coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'idCuota',c.id_cuota,'numero',c.numero_cuota,
        'fechaVencimiento',to_char(c.fecha_vencimiento,'YYYY-MM-DD'),
        'saldo',public.fn_fin_saldo_cuota_confirmado_v1(c.id_cuota)
      ) ORDER BY c.numero_cuota)
      FROM public.pag_cuotas c
      JOIN public.cfg_estados_cuota ec ON ec.id_estado_cuota=c.id_estado_cuota
      WHERE c.id_plan_pago=(op.value->'financiamiento'->>'idPlanPago')::bigint
        AND ec.codigo<>'ANULADA'
        AND public.fn_fin_saldo_cuota_confirmado_v1(c.id_cuota)>0
    ),'[]'::jsonb)
  ) ORDER BY (op.value->>'id_venta')::bigint),'[]'::jsonb)
  INTO v_operaciones
  FROM jsonb_array_elements(v_resumen->'operaciones') op(value);

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'idMetodoPago',m.id_metodo_pago,'nombre',m.nombre,'codigo',m.codigo)
    ORDER BY m.id_metodo_pago),'[]'::jsonb)
  INTO v_metodos
  FROM public.cfg_metodos_pago m WHERE m.activo;

  WITH autorizadas AS (
    SELECT DISTINCT (o.value->>'id_venta')::bigint AS id_venta
    FROM jsonb_array_elements(v_resumen->'operaciones') o(value)
  ), cargas AS (
    SELECT c.id_venta,c.id_cuota,c.id_pago,c.id_voucher,
      'CUOTA'::text AS destino
    FROM public.pag_cargas_voucher_cuota c
    WHERE c.id_voucher IS NOT NULL
    UNION ALL
    SELECT c.id_venta,NULL::bigint,c.id_pago,c.id_voucher,
      'INICIAL'::text
    FROM public.pag_cargas_voucher_inicial_v1 c
    WHERE c.id_voucher IS NOT NULL
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'idVoucher',v.id_voucher,'codigoVoucher',v.codigo,
    'idVenta',p.id_venta,'codigoVenta',venta.codigo,
    'destino',c.destino,'numeroCuota',q.numero_cuota,
    'monto',p.monto,'metodoPago',mp.nombre,
    'fechaOperacion',to_char(p.fecha_operacion AT TIME ZONE 'America/Lima','YYYY-MM-DD'),
    'fechaRegistro',to_char(v.fecha_carga AT TIME ZONE 'America/Lima','YYYY-MM-DD'),
    'fechaRevision',CASE WHEN v.fecha_validacion IS NULL THEN NULL
      ELSE to_char(v.fecha_validacion AT TIME ZONE 'America/Lima','YYYY-MM-DD') END,
    'estadoVoucher',ev.codigo,'estadoPago',ep.codigo,
    'montoAplicado',coalesce((
      SELECT sum(a.monto_aplicado)
      FROM public.pag_aplicaciones_pago a
      WHERE a.id_pago=p.id_pago AND a.id_plan_pago=p.id_plan_pago
        AND a.activo AND ep.codigo='CONFIRMADO'
    ),0),
    'numeroOperacion',p.numero_operacion,
    'nombreArchivo',v.nombre_archivo_original,
    'motivoRechazo',CASE WHEN ev.codigo='RECHAZADO' THEN v.motivo_rechazo ELSE NULL END
  ) ORDER BY v.fecha_carga DESC,v.id_voucher DESC),'[]'::jsonb)
  INTO v_comprobantes
  FROM cargas c
  JOIN autorizadas propia ON propia.id_venta=c.id_venta
  JOIN public.pag_vouchers v ON v.id_voucher=c.id_voucher
    AND v.id_pago=c.id_pago AND v.activo
  JOIN public.pag_pagos p ON p.id_pago=c.id_pago
    AND p.id_venta=c.id_venta AND p.id_reserva IS NULL
  JOIN public.ven_ventas venta ON venta.id_venta=p.id_venta
  JOIN public.cfg_estados_voucher ev ON ev.id_estado_voucher=v.id_estado_voucher
  JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago
  JOIN public.cfg_metodos_pago mp ON mp.id_metodo_pago=p.id_metodo_pago
  LEFT JOIN public.pag_cuotas q ON q.id_cuota=c.id_cuota
    AND q.id_plan_pago=p.id_plan_pago;

  RETURN jsonb_build_object(
    'operaciones',v_operaciones,'metodos',v_metodos,
    'comprobantes',v_comprobantes,'total',jsonb_array_length(v_comprobantes),
    'moneda','PEN',
    'advertencia','Registrar un voucher no acredita ni descuenta una cuota. Finanzas revisa el archivo y solo las aplicaciones confirmadas reducen el saldo.'
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.sp_portal_cliente_preparar_voucher_v1(
  p_actor bigint,p_venta bigint,p_destino varchar,p_cuota bigint,
  p_monto numeric,p_metodo integer,p_fecha date,p_numero varchar,
  p_nombre varchar,p_mime varchar,p_bytes bigint
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE
  v_resumen jsonb;
  v_plan bigint;
  v_lote bigint;
  v_saldo numeric;
  v_carga uuid:=gen_random_uuid();
  v_ext text;
  v_clave text;
  v_numero varchar;
BEGIN
  v_resumen := public.sp_portal_cliente_resumen_v1(p_actor);
  IF p_destino IS NULL OR p_destino NOT IN ('CUOTA','INICIAL')
    OR p_venta IS NULL OR p_venta<=0
    OR (p_destino='CUOTA' AND (p_cuota IS NULL OR p_cuota<=0))
    OR (p_destino='INICIAL' AND p_cuota IS NOT NULL)
    OR p_monto IS NULL OR p_monto<=0 OR p_monto<>round(p_monto,2)
    OR p_metodo IS NULL OR p_metodo<=0
    OR p_fecha IS NULL
    OR p_fecha>(now() AT TIME ZONE 'America/Lima')::date
    OR p_fecha<(now() AT TIME ZONE 'America/Lima')::date-365
    OR p_mime IS NULL OR p_mime NOT IN ('application/pdf','image/jpeg','image/png','image/webp')
    OR p_bytes IS NULL OR p_bytes NOT BETWEEN 1 AND 5242880
    OR p_nombre IS NULL OR length(btrim(p_nombre)) NOT BETWEEN 1 AND 180
    OR p_nombre ~ '[[:cntrl:]/]' OR strpos(p_nombre,chr(92))>0
    OR length(coalesce(p_numero,''))>100
  THEN RAISE EXCEPTION 'PORTAL_DATOS_INVALIDOS|Revise el pago y el comprobante.'; END IF;
  IF (p_mime='application/pdf' AND lower(p_nombre) !~ '\.pdf$')
    OR (p_mime='image/jpeg' AND lower(p_nombre) !~ '\.(jpg|jpeg)$')
    OR (p_mime='image/png' AND lower(p_nombre) !~ '\.png$')
    OR (p_mime='image/webp' AND lower(p_nombre) !~ '\.webp$')
  THEN RAISE EXCEPTION 'PORTAL_DATOS_INVALIDOS|Extensión y tipo MIME distintos.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.cfg_metodos_pago
      WHERE id_metodo_pago=p_metodo AND activo)
  THEN RAISE EXCEPTION 'PORTAL_DATOS_INVALIDOS|Medio de pago no disponible.'; END IF;

  -- El usuario puede proporcionar un identificador de su propia venta/cuota,
  -- pero nunca utilizar el de otro comprador; el plan viene del resumen SQL.
  SELECT (o.value->'financiamiento'->>'idPlanPago')::bigint
  INTO v_plan
  FROM jsonb_array_elements(v_resumen->'operaciones') o(value)
  WHERE (o.value->>'id_venta')::bigint=p_venta LIMIT 1;
  IF v_plan IS NULL THEN
    RAISE EXCEPTION 'PORTAL_VENTA_NO_AUTORIZADA|La compra no admite esta carga.'; END IF;
  SELECT venta.id_lote INTO v_lote
  FROM public.pag_planes_pago pp
  JOIN public.cfg_estados_plan_pago estado ON estado.id_estado_plan_pago=pp.id_estado_plan_pago
    AND estado.codigo='ACTIVO'
  JOIN public.ven_ventas venta ON venta.id_venta=pp.id_venta
  WHERE pp.id_plan_pago=v_plan AND pp.id_venta=p_venta AND pp.es_vigente
    AND EXISTS(SELECT 1 FROM public.ven_contratos ct
      JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=ct.id_estado_contrato
      WHERE ct.id_venta=p_venta AND ec.codigo='VIGENTE' AND ct.fecha_firma IS NOT NULL);
  IF v_lote IS NULL THEN
    RAISE EXCEPTION 'PORTAL_PLAN_NO_AUTORIZADO|Contrato o plan no vigente.'; END IF;

  IF p_destino='CUOTA' THEN
    IF NOT EXISTS(SELECT 1 FROM public.pag_cuotas c
      JOIN public.cfg_estados_cuota ec ON ec.id_estado_cuota=c.id_estado_cuota
      WHERE c.id_cuota=p_cuota AND c.id_plan_pago=v_plan AND ec.codigo<>'ANULADA')
    THEN RAISE EXCEPTION 'PORTAL_CUOTA_NO_AUTORIZADA|La cuota no pertenece al plan.'; END IF;
    v_saldo:=public.fn_fin_saldo_cuota_confirmado_v1(p_cuota);
  ELSE
    SELECT greatest(0,pp.monto_inicial-coalesce((
      SELECT sum(a.monto_aplicado)
      FROM public.pag_aplicaciones_pago a
      JOIN public.cfg_tipos_aplicacion_pago ta
        ON ta.id_tipo_aplicacion_pago=a.id_tipo_aplicacion_pago AND ta.codigo='INICIAL'
      JOIN public.pag_pagos pago ON pago.id_pago=a.id_pago AND pago.id_plan_pago=pp.id_plan_pago
      JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=pago.id_estado_pago
        AND ep.codigo='CONFIRMADO'
      WHERE a.id_plan_pago=pp.id_plan_pago AND a.id_cuota IS NULL AND a.activo
    ),0))
    INTO v_saldo FROM public.pag_planes_pago pp WHERE pp.id_plan_pago=v_plan;
  END IF;
  IF v_saldo IS NULL OR v_saldo<=0 OR p_monto>v_saldo
  THEN RAISE EXCEPTION 'PORTAL_MONTO_INVALIDO|El importe excede el saldo pendiente.'; END IF;

  v_numero:=nullif(btrim(p_numero),'');
  v_ext:=CASE p_mime WHEN 'application/pdf' THEN 'pdf'
    WHEN 'image/jpeg' THEN 'jpg' WHEN 'image/png' THEN 'png' ELSE 'webp' END;
  v_clave:='ventas/p-'||p_venta||'/l-'||v_lote||'/'||v_carga::text||'.'||v_ext;
  IF p_destino='CUOTA' THEN
    INSERT INTO public.pag_cargas_voucher_cuota(
      id_carga,id_actor,id_venta,id_plan_pago,id_cuota,monto,id_metodo_pago,
      fecha_operacion,numero_operacion,nombre_archivo,tipo_mime,tamanio_bytes,
      clave_archivo,expira_en
    ) VALUES(
      v_carga,p_actor,p_venta,v_plan,p_cuota,p_monto,p_metodo,
      p_fecha,v_numero,btrim(p_nombre),p_mime,p_bytes,
      v_clave,now()+interval '30 minutes');
  ELSE
    INSERT INTO public.pag_cargas_voucher_inicial_v1(
      id_carga,id_actor,id_venta,id_plan_pago,monto,id_metodo_pago,
      fecha_operacion,numero_operacion,nombre_archivo,tipo_mime,tamanio_bytes,
      clave_archivo,expira_en
    ) VALUES(
      v_carga,p_actor,p_venta,v_plan,p_monto,p_metodo,
      p_fecha,v_numero,btrim(p_nombre),p_mime,p_bytes,
      v_clave,now()+interval '30 minutes');
  END IF;
  RETURN jsonb_build_object(
    'idCarga',v_carga,'bucket','vouchers-ventas-private',
    'claveArchivo',v_clave,'tipoMime',p_mime,
    'maxBytes',5242880,'expiresInSeconds',1800,
    'destino',p_destino,'saldoDestino',v_saldo);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.sp_portal_cliente_registrar_voucher_v1(
 p_actor bigint,p_id_carga uuid,p_destino varchar
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE
  v_resumen jsonb;
  r record;
  v_moneda integer;
  v_saldo numeric;
  v_estado_pago integer;
  v_estado_voucher integer;
  v_pago bigint;
  v_voucher bigint;
  v_estado_actual text;
  v_pago_actual text;
BEGIN
  v_resumen:=public.sp_portal_cliente_resumen_v1(p_actor);
  IF p_id_carga IS NULL OR p_destino IS NULL OR p_destino NOT IN ('CUOTA','INICIAL')
  THEN RAISE EXCEPTION 'PORTAL_DATOS_INVALIDOS|Referencia de carga inválida.'; END IF;

  -- Mismo orden de bloqueo que revisiones de Finanzas: CUOTA/PLAN -> CARGA.
  IF p_destino='CUOTA' THEN
    PERFORM 1 FROM public.pag_cuotas
      WHERE id_cuota=(SELECT id_cuota FROM public.pag_cargas_voucher_cuota
                      WHERE id_carga=p_id_carga) FOR UPDATE;
    SELECT id_carga,id_actor,id_venta,id_plan_pago,id_cuota,monto,
      id_metodo_pago,fecha_operacion,numero_operacion,nombre_archivo,
      tipo_mime,tamanio_bytes,clave_archivo,expira_en,id_pago,id_voucher
    INTO r FROM public.pag_cargas_voucher_cuota
    WHERE id_carga=p_id_carga FOR UPDATE;
  ELSE
    PERFORM 1 FROM public.pag_planes_pago
      WHERE id_plan_pago=(SELECT id_plan_pago FROM public.pag_cargas_voucher_inicial_v1
                          WHERE id_carga=p_id_carga) FOR UPDATE;
    SELECT id_carga,id_actor,id_venta,id_plan_pago,NULL::bigint AS id_cuota,monto,
      id_metodo_pago,fecha_operacion,numero_operacion,nombre_archivo,
      tipo_mime,tamanio_bytes,clave_archivo,expira_en,id_pago,id_voucher
    INTO r FROM public.pag_cargas_voucher_inicial_v1
    WHERE id_carga=p_id_carga FOR UPDATE;
  END IF;
  IF NOT FOUND OR r.id_actor<>p_actor OR NOT EXISTS(
    SELECT 1 FROM jsonb_array_elements(v_resumen->'operaciones') o(value)
    WHERE (o.value->>'id_venta')::bigint=r.id_venta
  ) THEN
    RAISE EXCEPTION 'PORTAL_CARGA_NO_AUTORIZADA|Carga no autorizada.'; END IF;

  IF r.id_pago IS NOT NULL THEN
    SELECT ep.codigo,ev.codigo INTO v_pago_actual,v_estado_actual
    FROM public.pag_pagos p
    JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago
    JOIN public.pag_vouchers v ON v.id_voucher=r.id_voucher AND v.id_pago=p.id_pago
    JOIN public.cfg_estados_voucher ev ON ev.id_estado_voucher=v.id_estado_voucher
    WHERE p.id_pago=r.id_pago;
    RETURN jsonb_build_object(
      'idPago',r.id_pago,'idVoucher',r.id_voucher,
      'destino',p_destino,'estadoPago',v_pago_actual,
      'estadoVoucher',v_estado_actual,'saldoAplicado',0,'reutilizado',true);
  END IF;
  IF r.expira_en<now() THEN
    RAISE EXCEPTION 'PORTAL_CARGA_EXPIRADA|Vuelva a seleccionar el archivo.'; END IF;
  IF r.clave_archivo !~
      '^ventas/p-[0-9]+/l-[0-9]+/[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}\.(pdf|jpg|png|webp)$'
    OR NOT EXISTS(
      SELECT 1 FROM storage.objects o
      WHERE o.bucket_id='vouchers-ventas-private'
        AND o.name=r.clave_archivo
        AND o.archived_at IS NULL AND o.is_delete_marker=false
        AND lower(coalesce(o.metadata->>'mimetype',''))=r.tipo_mime
        AND coalesce((o.metadata->>'size')::bigint,0)=r.tamanio_bytes
        AND r.tamanio_bytes BETWEEN 1 AND 5242880)
  THEN RAISE EXCEPTION 'PORTAL_ARCHIVO_NO_EXISTE|Archivo pendiente de carga o no coincide.'; END IF;

  SELECT pp.id_moneda INTO v_moneda
  FROM public.pag_planes_pago pp
  JOIN public.cfg_estados_plan_pago ep ON ep.id_estado_plan_pago=pp.id_estado_plan_pago
     AND ep.codigo='ACTIVO'
  WHERE pp.id_plan_pago=r.id_plan_pago AND pp.id_venta=r.id_venta AND pp.es_vigente
    AND EXISTS(SELECT 1 FROM public.ven_contratos ct
      JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=ct.id_estado_contrato
      WHERE ct.id_venta=r.id_venta AND ec.codigo='VIGENTE' AND ct.fecha_firma IS NOT NULL);
  IF v_moneda IS NULL THEN
    RAISE EXCEPTION 'PORTAL_PLAN_NO_AUTORIZADO|El plan dejó de estar activo.'; END IF;
  IF p_destino='CUOTA' THEN
    IF NOT EXISTS(SELECT 1 FROM public.pag_cuotas c
        JOIN public.cfg_estados_cuota ec ON ec.id_estado_cuota=c.id_estado_cuota
        WHERE c.id_cuota=r.id_cuota AND c.id_plan_pago=r.id_plan_pago
          AND ec.codigo<>'ANULADA')
    THEN RAISE EXCEPTION 'PORTAL_CUOTA_NO_AUTORIZADA|Cuota ya no disponible.'; END IF;
    v_saldo:=public.fn_fin_saldo_cuota_confirmado_v1(r.id_cuota);
  ELSE
    SELECT greatest(0,pp.monto_inicial-coalesce((
      SELECT sum(a.monto_aplicado) FROM public.pag_aplicaciones_pago a
      JOIN public.cfg_tipos_aplicacion_pago ta
        ON ta.id_tipo_aplicacion_pago=a.id_tipo_aplicacion_pago AND ta.codigo='INICIAL'
      JOIN public.pag_pagos p ON p.id_pago=a.id_pago AND p.id_plan_pago=pp.id_plan_pago
      JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago AND ep.codigo='CONFIRMADO'
      WHERE a.id_plan_pago=pp.id_plan_pago AND a.id_cuota IS NULL AND a.activo
    ),0))
    INTO v_saldo FROM public.pag_planes_pago pp WHERE pp.id_plan_pago=r.id_plan_pago;
  END IF;
  IF v_saldo IS NULL OR r.monto>v_saldo OR v_saldo<=0 THEN
    RAISE EXCEPTION 'PORTAL_MONTO_INVALIDO|El importe ya no corresponde al saldo.'; END IF;
  IF r.numero_operacion IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(
      'CUOTA:'||r.id_venta||':'||r.id_metodo_pago||':'||lower(r.numero_operacion),0));
    IF EXISTS (
      SELECT 1 FROM public.pag_pagos p
      JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago
      WHERE p.id_venta=r.id_venta AND p.id_metodo_pago=r.id_metodo_pago
        AND lower(btrim(p.numero_operacion))=lower(r.numero_operacion)
        AND ep.codigo<>'ANULADO'
    ) THEN RAISE EXCEPTION 'PORTAL_PAGO_DUPLICADO|Número de operación ya registrado.'; END IF;
  END IF;

  SELECT id_estado_pago INTO STRICT v_estado_pago
    FROM public.cfg_estados_pago WHERE codigo='REGISTRADO' AND activo;
  SELECT id_estado_voucher INTO STRICT v_estado_voucher
    FROM public.cfg_estados_voucher WHERE codigo='PENDIENTE' AND activo;

  INSERT INTO public.pag_pagos(
    id_reserva,id_venta,id_plan_pago,id_estado_pago,id_metodo_pago,id_moneda,
    codigo,monto,fecha_operacion,numero_operacion,observaciones,id_usuario_registro
  ) VALUES(
    NULL,r.id_venta,r.id_plan_pago,v_estado_pago,r.id_metodo_pago,v_moneda,
    CASE WHEN p_destino='CUOTA' THEN 'PAG-CUO-' ELSE 'PAG-INI-' END
       ||replace(r.id_carga::text,'-',''),
    r.monto,(r.fecha_operacion+time '12:00') AT TIME ZONE 'America/Lima',
    r.numero_operacion,
    CASE WHEN p_destino='CUOTA' THEN 'Voucher pendiente para cuota '||r.id_cuota
      ELSE 'Voucher pendiente para inicial adicional' END,
    p_actor
  ) RETURNING id_pago INTO v_pago;

  INSERT INTO public.pag_vouchers(
    id_pago,id_estado_voucher,codigo,numero_version,nombre_archivo_original,
    clave_archivo,tipo_mime,tamanio_bytes,fecha_carga,id_usuario_carga,activo
  ) VALUES(
    v_pago,v_estado_voucher,
    (CASE WHEN p_destino='CUOTA' THEN 'VOU-CUO-' ELSE 'VOU-INI-' END)
      ||replace(r.id_carga::text,'-',''),
    1,r.nombre_archivo,r.clave_archivo,r.tipo_mime,r.tamanio_bytes,
    now(),p_actor,true
  ) RETURNING id_voucher INTO v_voucher;

  IF p_destino='CUOTA' THEN
    UPDATE public.pag_cargas_voucher_cuota
      SET id_pago=v_pago,id_voucher=v_voucher WHERE id_carga=p_id_carga;
  ELSE
    UPDATE public.pag_cargas_voucher_inicial_v1
      SET id_pago=v_pago,id_voucher=v_voucher WHERE id_carga=p_id_carga;
  END IF;

  RETURN jsonb_build_object(
    'idPago',v_pago,'idVoucher',v_voucher,
    'destino',p_destino,'estadoPago','REGISTRADO',
    'estadoVoucher','PENDIENTE','saldoAplicado',0,'reutilizado',false);
END;
$fn$;

-- El usuario web no puede llamar funciones privilegiadas ni tablas de carga.
REVOKE ALL ON FUNCTION public.sp_portal_cliente_vouchers_v1(bigint)
  FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.sp_portal_cliente_preparar_voucher_v1(
  bigint,bigint,varchar,bigint,numeric,integer,date,varchar,varchar,varchar,bigint)
  FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.sp_portal_cliente_registrar_voucher_v1(bigint,uuid,varchar)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_portal_cliente_vouchers_v1(bigint) TO sigi_app_user;
GRANT EXECUTE ON FUNCTION public.sp_portal_cliente_preparar_voucher_v1(
  bigint,bigint,varchar,bigint,numeric,integer,date,varchar,varchar,varchar,bigint)
  TO sigi_app_user;
GRANT EXECUTE ON FUNCTION public.sp_portal_cliente_registrar_voucher_v1(bigint,uuid,varchar)
  TO sigi_app_user;
