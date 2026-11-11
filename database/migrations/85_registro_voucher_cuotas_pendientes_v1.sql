-- SGI-MONOLITHE | Sprint 4 | 5.3.2
-- Carga privada y registro idempotente de vouchers de CUOTAS.
-- El comprobante registrado NO confirma ni aplica el pago.
-- 5.3.3 verificará el comprobante; 5.3.4 aplicará el abono confirmado.
-- No modifica datos históricos de pago.
CREATE TABLE IF NOT EXISTS public.pag_cargas_voucher_cuota (
  id_carga uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_actor bigint NOT NULL REFERENCES public.seg_usuarios(id_usuario) ON DELETE RESTRICT,
  id_venta bigint NOT NULL REFERENCES public.ven_ventas(id_venta) ON DELETE RESTRICT,
  id_plan_pago bigint NOT NULL REFERENCES public.pag_planes_pago(id_plan_pago) ON DELETE RESTRICT,
  id_cuota bigint NOT NULL REFERENCES public.pag_cuotas(id_cuota) ON DELETE RESTRICT,
  monto numeric(14,2) NOT NULL CHECK(monto>0),
  id_metodo_pago integer NOT NULL REFERENCES public.cfg_metodos_pago(id_metodo_pago) ON DELETE RESTRICT,
  fecha_operacion date NOT NULL,
  numero_operacion varchar(100),
  nombre_archivo varchar(180) NOT NULL,
  tipo_mime varchar(80) NOT NULL,
  tamanio_bytes bigint NOT NULL CHECK(tamanio_bytes BETWEEN 1 AND 5242880),
  clave_archivo varchar(255) NOT NULL UNIQUE,
  fecha_creacion timestamptz NOT NULL DEFAULT now(),
  expira_en timestamptz NOT NULL,
  id_pago bigint UNIQUE REFERENCES public.pag_pagos(id_pago) ON DELETE RESTRICT,
  id_voucher bigint UNIQUE REFERENCES public.pag_vouchers(id_voucher) ON DELETE RESTRICT,
  CONSTRAINT chk_registro_ambos_voucher CHECK (
    (id_pago IS NULL AND id_voucher IS NULL) OR
    (id_pago IS NOT NULL AND id_voucher IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_pag_cargas_cuota_venta
  ON public.pag_cargas_voucher_cuota(id_venta,id_cuota,fecha_creacion DESC);
ALTER TABLE public.pag_cargas_voucher_cuota ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pag_cargas_voucher_cuota FROM PUBLIC,anon,authenticated,sigi_app_user;

-- Saldo realmente pendiente en una cuota, no un estado manual y no
-- vouchers pendientes. Solo se ejecuta dentro de RPC autenticadas.
CREATE OR REPLACE FUNCTION public.fn_fin_saldo_cuota_confirmado_v1(p_cuota bigint)
RETURNS numeric LANGUAGE sql STABLE
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
 SELECT GREATEST(0,round(q.monto_cuota-
     coalesce((SELECT sum(a.monto_aplicado)
       FROM public.pag_aplicaciones_pago a
       JOIN public.cfg_tipos_aplicacion_pago ta
         ON ta.id_tipo_aplicacion_pago=a.id_tipo_aplicacion_pago AND ta.codigo='CUOTA'
       JOIN public.pag_pagos p ON p.id_pago=a.id_pago
         AND p.id_plan_pago=q.id_plan_pago
       JOIN public.cfg_estados_pago ep
         ON ep.id_estado_pago=p.id_estado_pago AND ep.codigo='CONFIRMADO'
       WHERE a.id_cuota=q.id_cuota AND a.id_plan_pago=q.id_plan_pago
         AND a.activo),0),2))
 FROM public.pag_cuotas q WHERE q.id_cuota=p_cuota;
$fn$;

-- Busca cuotas aptas sin exponer toda la cartera CRM al navegador.
CREATE OR REPLACE FUNCTION public.sp_fin_opciones_registro_cuota_v1(
 p_actor bigint,p_busqueda varchar DEFAULT NULL,p_limite integer DEFAULT 60
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE
 v_items jsonb;
 v_metodos jsonb;
 v_busqueda text:=coalesce(btrim(p_busqueda),'');
BEGIN
 IF p_actor IS NULL OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(
     p_actor,'finance.create'::varchar),false)
 THEN RAISE EXCEPTION 'DENEGADO|Se requiere finance.create.'; END IF;
 IF p_limite IS NULL OR p_limite NOT BETWEEN 1 AND 100
    OR length(v_busqueda)>120
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Consulta de cuotas inválida.'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.codigo_venta,t.numero_cuota),'[]'::jsonb)
 INTO v_items FROM (
   SELECT v.id_venta,v.codigo AS codigo_venta,
     pp.id_plan_pago,c.id_cuota,c.numero_cuota,c.fecha_vencimiento,
     c.monto_cuota,public.fn_fin_saldo_cuota_confirmado_v1(c.id_cuota) saldo_pendiente
   FROM public.pag_cuotas c
   JOIN public.pag_planes_pago pp ON pp.id_plan_pago=c.id_plan_pago
     AND pp.es_vigente=true
   JOIN public.cfg_estados_plan_pago ep ON ep.id_estado_plan_pago=pp.id_estado_plan_pago
     AND ep.codigo='ACTIVO'
   JOIN public.ven_ventas v ON v.id_venta=pp.id_venta
   JOIN public.cfg_estados_cuota ec ON ec.id_estado_cuota=c.id_estado_cuota
   WHERE ec.codigo<>'ANULADA'
     AND EXISTS(SELECT 1 FROM public.ven_contratos ct
       JOIN public.cfg_estados_contrato ce ON ce.id_estado_contrato=ct.id_estado_contrato
       WHERE ct.id_venta=v.id_venta AND ce.codigo='VIGENTE'
         AND ct.fecha_firma IS NOT NULL)
     AND public.fn_fin_saldo_cuota_confirmado_v1(c.id_cuota)>0
     AND (v_busqueda='' OR v.codigo ILIKE '%'||v_busqueda||'%'
       OR pp.codigo ILIKE '%'||v_busqueda||'%'
       OR c.numero_cuota::text=v_busqueda)
   ORDER BY v.codigo,c.numero_cuota LIMIT p_limite
 ) t;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'idMetodoPago',id_metodo_pago,'codigo',codigo,'nombre',nombre)
   ORDER BY id_metodo_pago),'[]'::jsonb)
 INTO v_metodos FROM public.cfg_metodos_pago WHERE activo=true;
 RETURN jsonb_build_object('items',v_items,'metodos',v_metodos);
END;
$fn$;

-- Crea un intento de carga ligado a la cuota y al actor, antes de
-- entregar la URL de Supabase Storage. La ruta no la elige el cliente.
CREATE OR REPLACE FUNCTION public.sp_fin_preparar_carga_voucher_cuota_v1(
 p_actor bigint,p_venta bigint,p_cuota bigint,p_monto numeric,
 p_metodo integer,p_fecha_operacion date,p_numero_operacion varchar,
 p_nombre_archivo varchar,p_mime varchar,p_tamanio bigint
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE
 v_plan bigint;v_moneda integer;v_lote bigint;
 v_estado_cuota varchar;v_saldo numeric;
 v_carga uuid:=gen_random_uuid();
 v_ext varchar;v_clave varchar;v_numero varchar;
 v_vencimiento timestamptz:=now()+interval '30 minutes';
BEGIN
 IF p_actor IS NULL OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(
    p_actor,'finance.create'::varchar),false)
 THEN RAISE EXCEPTION 'DENEGADO|Sin permiso para registrar comprobantes.'; END IF;
 IF p_venta IS NULL OR p_venta<=0 OR p_cuota IS NULL OR p_cuota<=0
    OR p_monto IS NULL OR p_monto<=0 OR p_monto<>round(p_monto,2)
    OR p_metodo IS NULL OR p_metodo<=0
    OR p_fecha_operacion IS NULL OR p_fecha_operacion>
       (now() AT TIME ZONE 'America/Lima')::date
    OR p_fecha_operacion<
       (now() AT TIME ZONE 'America/Lima')::date-365
    OR p_mime NOT IN('application/pdf','image/jpeg','image/png','image/webp')
    OR p_tamanio IS NULL OR p_tamanio NOT BETWEEN 1 AND 5242880
    OR p_nombre_archivo IS NULL OR length(btrim(p_nombre_archivo)) NOT BETWEEN 1 AND 180
    OR p_nombre_archivo ~ '[[:cntrl:]/]' OR strpos(p_nombre_archivo,chr(92))>0
    OR p_numero_operacion IS NOT NULL AND length(btrim(p_numero_operacion))>100
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Datos del pago o archivo incorrectos.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.cfg_metodos_pago
    WHERE id_metodo_pago=p_metodo AND activo=true)
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Medio de pago inactivo.'; END IF;
 SELECT pp.id_plan_pago,pp.id_moneda,v.id_lote,ec.codigo
 INTO v_plan,v_moneda,v_lote,v_estado_cuota
 FROM public.pag_cuotas c
 JOIN public.pag_planes_pago pp ON pp.id_plan_pago=c.id_plan_pago
   AND pp.es_vigente=true AND pp.id_venta=p_venta
 JOIN public.cfg_estados_plan_pago ep ON ep.id_estado_plan_pago=pp.id_estado_plan_pago
   AND ep.codigo='ACTIVO'
 JOIN public.cfg_estados_cuota ec ON ec.id_estado_cuota=c.id_estado_cuota
 JOIN public.ven_ventas v ON v.id_venta=pp.id_venta
 WHERE c.id_cuota=p_cuota;
 IF v_plan IS NULL OR v_estado_cuota='ANULADA'
    OR NOT EXISTS(SELECT 1 FROM public.ven_contratos ct
      JOIN public.cfg_estados_contrato ce ON ce.id_estado_contrato=ct.id_estado_contrato
      WHERE ct.id_venta=p_venta AND ce.codigo='VIGENTE' AND ct.fecha_firma IS NOT NULL)
 THEN RAISE EXCEPTION 'CUOTA_NO_DISPONIBLE|No existe cuota exigible con contrato vigente.'; END IF;
 SELECT public.fn_fin_saldo_cuota_confirmado_v1(p_cuota) INTO v_saldo;
 IF v_saldo IS NULL OR v_saldo<=0 OR p_monto>v_saldo THEN
   RAISE EXCEPTION 'IMPORTE_INVALIDO|El monto supera el saldo real de la cuota.'; END IF;
 v_ext:=CASE p_mime WHEN 'application/pdf' THEN 'pdf'
   WHEN 'image/jpeg' THEN 'jpg' WHEN 'image/png' THEN 'png' ELSE 'webp' END;
 v_numero:=nullif(btrim(p_numero_operacion),'');
 v_clave:='ventas/p-'||p_venta||'/l-'||v_lote||'/'||v_carga::text||'.'||v_ext;
 INSERT INTO public.pag_cargas_voucher_cuota(
   id_carga,id_actor,id_venta,id_plan_pago,id_cuota,monto,
   id_metodo_pago,fecha_operacion,numero_operacion,nombre_archivo,
   tipo_mime,tamanio_bytes,clave_archivo,expira_en
 ) VALUES (
   v_carga,p_actor,p_venta,v_plan,p_cuota,p_monto,
   p_metodo,p_fecha_operacion,v_numero,btrim(p_nombre_archivo),
   p_mime,p_tamanio,v_clave,v_vencimiento
 );
 RETURN jsonb_build_object(
    'idCarga',v_carga,'bucket','vouchers-ventas-private',
    'claveArchivo',v_clave,'tipoMime',p_mime,
    'maxBytes',5242880,'expiresInSeconds',1800,
    'saldoCuota',v_saldo);
END;
$fn$;

-- Tras verificar el objeto REAL en Storage, registra pago y voucher
-- PENDIENTES dentro de una transacción. No crea aplicaciones contables.
CREATE OR REPLACE FUNCTION public.sp_fin_registrar_voucher_cuota_pendiente_v1(
 p_actor bigint,p_id_carga uuid
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE
 r public.pag_cargas_voucher_cuota%ROWTYPE;
 v_estado_pago integer;v_estado_voucher integer;
 v_pago bigint;v_voucher bigint;v_moneda integer;v_saldo numeric;
BEGIN
 IF p_actor IS NULL OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(
   p_actor,'finance.create'::varchar),false)
 THEN RAISE EXCEPTION 'DENEGADO|Sin permiso para registrar comprobantes.'; END IF;
 IF p_id_carga IS NULL THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Carga inválida.'; END IF;
 SELECT * INTO r FROM public.pag_cargas_voucher_cuota
   WHERE id_carga=p_id_carga FOR UPDATE;
 IF NOT FOUND OR r.id_actor<>p_actor THEN
    RAISE EXCEPTION 'CARGA_NO_DISPONIBLE|Carga inexistente o no autorizada.'; END IF;
 IF r.id_pago IS NOT NULL THEN
    RETURN jsonb_build_object(
      'idPago',r.id_pago,'idVoucher',r.id_voucher,
      'idCuota',r.id_cuota,'estadoPago','REGISTRADO',
      'estadoVoucher','PENDIENTE','reutilizado',true,
      'saldoAplicado',0);
 END IF;
 IF r.expira_en<now() THEN
    RAISE EXCEPTION 'CARGA_EXPIRADA|Solicite otra URL para el comprobante.'; END IF;
 IF NOT EXISTS(
    SELECT 1 FROM storage.objects o WHERE
      o.bucket_id='vouchers-ventas-private'
      AND o.name=r.clave_archivo
      AND o.archived_at IS NULL AND o.is_delete_marker=false
      AND lower(coalesce(o.metadata->>'mimetype',''))=r.tipo_mime
      AND (o.metadata->>'size')::bigint=r.tamanio_bytes
      AND r.tamanio_bytes BETWEEN 1 AND 5242880)
 THEN RAISE EXCEPTION 'ARCHIVO_NO_EXISTE|El archivo cargado no coincide con lo autorizado.'; END IF;

 SELECT pp.id_moneda INTO v_moneda
 FROM public.pag_cuotas c
 JOIN public.pag_planes_pago pp ON pp.id_plan_pago=c.id_plan_pago
 JOIN public.cfg_estados_plan_pago ep ON ep.id_estado_plan_pago=pp.id_estado_plan_pago
   AND ep.codigo='ACTIVO'
 JOIN public.cfg_estados_cuota ec ON ec.id_estado_cuota=c.id_estado_cuota
 WHERE c.id_cuota=r.id_cuota AND pp.id_plan_pago=r.id_plan_pago
   AND pp.id_venta=r.id_venta AND pp.es_vigente AND ec.codigo<>'ANULADA'
   AND EXISTS(SELECT 1 FROM public.ven_contratos ct
     JOIN public.cfg_estados_contrato ce ON ce.id_estado_contrato=ct.id_estado_contrato
     WHERE ct.id_venta=r.id_venta AND ce.codigo='VIGENTE'
       AND ct.fecha_firma IS NOT NULL);
 IF v_moneda IS NULL THEN
   RAISE EXCEPTION 'CUOTA_NO_DISPONIBLE|La venta cambió de estado antes del registro.'; END IF;
 v_saldo:=public.fn_fin_saldo_cuota_confirmado_v1(r.id_cuota);
 IF v_saldo IS NULL OR r.monto>v_saldo THEN
   RAISE EXCEPTION 'IMPORTE_INVALIDO|La cuota ya no admite este importe.'; END IF;
 IF r.numero_operacion IS NOT NULL
   AND EXISTS(
      SELECT 1 FROM public.pag_pagos p
      JOIN public.cfg_estados_pago e ON e.id_estado_pago=p.id_estado_pago
      WHERE p.id_venta=r.id_venta AND p.id_metodo_pago=r.id_metodo_pago
        AND lower(btrim(p.numero_operacion))=lower(r.numero_operacion)
        AND e.codigo<>'ANULADO'
   )
 THEN RAISE EXCEPTION 'PAGO_DUPLICADO|El número de operación ya fue registrado.'; END IF;
 SELECT id_estado_pago INTO STRICT v_estado_pago
 FROM public.cfg_estados_pago WHERE codigo='REGISTRADO' AND activo=true;
 SELECT id_estado_voucher INTO STRICT v_estado_voucher
 FROM public.cfg_estados_voucher WHERE codigo='PENDIENTE' AND activo=true;

 INSERT INTO public.pag_pagos(
  id_reserva,id_venta,id_plan_pago,id_estado_pago,id_metodo_pago,
  id_moneda,codigo,monto,fecha_operacion,numero_operacion,
  observaciones,id_usuario_registro
 ) VALUES(
  NULL,r.id_venta,r.id_plan_pago,v_estado_pago,r.id_metodo_pago,
  v_moneda,'PAG-CUO-'||replace(r.id_carga::text,'-',''),
  r.monto,(r.fecha_operacion::timestamp+time '12:00') AT TIME ZONE 'America/Lima',
  r.numero_operacion,'Voucher pendiente para cuota '||r.id_cuota,r.id_actor
 ) RETURNING id_pago INTO v_pago;

 INSERT INTO public.pag_vouchers(
  id_pago,id_estado_voucher,codigo,numero_version,nombre_archivo_original,
  clave_archivo,tipo_mime,tamanio_bytes,fecha_carga,id_usuario_carga,activo
 ) VALUES(
  v_pago,v_estado_voucher,'VOU-CUO-'||replace(r.id_carga::text,'-',''),
  1,r.nombre_archivo,r.clave_archivo,r.tipo_mime,r.tamanio_bytes,
  now(),r.id_actor,true
 ) RETURNING id_voucher INTO v_voucher;

 UPDATE public.pag_cargas_voucher_cuota
   SET id_pago=v_pago,id_voucher=v_voucher WHERE id_carga=p_id_carga;
 RETURN jsonb_build_object(
   'idPago',v_pago,'idVoucher',v_voucher,
   'idCuota',r.id_cuota,'estadoPago','REGISTRADO',
   'estadoVoucher','PENDIENTE','reutilizado',false,
   'saldoAplicado',0);
END;
$fn$;

REVOKE ALL ON FUNCTION public.fn_fin_saldo_cuota_confirmado_v1(bigint)
  FROM PUBLIC,anon,authenticated,sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_fin_opciones_registro_cuota_v1(bigint,varchar,integer)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_fin_opciones_registro_cuota_v1(bigint,varchar,integer)
  TO sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_fin_preparar_carga_voucher_cuota_v1(
 bigint,bigint,bigint,numeric,integer,date,varchar,varchar,varchar,bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_fin_preparar_carga_voucher_cuota_v1(
 bigint,bigint,bigint,numeric,integer,date,varchar,varchar,varchar,bigint)
 TO sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_fin_registrar_voucher_cuota_pendiente_v1(bigint,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_fin_registrar_voucher_cuota_pendiente_v1(bigint,uuid)
 TO sigi_app_user;
