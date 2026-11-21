-- SGI MONOLITHE | Autorizar MFA de inicio de sesión para el usuario de BD de Auth Service.
-- La migración 106_auth_totp_dos_factores.sql otorgaba permisos a sgi_backend_user,
-- pero el servicio puede utilizar sigi_app_user (rol servidor con BYPASSRLS).
-- Solo concede privilegios requeridos por MfaRepository: SELECT, INSERT y UPDATE.
-- No se otorga DELETE ni acceso a anon, authenticated o service_role.
-- El esquema auth_mfa permanece privado, fuera del esquema public.
BEGIN;
GRANT USAGE ON SCHEMA auth_mfa TO sigi_app_user;
GRANT SELECT, INSERT, UPDATE ON TABLE auth_mfa.estado TO sigi_app_user;
COMMIT;
