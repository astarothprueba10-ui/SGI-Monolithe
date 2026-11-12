-- Sprint 4 / 5.4.5 — POSTGRESQL 17 EFIMERO: solamente metadatos sintéticos.
-- Se ejecuta después de todas las pruebas de las migraciones 95-98.
CREATE TABLE IF NOT EXISTS storage.buckets(id text PRIMARY KEY, public boolean NOT NULL DEFAULT false);
INSERT INTO storage.buckets(id,public) VALUES('contratos-firmados-private',false)
ON CONFLICT(id) DO NOTHING;

ALTER TABLE public.ven_contratos_archivos
  ADD COLUMN IF NOT EXISTS codigo varchar,
  ADD COLUMN IF NOT EXISTS nombre_documento varchar,
  ADD COLUMN IF NOT EXISTS numero_version integer,
  ADD COLUMN IF NOT EXISTS nombre_archivo_original varchar,
  ADD COLUMN IF NOT EXISTS clave_archivo varchar,
  ADD COLUMN IF NOT EXISTS tipo_mime varchar,
  ADD COLUMN IF NOT EXISTS tamano_bytes bigint;
ALTER TABLE public.ven_contratos_anexos
  ADD COLUMN IF NOT EXISTS tipo_anexo varchar,
  ADD COLUMN IF NOT EXISTS numero_version integer,
  ADD COLUMN IF NOT EXISTS nombre_archivo_original varchar,
  ADD COLUMN IF NOT EXISTS clave_archivo varchar,
  ADD COLUMN IF NOT EXISTS tipo_mime varchar,
  ADD COLUMN IF NOT EXISTS tamano_bytes bigint;

-- Contrato publicado de la venta 1003, exclusiva del actor 9.
UPDATE public.ven_contratos_archivos
SET codigo='ARC-CI-93003',nombre_documento='Contrato de compraventa',
 numero_version=1,nombre_archivo_original='contrato-prueba.pdf',
 clave_archivo='contratos/93003/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.pdf',
 tipo_mime='application/pdf',tamano_bytes=1024
WHERE id_contrato_archivo=93003;
-- Archivo explícitamente OCULTO: no debe verse ni firmarse.
UPDATE public.ven_contratos_archivos
SET codigo='ARC-CI-93004',nombre_documento='Documento interno',
 numero_version=1,nombre_archivo_original='interno.pdf',
 clave_archivo='contratos/93003/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.pdf',
 tipo_mime='application/pdf',tamano_bytes=1100
WHERE id_contrato_archivo=93004;
-- Archivo OBSOLETO: visible=true pero vigente=false.
UPDATE public.ven_contratos_archivos
SET codigo='ARC-CI-93005',nombre_documento='Versión anterior',
 numero_version=1,nombre_archivo_original='anterior.pdf',
 clave_archivo='contratos/93003/cccccccc-cccc-cccc-cccc-cccccccccccc.pdf',
 tipo_mime='application/pdf',tamano_bytes=1100
WHERE id_contrato_archivo=93005;

-- Publicación de anexo de PLANO_LOTE después de las pruebas 96.
UPDATE public.ven_contratos_anexos
SET tipo_anexo='PLANO_LOTE',numero_version=1,
 nombre_archivo_original='plano-prueba.pdf',
 clave_archivo='anexos/93003/PLANO_LOTE/dddddddd-dddd-dddd-dddd-dddddddddddd.pdf',
 tipo_mime='application/pdf',tamano_bytes=2048,
 fecha_publicacion_cliente=now()
WHERE id_anexo=93003;

INSERT INTO storage.objects(bucket_id,name,metadata)
VALUES
 ('contratos-firmados-private',
  'contratos/93003/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.pdf',
  '{"mimetype":"application/pdf","size":1024}'::jsonb),
 ('contratos-firmados-private',
  'contratos/93003/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.pdf',
  '{"mimetype":"application/pdf","size":1100}'::jsonb),
 ('contratos-firmados-private',
  'contratos/93003/cccccccc-cccc-cccc-cccc-cccccccccccc.pdf',
  '{"mimetype":"application/pdf","size":1100}'::jsonb),
 ('contratos-firmados-private',
  'anexos/93003/PLANO_LOTE/dddddddd-dddd-dddd-dddd-dddddddddddd.pdf',
  '{"mimetype":"application/pdf","size":2048}'::jsonb);
