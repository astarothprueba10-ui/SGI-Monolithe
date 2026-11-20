-- SGI MONOLITHE | BLOQUE 2.3
-- Política versionada para NUEVAS separaciones, ventas pendientes y firma.
-- No se modifican ventas ni cronogramas históricos. TOTP todavía bloquea nuevas publicaciones.
BEGIN;

-- sp_crm_registrar_separacion_v2
CREATE OR REPLACE FUNCTION public.sp_crm_registrar_separacion_v2(p_actor bigint, p_prospecto bigint, p_lote bigint, p_metodo_pago character varying, p_numero_operacion character varying, p_monto numeric, p_observaciones text, p_clave_archivo character varying, p_nombre_archivo character varying, p_tipo_mime character varying, p_tamanio_bytes bigint, p_hash_sha256 character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_contexto jsonb;
    v_persona bigint;
    v_moneda integer;
    v_estado_lote_anterior integer;
    v_estado_lote_reservado integer;
    v_estado_reserva integer;
    v_estado_pago integer;
    v_estado_voucher integer;
    v_metodo integer;
    v_exige_numero boolean;
    v_reserva bigint;
    v_pago bigint;
    v_voucher bigint;
    v_codigo_reserva varchar;
    v_codigo_pago varchar;
    v_codigo_voucher varchar;
    v_fecha timestamptz;
    v_vencimiento timestamptz;
    v_size bigint;
    v_mime text;
    v_extension text;
    v_monto_politica numeric(14,2);
    v_dias_politica integer;
BEGIN
    IF p_observaciones IS NOT NULL AND length(p_observaciones) > 500 THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|Observaciones demasiado extensas.';
    END IF;
    IF p_metodo_pago IS NULL OR p_metodo_pago NOT IN
        ('EFECTIVO','DEPOSITO','TRANSFERENCIA','YAPE_PLIN','OTRO') THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|Metodo de pago no valido.';
    END IF;
    IF p_numero_operacion IS NOT NULL AND length(p_numero_operacion)>100 THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|Numero de operacion demasiado extenso.';
    END IF;
    IF p_nombre_archivo IS NULL OR btrim(p_nombre_archivo)=''
       OR length(p_nombre_archivo)>255 OR p_nombre_archivo ~ '[[:cntrl:]]' THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|Nombre de comprobante invalido.';
    END IF;
    IF p_tipo_mime IS NULL OR p_tipo_mime NOT IN
        ('application/pdf','image/jpeg','image/png','image/webp') THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|Formato de comprobante no permitido.';
    END IF;
    IF p_tamanio_bytes IS NULL OR p_tamanio_bytes < 1 OR p_tamanio_bytes>5242880 THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|El comprobante excede el tamano maximo de 5MB.';
    END IF;
    IF p_hash_sha256 IS NOT NULL AND p_hash_sha256 !~ '^[0-9A-Fa-f]{64}$' THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|Hash SHA256 invalido.';
    END IF;

    SELECT id_metodo_pago, requiere_numero_operacion INTO v_metodo, v_exige_numero
      FROM public.cfg_metodos_pago
     WHERE codigo=p_metodo_pago AND activo=true;
    IF v_metodo IS NULL THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|Metodo de pago no habilitado.';
    END IF;
    IF v_exige_numero AND nullif(btrim(p_numero_operacion), '') IS NULL THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|Este metodo de pago requiere numero de operacion.';
    END IF;

    v_extension := CASE p_tipo_mime
        WHEN 'application/pdf' THEN 'pdf'
        WHEN 'image/jpeg' THEN 'jpg'
        WHEN 'image/png' THEN 'png'
        WHEN 'image/webp' THEN 'webp'
    END;
    IF p_clave_archivo IS NULL OR length(p_clave_archivo)>500
       OR p_clave_archivo !~ (
         '^separaciones/p-'||p_prospecto||'/l-'||p_lote||
         '/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.'||v_extension||'$'
       ) THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|La ruta del comprobante es invalida.';
    END IF;

    -- Bloqueo primero del lote, para impedir dobles separaciones concurrentes.
    SELECT l.id_estado_lote INTO v_estado_lote_anterior
      FROM public.inm_lotes l WHERE l.id_lote=p_lote FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'LOTE_NO_DISPONIBLE|El lote no existe.';
    END IF;

    -- Orden de bloqueo: lote y luego política activa para evitar deadlocks.
    SELECT p.monto_separacion,p.dias_vencimiento_separacion
      INTO STRICT v_monto_politica,v_dias_politica
      FROM public.cfg_fin_politica_activa a
      JOIN public.cfg_fin_politicas_versiones p ON p.id_politica=a.id_politica
     WHERE a.id=1 AND a.codigo='GENERAL' FOR SHARE OF a;
    IF p_monto IS DISTINCT FROM v_monto_politica THEN
       RAISE EXCEPTION 'SEPARACION_MONTO_INVALIDO|El importe no coincide con la política vigente.';
    END IF;
    v_contexto := public.sp_crm_validar_preparacion_comprobante_v1(
        p_actor, p_prospecto, p_lote
    );
    v_persona := (v_contexto->>'id_persona')::bigint;

    -- Verificar archivo realmente subido al bucket PRIVADO, sus metadatos y que no fue reutilizado.
    SELECT (o.metadata->>'size')::bigint, lower(o.metadata->>'mimetype')
      INTO v_size, v_mime
      FROM storage.objects o
     WHERE o.bucket_id='vouchers-separacion-private'
       AND o.name=p_clave_archivo
       AND o.archived_at IS NULL
       AND o.is_delete_marker=false
       AND jsonb_typeof(o.metadata->'size')='number'
       AND (o.metadata->>'size') ~ '^[0-9]+$';
    IF v_size IS NULL OR v_size<>p_tamanio_bytes
       OR v_mime IS DISTINCT FROM lower(p_tipo_mime) THEN
        RAISE EXCEPTION 'ARCHIVO_NO_EXISTE|El comprobante no existe en Storage o los metadatos no coinciden.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.pag_vouchers WHERE clave_archivo=p_clave_archivo) THEN
        RAISE EXCEPTION 'ARCHIVO_DUPLICADO|Este comprobante ya esta registrado.';
    END IF;

    SELECT id_moneda INTO STRICT v_moneda
      FROM public.cfg_monedas WHERE codigo='PEN' AND activo=true;
    SELECT id_estado_lote INTO STRICT v_estado_lote_reservado
      FROM public.cfg_estados_lote WHERE codigo='RESERVADO' AND activo=true;
    SELECT id_estado_reserva INTO STRICT v_estado_reserva
      FROM public.cfg_estados_reserva WHERE codigo='PENDIENTE' AND activo=true;
    SELECT id_estado_pago INTO STRICT v_estado_pago
      FROM public.cfg_estados_pago WHERE codigo='REGISTRADO' AND activo=true;
    SELECT id_estado_voucher INTO STRICT v_estado_voucher
      FROM public.cfg_estados_voucher WHERE codigo='PENDIENTE' AND activo=true;

    v_fecha := now();
    v_vencimiento := v_fecha + make_interval(days=>v_dias_politica);
    v_reserva := nextval(pg_get_serial_sequence('public.ven_reservas','id_reserva'));
    v_codigo_reserva := 'RES-'||p_lote||'-'||v_reserva;
    INSERT INTO public.ven_reservas (
        id_reserva,id_lote,id_persona,id_estado_reserva,id_moneda,codigo,
        fecha_reserva,fecha_vencimiento,monto_reserva,observaciones,id_usuario_registro
    ) OVERRIDING SYSTEM VALUE VALUES (
        v_reserva,p_lote,v_persona,v_estado_reserva,v_moneda,v_codigo_reserva,
        v_fecha,v_vencimiento,p_monto,nullif(btrim(p_observaciones),''),p_actor
    );

    v_pago := nextval(pg_get_serial_sequence('public.pag_pagos','id_pago'));
    v_codigo_pago := 'PAG-SEP-'||v_pago;
    INSERT INTO public.pag_pagos (
        id_pago,id_reserva,id_estado_pago,id_metodo_pago,id_moneda,codigo,
        monto,fecha_operacion,numero_operacion,observaciones,id_usuario_registro
    ) OVERRIDING SYSTEM VALUE VALUES (
        v_pago,v_reserva,v_estado_pago,v_metodo,v_moneda,v_codigo_pago,
        p_monto,v_fecha,nullif(btrim(p_numero_operacion),''),
        nullif(btrim(p_observaciones),''),p_actor
    );

    v_voucher := nextval(pg_get_serial_sequence('public.pag_vouchers','id_voucher'));
    v_codigo_voucher := 'VOU-SEP-'||v_voucher;
    INSERT INTO public.pag_vouchers (
        id_voucher,id_pago,id_estado_voucher,codigo,numero_version,
        nombre_archivo_original,clave_archivo,tipo_mime,tamanio_bytes,hash_sha256,
        fecha_carga,id_usuario_carga,activo
    ) OVERRIDING SYSTEM VALUE VALUES (
        v_voucher,v_pago,v_estado_voucher,v_codigo_voucher,1,
        btrim(p_nombre_archivo),p_clave_archivo,p_tipo_mime,p_tamanio_bytes,p_hash_sha256,
        v_fecha,p_actor,true
    );

    UPDATE public.inm_lotes
       SET id_estado_lote=v_estado_lote_reservado,fecha_actualizacion=now()
     WHERE id_lote=p_lote;
    INSERT INTO public.inm_lotes_historial_estado (
        id_lote,id_estado_anterior,id_estado_nuevo,motivo,fecha_cambio,id_usuario
    ) VALUES (
        p_lote,v_estado_lote_anterior,v_estado_lote_reservado,
        'Separacion pendiente de verificacion '||v_codigo_reserva,now(),p_actor
    );

    RETURN jsonb_build_object(
        'success',true,'id_reserva',v_reserva,'codigo_reserva',v_codigo_reserva,
        'id_pago',v_pago,'codigo_pago',v_codigo_pago,
        'id_voucher',v_voucher,'codigo_voucher',v_codigo_voucher,
        'id_lote',p_lote,'monto_reserva',p_monto,'fecha_reserva',v_fecha,
        'fecha_vencimiento',v_vencimiento,'estado_lote','RESERVADO',
        'estado_pago','REGISTRADO','estado_voucher','PENDIENTE',
        'message','Separacion registrada, pago pendiente de validacion por Finanzas.'
    );
END;
$function$;

-- fn_crm_reserva_acreditable_v1
CREATE OR REPLACE FUNCTION public.fn_crm_reserva_acreditable_v1(p_reserva bigint)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
 SELECT COALESCE((
   SELECT CASE WHEN r.monto_reserva=coalesce((r.politica_financiera_snapshot->>'montoSeparacion')::numeric,500.00)
      AND er.codigo='VIGENTE' AND r.fecha_vencimiento>now()
      AND (
        SELECT count(*) FROM public.pag_pagos pg
        JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=pg.id_estado_pago
        WHERE pg.id_reserva=r.id_reserva AND ep.codigo<>'ANULADO'
      )=1
      AND EXISTS(
        SELECT 1 FROM public.pag_pagos pg
        JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=pg.id_estado_pago
        WHERE pg.id_reserva=r.id_reserva AND ep.codigo='CONFIRMADO'
          AND pg.monto=r.monto_reserva AND pg.id_moneda=r.id_moneda
          AND pg.id_venta IS NULL AND pg.id_plan_pago IS NULL
          AND EXISTS(
            SELECT 1 FROM public.pag_vouchers vo
            JOIN public.cfg_estados_voucher ev ON ev.id_estado_voucher=vo.id_estado_voucher
            WHERE vo.id_pago=pg.id_pago AND vo.activo AND ev.codigo='APROBADO'
          )
          AND NOT EXISTS(
            SELECT 1 FROM public.pag_vouchers vo
            JOIN public.cfg_estados_voucher ev ON ev.id_estado_voucher=vo.id_estado_voucher
            WHERE vo.id_pago=pg.id_pago AND vo.activo AND ev.codigo<>'APROBADO'
          )
          AND NOT EXISTS(
            SELECT 1 FROM public.pag_aplicaciones_pago ap
            JOIN public.cfg_tipos_aplicacion_pago tp ON tp.id_tipo_aplicacion_pago=ap.id_tipo_aplicacion_pago
            WHERE ap.id_pago=pg.id_pago AND ap.activo
              AND (tp.codigo<>'SEPARACION' OR ap.id_plan_pago IS NOT NULL OR ap.id_cuota IS NOT NULL)
          )
      )
      THEN r.monto_reserva ELSE 0::numeric END
   FROM public.ven_reservas r
   JOIN public.cfg_estados_reserva er ON er.id_estado_reserva=r.id_estado_reserva
   WHERE r.id_reserva=p_reserva
 ),0::numeric);
$function$;

-- sp_crm_validar_formalizacion_v10
CREATE OR REPLACE FUNCTION public.sp_crm_validar_formalizacion_v10(p_actor bigint, p_prospecto bigint, p_lote bigint, p_modalidad character varying, p_monto_total numeric, p_monto_inicial numeric, p_numero_cuotas integer, p_tasa_mensual_pct numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
 v_ctx jsonb;
 v_id_reserva bigint;
 v_reserva_nominal numeric:=0;
 v_reserva_acreditable numeric:=0;
 v_plan jsonb;
 v_politica jsonb;
BEGIN
 IF p_tasa_mensual_pct IS NOT NULL THEN
   RAISE EXCEPTION 'TASA_FIJA|El servidor selecciona la tasa nominal anual desde la política contractual.';
 END IF;
 v_ctx:=public.sp_crm_validar_formalizacion_v6(
   p_actor,p_prospecto,p_lote,p_modalidad,p_monto_total,
   p_monto_inicial,p_numero_cuotas);
 v_politica:=public.fn_fin_politica_para_venta_v1(p_prospecto,p_lote);
 SELECT r.id_reserva,r.monto_reserva
 INTO v_id_reserva,v_reserva_nominal
 FROM public.ven_reservas r
 JOIN public.cfg_estados_reserva er ON er.id_estado_reserva=r.id_estado_reserva
 WHERE r.id_persona=(v_ctx->>'idPersona')::bigint
   AND r.id_lote=p_lote AND er.codigo='VIGENTE'
   AND r.fecha_vencimiento>now()
 ORDER BY r.fecha_reserva DESC,r.id_reserva DESC LIMIT 1;
 v_reserva_nominal:=coalesce(v_reserva_nominal,0);
 IF v_id_reserva IS NOT NULL THEN
   v_reserva_acreditable:=public.fn_crm_reserva_acreditable_v1(v_id_reserva);
   -- No registrar la venta con un saldo y luego acreditar una separacion
   -- todavia no confirmada; eso generaria un doble descuento al firmar.
   IF v_reserva_acreditable<>v_reserva_nominal THEN
      RAISE EXCEPTION 'RESERVA_PENDIENTE|Finanzas debe confirmar el pago y aprobar su comprobante antes de formalizar esta reserva.';
   END IF;
 END IF;
 IF p_modalidad='FINANCIADA' THEN
   IF p_monto_inicial IS NULL
       OR p_monto_inicial>=p_monto_total
       OR v_reserva_acreditable>p_monto_inicial THEN
      RAISE EXCEPTION 'INICIAL_INVALIDA|La inicial debe cumplir la política y dejar capital financiable.';
   END IF;
   v_plan:=public.fn_fin_simular_frances_politica_v1(
     p_monto_total,v_reserva_acreditable,p_monto_inicial,
     p_numero_cuotas,(v_politica->>'idPolitica')::bigint);
 END IF;
 RETURN v_ctx||jsonb_build_object(
   'idPolitica',(v_politica->>'idPolitica')::bigint,
   'politicaVersion',(v_politica->>'version')::integer,
   'politicaFinanciera',v_politica,
   'idReservaAplicable',CASE WHEN v_reserva_acreditable>0 THEN v_id_reserva ELSE NULL END,
   'montoReservaNominal',v_reserva_nominal,
   'montoReservaAplicable',v_reserva_acreditable,
   'montoInicialTotal',CASE WHEN p_modalidad='FINANCIADA' THEN p_monto_inicial ELSE NULL END,
   'montoInicialAdicional',CASE WHEN p_modalidad='FINANCIADA' THEN p_monto_inicial-v_reserva_acreditable ELSE NULL END,
   'saldoContado',p_monto_total-v_reserva_acreditable,
   'planFrances',v_plan);
END $function$;

-- sp_crm_registrar_venta_pendiente_v10
CREATE OR REPLACE FUNCTION public.sp_crm_registrar_venta_pendiente_v10(p_actor bigint, p_prospecto bigint, p_lote bigint, p_modalidad character varying, p_monto_total numeric, p_monto_inicial numeric, p_numero_cuotas integer, p_tasa_mensual_pct numeric, p_observaciones text DEFAULT NULL::text)
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
 -- Orden de bloqueo lote -> política activa; compatible con el registro de separaciones.
 PERFORM 1 FROM public.inm_lotes WHERE id_lote=p_lote FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'LOTE_NO_DISPONIBLE|Lote inexistente.'; END IF;
 PERFORM 1 FROM public.cfg_fin_politica_activa WHERE id=1 FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'POLITICA_NO_DISPONIBLE|No hay configuración financiera.'; END IF;
 -- La validación v7 aplica el alcance comercial, precio y titular de reserva.
 v_ctx:=public.sp_crm_validar_formalizacion_v10(
   p_actor,p_prospecto,p_lote,p_modalidad,p_monto_total,
   p_monto_inicial,p_numero_cuotas,p_tasa_mensual_pct);
 v_reserva:=(v_ctx->>'montoReservaAplicable')::numeric;
 v_plan:=v_ctx->'planFrances';

 -- La versión estable v6 registra venta y contrato pendiente de firma.
 v_resultado:=public.sp_crm_registrar_venta_pendiente_v6(
   p_actor,p_prospecto,p_lote,p_modalidad,p_monto_total,
   (v_ctx->>'montoInicialAdicional')::numeric,p_numero_cuotas,p_observaciones);

 SELECT coalesce(r.monto_reserva,0) INTO STRICT v_reserva_tras_registro
     FROM public.ven_ventas venta
     LEFT JOIN public.ven_reservas r ON r.id_reserva=venta.id_reserva
     WHERE venta.id_venta=(v_resultado->>'idVenta')::bigint;
   IF v_reserva_tras_registro<>(v_ctx->>'montoReservaNominal')::numeric THEN
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
       tasa_interes_pct=round((v_ctx->'politicaFinanciera'->>'tasaNominalAnualPct')::numeric/12,6),
       monto_interes_total=(v_plan->>'interesTotal')::numeric,
       monto_total_financiado=(v_plan->>'totalCuotas')::numeric,
       descripcion_condiciones='FRANCES_POLITICA_V'||(v_ctx->>'politicaVersion')
         ||'|TNA '||(v_ctx->'politicaFinanciera'->>'tasaNominalAnualPct')
         ||'%; condiciones financieras inmovilizadas al registro',
       fecha_actualizacion=now()
   WHERE id_plan_pago=v_id_plan AND id_venta=(v_resultado->>'idVenta')::bigint;
   IF NOT FOUND THEN
      RAISE EXCEPTION 'PLAN_INCONSISTENTE|No fue posible asociar el plan francés.';
   END IF;
 END IF;
 RETURN v_resultado || jsonb_build_object(
   'montoReservaAplicable',v_reserva,'montoInicialTotal',v_ctx->'montoInicialTotal','montoInicialAdicional',v_ctx->'montoInicialAdicional',
   'saldoContado',v_ctx->'saldoContado',
   'idPolitica',v_ctx->'idPolitica','politicaVersion',v_ctx->'politicaVersion',
   'planFrances',v_plan);
END $function$;

-- sp_crm_aprobar_firma_contrato_v8
CREATE OR REPLACE FUNCTION public.sp_crm_aprobar_firma_contrato_v8(p_actor bigint, p_contrato bigint, p_archivo bigint, p_fecha_firma date, p_firma_revisada boolean, p_observaciones character varying)
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
  v_id_politica bigint;
  v_es_politica_versionada boolean;
  v_estado_plan varchar;
  v_num_cuotas integer;
  v_capital numeric;
  v_monto_plan numeric;
  v_inicial numeric;
  v_cuota_base numeric;
  v_tasa_mensual numeric;
  v_tasa_aplicada numeric;
  v_es_frances boolean;
  v_programado jsonb;
  v_fila_programada jsonb;
  v_precio_base numeric;
  v_inicial_adicional numeric;
  v_reserva_base numeric;
  v_frances_v2 boolean;
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
            OR descripcion_condiciones LIKE 'FRANCES_ANUAL_FIJA_10_V2%'
            OR descripcion_condiciones LIKE 'FRANCES_POLITICA_V%'
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


    IF EXISTS(
      SELECT 1 FROM public.pag_planes_pago
      WHERE id_plan_pago=v_plan AND (descripcion_condiciones LIKE 'FRANCES_ANUAL_FIJA_10_V2%'
        OR descripcion_condiciones LIKE 'FRANCES_POLITICA_V%')
    ) THEN
      SELECT monto_venta,monto_inicial,monto_reserva_aplicada,
             id_politica_financiera,descripcion_condiciones LIKE 'FRANCES_POLITICA_V%'
      INTO STRICT v_precio_base,v_inicial_adicional,v_reserva_base,
                  v_id_politica,v_es_politica_versionada
      FROM public.pag_planes_pago WHERE id_plan_pago=v_plan;
      IF v_es_politica_versionada THEN
        IF v_id_politica IS NULL THEN
          RAISE EXCEPTION 'POLITICA_NO_DISPONIBLE|Sin versión contractual congelada.';
        END IF;
        v_programado:=public.fn_fin_simular_frances_politica_v1(
          v_precio_base,v_reserva_base,v_inicial_adicional+v_reserva_base,
          v_num_cuotas,v_id_politica,p_fecha_firma);
      ELSE
        v_programado:=public.fn_crm_generar_cronograma_frances_v2(
          v_precio_base,v_reserva_base,v_inicial_adicional,
          v_num_cuotas,p_fecha_firma);
      END IF;
      IF (v_programado->>'capitalFinanciado')::numeric<>v_capital
         OR (v_programado->>'interesTotal')::numeric<>COALESCE(v_interes_previsto,0)
         OR (v_programado->>'fechaPrimeraCuota')::date<>v_primer_vencimiento
         OR jsonb_array_length(v_programado->'items')<>v_num_cuotas
      THEN
        RAISE EXCEPTION 'PLAN_INCONSISTENTE|Cronograma definitivo distinto al plan firmado.';
      END IF;
      FOR v_i IN 1..v_num_cuotas LOOP
        v_fila_programada:=v_programado->'items'->(v_i-1);
        INSERT INTO public.pag_cuotas(
          id_plan_pago,id_estado_cuota,numero_cuota,
          fecha_vencimiento,monto_capital,monto_interes,
          monto_cuota,observaciones
        ) VALUES(
          v_plan,v_id_estado_cuota_pendiente,v_i,
          (v_fila_programada->>'fechaVencimiento')::date,
          (v_fila_programada->>'capital')::numeric,
          (v_fila_programada->>'interes')::numeric,
          (v_fila_programada->>'cuota')::numeric,
          'Cuota generada por contrato firmado - sistema frances V2'
        );
        v_cuotas_creadas:=v_cuotas_creadas+1;
      END LOOP;
      v_interes_acumulado:=(v_programado->>'interesTotal')::numeric;
      v_saldo_restante:=0;
    ELSE
    v_cuota_base:=trunc(v_capital/v_num_cuotas,2);
    SELECT
      (pp.descripcion_condiciones LIKE 'FRANCES_ANUAL_FIJA_5_V1%'
       OR pp.descripcion_condiciones LIKE 'FRANCES_ANUAL_FIJA_10_V1%'
        OR pp.descripcion_condiciones LIKE 'FRANCES_ANUAL_FIJA_10_V2%'),
      (pp.descripcion_condiciones LIKE 'FRANCES_ANUAL_FIJA_10_V2%'),
      CASE
        WHEN pp.descripcion_condiciones LIKE 'FRANCES_ANUAL_FIJA_10_V1%'
          OR pp.descripcion_condiciones LIKE 'FRANCES_ANUAL_FIJA_10_V2%'
          THEN 10::numeric/12
        WHEN pp.descripcion_condiciones LIKE 'FRANCES_ANUAL_FIJA_5_V1%'
          OR pp.descripcion_condiciones LIKE 'ALEMAN_ANUAL_FIJA_5_V1%'
          THEN 5::numeric/12
        ELSE coalesce(v_tasa_mensual,0)
      END
    INTO v_es_frances,v_frances_v2,v_tasa_aplicada
    FROM public.pag_planes_pago pp WHERE pp.id_plan_pago=v_plan;
    IF v_es_frances THEN
      v_cuota_francesa:=CASE WHEN v_frances_v2 THEN round(v_capital*(10::numeric/1200)*power(1+(10::numeric/1200),v_num_cuotas)/(power(1+(10::numeric/1200),v_num_cuotas)-1),2) ELSE round(
          v_capital*(v_tasa_aplicada/100)*
          power(1+(v_tasa_aplicada/100),v_num_cuotas)/
          (power(1+(v_tasa_aplicada/100),v_num_cuotas)-1),2) END;
    END IF;
    v_saldo_restante:=v_capital;
    v_interes_acumulado:=0;

    FOR v_i IN 1..v_num_cuotas LOOP
      IF v_es_frances THEN
        v_interes_cuota:=CASE WHEN v_frances_v2 THEN round(v_saldo_restante*10/1200,2) ELSE round(v_saldo_restante*v_tasa_aplicada/100,2) END;
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

      v_interes_cuota:=CASE WHEN v_frances_v2 THEN round(v_saldo_restante*10/1200,2) ELSE round(v_saldo_restante*v_tasa_aplicada/100,2) END;
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

    END IF;
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

COMMIT;
