-- PostgreSQL 17 aislado. Esquema sintetico, sin credenciales ni datos reales.
-- Solo entidades utilizadas por migraciones 127-129.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE sigi_app_user NOLOGIN;

CREATE TABLE public.core_personas (
  id_persona bigint PRIMARY KEY,
  nombres varchar(80),
  apellido_paterno varchar(80),
  apellido_materno varchar(80),
  activo boolean NOT NULL DEFAULT true
);
CREATE TABLE public.seg_usuarios (
  id_usuario bigint PRIMARY KEY,
  id_persona bigint REFERENCES public.core_personas(id_persona)
);
CREATE TABLE public.seg_roles (
  id_rol integer PRIMARY KEY, codigo varchar(80) NOT NULL, activo boolean NOT NULL
);
CREATE TABLE public.seg_usuarios_roles (
  id_usuario bigint NOT NULL REFERENCES public.seg_usuarios(id_usuario),
  id_rol integer NOT NULL REFERENCES public.seg_roles(id_rol),
  activo boolean NOT NULL DEFAULT true, fecha_revocacion timestamptz
);
CREATE TABLE public.inm_proyectos (
  id_proyecto bigint PRIMARY KEY, nombre varchar(100) NOT NULL
);
CREATE TABLE public.inm_lotes (
  id_lote bigint PRIMARY KEY,
  id_proyecto bigint NOT NULL REFERENCES public.inm_proyectos(id_proyecto),
  codigo varchar(50) NOT NULL
);
CREATE TABLE public.cfg_estados_venta (
  id_estado_venta integer PRIMARY KEY, codigo varchar(40) NOT NULL
);
CREATE TABLE public.cfg_estados_contrato (
  id_estado_contrato integer PRIMARY KEY, codigo varchar(40) NOT NULL
);
CREATE TABLE public.cfg_modalidades_venta (
  id_modalidad_venta integer PRIMARY KEY, codigo varchar(40) NOT NULL
);
CREATE TABLE public.crm_clientes (
  id_cliente bigint PRIMARY KEY,
  id_persona bigint NOT NULL REFERENCES public.core_personas(id_persona),
  codigo varchar(60) NOT NULL,
  activo boolean NOT NULL DEFAULT true
);
CREATE TABLE public.ven_ventas (
  id_venta bigint PRIMARY KEY,
  id_lote bigint NOT NULL REFERENCES public.inm_lotes(id_lote),
  id_estado_venta integer NOT NULL REFERENCES public.cfg_estados_venta(id_estado_venta),
  id_modalidad_venta integer NOT NULL REFERENCES public.cfg_modalidades_venta(id_modalidad_venta),
  codigo varchar(60) NOT NULL,
  fecha_venta timestamptz NOT NULL,
  precio_venta numeric(14,2) NOT NULL
);
CREATE TABLE public.ven_ventas_clientes (
  id_venta bigint NOT NULL REFERENCES public.ven_ventas(id_venta),
  id_cliente bigint NOT NULL REFERENCES public.crm_clientes(id_cliente),
  PRIMARY KEY(id_venta,id_cliente)
);
CREATE TABLE public.ven_contratos (
  id_contrato bigint PRIMARY KEY,
  id_venta bigint NOT NULL REFERENCES public.ven_ventas(id_venta),
  id_estado_contrato integer NOT NULL REFERENCES public.cfg_estados_contrato(id_estado_contrato),
  codigo varchar(60) NOT NULL,
  fecha_firma date,
  fecha_creacion timestamptz NOT NULL
);
CREATE TABLE public.crm_prospectos (
  id_prospecto bigint PRIMARY KEY,
  id_persona bigint NOT NULL REFERENCES public.core_personas(id_persona),
  activo boolean NOT NULL DEFAULT true,
  fecha_registro timestamptz NOT NULL,
  estado_codigo varchar(50) NOT NULL,
  id_asesor bigint
);
CREATE TABLE public.crm_prospectos_intereses (
  id_prospecto bigint NOT NULL REFERENCES public.crm_prospectos(id_prospecto),
  id_proyecto bigint NOT NULL REFERENCES public.inm_proyectos(id_proyecto),
  activo boolean NOT NULL DEFAULT true
);
CREATE TABLE public.com_asesores (
  id_asesor bigint PRIMARY KEY,
  id_persona bigint NOT NULL REFERENCES public.core_personas(id_persona)
);
CREATE TABLE public.com_asignaciones_prospecto (
  id_asesor bigint NOT NULL REFERENCES public.com_asesores(id_asesor),
  id_prospecto bigint NOT NULL REFERENCES public.crm_prospectos(id_prospecto),
  fecha_asignacion timestamptz NOT NULL,
  fecha_fin timestamptz
);
CREATE TABLE public.com_ventas_asesores (
  id_venta bigint NOT NULL REFERENCES public.ven_ventas(id_venta),
  id_asesor bigint NOT NULL REFERENCES public.com_asesores(id_asesor),
  es_principal boolean NOT NULL
);
CREATE TABLE public.cfg_origenes_prospecto (
  codigo varchar(40) PRIMARY KEY, nombre varchar(80),
  orden integer NOT NULL, activo boolean NOT NULL DEFAULT true
);
CREATE TABLE public.cfg_tipos_notificacion (
  id_tipo_notificacion integer PRIMARY KEY,
  codigo varchar(50) NOT NULL, activo boolean NOT NULL
);
CREATE TABLE public.not_notificaciones (
  id_notificacion bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_persona bigint NOT NULL REFERENCES public.core_personas(id_persona),
  id_tipo_notificacion integer NOT NULL REFERENCES public.cfg_tipos_notificacion(id_tipo_notificacion),
  titulo varchar(180) NOT NULL,
  mensaje varchar(1000) NOT NULL,
  url_destino varchar(500),
  referencia_modulo varchar(50),
  referencia_entidad varchar(80),
  referencia_id varchar(80),
  datos_contexto jsonb,
  clave_deduplicacion varchar(150) UNIQUE,
  fecha_generacion timestamptz NOT NULL DEFAULT now(),
  id_usuario_generacion bigint REFERENCES public.seg_usuarios(id_usuario),
  activo boolean NOT NULL DEFAULT true
);

-- Las siguientes funciones imitan solo permisos y estructura en el test,
-- no sustituyen las funciones de seguridad de producción.
CREATE FUNCTION public.fn_usuario_tiene_permiso_seguridad(
  p_id_usuario bigint, p_codigo_permiso varchar
) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT p_codigo_permiso='crm.view' AND p_id_usuario IN (900,901)
$$;
CREATE FUNCTION public.fn_crm_puede_consultar_prospecto(
  p_actor bigint,p_prospecto bigint
) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT p_actor=900 OR (p_actor=901 AND p_prospecto=10)
$$;

CREATE FUNCTION public.sp_listar_prospectos()
RETURNS TABLE(
 id_prospecto bigint,id_persona bigint,estado_codigo varchar,
 id_asesor bigint,origen_codigo varchar,fecha_registro timestamptz
) LANGUAGE sql STABLE AS $$
 SELECT p.id_prospecto,p.id_persona,p.estado_codigo,p.id_asesor,
 'WEB'::varchar,p.fecha_registro FROM public.crm_prospectos p
 WHERE p.activo
$$;

CREATE FUNCTION public.sp_listar_asesores()
RETURNS TABLE(
 id_asesor bigint,codigo varchar,nombre_completo varchar,email varchar,
 telefono varchar,activo boolean,leads_activos bigint
) LANGUAGE sql STABLE AS $$
 SELECT a.id_asesor,('ASE-'||a.id_asesor)::varchar,
 ('Asesor '||a.id_asesor)::varchar,'asesor@example.test'::varchar,
 '999999999'::varchar,true,
 (SELECT count(*)::bigint FROM public.crm_prospectos p
  WHERE p.id_asesor=a.id_asesor AND p.activo)
 FROM public.com_asesores a
$$;

INSERT INTO public.core_personas(id_persona,nombres,apellido_paterno,apellido_materno) VALUES
 (100,'Cliente','Primero','Test'),(101,'Cliente','Segundo','Test'),
 (102,'Prospecto','SinCompra','Test'),(9000,'Gerente','Pruebas','CRM'),
 (9010,'Asesor','Pruebas','CRM');
INSERT INTO public.seg_usuarios VALUES (900,9000),(901,9010);
INSERT INTO public.seg_roles VALUES (1,'GERENCIA',true),(2,'ASESOR',true);
INSERT INTO public.seg_usuarios_roles VALUES (900,1,true,NULL),(901,2,true,NULL);
INSERT INTO public.inm_proyectos VALUES (1,'Proyecto Norte'),(2,'Proyecto Sur');
INSERT INTO public.inm_lotes VALUES
 (10,1,'MZ-A-L01'),(11,2,'MZ-B-L02'),(12,1,'MZ-C-L03');
INSERT INTO public.cfg_estados_venta VALUES (1,'CONFIRMADA');
INSERT INTO public.cfg_estados_contrato VALUES (1,'VIGENTE');
INSERT INTO public.cfg_modalidades_venta VALUES (3,'CONTADO'),(4,'FINANCIADA');
INSERT INTO public.crm_clientes VALUES (1,100,'CLI-001',true),(2,101,'CLI-002',true);
INSERT INTO public.ven_ventas VALUES
 (1,10,1,4,'VEN-FIN-1','2026-11-01 15:00:00+00',30000),
 (2,11,1,3,'VEN-CTD-2','2026-11-02 15:00:00+00',95000),
 (3,12,1,4,'VEN-FIN-3','2026-11-03 15:00:00+00',45000);
INSERT INTO public.ven_ventas_clientes VALUES (1,1),(2,1),(3,2);
INSERT INTO public.ven_contratos VALUES
 (1,1,1,'CON-FIN-1','2026-11-14','2026-11-01 15:00:00+00'),
 (2,2,1,'CON-CTD-2','2026-11-10','2026-11-02 15:00:00+00'),
 (3,3,1,'CON-FIN-3','2026-11-20','2026-11-03 15:00:00+00');
INSERT INTO public.crm_prospectos VALUES
 (10,100,true,'2026-10-11 10:00:00+00','INTERESADO',501),
 (11,101,true,'2026-10-13 10:00:00+00','INTERESADO',NULL),
 (12,102,true,'2026-10-14 10:00:00+00','NUEVO',NULL);
INSERT INTO public.crm_prospectos_intereses VALUES
 (10,1,true),(10,2,true),(11,1,true),(12,2,true);
INSERT INTO public.com_asesores VALUES (501,9010);
INSERT INTO public.com_asignaciones_prospecto VALUES
 (501,10,'2026-10-13 10:00:00+00',NULL);
INSERT INTO public.com_ventas_asesores VALUES (1,501,true);
INSERT INTO public.cfg_origenes_prospecto VALUES ( 'WEB','Sitio web',1,true);
INSERT INTO public.cfg_tipos_notificacion VALUES (9,'GENERAL',true);
