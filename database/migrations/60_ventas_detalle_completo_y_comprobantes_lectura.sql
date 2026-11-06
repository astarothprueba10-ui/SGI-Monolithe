-- SGI MONOLITHE | Ficha de venta, histórico contractual y visualización privada.
-- Solo lectura; no altera registros existentes, contratos ni importes.
-- Reutiliza el alcance por actor de sp_crm_listar_operaciones_v1.
CREATE OR REPLACE FUNCTION public.fn_crm_puede_consultar_venta_v1(
  p_actor bigint,p_venta bigint)
RETURNS boolean LANGUAGE sql STABLE
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
 SELECT p_actor IS NOT NULL AND p_actor>0
 AND p_venta IS NOT NULL AND p_venta>0
 AND coalesce(public.fn_usuario_tiene_permiso_seguridad(
   p_actor,'sales.view'::varchar),false)
 AND EXISTS (
   SELECT 1 FROM public.ven_ventas v
   WHERE v.id_venta=p_venta AND
   (
      EXISTS (
        SELECT 1 FROM public.seg_usuarios_roles ur
        JOIN public.seg_roles rol ON rol.id_rol=ur.id_rol
        WHERE ur.id_usuario=p_actor AND ur.activo
          AND ur.fecha_revocacion IS NULL AND rol.activo
          AND rol.codigo IN ('ADMINISTRADOR','GERENCIA','SUPERVISOR_COMERCIAL','FINANZAS')
      )
      OR v.id_usuario_registro=p_actor
      OR EXISTS (
        SELECT 1 FROM public.com_ventas_asesores va
        JOIN public.com_asesores asesor ON asesor.id_asesor=va.id_asesor
        JOIN public.seg_usuarios u ON u.id_persona=asesor.id_persona
        WHERE va.id_venta=v.id_venta AND u.id_usuario=p_actor
      )
   )
 );
$fn$;

CREATE OR REPLACE FUNCTION public.sp_crm_detalle_venta_v1(
  p_actor bigint,p_venta bigint
) RETURNS jsonb LANGUAGE plpgsql STABLE
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE
 v_respuesta jsonb;
BEGIN
 IF NOT coalesce(public.fn_crm_puede_consultar_venta_v1(p_actor,p_venta),false)
 THEN RAISE EXCEPTION 'VENTA_NO_DISPONIBLE|Venta no encontrada o fuera de su cartera.'; END IF;

 SELECT jsonb_build_object(
  'idVenta',v.id_venta,
  'codigoVenta',v.codigo,
  'modalidad',modalidad.codigo,
  'precioVenta',v.precio_venta,
  'tieneExpediente',snap.id_venta IS NOT NULL,
  'comprador',jsonb_build_object(
    'nombreCompleto',trim(concat_ws(' ',per.nombres,per.apellido_paterno,per.apellido_materno)),
    'tipoDocumento',coalesce(nullif(snap.datos_revisados->>'tipoDocumento',''),doc.tipo),
    'numeroDocumento',coalesce(nullif(snap.datos_revisados->>'numeroDocumento',''),doc.numero),
    'telefono',coalesce(nullif(snap.datos_revisados->>'telefono',''),tel.valor),
    'correo',coalesce(nullif(snap.datos_revisados->>'correo',''),mail.valor),
    'estadoCivil',coalesce(nullif(snap.datos_revisados->>'estadoCivil',''),per.estado_civil_codigo)
  ),
  'conyuge',CASE WHEN
      coalesce(snap.datos_revisados->>'estadoCivil',per.estado_civil_codigo)='CASADO'
      THEN coalesce(
        CASE WHEN jsonb_typeof(snap.datos_revisados->'conyuge')='object'
             THEN snap.datos_revisados->'conyuge' END,
        CASE WHEN spouse.id_persona IS NOT NULL THEN jsonb_build_object(
          'nombres',spouse.nombres,'apellidoPaterno',spouse.apellido_paterno,
          'apellidoMaterno',spouse.apellido_materno,
          'telefono',spouse.telefono,'correo',spouse.correo,
          'tipoDocumento',spouse.tipo_documento,'numeroDocumento',spouse.numero_documento)
        END)
     ELSE NULL END,
  'domicilio',jsonb_build_object(
    'direccion',coalesce(nullif(snap.datos_revisados->>'direccion',''),dir.direccion),
    'referencia',coalesce(nullif(snap.datos_revisados->>'referencia',''),dir.referencia),
    'pais',coalesce(pais.nombre,dir.pais),
    'departamento',coalesce(dep.nombre,dir.departamento),
    'provincia',coalesce(prov.nombre,dir.provincia),
    'distrito',coalesce(dist.nombre,dir.distrito)
  ),
  'pago',jsonb_build_object(
     'metodo',coalesce(met.nombre,pago_legacy.metodo),
     'numeroOperacion',coalesce(mp.numero_operacion,pago_legacy.numero_operacion),
     'tipoAbono',mp.tipo_abono,
     'montoPorRevisar',mp.monto_pendiente_revision,
     'estadoRevision',mp.estado_revision,
     'comprobantes',coalesce(vouchers.items,'[]'::jsonb)
  ),
  'financiamiento',CASE WHEN modalidad.codigo='FINANCIADA' AND plan.id_plan_pago IS NOT NULL
    THEN jsonb_build_object(
      'sistema',CASE
         WHEN plan.descripcion_condiciones LIKE 'FRANCES_%' THEN 'FRANCES'
         WHEN plan.descripcion_condiciones LIKE 'ALEMAN_%' THEN 'ALEMAN'
         ELSE 'NO_REGISTRADO' END,
      'montoInicial',plan.monto_inicial,
      'abonoReserva',plan.monto_reserva_aplicada,
      'capitalFinanciado',plan.capital_financiado,
      'numeroCuotas',plan.numero_cuotas,
      'interesesTotales',plan.monto_interes_total,
      'totalPendienteEnCuotas',plan.monto_total_financiado,
      'saldoCuotasPendiente',CASE
         WHEN cuotas.numero_registros>0 THEN cuotas.saldo_pendiente
         ELSE plan.monto_total_financiado END,
      'tasaAnualNominal',CASE
          WHEN plan.descripcion_condiciones LIKE 'FRANCES_ANUAL_FIJA_10_%' THEN 10
          WHEN plan.descripcion_condiciones LIKE 'FRANCES_ANUAL_FIJA_5_%'
            OR plan.descripcion_condiciones LIKE 'ALEMAN_ANUAL_FIJA_5_%' THEN 5
          ELSE NULL END,
      'cuotaMensual',coalesce(cuotas.primera_cuota,
          CASE WHEN plan.numero_cuotas>0 AND plan.capital_financiado>0
           AND plan.descripcion_condiciones LIKE 'FRANCES_ANUAL_FIJA_10_%'
           THEN round(plan.capital_financiado*(10::numeric/1200)/
                (1-power(1+(10::numeric/1200),-plan.numero_cuotas)),2)
          WHEN plan.numero_cuotas>0 AND plan.capital_financiado>0
           AND plan.descripcion_condiciones LIKE 'FRANCES_ANUAL_FIJA_5_%'
           THEN round(plan.capital_financiado*(5::numeric/1200)/
                (1-power(1+(5::numeric/1200),-plan.numero_cuotas)),2)
          ELSE NULL END),
      'cuotaFija',plan.descripcion_condiciones LIKE 'FRANCES_%',
      'descripcionCondiciones',plan.descripcion_condiciones)
    ELSE NULL END
 ) INTO v_respuesta
 FROM public.ven_ventas v
 JOIN public.cfg_modalidades_venta modalidad
   ON modalidad.id_modalidad_venta=v.id_modalidad_venta
 LEFT JOIN public.ven_ventas_clientes titular
   ON titular.id_venta=v.id_venta AND titular.titular
 LEFT JOIN public.crm_clientes cl ON cl.id_cliente=titular.id_cliente
 LEFT JOIN public.core_personas per ON per.id_persona=cl.id_persona
 LEFT JOIN public.crm_ventas_datos_comprador snap ON snap.id_venta=v.id_venta
 LEFT JOIN LATERAL (
   SELECT t.codigo AS tipo, d.numero_documento AS numero
   FROM public.core_personas_documentos d
   JOIN public.cfg_tipos_documento t ON t.id_tipo_documento=d.id_tipo_documento
   WHERE d.id_persona=per.id_persona AND d.activo
   ORDER BY d.principal DESC,d.id_persona_documento DESC LIMIT 1
 ) doc ON true
 LEFT JOIN LATERAL (
   SELECT c.valor FROM public.core_personas_contactos c
   JOIN public.cfg_tipos_contacto t ON t.id_tipo_contacto=c.id_tipo_contacto
   WHERE c.id_persona=per.id_persona AND c.activo AND t.codigo='EMAIL'
   ORDER BY c.principal DESC,c.id_persona_contacto DESC LIMIT 1
 ) mail ON true
 LEFT JOIN LATERAL (
   SELECT c.valor FROM public.core_personas_contactos c
   JOIN public.cfg_tipos_contacto t ON t.id_tipo_contacto=c.id_tipo_contacto
   WHERE c.id_persona=per.id_persona AND c.activo
     AND t.codigo IN('CELULAR','TELEFONO','WHATSAPP')
   ORDER BY c.principal DESC,c.id_persona_contacto DESC LIMIT 1
 ) tel ON true
 LEFT JOIN LATERAL (
   SELECT d.* FROM public.core_personas_direcciones d
   WHERE d.id_persona=per.id_persona AND d.activo
   ORDER BY d.principal DESC,d.id_persona_direccion DESC LIMIT 1
 ) dir ON true
 LEFT JOIN public.cfg_ubicaciones_geograficas pais
   ON pais.id_ubicacion = CASE
      WHEN (snap.datos_revisados->>'idPais') ~ '^[0-9]+$'
      THEN (snap.datos_revisados->>'idPais')::bigint ELSE NULL END
 LEFT JOIN public.cfg_ubicaciones_geograficas dep
   ON dep.id_ubicacion = CASE
      WHEN (snap.datos_revisados->>'idDepartamento') ~ '^[0-9]+$'
      THEN (snap.datos_revisados->>'idDepartamento')::bigint ELSE NULL END
 LEFT JOIN public.cfg_ubicaciones_geograficas prov
   ON prov.id_ubicacion = CASE
      WHEN (snap.datos_revisados->>'idProvincia') ~ '^[0-9]+$'
      THEN (snap.datos_revisados->>'idProvincia')::bigint ELSE NULL END
 LEFT JOIN public.cfg_ubicaciones_geograficas dist
   ON dist.id_ubicacion = CASE
      WHEN (snap.datos_revisados->>'idDistrito') ~ '^[0-9]+$'
      THEN (snap.datos_revisados->>'idDistrito')::bigint ELSE NULL END
 LEFT JOIN public.core_personas_conyuges spouse
   ON spouse.id_persona=per.id_persona AND spouse.activo
 LEFT JOIN public.ven_ventas_medios_pago mp ON mp.id_venta=v.id_venta
 LEFT JOIN public.cfg_metodos_pago met ON met.id_metodo_pago=mp.id_metodo_pago
 LEFT JOIN LATERAL (
   SELECT m.nombre metodo, pg.numero_operacion
   FROM public.pag_pagos pg
   JOIN public.cfg_metodos_pago m ON m.id_metodo_pago=pg.id_metodo_pago
   WHERE pg.id_venta=v.id_venta
   ORDER BY pg.fecha_operacion DESC NULLS LAST,pg.id_pago DESC LIMIT 1
 ) pago_legacy ON true
 LEFT JOIN LATERAL (
   SELECT jsonb_agg(jsonb_build_object(
      'idComprobante',c.id_comprobante,
      'nombreArchivo',c.nombre_archivo,
      'tipoMime',c.tipo_mime,
      'tamanioBytes',c.tamanio_bytes,
      'estadoRevision',c.estado_revision
   ) ORDER BY c.id_comprobante) items
   FROM public.ven_ventas_comprobantes c WHERE c.id_venta=v.id_venta
 ) vouchers ON true
 LEFT JOIN LATERAL (
   SELECT pp.* FROM public.pag_planes_pago pp WHERE pp.id_venta=v.id_venta
   ORDER BY pp.es_vigente DESC,pp.numero_version DESC,pp.id_plan_pago DESC
   LIMIT 1
 ) plan ON true
 LEFT JOIN LATERAL (
   SELECT count(c.id_cuota) numero_registros,
          coalesce(sum(c.monto_cuota) FILTER
            (WHERE c.fecha_pago_completo IS NULL),0) saldo_pendiente,
          (SELECT cc.monto_cuota FROM public.pag_cuotas cc
            WHERE cc.id_plan_pago=plan.id_plan_pago
            ORDER BY cc.numero_cuota ASC,cc.id_cuota ASC LIMIT 1) primera_cuota
   FROM public.pag_cuotas c
   WHERE c.id_plan_pago=plan.id_plan_pago
 ) cuotas ON true
 WHERE v.id_venta=p_venta;

 RETURN coalesce(v_respuesta,'{}'::jsonb);
END
$fn$;

CREATE OR REPLACE FUNCTION public.sp_crm_autorizar_lectura_comprobante_venta_v1(
  p_actor bigint,p_venta bigint,p_comprobante bigint
) RETURNS jsonb LANGUAGE plpgsql STABLE
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE v_result jsonb;
BEGIN
 IF NOT coalesce(public.fn_crm_puede_consultar_venta_v1(p_actor,p_venta),false)
 THEN RAISE EXCEPTION 'VENTA_NO_DISPONIBLE|Venta no encontrada o fuera de su cartera.'; END IF;
 SELECT jsonb_build_object(
    'bucket',c.bucket,'clave_archivo',c.clave_archivo,
    'nombre_archivo',c.nombre_archivo,'tipo_mime',c.tipo_mime)
 INTO v_result FROM public.ven_ventas_comprobantes c
 WHERE c.id_venta=p_venta AND c.id_comprobante=p_comprobante
   AND c.bucket='vouchers-ventas-private';
 IF v_result IS NULL THEN
   RAISE EXCEPTION 'COMPROBANTE_NO_DISPONIBLE|No existe comprobante de esta venta.';
 END IF;
 RETURN v_result;
END $fn$;

-- Funciones expuestas únicamente al backend de Java, no al cliente Supabase.
REVOKE ALL ON FUNCTION public.fn_crm_puede_consultar_venta_v1(bigint,bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_crm_puede_consultar_venta_v1(bigint,bigint)
 TO sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_crm_detalle_venta_v1(bigint,bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_detalle_venta_v1(bigint,bigint)
 TO sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_crm_autorizar_lectura_comprobante_venta_v1(bigint,bigint,bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_autorizar_lectura_comprobante_venta_v1(bigint,bigint,bigint)
 TO sigi_app_user;
