-- SGI MONOLITHE | Bloque 3 MFA financiero de Gerencia.
-- Sin TOTP en la BD, sin secretos en migraciones, sin endpoint de publicación.
-- Tablas accesibles únicamente desde backend por rol sigi_app_user.
BEGIN;
CREATE TABLE public.seg_fin_totp_cuentas (
  id_usuario bigint PRIMARY KEY REFERENCES public.seg_usuarios(id_usuario) ON DELETE RESTRICT,
  secreto_cifrado text,
  secreto_pendiente text,
  pendiente_expira_en timestamptz,
  pendiente_jti varchar(128),
  email_otp_hash varchar(100),
  email_otp_expira_en timestamptz,
  email_otp_jti varchar(128),
  email_otp_intentos smallint NOT NULL DEFAULT 0 CHECK (email_otp_intentos BETWEEN 0 AND 20),
  email_envios_ventana smallint NOT NULL DEFAULT 0 CHECK (email_envios_ventana BETWEEN 0 AND 20),
  email_ventana_inicio timestamptz,
  email_ultimo_envio timestamptz,
  ultimo_paso_totp bigint NOT NULL DEFAULT -1,
  intentos_fallidos smallint NOT NULL DEFAULT 0 CHECK (intentos_fallidos BETWEEN 0 AND 20),
  bloqueo_hasta timestamptz,
  habilitado_en timestamptz,
  revocado_en timestamptz,
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_totp_activo CHECK (
    (secreto_cifrado IS NULL AND habilitado_en IS NULL)
    OR (secreto_cifrado IS NOT NULL AND habilitado_en IS NOT NULL)
  ),
  CONSTRAINT ck_totp_pendiente CHECK (
    (secreto_pendiente IS NULL AND pendiente_expira_en IS NULL AND pendiente_jti IS NULL)
    OR (secreto_pendiente IS NOT NULL AND pendiente_expira_en IS NOT NULL AND pendiente_jti IS NOT NULL)
  )
);
CREATE TABLE public.seg_fin_totp_recuperacion (
  id_usuario bigint NOT NULL REFERENCES public.seg_fin_totp_cuentas(id_usuario) ON DELETE RESTRICT,
  codigo_hash char(64) NOT NULL CHECK (codigo_hash ~ '^[0-9a-f]{64}$'),
  emitido_en timestamptz NOT NULL DEFAULT now(),
  usado_en timestamptz,
  PRIMARY KEY(id_usuario,codigo_hash)
);
CREATE INDEX idx_fin_totp_recuperacion_disponible
 ON public.seg_fin_totp_recuperacion(id_usuario) WHERE usado_en IS NULL;
CREATE TABLE public.seg_fin_totp_autorizaciones (
  id_autorizacion uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario bigint NOT NULL REFERENCES public.seg_fin_totp_cuentas(id_usuario) ON DELETE RESTRICT,
  token_jti varchar(128) NOT NULL,
  version_esperada integer NOT NULL CHECK (version_esperada > 0),
  hash_propuesta char(64) NOT NULL CHECK (hash_propuesta ~ '^[0-9a-f]{64}$'),
  nonce uuid NOT NULL,
  emitido_en timestamptz NOT NULL DEFAULT now(),
  expira_en timestamptz NOT NULL CHECK (expira_en > emitido_en),
  consumido_en timestamptz,
  UNIQUE(id_usuario,nonce)
);
CREATE INDEX idx_fin_totp_autor_pendientes
 ON public.seg_fin_totp_autorizaciones(id_usuario,expira_en)
 WHERE consumido_en IS NULL;

ALTER TABLE public.seg_fin_totp_cuentas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seg_fin_totp_recuperacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seg_fin_totp_autorizaciones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.seg_fin_totp_cuentas,
 public.seg_fin_totp_recuperacion,public.seg_fin_totp_autorizaciones
 FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
-- Acceso exclusivo a servidor interno; el rol de BD sigi_app_user usa BYPASSRLS.
-- No otorgar SELECT a clientes REST ni publicar las tablas en la Data API.
GRANT SELECT,INSERT,UPDATE ON public.seg_fin_totp_cuentas TO sigi_app_user;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.seg_fin_totp_recuperacion TO sigi_app_user;
GRANT SELECT,INSERT,UPDATE ON public.seg_fin_totp_autorizaciones TO sigi_app_user;
COMMENT ON TABLE public.seg_fin_totp_cuentas IS
 'TOTP cifrado AES-GCM por usuario; acceso backend exclusivo. Prohibido almacenar secretos en claro.';
COMMENT ON TABLE public.seg_fin_totp_autorizaciones IS
 'Autorización de 120 segundos ligada a actor, jti, versión, hash canónico y nonce; NO publica políticas.';
COMMIT;
