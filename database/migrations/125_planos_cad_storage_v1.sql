-- El binario DWG/SVG vive exclusivamente en Supabase Storage privado.
-- PostgreSQL almacena referencia, huella, version y auditoria; no almacena el DWG.
BEGIN;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('planos-cad-private','planos-cad-private',false,20971520,
        ARRAY['application/octet-stream','image/svg+xml']::text[])
ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.inm_planos_cad_archivos (
  id_plano_archivo bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_proyecto bigint NOT NULL REFERENCES public.inm_proyectos(id_proyecto) ON DELETE RESTRICT,
  version integer NOT NULL CHECK(version>0),
  formato varchar(3) NOT NULL CHECK(formato IN ('DWG','SVG')),
  nombre_original varchar(255) NOT NULL,
  bucket varchar(64) NOT NULL DEFAULT 'planos-cad-private'
    CHECK(bucket='planos-cad-private'),
  ruta_archivo text NOT NULL UNIQUE,
  mime varchar(64) NOT NULL CHECK(mime IN ('application/octet-stream','image/svg+xml')),
  bytes bigint NOT NULL CHECK(bytes>0 AND bytes<=20971520),
  sha256 char(64) NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'),
  id_usuario bigint NOT NULL REFERENCES public.seg_usuarios(id_usuario),
  fecha_carga timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id_proyecto,version),
  UNIQUE(id_proyecto,sha256),
  CHECK(ruta_archivo ~ ('^proyectos/'||id_proyecto::text||'/originales/[a-f0-9-]{36}\\.(dwg|svg)$'))
);
CREATE INDEX ix_planos_cad_archivos_proyecto_fecha
 ON public.inm_planos_cad_archivos(id_proyecto,fecha_carga DESC);
ALTER TABLE public.inm_planos_cad_archivos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inm_planos_cad_archivos FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
GRANT SELECT,INSERT ON public.inm_planos_cad_archivos TO sgi_backend_user;
CREATE POLICY planos_cad_backend_select ON public.inm_planos_cad_archivos FOR SELECT TO sgi_backend_user USING(true);
CREATE POLICY planos_cad_backend_insert ON public.inm_planos_cad_archivos FOR INSERT TO sgi_backend_user WITH CHECK(true);
COMMIT;
