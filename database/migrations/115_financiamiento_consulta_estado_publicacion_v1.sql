-- SGI MONOLITHE | Bloque 4/3
-- La consulta devuelve estado real del candado de publicación, siempre con control de rol.
BEGIN;
CREATE OR REPLACE FUNCTION public.sp_fin_consultar_politicas_v1(p_actor bigint)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $$
DECLARE
 v public.cfg_fin_politicas_versiones%ROWTYPE;
 v_historial jsonb;
BEGIN
 IF p_actor IS NULL
    OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'financing.configure'::varchar),false)
    OR NOT EXISTS(
      SELECT 1
        FROM public.seg_usuarios_roles ur
        JOIN public.seg_roles r ON r.id_rol=ur.id_rol AND r.activo
       WHERE ur.id_usuario=p_actor AND ur.activo AND ur.fecha_revocacion IS NULL
         AND r.codigo='GERENCIA'
    )
 THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO|Solo Gerencia autorizada puede consultar configuraciones financieras.';
 END IF;

 SELECT pv.* INTO v
   FROM public.cfg_fin_politica_activa pa
   JOIN public.cfg_fin_politicas_versiones pv
     ON pv.id_politica=pa.id_politica AND pv.codigo=pa.codigo
  WHERE pa.id=1 AND pa.codigo='GENERAL';

 IF NOT FOUND THEN
   RAISE EXCEPTION 'POLITICA_NO_DISPONIBLE|No existe una política financiera activa.';
 END IF;

 SELECT coalesce(jsonb_agg(jsonb_build_object(
    'idPolitica',h.id_politica,'version',h.version,
    'vigenteDesde',h.vigente_desde,'publicadoEn',h.publicado_en,
    'motivo',h.motivo_publicacion,'idPublicador',h.id_usuario_publicador
 ) ORDER BY h.version DESC),'[]'::jsonb) INTO v_historial
 FROM (
    SELECT id_politica,version,vigente_desde,publicado_en,motivo_publicacion,id_usuario_publicador
      FROM public.cfg_fin_politicas_versiones
     WHERE codigo='GENERAL'
     ORDER BY version DESC LIMIT 30
 ) h;

 RETURN jsonb_build_object(
   'codigo',v.codigo,
   'version',v.version,
   'idPolitica',v.id_politica,
   'vigenteDesde',v.vigente_desde,
   'montoSeparacion',v.monto_separacion,
   'modoInicial',v.modo_inicial,
   'inicialMinima',v.inicial_minima,
   'inicialMaxima',v.inicial_maxima,
   'inicialFija',v.inicial_fija,
   'tasaNominalAnualPct',v.tasa_nominal_anual_pct,
   'cuotasMin',v.cuotas_min,
   'cuotasMax',v.cuotas_max,
   'diasVencimientoSeparacion',v.dias_vencimiento_separacion,
   'sistemaAmortizacion',v.sistema_amortizacion,
   'moneda',v.moneda,
   'historial',v_historial,
   'publicacionHabilitada',coalesce((SELECT habilitado FROM public.cfg_fin_publicacion_control WHERE id=1),false),
   'requiereTotp',true
 );
END;
$$;

REVOKE ALL ON FUNCTION public.sp_fin_consultar_politicas_v1(bigint)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.sp_fin_consultar_politicas_v1(bigint) TO sigi_app_user;
COMMIT;
