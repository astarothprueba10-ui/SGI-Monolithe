-- ==============================================================================
-- SGI MONOLITHE
-- MIGRACION 18 - MODELO DE ROLES Y PERMISOS
--
-- Objetivos:
--   1. Separar usuarios, roles y permisos.
--   2. GERENCIA obtiene todos los permisos activos.
--   3. ADMINISTRADOR queda limitado a seguridad y auditoria.
--   4. RRHH administra cuentas internas de trabajadores.
--   5. Los permisos se definen por el sistema, no desde texto libre.
--   6. Eliminar autorizaciones de negocio basadas directamente en nombres de rol.
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. ACTUALIZAR DESCRIPCIONES DE ROLES DEL SISTEMA
-- ==============================================================================

UPDATE public.seg_roles
SET
    descripcion = 'Administracion de seguridad, roles, permisos y auditoria del SIGI MONOLITHE',
    fecha_actualizacion = timezone('utc'::text, now())
WHERE codigo = 'ADMINISTRADOR';

UPDATE public.seg_roles
SET
    descripcion = 'Acceso integral a todos los modulos y operaciones del SIGI MONOLITHE',
    fecha_actualizacion = timezone('utc'::text, now())
WHERE codigo = 'GERENCIA';

UPDATE public.seg_roles
SET
    descripcion = 'Gestion de trabajadores, asesores, cuentas internas y recursos humanos',
    fecha_actualizacion = timezone('utc'::text, now())
WHERE codigo = 'RRHH';


-- ==============================================================================
-- 2. CORREGIR PERMISOS EXISTENTES DEL MODULO USERS
-- ==============================================================================

UPDATE public.seg_permisos
SET
    nombre = 'Ver usuarios',
    descripcion = 'Consultar usuarios y cuentas de acceso del SIGI MONOLITHE',
    fecha_actualizacion = timezone('utc'::text, now())
WHERE codigo = 'users.view';

UPDATE public.seg_permisos
SET
    nombre = 'Crear usuarios',
    descripcion = 'Crear cuentas de usuario del SIGI MONOLITHE',
    fecha_actualizacion = timezone('utc'::text, now())
WHERE codigo = 'users.create';

UPDATE public.seg_permisos
SET
    nombre = 'Editar usuarios',
    descripcion = 'Editar datos de cuentas de usuario del SIGI MONOLITHE',
    fecha_actualizacion = timezone('utc'::text, now())
WHERE codigo = 'users.edit';

UPDATE public.seg_permisos
SET
    nombre = 'Exportar usuarios',
    descripcion = 'Exportar informacion de usuarios del SIGI MONOLITHE',
    fecha_actualizacion = timezone('utc'::text, now())
WHERE codigo = 'users.export';


-- ==============================================================================
-- 3. DESACTIVAR ELIMINACION FISICA DE USUARIOS
--
-- Las cuentas no deben eliminarse porque poseen historial, auditoria,
-- sesiones, asignaciones y operaciones relacionadas.
-- ==============================================================================

UPDATE public.seg_permisos
SET
    activo = FALSE,
    nombre = 'Eliminar usuarios (obsoleto)',
    descripcion = 'Permiso deshabilitado. Las cuentas deben activarse o desactivarse, no eliminarse.',
    fecha_actualizacion = timezone('utc'::text, now())
WHERE codigo = 'users.delete';

UPDATE public.seg_roles_permisos rp
SET activo = FALSE
WHERE rp.id_permiso = (
    SELECT p.id_permiso
    FROM public.seg_permisos p
    WHERE p.codigo = 'users.delete'
    LIMIT 1
);


-- ==============================================================================
-- 4. NUEVOS PERMISOS DE GESTION DE USUARIOS
-- ==============================================================================

INSERT INTO public.seg_permisos (
    codigo,
    modulo,
    recurso,
    accion,
    nombre,
    descripcion,
    activo
)
VALUES
(
    'users.activate',
    'users',
    'users',
    'activate',
    'Activar usuarios',
    'Habilitar una cuenta de usuario previamente desactivada',
    TRUE
),
(
    'users.deactivate',
    'users',
    'users',
    'deactivate',
    'Desactivar usuarios',
    'Deshabilitar una cuenta de usuario sin eliminar su historial',
    TRUE
),
(
    'users.assign_role',
    'users',
    'users',
    'assign_role',
    'Asignar roles a usuarios',
    'Asignar o revocar roles disponibles a una cuenta de usuario',
    TRUE
)
ON CONFLICT (codigo)
DO UPDATE SET
    modulo = EXCLUDED.modulo,
    recurso = EXCLUDED.recurso,
    accion = EXCLUDED.accion,
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    activo = TRUE,
    fecha_actualizacion = timezone('utc'::text, now());


-- ==============================================================================
-- 5. PERMISOS DE GESTION DE ROLES
-- ==============================================================================

INSERT INTO public.seg_permisos (
    codigo,
    modulo,
    recurso,
    accion,
    nombre,
    descripcion,
    activo
)
VALUES
(
    'roles.view',
    'roles',
    'roles',
    'view',
    'Ver roles',
    'Consultar los roles existentes en el SIGI MONOLITHE',
    TRUE
),
(
    'roles.create',
    'roles',
    'roles',
    'create',
    'Crear roles',
    'Crear nuevos roles personalizados',
    TRUE
),
(
    'roles.edit',
    'roles',
    'roles',
    'edit',
    'Editar roles',
    'Modificar nombre y descripcion de roles administrables',
    TRUE
),
(
    'roles.deactivate',
    'roles',
    'roles',
    'deactivate',
    'Desactivar roles',
    'Desactivar roles personalizados sin eliminarlos fisicamente',
    TRUE
),
(
    'roles.assign_permissions',
    'roles',
    'roles',
    'assign_permissions',
    'Asignar permisos a roles',
    'Asignar o revocar permisos existentes a los roles administrables',
    TRUE
)
ON CONFLICT (codigo)
DO UPDATE SET
    modulo = EXCLUDED.modulo,
    recurso = EXCLUDED.recurso,
    accion = EXCLUDED.accion,
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    activo = TRUE,
    fecha_actualizacion = timezone('utc'::text, now());


-- ==============================================================================
-- 6. PERMISO PARA CONSULTAR EL CATALOGO DE PERMISOS
--
-- No se crea permissions.create.
-- Los permisos son capacidades implementadas por el sistema y se incorporan
-- mediante desarrollo/migraciones.
-- ==============================================================================

INSERT INTO public.seg_permisos (
    codigo,
    modulo,
    recurso,
    accion,
    nombre,
    descripcion,
    activo
)
VALUES
(
    'permissions.view',
    'permissions',
    'permissions',
    'view',
    'Ver permisos',
    'Consultar el catalogo de permisos disponibles del SIGI MONOLITHE',
    TRUE
)
ON CONFLICT (codigo)
DO UPDATE SET
    modulo = EXCLUDED.modulo,
    recurso = EXCLUDED.recurso,
    accion = EXCLUDED.accion,
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    activo = TRUE,
    fecha_actualizacion = timezone('utc'::text, now());


-- ==============================================================================
-- 7. ADMINISTRADOR
--
-- El Administrador NO es superusuario del negocio.
--
-- Puede:
--   - consultar usuarios
--   - gestionar roles
--   - asignar permisos existentes a roles
--   - consultar catalogo de permisos
--   - consultar/exportar auditoria
--
-- No puede operar:
--   proyectos, lotes, CRM, ventas, finanzas, marketing, RRHH, etc.
-- ==============================================================================

UPDATE public.seg_roles_permisos
SET activo = FALSE
WHERE id_rol = (
    SELECT id_rol
    FROM public.seg_roles
    WHERE codigo = 'ADMINISTRADOR'
    LIMIT 1
);

INSERT INTO public.seg_roles_permisos (
    id_rol,
    id_permiso,
    activo
)
SELECT
    r.id_rol,
    p.id_permiso,
    TRUE
FROM public.seg_roles r
CROSS JOIN public.seg_permisos p
WHERE r.codigo = 'ADMINISTRADOR'
  AND r.activo = TRUE
  AND p.activo = TRUE
  AND p.codigo IN (
      'users.view',
      'roles.view',
      'roles.create',
      'roles.edit',
      'roles.deactivate',
      'roles.assign_permissions',
      'permissions.view',
      'audit.view',
      'audit.export'
  )
ON CONFLICT (id_rol, id_permiso)
DO UPDATE SET
    activo = TRUE;


-- ==============================================================================
-- 8. RRHH
--
-- RRHH administra:
--   - trabajadores
--   - asesores
--   - cuentas internas
--   - asignacion de roles existentes
--
-- RRHH NO puede crear roles ni modificar sus permisos.
-- ==============================================================================

UPDATE public.seg_roles_permisos
SET activo = FALSE
WHERE id_rol = (
    SELECT id_rol
    FROM public.seg_roles
    WHERE codigo = 'RRHH'
    LIMIT 1
);

INSERT INTO public.seg_roles_permisos (
    id_rol,
    id_permiso,
    activo
)
SELECT
    r.id_rol,
    p.id_permiso,
    TRUE
FROM public.seg_roles r
CROSS JOIN public.seg_permisos p
WHERE r.codigo = 'RRHH'
  AND r.activo = TRUE
  AND p.activo = TRUE
  AND (
        p.codigo = 'dashboard.view'

        OR p.modulo IN (
            'advisors',
            'hr'
        )

        OR p.codigo IN (
            'users.view',
            'users.create',
            'users.edit',
            'users.activate',
            'users.deactivate'
        )
  )
ON CONFLICT (id_rol, id_permiso)
DO UPDATE SET
    activo = TRUE;


-- ==============================================================================
-- 9. GERENCIA
--
-- GERENCIA es el rol con acceso integral.
-- Recibe todos los permisos activos existentes actualmente.
-- ==============================================================================

UPDATE public.seg_roles_permisos
SET activo = FALSE
WHERE id_rol = (
    SELECT id_rol
    FROM public.seg_roles
    WHERE codigo = 'GERENCIA'
    LIMIT 1
);

INSERT INTO public.seg_roles_permisos (
    id_rol,
    id_permiso,
    activo
)
SELECT
    r.id_rol,
    p.id_permiso,
    TRUE
FROM public.seg_roles r
CROSS JOIN public.seg_permisos p
WHERE r.codigo = 'GERENCIA'
  AND r.activo = TRUE
  AND p.activo = TRUE
ON CONFLICT (id_rol, id_permiso)
DO UPDATE SET
    activo = TRUE;


-- ==============================================================================
-- 10. SINCRONIZACION AUTOMATICA DE PERMISOS CON GERENCIA
--
-- Cuando en futuras migraciones se cree un permiso activo,
-- GERENCIA lo recibira automaticamente.
--
-- Si un permiso se desactiva, tambien se desactiva su asignacion a GERENCIA.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fn_sincronizar_permiso_gerencia()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_gerencia INT;
BEGIN

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
$$;

DROP TRIGGER IF EXISTS trg_sincronizar_permiso_gerencia
ON public.seg_permisos;

CREATE TRIGGER trg_sincronizar_permiso_gerencia
AFTER INSERT OR UPDATE OF activo
ON public.seg_permisos
FOR EACH ROW
EXECUTE FUNCTION public.fn_sincronizar_permiso_gerencia();

REVOKE ALL
ON FUNCTION public.fn_sincronizar_permiso_gerencia()
FROM PUBLIC, anon, authenticated;


-- ==============================================================================
-- 11. CORREGIR AUTORIZACION DE CAMBIO DE ESTADO DE LOTES
--
-- Antes:
--   ADMINISTRADOR o GERENCIA
--
-- Ahora:
--   cualquier usuario que realmente posea lots.edit.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.sp_cambiar_estado_lote(
    p_id_lote BIGINT,
    p_codigo_nuevo_estado VARCHAR,
    p_id_usuario BIGINT DEFAULT NULL,
    p_motivo VARCHAR DEFAULT 'Cambio de estado operativo'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_estado_actual INT;
    v_id_nuevo_estado INT;
    v_tiene_permiso BOOLEAN;
BEGIN

    -- El usuario es obligatorio para una operacion auditada.
    IF p_id_usuario IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'No fue posible identificar al usuario que solicita la operacion.'
        );
    END IF;

    -- Verificar permiso real mediante RBAC.
    SELECT EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ur
        INNER JOIN public.seg_roles r
            ON r.id_rol = ur.id_rol
        INNER JOIN public.seg_roles_permisos rp
            ON rp.id_rol = r.id_rol
        INNER JOIN public.seg_permisos p
            ON p.id_permiso = rp.id_permiso
        WHERE ur.id_usuario = p_id_usuario
          AND ur.activo = TRUE
          AND r.activo = TRUE
          AND rp.activo = TRUE
          AND p.activo = TRUE
          AND p.codigo = 'lots.edit'
    )
    INTO v_tiene_permiso;

    IF NOT v_tiene_permiso THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'Permiso denegado para modificar el estado del lote.'
        );
    END IF;

    -- Obtener estado actual.
    SELECT id_estado_lote
    INTO v_id_estado_actual
    FROM public.inm_lotes
    WHERE id_lote = p_id_lote;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'El lote especificado no existe.'
        );
    END IF;

    -- Obtener nuevo estado.
    SELECT id_estado_lote
    INTO v_id_nuevo_estado
    FROM public.cfg_estados_lote
    WHERE codigo = UPPER(p_codigo_nuevo_estado);

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'El estado especificado no es valido.'
        );
    END IF;

    IF v_id_estado_actual = v_id_nuevo_estado THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'message', 'El lote ya se encuentra en dicho estado.'
        );
    END IF;

    UPDATE public.inm_lotes
    SET
        id_estado_lote = v_id_nuevo_estado,
        fecha_actualizacion = timezone('utc'::text, now())
    WHERE id_lote = p_id_lote;

    INSERT INTO public.inm_lotes_historial_estado (
        id_lote,
        id_estado_anterior,
        id_estado_nuevo,
        motivo,
        fecha_cambio,
        id_usuario
    )
    VALUES (
        p_id_lote,
        v_id_estado_actual,
        v_id_nuevo_estado,
        p_motivo,
        timezone('utc'::text, now()),
        p_id_usuario
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'Estado del lote actualizado correctamente.',
        'id_lote', p_id_lote,
        'nuevo_estado', UPPER(p_codigo_nuevo_estado)
    );
END;
$$;


-- La operacion de negocio debe realizarse desde el backend protegido.
REVOKE ALL
ON FUNCTION public.sp_cambiar_estado_lote(
    BIGINT,
    VARCHAR,
    BIGINT,
    VARCHAR
)
FROM PUBLIC, anon, authenticated;


-- ==============================================================================
-- 12. GARANTIZAR QUE LOS ROLES DEL SISTEMA PERMANEZCAN ACTIVOS
-- ==============================================================================

UPDATE public.seg_roles
SET
    activo = TRUE,
    fecha_actualizacion = timezone('utc'::text, now())
WHERE codigo IN (
    'ADMINISTRADOR',
    'GERENCIA',
    'RRHH',
    'ASESOR',
    'FINANZAS',
    'MARKETING',
    'CLIENTE'
);


COMMIT;