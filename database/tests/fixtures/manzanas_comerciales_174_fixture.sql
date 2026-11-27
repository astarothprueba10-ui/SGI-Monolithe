CREATE TABLE public.inm_manzanas(id_manzana bigint PRIMARY KEY,id_proyecto bigint NOT NULL REFERENCES public.inm_proyectos, UNIQUE(id_manzana,id_proyecto));
CREATE TABLE public.inm_zonas(id_zona bigint PRIMARY KEY,id_proyecto bigint NOT NULL REFERENCES public.inm_proyectos, UNIQUE(id_zona,id_proyecto));
INSERT INTO public.inm_manzanas VALUES(1,1),(2,2);
INSERT INTO public.inm_zonas VALUES(1,1),(2,2);
