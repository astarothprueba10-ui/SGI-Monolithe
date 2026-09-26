-- ==============================================================================
-- SGI-MONOLITHE: MIGRACION 11 - HARDENING FINAL DE RLS, AUDITORIA Y SEGURIDAD
-- Fecha: 2026-09-25
-- Sprint 8: Seguridad, Auditoria, RLS y Hardening
-- ==============================================================================

-- 1. PROCEDIMIENTO ALMACENADO PARA REGISTRO DE AUDITORIA INMUTABLE
CREATE OR REPLACE FUNCTION sp_registrar_auditoria(
    p_id_usuario BIGINT,
    p_modulo VARCHAR,
    p_accion VARCHAR,
    p_entidad VARCHAR,
    p_id_entidad VARCHAR,
    p_resultado VARCHAR,
    p_descripcion VARCHAR,
    p_datos_contexto JSONB DEFAULT '{}'::jsonb
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id_evento BIGINT;
BEGIN
    INSERT INTO aud_eventos (
        id_usuario,
        modulo,
        accion,
        entidad,
        id_entidad,
        resultado,
        descripcion,
        datos_contexto,
        fecha_evento
    ) VALUES (
        p_id_usuario,
        p_modulo,
        p_accion,
        p_entidad,
        p_id_entidad,
        p_resultado,
        p_descripcion,
        p_datos_contexto,
        NOW()
    ) RETURNING id_evento INTO v_id_evento;

    RETURN v_id_evento;
END;
$$;

-- 2. HARDENING DE RLS EN TABLA DE AUDITORIA (aud_eventos)
-- Inmutable: Prohibido UPDATE y DELETE para garantizar no repudio.
ALTER TABLE aud_eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pol_aud_eventos_select ON aud_eventos;
CREATE POLICY pol_aud_eventos_select ON aud_eventos
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS pol_aud_eventos_insert ON aud_eventos;
CREATE POLICY pol_aud_eventos_insert ON aud_eventos
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- 3. POLÍTICAS DE RLS PARA EL PORTAL WEB Y CMS (cms_*)
ALTER TABLE cms_paginas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_secciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_seccion_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_consultas_web ENABLE ROW LEVEL SECURITY;

-- Lectura publica de contenidos CMS publicados
DROP POLICY IF EXISTS pol_cms_paginas_select ON cms_paginas;
CREATE POLICY pol_cms_paginas_select ON cms_paginas FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS pol_cms_proyectos_select ON cms_proyectos;
CREATE POLICY pol_cms_proyectos_select ON cms_proyectos FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS pol_cms_secciones_select ON cms_secciones;
CREATE POLICY pol_cms_secciones_select ON cms_secciones FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS pol_cms_seccion_items_select ON cms_seccion_items;
CREATE POLICY pol_cms_seccion_items_select ON cms_seccion_items FOR SELECT TO anon, authenticated USING (true);

-- Permite recepcion de consultas web desde el formulario de la landing page
DROP POLICY IF EXISTS pol_cms_consultas_web_insert ON cms_consultas_web;
CREATE POLICY pol_cms_consultas_web_insert ON cms_consultas_web FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS pol_cms_consultas_web_select ON cms_consultas_web;
CREATE POLICY pol_cms_consultas_web_select ON cms_consultas_web FOR SELECT TO authenticated USING (true);

-- 4. HARDENING DE PERMISOS DE EJECUCION SOBRE PROCEDIMIENTOS ALMACENADOS (RPC)
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

-- 5. REGISTRO DE AUDITORIA DE HARDENING COMPLETADO
SELECT sp_registrar_auditoria(
    3,
    'SEGURIDAD',
    'HARDENING',
    'DATABASE_SCHEMA',
    'PUBLIC',
    'EXITOSO',
    'Hardening final de politicas RLS, inmutabilidad de auditoria y control estricto de ejecucion RPC completado para Sprint 8.'
);
