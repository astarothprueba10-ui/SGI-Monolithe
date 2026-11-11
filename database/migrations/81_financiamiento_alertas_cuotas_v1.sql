-- SGI-MONOLITHE | Sprint 4 / 5.2.6
-- Alertas financieras basadas en aplicaciones de pagos CONFIRMADOS.
-- Reutiliza las tablas y tipos de notificación existentes.
-- CONSULTA en tiempo real; el generador PORTAL es explícito, idempotente,
-- no programa correos/SMS ni ejecuta acciones externas.
-- Requiere: migraciones 76, 78, 79 y 80.

-- Base única de alertas. No incluye planes sin firmar, anulados ni cerrados.
CREATE OR REPLACE FUNCTION public.fn_fin_alertas_cuotas_base_v1(p_fecha_corte date)
RETURNS TABLE(
  id_cuota bigint,id_plan_pago bigint,id_venta bigint,codigo_venta varchar,
  id_cliente bigint,id_persona bigint,comprador text,numero_cuota integer,
  fecha_vencimiento date,monto_cuota numeric,abonado_confirmado numeric,
  saldo_cuota numeric,estado_cuota text,tipo_alerta text,
  dias_mora integer,dias_para_vencer integer
)
LANGUAGE sql STABLE
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
 SELECT
   c.id_cuota,pp.id_plan_pago,v.id_venta,v.codigo,
   titular.id_cliente,titular.id_persona,titular.comprador,
   c.numero_cuota,c.fecha_vencimiento,c.monto_cuota,
   pagos.abonado,
   (estado.resultado->>'saldoCuota')::numeric,
   estado.resultado->>'estado',
   CASE WHEN (estado.resultado->>'cuotaAtrasada')::boolean
        THEN 'CUOTA_VENCIDA' ELSE 'CUOTA_PROXIMA' END,
   (estado.resultado->>'diasMora')::integer,
   GREATEST(0,c.fecha_vencimiento-p_fecha_corte)
 FROM public.pag_cuotas c
 JOIN public.pag_planes_pago pp ON pp.id_plan_pago=c.id_plan_pago
    AND pp.es_vigente=true
 JOIN public.cfg_estados_plan_pago ep
    ON ep.id_estado_plan_pago=pp.id_estado_plan_pago AND ep.codigo='ACTIVO'
 JOIN public.ven_ventas v ON v.id_venta=pp.id_venta
 JOIN public.cfg_estados_cuota ec ON ec.id_estado_cuota=c.id_estado_cuota
 LEFT JOIN LATERAL (
   SELECT vc.id_cliente,cl.id_persona,
          trim(concat_ws(' ',pr.nombres,pr.apellido_paterno,pr.apellido_materno)) comprador
   FROM public.ven_ventas_clientes vc
   JOIN public.crm_clientes cl ON cl.id_cliente=vc.id_cliente
   JOIN public.core_personas pr ON pr.id_persona=cl.id_persona
   WHERE vc.id_venta=v.id_venta AND vc.titular=true
   ORDER BY vc.id_cliente LIMIT 1
 ) titular ON true
 LEFT JOIN LATERAL (
   SELECT COALESCE(sum(a.monto_aplicado),0)::numeric abonado
   FROM public.pag_aplicaciones_pago a
   JOIN public.cfg_tipos_aplicacion_pago t
      ON t.id_tipo_aplicacion_pago=a.id_tipo_aplicacion_pago AND t.codigo='CUOTA'
   JOIN public.pag_pagos pg ON pg.id_pago=a.id_pago
       AND pg.id_plan_pago=pp.id_plan_pago AND pg.id_venta=v.id_venta
   JOIN public.cfg_estados_pago est ON est.id_estado_pago=pg.id_estado_pago
       AND est.codigo='CONFIRMADO'
   WHERE a.id_cuota=c.id_cuota AND a.id_plan_pago=pp.id_plan_pago AND a.activo
 ) pagos ON true
 CROSS JOIN LATERAL (
   SELECT public.fn_crm_clasificar_cuota_v1(
       ec.codigo,c.monto_cuota,pagos.abonado,c.fecha_vencimiento,p_fecha_corte
   ) resultado
 ) estado
 WHERE p_fecha_corte IS NOT NULL
   AND ((estado.resultado->>'cuotaAtrasada')::boolean
      OR (estado.resultado->>'proxima7Dias')::boolean);
$fn$;

-- Listado operativo sin escrituras. El alcance proviene del JWT y
-- se revalida por venta (asesor = solo su cartera, supervisor = global).
CREATE OR REPLACE FUNCTION public.sp_fin_alertas_cuotas_v1(
 p_actor bigint,p_tipo varchar DEFAULT 'TODAS',
 p_pagina integer DEFAULT 1,p_tamano integer DEFAULT 20
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE
 v_corte date:=(now() AT TIME ZONE 'America/Lima')::date;
 v_total integer;
 v_proximas integer;
 v_vencidas integer;
 v_monto_proximo numeric;
 v_monto_vencido numeric;
 v_items jsonb;
BEGIN
 IF p_actor IS NULL OR p_actor<=0
    OR NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(
        p_actor,'sales.view'::varchar),false)
 THEN RAISE EXCEPTION 'ACCESO_DENEGADO|No tiene permisos para consultar alertas financieras.'; END IF;
 IF p_tipo IS NULL OR p_tipo NOT IN('TODAS','CUOTA_PROXIMA','CUOTA_VENCIDA')
    OR p_pagina IS NULL OR p_pagina NOT BETWEEN 1 AND 10000
    OR p_tamano IS NULL OR p_tamano NOT BETWEEN 1 AND 100
 THEN RAISE EXCEPTION 'FILTROS_INVALIDOS|Tipo o paginación incorrectos.'; END IF;
 SELECT
   COUNT(*) FILTER(WHERE p_tipo='TODAS' OR tipo_alerta=p_tipo)::integer,
   COUNT(*) FILTER(WHERE tipo_alerta='CUOTA_PROXIMA')::integer,
   COUNT(*) FILTER(WHERE tipo_alerta='CUOTA_VENCIDA')::integer,
   COALESCE(SUM(saldo_cuota) FILTER(WHERE tipo_alerta='CUOTA_PROXIMA'),0),
   COALESCE(SUM(saldo_cuota) FILTER(WHERE tipo_alerta='CUOTA_VENCIDA'),0)
 INTO v_total,v_proximas,v_vencidas,v_monto_proximo,v_monto_vencido
 FROM public.fn_fin_alertas_cuotas_base_v1(v_corte) a
 WHERE public.fn_crm_puede_consultar_venta_v1(p_actor,a.id_venta);
 SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'idCuota',a.id_cuota,'idPlanPago',a.id_plan_pago,
    'idVenta',a.id_venta,'codigoVenta',a.codigo_venta,
    'idCliente',a.id_cliente,'comprador',a.comprador,
    'numeroCuota',a.numero_cuota,'fechaVencimiento',
      to_char(a.fecha_vencimiento,'YYYY-MM-DD'),
    'montoCuota',a.monto_cuota,'abonadoConfirmado',a.abonado_confirmado,
    'saldoCuota',a.saldo_cuota,'estadoCuota',a.estado_cuota,
    'tipoAlerta',a.tipo_alerta,'diasMora',a.dias_mora,
    'diasParaVencer',a.dias_para_vencer
 ) ORDER BY CASE WHEN a.tipo_alerta='CUOTA_VENCIDA' THEN 0 ELSE 1 END,
 a.fecha_vencimiento,a.id_cuota),'[]'::jsonb)
 INTO v_items
 FROM (
   SELECT * FROM public.fn_fin_alertas_cuotas_base_v1(v_corte) r
   WHERE (p_tipo='TODAS' OR r.tipo_alerta=p_tipo)
     AND public.fn_crm_puede_consultar_venta_v1(p_actor,r.id_venta)
   ORDER BY CASE WHEN r.tipo_alerta='CUOTA_VENCIDA' THEN 0 ELSE 1 END,
            r.fecha_vencimiento,r.id_cuota
   LIMIT p_tamano OFFSET (p_pagina-1)*p_tamano
 ) a;
 RETURN jsonb_build_object(
   'fechaCorte',to_char(v_corte,'YYYY-MM-DD'),
   'tipo',p_tipo,'pagina',p_pagina,'tamano',p_tamano,
   'total',v_total,'paginas',CEIL(v_total::numeric/p_tamano)::integer,
   'proximas',v_proximas,'vencidas',v_vencidas,
   'montoProximo',v_monto_proximo,'montoVencido',v_monto_vencido,
   'items',v_items);
END;
$fn$;

-- Preparación manual para el portal del cliente; NO ENVÍA correos.
-- Solo Finanzas autorizado puede ejecutarla desde Core.
-- La clave dedup conserva una notificación por cuota, tipo y vencimiento.
CREATE OR REPLACE FUNCTION public.sp_fin_preparar_avisos_portal_v1(
 p_actor bigint,p_limite integer DEFAULT 100
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE
 v_corte date:=(now() AT TIME ZONE 'America/Lima')::date;
 v_r record;
 v_tipo integer;
 v_canal integer;
 v_clave text;
 v_nuevo bigint;
 v_creados integer:=0;
 v_omitidos integer:=0;
 v_desactivados integer:=0;
 v_procesados integer:=0;
 v_titulo varchar;
 v_mensaje varchar;
BEGIN
 IF p_actor IS NULL OR p_actor<=0 OR
    NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(
       p_actor,'financing.approve'::varchar),false)
 THEN RAISE EXCEPTION 'ACCESO_DENEGADO|Se requiere aprobación financiera para preparar avisos.'; END IF;
 IF p_limite IS NULL OR p_limite NOT BETWEEN 1 AND 500 THEN
   RAISE EXCEPTION 'LIMITE_INVALIDO|Máximo 500 avisos por ejecución.'; END IF;
 SELECT id_canal_notificacion INTO STRICT v_canal FROM public.cfg_canales_notificacion
 WHERE codigo='PORTAL' AND activo=true;
 -- Detener si los códigos de tipos previamente existentes no están vigentes.
 IF (SELECT COUNT(*) FROM public.cfg_tipos_notificacion
     WHERE codigo IN('CUOTA_PROXIMA','CUOTA_VENCIDA') AND activo=true)<>2 THEN
   RAISE EXCEPTION 'CATALOGO_INCOMPLETO|Tipos de alerta inactivos.';
 END IF;
 -- Desactivar avisos de cuotas pagadas, anuladas, sin firma o ya fuera de
 -- la ventana próxima. Esta operación nunca borra la trazabilidad.
 UPDATE public.not_notificaciones n
 SET activo=false,fecha_actualizacion=now()
 WHERE n.activo AND n.referencia_modulo='FINANCIAMIENTO'
   AND n.referencia_entidad='pag_cuotas'
   AND n.clave_deduplicacion LIKE 'FIN_CUOTA:%'
   AND NOT EXISTS (
      SELECT 1 FROM public.fn_fin_alertas_cuotas_base_v1(v_corte) x
      WHERE x.id_cuota::text=n.referencia_id
        AND x.id_persona=n.id_persona
        AND n.clave_deduplicacion=concat('FIN_CUOTA:',x.id_cuota,':',x.tipo_alerta,':',
                                to_char(x.fecha_vencimiento,'YYYY-MM-DD'))
   );
 GET DIAGNOSTICS v_desactivados=ROW_COUNT;

 FOR v_r IN
   SELECT a.*,nt.id_tipo_notificacion
   FROM public.fn_fin_alertas_cuotas_base_v1(v_corte) a
   JOIN public.cfg_tipos_notificacion nt ON nt.codigo=a.tipo_alerta AND nt.activo=true
   WHERE a.id_persona IS NOT NULL
     AND NOT EXISTS(
       SELECT 1 FROM public.not_preferencias np
       WHERE np.id_persona=a.id_persona
         AND np.id_tipo_notificacion=nt.id_tipo_notificacion
         AND np.id_canal_notificacion=v_canal
         AND np.habilitado=false
     )
   ORDER BY CASE WHEN a.tipo_alerta='CUOTA_VENCIDA' THEN 0 ELSE 1 END,
            a.fecha_vencimiento,a.id_cuota
   LIMIT p_limite
 LOOP
   v_procesados:=v_procesados+1;
   v_clave:=concat('FIN_CUOTA:',v_r.id_cuota,':',v_r.tipo_alerta,':',
                   to_char(v_r.fecha_vencimiento,'YYYY-MM-DD'));
   v_titulo:=CASE WHEN v_r.tipo_alerta='CUOTA_VENCIDA' THEN
     'Cuota vencida - contrato '||v_r.codigo_venta
     ELSE 'Próximo vencimiento - contrato '||v_r.codigo_venta END;
   v_mensaje:=CASE WHEN v_r.tipo_alerta='CUOTA_VENCIDA' THEN
       format('La cuota %s venció el %s. Saldo pendiente: S/ %s.',
          v_r.numero_cuota,to_char(v_r.fecha_vencimiento,'DD/MM/YYYY'),
          to_char(v_r.saldo_cuota,'FM999999999.00'))
     ELSE
       format('La cuota %s vence el %s. Saldo pendiente: S/ %s.',
          v_r.numero_cuota,to_char(v_r.fecha_vencimiento,'DD/MM/YYYY'),
          to_char(v_r.saldo_cuota,'FM999999999.00'))
     END;
   INSERT INTO public.not_notificaciones(
       id_persona,id_tipo_notificacion,titulo,mensaje,
       referencia_modulo,referencia_entidad,referencia_id,
       datos_contexto,clave_deduplicacion,id_usuario_generacion,activo
   ) VALUES(
       v_r.id_persona,v_r.id_tipo_notificacion,v_titulo,v_mensaje,
       'FINANCIAMIENTO','pag_cuotas',v_r.id_cuota::varchar,
       jsonb_build_object('idVenta',v_r.id_venta,'idCuota',v_r.id_cuota,
          'fechaVencimiento',to_char(v_r.fecha_vencimiento,'YYYY-MM-DD'),
          'tipoAlerta',v_r.tipo_alerta,'saldoCuota',v_r.saldo_cuota,
          'fechaCorte',to_char(v_corte,'YYYY-MM-DD')),
       v_clave,p_actor,true
   )
   ON CONFLICT(clave_deduplicacion) DO NOTHING
   RETURNING id_notificacion INTO v_nuevo;
   IF v_nuevo IS NULL THEN
     v_omitidos:=v_omitidos+1;
   ELSE
     v_creados:=v_creados+1;
   END IF;
   v_nuevo:=NULL;
 END LOOP;
 RETURN jsonb_build_object(
   'fechaCorte',to_char(v_corte,'YYYY-MM-DD'),
   'procesados',v_procesados,'creados',v_creados,'deduplicados',v_omitidos,
   'desactivados',v_desactivados,
   'canal','PORTAL','enviosExternos',false);
END;
$fn$;

REVOKE ALL ON FUNCTION public.fn_fin_alertas_cuotas_base_v1(date)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_fin_alertas_cuotas_base_v1(date) TO sigi_app_user;

REVOKE ALL ON FUNCTION public.sp_fin_alertas_cuotas_v1(bigint,varchar,integer,integer)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_fin_alertas_cuotas_v1(bigint,varchar,integer,integer)
  TO sigi_app_user;

REVOKE ALL ON FUNCTION public.sp_fin_preparar_avisos_portal_v1(bigint,integer)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_fin_preparar_avisos_portal_v1(bigint,integer)
  TO sigi_app_user;
