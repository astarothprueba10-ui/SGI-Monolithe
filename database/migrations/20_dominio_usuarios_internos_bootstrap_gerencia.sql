-- ==============================================================================
-- SGI MONOLITHE
-- MIGRACION 20 - DOMINIO CORPORATIVO Y BOOTSTRAP DE GERENCIA
--
-- Objetivos:
--   1. Establecer @monolithe.pe como dominio de login para cuentas internas.
--   2. Migrar las cuentas internas de prueba existentes.
--   3. Convertir admin.prueba en la cuenta inicial de GERENCIA.
--   4. Diferenciar roles internos y externos.
--   5. Impedir que un rol interno sea asignado a una cuenta sin dominio corporativo.
--   6. Impedir cambiar el login de una cuenta interna a un dominio no corporativo.
--   7. Revocar sesiones y recuperaciones antiguas después del cambio de identidad.
-- ==============================================================================

BEGIN;


-- ==============================================================================
-- 1. CLASIFICACION DE ROLES
--
-- Los roles nuevos serán internos por defecto.
-- CLIENTE es actualmente el único rol externo.
-- ==============================================================================

ALTER TABLE public.seg_roles
    ADD COLUMN IF NOT EXISTS es_interno BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.seg_roles.es_interno IS
    'Indica si el rol pertenece al Backoffice interno de MONOLITHE.';


UPDATE public.seg_roles
SET
    es_interno = CASE
        WHEN codigo = 'CLIENTE' THEN FALSE
        ELSE TRUE
    END,
    fecha_actualizacion = timezone('utc'::text, now());


-- ==============================================================================
-- 2. MIGRACION DE LOGINS EXISTENTES AL DOMINIO CORPORATIVO
-- ==============================================================================

UPDATE public.seg_usuarios
SET
    usuario_login = 'admin@monolithe.pe',
    fecha_actualizacion = timezone('utc'::text, now())
WHERE LOWER(BTRIM(usuario_login)) = 'admin@sigi.pe';


UPDATE public.seg_usuarios
SET
    usuario_login = 'gerente@monolithe.pe',
    fecha_actualizacion = timezone('utc'::text, now())
WHERE LOWER(BTRIM(usuario_login)) = 'admin.prueba@sigi.pe';


UPDATE public.seg_usuarios
SET
    usuario_login = 'cmendoza@monolithe.pe',
    fecha_actualizacion = timezone('utc'::text, now())
WHERE LOWER(BTRIM(usuario_login)) = 'cmendoza@sigi.pe';


-- ==============================================================================
-- 3. BOOTSTRAP INICIAL DE GERENCIA
--
-- gerente@monolithe.pe deja de ser ADMINISTRADOR y pasa a GERENCIA.
-- ==============================================================================

UPDATE public.seg_usuarios_roles ur
SET
    activo = FALSE,
    fecha_revocacion = timezone('utc'::text, now())
FROM public.seg_usuarios u,
     public.seg_roles r
WHERE ur.id_usuario = u.id_usuario
  AND ur.id_rol = r.id_rol
  AND LOWER(BTRIM(u.usuario_login)) = 'gerente@monolithe.pe'
  AND r.codigo = 'ADMINISTRADOR'
  AND ur.activo = TRUE;


INSERT INTO public.seg_usuarios_roles (
    id_usuario,
    id_rol,
    fecha_asignacion,
    fecha_revocacion,
    activo,
    asignado_por
)
SELECT
    gerente.id_usuario,
    gerencia.id_rol,
    timezone('utc'::text, now()),
    NULL,
    TRUE,
    administrador.id_usuario
FROM public.seg_usuarios gerente
JOIN public.seg_roles gerencia
    ON gerencia.codigo = 'GERENCIA'
   AND gerencia.activo = TRUE
LEFT JOIN public.seg_usuarios administrador
    ON LOWER(BTRIM(administrador.usuario_login)) =
       'admin@monolithe.pe'
WHERE LOWER(BTRIM(gerente.usuario_login)) =
      'gerente@monolithe.pe'
ON CONFLICT (id_usuario, id_rol)
DO UPDATE SET
    fecha_asignacion = timezone('utc'::text, now()),
    fecha_revocacion = NULL,
    activo = TRUE,
    asignado_por = EXCLUDED.asignado_por;


-- ==============================================================================
-- 4. FUNCION CENTRAL DE VALIDACION DEL LOGIN CORPORATIVO
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fn_login_corporativo_valido(
    p_usuario_login VARCHAR
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT
        COALESCE(
            LOWER(BTRIM(p_usuario_login))
                ~ '^[a-z0-9._%+-]+@monolithe[.]pe$',
            FALSE
        );
$$;


-- ==============================================================================
-- 5. VALIDAR DOMINIO AL ASIGNAR UN ROL INTERNO
--
-- Incluso si alguien intentara saltarse el backend y asignar directamente
-- un rol interno, la BD impedirá que la cuenta use otro dominio.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fn_validar_dominio_asignacion_rol()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_es_interno BOOLEAN;
    v_usuario_login VARCHAR(120);
BEGIN

    IF NEW.activo IS DISTINCT FROM TRUE THEN
        RETURN NEW;
    END IF;


    SELECT es_interno
    INTO v_es_interno
    FROM public.seg_roles
    WHERE id_rol = NEW.id_rol;


    IF COALESCE(v_es_interno, FALSE) = FALSE THEN
        RETURN NEW;
    END IF;


    SELECT usuario_login
    INTO v_usuario_login
    FROM public.seg_usuarios
    WHERE id_usuario = NEW.id_usuario;


    IF NOT public.fn_login_corporativo_valido(
        v_usuario_login
    ) THEN

        RAISE EXCEPTION
            'Los usuarios internos deben utilizar una cuenta @monolithe.pe'
            USING ERRCODE = '23514';

    END IF;


    RETURN NEW;

END;
$$;


DROP TRIGGER IF EXISTS
    trg_validar_dominio_asignacion_rol
ON public.seg_usuarios_roles;


CREATE TRIGGER trg_validar_dominio_asignacion_rol
BEFORE INSERT OR UPDATE OF id_usuario, id_rol, activo
ON public.seg_usuarios_roles
FOR EACH ROW
EXECUTE FUNCTION public.fn_validar_dominio_asignacion_rol();


-- ==============================================================================
-- 6. PROTEGER CAMBIOS DE LOGIN DE USUARIOS INTERNOS
--
-- Si una cuenta ya posee al menos un rol interno activo, su login no puede
-- cambiar a gmail.com, outlook.com, sigi.pe, etc.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fn_validar_login_usuario_interno()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

    IF EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ur
        JOIN public.seg_roles r
            ON r.id_rol = ur.id_rol
        WHERE ur.id_usuario = NEW.id_usuario
          AND ur.activo = TRUE
          AND r.activo = TRUE
          AND r.es_interno = TRUE
    )
    AND NOT public.fn_login_corporativo_valido(
        NEW.usuario_login
    ) THEN

        RAISE EXCEPTION
            'Los usuarios internos deben utilizar una cuenta @monolithe.pe'
            USING ERRCODE = '23514';

    END IF;


    RETURN NEW;

END;
$$;


DROP TRIGGER IF EXISTS
    trg_validar_login_usuario_interno
ON public.seg_usuarios;


CREATE TRIGGER trg_validar_login_usuario_interno
BEFORE UPDATE OF usuario_login
ON public.seg_usuarios
FOR EACH ROW
EXECUTE FUNCTION public.fn_validar_login_usuario_interno();


-- ==============================================================================
-- 7. REVOCAR SESIONES DE LAS CUENTAS MODIFICADAS
--
-- Sus JWT anteriores pueden contener login o authorities anteriores.
-- Los refresh tokens dejan de ser utilizables inmediatamente.
-- ==============================================================================

UPDATE public.seg_sesiones s
SET
    fecha_revocacion = timezone('utc'::text, now()),
    motivo_revocacion = 'CAMBIO_IDENTIDAD_O_ROL'
WHERE s.fecha_revocacion IS NULL
  AND s.id_usuario IN (
      SELECT id_usuario
      FROM public.seg_usuarios
      WHERE LOWER(BTRIM(usuario_login)) IN (
          'admin@monolithe.pe',
          'gerente@monolithe.pe',
          'cmendoza@monolithe.pe'
      )
  );


-- ==============================================================================
-- 8. INVALIDAR RECUPERACIONES DE PASSWORD ABIERTAS
-- ==============================================================================

UPDATE public.seg_tokens_recuperacion
SET
    fecha_uso = timezone('utc'::text, now())
WHERE fecha_uso IS NULL
  AND id_usuario IN (
      SELECT id_usuario
      FROM public.seg_usuarios
      WHERE LOWER(BTRIM(usuario_login)) IN (
          'admin@monolithe.pe',
          'gerente@monolithe.pe',
          'cmendoza@monolithe.pe'
      )
  );


-- ==============================================================================
-- 9. AUDITORIA DEL BOOTSTRAP
-- ==============================================================================

DO $$
DECLARE
    v_id_admin BIGINT;
    v_id_gerente BIGINT;
BEGIN

    SELECT id_usuario
    INTO v_id_admin
    FROM public.seg_usuarios
    WHERE LOWER(BTRIM(usuario_login)) =
          'admin@monolithe.pe'
    LIMIT 1;


    SELECT id_usuario
    INTO v_id_gerente
    FROM public.seg_usuarios
    WHERE LOWER(BTRIM(usuario_login)) =
          'gerente@monolithe.pe'
    LIMIT 1;


    PERFORM public.sp_registrar_auditoria(
        v_id_admin,
        'SEGURIDAD',
        'BOOTSTRAP_GERENCIA',
        'seg_usuarios',
        v_id_gerente::VARCHAR,
        'EXITOSO',
        'Se establecio el dominio corporativo @monolithe.pe y la cuenta inicial de GERENCIA.',
        jsonb_build_object(
            'usuario_gerencia',
            'gerente@monolithe.pe',
            'rol',
            'GERENCIA',
            'dominio_interno',
            '@monolithe.pe'
        )
    );

END;
$$;


-- ==============================================================================
-- 10. ENDURECIMIENTO
-- ==============================================================================

REVOKE ALL ON FUNCTION public.fn_login_corporativo_valido(
    VARCHAR
) FROM PUBLIC, anon, authenticated;


REVOKE ALL ON FUNCTION public.fn_validar_dominio_asignacion_rol()
FROM PUBLIC, anon, authenticated;


REVOKE ALL ON FUNCTION public.fn_validar_login_usuario_interno()
FROM PUBLIC, anon, authenticated;


COMMIT;

-- ==============================================================================
-- FIN MIGRACION 20
-- ==============================================================================