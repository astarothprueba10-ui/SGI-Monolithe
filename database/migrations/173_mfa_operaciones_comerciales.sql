BEGIN;
CREATE TABLE public.seg_mfa_comercial (
 id uuid PRIMARY KEY,
 actor bigint NOT NULL,
 sesion varchar(128) NOT NULL,
 proyecto bigint NOT NULL,
 accion varchar(30) NOT NULL CHECK (accion IN ('MATRIZ','TARIFA','DISPONIBILIDAD','IMPORTACION','PUBLICACION','ETAPAS','ASIGNACION')),
 huella char(64) NOT NULL,
 correo_huella char(64) NOT NULL,
 codigo_hash varchar(255) NOT NULL,
 creado timestamptz NOT NULL DEFAULT now(),
 vence timestamptz NOT NULL,
 intentos integer NOT NULL DEFAULT 0 CHECK(intentos BETWEEN 0 AND 5),
 aprobado_hash char(64),
 aprobado_hasta timestamptz,
 consumido boolean NOT NULL DEFAULT false
);
CREATE INDEX ix_mfa_comercial_actor_fecha ON public.seg_mfa_comercial(actor,creado DESC);
ALTER TABLE public.seg_mfa_comercial ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.seg_mfa_comercial FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.seg_mfa_comercial TO sigi_app_user;
COMMIT;
