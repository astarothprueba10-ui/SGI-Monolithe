-- ==============================================================================
-- MIGRACIÓN 05: POLÍTICAS RLS PARA CMS Y WEB PÚBLICA (SUPABASE)
-- ==============================================================================

-- 1. Políticas para Consultas Web / Leads comerciales
ALTER TABLE public.cms_consultas_web ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Insercion publica consultas web" ON public.cms_consultas_web;
CREATE POLICY "Insercion publica consultas web"
    ON public.cms_consultas_web
    FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Lectura consultas personal autorizado" ON public.cms_consultas_web;
CREATE POLICY "Lectura consultas personal autorizado"
    ON public.cms_consultas_web
    FOR SELECT
    USING (
        auth.role() = 'authenticated'
    );

-- 2. Políticas para Páginas CMS (Lectura pública de contenido activo)
ALTER TABLE public.cms_paginas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica paginas activas" ON public.cms_paginas;
CREATE POLICY "Lectura publica paginas activas"
    ON public.cms_paginas
    FOR SELECT
    USING (activo = true);

-- 3. Políticas para Secciones CMS (Lectura pública de secciones activas y visibles)
ALTER TABLE public.cms_secciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica secciones visibles" ON public.cms_secciones;
CREATE POLICY "Lectura publica secciones visibles"
    ON public.cms_secciones
    FOR SELECT
    USING (visible = true AND activo = true);
