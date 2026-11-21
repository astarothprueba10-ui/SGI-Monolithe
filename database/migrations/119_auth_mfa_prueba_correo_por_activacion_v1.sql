-- SGI MONOLITHE — Verificación de la dirección utilizada para la invitación MFA.
-- Aditivo: no marca correos, no cambia factores, no toca configuraciones financieras.
BEGIN;
ALTER TABLE auth_mfa.estado
  ADD COLUMN IF NOT EXISTS activacion_contacto_id bigint,
  ADD COLUMN IF NOT EXISTS activacion_correo_hash bytea;
COMMENT ON COLUMN auth_mfa.estado.activacion_contacto_id IS
  'Contacto destinatario de una invitación enviada por email aún no verificado; NULL en invitaciones asistidas.';
COMMENT ON COLUMN auth_mfa.estado.activacion_correo_hash IS
  'SHA-256 del correo destinatario normalizado, evita verificar otro correo si cambia durante la activación.';
COMMIT;
