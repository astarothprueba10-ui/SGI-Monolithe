-- 168: alcances laborales y aprobación segregada configurables.
BEGIN;
CREATE TEMP TABLE rbac_hr_before ON COMMIT DROP AS
 SELECT u.id_usuario,public.fn_rrhh_actor_gestion_integral(u.id_usuario) integral,
 (public.fn_usuario_tiene_permiso_seguridad(u.id_usuario,'hr.approve') AND EXISTS(
 SELECT 1 FROM public.seg_usuarios_roles ur JOIN public.seg_roles r USING(id_rol)
 WHERE ur.id_usuario=u.id_usuario AND ur.activo AND ur.fecha_revocacion IS NULL AND r.activo AND r.codigo='ADMINISTRADOR')) reincorp
 FROM public.seg_usuarios u;
CREATE OR REPLACE FUNCTION public.fn_sincronizar_permiso_gerencia()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog','public','pg_temp'
AS $function$
DECLARE
    v_id_gerencia INT;
BEGIN

    -- Revisiones jurídicamente independientes: Gerencia aprueba,
    -- pero no emite dictámenes del área legal.
    IF NEW.codigo IN (
                'sales.legal.review',
                'annulments.review_finance',
                'annulments.review_legal',
                'crm.operate_advisor',
                'hr.manage_all','hr.approve_reincorporation','hr.approve_documents'
            ) THEN
        UPDATE public.seg_roles_permisos rp
        SET activo=FALSE
        FROM public.seg_roles r
        WHERE rp.id_rol=r.id_rol
          AND r.codigo='GERENCIA'
          AND rp.id_permiso=NEW.id_permiso;
        RETURN NEW;
    END IF;

    SELECT id_rol
    INTO v_id_gerencia
    FROM public.seg_roles
    WHERE codigo = 'GERENCIA'
    LIMIT 1;

    IF v_id_gerencia IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.activo = TRUE THEN

        INSERT INTO public.seg_roles_permisos (
            id_rol,
            id_permiso,
            activo
        )
        VALUES (
            v_id_gerencia,
            NEW.id_permiso,
            TRUE
        )
        ON CONFLICT (id_rol, id_permiso)
        DO UPDATE SET
            activo = TRUE;

    ELSE

        UPDATE public.seg_roles_permisos
        SET activo = FALSE
        WHERE id_rol = v_id_gerencia
          AND id_permiso = NEW.id_permiso;

    END IF;

    RETURN NEW;
END;
$function$;
INSERT INTO public.seg_permisos(codigo,modulo,recurso,accion,nombre,descripcion)
VALUES ('hr.manage_all','hr','hr','manage_all','Gestionar expedientes laborales protegidos','Capacidad laboral protegida, separada de los permisos básicos de edición y aprobación.'),
('hr.approve_reincorporation','hr','hr','approve_reincorporation','Resolver reincorporaciones','Capacidad laboral protegida, separada de los permisos básicos de edición y aprobación.'),
('hr.approve_documents','hr','hr','approve_documents','Revisar correcciones documentales de RRHH','Capacidad laboral protegida, separada de los permisos básicos de edición y aprobación.')
ON CONFLICT(codigo) DO NOTHING;
INSERT INTO public.seg_roles_permisos(id_rol,id_permiso,activo)
SELECT r.id_rol,p.id_permiso,true FROM (VALUES ('RRHH','hr.manage_all'),('ADMINISTRADOR','hr.approve_reincorporation'),('RRHH','hr.approve_documents')) v(rol,permiso)
JOIN public.seg_roles r ON r.codigo=v.rol JOIN public.seg_permisos p ON p.codigo=v.permiso
ON CONFLICT(id_rol,id_permiso) DO NOTHING;

CREATE OR REPLACE FUNCTION public.fn_rrhh_actor_gestion_integral(p_id_actor bigint)
RETURNS boolean LANGUAGE sql STABLE SET search_path TO pg_catalog,public,pg_temp AS $fn$
 SELECT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_id_actor,'hr.edit'),false)
 AND coalesce(public.fn_usuario_tiene_permiso_seguridad(p_id_actor,'hr.manage_all'),false);
$fn$;

CREATE OR REPLACE PROCEDURE public.sp_rrhh_cesar_trabajador(IN p_id_actor bigint, IN p_id_trabajador bigint, IN p_fecha_cese date, IN p_motivo text, OUT p_resultado jsonb, OUT p_estado character varying, OUT p_mensaje character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $procedure$
DECLARE
 v_t public.rrhh_trabajadores%ROWTYPE;
 v_estado_actual TEXT;
 v_estado_cesado INTEGER;
 v_id_historial BIGINT;
 v_nombre TEXT;
 v_tipo_notificacion INTEGER;
 v_notificaciones INTEGER;
BEGIN
 p_resultado:=NULL; p_estado:='DATOS_INVALIDOS';
 p_mensaje:='Datos de cese inválidos.';
 IF p_id_actor IS NULL OR p_id_trabajador IS NULL OR p_id_trabajador<=0
    OR NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_id_actor,'hr.edit'),FALSE)
 THEN
   p_estado:='DENEGADO'; p_mensaje:='No tiene permisos para cesar trabajadores.'; RETURN;
 END IF;
 IF p_fecha_cese IS NULL OR LENGTH(COALESCE(BTRIM(p_motivo),'')) NOT BETWEEN 10 AND 1000 THEN
   p_estado:='DATOS_INVALIDOS';
   p_mensaje:='Indique fecha de cese y motivo de 10 a 1000 caracteres.';RETURN;
 END IF;

 SELECT * INTO v_t FROM public.rrhh_trabajadores
 WHERE id_trabajador=p_id_trabajador FOR UPDATE;
 IF NOT FOUND THEN
  p_estado:='NO_ENCONTRADO';p_mensaje:='Trabajador no encontrado.'; RETURN;
 END IF;

 IF NOT public.fn_rrhh_puede_cambiar_estado(p_id_actor, v_t.id_persona) AND (
   EXISTS (SELECT 1 FROM public.rrhh_cargos c
            WHERE c.id_cargo=v_t.id_cargo AND c.codigo='GERENTE_GENERAL')
   OR EXISTS (SELECT 1 FROM public.seg_usuarios u
     JOIN public.seg_usuarios_roles ur ON ur.id_usuario=u.id_usuario AND ur.activo
     JOIN public.seg_roles r ON r.id_rol=ur.id_rol AND r.activo
     WHERE u.id_persona=v_t.id_persona AND r.codigo='GERENCIA')
   OR NOT COALESCE(public.fn_seguridad_puede_bloquear_persona(
     p_id_actor,v_t.id_persona),FALSE)
 )
 THEN
    p_estado:='USUARIO_PROTEGIDO';
    p_mensaje:='No puede cesar a un trabajador protegido.';
    RETURN;
 END IF;

 SELECT codigo INTO v_estado_actual FROM public.cfg_estados_trabajador
 WHERE id_estado_trabajador=v_t.id_estado_trabajador;
 IF v_estado_actual NOT IN ('ACTIVO','INACTIVO','SUSPENDIDO') THEN
   p_estado:='ESTADO_INVALIDO';
   p_mensaje:='No se permite cesar desde el estado laboral actual.';
   RETURN;
 END IF;
 IF p_fecha_cese < v_t.fecha_ingreso OR p_fecha_cese > CURRENT_DATE THEN
   p_estado:='FECHAS_INVALIDAS';
   p_mensaje:='Fecha de cese fuera del período laboral.';
   RETURN;
 END IF;

 SELECT id_estado_trabajador INTO v_estado_cesado
 FROM public.cfg_estados_trabajador WHERE codigo='CESADO' AND activo=TRUE;
 SELECT id_tipo_notificacion INTO v_tipo_notificacion
 FROM public.cfg_tipos_notificacion WHERE codigo='GENERAL' AND activo=TRUE;
 IF v_estado_cesado IS NULL OR v_tipo_notificacion IS NULL THEN
   p_estado:='CONFIGURACION_INVALIDA';
   p_mensaje:='Faltan estados o tipo de notificación.';
   RETURN;
 END IF;
 IF NOT EXISTS(
   SELECT 1 FROM public.seg_usuarios u
   JOIN public.seg_usuarios_roles ur ON ur.id_usuario=u.id_usuario AND ur.activo
   JOIN public.seg_roles r ON r.id_rol=ur.id_rol AND r.activo AND public.fn_usuario_tiene_permiso_seguridad(u.id_usuario,'hr.approve_reincorporation') AND public.fn_usuario_tiene_permiso_seguridad(u.id_usuario,'hr.approve')
   JOIN public.cfg_estados_usuario eu ON eu.id_estado_usuario=u.id_estado_usuario
   WHERE eu.codigo='ACTIVO' AND eu.permite_acceso=TRUE
 ) THEN
   p_estado:='SIN_ADMINISTRADOR';
   p_mensaje:='No hay administrador activo para notificar el cese.';
   RETURN;
 END IF;

 -- Un cese cancela suspensiones futuras o vigentes.
 UPDATE public.rrhh_suspensiones_laborales
 SET estado='CANCELADA',fecha_cancelacion=NOW(),
     error_ultimo='Cancelada por cese laboral.',
     fecha_actualizacion=NOW()
 WHERE id_trabajador=p_id_trabajador AND estado IN ('PROGRAMADA','VIGENTE');

 UPDATE public.rrhh_trabajadores
 SET id_estado_trabajador=v_estado_cesado,
     fecha_cese=p_fecha_cese
 WHERE id_trabajador=p_id_trabajador;

 INSERT INTO public.rrhh_trabajadores_historial_laboral(
   id_trabajador,id_estado_anterior,id_estado_nuevo,
   fecha_ingreso_anterior,fecha_ingreso_nueva,
   fecha_cese_anterior,fecha_cese_nueva,motivo,id_usuario_actor)
 VALUES(
   p_id_trabajador,v_t.id_estado_trabajador,v_estado_cesado,
   v_t.fecha_ingreso,v_t.fecha_ingreso,
   v_t.fecha_cese,p_fecha_cese,BTRIM(p_motivo),p_id_actor
 )
 RETURNING id_historial INTO v_id_historial;

 SELECT CONCAT_WS(' ',p.nombres,p.apellido_paterno,p.apellido_materno)
 INTO v_nombre FROM public.core_personas p WHERE p.id_persona=v_t.id_persona;

 INSERT INTO public.not_notificaciones(
   id_persona,id_tipo_notificacion,titulo,mensaje,url_destino,
   referencia_modulo,referencia_entidad,referencia_id,
   datos_contexto,clave_deduplicacion,id_usuario_generacion
 )
 SELECT DISTINCT
   u.id_persona,v_tipo_notificacion,'Cese de trabajador',
   LEFT('El trabajador '||v_nombre||' ('||v_t.codigo||') cesó el día '||
    TO_CHAR(p_fecha_cese,'DD/MM/YYYY')||'.',1000),
   '/trabajadores',
   'RRHH','rrhh_trabajadores',p_id_trabajador::VARCHAR,
   jsonb_build_object('tipo','CESE','idTrabajador',p_id_trabajador,
      'idHistorial',v_id_historial,'fechaCese',p_fecha_cese),
   'RRHH_CESE_'||v_id_historial||'_'||u.id_usuario,
   p_id_actor
 FROM public.seg_usuarios u
 JOIN public.seg_usuarios_roles ur ON ur.id_usuario=u.id_usuario AND ur.activo
 JOIN public.seg_roles r ON r.id_rol=ur.id_rol AND r.activo AND public.fn_usuario_tiene_permiso_seguridad(u.id_usuario,'hr.approve_reincorporation') AND public.fn_usuario_tiene_permiso_seguridad(u.id_usuario,'hr.approve')
 JOIN public.cfg_estados_usuario eu ON eu.id_estado_usuario=u.id_estado_usuario
 WHERE eu.codigo='ACTIVO' AND eu.permite_acceso=TRUE
 ON CONFLICT (clave_deduplicacion) DO NOTHING;

 GET DIAGNOSTICS v_notificaciones=ROW_COUNT;

 PERFORM public.sp_registrar_auditoria(
  p_id_actor,'RRHH'::VARCHAR,'CESAR'::VARCHAR,
  'rrhh_trabajadores'::VARCHAR,p_id_trabajador::VARCHAR,
  'EXITOSO'::VARCHAR,'Cese laboral aplicado y comunicado al Administrador.'::VARCHAR,
  jsonb_build_object('fechaCese',p_fecha_cese,'idHistorial',v_id_historial)
 );

 p_resultado:=jsonb_build_object('idTrabajador',p_id_trabajador,
   'estadoLaboral','CESADO','fechaCese',p_fecha_cese,
   'notificacionesAdministradores',v_notificaciones);
 p_estado:='OK';
 p_mensaje:='Cese aplicado y administrador notificado.';
END
$procedure$;

CREATE OR REPLACE PROCEDURE public.sp_rrhh_listar_reincorporaciones(IN p_id_actor bigint, IN p_estado character varying, IN p_id_trabajador bigint, OUT p_resultado jsonb, OUT p_estado_respuesta character varying, OUT p_mensaje character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $procedure$
DECLARE
    v_estado_filtro TEXT := UPPER(NULLIF(BTRIM(p_estado),''));
    v_solicitudes JSONB;
    v_puede_aprobar BOOLEAN;
BEGIN
    p_resultado:=NULL;
    p_estado_respuesta:='DENEGADO';
    p_mensaje:='No está autorizado para consultar reincorporaciones.';

    IF p_id_actor IS NULL
       OR NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_id_actor,'hr.view'),FALSE)
    THEN RETURN; END IF;

    IF v_estado_filtro IS NOT NULL
       AND v_estado_filtro NOT IN ('PENDIENTE','APROBADA','RECHAZADA','CANCELADA')
       OR (p_id_trabajador IS NOT NULL AND p_id_trabajador<=0)
    THEN
       p_estado_respuesta:='DATOS_INVALIDOS';
       p_mensaje:='Filtro de solicitudes inválido.';
       RETURN;
    END IF;

    SELECT EXISTS(
        SELECT 1
        FROM public.seg_usuarios u
        JOIN public.cfg_estados_usuario eu ON eu.id_estado_usuario=u.id_estado_usuario
        JOIN public.seg_usuarios_roles ur ON ur.id_usuario=u.id_usuario AND ur.activo=TRUE
        JOIN public.seg_roles r ON r.id_rol=ur.id_rol AND r.activo=TRUE
        WHERE u.id_usuario=p_id_actor
          AND eu.codigo='ACTIVO' AND eu.activo=TRUE AND eu.permite_acceso=TRUE
          AND public.fn_usuario_tiene_permiso_seguridad(u.id_usuario,'hr.approve_reincorporation') AND public.fn_usuario_tiene_permiso_seguridad(u.id_usuario,'hr.approve')
    ) AND COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_id_actor,'hr.approve'),FALSE)
    INTO v_puede_aprobar;

    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
          'idSolicitud', x.id_solicitud,
          'idTrabajador', x.id_trabajador,
          'codigoTrabajador', x.codigo_trabajador,
          'nombreTrabajador', x.nombre_trabajador,
          'estadoLaboral', x.estado_laboral,
          'nuevaFechaIngreso', x.nueva_fecha_ingreso,
          'motivo', x.motivo,
          'estado', x.estado,
          'fechaSolicitud', x.fecha_solicitud,
          'fechaResolucion', x.fecha_resolucion,
          'motivoResolucion', x.motivo_resolucion,
          'idUsuarioSolicitante', x.id_usuario_solicitante,
          'idUsuarioResolutor', x.id_usuario_resolutor,
          'puedeResolver', (
            v_puede_aprobar
            AND x.estado='PENDIENTE'
            AND x.estado_laboral='CESADO'
            AND x.id_usuario_solicitante<>p_id_actor
            AND NOT EXISTS (
                SELECT 1 FROM public.seg_usuarios actor
                WHERE actor.id_usuario=p_id_actor AND actor.id_persona=x.id_persona
            )
          )
      ) ORDER BY x.fecha_solicitud DESC,x.id_solicitud DESC
    ),'[]'::jsonb) INTO v_solicitudes
    FROM (
      SELECT s.*,t.codigo AS codigo_trabajador,t.id_persona,
             e.codigo AS estado_laboral,
             BTRIM(CONCAT_WS(' ',per.nombres,per.apellido_paterno,per.apellido_materno))
               AS nombre_trabajador
      FROM public.rrhh_solicitudes_reincorporacion s
      JOIN public.rrhh_trabajadores t ON t.id_trabajador=s.id_trabajador
      JOIN public.cfg_estados_trabajador e ON e.id_estado_trabajador=t.id_estado_trabajador
      JOIN public.core_personas per ON per.id_persona=t.id_persona
      WHERE (v_estado_filtro IS NULL OR s.estado=v_estado_filtro)
        AND (p_id_trabajador IS NULL OR s.id_trabajador=p_id_trabajador)
      ORDER BY s.fecha_solicitud DESC,s.id_solicitud DESC
      LIMIT 200
    ) x;

    p_resultado:=jsonb_build_object(
        'solicitudes',v_solicitudes,
        'totalMostrado',jsonb_array_length(v_solicitudes)
    );
    p_estado_respuesta:='OK';
    p_mensaje:='Solicitudes de reincorporación consultadas correctamente.';
END
$procedure$;

CREATE OR REPLACE PROCEDURE public.sp_rrhh_resolver_reincorporacion(IN p_id_actor bigint, IN p_id_solicitud bigint, IN p_decision character varying, IN p_motivo_resolucion text, OUT p_resultado jsonb, OUT p_estado character varying, OUT p_mensaje character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $procedure$
DECLARE
 v_s public.rrhh_solicitudes_reincorporacion%ROWTYPE;
 v_t public.rrhh_trabajadores%ROWTYPE;
 v_decision TEXT;
 v_motivo TEXT;
 v_estado_actual TEXT;
 v_estado_activo INTEGER;
 v_id_historial BIGINT;
 v_estado_usuario TEXT;
BEGIN
 p_resultado:=NULL;p_estado:='DATOS_INVALIDOS';
 p_mensaje:='Datos de resolución inválidos.';
 v_decision:=UPPER(NULLIF(BTRIM(p_decision),''));
 v_motivo:=NULLIF(BTRIM(p_motivo_resolucion),'');
 IF p_id_actor IS NULL OR p_id_solicitud IS NULL OR p_id_solicitud<=0
    OR v_decision IS NULL OR v_decision NOT IN ('APROBAR','RECHAZAR')
 THEN RETURN;END IF;

 IF NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_id_actor,'hr.approve'),FALSE)
   OR NOT EXISTS(
     SELECT 1 FROM public.seg_usuarios u
     JOIN public.seg_usuarios_roles ur ON ur.id_usuario=u.id_usuario AND ur.activo
     JOIN public.seg_roles r ON r.id_rol=ur.id_rol AND r.activo AND public.fn_usuario_tiene_permiso_seguridad(u.id_usuario,'hr.approve_reincorporation') AND public.fn_usuario_tiene_permiso_seguridad(u.id_usuario,'hr.approve')
     JOIN public.cfg_estados_usuario e ON e.id_estado_usuario=u.id_estado_usuario
     WHERE u.id_usuario=p_id_actor AND e.codigo='ACTIVO' AND e.permite_acceso
   )
 THEN
   p_estado:='DENEGADO';
   p_mensaje:='Solo un aprobador autorizado activo puede resolver reincorporaciones.';
   RETURN;
 END IF;

 IF LENGTH(COALESCE(v_motivo,''))>1000
   OR (v_decision='RECHAZAR' AND LENGTH(COALESCE(v_motivo,''))<10)
 THEN
   p_estado:='MOTIVO_INVALIDO';
   p_mensaje:='El rechazo exige justificación de 10 a 1000 caracteres.';
   RETURN;
 END IF;

 SELECT * INTO v_s FROM public.rrhh_solicitudes_reincorporacion
 WHERE id_solicitud=p_id_solicitud FOR UPDATE;
 IF NOT FOUND THEN
   p_estado:='NO_ENCONTRADA';p_mensaje:='Solicitud no encontrada.';RETURN;
 END IF;
 IF v_s.estado <> 'PENDIENTE' THEN
   p_estado:='SOLICITUD_RESUELTA';p_mensaje:='La solicitud ya fue resuelta.';RETURN;
 END IF;
 IF v_s.id_usuario_solicitante=p_id_actor THEN
   p_estado:='AUTOAPROBACION_DENEGADA';
   p_mensaje:='No puede resolver una solicitud presentada por usted.';
   RETURN;
 END IF;

 SELECT * INTO v_t FROM public.rrhh_trabajadores
 WHERE id_trabajador=v_s.id_trabajador FOR UPDATE;
 IF NOT FOUND THEN
   p_estado:='NO_ENCONTRADO';p_mensaje:='El trabajador no existe.';RETURN;
 END IF;

 -- El Administrador no puede aprobar la reincorporación de su propia cuenta.
 IF EXISTS(SELECT 1 FROM public.seg_usuarios u
   WHERE u.id_usuario=p_id_actor AND u.id_persona=v_t.id_persona) THEN
   p_estado:='AUTOAPROBACION_DENEGADA';
   p_mensaje:='No puede reactivar su propio expediente laboral.';
   RETURN;
 END IF;

 -- La autorización administrativa y las prohibiciones de autoaprobación
 -- ya fueron validadas; también se admiten expedientes de Gerencia.

 SELECT codigo INTO v_estado_actual
 FROM public.cfg_estados_trabajador
 WHERE id_estado_trabajador=v_t.id_estado_trabajador;
 IF v_estado_actual IS DISTINCT FROM 'CESADO' OR v_t.fecha_cese IS NULL THEN
   p_estado:='ESTADO_INVALIDO';
   p_mensaje:='El trabajador ya no está cesado o no tiene fecha de cese.';
   RETURN;
 END IF;

 IF v_decision='APROBAR' THEN
   IF v_s.nueva_fecha_ingreso<=v_t.fecha_cese
     OR v_s.nueva_fecha_ingreso>CURRENT_DATE THEN
     p_estado:='FECHAS_INVALIDAS';
     p_mensaje:='La reincorporación solo puede aprobarse en o después de su fecha de ingreso, posterior al cese.';
     RETURN;
   END IF;
   SELECT id_estado_trabajador INTO v_estado_activo
   FROM public.cfg_estados_trabajador WHERE codigo='ACTIVO' AND activo=TRUE;
   IF v_estado_activo IS NULL THEN
     p_estado:='CONFIGURACION_INVALIDA';p_mensaje:='Estado ACTIVO no disponible.';RETURN;
   END IF;

   UPDATE public.rrhh_trabajadores
   SET id_estado_trabajador=v_estado_activo,
       fecha_ingreso=v_s.nueva_fecha_ingreso,
       fecha_cese=NULL
   WHERE id_trabajador=v_s.id_trabajador;

   INSERT INTO public.rrhh_trabajadores_historial_laboral(
      id_trabajador,id_estado_anterior,id_estado_nuevo,
      fecha_ingreso_anterior,fecha_ingreso_nueva,
      fecha_cese_anterior,fecha_cese_nueva,motivo,id_usuario_actor
   )
   VALUES(
      v_t.id_trabajador,v_t.id_estado_trabajador,v_estado_activo,
      v_t.fecha_ingreso,v_s.nueva_fecha_ingreso,
      v_t.fecha_cese,NULL,
      'Reincorporación aprobada. '||COALESCE(v_motivo,'Solicitud '||v_s.id_solicitud),
      p_id_actor
   ) RETURNING id_historial INTO v_id_historial;

   UPDATE public.rrhh_solicitudes_reincorporacion
   SET estado='APROBADA',id_usuario_resolutor=p_id_actor,
       fecha_resolucion=NOW(),motivo_resolucion=v_motivo,
       fecha_actualizacion=NOW()
   WHERE id_solicitud=p_id_solicitud;

 ELSE
   UPDATE public.rrhh_solicitudes_reincorporacion
   SET estado='RECHAZADA',id_usuario_resolutor=p_id_actor,
       fecha_resolucion=NOW(),motivo_resolucion=v_motivo,
       fecha_actualizacion=NOW()
   WHERE id_solicitud=p_id_solicitud;
 END IF;

 SELECT eu.codigo INTO v_estado_usuario
 FROM public.seg_usuarios u
 JOIN public.cfg_estados_usuario eu ON eu.id_estado_usuario=u.id_estado_usuario
 WHERE u.id_persona=v_t.id_persona;

 PERFORM public.sp_registrar_auditoria(
   p_id_actor,'RRHH'::VARCHAR,v_decision::VARCHAR,
   'rrhh_solicitudes_reincorporacion'::VARCHAR,p_id_solicitud::VARCHAR,
   'EXITOSO'::VARCHAR,'Resolución administrativa de reincorporación.'::VARCHAR,
   jsonb_build_object('idTrabajador',v_s.id_trabajador,'decision',v_decision,
      'fechaIngreso',v_s.nueva_fecha_ingreso,
      'estadoUsuario',v_estado_usuario)
 );

 p_resultado:=jsonb_build_object('idSolicitud',p_id_solicitud,
   'idTrabajador',v_s.id_trabajador,
   'estado',CASE WHEN v_decision='APROBAR' THEN 'APROBADA' ELSE 'RECHAZADA' END,
   'estadoLaboral',CASE WHEN v_decision='APROBAR' THEN 'ACTIVO' ELSE 'CESADO' END,
   'estadoUsuario',v_estado_usuario,
   'requiereRevisionUsuario',v_decision='APROBAR' AND v_estado_usuario IS DISTINCT FROM 'ACTIVO');
 p_estado:='OK';
 p_mensaje:=CASE WHEN v_decision='APROBAR'
   THEN 'Reincorporación aplicada; verificar estado resultante del usuario.'
   ELSE 'Reincorporación rechazada. El trabajador continúa CESADO.' END;
END
$procedure$;

CREATE OR REPLACE PROCEDURE public.sp_core_listar_solicitudes_correccion(IN p_id_actor bigint, OUT p_resultado jsonb, OUT p_estado character varying, OUT p_mensaje character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $procedure$
DECLARE
    v_es_gerencia_o_admin boolean := FALSE;
BEGIN
    p_resultado := '[]'::JSONB;

    -- 1. VALIDAR PERMISO DE APROBACION.
    IF p_id_actor IS NULL
       OR NOT public.fn_usuario_tiene_permiso_seguridad(
           p_id_actor, 'hr.approve'
       )
    THEN
        p_estado := 'DENEGADO';
        p_mensaje := 'No tiene permisos para consultar aprobaciones.';
        RETURN;
    END IF;

    -- 2. VALIDAR QUE SEA GERENCIA, ADMINISTRADOR O JEFE DE RRHH.
    SELECT (r.codigo IN ('GERENCIA', 'ADMINISTRADOR'))
    INTO v_es_gerencia_o_admin
    FROM public.seg_usuarios u
    JOIN public.seg_usuarios_roles ur
        ON ur.id_usuario = u.id_usuario
       AND ur.activo = TRUE
    JOIN public.seg_roles r
        ON r.id_rol = ur.id_rol
       AND r.activo = TRUE
    LEFT JOIN public.rrhh_trabajadores t
        ON t.id_persona = u.id_persona
    LEFT JOIN public.rrhh_cargos c
        ON c.id_cargo = t.id_cargo
    LEFT JOIN public.rrhh_areas a
        ON a.id_area = c.id_area
    LEFT JOIN public.cfg_estados_trabajador e
        ON e.id_estado_trabajador = t.id_estado_trabajador
    WHERE u.id_usuario = p_id_actor
      AND (
          r.codigo IN ('GERENCIA', 'ADMINISTRADOR')
          OR (
              public.fn_usuario_tiene_permiso_seguridad(p_id_actor,'hr.approve_documents')
              AND c.codigo = 'JEFE_RRHH'
              AND c.activo = TRUE
              AND a.activo = TRUE
              AND e.codigo = 'ACTIVO'
              AND e.activo = TRUE
          )
      )
    ORDER BY (r.codigo IN ('GERENCIA', 'ADMINISTRADOR')) DESC
    LIMIT 1;

    IF v_es_gerencia_o_admin IS NULL THEN
        p_estado := 'DENEGADO';
        p_mensaje := 'Solo Gerencia, Administracion o Jefatura de RRHH pueden consultar estas aprobaciones.';
        RETURN;
    END IF;

    -- 3. OBTENER SOLICITUDES PENDIENTES.
    -- Jefatura de RRHH solo visualiza solicitudes de tipo DOCUMENTO.
    -- Gerencia y Administrador pueden visualizar tanto DOCUMENTO como CONTACTO.
    SELECT COALESCE(
        JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'idSolicitud', s.id_solicitud,
                'idPersona', s.id_persona,
                'idTrabajador', tr.id_trabajador,
                'codigoTrabajador', tr.codigo,
                'tipoDocumentoActual', CASE WHEN s.tipo_dato = 'DOCUMENTO' THEN td.codigo ELSE NULL END,
                'numeroDocumentoActual', CASE WHEN s.tipo_dato = 'DOCUMENTO' THEN s.valor_anterior ELSE NULL END,
                'tipoDocumentoPropuesto', CASE WHEN s.tipo_dato = 'DOCUMENTO' THEN tdp.codigo ELSE NULL END,
                'numeroDocumentoPropuesto', CASE WHEN s.tipo_dato = 'DOCUMENTO' THEN s.valor_propuesto ELSE NULL END,
                'valorAnterior', s.valor_anterior,
                'valorPropuesto', s.valor_propuesto,
                'tieneEvidencia', s.evidencia_storage_path IS NOT NULL
                    AND BTRIM(s.evidencia_storage_path) <> '',
                'nombreCompleto', CONCAT_WS(
                    ' ',
                    p.nombres,
                    p.apellido_paterno,
                    p.apellido_materno
                ),
                'moduloOrigen', s.modulo_origen,
                'tipoDato', s.tipo_dato,
                'idRegistro', COALESCE(
                    s.id_persona_documento,
                    s.id_persona_contacto
                ),
                'codigoTipo', COALESCE(
                    td.codigo,
                    tc.codigo,
                    CASE WHEN s.tipo_dato = 'CONTACTO' THEN 'EMAIL' ELSE NULL END
                ),
                'motivo', s.motivo,
                'estado', s.estado,
                'idUsuarioSolicitante', s.id_usuario_solicitante,
                'fechaSolicitud', s.fecha_solicitud
            )
            ORDER BY s.fecha_solicitud ASC, s.id_solicitud ASC
        ),
        '[]'::JSONB
    )
    INTO p_resultado
    FROM public.core_solicitudes_correccion_identidad s
    JOIN public.core_personas p
        ON p.id_persona = s.id_persona
    LEFT JOIN LATERAL (
        SELECT rt.id_trabajador, rt.codigo
        FROM public.rrhh_trabajadores rt
        WHERE rt.id_persona = s.id_persona
        ORDER BY rt.id_trabajador DESC
        LIMIT 1
    ) tr ON TRUE
    LEFT JOIN public.cfg_tipos_documento tdp
        ON tdp.id_tipo_documento = s.id_tipo_documento_propuesto
    LEFT JOIN public.core_personas_documentos d
        ON d.id_persona_documento = s.id_persona_documento
    LEFT JOIN public.cfg_tipos_documento td
        ON td.id_tipo_documento = d.id_tipo_documento
    LEFT JOIN public.core_personas_contactos c
        ON c.id_persona_contacto = s.id_persona_contacto
    LEFT JOIN public.cfg_tipos_contacto tc
        ON tc.id_tipo_contacto = c.id_tipo_contacto
    WHERE s.estado = 'PENDIENTE'
      AND (s.tipo_dato <> 'CONTACTO' OR EXISTS (
          SELECT 1 FROM public.seg_usuarios_roles x
          JOIN public.seg_roles rx ON rx.id_rol=x.id_rol
          WHERE x.id_usuario=p_id_actor AND x.activo=TRUE
            AND x.fecha_revocacion IS NULL AND rx.activo=TRUE
            AND rx.codigo IN ('GERENCIA','ADMINISTRADOR')
      ))
      -- Nadie puede resolver su propia solicitud
      AND s.id_usuario_solicitante <> p_id_actor
      -- Restringir solicitudes de contacto exclusivamente a Gerencia y Administracion
      AND (
          v_es_gerencia_o_admin = TRUE
          OR s.tipo_dato = 'DOCUMENTO'
      );

    p_estado := 'OK';
    p_mensaje := 'Solicitudes pendientes consultadas correctamente.';
END;
$procedure$;

CREATE OR REPLACE PROCEDURE public.sp_core_obtener_detalle_correccion(IN p_id_actor bigint, IN p_id_solicitud bigint, OUT p_resultado jsonb, OUT p_estado character varying, OUT p_mensaje character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $procedure$
DECLARE
    v_tipo_dato text;
    v_es_gerencia_o_admin boolean := FALSE;
BEGIN
    p_resultado := NULL;

    -- 1. Validar parametros
    IF p_id_actor IS NULL OR p_id_solicitud IS NULL OR p_id_solicitud <= 0 THEN
        p_estado := 'DATOS_INVALIDOS';
        p_mensaje := 'Los identificadores son invalidos.';
        RETURN;
    END IF;

    -- 2. Validar permiso general hr.approve
    IF NOT public.fn_usuario_tiene_permiso_seguridad(p_id_actor, 'hr.approve') THEN
        p_estado := 'DENEGADO';
        p_mensaje := 'No tiene permisos para revisar correcciones.';
        RETURN;
    END IF;

    -- 3. Identificar rol del actor
    SELECT (r.codigo IN ('GERENCIA', 'ADMINISTRADOR'))
    INTO v_es_gerencia_o_admin
    FROM public.seg_usuarios u
    JOIN public.seg_usuarios_roles ur
        ON ur.id_usuario = u.id_usuario
       AND ur.activo = TRUE
    JOIN public.seg_roles r
        ON r.id_rol = ur.id_rol
       AND r.activo = TRUE
    LEFT JOIN public.rrhh_trabajadores t
        ON t.id_persona = u.id_persona
    LEFT JOIN public.rrhh_cargos c
        ON c.id_cargo = t.id_cargo
    LEFT JOIN public.rrhh_areas a
        ON a.id_area = c.id_area
    LEFT JOIN public.cfg_estados_trabajador e
        ON e.id_estado_trabajador = t.id_estado_trabajador
    WHERE u.id_usuario = p_id_actor
      AND (
          r.codigo IN ('GERENCIA', 'ADMINISTRADOR')
          OR (
              public.fn_usuario_tiene_permiso_seguridad(p_id_actor,'hr.approve_documents')
              AND c.codigo = 'JEFE_RRHH'
              AND c.activo = TRUE
              AND a.activo = TRUE
              AND e.codigo = 'ACTIVO'
              AND e.activo = TRUE
          )
      )
    ORDER BY (r.codigo IN ('GERENCIA', 'ADMINISTRADOR')) DESC
    LIMIT 1;

    IF v_es_gerencia_o_admin IS NULL THEN
        p_estado := 'DENEGADO';
        p_mensaje := 'Solo Gerencia, Administracion o Jefatura de RRHH pueden consultar detalles.';
        RETURN;
    END IF;

    -- 4. Verificar tipo de dato de la solicitud
    SELECT tipo_dato INTO v_tipo_dato
    FROM public.core_solicitudes_correccion_identidad
    WHERE id_solicitud = p_id_solicitud;

    IF NOT FOUND THEN
        p_estado := 'SOLICITUD_NO_DISPONIBLE';
        p_mensaje := 'La solicitud no existe.';
        RETURN;
    END IF;

    -- Si es contacto (correo), solo Gerencia y Administracion pueden acceder
    IF v_tipo_dato = 'CONTACTO' AND NOT v_es_gerencia_o_admin THEN
        p_estado := 'DENEGADO';
        p_mensaje := 'Solo Gerencia y Administracion pueden revisar solicitudes de cambio de correo.';
        RETURN;
    END IF;

    -- 5. Consultar detalle de la solicitud
    SELECT JSONB_BUILD_OBJECT(
        'idSolicitud', s.id_solicitud,
        'idPersona', s.id_persona,
        'nombreCompleto', CONCAT_WS(
            ' ',
            p.nombres,
            p.apellido_paterno,
            p.apellido_materno
        ),
        'moduloOrigen', s.modulo_origen,
        'tipoDato', s.tipo_dato,
        'idRegistro', COALESCE(
            s.id_persona_documento,
            s.id_persona_contacto
        ),
        'codigoTipo', COALESCE(
            td.codigo,
            tc.codigo,
            CASE WHEN s.tipo_dato = 'CONTACTO' THEN 'EMAIL' ELSE NULL END
        ),
        'valorAnterior', s.valor_anterior,
        'valorPropuesto', s.valor_propuesto,
        'valorActual',
            CASE
                WHEN s.tipo_dato = 'DOCUMENTO'
                THEN d.numero_documento
                ELSE ct.valor
            END,
        'verificadoActual',
            CASE
                WHEN s.tipo_dato = 'DOCUMENTO'
                THEN d.verificado
                ELSE ct.verificado
            END,
        'activoActual',
            CASE
                WHEN s.tipo_dato = 'DOCUMENTO'
                THEN d.activo
                ELSE ct.activo
            END,
        'motivo', s.motivo,
        'estado', s.estado,
        'idUsuarioSolicitante', s.id_usuario_solicitante,
        'fechaSolicitud', s.fecha_solicitud,
        'evidenciaDisponible', s.evidencia_storage_path IS NOT NULL,
        'evidenciaNombreArchivo', s.evidencia_nombre_archivo,
        'evidenciaTipoMime', s.evidencia_tipo_mime
    )
    INTO p_resultado
    FROM public.core_solicitudes_correccion_identidad s
    JOIN public.core_personas p
        ON p.id_persona = s.id_persona
    LEFT JOIN public.core_personas_documentos d
        ON d.id_persona_documento = s.id_persona_documento
    LEFT JOIN public.cfg_tipos_documento td
        ON td.id_tipo_documento = d.id_tipo_documento
    LEFT JOIN public.core_personas_contactos ct
        ON ct.id_persona_contacto = s.id_persona_contacto
    LEFT JOIN public.cfg_tipos_contacto tc
        ON tc.id_tipo_contacto = ct.id_tipo_contacto
    WHERE s.id_solicitud = p_id_solicitud
      AND s.estado = 'PENDIENTE'
      AND s.id_usuario_solicitante <> p_id_actor;

    IF p_resultado IS NULL THEN
        p_estado := 'SOLICITUD_NO_DISPONIBLE';
        p_mensaje := 'La solicitud no esta disponible para revision.';
        RETURN;
    END IF;

    p_estado := 'OK';
    p_mensaje := 'Detalle de correccion consultado correctamente.';
END;
$procedure$;

CREATE OR REPLACE PROCEDURE public.sp_rrhh_solicitar_reincorporacion(IN p_id_actor bigint, IN p_id_trabajador bigint, IN p_nueva_fecha_ingreso date, IN p_motivo text, OUT p_resultado jsonb, OUT p_estado character varying, OUT p_mensaje character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $procedure$
DECLARE
 v_t public.rrhh_trabajadores%ROWTYPE;
 v_estado_actual TEXT;
 v_id_solicitud BIGINT;
 v_tipo_notificacion INTEGER;
 v_nombre TEXT;
 v_notificaciones INTEGER;
BEGIN
 p_resultado:=NULL;p_estado:='DATOS_INVALIDOS';
 p_mensaje:='Solicitud de reincorporación inválida.';
 IF p_id_actor IS NULL OR p_id_trabajador IS NULL OR p_id_trabajador<=0
   OR NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_id_actor,'hr.edit'),FALSE)
 THEN
   p_estado:='DENEGADO';p_mensaje:='No está autorizado para solicitar reincorporaciones.'; RETURN;
 END IF;
 IF p_nueva_fecha_ingreso IS NULL
   OR LENGTH(COALESCE(BTRIM(p_motivo),'')) NOT BETWEEN 10 AND 1000
 THEN
   p_estado:='DATOS_INVALIDOS';p_mensaje:='Fecha y motivo de 10 a 1000 caracteres obligatorios.';RETURN;
 END IF;
 SELECT * INTO v_t FROM public.rrhh_trabajadores
 WHERE id_trabajador=p_id_trabajador FOR UPDATE;
 IF NOT FOUND THEN
   p_estado:='NO_ENCONTRADO';p_mensaje:='Trabajador inexistente.';RETURN;
 END IF;
 IF NOT public.fn_rrhh_puede_cambiar_estado(p_id_actor, v_t.id_persona) AND (
   EXISTS(SELECT 1 FROM public.rrhh_cargos c
    WHERE c.id_cargo=v_t.id_cargo AND c.codigo='GERENTE_GENERAL')
   OR EXISTS(SELECT 1 FROM public.seg_usuarios u
    JOIN public.seg_usuarios_roles ur ON ur.id_usuario=u.id_usuario AND ur.activo
    JOIN public.seg_roles r ON r.id_rol=ur.id_rol AND r.activo
    WHERE u.id_persona=v_t.id_persona AND r.codigo='GERENCIA')
   OR NOT COALESCE(public.fn_seguridad_puede_bloquear_persona(p_id_actor,v_t.id_persona),FALSE)
 )
 THEN
   p_estado:='USUARIO_PROTEGIDO';p_mensaje:='No se puede solicitar la reincorporación de esta cuenta protegida.';RETURN;
 END IF;
 SELECT codigo INTO v_estado_actual
 FROM public.cfg_estados_trabajador WHERE id_estado_trabajador=v_t.id_estado_trabajador;
 IF v_estado_actual IS DISTINCT FROM 'CESADO' OR v_t.fecha_cese IS NULL THEN
   p_estado:='ESTADO_INVALIDO';p_mensaje:='El trabajador debe estar CESADO con fecha de cese registrada.';RETURN;
 END IF;
 IF p_nueva_fecha_ingreso <= v_t.fecha_cese THEN
   p_estado:='FECHAS_INVALIDAS';p_mensaje:='La nueva fecha debe ser posterior al último cese.';RETURN;
 END IF;
 IF EXISTS(
   SELECT 1 FROM public.rrhh_solicitudes_reincorporacion
   WHERE id_trabajador=p_id_trabajador AND estado='PENDIENTE'
 ) THEN
   p_estado:='SOLICITUD_PENDIENTE';p_mensaje:='Ya existe una reincorporación pendiente de aprobación.';RETURN;
 END IF;

 SELECT id_tipo_notificacion INTO v_tipo_notificacion
 FROM public.cfg_tipos_notificacion WHERE codigo='GENERAL' AND activo=TRUE;
 IF v_tipo_notificacion IS NULL OR NOT EXISTS(
   SELECT 1 FROM public.seg_usuarios u
   JOIN public.seg_usuarios_roles ur ON ur.id_usuario=u.id_usuario AND ur.activo
   JOIN public.seg_roles r ON r.id_rol=ur.id_rol AND r.activo AND public.fn_usuario_tiene_permiso_seguridad(u.id_usuario,'hr.approve_reincorporation') AND public.fn_usuario_tiene_permiso_seguridad(u.id_usuario,'hr.approve')
   JOIN public.cfg_estados_usuario eu ON eu.id_estado_usuario=u.id_estado_usuario
   WHERE eu.codigo='ACTIVO' AND eu.permite_acceso
 ) THEN
   p_estado:='SIN_ADMINISTRADOR';
   p_mensaje:='No hay administrador activo para recibir la solicitud.';
   RETURN;
 END IF;

 INSERT INTO public.rrhh_solicitudes_reincorporacion(
   id_trabajador,id_usuario_solicitante,nueva_fecha_ingreso,motivo
 )
 VALUES(p_id_trabajador,p_id_actor,p_nueva_fecha_ingreso,BTRIM(p_motivo))
 RETURNING id_solicitud INTO v_id_solicitud;

 SELECT CONCAT_WS(' ',p.nombres,p.apellido_paterno,p.apellido_materno)
 INTO v_nombre FROM public.core_personas p WHERE p.id_persona=v_t.id_persona;

 INSERT INTO public.not_notificaciones(
   id_persona,id_tipo_notificacion,titulo,mensaje,url_destino,
   referencia_modulo,referencia_entidad,referencia_id,
   datos_contexto,clave_deduplicacion,id_usuario_generacion
 )
 SELECT DISTINCT
   u.id_persona,v_tipo_notificacion,'Reincorporación pendiente de aprobación',
   LEFT('Se solicita reincorporar al trabajador '||v_nombre||' ('||v_t.codigo||
     ') desde el '||TO_CHAR(p_nueva_fecha_ingreso,'DD/MM/YYYY')||
     '. Revise y apruebe o rechace la solicitud.',1000),
   '/trabajadores','RRHH','rrhh_solicitudes_reincorporacion',
   v_id_solicitud::VARCHAR,
   jsonb_build_object('tipo','REINCORPORACION_PENDIENTE','idSolicitud',v_id_solicitud,
     'idTrabajador',p_id_trabajador,'fechaIngreso',p_nueva_fecha_ingreso,
     'accion','RESOLVER_REINCORPORACION'),
   'RRHH_REINCORPORACION_'||v_id_solicitud||'_'||u.id_usuario,
   p_id_actor
 FROM public.seg_usuarios u
 JOIN public.seg_usuarios_roles ur ON ur.id_usuario=u.id_usuario AND ur.activo
 JOIN public.seg_roles r ON r.id_rol=ur.id_rol AND r.activo AND public.fn_usuario_tiene_permiso_seguridad(u.id_usuario,'hr.approve_reincorporation') AND public.fn_usuario_tiene_permiso_seguridad(u.id_usuario,'hr.approve')
 JOIN public.cfg_estados_usuario eu ON eu.id_estado_usuario=u.id_estado_usuario
 WHERE eu.codigo='ACTIVO' AND eu.permite_acceso=TRUE
 ON CONFLICT(clave_deduplicacion) DO NOTHING;
 GET DIAGNOSTICS v_notificaciones=ROW_COUNT;

 PERFORM public.sp_registrar_auditoria(
  p_id_actor,'RRHH'::VARCHAR,'SOLICITAR_REINCORPORACION'::VARCHAR,
  'rrhh_solicitudes_reincorporacion'::VARCHAR,v_id_solicitud::VARCHAR,
  'EXITOSO'::VARCHAR,'Solicitud de reincorporación enviada a Administración.'::VARCHAR,
  jsonb_build_object('idTrabajador',p_id_trabajador,
    'fechaIngresoPropuesta',p_nueva_fecha_ingreso)
 );

 p_resultado:=jsonb_build_object('idSolicitud',v_id_solicitud,'estado','PENDIENTE',
   'notificacionesAdministradores',v_notificaciones);
 p_estado:='OK';p_mensaje:='Solicitud registrada; el trabajador continúa CESADO hasta su aprobación.';
EXCEPTION WHEN unique_violation THEN
 p_resultado:=NULL;p_estado:='SOLICITUD_PENDIENTE';
 p_mensaje:='Ya existe una solicitud pendiente.';
END
$procedure$;

CREATE OR REPLACE PROCEDURE public.sp_actualizar_permisos_rol_seguridad(IN p_id_actor bigint, IN p_codigo_rol character varying, IN p_codigos_permisos text[], OUT p_estado character varying, OUT p_mensaje character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $procedure$
DECLARE
    v_id_rol INTEGER;
    v_codigo_rol VARCHAR;
    v_codigo_permiso TEXT;
    v_permisos TEXT[];
BEGIN
    /* 1. El actor debe poder administrar permisos de roles */
    IF NOT public.fn_usuario_tiene_permiso_seguridad(
        p_id_actor,
        'roles.assign_permissions'
    ) THEN
        p_estado := 'DENEGADO';
        p_mensaje := 'No tiene permiso para modificar permisos de roles.';
        RETURN;
    END IF;

    /* 2. Buscar el rol */
    SELECT id_rol, codigo
    INTO v_id_rol, v_codigo_rol
    FROM seg_roles
    WHERE UPPER(codigo) = UPPER(BTRIM(p_codigo_rol))
      AND activo = TRUE FOR UPDATE;

    IF v_id_rol IS NULL THEN
        p_estado := 'NO_ENCONTRADO';
        p_mensaje := 'El rol indicado no existe o está inactivo.';
        RETURN;
    END IF;

    -- Toda administración no raíz queda sujeta a la misma delegación.
    IF NOT public.fn_rbac_admin_raiz_v1(p_id_actor) THEN
      IF NOT public.fn_rbac_rol_editable_delegado_v1(p_id_actor,v_id_rol) THEN
        p_estado:='PROTEGIDO';p_mensaje:='El rol no está disponible para administración delegada.';RETURN;
      END IF;
      IF EXISTS(SELECT 1 FROM unnest(coalesce(p_codigos_permisos,ARRAY[]::text[])) x(codigo)
        WHERE split_part(btrim(x.codigo),'.',1) IN ('users','roles','permissions','audit')
        OR NOT public.fn_usuario_tiene_permiso_seguridad(p_id_actor,btrim(x.codigo)::varchar)) THEN
        p_estado:='DENEGADO';p_mensaje:='No puede delegar privilegios de seguridad ni permisos que no posee.';RETURN;
      END IF;
    END IF;

    -- Las excepciones laborales y las aprobaciones segregadas solo se
    -- conceden por la administración raíz. Se preserva su política previa.
    IF NOT public.fn_rbac_admin_raiz_v1(p_id_actor) AND EXISTS(
      SELECT 1 FROM unnest(coalesce(p_codigos_permisos,ARRAY[]::text[])) x(codigo)
      WHERE btrim(x.codigo) IN ('hr.manage_all','hr.approve_reincorporation','hr.approve_documents')) THEN
      p_estado:='DENEGADO';p_mensaje:='Las capacidades laborales protegidas requieren administración raíz.';RETURN;
    END IF;

    -- Política financiera vigente: autorización y TOTP exclusivamente de Gerencia.
    IF v_codigo_rol<>'GERENCIA' AND EXISTS(SELECT 1 FROM unnest(coalesce(p_codigos_permisos,ARRAY[]::text[])) x(codigo)
      WHERE btrim(x.codigo)='financing.configure') THEN
      p_estado:='PROTEGIDO';p_mensaje:='La configuración financiera está reservada a Gerencia y requiere TOTP.';RETURN;
    END IF;

    /* 3. GERENCIA es administrado automáticamente */
    IF v_codigo_rol = 'GERENCIA' THEN
        p_estado := 'PROTEGIDO';
        p_mensaje := 'Los permisos de GERENCIA se asignan automáticamente y no pueden modificarse manualmente.';
        RETURN;
    END IF;

    /* 4. CLIENTE pertenece al Portal del Cliente */
    IF v_codigo_rol = 'CLIENTE' THEN
        p_estado := 'PROTEGIDO';
        p_mensaje := 'El rol CLIENTE no se administra desde el Backoffice.';
        RETURN;
    END IF;

    /* 5. Solo GERENCIA puede modificar al ADMINISTRADOR */
    IF v_codigo_rol = 'ADMINISTRADOR'
       AND NOT EXISTS (
           SELECT 1
           FROM seg_usuarios_roles ur
           INNER JOIN seg_roles r
               ON r.id_rol = ur.id_rol
           WHERE ur.id_usuario = p_id_actor
             AND ur.activo = TRUE
             AND ur.fecha_revocacion IS NULL
             AND r.activo = TRUE
             AND r.codigo = 'GERENCIA'
       ) THEN

        p_estado := 'DENEGADO';
        p_mensaje := 'Solo GERENCIA puede modificar los permisos del rol ADMINISTRADOR.';
        RETURN;
    END IF;

    /* 6. Normalizar lista recibida */
    SELECT COALESCE(
        ARRAY_AGG(DISTINCT BTRIM(x)),
        ARRAY[]::TEXT[]
    )
    INTO v_permisos
    FROM UNNEST(
        COALESCE(
            p_codigos_permisos,
            ARRAY[]::TEXT[]
        )
    ) AS x
    WHERE BTRIM(x) <> '';

    /* 7. Validar que todos los permisos existan y estén activos */
    FOREACH v_codigo_permiso IN ARRAY v_permisos
    LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM seg_permisos
            WHERE codigo = v_codigo_permiso
              AND activo = TRUE
        ) THEN
            p_estado := 'PERMISO_INVALIDO';
            p_mensaje :=
                'El permiso ' ||
                v_codigo_permiso ||
                ' no existe o está inactivo.';
            RETURN;
        END IF;
    END LOOP;

    -- Las nuevas capacidades de alcance y aprobación solo se delegan si el actor ya las posee.
    IF EXISTS (SELECT 1 FROM unnest(v_permisos) x(codigo)
      WHERE x.codigo IN ('crm.scope_all','crm.scope_assigned','crm.assign_advisor','crm.approve_stage_change','crm.request_stage_change','crm.deactivate_prospect','sales.scope_all','sales.contract_scope_all','sales.approve_reservation_change','sales.notify_expiry_all','sales.reassign_advisor','annulments.scope_all','annulments.request_global')
      AND NOT public.fn_usuario_tiene_permiso_seguridad(p_id_actor,x.codigo::varchar)) THEN
        p_estado := 'DENEGADO';
        p_mensaje := 'No puede delegar una capacidad comercial que no posee.';
        RETURN;
    END IF;

    -- La designación operativa es independiente de Gerencia; solo los
    -- administradores protegidos o quienes ya poseen la capacidad pueden delegarla.
    IF 'crm.operate_advisor'=ANY(v_permisos)
      AND NOT public.fn_usuario_tiene_permiso_seguridad(p_id_actor,'crm.operate_advisor')
      AND NOT EXISTS(SELECT 1 FROM public.seg_usuarios_roles ur JOIN public.seg_roles r USING(id_rol)
        WHERE ur.id_usuario=p_id_actor AND ur.activo AND ur.fecha_revocacion IS NULL AND r.activo AND r.codigo IN ('GERENCIA','ADMINISTRADOR')) THEN
      p_estado:='DENEGADO';p_mensaje:='No puede delegar la habilitación operativa de asesor.';RETURN;
    END IF;

    /*
     * 8. Desactivar las asignaciones actuales.
     * No hacemos DELETE físico.
     */
    UPDATE seg_roles_permisos
    SET activo = FALSE
    WHERE id_rol = v_id_rol
      AND activo = TRUE;

    /*
     * 9. Activar/asignar los permisos seleccionados.
     * UNIQUE(id_rol,id_permiso) evita duplicados.
     */
    IF CARDINALITY(v_permisos) > 0 THEN

        INSERT INTO seg_roles_permisos (
            id_rol,
            id_permiso,
            fecha_asignacion,
            asignado_por,
            activo
        )
        SELECT
            v_id_rol,
            p.id_permiso,
            NOW(),
            p_id_actor,
            TRUE
        FROM seg_permisos p
        WHERE p.codigo = ANY(v_permisos)
          AND p.activo = TRUE

        ON CONFLICT (id_rol, id_permiso)
        DO UPDATE
        SET
            activo = TRUE,
            fecha_asignacion = EXCLUDED.fecha_asignacion,
            asignado_por = EXCLUDED.asignado_por;

    END IF;
    /* 10. Revocar sesiones activas de usuarios afectados */
    UPDATE seg_sesiones s
    SET
       fecha_revocacion = NOW(),
       motivo_revocacion = 'PERMISOS_ROL_ACTUALIZADOS'
    WHERE s.fecha_revocacion IS NULL
      AND EXISTS (
         SELECT 1
         FROM seg_usuarios_roles ur
          WHERE ur.id_usuario = s.id_usuario
            AND ur.id_rol = v_id_rol
            AND ur.activo = TRUE
  );

    p_estado := 'OK';
    p_mensaje := 'Permisos del rol actualizados correctamente.';
END;
$procedure$;

CREATE OR REPLACE PROCEDURE public.sp_core_resolver_correccion_identidad(IN p_id_actor bigint, IN p_id_solicitud bigint, IN p_decision character varying, IN p_motivo_resolucion text, IN p_token_hash character varying, IN p_fecha_expiracion timestamp with time zone, OUT p_resultado jsonb, OUT p_estado character varying, OUT p_mensaje character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $procedure$
DECLARE
    v_solicitud public.core_solicitudes_correccion_identidad%ROWTYPE;
    v_decision TEXT := UPPER(NULLIF(BTRIM(p_decision), ''));
    v_motivo TEXT := NULLIF(BTRIM(p_motivo_resolucion), '');
    v_nuevo TEXT;
    v_estado_final TEXT;
    v_descripcion TEXT;

    v_id_persona_actual BIGINT;
    v_valor_actual TEXT;
    v_activo BOOLEAN;
    v_verificado BOOLEAN;

    v_id_tipo INTEGER;
    v_codigo_tipo TEXT;
    v_solo_numerico BOOLEAN;
    v_minimo INTEGER;
    v_maximo INTEGER;
    v_es_gerencia_o_admin BOOLEAN := FALSE;
    v_id_tipo_email INTEGER;
    v_token_hash VARCHAR(64);
    v_token_real TEXT := NULL;
    v_fecha_exp TIMESTAMPTZ;
BEGIN
    p_resultado := NULL;

    -- 1. VALIDAR PARAMETROS.
    IF p_id_actor IS NULL
       OR p_id_solicitud IS NULL
       OR p_id_solicitud <= 0
       OR v_decision IS NULL
       OR v_decision NOT IN ('APROBAR', 'RECHAZAR')
    THEN
        p_estado := 'DATOS_INVALIDOS';
        p_mensaje := 'Los datos de resolucion son invalidos.';
        RETURN;
    END IF;

    -- El rechazo requiere justificacion (10 a 1000 caracteres)
    IF LENGTH(COALESCE(v_motivo, '')) > 1000
       OR (
           v_decision = 'RECHAZAR'
           AND LENGTH(COALESCE(v_motivo, '')) < 10
       )
    THEN
        p_estado := 'MOTIVO_INVALIDO';
        p_mensaje := 'El rechazo requiere un motivo de 10 a 1000 caracteres.';
        RETURN;
    END IF;

    -- 2. VALIDAR PERMISO GENERAL.
    IF NOT public.fn_usuario_tiene_permiso_seguridad(p_id_actor, 'hr.approve') THEN
        p_estado := 'DENEGADO';
        p_mensaje := 'No tiene permiso para aprobar correcciones.';
        RETURN;
    END IF;

    -- 3. VALIDAR PERFIL DE AUTORIDAD (GERENCIA, ADMINISTRADOR O JEFE RRHH).
    SELECT (r.codigo IN ('GERENCIA', 'ADMINISTRADOR'))
    INTO v_es_gerencia_o_admin
    FROM public.seg_usuarios u
    JOIN public.seg_usuarios_roles ur
        ON ur.id_usuario = u.id_usuario
       AND ur.activo = TRUE
    JOIN public.seg_roles r
        ON r.id_rol = ur.id_rol
       AND r.activo = TRUE
    LEFT JOIN public.rrhh_trabajadores t
        ON t.id_persona = u.id_persona
    LEFT JOIN public.rrhh_cargos c
        ON c.id_cargo = t.id_cargo
    LEFT JOIN public.rrhh_areas a
        ON a.id_area = c.id_area
    LEFT JOIN public.cfg_estados_trabajador e
        ON e.id_estado_trabajador = t.id_estado_trabajador
    WHERE u.id_usuario = p_id_actor
      AND (
          r.codigo IN ('GERENCIA', 'ADMINISTRADOR')
          OR (
              public.fn_usuario_tiene_permiso_seguridad(p_id_actor,'hr.approve_documents')
              AND c.codigo = 'JEFE_RRHH'
              AND c.activo = TRUE
              AND a.activo = TRUE
              AND e.codigo = 'ACTIVO'
              AND e.activo = TRUE
          )
      )
    ORDER BY (r.codigo IN ('GERENCIA', 'ADMINISTRADOR')) DESC
    LIMIT 1;

    IF v_es_gerencia_o_admin IS NULL THEN
        p_estado := 'DENEGADO';
        p_mensaje := 'Solo Gerencia, Administracion o Jefatura de RRHH pueden resolver correcciones.';
        RETURN;
    END IF;

    -- 4. BLOQUEAR LA SOLICITUD PARA EVITAR DOBLE RESOLUCION.
    SELECT *
    INTO v_solicitud
    FROM public.core_solicitudes_correccion_identidad
    WHERE id_solicitud = p_id_solicitud
    FOR UPDATE;

    IF NOT FOUND THEN
        p_estado := 'SOLICITUD_NO_ENCONTRADA';
        p_mensaje := 'La solicitud no existe.';
        RETURN;
    END IF;

    -- 5. VALIDAR ACCESO ESPECIFICO: CORREO (CONTACTO) SOLO GERENCIA Y ADMINISTRADOR.
    IF v_solicitud.tipo_dato = 'CONTACTO' AND NOT v_es_gerencia_o_admin THEN
        p_estado := 'DENEGADO';
        p_mensaje := 'Solo Gerencia y Administracion pueden resolver solicitudes de correo.';
        RETURN;
    END IF;

    -- 6. PROHIBIR AUTOAPROBACION Y AUTORRECHAZO.
    IF v_solicitud.id_usuario_solicitante = p_id_actor THEN
        p_estado := 'AUTORESOLUCION_DENEGADA';
        p_mensaje := 'No puede resolver una solicitud presentada por usted mismo.';
        RETURN;
    END IF;

    IF v_solicitud.estado <> 'PENDIENTE' THEN
        p_estado := 'SOLICITUD_RESUELTA';
        p_mensaje := 'La solicitud ya fue resuelta anteriormente.';
        RETURN;
    END IF;

    -- 7. RESOLUCION SEGUN DECISION
    IF v_decision = 'APROBAR' THEN

        v_nuevo := NULLIF(BTRIM(v_solicitud.valor_propuesto), '');
        IF v_nuevo IS NULL THEN
            p_estado := 'DATO_INVALIDO';
            p_mensaje := 'El valor propuesto no es valido.';
            RETURN;
        END IF;

        IF v_solicitud.tipo_dato = 'DOCUMENTO' THEN

            -- Evidencia obligatoria en documental RRHH
            IF v_solicitud.modulo_origen = 'RRHH'
               AND (v_solicitud.evidencia_storage_path IS NULL OR NOT EXISTS (
                   SELECT 1 FROM storage.objects so
                   WHERE so.bucket_id = 'core-identidad-evidencias'
                     AND so.name = v_solicitud.evidencia_storage_path
               ))
            THEN
                p_estado := 'EVIDENCIA_OBLIGATORIA';
                p_mensaje := 'El documento requiere fotografia de respaldo adjunta.';
                RETURN;
            END IF;

            SELECT
                d.id_persona,
                d.numero_documento,
                d.activo,
                d.verificado,
                d.id_tipo_documento,
                td.codigo,
                td.solo_numerico,
                td.longitud_minima,
                td.longitud_maxima
            INTO
                v_id_persona_actual,
                v_valor_actual,
                v_activo,
                v_verificado,
                v_id_tipo,
                v_codigo_tipo,
                v_solo_numerico,
                v_minimo,
                v_maximo
            FROM public.core_personas_documentos d
            JOIN public.cfg_tipos_documento td
                ON td.id_tipo_documento = d.id_tipo_documento
            WHERE d.id_persona_documento = v_solicitud.id_persona_documento
              AND td.activo = TRUE
            FOR UPDATE OF d;

            IF NOT FOUND THEN
                p_estado := 'REGISTRO_NO_ENCONTRADO';
                p_mensaje := 'El documento ya no esta disponible.';
                RETURN;
            END IF;

            IF v_id_persona_actual IS DISTINCT FROM v_solicitud.id_persona
               OR v_valor_actual IS DISTINCT FROM v_solicitud.valor_anterior
               OR NOT COALESCE(v_activo, FALSE)
               OR (NOT COALESCE(v_verificado, FALSE) AND v_solicitud.id_tipo_documento_propuesto IS NULL)
            THEN
                p_estado := 'DATOS_DESACTUALIZADOS';
                p_mensaje := 'El documento cambio o perdio su verificacion.';
                RETURN;
            END IF;

            v_nuevo := UPPER(v_nuevo);
            IF v_solicitud.id_tipo_documento_propuesto IS NOT NULL THEN
                SELECT solo_numerico, longitud_minima, longitud_maxima
                INTO v_solo_numerico, v_minimo, v_maximo
                FROM public.cfg_tipos_documento
                WHERE id_tipo_documento = v_solicitud.id_tipo_documento_propuesto AND activo;
                IF NOT FOUND THEN
                    p_estado := 'TIPO_DOCUMENTO_INVALIDO';
                    p_mensaje := 'Tipo documental no valido.';
                    RETURN;
                END IF;
            END IF;

            IF v_nuevo !~ '^[A-Z0-9-]+$'
               OR LENGTH(v_nuevo) < COALESCE(v_minimo, 1)
               OR LENGTH(v_nuevo) > COALESCE(v_maximo, 30)
               OR (COALESCE(v_solo_numerico, FALSE) AND v_nuevo !~ '^[0-9]+$')
            THEN
                p_estado := 'DOCUMENTO_INVALIDO';
                p_mensaje := 'El documento propuesto no cumple con las reglas del catalogo.';
                RETURN;
            END IF;

            UPDATE public.core_personas_documentos
            SET numero_documento = v_nuevo,
                id_tipo_documento = COALESCE(v_solicitud.id_tipo_documento_propuesto, id_tipo_documento),
                verificado = TRUE,
                fecha_actualizacion = NOW()
            WHERE id_persona_documento = v_solicitud.id_persona_documento;

            IF v_solicitud.modulo_origen = 'RRHH' THEN
                UPDATE public.seg_usuarios
                SET usuario_login = v_nuevo,
                    version_sesiones = version_sesiones + 1,
                    fecha_actualizacion = NOW()
                WHERE id_persona = v_solicitud.id_persona
                  AND UPPER(BTRIM(usuario_login)) = UPPER(BTRIM(v_solicitud.valor_anterior));
            END IF;

            IF v_solicitud.modulo_origen = 'RRHH'
               AND v_solicitud.id_estado_trabajador_previo IS NOT NULL
            THEN
                UPDATE public.rrhh_trabajadores
                SET id_estado_trabajador = v_solicitud.id_estado_trabajador_previo
                WHERE id_persona = v_solicitud.id_persona
                  AND id_estado_trabajador IN (
                    SELECT id_estado_trabajador FROM public.cfg_estados_trabajador
                    WHERE codigo = 'EN_VERIFICACION'
                  );
            END IF;

        ELSIF v_solicitud.tipo_dato = 'CONTACTO' THEN

            -- Validar formato del correo propuesto
            v_nuevo := LOWER(v_nuevo);
            IF LENGTH(v_nuevo) > 180 OR v_nuevo !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
                p_estado := 'EMAIL_INVALIDO';
                p_mensaje := 'El correo electronico propuesto es invalido.';
                RETURN;
            END IF;

            SELECT id_tipo_contacto INTO v_id_tipo_email
            FROM public.cfg_tipos_contacto
            WHERE codigo = 'EMAIL' AND activo;

            -- Revalidar unicidad: no pertenecer a otra persona
            IF EXISTS (
                SELECT 1 FROM public.core_personas_contactos
                WHERE id_tipo_contacto = v_id_tipo_email
                  AND activo = TRUE
                  AND LOWER(BTRIM(valor)) = v_nuevo
                  AND id_persona <> v_solicitud.id_persona
            ) THEN
                p_estado := 'CONFLICTO_UNICIDAD';
                p_mensaje := 'El correo propuesto ya se encuentra registrado por otra persona.';
                RETURN;
            END IF;

            -- El servidor debe generar el token y proporcionar únicamente su hash.
            IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$'
               OR p_fecha_expiracion IS NULL OR p_fecha_expiracion <= NOW()
               OR p_fecha_expiracion > NOW() + INTERVAL '24 hours' THEN
                p_estado := 'TOKEN_INVALIDO';
                p_mensaje := 'Falta un token seguro generado por el servidor.';
                RETURN;
            END IF;

            -- Si p_token_hash viene nulo, generarlo de forma segura
            IF p_token_hash IS NOT NULL AND p_token_hash ~ '^[0-9a-f]{64}$' THEN
                v_token_hash := p_token_hash;
                v_fecha_exp := COALESCE(p_fecha_expiracion, NOW() + INTERVAL '30 minutes');
                v_token_real := NULL;
            ELSE
                v_token_real := encode(gen_random_bytes(32), 'hex');
                v_token_hash := encode(sha256(v_token_real::bytea), 'hex');
                v_fecha_exp := NOW() + INTERVAL '30 minutes';
            END IF;

            -- Anular verificaciones previas pendientes de esta persona
            UPDATE public.core_verificaciones_cambio_correo
            SET fecha_anulacion = NOW()
            WHERE id_persona = v_solicitud.id_persona
              AND fecha_confirmacion IS NULL
              AND fecha_anulacion IS NULL;

            -- Registrar verificacion para envio de enlace de confirmacion
            INSERT INTO public.core_verificaciones_cambio_correo (
                id_persona,
                id_usuario_solicitante,
                correo_propuesto,
                token_hash,
                fecha_expiracion
            ) VALUES (
                v_solicitud.id_persona,
                p_id_actor,
                v_nuevo,
                v_token_hash,
                v_fecha_exp
            );

            -- IMPORTANTE: NO actualizar core_personas_contactos aqui.
            -- El correo solo se actualiza al confirmar el enlace.

        ELSE
            p_estado := 'TIPO_DATO_INVALIDO';
            p_mensaje := 'El tipo de correccion no es valido.';
            RETURN;
        END IF;

        v_estado_final := 'APROBADA';
        v_descripcion := 'Correccion de identidad aprobada.';

    ELSE
        -- RECHAZAR: No se modifica documento ni correo
        v_estado_final := 'RECHAZADA';
        v_descripcion := 'Correccion de identidad rechazada.';
    END IF;

    -- 8. REGISTRAR RESOLUCION EN SOLICITUD
    UPDATE public.core_solicitudes_correccion_identidad
    SET estado = v_estado_final,
        id_usuario_resolutor = p_id_actor,
        motivo_resolucion = v_motivo,
        fecha_resolucion = NOW()
    WHERE id_solicitud = p_id_solicitud;

    -- 9. AUDITORIA
    PERFORM public.sp_registrar_auditoria(
        p_id_actor,
        v_solicitud.modulo_origen::VARCHAR,
        v_decision::VARCHAR,
        'core_solicitudes_correccion_identidad'::VARCHAR,
        p_id_solicitud::VARCHAR,
        'EXITOSO'::VARCHAR,
        v_descripcion::VARCHAR,
        JSONB_BUILD_OBJECT(
            'idSolicitud', p_id_solicitud,
            'idPersona', v_solicitud.id_persona,
            'moduloOrigen', v_solicitud.modulo_origen,
            'tipoDato', v_solicitud.tipo_dato,
            'estadoFinal', v_estado_final
        )
    );

    -- 10. RESPUESTA
    p_resultado := JSONB_BUILD_OBJECT(
        'idSolicitud', p_id_solicitud,
        'idPersona', v_solicitud.id_persona,
        'estado', v_estado_final,
        'tipoDato', v_solicitud.tipo_dato,
        'correoPropuesto', v_nuevo,
        'tokenReal', v_token_real
    );

    p_estado := 'OK';
    IF v_estado_final = 'APROBADA' THEN
        IF v_solicitud.tipo_dato = 'CONTACTO' THEN
            p_mensaje := 'Cambio de correo aprobado. Se enviara enlace de confirmacion.';
        ELSE
            p_mensaje := 'Correccion documental aprobada y aplicada correctamente.';
        END IF;
    ELSE
        p_mensaje := 'Solicitud rechazada correctamente.';
    END IF;

EXCEPTION
    WHEN unique_violation THEN
        p_resultado := NULL;
        p_estado := 'CONFLICTO_UNICIDAD';
        p_mensaje := 'Conflicto de unicidad al procesar la resolucion.';
END;
$procedure$;

DO $verify$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_temp.rbac_hr_before b WHERE b.integral IS DISTINCT FROM public.fn_rrhh_actor_gestion_integral(b.id_usuario)
 OR b.reincorp IS DISTINCT FROM (public.fn_usuario_tiene_permiso_seguridad(b.id_usuario,'hr.approve') AND public.fn_usuario_tiene_permiso_seguridad(b.id_usuario,'hr.approve_reincorporation')))
 THEN RAISE EXCEPTION 'RBAC: cambió la autorización laboral de una cuenta existente'; END IF;
 IF EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.prokind IN ('f','p')
 AND case when p.prokind in ('f','p') then pg_get_functiondef(p.oid) ~* 'id_rol[[:space:]]*=[[:space:]]*25([^0-9]|$)' else false end)
 THEN RAISE EXCEPTION 'RBAC: persiste dependencia de id_rol=25'; END IF;
END; $verify$;
COMMIT;
