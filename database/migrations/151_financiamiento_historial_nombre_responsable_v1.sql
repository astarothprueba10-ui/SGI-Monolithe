-- 151: mostrar el nombre del publicador en las consultas autorizadas de historial.
-- No cambia las políticas ni sus registros históricos.
BEGIN;
CREATE OR REPLACE FUNCTION public.sp_fin_consultar_politicas_proyecto_v2(p_actor bigint, p_proyecto bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE v_id bigint; v_local public.cfg_fin_politicas_versiones%ROWTYPE; v_hist jsonb;
BEGIN
 IF NOT public.fn_fin_gerencia_autorizada_v1(p_actor) THEN
  RAISE EXCEPTION 'ACCESO_DENEGADO|Solo Gerencia autorizada.';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.inm_proyectos WHERE id_proyecto=p_proyecto AND activo) THEN
  RAISE EXCEPTION 'BORRADOR_INVALIDO|Proyecto inexistente o inactivo.';
 END IF;
 v_id:=public.fn_fin_politica_proyecto_id_v2(p_proyecto);
 IF v_id IS NULL THEN RAISE EXCEPTION 'POLITICA_NO_DISPONIBLE|Falta política vigente.'; END IF;
 SELECT p.* INTO v_local FROM public.cfg_fin_politica_proyecto_activa a
 JOIN public.cfg_fin_politicas_versiones p USING(id_politica,codigo)
 WHERE a.id_proyecto=p_proyecto;
 SELECT coalesce(jsonb_agg(jsonb_build_object('idPolitica',h.id_politica,'version',h.version,
  'vigenteDesde',h.vigente_desde,'publicadoEn',h.publicado_en,'motivo',h.motivo_publicacion,
  'idPublicador',h.id_usuario_publicador, 'nombrePublicador',(
 SELECT nullif(concat_ws(' ',nullif(btrim(pe.nombres),''),nullif(btrim(pe.apellido_paterno),''),nullif(btrim(pe.apellido_materno),'')),'')
 FROM public.seg_usuarios u JOIN public.core_personas pe ON pe.id_persona=u.id_persona
 WHERE u.id_usuario=h.id_usuario_publicador
 ),'modoAplicacion',h.modo_aplicacion)
  ORDER BY h.version DESC),'[]'::jsonb) INTO v_hist
 FROM (SELECT * FROM public.cfg_fin_politicas_versiones WHERE codigo='PROYECTO:'||p_proyecto::text
 ORDER BY version DESC LIMIT 30) h;
 RETURN public.fn_fin_snapshot_politica_v1(v_id)||jsonb_build_object(
  'idProyecto',p_proyecto,'modoAplicacion',coalesce(v_local.modo_aplicacion,'GENERAL'),
  'idPoliticaProyecto',v_local.id_politica,'versionSiguiente',coalesce(v_local.version,0)+1,
  'politicaGeneral',public.fn_fin_politica_activa_v1(),'historial',v_hist,'requiereTotp',true,
  'publicacionHabilitada',coalesce((SELECT habilitado FROM public.cfg_fin_publicacion_control WHERE id=1),false));
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_fin_consultar_politicas_v1(p_actor bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
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
    'motivo',h.motivo_publicacion,'idPublicador',h.id_usuario_publicador, 'nombrePublicador',(
 SELECT nullif(concat_ws(' ',nullif(btrim(pe.nombres),''),nullif(btrim(pe.apellido_paterno),''),nullif(btrim(pe.apellido_materno),'')),'')
 FROM public.seg_usuarios u JOIN public.core_personas pe ON pe.id_persona=u.id_persona
 WHERE u.id_usuario=h.id_usuario_publicador
 )
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
$function$;

COMMIT;
