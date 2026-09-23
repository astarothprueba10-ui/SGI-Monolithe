-- ============================================================================
-- SIGI MONOLITHE - ROW LEVEL SECURITY (RLS) & AUTH HOOKS SUPABASE
-- ============================================================================

-- 1. Habilitar RLS en tablas sensibles
ALTER TABLE seg_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ven_reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ven_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pag_planes_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE pag_cuotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pag_pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pag_vouchers ENABLE ROW LEVEL SECURITY;

-- 2. Políticas de lectura pública para Catálogos (cfg_*)
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name LIKE 'cfg_%'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
        EXECUTE format('DROP POLICY IF EXISTS "Lectura publica catalogos" ON public.%I;', t);
        EXECUTE format('CREATE POLICY "Lectura publica catalogos" ON public.%I FOR SELECT USING (true);', t);
    END LOOP;
END $$;

-- 3. Políticas para Proyectos y Lotes (Lectura pública para comercialización)
ALTER TABLE inm_proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE inm_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE inm_manzanas ENABLE ROW LEVEL SECURITY;
ALTER TABLE inm_lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inm_planos_interactivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE inm_lotes_geometrias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica proyectos" ON inm_proyectos;
CREATE POLICY "Lectura publica proyectos" ON inm_proyectos FOR SELECT USING (activo = true);

DROP POLICY IF EXISTS "Lectura publica etapas" ON inm_etapas;
CREATE POLICY "Lectura publica etapas" ON inm_etapas FOR SELECT USING (activo = true);

DROP POLICY IF EXISTS "Lectura publica manzanas" ON inm_manzanas;
CREATE POLICY "Lectura publica manzanas" ON inm_manzanas FOR SELECT USING (activo = true);

DROP POLICY IF EXISTS "Lectura publica lotes" ON inm_lotes;
CREATE POLICY "Lectura publica lotes" ON inm_lotes FOR SELECT USING (activo = true);

DROP POLICY IF EXISTS "Lectura publica planos" ON inm_planos_interactivos;
CREATE POLICY "Lectura publica planos" ON inm_planos_interactivos FOR SELECT USING (vigente = true);

DROP POLICY IF EXISTS "Lectura publica geometrias" ON inm_lotes_geometrias;
CREATE POLICY "Lectura publica geometrias" ON inm_lotes_geometrias FOR SELECT USING (true);

-- 4. Portal Cliente (Acceso a sus propios datos por DNI / Auth ID)
DROP POLICY IF EXISTS "Cliente lee sus propios planes de pago" ON pag_planes_pago;
CREATE POLICY "Cliente lee sus propios planes de pago" ON pag_planes_pago
    FOR SELECT
    USING (
        id_venta IN (
            SELECT vc.id_venta FROM ven_ventas_clientes vc
            JOIN crm_clientes c ON vc.id_cliente = c.id_cliente
            JOIN core_personas p ON c.id_persona = p.id_persona
            JOIN core_personas_documentos d ON p.id_persona = d.id_persona
            WHERE d.numero_documento = auth.jwt() ->> 'sub'
               OR d.numero_documento = (auth.jwt() -> 'user_metadata' ->> 'numero_documento')
        )
    );

DROP POLICY IF EXISTS "Cliente lee sus propias cuotas" ON pag_cuotas;
CREATE POLICY "Cliente lee sus propias cuotas" ON pag_cuotas
    FOR SELECT
    USING (
        id_plan_pago IN (
            SELECT pp.id_plan_pago FROM pag_planes_pago pp
            JOIN ven_ventas_clientes vc ON pp.id_venta = vc.id_venta
            JOIN crm_clientes c ON vc.id_cliente = c.id_cliente
            JOIN core_personas p ON c.id_persona = p.id_persona
            JOIN core_personas_documentos d ON p.id_persona = d.id_persona
            WHERE d.numero_documento = auth.jwt() ->> 'sub'
               OR d.numero_documento = (auth.jwt() -> 'user_metadata' ->> 'numero_documento')
        )
    );
