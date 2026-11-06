-- ==============================================================================
-- SGI-MONOLITHE: MIGRACION 71 - USUARIO DE APLICACION BAJO PRINCIPIO DE MENOR PRIVILEGIO
-- Modulo: seguridad / infraestructura de base de datos
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgi_backend_user') THEN
        CREATE ROLE sgi_backend_user WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE;
    END IF;
END;
$$;

-- 1. Permiso de uso del esquema public
GRANT USAGE ON SCHEMA public TO sgi_backend_user;

-- 2. Permisos DML en tablas de negocio (sin DROP ni ALTER)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sgi_backend_user;

-- 3. Uso de secuencias para generacion de identificadores
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sgi_backend_user;

-- 4. Ejecucion de rutinas, funciones y procedimientos almacenados
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO sgi_backend_user;
GRANT EXECUTE ON ALL PROCEDURES IN SCHEMA public TO sgi_backend_user;

-- 5. Heredar roles operativos previos del backend
GRANT sigi_app_user TO sgi_backend_user;

-- 6. Privilegios por defecto para nuevos objetos creados en el esquema public
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sgi_backend_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO sgi_backend_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON ROUTINES TO sgi_backend_user;
