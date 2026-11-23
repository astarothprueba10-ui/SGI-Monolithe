-- Extensiones de esquema sintetico para migration 131. Nunca ejecutar en Supabase real.
ALTER TABLE public.core_personas ADD COLUMN estado_civil_codigo varchar(40);
ALTER TABLE public.com_asesores ADD COLUMN id_estado_asesor integer;
ALTER TABLE public.com_asesores ADD COLUMN fecha_inicio date NOT NULL DEFAULT DATE '2020-01-01';
ALTER TABLE public.com_asesores ADD COLUMN fecha_fin date;
CREATE TABLE public.cfg_estados_asesor(
  id_estado_asesor integer PRIMARY KEY,
  activo boolean NOT NULL,
  permite_operar boolean NOT NULL
);
INSERT INTO public.cfg_estados_asesor VALUES(1,true,true);
UPDATE public.com_asesores SET id_estado_asesor=1;

CREATE TABLE public.cfg_tipos_documento(
 id_tipo_documento integer PRIMARY KEY,codigo varchar(20) NOT NULL
);
CREATE TABLE public.core_personas_documentos(
 id_persona_documento bigint PRIMARY KEY,
 id_persona bigint NOT NULL REFERENCES public.core_personas(id_persona),
 id_tipo_documento integer NOT NULL REFERENCES public.cfg_tipos_documento(id_tipo_documento),
 numero_documento varchar(40) NOT NULL,activo boolean NOT NULL,principal boolean NOT NULL
);
CREATE TABLE public.cfg_tipos_contacto(
 id_tipo_contacto integer PRIMARY KEY,codigo varchar(40) NOT NULL
);
CREATE TABLE public.core_personas_contactos(
 id_persona_contacto bigint PRIMARY KEY,
 id_persona bigint NOT NULL REFERENCES public.core_personas(id_persona),
 id_tipo_contacto integer NOT NULL REFERENCES public.cfg_tipos_contacto(id_tipo_contacto),
 valor varchar(160) NOT NULL,activo boolean NOT NULL,principal boolean NOT NULL
);
CREATE TABLE public.core_personas_direcciones(
 id_persona_direccion bigint PRIMARY KEY,
 id_persona bigint NOT NULL REFERENCES public.core_personas(id_persona),
 direccion varchar(200),distrito varchar(90),provincia varchar(90),
 departamento varchar(90),pais varchar(70),
 activo boolean NOT NULL,principal boolean NOT NULL
);
INSERT INTO public.cfg_tipos_documento VALUES(1,'DNI');
INSERT INTO public.core_personas_documentos VALUES(1,100,1,'00000001',true,true);
INSERT INTO public.cfg_tipos_contacto VALUES(1,'CELULAR'),(2,'EMAIL');
INSERT INTO public.core_personas_contactos VALUES(1,100,1,'999111222',true,true),(2,100,2,'cliente@ejemplo.test',true,true);
INSERT INTO public.core_personas_direcciones VALUES(1,100,'Calle Pruebas 10','Chiclayo','Chiclayo','Lambayeque','Peru',true,true);
INSERT INTO public.com_ventas_asesores VALUES(1,501,true);
