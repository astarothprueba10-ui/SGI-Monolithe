BEGIN;

CREATE TABLE IF NOT EXISTS auth_mfa.dispositivos (
    id_usuario bigint NOT NULL REFERENCES public.seg_usuarios(id_usuario) ON DELETE CASCADE,
    portal varchar(16) NOT NULL CHECK (portal IN ('BACKOFFICE', 'CLIENTE')),
    dispositivo_hash bytea NOT NULL CHECK (octet_length(dispositivo_hash) = 32),
    version_sesiones bigint NOT NULL,
    password_hash_ref bytea NOT NULL CHECK (octet_length(password_hash_ref) = 32),
    confiable_hasta timestamptz,
    ultima_verificacion timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_usuario, portal, dispositivo_hash)
);

CREATE INDEX IF NOT EXISTS idx_auth_dispositivos_hash
    ON auth_mfa.dispositivos (dispositivo_hash);

ALTER TABLE auth_mfa.dispositivos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE auth_mfa.dispositivos FROM PUBLIC;

DO $$
DECLARE
    rol text;
BEGIN
    FOREACH rol IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = rol) THEN
            EXECUTE format('REVOKE ALL ON TABLE auth_mfa.dispositivos FROM %I', rol);
        END IF;
    END LOOP;
    FOREACH rol IN ARRAY ARRAY['sigi_app_user', 'sgi_backend_user'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = rol) THEN
            EXECUTE format('GRANT USAGE ON SCHEMA auth_mfa TO %I', rol);
            EXECUTE format('GRANT SELECT, INSERT, UPDATE ON TABLE auth_mfa.dispositivos TO %I', rol);
            EXECUTE format('DROP POLICY IF EXISTS %I ON auth_mfa.dispositivos', rol);
            EXECUTE format('CREATE POLICY %I ON auth_mfa.dispositivos FOR ALL TO %I USING (true) WITH CHECK (true)', rol, rol);
        END IF;
    END LOOP;
END;
$$;

COMMIT;
