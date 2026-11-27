-- Ejecutar exclusivamente en una base desechable.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE ROLE sgi_backend_user NOLOGIN;
CREATE ROLE sigi_app_user NOLOGIN BYPASSRLS;
CREATE TABLE public.inm_proyectos(id_proyecto bigint PRIMARY KEY);
CREATE TABLE public.seg_usuarios(id_usuario bigint PRIMARY KEY);
CREATE TABLE public.inm_politicas_comerciales_publicadas(id_proyecto bigint REFERENCES public.inm_proyectos,version integer,PRIMARY KEY(id_proyecto,version));
CREATE TABLE public.inm_politicas_comerciales_lotes(
 id_proyecto bigint,version integer,id_lote bigint,codigo_etapa text,situacion text NOT NULL,
 id_lote_precio bigint,precio_lista numeric,descuento numeric,precio_final numeric,vigente_hasta date,
 PRIMARY KEY(id_proyecto,version,id_lote),
 CONSTRAINT inm_politicas_comerciales_lotes_check CHECK (
 (situacion='HABILITADA' AND codigo_etapa IS NOT NULL AND id_lote_precio IS NOT NULL AND precio_lista IS NOT NULL AND descuento IS NOT NULL AND precio_final IS NOT NULL AND descuento>=0 AND precio_final>0 AND precio_lista-descuento=precio_final)
 OR (situacion<>'HABILITADA' AND id_lote_precio IS NULL AND precio_lista IS NULL AND descuento IS NULL AND precio_final IS NULL)),
 CONSTRAINT inm_politicas_comerciales_lotes_situacion_check CHECK(situacion IN('HABILITADA','BLOQUEADA','PROTEGIDA'))
);
INSERT INTO inm_proyectos VALUES(1),(2),(3);
INSERT INTO seg_usuarios VALUES(7);
INSERT INTO inm_politicas_comerciales_publicadas VALUES(1,1);
INSERT INTO inm_politicas_comerciales_lotes VALUES
 (1,1,11,'E1','HABILITADA',101,26000,1000,25000,NULL),
 (1,1,12,'E2','BLOQUEADA',NULL,NULL,NULL,NULL,NULL),
 (1,1,13,NULL,'PROTEGIDA',NULL,NULL,NULL,NULL,NULL);
GRANT SELECT,INSERT ON public.inm_politicas_comerciales_lotes TO sigi_app_user;
