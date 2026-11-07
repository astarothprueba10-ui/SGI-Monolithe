-- Permitir a RRHH administrar cuentas y roles no protegidos usando permisos vigentes.
-- Las acciones de administracion privilegiada permanecen reservadas a Admin/Gerencia.
-- No se cambian roles existentes ni se conceden permisos nuevos en seg_roles_permisos.
-- IMPORTANT: no ejecutar por separado de los cambios de auth-service.

-- fn_seguridad_actor_permiso_rol
CREATE OR REPLACE FUNCTION public.fn_seguridad_actor_permiso_rol(p_id_actor bigint, p_codigo_permiso text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.seg_usuarios u
        JOIN public.cfg_estados_usuario eu
          ON eu.id_estado_usuario = u.id_estado_usuario
         AND eu.codigo = 'ACTIVO'
         AND eu.activo
         AND eu.permite_acceso
        JOIN public.seg_usuarios_roles ur
          ON ur.id_usuario = u.id_usuario
         AND ur.activo
        JOIN public.seg_roles r
          ON r.id_rol = ur.id_rol
         AND r.activo
         AND r.codigo IN ('ADMINISTRADOR', 'GERENCIA', 'RRHH')
        JOIN public.seg_roles_permisos rp
          ON rp.id_rol = r.id_rol
         AND rp.activo
        JOIN public.seg_permisos p
          ON p.id_permiso = rp.id_permiso
         AND p.activo
         AND p.codigo = p_codigo_permiso
        WHERE u.id_usuario = p_id_actor
    );
$function$


-- fn_usuario_objetivo_gestionable
CREATE OR REPLACE FUNCTION public.fn_usuario_objetivo_gestionable(p_id_actor bigint, p_id_usuario_objetivo bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN

    IF p_id_actor IS NULL
       OR p_id_usuario_objetivo IS NULL THEN
        RETURN FALSE;
    END IF;


    -- Un actor con capacidad administrativa avanzada sobre roles
    -- no queda limitado por asignable_rrhh.
    IF public.fn_usuario_tiene_permiso_seguridad(
        p_id_actor,
        'roles.assign_permissions'
    ) AND EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ar
        JOIN public.seg_roles ar_rol ON ar_rol.id_rol=ar.id_rol
        WHERE ar.id_usuario=p_id_actor AND ar.activo IS TRUE
          AND ar.fecha_revocacion IS NULL
          AND ar_rol.activo IS TRUE
          AND ar_rol.codigo IN ('ADMINISTRADOR','GERENCIA')
    ) THEN
        RETURN TRUE;
    END IF;


    -- Un actor restringido solo puede administrar cuentas que:
    --   - aun no posean roles, o
    --   - posean exclusivamente roles asignables por RRHH.
    RETURN NOT EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ur
        INNER JOIN public.seg_roles r
            ON r.id_rol = ur.id_rol
        WHERE ur.id_usuario = p_id_usuario_objetivo
          AND ur.activo = TRUE
          AND (
                r.activo = FALSE
                OR r.asignable_rrhh = FALSE
          )
    );

END;
$function$


-- sp_asignar_rol_usuario
CREATE OR REPLACE PROCEDURE public.sp_asignar_rol_usuario(IN p_id_actor bigint, IN p_id_usuario bigint, IN p_codigo_rol character varying, OUT p_estado character varying, OUT p_mensaje character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $procedure$
DECLARE
 v_id_rol INT;
 v_codigo_rol VARCHAR(40);
 v_asignable_rrhh BOOLEAN;
 v_es_interno BOOLEAN;
 v_actor_privilegiado BOOLEAN;
 v_id_persona BIGINT;
 v_rol_cliente_valido BOOLEAN;
 v_trabajador_activo BOOLEAN;
BEGIN
 p_estado:='INVALIDO';p_mensaje:='No fue posible asignar el rol.';

 IF p_id_actor IS NULL OR NOT COALESCE(
   public.fn_usuario_tiene_permiso_seguridad(p_id_actor,'users.assign_role'),FALSE) THEN
  p_estado:='DENEGADO';p_mensaje:='No posee permiso para asignar roles a usuarios.';RETURN;
 END IF;

 IF p_id_actor=p_id_usuario THEN
  p_estado:='USUARIO_PROTEGIDO';
  p_mensaje:='No es posible modificar roles de la propia cuenta.'; RETURN;
 END IF;
 SELECT u.id_persona INTO v_id_persona FROM public.seg_usuarios u
 WHERE u.id_usuario=p_id_usuario FOR UPDATE;
 IF NOT FOUND THEN
  p_estado:='USUARIO_NO_ENCONTRADO';p_mensaje:='El usuario no existe.';RETURN;
 END IF;

 v_codigo_rol:=UPPER(BTRIM(p_codigo_rol));
 SELECT r.id_rol,r.asignable_rrhh,r.es_interno
 INTO v_id_rol,v_asignable_rrhh,v_es_interno
 FROM public.seg_roles r WHERE r.codigo=v_codigo_rol AND r.activo IS TRUE LIMIT 1;
 IF v_id_rol IS NULL THEN
  p_estado:='ROL_NO_ENCONTRADO';p_mensaje:='El rol indicado no existe o se encuentra inactivo.';RETURN;
 END IF;

 v_rol_cliente_valido:=EXISTS (
  SELECT 1 FROM public.crm_clientes c WHERE c.id_persona=v_id_persona AND c.activo IS TRUE
 );
 v_trabajador_activo:=EXISTS (
  SELECT 1 FROM public.rrhh_trabajadores t
  JOIN public.cfg_estados_trabajador e ON e.id_estado_trabajador=t.id_estado_trabajador
  WHERE t.id_persona=v_id_persona AND e.codigo='ACTIVO' AND e.activo IS TRUE
 );

 -- CLIENTE solo corresponde a una vinculación CRM real y vigente.
 IF v_codigo_rol='CLIENTE' AND NOT v_rol_cliente_valido THEN
  p_estado:='RELACION_CLIENTE_REQUERIDA';
  p_mensaje:='El rol CLIENTE requiere una vinculacion CRM activa.';RETURN;
 END IF;

 -- Los roles internos solo corresponden a trabajadores activos.
 IF v_es_interno IS TRUE AND NOT v_trabajador_activo THEN
  p_estado:='ESTADO_LABORAL_NO_APTO';
  p_mensaje:='Los roles internos requieren trabajador ACTIVO.';RETURN;
 END IF;

 v_actor_privilegiado:=COALESCE(
  public.fn_usuario_tiene_permiso_seguridad(p_id_actor,'roles.assign_permissions'),FALSE)
  AND EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ar
        JOIN public.seg_roles ar_rol ON ar_rol.id_rol=ar.id_rol
        WHERE ar.id_usuario=p_id_actor AND ar.activo IS TRUE
          AND ar.fecha_revocacion IS NULL
          AND ar_rol.activo IS TRUE
          AND ar_rol.codigo IN ('ADMINISTRADOR','GERENCIA')
    );

 IF NOT v_actor_privilegiado THEN
  -- Un actor delegado no puede asignar roles internos protegidos.
  -- CLIENTE es la excepcion, pero solo para clientes autenticos.
  IF v_codigo_rol<>'CLIENTE' AND NOT COALESCE(v_asignable_rrhh,FALSE) THEN
   p_estado:='ROL_PROTEGIDO';
   p_mensaje:='El rol solicitado no puede ser asignado por RRHH.';RETURN;
  END IF;

  -- Bloquea gestionar cuentas con roles protegidos diferentes de CLIENTE.
  -- Permite completar los roles de un trabajador que tambien es cliente.
  IF EXISTS (
   SELECT 1 FROM public.seg_usuarios_roles ur
   JOIN public.seg_roles r ON r.id_rol=ur.id_rol
   WHERE ur.id_usuario=p_id_usuario AND ur.activo IS TRUE
   AND (r.activo IS FALSE OR (r.asignable_rrhh IS FALSE AND r.codigo<>'CLIENTE'))
  ) THEN
   p_estado:='USUARIO_PROTEGIDO';
   p_mensaje:='No posee autorizacion para modificar los roles de esta cuenta.';RETURN;
  END IF;
 END IF;

 INSERT INTO public.seg_usuarios_roles (
  id_usuario,id_rol,fecha_asignacion,fecha_revocacion,activo,asignado_por
 ) VALUES (
  p_id_usuario,v_id_rol,timezone('utc'::text,NOW()),NULL,TRUE,p_id_actor
 )
 ON CONFLICT (id_usuario,id_rol) DO UPDATE
 SET fecha_asignacion=timezone('utc'::text,NOW()),
     fecha_revocacion=NULL,activo=TRUE,asignado_por=p_id_actor;

 UPDATE public.seg_sesiones SET fecha_revocacion=timezone('utc'::text,NOW()),
  motivo_revocacion='CAMBIO_ROLES'
 WHERE id_usuario=p_id_usuario AND fecha_revocacion IS NULL;

 PERFORM public.sp_registrar_auditoria(
  p_id_actor,'SEGURIDAD','ASIGNAR_ROL','seg_usuarios_roles',p_id_usuario::VARCHAR,
  'EXITOSO','Rol asignado a usuario.',
  jsonb_build_object('id_usuario',p_id_usuario,'rol',v_codigo_rol)
 );
 p_estado:='ASIGNADO';p_mensaje:='Rol asignado correctamente.';
END;
$procedure$


-- sp_revocar_rol_usuario
CREATE OR REPLACE PROCEDURE public.sp_revocar_rol_usuario(IN p_id_actor bigint, IN p_id_usuario bigint, IN p_codigo_rol character varying, OUT p_estado character varying, OUT p_mensaje character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $procedure$
DECLARE
 v_id_rol INT;
 v_codigo_rol VARCHAR(40);
 v_asignable_rrhh BOOLEAN;
 v_actor_privilegiado BOOLEAN;
 v_permite_acceso BOOLEAN;
 v_roles_restantes INTEGER;
 v_id_persona BIGINT;
BEGIN
 p_estado:='INVALIDO';p_mensaje:='No fue posible revocar el rol.';
 IF NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_id_actor,'users.assign_role'),FALSE) THEN
  p_estado:='DENEGADO';p_mensaje:='No posee permiso para modificar roles de usuarios.';RETURN;
 END IF;

 IF p_id_actor=p_id_usuario THEN
  p_estado:='USUARIO_PROTEGIDO';
  p_mensaje:='No es posible modificar roles de la propia cuenta.'; RETURN;
 END IF;
 SELECT eu.permite_acceso,u.id_persona
 INTO v_permite_acceso,v_id_persona
 FROM public.seg_usuarios u
 JOIN public.cfg_estados_usuario eu ON eu.id_estado_usuario=u.id_estado_usuario
 WHERE u.id_usuario=p_id_usuario FOR UPDATE OF u;
 IF NOT FOUND THEN
  p_estado:='USUARIO_NO_ENCONTRADO';p_mensaje:='El usuario no existe.';RETURN;
 END IF;

 v_codigo_rol:=UPPER(BTRIM(p_codigo_rol));
 SELECT r.id_rol,r.asignable_rrhh INTO v_id_rol,v_asignable_rrhh
 FROM public.seg_roles r WHERE r.codigo=v_codigo_rol LIMIT 1;
 IF v_id_rol IS NULL THEN
  p_estado:='ROL_NO_ENCONTRADO';p_mensaje:='El rol indicado no existe.';RETURN;
 END IF;
 IF NOT EXISTS(
  SELECT 1 FROM public.seg_usuarios_roles
  WHERE id_usuario=p_id_usuario AND id_rol=v_id_rol AND activo IS TRUE
 ) THEN
  p_estado:='ROL_NO_ASIGNADO';p_mensaje:='El usuario no posee actualmente ese rol.';RETURN;
 END IF;

 -- La vinculacion CRM activa exige conservar CLIENTE.
 IF v_codigo_rol='CLIENTE' AND EXISTS(
  SELECT 1 FROM public.crm_clientes c WHERE c.id_persona=v_id_persona AND c.activo IS TRUE
 ) THEN
  p_estado:='ROL_CLIENTE_OBLIGATORIO';
  p_mensaje:='No puede revocar CLIENTE mientras exista una vinculacion CRM activa.';RETURN;
 END IF;

 v_actor_privilegiado:=COALESCE(
  public.fn_usuario_tiene_permiso_seguridad(p_id_actor,'roles.assign_permissions'),FALSE)
  AND EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ar
        JOIN public.seg_roles ar_rol ON ar_rol.id_rol=ar.id_rol
        WHERE ar.id_usuario=p_id_actor AND ar.activo IS TRUE
          AND ar.fecha_revocacion IS NULL
          AND ar_rol.activo IS TRUE
          AND ar_rol.codigo IN ('ADMINISTRADOR','GERENCIA')
    );
 IF NOT v_actor_privilegiado THEN
  IF NOT public.fn_usuario_objetivo_gestionable(p_id_actor,p_id_usuario) THEN
   p_estado:='USUARIO_PROTEGIDO';
   p_mensaje:='No posee autorizacion para modificar los roles de esta cuenta.';RETURN;
  END IF;
  IF NOT COALESCE(v_asignable_rrhh,FALSE) THEN
   p_estado:='ROL_PROTEGIDO';
   p_mensaje:='El rol indicado no puede ser administrado por RRHH.';RETURN;
  END IF;
 END IF;

 SELECT COUNT(*) INTO v_roles_restantes
 FROM public.seg_usuarios_roles ur
 JOIN public.seg_roles r ON r.id_rol=ur.id_rol
 WHERE ur.id_usuario=p_id_usuario AND ur.activo IS TRUE
  AND r.activo IS TRUE AND ur.id_rol<>v_id_rol;
 IF COALESCE(v_permite_acceso,FALSE) AND v_roles_restantes=0 THEN
  p_estado:='ULTIMO_ROL';
  p_mensaje:='No puede retirar el ultimo rol de una cuenta activa.';RETURN;
 END IF;

 UPDATE public.seg_usuarios_roles SET activo=FALSE,
  fecha_revocacion=timezone('utc'::text,NOW())
 WHERE id_usuario=p_id_usuario AND id_rol=v_id_rol AND activo IS TRUE;

 UPDATE public.seg_sesiones SET fecha_revocacion=timezone('utc'::text,NOW()),
  motivo_revocacion='CAMBIO_ROLES'
 WHERE id_usuario=p_id_usuario AND fecha_revocacion IS NULL;

 PERFORM public.sp_registrar_auditoria(
  p_id_actor,'SEGURIDAD','REVOCAR_ROL','seg_usuarios_roles',
  p_id_usuario::VARCHAR,'EXITOSO','Rol revocado de usuario.',
  jsonb_build_object('id_usuario',p_id_usuario,'rol',v_codigo_rol)
 );
 p_estado:='REVOCADO';p_mensaje:='Rol revocado correctamente.';
END;
$procedure$


-- sp_actualizar_permisos_rol_seguridad
CREATE OR REPLACE PROCEDURE public.sp_actualizar_permisos_rol_seguridad(IN p_id_actor bigint, IN p_codigo_rol character varying, IN p_codigos_permisos text[], OUT p_estado character varying, OUT p_mensaje character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
      AND activo = TRUE;

    IF v_id_rol IS NULL THEN
        p_estado := 'NO_ENCONTRADO';
        p_mensaje := 'El rol indicado no existe o está inactivo.';
        RETURN;
    END IF;

    /* Delegacion RRHH: no modificar roles del sistema ni conceder privilegios
       de seguridad a roles personalizados (escalada de privilegios). */
    IF EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ar
        JOIN public.seg_roles ar_rol ON ar_rol.id_rol=ar.id_rol
        WHERE ar.id_usuario=p_id_actor AND ar.activo IS TRUE
          AND ar.fecha_revocacion IS NULL
          AND ar_rol.activo IS TRUE
          AND ar_rol.codigo='RRHH'
    ) AND NOT EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ar
        JOIN public.seg_roles ar_rol ON ar_rol.id_rol=ar.id_rol
        WHERE ar.id_usuario=p_id_actor AND ar.activo IS TRUE
          AND ar.fecha_revocacion IS NULL
          AND ar_rol.activo IS TRUE
          AND ar_rol.codigo IN ('ADMINISTRADOR','GERENCIA')
    ) THEN
        IF EXISTS (SELECT 1 FROM public.seg_roles r
                   WHERE r.id_rol=v_id_rol AND
                       (r.es_sistema IS TRUE OR r.codigo IN ('ADMINISTRADOR','GERENCIA','CLIENTE','RRHH'))) THEN
            p_estado := 'PROTEGIDO';
            p_mensaje := 'RRHH no puede cambiar permisos de roles del sistema.';
            RETURN;
        END IF;
        IF EXISTS (SELECT 1 FROM unnest(COALESCE(p_codigos_permisos,ARRAY[]::text[])) AS x(codigo)
                   WHERE split_part(btrim(x.codigo), '.', 1) IN ('users','roles','permissions','audit')) THEN
            p_estado := 'DENEGADO';
            p_mensaje := 'RRHH no puede delegar permisos de administracion de seguridad.';
            RETURN;
        END IF;
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
$procedure$


-- sp_actualizar_datos_rol_seguridad
CREATE OR REPLACE PROCEDURE public.sp_actualizar_datos_rol_seguridad(IN p_id_actor bigint, IN p_codigo_rol character varying, IN p_nombre character varying, IN p_descripcion character varying, OUT p_estado character varying, OUT p_mensaje character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $procedure$
DECLARE
    v_id_rol INT;
    v_nombre_anterior VARCHAR(100);
    v_descripcion_anterior VARCHAR(255);
    v_es_sistema BOOLEAN;
    v_activo BOOLEAN;
    v_antes JSONB;
    v_despues JSONB;
BEGIN
    IF NOT public.fn_seguridad_actor_permiso_rol(p_id_actor, 'roles.edit') THEN
        p_estado := 'DENEGADO';
        p_mensaje := 'Se requiere ADMINISTRADOR o GERENCIA con el permiso roles.edit.';
        PERFORM public.fn_auditar_rol_crud(p_id_actor, 'EDITAR_ROL', p_codigo_rol, 'DENEGADO', p_mensaje, NULL, NULL);
        RETURN;
    END IF;

    IF p_codigo_rol IS NULL OR btrim(p_codigo_rol) = ''
       OR p_nombre IS NULL OR char_length(btrim(p_nombre)) < 2
       OR char_length(btrim(p_nombre)) > 100
       OR (p_descripcion IS NOT NULL AND char_length(btrim(p_descripcion)) > 255) THEN
        p_estado := 'DATOS_INVALIDOS';
        p_mensaje := 'El código, nombre o descripción del rol no es válido.';
        PERFORM public.fn_auditar_rol_crud(p_id_actor, 'EDITAR_ROL', p_codigo_rol, 'FALLIDO', p_mensaje, NULL, NULL);
        RETURN;
    END IF;

    SELECT id_rol, nombre, descripcion, es_sistema, activo
      INTO v_id_rol, v_nombre_anterior, v_descripcion_anterior, v_es_sistema, v_activo
      FROM public.seg_roles
     WHERE codigo = p_codigo_rol
     FOR UPDATE;
    IF NOT FOUND THEN
        p_estado := 'NO_ENCONTRADO';
        p_mensaje := 'El rol indicado no existe.';
        PERFORM public.fn_auditar_rol_crud(p_id_actor, 'EDITAR_ROL', p_codigo_rol, 'FALLIDO', p_mensaje, NULL, NULL);
        RETURN;
    END IF;

    /* RRHH puede editar roles personalizados, nunca los roles del sistema. */
    IF v_es_sistema IS TRUE AND EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ar
        JOIN public.seg_roles ar_rol ON ar_rol.id_rol=ar.id_rol
        WHERE ar.id_usuario=p_id_actor AND ar.activo IS TRUE
          AND ar.fecha_revocacion IS NULL
          AND ar_rol.activo IS TRUE
          AND ar_rol.codigo='RRHH'
    ) AND NOT EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ar
        JOIN public.seg_roles ar_rol ON ar_rol.id_rol=ar.id_rol
        WHERE ar.id_usuario=p_id_actor AND ar.activo IS TRUE
          AND ar.fecha_revocacion IS NULL
          AND ar_rol.activo IS TRUE
          AND ar_rol.codigo IN ('ADMINISTRADOR','GERENCIA')
    ) THEN
        p_estado := 'PROTEGIDO';
        p_mensaje := 'RRHH no puede editar roles del sistema.';
        RETURN;
    END IF;

    v_antes := jsonb_build_object('nombre', v_nombre_anterior, 'descripcion', v_descripcion_anterior);
    IF EXISTS (
        SELECT 1 FROM public.seg_roles
         WHERE id_rol <> v_id_rol
           AND lower(btrim(nombre)) = lower(btrim(p_nombre))
    ) THEN
        p_estado := 'ROL_EXISTENTE';
        p_mensaje := 'Ya existe otro rol con ese nombre.';
        PERFORM public.fn_auditar_rol_crud(p_id_actor, 'EDITAR_ROL', p_codigo_rol, 'FALLIDO', p_mensaje, v_antes, NULL);
        RETURN;
    END IF;

    BEGIN
        UPDATE public.seg_roles
           SET nombre = btrim(p_nombre),
               descripcion = nullif(btrim(p_descripcion), ''),
               fecha_actualizacion = timezone('utc'::text, now())
         WHERE id_rol = v_id_rol;
    EXCEPTION WHEN unique_violation THEN
        p_estado := 'ROL_EXISTENTE';
        p_mensaje := 'Ya existe otro rol con ese nombre.';
        PERFORM public.fn_auditar_rol_crud(p_id_actor, 'EDITAR_ROL', p_codigo_rol, 'FALLIDO', p_mensaje, v_antes, NULL);
        RETURN;
    END;

    v_despues := jsonb_build_object('nombre', btrim(p_nombre), 'descripcion', nullif(btrim(p_descripcion), ''));
    p_estado := 'ACTUALIZADO';
    p_mensaje := 'Se actualizaron el nombre y la descripción. Los permisos del rol no cambiaron.';
    PERFORM public.fn_auditar_rol_crud(p_id_actor, 'EDITAR_ROL', p_codigo_rol, 'EXITOSO', p_mensaje, v_antes, v_despues);
END;
$procedure$


-- sp_reactivar_rol_seguridad
CREATE OR REPLACE PROCEDURE public.sp_reactivar_rol_seguridad(IN p_id_actor bigint, IN p_codigo_rol character varying, OUT p_estado character varying, OUT p_mensaje character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $procedure$
DECLARE
    v_id_rol INT;
    v_nombre VARCHAR(100);
    v_activo BOOLEAN;
    v_usuarios BIGINT[];
BEGIN
    IF NOT public.fn_seguridad_actor_permiso_rol(p_id_actor, 'roles.activate') THEN
        p_estado := 'DENEGADO';
        p_mensaje := 'Se requiere ADMINISTRADOR o GERENCIA con el permiso roles.activate.';
        PERFORM public.fn_auditar_rol_crud(p_id_actor, 'REACTIVAR_ROL', p_codigo_rol, 'DENEGADO', p_mensaje, NULL, NULL);
        RETURN;
    END IF;

    SELECT id_rol, nombre, activo
      INTO v_id_rol, v_nombre, v_activo
      FROM public.seg_roles
     WHERE codigo = p_codigo_rol
     FOR UPDATE;
    IF NOT FOUND THEN
        p_estado := 'NO_ENCONTRADO';
        p_mensaje := 'El rol indicado no existe.';
        PERFORM public.fn_auditar_rol_crud(p_id_actor, 'REACTIVAR_ROL', p_codigo_rol, 'FALLIDO', p_mensaje, NULL, NULL);
        RETURN;
    END IF;

    /* RRHH no puede reactivar roles del sistema. */
    IF EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ar
        JOIN public.seg_roles ar_rol ON ar_rol.id_rol=ar.id_rol
        WHERE ar.id_usuario=p_id_actor AND ar.activo IS TRUE
          AND ar.fecha_revocacion IS NULL
          AND ar_rol.activo IS TRUE
          AND ar_rol.codigo='RRHH'
    ) AND NOT EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ar
        JOIN public.seg_roles ar_rol ON ar_rol.id_rol=ar.id_rol
        WHERE ar.id_usuario=p_id_actor AND ar.activo IS TRUE
          AND ar.fecha_revocacion IS NULL
          AND ar_rol.activo IS TRUE
          AND ar_rol.codigo IN ('ADMINISTRADOR','GERENCIA')
    )
       AND EXISTS (SELECT 1 FROM public.seg_roles r WHERE r.id_rol=v_id_rol AND r.es_sistema IS TRUE) THEN
        p_estado := 'PROTEGIDO';
        p_mensaje := 'RRHH no puede reactivar roles del sistema.';
        RETURN;
    END IF;

    IF v_activo THEN
        p_estado := 'YA_ACTIVO';
        p_mensaje := 'El rol ya está activo.';
        PERFORM public.fn_auditar_rol_crud(p_id_actor, 'REACTIVAR_ROL', p_codigo_rol, 'FALLIDO', p_mensaje,
            jsonb_build_object('nombre', v_nombre, 'activo', v_activo), NULL);
        RETURN;
    END IF;

    SELECT coalesce(array_agg(DISTINCT id_usuario), ARRAY[]::BIGINT[])
      INTO v_usuarios
      FROM public.seg_usuarios_roles
     WHERE id_rol = v_id_rol AND activo;

    UPDATE public.seg_roles
       SET activo = TRUE,
           fecha_actualizacion = timezone('utc'::text, now())
     WHERE id_rol = v_id_rol;

    IF cardinality(v_usuarios) > 0 THEN
        UPDATE public.seg_usuarios
           SET version_sesiones = version_sesiones + 1,
               fecha_actualizacion = timezone('utc'::text, now())
         WHERE id_usuario = ANY(v_usuarios);
        UPDATE public.seg_sesiones
           SET fecha_revocacion = timezone('utc'::text, now()),
               motivo_revocacion = 'Rol reactivado; renovar permisos efectivos'
         WHERE id_usuario = ANY(v_usuarios)
           AND fecha_revocacion IS NULL
           AND fecha_expiracion > timezone('utc'::text, now());
    END IF;

    p_estado := 'REACTIVADO';
    p_mensaje := 'Rol reactivado. Se invalidaron las sesiones que podrían conservar permisos anteriores.';
    PERFORM public.fn_auditar_rol_crud(p_id_actor, 'REACTIVAR_ROL', p_codigo_rol, 'EXITOSO', p_mensaje,
        jsonb_build_object('nombre', v_nombre, 'activo', FALSE),
        jsonb_build_object('nombre', v_nombre, 'activo', TRUE, 'sesionesInvalidables', cardinality(v_usuarios)));
END;
$procedure$

