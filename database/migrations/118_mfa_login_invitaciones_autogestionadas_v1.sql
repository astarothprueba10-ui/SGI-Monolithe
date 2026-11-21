-- MFA de login: limitar invitaciones y reenvíos sin exponer datos a la Data API.
-- Se conserva la tabla privada y la politica actual; no se tocan factores activos.
BEGIN;
ALTER TABLE auth_mfa.estado
    ADD COLUMN IF NOT EXISTS activacion_ultimo_envio timestamptz,
    ADD COLUMN IF NOT EXISTS activacion_ventana_inicio timestamptz,
    ADD COLUMN IF NOT EXISTS activacion_envios_ventana integer NOT NULL DEFAULT 0;
ALTER TABLE auth_mfa.estado
    ADD CONSTRAINT mfa_activacion_envios_rango
    CHECK (activacion_envios_ventana BETWEEN 0 AND 5);
COMMENT ON COLUMN auth_mfa.estado.activacion_ultimo_envio IS
    'Momento del ultimo correo de activacion, para limitar reintentos.';
COMMENT ON COLUMN auth_mfa.estado.activacion_envios_ventana IS
    'Maximo 5 invitaciones por ventana movil de 24 horas.';
COMMIT;
