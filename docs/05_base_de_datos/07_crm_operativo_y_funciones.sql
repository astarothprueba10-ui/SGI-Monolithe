-- ============================================================================
-- SGI-MONOLITHE: MIGRACION 07 - CRM OPERATIVO, ASESORES, PROSPECTOS Y FUNCIONES
-- Fecha: 2026-09-25
-- Reglas: Zero Emojis, Clean Architecture, RLS y PostgREST RPC
-- ============================================================================

-- 1. TABLA CRM_VISITAS (Sprint 3: Visitas guiadas al terreno)
CREATE TABLE IF NOT EXISTS public.crm_visitas (
    id_visita BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_prospecto BIGINT NOT NULL,
    id_asesor BIGINT NOT NULL,
    id_proyecto BIGINT NOT NULL,
    fecha_visita TIMESTAMPTZ(6) NOT NULL,
    turno VARCHAR(20) NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'PROGRAMADA',
    punto_encuentro VARCHAR(255) NOT NULL DEFAULT 'Oficina de Ventas - Lurin',
    observaciones TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),
    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT fk_crm_visitas_prospecto FOREIGN KEY (id_prospecto) REFERENCES public.crm_prospectos(id_prospecto) ON DELETE RESTRICT,
    CONSTRAINT fk_crm_visitas_asesor FOREIGN KEY (id_asesor) REFERENCES public.com_asesores(id_asesor) ON DELETE RESTRICT,
    CONSTRAINT fk_crm_visitas_proyecto FOREIGN KEY (id_proyecto) REFERENCES public.inm_proyectos(id_proyecto) ON DELETE RESTRICT,
    CONSTRAINT chk_crm_visitas_estado CHECK (estado IN ('PROGRAMADA', 'CONFIRMADA', 'REALIZADA', 'CANCELADA', 'REPROGRAMADA'))
);

CREATE INDEX IF NOT EXISTS idx_crm_visitas_prospecto ON public.crm_visitas(id_prospecto);
CREATE INDEX IF NOT EXISTS idx_crm_visitas_asesor ON public.crm_visitas(id_asesor);
CREATE INDEX IF NOT EXISTS idx_crm_visitas_fecha ON public.crm_visitas(fecha_visita);

ALTER TABLE public.crm_visitas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pol_crm_visitas_select ON public.crm_visitas;
CREATE POLICY pol_crm_visitas_select ON public.crm_visitas FOR SELECT USING (true);
DROP POLICY IF EXISTS pol_crm_visitas_all ON public.crm_visitas;
CREATE POLICY pol_crm_visitas_all ON public.crm_visitas FOR ALL USING (true) WITH CHECK (true);

-- 2. SEED DE ASESORES COMERCIALES Y CONTACTOS
DO $$
DECLARE
    v_id_persona_carlos BIGINT;
    v_id_persona_camila BIGINT;
    v_id_persona_marco BIGINT;
    v_id_persona_silvana BIGINT;
    v_id_asesor_camila BIGINT;
    v_id_asesor_marco BIGINT;
    v_id_asesor_silvana BIGINT;
BEGIN
    -- Contactos para Carlos Mendoza (id_asesor = 1, id_persona = 4)
    v_id_persona_carlos := 4;
    IF NOT EXISTS (SELECT 1 FROM public.core_personas_contactos WHERE id_persona = v_id_persona_carlos AND id_tipo_contacto = 5) THEN
        INSERT INTO public.core_personas_contactos (id_persona, id_tipo_contacto, valor, principal)
        VALUES (v_id_persona_carlos, 5, 'cmendoza@sigi.pe', TRUE);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.core_personas_contactos WHERE id_persona = v_id_persona_carlos AND id_tipo_contacto = 6) THEN
        INSERT INTO public.core_personas_contactos (id_persona, id_tipo_contacto, valor, principal)
        VALUES (v_id_persona_carlos, 6, '+51 987 654 321', TRUE);
    END IF;

    -- Asesor 2: Camila Ordonez
    IF NOT EXISTS (SELECT 1 FROM public.com_asesores WHERE codigo = 'ASE-002') THEN
        INSERT INTO public.core_personas (nombres, apellido_paterno, apellido_materno)
        VALUES ('Camila', 'Ordonez', 'Salazar')
        RETURNING id_persona INTO v_id_persona_camila;

        INSERT INTO public.core_personas_contactos (id_persona, id_tipo_contacto, valor, principal)
        VALUES 
            (v_id_persona_camila, 5, 'cordonez@sigi.pe', TRUE),
            (v_id_persona_camila, 6, '+51 987 112 233', TRUE);

        INSERT INTO public.core_personas_documentos (id_persona, id_tipo_documento, numero_documento, principal)
        VALUES (v_id_persona_camila, 5, '47890123', TRUE);

        INSERT INTO public.com_asesores (id_persona, id_tipo_asesor, id_estado_asesor, codigo, fecha_inicio)
        VALUES (v_id_persona_camila, 3, 4, 'ASE-002', CURRENT_DATE);
    END IF;

    -- Asesor 3: Marco Ledesma
    IF NOT EXISTS (SELECT 1 FROM public.com_asesores WHERE codigo = 'ASE-003') THEN
        INSERT INTO public.core_personas (nombres, apellido_paterno, apellido_materno)
        VALUES ('Marco', 'Ledesma', 'Perez')
        RETURNING id_persona INTO v_id_persona_marco;

        INSERT INTO public.core_personas_contactos (id_persona, id_tipo_contacto, valor, principal)
        VALUES 
            (v_id_persona_marco, 5, 'mledesma@sigi.pe', TRUE),
            (v_id_persona_marco, 6, '+51 976 554 433', TRUE);

        INSERT INTO public.core_personas_documentos (id_persona, id_tipo_documento, numero_documento, principal)
        VALUES (v_id_persona_marco, 5, '48901234', TRUE);

        INSERT INTO public.com_asesores (id_persona, id_tipo_asesor, id_estado_asesor, codigo, fecha_inicio)
        VALUES (v_id_persona_marco, 3, 4, 'ASE-003', CURRENT_DATE);
    END IF;

    -- Asesor 4: Silvana Rojas
    IF NOT EXISTS (SELECT 1 FROM public.com_asesores WHERE codigo = 'ASE-004') THEN
        INSERT INTO public.core_personas (nombres, apellido_paterno, apellido_materno)
        VALUES ('Silvana', 'Rojas', 'Huaman')
        RETURNING id_persona INTO v_id_persona_silvana;

        INSERT INTO public.core_personas_contactos (id_persona, id_tipo_contacto, valor, principal)
        VALUES 
            (v_id_persona_silvana, 5, 'srojas@sigi.pe', TRUE),
            (v_id_persona_silvana, 6, '+51 965 443 322', TRUE);

        INSERT INTO public.core_personas_documentos (id_persona, id_tipo_documento, numero_documento, principal)
        VALUES (v_id_persona_silvana, 5, '49012345', TRUE);

        INSERT INTO public.com_asesores (id_persona, id_tipo_asesor, id_estado_asesor, codigo, fecha_inicio)
        VALUES (v_id_persona_silvana, 3, 4, 'ASE-004', CURRENT_DATE);
    END IF;
END $$;

-- 3. SEED DE PROSPECTOS OPERATIVOS (LEADS)
DO $$
DECLARE
    v_id_proy BIGINT := 2;
    v_id_moneda INT := 3;
    v_id_p1 BIGINT; v_id_p2 BIGINT; v_id_p3 BIGINT; v_id_p4 BIGINT;
    v_id_p5 BIGINT; v_id_p6 BIGINT; v_id_p7 BIGINT;
    v_id_lead1 BIGINT; v_id_lead2 BIGINT; v_id_lead3 BIGINT; v_id_lead4 BIGINT;
    v_id_lead5 BIGINT; v_id_lead6 BIGINT; v_id_lead7 BIGINT;
    v_ase_carlos BIGINT; v_ase_camila BIGINT; v_ase_marco BIGINT; v_ase_silvana BIGINT;
BEGIN
    SELECT id_asesor INTO v_ase_carlos FROM public.com_asesores WHERE codigo = 'ASE-001' LIMIT 1;
    SELECT id_asesor INTO v_ase_camila FROM public.com_asesores WHERE codigo = 'ASE-002' LIMIT 1;
    SELECT id_asesor INTO v_ase_marco FROM public.com_asesores WHERE codigo = 'ASE-003' LIMIT 1;
    SELECT id_asesor INTO v_ase_silvana FROM public.com_asesores WHERE codigo = 'ASE-004' LIMIT 1;

    -- Lead 1: Karina Espinoza (Negociacion, Facebook, Asignada a Camila)
    IF NOT EXISTS (SELECT 1 FROM public.crm_prospectos WHERE codigo = 'LD-1042') THEN
        INSERT INTO public.core_personas (nombres, apellido_paterno, apellido_materno)
        VALUES ('Karina', 'Espinoza', 'Delgado') RETURNING id_persona INTO v_id_p1;
        INSERT INTO public.core_personas_contactos (id_persona, id_tipo_contacto, valor, principal)
        VALUES (v_id_p1, 5, 'k.espinoza@gmail.com', TRUE), (v_id_p1, 6, '+51 987 442 118', TRUE);
        
        INSERT INTO public.crm_prospectos (id_persona, id_estado_prospecto, id_origen_prospecto, codigo, observaciones)
        VALUES (v_id_p1, 13, 12, 'LD-1042', 'Evaluando compra financiada a 36 cuotas') RETURNING id_prospecto INTO v_id_lead1;

        INSERT INTO public.crm_prospectos_intereses (id_prospecto, id_proyecto, id_moneda, area_minima_m2, presupuesto_maximo, requiere_financiamiento, comentario)
        VALUES (v_id_lead1, v_id_proy, v_id_moneda, 100, 110000, TRUE, 'Los Jardines de Lurin · Mz. B');

        INSERT INTO public.com_asignaciones_prospecto (id_prospecto, id_asesor, motivo_asignacion)
        VALUES (v_id_lead1, v_ase_camila, 'Asignacion automatica de campana Facebook');

        INSERT INTO public.crm_seguimientos (id_prospecto, id_tipo_seguimiento, asunto, detalle, resultado, requiere_seguimiento, fecha_proximo_seguimiento)
        VALUES (v_id_lead1, 9, 'Cotizacion enviada por WhatsApp', 'Se envio simulacion de cuotas por WhatsApp', 'Positivo', TRUE, now() + interval '2 days');
    END IF;

    -- Lead 2: Diego Paredes (Interesado/Visita, Instagram, Asignado a Marco)
    IF NOT EXISTS (SELECT 1 FROM public.crm_prospectos WHERE codigo = 'LD-1041') THEN
        INSERT INTO public.core_personas (nombres, apellido_paterno, apellido_materno)
        VALUES ('Diego', 'Paredes', 'Soto') RETURNING id_persona INTO v_id_p2;
        INSERT INTO public.core_personas_contactos (id_persona, id_tipo_contacto, valor, principal)
        VALUES (v_id_p2, 5, 'dparedes@outlook.com', TRUE), (v_id_p2, 6, '+51 962 771 340', TRUE);

        INSERT INTO public.crm_prospectos (id_persona, id_estado_prospecto, id_origen_prospecto, codigo, observaciones)
        VALUES (v_id_p2, 12, 13, 'LD-1041', 'Interesado en lotes de esquina') RETURNING id_prospecto INTO v_id_lead2;

        INSERT INTO public.crm_prospectos_intereses (id_prospecto, id_proyecto, id_moneda, area_minima_m2, presupuesto_maximo, requiere_financiamiento, comentario)
        VALUES (v_id_lead2, v_id_proy, v_id_moneda, 120, 130000, FALSE, 'Los Jardines de Lurin · Mz. C');

        INSERT INTO public.com_asignaciones_prospecto (id_prospecto, id_asesor, motivo_asignacion)
        VALUES (v_id_lead2, v_ase_marco, 'Asignacion directa de lead calificado');

        INSERT INTO public.crm_seguimientos (id_prospecto, id_tipo_seguimiento, asunto, detalle, resultado, requiere_seguimiento, fecha_proximo_seguimiento)
        VALUES (v_id_lead2, 8, 'Llamada de coordinacion', 'Desea visitar el terreno este sabado a las 11am', 'Visita agendada', TRUE, now() + interval '3 days');

        INSERT INTO public.crm_visitas (id_prospecto, id_asesor, id_proyecto, fecha_visita, turno, estado, observaciones)
        VALUES (v_id_lead2, v_ase_marco, v_id_proy, CURRENT_DATE + 3 + time '11:00', '11:00', 'CONFIRMADA', 'Traslado en movilidad de la empresa');
    END IF;

    -- Lead 3: Sara Bustamante (Contactado, Feria, Asignada a Silvana)
    IF NOT EXISTS (SELECT 1 FROM public.crm_prospectos WHERE codigo = 'LD-1040') THEN
        INSERT INTO public.core_personas (nombres, apellido_paterno, apellido_materno)
        VALUES ('Sara', 'Bustamante', 'Alvarez') RETURNING id_persona INTO v_id_p3;
        INSERT INTO public.core_personas_contactos (id_persona, id_tipo_contacto, valor, principal)
        VALUES (v_id_p3, 5, 'sarabusta@gmail.com', TRUE), (v_id_p3, 6, '+51 941 006 220', TRUE);

        INSERT INTO public.crm_prospectos (id_persona, id_estado_prospecto, id_origen_prospecto, codigo, observaciones)
        VALUES (v_id_p3, 10, 17, 'LD-1040', 'Contactada en stand de ExpoInmobiliaria') RETURNING id_prospecto INTO v_id_lead3;

        INSERT INTO public.crm_prospectos_intereses (id_prospecto, id_proyecto, id_moneda, area_minima_m2, presupuesto_maximo, requiere_financiamiento, comentario)
        VALUES (v_id_lead3, v_id_proy, v_id_moneda, 90, 95000, TRUE, 'Los Jardines de Lurin · Mz. A');

        INSERT INTO public.com_asignaciones_prospecto (id_prospecto, id_asesor, motivo_asignacion)
        VALUES (v_id_lead3, v_ase_silvana, 'Asignacion por turno feria');

        INSERT INTO public.crm_seguimientos (id_prospecto, id_tipo_seguimiento, asunto, detalle, resultado, requiere_seguimiento, fecha_proximo_seguimiento)
        VALUES (v_id_lead3, 8, 'Primer contacto telefonico', 'Se brindo informacion general y envio brochure digital', 'Pendiente revision', TRUE, now() + interval '4 days');
    END IF;

    -- Lead 4: Renzo Chavez (Nuevo, WhatsApp, Sin asignar)
    IF NOT EXISTS (SELECT 1 FROM public.crm_prospectos WHERE codigo = 'LD-1039') THEN
        INSERT INTO public.core_personas (nombres, apellido_paterno, apellido_materno)
        VALUES ('Renzo', 'Chavez', 'Castro') RETURNING id_persona INTO v_id_p4;
        INSERT INTO public.core_personas_contactos (id_persona, id_tipo_contacto, valor, principal)
        VALUES (v_id_p4, 5, 'renzo.ch@gmail.com', TRUE), (v_id_p4, 6, '+51 933 880 512', TRUE);

        INSERT INTO public.crm_prospectos (id_persona, id_estado_prospecto, id_origen_prospecto, codigo, observaciones)
        VALUES (v_id_p4, 9, 14, 'LD-1039', 'Pregunto por disponibilidad de lotes frente a parque') RETURNING id_prospecto INTO v_id_lead4;

        INSERT INTO public.crm_prospectos_intereses (id_prospecto, id_proyecto, id_moneda, area_minima_m2, presupuesto_maximo, requiere_financiamiento, comentario)
        VALUES (v_id_lead4, v_id_proy, v_id_moneda, 100, 105000, TRUE, 'Los Jardines de Lurin · Mz. D');

        INSERT INTO public.crm_seguimientos (id_prospecto, id_tipo_seguimiento, asunto, detalle, resultado, requiere_seguimiento)
        VALUES (v_id_lead4, 9, 'Mensaje entrante chatbot', 'Consulta recibida por canal de WhatsApp oficial', 'Nuevo lead', TRUE);
    END IF;

    -- Lead 5: Familia Quispe Rios (En seguimiento, Web, Asignado a Carlos)
    IF NOT EXISTS (SELECT 1 FROM public.crm_prospectos WHERE codigo = 'LD-1038') THEN
        INSERT INTO public.core_personas (nombres, apellido_paterno, apellido_materno)
        VALUES ('Jaime', 'Quispe', 'Rios') RETURNING id_persona INTO v_id_p5;
        INSERT INTO public.core_personas_contactos (id_persona, id_tipo_contacto, valor, principal)
        VALUES (v_id_p5, 5, 'quispe.rios@gmail.com', TRUE), (v_id_p5, 6, '+51 918 224 907', TRUE);

        INSERT INTO public.crm_prospectos (id_persona, id_estado_prospecto, id_origen_prospecto, codigo, observaciones)
        VALUES (v_id_p5, 11, 11, 'LD-1038', 'Familia busca lote para vivienda familiar') RETURNING id_prospecto INTO v_id_lead5;

        INSERT INTO public.crm_prospectos_intereses (id_prospecto, id_proyecto, id_moneda, area_minima_m2, presupuesto_maximo, requiere_financiamiento, comentario)
        VALUES (v_id_lead5, v_id_proy, v_id_moneda, 120, 120000, TRUE, 'Los Jardines de Lurin · Mz. E');

        INSERT INTO public.com_asignaciones_prospecto (id_prospecto, id_asesor, motivo_asignacion)
        VALUES (v_id_lead5, v_ase_carlos, 'Asignacion web');

        INSERT INTO public.crm_seguimientos (id_prospecto, id_tipo_seguimiento, asunto, detalle, resultado, requiere_seguimiento, fecha_proximo_seguimiento)
        VALUES (v_id_lead5, 8, 'Llamada de seguimiento', 'Cliente consulto facilidad de cuota inicial en dos partes', 'Interes confirmado', TRUE, now() + interval '1 day');
    END IF;

    -- Lead 6: Alberto Morales (Convertido, Referido, Asignado a Carlos)
    IF NOT EXISTS (SELECT 1 FROM public.crm_prospectos WHERE codigo = 'LD-1037') THEN
        INSERT INTO public.core_personas (nombres, apellido_paterno, apellido_materno)
        VALUES ('Alberto', 'Morales', 'Guerrero') RETURNING id_persona INTO v_id_p6;
        INSERT INTO public.core_personas_contactos (id_persona, id_tipo_contacto, valor, principal)
        VALUES (v_id_p6, 5, 'alberto.m@gmail.com', TRUE), (v_id_p6, 6, '+51 991 123 456', TRUE);

        INSERT INTO public.crm_prospectos (id_persona, id_estado_prospecto, id_origen_prospecto, codigo, fecha_conversion, observaciones)
        VALUES (v_id_p6, 14, 16, 'LD-1037', now(), 'Convertido tras separar lote MZ-A-L01') RETURNING id_prospecto INTO v_id_lead6;

        INSERT INTO public.crm_prospectos_intereses (id_prospecto, id_proyecto, id_moneda, area_minima_m2, presupuesto_maximo, requiere_financiamiento, comentario)
        VALUES (v_id_lead6, v_id_proy, v_id_moneda, 120, 108000, FALSE, 'Los Jardines de Lurin · Mz. A - Lote 01');

        INSERT INTO public.com_asignaciones_prospecto (id_prospecto, id_asesor, motivo_asignacion)
        VALUES (v_id_lead6, v_ase_carlos, 'Cliente referido por propietario');

        INSERT INTO public.crm_seguimientos (id_prospecto, id_tipo_seguimiento, asunto, detalle, resultado, requiere_seguimiento)
        VALUES (v_id_lead6, 11, 'Firma de separacion preventiva', 'Separacion de S/ 500.00 efectuada con exito', 'Cerrado / Separado', FALSE);
    END IF;

    -- Lead 7: Lucia Vargas (No interesado / Descartado, Web)
    IF NOT EXISTS (SELECT 1 FROM public.crm_prospectos WHERE codigo = 'LD-1036') THEN
        INSERT INTO public.core_personas (nombres, apellido_paterno, apellido_materno)
        VALUES ('Lucia', 'Vargas', 'Ramos') RETURNING id_persona INTO v_id_p7;
        INSERT INTO public.core_personas_contactos (id_persona, id_tipo_contacto, valor, principal)
        VALUES (v_id_p7, 5, 'lvargas@yahoo.es', TRUE), (v_id_p7, 6, '+51 955 887 766', TRUE);

        INSERT INTO public.crm_prospectos (id_persona, id_estado_prospecto, id_origen_prospecto, codigo, observaciones)
        VALUES (v_id_p7, 15, 11, 'LD-1036', 'Desistio por distancia geografica') RETURNING id_prospecto INTO v_id_lead7;

        INSERT INTO public.crm_prospectos_intereses (id_prospecto, id_proyecto, id_moneda, area_minima_m2, presupuesto_maximo, requiere_financiamiento, comentario)
        VALUES (v_id_lead7, v_id_proy, v_id_moneda, 90, 80000, TRUE, 'Los Jardines de Lurin · Mz. F');

        INSERT INTO public.crm_seguimientos (id_prospecto, id_tipo_seguimiento, asunto, detalle, resultado, requiere_seguimiento)
        VALUES (v_id_lead7, 8, 'Llamada de descarte', 'Indico que prefiere un proyecto en zona norte de Lima', 'No interesado', FALSE);
    END IF;
END $$;

-- 4. STORED PROCEDURES PARA POSTGREST RPC

-- 4.1. sp_listar_prospectos()
CREATE OR REPLACE FUNCTION public.sp_listar_prospectos()
RETURNS TABLE (
    id_prospecto BIGINT,
    codigo VARCHAR,
    id_persona BIGINT,
    nombre_completo TEXT,
    telefono VARCHAR,
    email VARCHAR,
    id_origen INT,
    origen_codigo VARCHAR,
    origen_nombre VARCHAR,
    id_estado INT,
    estado_codigo VARCHAR,
    estado_nombre VARCHAR,
    interes TEXT,
    puntuacion TEXT,
    id_asesor BIGINT,
    asesor_nombre TEXT,
    fecha_registro TIMESTAMPTZ,
    ultimo_contacto TEXT,
    observaciones TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT
        p.id_prospecto,
        p.codigo,
        p.id_persona,
        TRIM(per.nombres || ' ' || per.apellido_paterno || ' ' || COALESCE(per.apellido_materno, '')) AS nombre_completo,
        COALESCE(
            (SELECT c.valor FROM public.core_personas_contactos c WHERE c.id_persona = per.id_persona AND c.id_tipo_contacto IN (6, 8) ORDER BY c.principal DESC, c.id_persona_contacto DESC LIMIT 1),
            'Sin telefono'
        ) AS telefono,
        COALESCE(
            (SELECT c.valor FROM public.core_personas_contactos c WHERE c.id_persona = per.id_persona AND c.id_tipo_contacto = 5 ORDER BY c.principal DESC, c.id_persona_contacto DESC LIMIT 1),
            'Sin correo'
        ) AS email,
        p.id_origen_prospecto AS id_origen,
        orig.codigo AS origen_codigo,
        orig.nombre AS origen_nombre,
        p.id_estado_prospecto AS id_estado,
        est.codigo AS estado_codigo,
        est.nombre AS estado_nombre,
        COALESCE(
            (SELECT int.comentario FROM public.crm_prospectos_intereses int WHERE int.id_prospecto = p.id_prospecto AND int.activo = TRUE ORDER BY int.id_prospecto_interes DESC LIMIT 1),
            'Interes general'
        ) AS interes,
        CASE
            WHEN p.id_estado_prospecto IN (13, 14) THEN 'Alto'
            WHEN p.id_estado_prospecto IN (11, 12) THEN 'Alto'
            WHEN p.id_estado_prospecto IN (9, 10) THEN 'Medio'
            ELSE 'Bajo'
        END AS puntuacion,
        asig.id_asesor,
        COALESCE(
            TRIM(per_ase.nombres || ' ' || per_ase.apellido_paterno),
            'Sin asignar'
        ) AS asesor_nombre,
        p.fecha_registro,
        COALESCE(
            (SELECT TO_CHAR(seg.fecha_seguimiento, 'DD/MM/YYYY HH24:MI') FROM public.crm_seguimientos seg WHERE seg.id_prospecto = p.id_prospecto ORDER BY seg.fecha_seguimiento DESC LIMIT 1),
            'Sin contacto'
        ) AS ultimo_contacto,
        p.observaciones
    FROM public.crm_prospectos p
    JOIN public.core_personas per ON p.id_persona = per.id_persona
    JOIN public.cfg_estados_prospecto est ON p.id_estado_prospecto = est.id_estado_prospecto
    JOIN public.cfg_origenes_prospecto orig ON p.id_origen_prospecto = orig.id_origen_prospecto
    LEFT JOIN public.com_asignaciones_prospecto asig ON p.id_prospecto = asig.id_prospecto_vigente
    LEFT JOIN public.com_asesores ase ON asig.id_asesor = ase.id_asesor
    LEFT JOIN public.core_personas per_ase ON ase.id_persona = per_ase.id_persona
    WHERE p.activo = TRUE
    ORDER BY p.id_prospecto DESC;
$$;

-- 4.2. sp_listar_asesores()
CREATE OR REPLACE FUNCTION public.sp_listar_asesores()
RETURNS TABLE (
    id_asesor BIGINT,
    codigo VARCHAR,
    nombre_completo TEXT,
    email VARCHAR,
    telefono VARCHAR,
    activo BOOLEAN,
    leads_activos BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT
        a.id_asesor,
        a.codigo,
        TRIM(p.nombres || ' ' || p.apellido_paterno || ' ' || COALESCE(p.apellido_materno, '')) AS nombre_completo,
        COALESCE(
            (SELECT c.valor FROM public.core_personas_contactos c WHERE c.id_persona = p.id_persona AND c.id_tipo_contacto = 5 LIMIT 1),
            'Sin correo'
        ) AS email,
        COALESCE(
            (SELECT c.valor FROM public.core_personas_contactos c WHERE c.id_persona = p.id_persona AND c.id_tipo_contacto IN (6, 8) LIMIT 1),
            'Sin telefono'
        ) AS telefono,
        (a.id_estado_asesor = 4) AS activo,
        COUNT(asig.id_asignacion_prospecto) AS leads_activos
    FROM public.com_asesores a
    JOIN public.core_personas p ON a.id_persona = p.id_persona
    LEFT JOIN public.com_asignaciones_prospecto asig ON a.id_asesor = asig.id_asesor AND asig.fecha_fin IS NULL
    GROUP BY a.id_asesor, a.codigo, p.nombres, p.apellido_paterno, p.apellido_materno, p.id_persona, a.id_estado_asesor
    ORDER BY a.codigo ASC;
$$;

-- 4.3. sp_asignar_prospecto_asesor()
CREATE OR REPLACE FUNCTION public.sp_asignar_prospecto_asesor(
    p_id_prospecto BIGINT,
    p_id_asesor BIGINT,
    p_motivo VARCHAR DEFAULT 'Asignacion manual'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_nombre_asesor TEXT;
BEGIN
    -- Validar existencia de prospecto
    IF NOT EXISTS (SELECT 1 FROM public.crm_prospectos WHERE id_prospecto = p_id_prospecto) THEN
        RAISE EXCEPTION 'Prospecto no encontrado con ID %', p_id_prospecto;
    END IF;

    -- Validar existencia de asesor
    SELECT TRIM(p.nombres || ' ' || p.apellido_paterno) INTO v_nombre_asesor
    FROM public.com_asesores a
    JOIN public.core_personas p ON a.id_persona = p.id_persona
    WHERE a.id_asesor = p_id_asesor;

    IF v_nombre_asesor IS NULL THEN
        RAISE EXCEPTION 'Asesor no encontrado con ID %', p_id_asesor;
    END IF;

    -- Cerrar asignacion anterior si existe
    UPDATE public.com_asignaciones_prospecto
    SET fecha_fin = now(),
        motivo_cierre = 'Reasignacion'
    WHERE id_prospecto = p_id_prospecto AND fecha_fin IS NULL;

    -- Crear nueva asignacion
    INSERT INTO public.com_asignaciones_prospecto (id_prospecto, id_asesor, motivo_asignacion)
    VALUES (p_id_prospecto, p_id_asesor, p_motivo);

    -- Registrar seguimiento
    INSERT INTO public.crm_seguimientos (id_prospecto, id_tipo_seguimiento, asunto, detalle, resultado, requiere_seguimiento)
    VALUES (
        p_id_prospecto,
        14, -- OTRO
        'Asignacion de asesor comercial',
        'El prospecto fue asignado a ' || v_nombre_asesor || ' (ID ' || p_id_asesor || ')',
        'Asignado',
        TRUE
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'id_prospecto', p_id_prospecto,
        'id_asesor', p_id_asesor,
        'asesor_nombre', v_nombre_asesor,
        'mensaje', 'Prospecto asignado correctamente'
    );
END;
$$;

-- 4.4. sp_cambiar_etapa_prospecto()
CREATE OR REPLACE FUNCTION public.sp_cambiar_etapa_prospecto(
    p_id_prospecto BIGINT,
    p_id_estado INT,
    p_observacion TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_nombre_estado VARCHAR;
BEGIN
    SELECT nombre INTO v_nombre_estado
    FROM public.cfg_estados_prospecto
    WHERE id_estado_prospecto = p_id_estado;

    IF v_nombre_estado IS NULL THEN
        RAISE EXCEPTION 'Estado de prospecto no valido: %', p_id_estado;
    END IF;

    UPDATE public.crm_prospectos
    SET id_estado_prospecto = p_id_estado,
        fecha_conversion = CASE WHEN p_id_estado = 14 THEN now() ELSE fecha_conversion END,
        observaciones = COALESCE(p_observacion, observaciones),
        fecha_actualizacion = now()
    WHERE id_prospecto = p_id_prospecto;

    INSERT INTO public.crm_seguimientos (id_prospecto, id_tipo_seguimiento, asunto, detalle, resultado, requiere_seguimiento)
    VALUES (
        p_id_prospecto,
        14,
        'Cambio de etapa en embudo',
        'Prospecto avanzado a estado: ' || v_nombre_estado || COALESCE(' - ' || p_observacion, ''),
        'Actualizado',
        (p_id_estado NOT IN (14, 15, 16))
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'id_prospecto', p_id_prospecto,
        'id_estado', p_id_estado,
        'estado_nombre', v_nombre_estado
    );
END;
$$;

-- 4.5. sp_crear_prospecto()
CREATE OR REPLACE FUNCTION public.sp_crear_prospecto(
    p_nombres VARCHAR,
    p_apellido_paterno VARCHAR,
    p_apellido_materno VARCHAR DEFAULT '',
    p_telefono VARCHAR DEFAULT NULL,
    p_email VARCHAR DEFAULT NULL,
    p_origen_codigo VARCHAR DEFAULT 'WEB',
    p_interes TEXT DEFAULT 'Los Jardines de Lurin',
    p_id_asesor BIGINT DEFAULT NULL,
    p_observaciones TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id_persona BIGINT;
    v_id_prospecto BIGINT;
    v_id_origen INT;
    v_codigo_lead VARCHAR;
    v_count_leads BIGINT;
BEGIN
    SELECT id_origen_prospecto INTO v_id_origen
    FROM public.cfg_origenes_prospecto
    WHERE codigo = p_origen_codigo;

    IF v_id_origen IS NULL THEN
        v_id_origen := 11; -- WEB por defecto
    END IF;

    -- Generar codigo correlativo
    SELECT COUNT(*) + 1043 INTO v_count_leads FROM public.crm_prospectos;
    v_codigo_lead := 'LD-' || v_count_leads;

    -- Crear persona
    INSERT INTO public.core_personas (nombres, apellido_paterno, apellido_materno)
    VALUES (p_nombres, p_apellido_paterno, p_apellido_materno)
    RETURNING id_persona INTO v_id_persona;

    -- Crear contactos
    IF p_email IS NOT NULL AND p_email <> '' THEN
        INSERT INTO public.core_personas_contactos (id_persona, id_tipo_contacto, valor, principal)
        VALUES (v_id_persona, 5, p_email, TRUE);
    END IF;

    IF p_telefono IS NOT NULL AND p_telefono <> '' THEN
        INSERT INTO public.core_personas_contactos (id_persona, id_tipo_contacto, valor, principal)
        VALUES (v_id_persona, 6, p_telefono, TRUE);
    END IF;

    -- Crear prospecto
    INSERT INTO public.crm_prospectos (id_persona, id_estado_prospecto, id_origen_prospecto, codigo, observaciones)
    VALUES (v_id_persona, 9, v_id_origen, v_codigo_lead, p_observaciones)
    RETURNING id_prospecto INTO v_id_prospecto;

    -- Registrar interes
    INSERT INTO public.crm_prospectos_intereses (id_prospecto, id_proyecto, id_moneda, comentario)
    VALUES (v_id_prospecto, 2, 3, p_interes);

    -- Asignar asesor si se proporciono
    IF p_id_asesor IS NOT NULL THEN
        INSERT INTO public.com_asignaciones_prospecto (id_prospecto, id_asesor, motivo_asignacion)
        VALUES (v_id_prospecto, p_id_asesor, 'Asignacion al crear lead');
    END IF;

    -- Seguimiento inicial
    INSERT INTO public.crm_seguimientos (id_prospecto, id_tipo_seguimiento, asunto, detalle, resultado, requiere_seguimiento)
    VALUES (v_id_prospecto, 14, 'Registro de lead', 'Lead captado por canal ' || p_origen_codigo, 'Nuevo', TRUE);

    RETURN jsonb_build_object(
        'success', TRUE,
        'id_prospecto', v_id_prospecto,
        'codigo', v_codigo_lead,
        'nombre', p_nombres || ' ' || p_apellido_paterno
    );
END;
$$;

-- 4.6. sp_agendar_visita() con validacion de dias y turnos oficiales (Sprint 3 Issue #24 y #25)
CREATE OR REPLACE FUNCTION public.sp_agendar_visita(
    p_id_prospecto BIGINT,
    p_id_asesor BIGINT,
    p_id_proyecto BIGINT,
    p_fecha_visita TIMESTAMPTZ,
    p_turno VARCHAR, -- '11:00' o '15:00'
    p_punto_encuentro VARCHAR DEFAULT 'Oficina de Ventas - Lurin',
    p_observaciones TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_dow INT;
    v_id_visita BIGINT;
BEGIN
    -- Validar turno oficial (11:00 o 15:00)
    IF p_turno NOT IN ('11:00', '15:00') THEN
        RAISE EXCEPTION 'El turno debe ser uno de los horarios oficiales: 11:00 o 15:00';
    END IF;

    -- Validar dia de semana: Miercoles (3) a Domingo (0)
    v_dow := EXTRACT(DOW FROM p_fecha_visita)::INT;
    IF v_dow NOT IN (0, 3, 4, 5, 6) THEN
        RAISE EXCEPTION 'Las visitas oficiales guiadas solo se realizan de Miercoles a Domingo (dias 3, 4, 5, 6, 0)';
    END IF;

    -- Insertar visita
    INSERT INTO public.crm_visitas (id_prospecto, id_asesor, id_proyecto, fecha_visita, turno, estado, punto_encuentro, observaciones)
    VALUES (p_id_prospecto, p_id_asesor, p_id_proyecto, p_fecha_visita, p_turno, 'PROGRAMADA', p_punto_encuentro, p_observaciones)
    RETURNING id_visita INTO v_id_visita;

    -- Actualizar etapa a INTERESADO / VISITA si correspondiese
    UPDATE public.crm_prospectos
    SET id_estado_prospecto = 12
    WHERE id_prospecto = p_id_prospecto AND id_estado_prospecto < 12;

    -- Registrar seguimiento
    INSERT INTO public.crm_seguimientos (id_prospecto, id_tipo_seguimiento, asunto, detalle, resultado, requiere_seguimiento, fecha_proximo_seguimiento)
    VALUES (
        p_id_prospecto,
        12, -- VISITA_PROYECTO
        'Visita guiada agendada',
        'Visita programada para ' || TO_CHAR(p_fecha_visita, 'DD/MM/YYYY') || ' turno ' || p_turno || ' en ' || p_punto_encuentro,
        'Agendada',
        TRUE,
        p_fecha_visita
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'id_visita', v_id_visita,
        'fecha_visita', p_fecha_visita,
        'turno', p_turno,
        'mensaje', 'Visita agendada exitosamente dentro del horario oficial'
    );
END;
$$;

-- 4.7. sp_listar_visitas()
CREATE OR REPLACE FUNCTION public.sp_listar_visitas()
RETURNS TABLE (
    id_visita BIGINT,
    id_prospecto BIGINT,
    prospecto_nombre TEXT,
    prospecto_telefono VARCHAR,
    id_asesor BIGINT,
    asesor_nombre TEXT,
    proyecto_nombre VARCHAR,
    fecha_visita TIMESTAMPTZ,
    turno VARCHAR,
    estado VARCHAR,
    punto_encuentro VARCHAR,
    observaciones TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT
        v.id_visita,
        v.id_prospecto,
        TRIM(pp.nombres || ' ' || pp.apellido_paterno) AS prospecto_nombre,
        COALESCE((SELECT c.valor FROM public.core_personas_contactos c WHERE c.id_persona = pp.id_persona AND c.id_tipo_contacto IN (6, 8) LIMIT 1), 'Sin telefono') AS prospecto_telefono,
        v.id_asesor,
        TRIM(pa.nombres || ' ' || pa.apellido_paterno) AS asesor_nombre,
        proy.nombre AS proyecto_nombre,
        v.fecha_visita,
        v.turno,
        v.estado,
        v.punto_encuentro,
        v.observaciones
    FROM public.crm_visitas v
    JOIN public.crm_prospectos pr ON v.id_prospecto = pr.id_prospecto
    JOIN public.core_personas pp ON pr.id_persona = pp.id_persona
    JOIN public.com_asesores a ON v.id_asesor = a.id_asesor
    JOIN public.core_personas pa ON a.id_persona = pa.id_persona
    JOIN public.inm_proyectos proy ON v.id_proyecto = proy.id_proyecto
    WHERE v.activo = TRUE
    ORDER BY v.fecha_visita ASC;
$$;

-- Permisos de ejecucion para API PostgREST
GRANT EXECUTE ON FUNCTION public.sp_listar_prospectos() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_listar_asesores() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_asignar_prospecto_asesor(BIGINT, BIGINT, VARCHAR) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_cambiar_etapa_prospecto(BIGINT, INT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_crear_prospecto(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, BIGINT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_agendar_visita(BIGINT, BIGINT, BIGINT, TIMESTAMPTZ, VARCHAR, VARCHAR, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_listar_visitas() TO anon, authenticated, service_role;
