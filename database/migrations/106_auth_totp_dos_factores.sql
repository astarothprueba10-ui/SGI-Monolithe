BEGIN;

CREATE SCHEMA auth_mfa;
REVOKE ALL ON SCHEMA auth_mfa FROM PUBLIC;

CREATE TABLE auth_mfa.estado (
    id_usuario bigint PRIMARY KEY REFERENCES public.seg_usuarios(id_usuario) ON DELETE CASCADE,
    secreto_cifrado bytea,
    ultimo_paso bigint,
    recuperacion_hash bytea,
    activacion_hash bytea,
    activacion_expira timestamptz,
    reto_hash bytea UNIQUE,
    reto_expira timestamptz,
    version_reto bigint,
    password_reto_hash bytea,
    portal text CHECK (portal IN ('BACKOFFICE', 'CLIENTE')),
    pendiente_cifrado bytea,
    pendiente_recuperacion_hash bytea,
    intentos integer NOT NULL DEFAULT 0 CHECK (intentos BETWEEN 0 AND 5),
    bloqueo_expira timestamptz,
    CONSTRAINT mfa_factor_completo CHECK (
        (secreto_cifrado IS NULL AND ultimo_paso IS NULL AND recuperacion_hash IS NULL) OR
        (secreto_cifrado IS NOT NULL AND ultimo_paso IS NOT NULL AND recuperacion_hash IS NOT NULL)
    ),
    CONSTRAINT mfa_activacion_completa CHECK ((activacion_hash IS NULL) = (activacion_expira IS NULL)),
    CONSTRAINT mfa_reto_completo CHECK (
        (reto_hash IS NULL AND reto_expira IS NULL AND version_reto IS NULL AND password_reto_hash IS NULL AND portal IS NULL) OR
        (reto_hash IS NOT NULL AND reto_expira IS NOT NULL AND version_reto IS NOT NULL AND password_reto_hash IS NOT NULL)
    ),
    CONSTRAINT mfa_pendiente_completo CHECK (
        (pendiente_cifrado IS NULL AND pendiente_recuperacion_hash IS NULL) OR
        (reto_hash IS NOT NULL AND pendiente_cifrado IS NOT NULL AND pendiente_recuperacion_hash IS NOT NULL)
    ),
    CONSTRAINT mfa_digests CHECK (
        octet_length(activacion_hash) = 32 AND octet_length(recuperacion_hash) = 32
        AND octet_length(reto_hash) = 32 AND octet_length(password_reto_hash) = 32
        AND octet_length(pendiente_recuperacion_hash) = 32
    )
);

ALTER TABLE auth_mfa.estado ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON auth_mfa.estado FROM PUBLIC;

DO $$
DECLARE
    acceso_web text;
BEGIN
    FOR acceso_web IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'service_role')
    LOOP
        EXECUTE format('REVOKE ALL ON SCHEMA auth_mfa FROM %I', acceso_web);
        EXECUTE format('REVOKE ALL ON auth_mfa.estado FROM %I', acceso_web);
    END LOOP;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgi_backend_user') THEN
        GRANT USAGE ON SCHEMA auth_mfa TO sgi_backend_user;
        GRANT SELECT, INSERT, UPDATE ON auth_mfa.estado TO sgi_backend_user;
        CREATE POLICY auth_mfa_backend ON auth_mfa.estado
            FOR ALL TO sgi_backend_user USING (true) WITH CHECK (true);
    END IF;
END $$;

UPDATE public.seg_usuarios
   SET version_sesiones = version_sesiones + 1;

UPDATE public.seg_sesiones
   SET fecha_revocacion = CURRENT_TIMESTAMP,
       motivo_revocacion = 'ACTIVACION_MFA'
 WHERE fecha_revocacion IS NULL;

COMMIT;
