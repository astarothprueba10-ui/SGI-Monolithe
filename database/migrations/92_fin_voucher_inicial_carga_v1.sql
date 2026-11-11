-- SGI-MONOLITHE · Sprint 4 · 5.3.5
-- Completa el origen documental de la inicial adicional (NO separaciones).
-- No genera cuotas ni aplica dinero; requiere un contrato ya firmado.
CREATE TABLE IF NOT EXISTS public.pag_cargas_voucher_inicial_v1 (
 id_carga uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 id_actor bigint NOT NULL REFERENCES public.seg_usuarios(id_usuario),
 id_venta bigint NOT NULL REFERENCES public.ven_ventas(id_venta),
 id_plan_pago bigint NOT NULL REFERENCES public.pag_planes_pago(id_plan_pago),
 monto numeric(14,2) NOT NULL CHECK(monto>0),
 id_metodo_pago integer NOT NULL REFERENCES public.cfg_metodos_pago(id_metodo_pago),
 fecha_operacion date NOT NULL,
 numero_operacion varchar(100),
 nombre_archivo varchar(180) NOT NULL,
 tipo_mime varchar(100) NOT NULL,
 tamanio_bytes bigint NOT NULL CHECK(tamanio_bytes BETWEEN 1 AND 5242880),
 clave_archivo varchar(350) UNIQUE NOT NULL,
 fecha_creacion timestamptz NOT NULL DEFAULT now(),
 expira_en timestamptz NOT NULL,
 id_pago bigint UNIQUE REFERENCES public.pag_pagos(id_pago),
 id_voucher bigint UNIQUE REFERENCES public.pag_vouchers(id_voucher)
);
CREATE INDEX IF NOT EXISTS idx_pag_cargas_inicial_plan_v1
 ON public.pag_cargas_voucher_inicial_v1(id_plan_pago,fecha_creacion DESC);
ALTER TABLE public.pag_cargas_voucher_inicial_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pag_cargas_voucher_inicial_v1
 FROM PUBLIC,anon,authenticated,sigi_app_user;

-- Muestra únicamente iniciales adicionales de planes ACTIVOS y firmados.
-- monto_reserva_aplicada se informa por separado y NO se cobra otra vez.
CREATE OR REPLACE FUNCTION public.sp_fin_opciones_registro_inicial_v1(
 p_actor bigint,p_busqueda varchar DEFAULT NULL,p_limite integer DEFAULT 60
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE v_items jsonb;v_metodos jsonb;
BEGIN
 IF p_actor IS NULL OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(
    p_actor,'finance.create'::varchar),false)
 THEN RAISE EXCEPTION 'DENEGADO|Sin permisos para comprobantes de inicial.'; END IF;
 IF p_limite IS NULL OR p_limite NOT BETWEEN 1 AND 100
    OR length(coalesce(p_busqueda,''))>120
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Filtros inválidos.'; END IF;
 WITH planes AS (
  SELECT pp.id_plan_pago,pp.id_venta,v.codigo AS codigo_venta,
    pp.monto_inicial AS inicial_adicional_pactada,
    pp.monto_reserva_aplicada AS reserva_ya_acreditada,
    coalesce((
      SELECT sum(a.monto_aplicado)
      FROM public.pag_aplicaciones_pago a
      JOIN public.cfg_tipos_aplicacion_pago t
        ON t.id_tipo_aplicacion_pago=a.id_tipo_aplicacion_pago AND t.codigo='INICIAL'
      JOIN public.pag_pagos p ON p.id_pago=a.id_pago
        AND p.id_plan_pago=pp.id_plan_pago AND p.id_venta=pp.id_venta
      JOIN public.cfg_estados_pago e ON e.id_estado_pago=p.id_estado_pago
        AND e.codigo='CONFIRMADO'
      WHERE a.id_plan_pago=pp.id_plan_pago AND a.id_cuota IS NULL AND a.activo
    ),0) AS inicial_abonada
  FROM public.pag_planes_pago pp
  JOIN public.cfg_estados_plan_pago ep ON ep.id_estado_plan_pago=pp.id_estado_plan_pago
    AND ep.codigo='ACTIVO'
  JOIN public.ven_ventas v ON v.id_venta=pp.id_venta
  WHERE pp.es_vigente AND pp.monto_inicial>0
    AND EXISTS(SELECT 1 FROM public.ven_contratos ct
      JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=ct.id_estado_contrato
      WHERE ct.id_venta=pp.id_venta AND ct.fecha_firma IS NOT NULL
        AND ec.codigo='VIGENTE')
 )
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id_plan_pago),'[]'::jsonb)
 INTO v_items
 FROM (
  SELECT id_plan_pago,id_venta,codigo_venta,
    inicial_adicional_pactada,reserva_ya_acreditada,
    inicial_abonada,
    greatest(0,inicial_adicional_pactada-inicial_abonada) saldo_pendiente
  FROM planes
  WHERE inicial_adicional_pactada>inicial_abonada
    AND (coalesce(btrim(p_busqueda),'')='' OR
      codigo_venta ILIKE '%'||btrim(p_busqueda)||'%')
  ORDER BY id_plan_pago LIMIT p_limite
 ) x;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
    'idMetodoPago',id_metodo_pago,'codigo',codigo,'nombre',nombre)
    ORDER BY id_metodo_pago),'[]'::jsonb)
 INTO v_metodos FROM public.cfg_metodos_pago WHERE activo;
 RETURN jsonb_build_object('items',v_items,'metodos',v_metodos);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.sp_fin_preparar_carga_voucher_inicial_v1(
 p_actor bigint,p_venta bigint,p_plan bigint,p_monto numeric,
 p_metodo integer,p_fecha_operacion date,p_numero_operacion varchar,
 p_nombre_archivo varchar,p_mime varchar,p_tamanio bigint
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE
 v_id uuid:=gen_random_uuid();v_lote bigint;v_saldo numeric;v_ext varchar;
 v_clave varchar;v_numero varchar;
BEGIN
 IF p_actor IS NULL OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(
    p_actor,'finance.create'::varchar),false)
 THEN RAISE EXCEPTION 'DENEGADO|Sin permiso finance.create.'; END IF;
 IF p_venta IS NULL OR p_venta<=0 OR p_plan IS NULL OR p_plan<=0
    OR p_monto IS NULL OR p_monto<=0 OR p_monto<>round(p_monto,2)
    OR p_metodo IS NULL OR p_metodo<=0
    OR p_fecha_operacion IS NULL
    OR p_fecha_operacion>(now() AT TIME ZONE 'America/Lima')::date
    OR p_fecha_operacion<(now() AT TIME ZONE 'America/Lima')::date-365
    OR p_mime NOT IN('application/pdf','image/jpeg','image/png','image/webp')
    OR p_tamanio IS NULL OR p_tamanio NOT BETWEEN 1 AND 5242880
    OR p_nombre_archivo IS NULL OR length(btrim(p_nombre_archivo)) NOT BETWEEN 1 AND 180
    OR p_nombre_archivo ~ '[[:cntrl:]/]' OR strpos(p_nombre_archivo,chr(92))>0
    OR length(coalesce(p_numero_operacion,''))>100
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Datos del pago o archivo incorrectos.'; END IF;
 IF (p_mime='application/pdf' AND lower(p_nombre_archivo) !~ '\.pdf$')
  OR (p_mime='image/jpeg' AND lower(p_nombre_archivo) !~ '\.(jpg|jpeg)$')
  OR (p_mime='image/png' AND lower(p_nombre_archivo) !~ '\.png$')
  OR (p_mime='image/webp' AND lower(p_nombre_archivo) !~ '\.webp$')
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Extensión incompatible con MIME.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.cfg_metodos_pago
    WHERE id_metodo_pago=p_metodo AND activo)
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Método inactivo.'; END IF;

 SELECT v.id_lote,greatest(0,pp.monto_inicial-coalesce((
   SELECT sum(a.monto_aplicado) FROM public.pag_aplicaciones_pago a
   JOIN public.cfg_tipos_aplicacion_pago t
      ON t.id_tipo_aplicacion_pago=a.id_tipo_aplicacion_pago AND t.codigo='INICIAL'
   JOIN public.pag_pagos p ON p.id_pago=a.id_pago AND p.id_plan_pago=pp.id_plan_pago
   JOIN public.cfg_estados_pago e ON e.id_estado_pago=p.id_estado_pago AND e.codigo='CONFIRMADO'
   WHERE a.id_plan_pago=pp.id_plan_pago AND a.id_cuota IS NULL AND a.activo
 ),0))
 INTO v_lote,v_saldo
 FROM public.pag_planes_pago pp
 JOIN public.cfg_estados_plan_pago ep ON ep.id_estado_plan_pago=pp.id_estado_plan_pago
 JOIN public.ven_ventas v ON v.id_venta=pp.id_venta
 WHERE pp.id_plan_pago=p_plan AND pp.id_venta=p_venta
    AND pp.es_vigente AND pp.monto_inicial>0 AND ep.codigo='ACTIVO'
    AND EXISTS(SELECT 1 FROM public.ven_contratos ct
      JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=ct.id_estado_contrato
      WHERE ct.id_venta=p_venta AND ec.codigo='VIGENTE'
        AND ct.fecha_firma IS NOT NULL);
 IF v_lote IS NULL OR v_saldo IS NULL OR p_monto>v_saldo OR v_saldo<=0
 THEN RAISE EXCEPTION 'INICIAL_NO_DISPONIBLE|No existe inicial adicional exigible.'; END IF;
 v_numero:=nullif(btrim(p_numero_operacion),'');
 v_ext:=CASE p_mime WHEN 'application/pdf' THEN 'pdf'
   WHEN 'image/jpeg' THEN 'jpg' WHEN 'image/png' THEN 'png' ELSE 'webp' END;
 v_clave:='ventas/p-'||p_venta||'/l-'||v_lote||'/'||v_id::text||'.'||v_ext;
 INSERT INTO public.pag_cargas_voucher_inicial_v1(
   id_carga,id_actor,id_venta,id_plan_pago,monto,id_metodo_pago,
   fecha_operacion,numero_operacion,nombre_archivo,tipo_mime,tamanio_bytes,
   clave_archivo,expira_en
 ) VALUES(
   v_id,p_actor,p_venta,p_plan,p_monto,p_metodo,
   p_fecha_operacion,v_numero,btrim(p_nombre_archivo),p_mime,p_tamanio,
   v_clave,now()+interval '30 minutes'
 );
 RETURN jsonb_build_object('idCarga',v_id,
   'bucket','vouchers-ventas-private','claveArchivo',v_clave,
   'tipoMime',p_mime,'maxBytes',5242880,'expiresInSeconds',1800,
   'saldoInicialAdicional',v_saldo,'destino','INICIAL');
END;
$fn$;

CREATE OR REPLACE FUNCTION public.sp_fin_registrar_voucher_inicial_pendiente_v1(
 p_actor bigint,p_id_carga uuid
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE
 r public.pag_cargas_voucher_inicial_v1%ROWTYPE;
 v_estado_pago integer;v_estado_voucher integer;
 v_pago bigint;v_voucher bigint;v_moneda integer;v_saldo numeric;
BEGIN
 IF p_actor IS NULL OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(
   p_actor,'finance.create'::varchar),false)
 THEN RAISE EXCEPTION 'DENEGADO|Sin permiso para registrar inicial.'; END IF;
 IF p_id_carga IS NULL THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Carga inválida.'; END IF;
 SELECT * INTO r FROM public.pag_cargas_voucher_inicial_v1
 WHERE id_carga=p_id_carga FOR UPDATE;
 IF NOT FOUND OR r.id_actor<>p_actor
 THEN RAISE EXCEPTION 'CARGA_NO_DISPONIBLE|Carga no autorizada.'; END IF;
 IF r.id_pago IS NOT NULL THEN
   RETURN jsonb_build_object('idPago',r.id_pago,'idVoucher',r.id_voucher,
     'destino','INICIAL','estadoPago','REGISTRADO','estadoVoucher','PENDIENTE',
     'saldoAplicado',0,'reutilizado',true);
 END IF;
 IF r.expira_en<now()
 THEN RAISE EXCEPTION 'CARGA_EXPIRADA|La preparación de inicial ha vencido.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.objects o
   WHERE o.bucket_id='vouchers-ventas-private' AND o.name=r.clave_archivo
     AND o.archived_at IS NULL AND o.is_delete_marker=false
     AND lower(coalesce(o.metadata->>'mimetype',''))=r.tipo_mime
     AND coalesce((o.metadata->>'size')::bigint,0)=r.tamanio_bytes
     AND r.tamanio_bytes BETWEEN 1 AND 5242880)
 THEN RAISE EXCEPTION 'ARCHIVO_NO_EXISTE|La evidencia privada no coincide.'; END IF;

 -- Orden de bloqueo de inicial: PLAN -> PAGO (al aprobar o imputar).
 SELECT pp.id_moneda,
   greatest(0,pp.monto_inicial-coalesce((
     SELECT sum(a.monto_aplicado)
     FROM public.pag_aplicaciones_pago a
     JOIN public.cfg_tipos_aplicacion_pago t ON t.id_tipo_aplicacion_pago=a.id_tipo_aplicacion_pago
       AND t.codigo='INICIAL'
     JOIN public.pag_pagos p ON p.id_pago=a.id_pago AND p.id_plan_pago=pp.id_plan_pago
     JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago AND ep.codigo='CONFIRMADO'
     WHERE a.id_plan_pago=pp.id_plan_pago AND a.id_cuota IS NULL AND a.activo
   ),0))
 INTO v_moneda,v_saldo
 FROM public.pag_planes_pago pp
 JOIN public.cfg_estados_plan_pago ep ON ep.id_estado_plan_pago=pp.id_estado_plan_pago
 WHERE pp.id_plan_pago=r.id_plan_pago AND pp.id_venta=r.id_venta
   AND pp.es_vigente AND ep.codigo='ACTIVO'
   AND EXISTS(SELECT 1 FROM public.ven_contratos ct
     JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=ct.id_estado_contrato
     WHERE ct.id_venta=r.id_venta AND ct.fecha_firma IS NOT NULL AND ec.codigo='VIGENTE')
 FOR UPDATE OF pp;
 IF v_moneda IS NULL OR v_saldo IS NULL OR r.monto>v_saldo
 THEN RAISE EXCEPTION 'INICIAL_NO_DISPONIBLE|La inicial cambió de estado.'; END IF;
 IF r.numero_operacion IS NOT NULL THEN
   PERFORM pg_advisory_xact_lock(hashtextextended(
     'CUOTA:'||r.id_venta||':'||r.id_metodo_pago||':'||lower(r.numero_operacion),0));
 END IF;
 IF r.numero_operacion IS NOT NULL AND EXISTS(
   SELECT 1 FROM public.pag_pagos p
   JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago
   WHERE p.id_venta=r.id_venta AND p.id_metodo_pago=r.id_metodo_pago
     AND lower(btrim(p.numero_operacion))=lower(r.numero_operacion)
     AND ep.codigo<>'ANULADO'
 ) THEN RAISE EXCEPTION 'PAGO_DUPLICADO|Número de operación duplicado.'; END IF;
 SELECT id_estado_pago INTO STRICT v_estado_pago
 FROM public.cfg_estados_pago WHERE codigo='REGISTRADO' AND activo;
 SELECT id_estado_voucher INTO STRICT v_estado_voucher
 FROM public.cfg_estados_voucher WHERE codigo='PENDIENTE' AND activo;

 INSERT INTO public.pag_pagos(
  id_reserva,id_venta,id_plan_pago,id_estado_pago,id_metodo_pago,id_moneda,
  codigo,monto,fecha_operacion,numero_operacion,observaciones,id_usuario_registro
 ) VALUES(
   NULL,r.id_venta,r.id_plan_pago,v_estado_pago,r.id_metodo_pago,v_moneda,
   'PAG-INI-'||replace(r.id_carga::text,'-',''),
   r.monto,(r.fecha_operacion+time '12:00') AT TIME ZONE 'America/Lima',
   r.numero_operacion,'Voucher pendiente para inicial adicional',r.id_actor
 ) RETURNING id_pago INTO v_pago;

 INSERT INTO public.pag_vouchers(
  id_pago,id_estado_voucher,codigo,numero_version,nombre_archivo_original,
  clave_archivo,tipo_mime,tamanio_bytes,fecha_carga,id_usuario_carga,activo
 ) VALUES(
   v_pago,v_estado_voucher,'VOU-INI-'||replace(r.id_carga::text,'-',''),
   1,r.nombre_archivo,r.clave_archivo,r.tipo_mime,r.tamanio_bytes,
   now(),r.id_actor,true
 ) RETURNING id_voucher INTO v_voucher;

 UPDATE public.pag_cargas_voucher_inicial_v1
  SET id_pago=v_pago,id_voucher=v_voucher WHERE id_carga=p_id_carga;
 RETURN jsonb_build_object('idPago',v_pago,'idVoucher',v_voucher,
   'destino','INICIAL','estadoPago','REGISTRADO','estadoVoucher','PENDIENTE',
   'saldoAplicado',0,'reutilizado',false);
END;
$fn$;

REVOKE ALL ON FUNCTION public.sp_fin_opciones_registro_inicial_v1(
 bigint,varchar,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_fin_opciones_registro_inicial_v1(
 bigint,varchar,integer) TO sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_fin_preparar_carga_voucher_inicial_v1(
 bigint,bigint,bigint,numeric,integer,date,varchar,varchar,varchar,bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_fin_preparar_carga_voucher_inicial_v1(
 bigint,bigint,bigint,numeric,integer,date,varchar,varchar,varchar,bigint)
 TO sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_fin_registrar_voucher_inicial_pendiente_v1(
 bigint,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_fin_registrar_voucher_inicial_pendiente_v1(
 bigint,uuid) TO sigi_app_user;
