-- ============================================================================
-- SGI-Monolithe: Migracion 12 - Rol y Usuario de Aplicacion (Principio de Menor Privilegio)
-- Fecha: 06/10/2026
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'sigi_app_user') THEN
        CREATE ROLE sigi_app_user WITH
            LOGIN
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE
            NOINHERIT
            NOBYPASSRLS
            PASSWORD 'SigiApp2026!SecurePass';
    ELSE
        ALTER ROLE sigi_app_user WITH
            LOGIN
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE
            NOINHERIT
            NOBYPASSRLS
            PASSWORD 'SigiApp2026!SecurePass';
    END IF;
END
$$;

GRANT CONNECT ON DATABASE postgres TO sigi_app_user;
GRANT USAGE ON SCHEMA public TO sigi_app_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sigi_app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sigi_app_user;
GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO sigi_app_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sigi_app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO sigi_app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON ROUTINES TO sigi_app_user;

GRANT anon, authenticated TO sigi_app_user;
