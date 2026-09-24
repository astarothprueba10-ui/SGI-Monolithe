-- ============================================================================
-- SIGI MONOLITHE - SCHEMA COMPLETO PARA POSTGRESQL / SUPABASE
-- Generado y optimizado para Supabase (PostgreSQL 15+)
-- Total de Tablas: 102 tablas estructuradas por módulos
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Función para actualizar automáticamente fecha_actualizacion en PostgreSQL
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- SCRIPT DE CREACION DE TABLAS --


-- 01. CATALOGOS / CFG

-- TABLA cfg_estados_proyecto
CREATE TABLE IF NOT EXISTS cfg_estados_proyecto (
id_estado_proyecto INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_estados_proyecto_codigo
        UNIQUE (codigo)
);
  
-- TABLA cfg_estados_etapa
CREATE TABLE IF NOT EXISTS cfg_estados_etapa (
id_estado_etapa INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_estados_etapa_codigo
        UNIQUE (codigo)
);

-- TABLA cfg_estados_manzana
CREATE TABLE IF NOT EXISTS cfg_estados_manzana (
id_estado_manzana INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_estados_manzana_codigo
        UNIQUE (codigo)
);
  
-- TABLA cfg_estados_lote
CREATE TABLE IF NOT EXISTS cfg_estados_lote (
id_estado_lote INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    permite_reserva BOOLEAN NOT NULL DEFAULT FALSE,
    permite_venta BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_estados_lote_codigo
        UNIQUE (codigo)
);
  
-- TABLA CFG_TIPOS_LOTE
CREATE TABLE IF NOT EXISTS cfg_tipos_lote (
id_tipo_lote INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_tipos_lote_codigo
        UNIQUE (codigo)
);
  
-- TABLA CFG_MONEDAS
CREATE TABLE IF NOT EXISTS cfg_monedas (
id_moneda INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo CHAR(3) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    simbolo VARCHAR(10),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_monedas_codigo
        UNIQUE (codigo)
);
  
  -- TABLA CFG_TIPOS_DOCUMENTO
CREATE TABLE IF NOT EXISTS cfg_tipos_documento (
id_tipo_documento INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(20) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    longitud_minima INT,
    longitud_maxima INT,

    solo_numerico BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_tipos_documento_codigo
        UNIQUE (codigo),

    CONSTRAINT chk_cfg_tipos_documento_longitud
        CHECK (
            longitud_minima IS NULL
            OR longitud_maxima IS NULL
            OR longitud_maxima >= longitud_minima
        )
);
  
  -- tabla cgf_tipos_tarifas ---
  CREATE TABLE IF NOT EXISTS cfg_tipos_tarifa (
id_tipo_tarifa INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_tipos_tarifa_codigo
        UNIQUE (codigo)
);
  
  -- tabla cfg_tipos_ajuste_precio --
  CREATE TABLE IF NOT EXISTS cfg_tipos_ajuste_precio (
id_tipo_ajuste_precio INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_tipos_ajuste_precio_codigo
        UNIQUE (codigo)
);
  
  -- tabla cfg_tipos_contacto
  CREATE TABLE IF NOT EXISTS cfg_tipos_contacto (
id_tipo_contacto INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(20) NOT NULL,
    nombre VARCHAR(80) NOT NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_tipos_contacto_codigo
        UNIQUE (codigo)
);
  
   -- TABLA CFG_ESTADOS-PROSPECTO
  CREATE TABLE IF NOT EXISTS cfg_estados_prospecto (
id_estado_prospecto INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    es_estado_final BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_estados_prospecto_codigo
        UNIQUE (codigo)
);
  
  -- TABLA CFG_ORIGENES_PROSPECTO
  CREATE TABLE IF NOT EXISTS cfg_origenes_prospecto (
id_origen_prospecto INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_origenes_prospecto_codigo
        UNIQUE (codigo)
);
  
  -- CFG_TIPOS_SEGUIMIENTO
CREATE TABLE IF NOT EXISTS cfg_tipos_seguimiento (
id_tipo_seguimiento INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_tipos_seguimiento_codigo
        UNIQUE (codigo)
);
  
    -- TABLA CFG_TIPOS_CONSENTIMIENTOS 
  CREATE TABLE IF NOT EXISTS cfg_tipos_consentimiento (
id_tipo_consentimiento INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(40) NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_tipos_consentimiento_codigo
        UNIQUE (codigo)
);
  
    -- TABLA CFG_ESTADOS_RESERVA
  CREATE TABLE IF NOT EXISTS cfg_estados_reserva (
id_estado_reserva INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    es_final BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_estados_reserva_codigo
        UNIQUE (codigo)
);
  
  -- TABLA CFG_ESTADOS_VENTAS
  CREATE TABLE IF NOT EXISTS cfg_estados_venta (
id_estado_venta INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    es_final BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_estados_venta_codigo
        UNIQUE (codigo)
);
  
  -- tabla cfg_tipos_contrato --
  CREATE TABLE IF NOT EXISTS cfg_tipos_contrato (
id_tipo_contrato INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(40) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_tipos_contrato_codigo
        UNIQUE (codigo)
);
  
  -- TABLA CFG_ESTADOS_CONTRATO
  CREATE TABLE IF NOT EXISTS cfg_estados_contrato (
id_estado_contrato INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    es_final BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_estados_contrato_codigo
        UNIQUE (codigo)
);
  
    -- tabla cfg_estados_usuario
  CREATE TABLE IF NOT EXISTS cfg_estados_usuario (
id_estado_usuario INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    permite_acceso BOOLEAN NOT NULL DEFAULT TRUE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_estados_usuario_codigo
        UNIQUE (codigo)
);
  
  -- tabla cfg_modalidades_venta
  CREATE TABLE IF NOT EXISTS cfg_modalidades_venta (
id_modalidad_venta INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    requiere_plan_pago BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_modalidades_venta_codigo
        UNIQUE (codigo)
);
  
  -- tabla cfg_estados_plan_pago --
  CREATE TABLE IF NOT EXISTS cfg_estados_plan_pago (
id_estado_plan_pago INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    es_final BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_estados_plan_pago_codigo
        UNIQUE (codigo)
);
  
  -- TABLA CFG_ESTADOS_CUOTA --
  CREATE TABLE IF NOT EXISTS cfg_estados_cuota (
id_estado_cuota INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    es_final BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_estados_cuota_codigo
        UNIQUE (codigo)
);
  
  -- TABLA CFG_METODOS_PAGO -- 
  CREATE TABLE IF NOT EXISTS cfg_metodos_pago (
id_metodo_pago INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    requiere_numero_operacion BOOLEAN NOT NULL DEFAULT FALSE,
    requiere_voucher BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_metodos_pago_codigo
        UNIQUE (codigo)
);
  
  -- TABLA CFG_ESTADOS_VAUCHER
  CREATE TABLE IF NOT EXISTS cfg_estados_voucher (
id_estado_voucher INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    es_final BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_estados_voucher_codigo
        UNIQUE (codigo)
);
  
  -- TABLA CFG_ESTADOS_PAGO --
  CREATE TABLE IF NOT EXISTS cfg_estados_pago (
id_estado_pago INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    es_final BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_estados_pago_codigo
        UNIQUE (codigo)
);
  
    -- CFG_TIPOS_APLICACION_PAGO --
  CREATE TABLE IF NOT EXISTS cfg_tipos_aplicacion_pago (
id_tipo_aplicacion_pago INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_tipos_aplicacion_pago_codigo
        UNIQUE (codigo)
);
  
  -- TABLA CFG_TIPOS_ASESOR
  CREATE TABLE IF NOT EXISTS cfg_tipos_asesor (
id_tipo_asesor INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_tipos_asesor_codigo
        UNIQUE (codigo)
);
  
  -- TABLA CFG_ESTADOS_ASESOR
  CREATE TABLE IF NOT EXISTS cfg_estados_asesor (
id_estado_asesor INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    permite_operar BOOLEAN NOT NULL DEFAULT TRUE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_estados_asesor_codigo
        UNIQUE (codigo)
);
  
  -- TABLA CFG_TIPOS_CALCULO_COMISION
  CREATE TABLE IF NOT EXISTS cfg_tipos_calculo_comision (
id_tipo_calculo_comision INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_tipos_calculo_comision_codigo
        UNIQUE (codigo)
);
  
  -- TABLA CFG_ESTADOS_COMISION
  CREATE TABLE IF NOT EXISTS cfg_estados_comision (
id_estado_comision INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    es_final BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_estados_comision_codigo
        UNIQUE (codigo)
);
  
  -- TABLA CFG_ESTADOS_PUBLICACIONES 
  CREATE TABLE IF NOT EXISTS cfg_estados_publicacion (
id_estado_publicacion INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    visible_publico BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_estados_publicacion_codigo
        UNIQUE (codigo)
);
  
  -- TABLA CFG_TIPOS DE SECCION --
CREATE TABLE IF NOT EXISTS cfg_tipos_seccion (
id_tipo_seccion INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(40) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_tipos_seccion_codigo
        UNIQUE (codigo)
);
  
  -- TABLA CFG_TIPOS_MULTIMEDIA --
  CREATE TABLE IF NOT EXISTS cfg_tipos_multimedia (
id_tipo_multimedia INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_tipos_multimedia_codigo
        UNIQUE (codigo)
);
  
  -- TABLA CFG_USOS_MULTIMEDIA --
  CREATE TABLE IF NOT EXISTS cfg_usos_multimedia (
id_uso_multimedia INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_usos_multimedia_codigo
        UNIQUE (codigo)
);
  
  -- CFG_ESTADOS_CONSULTA_WEB --
  CREATE TABLE IF NOT EXISTS cfg_estados_consulta_web (
id_estado_consulta_web INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    es_final BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_estados_consulta_web_codigo
        UNIQUE (codigo)
);
  
  -- TABLA CFG_TIPOS_NOTIFICACIÓN --
  CREATE TABLE IF NOT EXISTS cfg_tipos_notificacion (
id_tipo_notificacion INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(40) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),
    permite_preferencia BOOLEAN NOT NULL DEFAULT TRUE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_tipos_notificacion_codigo
        UNIQUE (codigo)
);
  
  -- TABLA CFG_CANALES_NOTIFICACION --
  CREATE TABLE IF NOT EXISTS cfg_canales_notificacion (
id_canal_notificacion INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_canales_notificacion_codigo
        UNIQUE (codigo)
);
  
-- TABLA CFG_ESTADOS_ENVIO_NOTIFICACION --
CREATE TABLE IF NOT EXISTS cfg_estados_envio_notificacion (
id_estado_envio_notificacion INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    es_final BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_estados_envio_notificacion_codigo
        UNIQUE (codigo)
);
  
-- TABLA CFG_TIPOS_MOVIMIENTO_FINANCIERO --
CREATE TABLE IF NOT EXISTS cfg_tipos_movimiento_financiero (
id_tipo_movimiento_financiero INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_tipos_movimiento_financiero_codigo
        UNIQUE (codigo)
);
  
  -- TABLA CFG_ESTADOS_MOVIMIENTO_FINANCIERO --
  CREATE TABLE IF NOT EXISTS cfg_estados_movimiento_financiero (
id_estado_movimiento_financiero INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    es_final BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_estados_movimiento_financiero_codigo
        UNIQUE (codigo)
);
  
  -- TABLA CFG_TIPOS_CUENTA_FINANCIERA 
  CREATE TABLE IF NOT EXISTS cfg_tipos_cuenta_financiera (
id_tipo_cuenta_financiera INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cfg_tipos_cuenta_financiera_codigo
        UNIQUE (codigo)
);
  
-- ----- 2. CORE DEL NEGOCIO --------

 -- TABLA CORE_PERSONAS 
  CREATE TABLE IF NOT EXISTS core_personas (
id_persona BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    nombres VARCHAR(120) NOT NULL,
    apellido_paterno VARCHAR(80),
    apellido_materno VARCHAR(80),

    fecha_nacimiento DATE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now())
);
  
  -- TABLA CORE_PERSONAS_DOCUMENTOS
  CREATE TABLE IF NOT EXISTS core_personas_documentos (
id_persona_documento BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_persona BIGINT NOT NULL,
    id_tipo_documento INT NOT NULL,

    numero_documento VARCHAR(30) NOT NULL,

    pais_emision VARCHAR(100) DEFAULT 'Perú',

    fecha_emision DATE,
    fecha_vencimiento DATE,

    principal BOOLEAN NOT NULL DEFAULT FALSE,
    
    clave_documento_principal VARCHAR(100)
    GENERATED ALWAYS AS (
        CASE
            WHEN principal = TRUE
            THEN ((id_persona)::text || ('-')::text || (id_tipo_documento)::text)
            ELSE NULL
        END
    ) STORED,
    
    verificado BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_core_personas_documentos_tipo_numero
        UNIQUE (id_tipo_documento, numero_documento),
        
	CONSTRAINT uk_core_personas_documentos_principal
        UNIQUE (clave_documento_principal),

    CONSTRAINT fk_core_personas_documentos_persona
        FOREIGN KEY (id_persona)
        REFERENCES core_personas(id_persona)
        ON DELETE RESTRICT,

    CONSTRAINT fk_core_personas_documentos_tipo
        FOREIGN KEY (id_tipo_documento)
        REFERENCES cfg_tipos_documento(id_tipo_documento)
        ON DELETE RESTRICT,

    CONSTRAINT chk_core_personas_documentos_fechas
        CHECK (
            fecha_vencimiento IS NULL
            OR fecha_emision IS NULL
            OR fecha_vencimiento >= fecha_emision
        )
);
  
  -- TABLA CORE_PERSONAS_CONTACTOS
 CREATE TABLE IF NOT EXISTS core_personas_contactos (
id_persona_contacto BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_persona BIGINT NOT NULL,
    id_tipo_contacto INT NOT NULL,

    valor VARCHAR(180) NOT NULL,

    principal BOOLEAN NOT NULL DEFAULT FALSE,
    clave_contacto_principal VARCHAR(100)
    GENERATED ALWAYS AS (
        CASE
            WHEN principal = TRUE
            THEN ((id_persona)::text || ('-')::text || (id_tipo_contacto)::text)
            ELSE NULL
        END
    ) STORED,
    
    verificado BOOLEAN NOT NULL DEFAULT FALSE,
    permite_notificaciones BOOLEAN NOT NULL DEFAULT TRUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT fk_core_personas_contactos_persona
        FOREIGN KEY (id_persona)
        REFERENCES core_personas(id_persona)
        ON DELETE RESTRICT,

    CONSTRAINT fk_core_personas_contactos_tipo
        FOREIGN KEY (id_tipo_contacto)
        REFERENCES cfg_tipos_contacto(id_tipo_contacto)
        ON DELETE RESTRICT,
        
	CONSTRAINT uk_core_personas_contactos_persona_tipo_valor
        UNIQUE (id_persona, id_tipo_contacto, valor),
	
    CONSTRAINT uk_core_personas_contactos_principal
        UNIQUE (clave_contacto_principal)
);
  
  
  -- TABLA CORE_PERSONAS_DIRECCIONES
  CREATE TABLE IF NOT EXISTS core_personas_direcciones (
id_persona_direccion BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_persona BIGINT NOT NULL,

    tipo VARCHAR(30) NOT NULL DEFAULT 'DOMICILIO',

    direccion VARCHAR(255) NOT NULL,
    referencia VARCHAR(255),

    distrito VARCHAR(100),
    provincia VARCHAR(100),
    departamento VARCHAR(100),
    pais VARCHAR(100) NOT NULL DEFAULT 'Perú',

    codigo_postal VARCHAR(20),

    principal BOOLEAN NOT NULL DEFAULT FALSE,
    clave_direccion_principal VARCHAR(150)
    GENERATED ALWAYS AS (
        CASE
            WHEN principal = TRUE
            THEN ((id_persona)::text || ('-')::text || (UPPER(TRIM(tipo)::text))
            )
            ELSE NULL
        END
    ) STORED,
    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT fk_core_personas_direcciones_persona
        FOREIGN KEY (id_persona)
        REFERENCES core_personas(id_persona)
        ON DELETE RESTRICT,
	
    CONSTRAINT uk_core_personas_direcciones_principal
        UNIQUE (clave_direccion_principal)
);
  
  
  -- ---- 3. SEGURIDAD -------------
    -- tabla seg_usuarios 
  CREATE TABLE IF NOT EXISTS seg_usuarios (
id_usuario BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_persona BIGINT NOT NULL,
    id_estado_usuario INT NOT NULL,

    usuario_login VARCHAR(120) NOT NULL,

    password_hash VARCHAR(255) NOT NULL,

    requiere_cambio_password BOOLEAN NOT NULL DEFAULT TRUE,

    intentos_fallidos INT NOT NULL DEFAULT 0,

    bloqueado_hasta TIMESTAMPTZ(6),

    ultimo_acceso TIMESTAMPTZ(6),

    password_actualizado_en TIMESTAMPTZ(6),

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_seg_usuarios_persona
        UNIQUE (id_persona),

    CONSTRAINT uk_seg_usuarios_login
        UNIQUE (usuario_login),

    CONSTRAINT fk_seg_usuarios_persona
        FOREIGN KEY (id_persona)
        REFERENCES core_personas(id_persona)
        ON DELETE RESTRICT,

    CONSTRAINT fk_seg_usuarios_estado
        FOREIGN KEY (id_estado_usuario)
        REFERENCES cfg_estados_usuario(id_estado_usuario)
        ON DELETE RESTRICT
);
  
  -- tabla seg_roles --
  CREATE TABLE IF NOT EXISTS seg_roles (
id_rol INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(40) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),

    es_sistema BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_seg_roles_codigo
        UNIQUE (codigo)
);
  
  -- tabla Seg_permisos 
  CREATE TABLE IF NOT EXISTS seg_permisos (
id_permiso INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo VARCHAR(100) NOT NULL,

    modulo VARCHAR(50) NOT NULL,
    recurso VARCHAR(80) NOT NULL,
    accion VARCHAR(40) NOT NULL,

    nombre VARCHAR(150) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_seg_permisos_codigo
        UNIQUE (codigo),

    CONSTRAINT uk_seg_permisos_modulo_recurso_accion
        UNIQUE (
            modulo,
            recurso,
            accion
        )
);
  
  -- tabla seg_usuarios_roles --
  CREATE TABLE IF NOT EXISTS seg_usuarios_roles (
id_usuario_rol BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_usuario BIGINT NOT NULL,
    id_rol INT NOT NULL,

    fecha_asignacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_revocacion TIMESTAMPTZ(6),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    asignado_por BIGINT,

    CONSTRAINT uk_seg_usuarios_roles
        UNIQUE (id_usuario, id_rol),

    CONSTRAINT fk_seg_usuarios_roles_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_seg_usuarios_roles_rol
        FOREIGN KEY (id_rol)
        REFERENCES seg_roles(id_rol)
        ON DELETE RESTRICT,

    CONSTRAINT fk_seg_usuarios_roles_asignado_por
        FOREIGN KEY (asignado_por)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_seg_usuarios_roles_fechas
        CHECK (
            fecha_revocacion IS NULL
            OR fecha_revocacion >= fecha_asignacion
        )
);
  
  -- tabla seg_roles_permisos
  CREATE TABLE IF NOT EXISTS seg_roles_permisos (
id_rol_permiso BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_rol INT NOT NULL,
    id_permiso INT NOT NULL,

    fecha_asignacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    asignado_por BIGINT,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT uk_seg_roles_permisos
        UNIQUE (id_rol, id_permiso),

    CONSTRAINT fk_seg_roles_permisos_rol
        FOREIGN KEY (id_rol)
        REFERENCES seg_roles(id_rol)
        ON DELETE RESTRICT,

    CONSTRAINT fk_seg_roles_permisos_permiso
        FOREIGN KEY (id_permiso)
        REFERENCES seg_permisos(id_permiso)
        ON DELETE RESTRICT,

    CONSTRAINT fk_seg_roles_permisos_asignado_por
        FOREIGN KEY (asignado_por)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT
);
  
  -- tabla seg_tokens_recuperación
  CREATE TABLE IF NOT EXISTS seg_tokens_recuperacion (
id_token BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_usuario BIGINT NOT NULL,

    token_hash CHAR(64) NOT NULL,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_expiracion TIMESTAMPTZ(6) NOT NULL,

    fecha_uso TIMESTAMPTZ(6),

    ip_solicitud VARCHAR(45),
    user_agent VARCHAR(500),

    CONSTRAINT uk_seg_tokens_recuperacion_hash
        UNIQUE (token_hash),

    CONSTRAINT fk_seg_tokens_recuperacion_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_seg_tokens_recuperacion_expiracion
        CHECK (fecha_expiracion > fecha_creacion),

    CONSTRAINT chk_seg_tokens_recuperacion_uso
        CHECK (
            fecha_uso IS NULL
            OR fecha_uso >= fecha_creacion
        )
);
  
  -- tabla seg_sesiones
  CREATE TABLE IF NOT EXISTS seg_sesiones (
id_sesion BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_usuario BIGINT NOT NULL,

    refresh_token_hash CHAR(64) NOT NULL,

    ip_origen VARCHAR(45),
    user_agent VARCHAR(500),

    fecha_inicio TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    ultima_actividad TIMESTAMPTZ(6),

    fecha_expiracion TIMESTAMPTZ(6) NOT NULL,

    fecha_revocacion TIMESTAMPTZ(6),

    motivo_revocacion VARCHAR(255),

    CONSTRAINT uk_seg_sesiones_refresh_token
        UNIQUE (refresh_token_hash),

    CONSTRAINT fk_seg_sesiones_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_seg_sesiones_expiracion
        CHECK (fecha_expiracion > fecha_inicio),

    CONSTRAINT chk_seg_sesiones_revocacion
        CHECK (
            fecha_revocacion IS NULL
            OR fecha_revocacion >= fecha_inicio
        )
);

 -- ---- 4. INMOBILIARIA ----------- 
-- TABLA inm_proyectos
CREATE TABLE IF NOT EXISTS inm_proyectos (
id_proyecto BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_estado_proyecto INT NOT NULL,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,

    direccion VARCHAR(255),
    ubicacion_referencia VARCHAR(255),

    distrito VARCHAR(100),
    provincia VARCHAR(100),
    departamento VARCHAR(100),
    pais VARCHAR(100) NOT NULL DEFAULT 'Perú',

    latitud DECIMAL(10,7),
    longitud DECIMAL(10,7),

    area_total_m2 DECIMAL(14,2),

    fecha_inicio DATE,
    fecha_fin_estimada DATE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_inm_proyectos_codigo
        UNIQUE (codigo),

    CONSTRAINT fk_inm_proyectos_estado
        FOREIGN KEY (id_estado_proyecto)
        REFERENCES cfg_estados_proyecto(id_estado_proyecto)
        ON DELETE RESTRICT,

    CONSTRAINT chk_inm_proyectos_area
        CHECK (area_total_m2 IS NULL OR area_total_m2 > 0),

    CONSTRAINT chk_inm_proyectos_latitud
        CHECK (latitud IS NULL OR latitud BETWEEN -90 AND 90),

    CONSTRAINT chk_inm_proyectos_longitud
        CHECK (longitud IS NULL OR longitud BETWEEN -180 AND 180)
);  
  
--  TABLA inm_etapas
CREATE TABLE IF NOT EXISTS inm_etapas (
id_etapa BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_proyecto BIGINT NOT NULL,
    id_estado_etapa INT NOT NULL,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,

    numero_orden INT NOT NULL DEFAULT 1,

    fecha_inicio DATE,
    fecha_fin_estimada DATE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_inm_etapas_proyecto_codigo
        UNIQUE (id_proyecto, codigo),
        
	CONSTRAINT uk_inm_etapas_etapa_proyecto
    UNIQUE (
        id_etapa,
        id_proyecto
    ),

    CONSTRAINT fk_inm_etapas_proyecto
        FOREIGN KEY (id_proyecto)
        REFERENCES inm_proyectos(id_proyecto)
        ON DELETE RESTRICT,

    CONSTRAINT fk_inm_etapas_estado
        FOREIGN KEY (id_estado_etapa)
        REFERENCES cfg_estados_etapa(id_estado_etapa)
        ON DELETE RESTRICT,

    CONSTRAINT chk_inm_etapas_fechas
        CHECK (
            fecha_fin_estimada IS NULL
            OR fecha_inicio IS NULL
            OR fecha_fin_estimada >= fecha_inicio
        )
);
  
-- TABLA inm_manzanas
CREATE TABLE IF NOT EXISTS inm_manzanas (
id_manzana BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_etapa BIGINT NOT NULL,
	id_proyecto BIGINT NOT NULL,
    id_estado_manzana INT NOT NULL,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(100),

    descripcion VARCHAR(255),

    numero_orden INT NOT NULL DEFAULT 1,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_inm_manzanas_etapa_codigo
        UNIQUE (id_etapa, codigo),
	
    CONSTRAINT uk_inm_manzanas_manzana_proyecto
        UNIQUE (id_manzana, id_proyecto),
	
    CONSTRAINT fk_inm_manzanas_etapa_proyecto
        FOREIGN KEY (id_etapa, id_proyecto)
        REFERENCES inm_etapas(id_etapa, id_proyecto)
        ON DELETE RESTRICT,

    CONSTRAINT fk_inm_manzanas_estado
        FOREIGN KEY (id_estado_manzana)
        REFERENCES cfg_estados_manzana(id_estado_manzana)
        ON DELETE RESTRICT
);
  
-- TABLA INM_ZONAS
CREATE TABLE IF NOT EXISTS inm_zonas (
id_zona BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_proyecto BIGINT NOT NULL,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),

    numero_orden INT NOT NULL DEFAULT 1,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_inm_zonas_proyecto_codigo
        UNIQUE (id_proyecto, codigo),
        
	CONSTRAINT uk_inm_zonas_zona_proyecto
    UNIQUE (
        id_zona,
        id_proyecto
    ),

    CONSTRAINT fk_inm_zonas_proyecto
        FOREIGN KEY (id_proyecto)
        REFERENCES inm_proyectos(id_proyecto)
        ON DELETE RESTRICT
);
  
  -- tabla inm_etapas_comerciales --
  CREATE TABLE IF NOT EXISTS inm_etapas_comerciales (
id_etapa_comercial BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_proyecto BIGINT NOT NULL,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),

    numero_orden INT NOT NULL DEFAULT 1,

    fecha_inicio DATE,
    fecha_fin DATE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_inm_etapas_comerciales_proyecto_codigo
        UNIQUE (id_proyecto, codigo),
        
	CONSTRAINT uk_inm_etapas_comerciales_etapa_proyecto
    UNIQUE (
        id_etapa_comercial,
        id_proyecto
    ),

    CONSTRAINT fk_inm_etapas_comerciales_proyecto
        FOREIGN KEY (id_proyecto)
        REFERENCES inm_proyectos(id_proyecto)
        ON DELETE RESTRICT,

    CONSTRAINT chk_inm_etapas_comerciales_fechas
        CHECK (
            fecha_fin IS NULL
            OR fecha_inicio IS NULL
            OR fecha_fin >= fecha_inicio
        )
);
  
  -- tabla inm_tarifas_zona_etapa --
  CREATE TABLE IF NOT EXISTS inm_tarifas_zona_etapa (
id_tarifa BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

	id_proyecto BIGINT NOT NULL,
    id_zona BIGINT NOT NULL,
    id_etapa_comercial BIGINT NOT NULL,
    id_moneda INT NOT NULL,
    id_tipo_tarifa INT NOT NULL,

    valor DECIMAL(14,4) NOT NULL,

    fecha_desde TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_hasta TIMESTAMPTZ(6),

    observaciones VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    clave_tarifa_vigente VARCHAR(200)
    GENERATED ALWAYS AS (
        CASE
            WHEN activo = TRUE
                 AND fecha_hasta IS NULL
            THEN ((id_proyecto)::text || ('-')::text || (id_zona)::text || ('-')::text || (id_etapa_comercial)::text || ('-')::text || (id_moneda)::text || ('-')::text || (id_tipo_tarifa)::text)
            ELSE NULL
        END
    ) STORED,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),
        
	CONSTRAINT uk_inm_tarifas_zona_etapa_vigente
    UNIQUE (
        clave_tarifa_vigente
    ),

    CONSTRAINT fk_inm_tarifas_proyecto
    FOREIGN KEY (
        id_proyecto
    )
    REFERENCES inm_proyectos(
        id_proyecto
    )
    ON DELETE RESTRICT,

   CONSTRAINT fk_inm_tarifas_zona_proyecto
    FOREIGN KEY (
        id_zona,
        id_proyecto
    )
    REFERENCES inm_zonas(
        id_zona,
        id_proyecto
    )
    ON DELETE RESTRICT,

   CONSTRAINT fk_inm_tarifas_etapa_proyecto
    FOREIGN KEY (
        id_etapa_comercial,
        id_proyecto
    )
    REFERENCES inm_etapas_comerciales(
        id_etapa_comercial,
        id_proyecto
    )
    ON DELETE RESTRICT,

    CONSTRAINT fk_inm_tarifas_moneda
        FOREIGN KEY (id_moneda)
        REFERENCES cfg_monedas(id_moneda)
        ON DELETE RESTRICT,

    CONSTRAINT fk_inm_tarifas_tipo
        FOREIGN KEY (id_tipo_tarifa)
        REFERENCES cfg_tipos_tarifa(id_tipo_tarifa)
        ON DELETE RESTRICT,

    CONSTRAINT chk_inm_tarifas_valor
        CHECK (valor > 0),

    CONSTRAINT chk_inm_tarifas_fechas
        CHECK (
            fecha_hasta IS NULL
            OR fecha_hasta >= fecha_desde
        )
);
  
  -- TABLA INM_AJUSTES_TIPO_LOTE
  CREATE TABLE IF NOT EXISTS inm_ajustes_tipo_lote (
id_ajuste_tipo_lote BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_proyecto BIGINT NOT NULL,
    id_tipo_lote INT NOT NULL,
    id_tipo_ajuste_precio INT NOT NULL,

    id_moneda INT,

    valor DECIMAL(14,4) NOT NULL DEFAULT 0,

    fecha_desde TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_hasta TIMESTAMPTZ(6),

    observaciones VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    
    clave_ajuste_vigente VARCHAR(160)
    GENERATED ALWAYS AS (
        CASE
            WHEN activo = TRUE
                 AND fecha_hasta IS NULL
            THEN ((id_proyecto)::text || ('-')::text || (id_tipo_lote)::text || ('-')::text || (id_tipo_ajuste_precio)::text || ('-')::text || (COALESCE(id_moneda)::text || (0)::text)
            )
            ELSE NULL
        END
    ) STORED,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),
        
	CONSTRAINT uk_inm_ajustes_tipo_lote_vigente
        UNIQUE (clave_ajuste_vigente),

    CONSTRAINT fk_inm_ajustes_tipo_proyecto
        FOREIGN KEY (id_proyecto)
        REFERENCES inm_proyectos(id_proyecto)
        ON DELETE RESTRICT,

    CONSTRAINT fk_inm_ajustes_tipo_lote
        FOREIGN KEY (id_tipo_lote)
        REFERENCES cfg_tipos_lote(id_tipo_lote)
        ON DELETE RESTRICT,

    CONSTRAINT fk_inm_ajustes_tipo_precio
        FOREIGN KEY (id_tipo_ajuste_precio)
        REFERENCES cfg_tipos_ajuste_precio(id_tipo_ajuste_precio)
        ON DELETE RESTRICT,

    CONSTRAINT fk_inm_ajustes_tipo_moneda
        FOREIGN KEY (id_moneda)
        REFERENCES cfg_monedas(id_moneda)
        ON DELETE RESTRICT,

    CONSTRAINT chk_inm_ajustes_tipo_valor
        CHECK (valor >= 0),

    CONSTRAINT chk_inm_ajustes_tipo_fechas
        CHECK (
            fecha_hasta IS NULL
            OR fecha_hasta >= fecha_desde
        )
);
  
--  TABLA inm_lotes
CREATE TABLE IF NOT EXISTS inm_lotes (
id_lote BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_manzana BIGINT NOT NULL,
    id_zona BIGINT NULL,
    id_proyecto BIGINT NOT NULL,
    id_tipo_lote INT NULL,
    id_estado_lote INT NOT NULL,

    codigo VARCHAR(40) NOT NULL,
    numero VARCHAR(20) NOT NULL,

    area_m2 DECIMAL(12,2) NOT NULL,

    frente_m DECIMAL(10,2),
    fondo_m DECIMAL(10,2),

    lateral_derecho_m DECIMAL(10,2),
    lateral_izquierdo_m DECIMAL(10,2),

    observaciones TEXT,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_inm_lotes_codigo
        UNIQUE (codigo),

    CONSTRAINT uk_inm_lotes_manzana_numero
        UNIQUE (id_manzana, numero),
        
	CONSTRAINT uk_inm_lotes_lote_proyecto
        UNIQUE (id_lote, id_proyecto),

	CONSTRAINT fk_inm_lotes_manzana_proyecto
        FOREIGN KEY (id_manzana, id_proyecto)
        REFERENCES inm_manzanas(id_manzana, id_proyecto)
        ON DELETE RESTRICT,

   CONSTRAINT fk_inm_lotes_zona_proyecto
        FOREIGN KEY (id_zona, id_proyecto)
        REFERENCES inm_zonas(id_zona, id_proyecto)
        ON DELETE RESTRICT,
    
	CONSTRAINT fk_inm_lotes_tipo
        FOREIGN KEY (id_tipo_lote)
        REFERENCES cfg_tipos_lote (id_tipo_lote)
        ON DELETE RESTRICT,

    CONSTRAINT fk_inm_lotes_estado
        FOREIGN KEY (id_estado_lote)
        REFERENCES cfg_estados_lote(id_estado_lote)
        ON DELETE RESTRICT,

    CONSTRAINT chk_inm_lotes_area
        CHECK (area_m2 > 0),

    CONSTRAINT chk_inm_lotes_frente
        CHECK (frente_m IS NULL OR frente_m > 0),

    CONSTRAINT chk_inm_lotes_fondo
        CHECK (fondo_m IS NULL OR fondo_m > 0),

    CONSTRAINT chk_inm_lotes_lateral_derecho
        CHECK (
            lateral_derecho_m IS NULL
            OR lateral_derecho_m > 0
        ),

    CONSTRAINT chk_inm_lotes_lateral_izquierdo
        CHECK (
            lateral_izquierdo_m IS NULL
            OR lateral_izquierdo_m > 0
        )
);
  
  -- TABLA inm_lotes_precios
CREATE TABLE IF NOT EXISTS inm_lotes_precios (
id_lote_precio BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_lote BIGINT NOT NULL,
    id_moneda INT NOT NULL,

    id_tarifa BIGINT NULL,
    id_ajuste_tipo_lote BIGINT NULL,

    area_m2_aplicada DECIMAL(12,2) NULL,
    valor_tarifa_aplicado DECIMAL(14,4) NULL,

    precio_base DECIMAL(14,2) NULL,

    valor_ajuste_aplicado DECIMAL(14,4) NULL,
    monto_ajuste DECIMAL(14,2) NOT NULL DEFAULT 0,

    precio DECIMAL(14,2) NOT NULL,

    fecha_desde TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_hasta TIMESTAMPTZ(6),

    observaciones VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    
    clave_precio_vigente VARCHAR(100)
    GENERATED ALWAYS AS (
        CASE
            WHEN activo = TRUE
                 AND fecha_hasta IS NULL
            THEN ((id_lote)::text || ('-')::text || (id_moneda)::text)
            ELSE NULL
        END
    ) STORED,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),
	
    CONSTRAINT uk_inm_lotes_precios_vigente
    UNIQUE (
        clave_precio_vigente
    ),

    CONSTRAINT fk_inm_lotes_precios_lote
        FOREIGN KEY (id_lote)
        REFERENCES inm_lotes(id_lote)
        ON DELETE RESTRICT,

    CONSTRAINT fk_inm_lotes_precios_moneda
        FOREIGN KEY (id_moneda)
        REFERENCES cfg_monedas(id_moneda)
        ON DELETE RESTRICT,

    CONSTRAINT fk_inm_lotes_precios_tarifa
        FOREIGN KEY (id_tarifa)
        REFERENCES inm_tarifas_zona_etapa(id_tarifa)
        ON DELETE RESTRICT,

    CONSTRAINT fk_inm_lotes_precios_ajuste_tipo
        FOREIGN KEY (id_ajuste_tipo_lote)
        REFERENCES inm_ajustes_tipo_lote(id_ajuste_tipo_lote)
        ON DELETE RESTRICT,

    CONSTRAINT chk_inm_lotes_precios_area
        CHECK (
            area_m2_aplicada IS NULL
            OR area_m2_aplicada > 0
        ),

    CONSTRAINT chk_inm_lotes_precios_valor_tarifa
        CHECK (
            valor_tarifa_aplicado IS NULL
            OR valor_tarifa_aplicado > 0
        ),

    CONSTRAINT chk_inm_lotes_precios_base
        CHECK (
            precio_base IS NULL
            OR precio_base >= 0
        ),

    CONSTRAINT chk_inm_lotes_precios_valor_ajuste
        CHECK (
            valor_ajuste_aplicado IS NULL
            OR valor_ajuste_aplicado >= 0
        ),

    CONSTRAINT chk_inm_lotes_precios_monto_ajuste
        CHECK (
            monto_ajuste >= 0
        ),

    CONSTRAINT chk_inm_lotes_precios_precio
        CHECK (
            precio >= 0
        ),

    CONSTRAINT chk_inm_lotes_precios_fechas
        CHECK (
            fecha_hasta IS NULL
            OR fecha_hasta >= fecha_desde
        )
);
  
  -- imn_lotes_historial_estado
  CREATE TABLE IF NOT EXISTS inm_lotes_historial_estado (
id_historial BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_lote BIGINT NOT NULL,

    id_estado_anterior INT,
    id_estado_nuevo INT NOT NULL,

    motivo VARCHAR(255),

    fecha_cambio TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    id_usuario BIGINT,

    CONSTRAINT fk_inm_historial_lote
        FOREIGN KEY (id_lote)
        REFERENCES inm_lotes(id_lote)
        ON DELETE RESTRICT,

    CONSTRAINT fk_inm_historial_estado_anterior
        FOREIGN KEY (id_estado_anterior)
        REFERENCES cfg_estados_lote(id_estado_lote)
        ON DELETE RESTRICT,

    CONSTRAINT fk_inm_historial_estado_nuevo
        FOREIGN KEY (id_estado_nuevo)
        REFERENCES cfg_estados_lote(id_estado_lote)
        ON DELETE RESTRICT,
        
	CONSTRAINT fk_inm_historial_usuario
	   FOREIGN KEY (id_usuario)
       REFERENCES seg_usuarios(id_usuario)
       ON DELETE RESTRICT
);
  
  -- TABLA INM_PLANOS_INTERACTIVOS --
 CREATE TABLE IF NOT EXISTS inm_planos_interactivos (
id_plano_interactivo BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_proyecto BIGINT NOT NULL,
    id_etapa BIGINT NULL,

    codigo VARCHAR(40) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion VARCHAR(500) NULL,

    numero_version INT NOT NULL DEFAULT 1,

    id_etapa_version BIGINT
        GENERATED ALWAYS AS (
            COALESCE(id_etapa, 0)
        ) STORED,

    clave_archivo VARCHAR(500) NOT NULL,
    nombre_archivo_original VARCHAR(255) NULL,
    tipo_mime VARCHAR(120) NULL,
    hash_archivo VARCHAR(128) NULL,

    ancho_referencia DECIMAL(12,4) NOT NULL,
    alto_referencia DECIMAL(12,4) NOT NULL,

    vigente BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_desde TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_hasta TIMESTAMPTZ(6) NULL,

    observaciones VARCHAR(500) NULL,

    id_usuario_registro BIGINT NULL,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    id_proyecto_vigente BIGINT
        GENERATED ALWAYS AS (
            CASE
                WHEN vigente = TRUE
                     AND id_etapa IS NULL
                THEN id_proyecto
                ELSE NULL
            END
        ) STORED,

    clave_etapa_vigente VARCHAR(100)
        GENERATED ALWAYS AS (
            CASE
                WHEN vigente = TRUE
                     AND id_etapa IS NOT NULL
                THEN ((id_proyecto)::text || ('-')::text || (id_etapa)::text)
                ELSE NULL
            END
        ) STORED,

    CONSTRAINT uk_inm_planos_interactivos_codigo
        UNIQUE (
            codigo
        ),
        
	CONSTRAINT uk_inm_planos_interactivos_plano_proyecto
        UNIQUE (id_plano_interactivo, id_proyecto),

    CONSTRAINT uk_inm_planos_interactivos_version
        UNIQUE (id_proyecto, id_etapa_version, numero_version),

    CONSTRAINT uk_inm_planos_interactivos_proyecto_vigente
        UNIQUE (id_proyecto_vigente),

    CONSTRAINT uk_inm_planos_interactivos_etapa_vigente
        UNIQUE (clave_etapa_vigente),

    CONSTRAINT fk_inm_planos_interactivos_proyecto
        FOREIGN KEY (id_proyecto)
        REFERENCES inm_proyectos(id_proyecto)
        ON DELETE RESTRICT,

    CONSTRAINT fk_inm_planos_interactivos_etapa_proyecto
        FOREIGN KEY (id_etapa, id_proyecto)
        REFERENCES inm_etapas(id_etapa, id_proyecto)
        ON DELETE RESTRICT,

    CONSTRAINT fk_inm_planos_interactivos_usuario
        FOREIGN KEY (id_usuario_registro)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_inm_planos_interactivos_version
        CHECK (numero_version > 0),

    CONSTRAINT chk_inm_planos_interactivos_archivo
        CHECK (CHAR_LENGTH(TRIM(clave_archivo)) > 0),

    CONSTRAINT chk_inm_planos_interactivos_dimensiones
        CHECK (ancho_referencia > 0 AND alto_referencia > 0),

    CONSTRAINT chk_inm_planos_interactivos_fechas
        CHECK (fecha_hasta IS NULL
              OR fecha_hasta >= fecha_desde),
			
	CONSTRAINT chk_inm_planos_interactivos_vigencia
        CHECK ( vigente = FALSE
            OR fecha_hasta IS NULL)
);
  
  -- TABLA INM_LOTES_GEOMETRIAS -- 
  CREATE TABLE IF NOT EXISTS inm_lotes_geometrias (
id_lote_geometria BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_proyecto BIGINT NOT NULL,
    id_plano_interactivo BIGINT NOT NULL,
    id_lote BIGINT NOT NULL,

    puntos JSONB NOT NULL,

    etiqueta_x DECIMAL(12,4) NULL,
    etiqueta_y DECIMAL(12,4) NULL,

    rotacion_etiqueta DECIMAL(8,3) NOT NULL DEFAULT 0,

    orden_capa INT NOT NULL DEFAULT 0,

    visible BOOLEAN NOT NULL DEFAULT TRUE,
    interactivo BOOLEAN NOT NULL DEFAULT TRUE,

    observaciones VARCHAR(500) NULL,

    id_usuario_registro BIGINT NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_inm_lotes_geometrias_plano_lote
        UNIQUE (id_plano_interactivo, id_lote),

    CONSTRAINT fk_inm_lotes_geometrias_plano_proyecto
        FOREIGN KEY (id_plano_interactivo, id_proyecto)
		REFERENCES inm_planos_interactivos
                (id_plano_interactivo, id_proyecto)
        ON DELETE RESTRICT,

    CONSTRAINT fk_inm_lotes_geometrias_lote_proyecto
        FOREIGN KEY (id_lote, id_proyecto)
        REFERENCES inm_lotes
               (id_lote,id_proyecto)
        ON DELETE RESTRICT,

    CONSTRAINT fk_inm_lotes_geometrias_usuario
        FOREIGN KEY (id_usuario_registro)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_inm_lotes_geometrias_puntos
        CHECK (
            jsonb_typeof(puntos) = 'array'
            AND jsonb_array_length(puntos) >= 3
        ),

    CONSTRAINT chk_inm_lotes_geometrias_etiqueta
        CHECK (
            (
                etiqueta_x IS NULL
                AND etiqueta_y IS NULL
            )
            OR
            (
                etiqueta_x IS NOT NULL
                AND etiqueta_y IS NOT NULL
            )
        )
);
  

-- ------- 5. CRM -----------------------------------
  -- TABLA CRM_PROSPECTOS
  CREATE TABLE IF NOT EXISTS crm_prospectos (
id_prospecto BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_persona BIGINT NOT NULL,
    id_estado_prospecto INT NOT NULL,
    id_origen_prospecto INT NOT NULL,

    codigo VARCHAR(30) NOT NULL,

    fecha_registro TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_conversion TIMESTAMPTZ(6),

    observaciones TEXT,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_crm_prospectos_codigo
        UNIQUE (codigo),

    CONSTRAINT uk_crm_prospectos_persona
        UNIQUE (id_persona),

    CONSTRAINT fk_crm_prospectos_persona
        FOREIGN KEY (id_persona)
        REFERENCES core_personas(id_persona)
        ON DELETE RESTRICT,

    CONSTRAINT fk_crm_prospectos_estado
        FOREIGN KEY (id_estado_prospecto)
        REFERENCES cfg_estados_prospecto(id_estado_prospecto)
        ON DELETE RESTRICT,

    CONSTRAINT fk_crm_prospectos_origen
        FOREIGN KEY (id_origen_prospecto)
        REFERENCES cfg_origenes_prospecto(id_origen_prospecto)
        ON DELETE RESTRICT,

    CONSTRAINT chk_crm_prospectos_conversion
        CHECK (
            fecha_conversion IS NULL
            OR fecha_conversion >= fecha_registro
        )
);
  
  -- TABLA CRM_PROSECTOS_INTERESES 
  CREATE TABLE IF NOT EXISTS crm_prospectos_intereses (
id_prospecto_interes BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_prospecto BIGINT NOT NULL,
    id_proyecto BIGINT NOT NULL,
    id_moneda INT NULL,

    area_minima_m2 DECIMAL(12,2) NULL,
    area_maxima_m2 DECIMAL(12,2) NULL,

    presupuesto_minimo DECIMAL(14,2) NULL,
    presupuesto_maximo DECIMAL(14,2) NULL,

    requiere_financiamiento BOOLEAN NULL,

    comentario TEXT NULL,

    fecha_interes TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT fk_crm_intereses_prospecto
        FOREIGN KEY (id_prospecto)
        REFERENCES crm_prospectos(id_prospecto)
        ON DELETE RESTRICT,

    CONSTRAINT fk_crm_intereses_proyecto
        FOREIGN KEY (id_proyecto)
        REFERENCES inm_proyectos(id_proyecto)
        ON DELETE RESTRICT,

    CONSTRAINT fk_crm_intereses_moneda
        FOREIGN KEY (id_moneda)
        REFERENCES cfg_monedas(id_moneda)
        ON DELETE RESTRICT,

    CONSTRAINT chk_crm_intereses_area_minima
        CHECK (
            area_minima_m2 IS NULL
            OR area_minima_m2 > 0
        ),

    CONSTRAINT chk_crm_intereses_area_maxima
        CHECK (
            area_maxima_m2 IS NULL
            OR area_maxima_m2 > 0
        ),

    CONSTRAINT chk_crm_intereses_areas
        CHECK (
            area_minima_m2 IS NULL
            OR area_maxima_m2 IS NULL
            OR area_maxima_m2 >= area_minima_m2
        ),

    CONSTRAINT chk_crm_intereses_presupuesto_minimo
        CHECK (
            presupuesto_minimo IS NULL
            OR presupuesto_minimo >= 0
        ),

    CONSTRAINT chk_crm_intereses_presupuesto_maximo
        CHECK (
            presupuesto_maximo IS NULL
            OR presupuesto_maximo >= 0
        ),

    CONSTRAINT chk_crm_intereses_presupuesto
        CHECK (
            presupuesto_minimo IS NULL
            OR presupuesto_maximo IS NULL
            OR presupuesto_maximo >= presupuesto_minimo
        ),

    CONSTRAINT chk_crm_intereses_moneda_presupuesto
        CHECK (
            (
                presupuesto_minimo IS NULL
                AND presupuesto_maximo IS NULL
                AND id_moneda IS NULL
            )
            OR
            (
                (
                    presupuesto_minimo IS NOT NULL
                    OR presupuesto_maximo IS NOT NULL
                )
                AND id_moneda IS NOT NULL
            )
        )
);
  
  -- TABLA CRM_SEGUIMIENTO
  CREATE TABLE IF NOT EXISTS crm_seguimientos (
id_seguimiento BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_prospecto BIGINT NOT NULL,
    id_tipo_seguimiento INT NOT NULL,

    fecha_seguimiento TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    asunto VARCHAR(150),

    detalle TEXT,

    resultado VARCHAR(255),

    requiere_seguimiento BOOLEAN NOT NULL DEFAULT FALSE,

    fecha_proximo_seguimiento TIMESTAMPTZ(6),

    id_usuario_registro BIGINT,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT fk_crm_seguimientos_prospecto
        FOREIGN KEY (id_prospecto)
        REFERENCES crm_prospectos(id_prospecto)
        ON DELETE RESTRICT,

    CONSTRAINT fk_crm_seguimientos_tipo
        FOREIGN KEY (id_tipo_seguimiento)
        REFERENCES cfg_tipos_seguimiento(id_tipo_seguimiento)
        ON DELETE RESTRICT,
        
	CONSTRAINT fk_crm_seguimientos_usuario
        FOREIGN KEY (id_usuario_registro)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_crm_seguimientos_proximo
        CHECK (
            fecha_proximo_seguimiento IS NULL
            OR fecha_proximo_seguimiento >= fecha_seguimiento
        )
);
  
  -- TABLA CRM_CLIENTES
  CREATE TABLE IF NOT EXISTS crm_clientes (
id_cliente BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_persona BIGINT NOT NULL,

    codigo VARCHAR(30) NOT NULL,

    fecha_alta TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    observaciones TEXT,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_crm_clientes_codigo
        UNIQUE (codigo),

    CONSTRAINT uk_crm_clientes_persona
        UNIQUE (id_persona),

    CONSTRAINT fk_crm_clientes_persona
        FOREIGN KEY (id_persona)
        REFERENCES core_personas(id_persona)
        ON DELETE RESTRICT
);
  

  
  -- TABLA CRM_CONSENTIMIENTOS 
  CREATE TABLE IF NOT EXISTS crm_consentimientos (
id_consentimiento BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_persona BIGINT NOT NULL,
    id_tipo_consentimiento INT NOT NULL,

    aceptado BOOLEAN NOT NULL,

    version_texto VARCHAR(30),

    origen VARCHAR(50),

    fecha_consentimiento TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_revocacion TIMESTAMPTZ(6),

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT fk_crm_consentimientos_persona
        FOREIGN KEY (id_persona)
        REFERENCES core_personas(id_persona)
        ON DELETE RESTRICT,

    CONSTRAINT fk_crm_consentimientos_tipo
        FOREIGN KEY (id_tipo_consentimiento)
        REFERENCES cfg_tipos_consentimiento(id_tipo_consentimiento)
        ON DELETE RESTRICT,

    CONSTRAINT chk_crm_consentimientos_revocacion
        CHECK (
            fecha_revocacion IS NULL
            OR fecha_revocacion >= fecha_consentimiento
        )
);
  
-- ---- 6. VENTAS ------------
  -- TABLA VEN_RESERVAS 
  CREATE TABLE IF NOT EXISTS ven_reservas (
id_reserva BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_lote BIGINT NOT NULL,
    id_persona BIGINT NOT NULL,

    id_estado_reserva INT NOT NULL,
    id_moneda INT NOT NULL,

    codigo VARCHAR(30) NOT NULL,

    fecha_reserva TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_vencimiento TIMESTAMPTZ(6) NOT NULL,

    monto_reserva DECIMAL(14,2) NOT NULL DEFAULT 0,

    observaciones TEXT,

    id_usuario_registro BIGINT NULL,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_ven_reservas_codigo
        UNIQUE (codigo),

    CONSTRAINT uk_ven_reservas_reserva_lote
        UNIQUE (id_reserva, id_lote),
        
	CONSTRAINT uk_ven_reservas_reserva_moneda
        UNIQUE (id_reserva, id_moneda),

    CONSTRAINT fk_ven_reservas_lote
        FOREIGN KEY (id_lote)
        REFERENCES inm_lotes(id_lote)
        ON DELETE RESTRICT,

    CONSTRAINT fk_ven_reservas_persona
        FOREIGN KEY (id_persona)
        REFERENCES core_personas(id_persona)
        ON DELETE RESTRICT,

    CONSTRAINT fk_ven_reservas_estado
        FOREIGN KEY (id_estado_reserva)
        REFERENCES cfg_estados_reserva(id_estado_reserva)
        ON DELETE RESTRICT,

    CONSTRAINT fk_ven_reservas_moneda
        FOREIGN KEY (id_moneda)
        REFERENCES cfg_monedas(id_moneda)
        ON DELETE RESTRICT,

    CONSTRAINT fk_ven_reservas_usuario
        FOREIGN KEY (id_usuario_registro)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_ven_reservas_monto
        CHECK (
            monto_reserva >= 0
        ),

    CONSTRAINT chk_ven_reservas_fechas
        CHECK (
            fecha_vencimiento > fecha_reserva
        )
);
  
  -- TABLA VEN_VENTAS 
 CREATE TABLE IF NOT EXISTS ven_ventas (
id_venta BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_lote BIGINT NOT NULL,
    id_reserva BIGINT NULL,

    id_estado_venta INT NOT NULL,
    id_modalidad_venta INT NOT NULL,
    id_moneda INT NOT NULL,

    codigo VARCHAR(30) NOT NULL,

    fecha_venta TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    precio_lista DECIMAL(14,2) NULL,
    descuento DECIMAL(14,2) NOT NULL DEFAULT 0,
    precio_venta DECIMAL(14,2) NOT NULL,

    observaciones TEXT,

    id_usuario_registro BIGINT NULL,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_ven_ventas_codigo
        UNIQUE (codigo),
        
    CONSTRAINT uk_ven_ventas_reserva
        UNIQUE (id_reserva),
        
	CONSTRAINT uk_ven_ventas_venta_moneda
        UNIQUE (id_venta, id_moneda),

    CONSTRAINT fk_ven_ventas_lote
        FOREIGN KEY (id_lote)
        REFERENCES inm_lotes(id_lote)
        ON DELETE RESTRICT,

    CONSTRAINT fk_ven_ventas_reserva_lote
        FOREIGN KEY (id_reserva, id_lote)
        REFERENCES ven_reservas(id_reserva, id_lote)
        ON DELETE RESTRICT,

    CONSTRAINT fk_ven_ventas_estado
        FOREIGN KEY (id_estado_venta)
        REFERENCES cfg_estados_venta(id_estado_venta)
        ON DELETE RESTRICT,

    CONSTRAINT fk_ven_ventas_modalidad
        FOREIGN KEY (id_modalidad_venta)
        REFERENCES cfg_modalidades_venta(id_modalidad_venta)
        ON DELETE RESTRICT,

    CONSTRAINT fk_ven_ventas_moneda
        FOREIGN KEY (id_moneda)
        REFERENCES cfg_monedas(id_moneda)
        ON DELETE RESTRICT,

    CONSTRAINT fk_ven_ventas_usuario
        FOREIGN KEY (id_usuario_registro)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_ven_ventas_precio_lista
        CHECK (
            precio_lista IS NULL
            OR precio_lista >= 0
        ),

    CONSTRAINT chk_ven_ventas_descuento
        CHECK (
            descuento >= 0
        ),

    CONSTRAINT chk_ven_ventas_descuento_precio_lista
        CHECK (
            precio_lista IS NULL
            OR descuento <= precio_lista
        ),

    CONSTRAINT chk_ven_ventas_precio
        CHECK (
            precio_venta > 0
        )
);
  
  -- TABLA VEN_VENTAS_CLIENTES 
  CREATE TABLE IF NOT EXISTS ven_ventas_clientes (
id_venta_cliente BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_venta BIGINT NOT NULL,
    id_cliente BIGINT NOT NULL,

    titular BOOLEAN NOT NULL DEFAULT FALSE,

    porcentaje_participacion DECIMAL(5,2) NOT NULL,
    
    id_venta_titular BIGINT
    GENERATED ALWAYS AS (
        CASE
            WHEN titular = TRUE
            THEN id_venta
            ELSE NULL
        END
    ) STORED,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_ven_ventas_clientes
        UNIQUE (id_venta, id_cliente),
        
	CONSTRAINT uk_ven_ventas_clientes_titular
		UNIQUE (id_venta_titular),

    CONSTRAINT fk_ven_ventas_clientes_venta
        FOREIGN KEY (id_venta)
        REFERENCES ven_ventas(id_venta)
        ON DELETE RESTRICT,

    CONSTRAINT fk_ven_ventas_clientes_cliente
        FOREIGN KEY (id_cliente)
        REFERENCES crm_clientes(id_cliente)
        ON DELETE RESTRICT,

    CONSTRAINT chk_ven_ventas_clientes_participacion
    CHECK (
        porcentaje_participacion > 0
        AND porcentaje_participacion <= 100
    )
);
  
  -- TABLA VEN_CONTRATOS 
  CREATE TABLE IF NOT EXISTS ven_contratos (
id_contrato BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_venta BIGINT NOT NULL,
    id_tipo_contrato INT NOT NULL,
    id_estado_contrato INT NOT NULL,

    codigo VARCHAR(40) NOT NULL,
    numero_contrato VARCHAR(50),

    fecha_emision DATE,
    fecha_firma DATE,

    fecha_inicio_vigencia DATE,
    fecha_fin_vigencia DATE,

    observaciones TEXT,

    id_usuario_registro BIGINT,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_ven_contratos_codigo
        UNIQUE (codigo),

    CONSTRAINT uk_ven_contratos_numero
        UNIQUE (numero_contrato),

    CONSTRAINT fk_ven_contratos_venta
        FOREIGN KEY (id_venta)
        REFERENCES ven_ventas(id_venta)
        ON DELETE RESTRICT,
        
	CONSTRAINT fk_ven_contratos_tipo
       FOREIGN KEY (id_tipo_contrato)
       REFERENCES cfg_tipos_contrato(id_tipo_contrato)
       ON DELETE RESTRICT,

    CONSTRAINT fk_ven_contratos_estado
        FOREIGN KEY (id_estado_contrato)
        REFERENCES cfg_estados_contrato(id_estado_contrato)
        ON DELETE RESTRICT,
        
	CONSTRAINT fk_ven_contratos_usuario
        FOREIGN KEY (id_usuario_registro)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_ven_contratos_vigencia
        CHECK (
            fecha_fin_vigencia IS NULL
            OR fecha_inicio_vigencia IS NULL
            OR fecha_fin_vigencia >= fecha_inicio_vigencia
        )
);
  
  -- TABLA VEN_CONTRATOS_ARCHIVOS --
  CREATE TABLE IF NOT EXISTS ven_contratos_archivos (
id_contrato_archivo BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_contrato BIGINT NOT NULL,

    codigo VARCHAR(50) NOT NULL,

    numero_version INT NOT NULL DEFAULT 1,

    nombre_documento VARCHAR(180) NOT NULL,

    nombre_archivo_original VARCHAR(255) NOT NULL,
    clave_archivo VARCHAR(500) NOT NULL,

    tipo_mime VARCHAR(120) NULL,
    tamano_bytes BIGINT NULL,
    hash_archivo VARCHAR(128) NULL,

    vigente BOOLEAN NOT NULL DEFAULT TRUE,
    visible_cliente BOOLEAN NOT NULL DEFAULT FALSE,

    fecha_documento TIMESTAMPTZ(6) NULL,

    fecha_publicacion_cliente TIMESTAMPTZ(6) NULL,
    id_usuario_publicacion BIGINT NULL,

    observaciones VARCHAR(500) NULL,

    id_usuario_carga BIGINT NULL,

    fecha_carga TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    id_contrato_vigente BIGINT
        GENERATED ALWAYS AS (
            CASE
                WHEN vigente = TRUE
                THEN id_contrato
                ELSE NULL
            END
        ) STORED,

    CONSTRAINT uk_ven_contratos_archivos_codigo
        UNIQUE (codigo),

    CONSTRAINT uk_ven_contratos_archivos_version
        UNIQUE (
            id_contrato,
            numero_version
        ),

    CONSTRAINT uk_ven_contratos_archivos_vigente
        UNIQUE (
            id_contrato_vigente
        ),

    CONSTRAINT fk_ven_contratos_archivos_contrato
        FOREIGN KEY (id_contrato)
        REFERENCES ven_contratos(id_contrato)
        ON DELETE RESTRICT,

    CONSTRAINT fk_ven_contratos_archivos_usuario_carga
        FOREIGN KEY (id_usuario_carga)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_ven_contratos_archivos_usuario_publicacion
        FOREIGN KEY (id_usuario_publicacion)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_ven_contratos_archivos_version
        CHECK (
            numero_version > 0
        ),

    CONSTRAINT chk_ven_contratos_archivos_nombre
        CHECK (
            CHAR_LENGTH(TRIM(nombre_documento)) > 0
        ),

    CONSTRAINT chk_ven_contratos_archivos_clave
        CHECK (
            CHAR_LENGTH(TRIM(clave_archivo)) > 0
        ),

    CONSTRAINT chk_ven_contratos_archivos_tamano
        CHECK (
            tamano_bytes IS NULL
            OR tamano_bytes > 0
        ),

    CONSTRAINT chk_ven_contratos_archivos_publicacion
        CHECK (
            (
                fecha_publicacion_cliente IS NULL
                AND id_usuario_publicacion IS NULL
            )
            OR
            (
                fecha_publicacion_cliente IS NOT NULL
                AND id_usuario_publicacion IS NOT NULL
            )
        ),

    CONSTRAINT chk_ven_contratos_archivos_visible
        CHECK (
            visible_cliente = FALSE
            OR fecha_publicacion_cliente IS NOT NULL
        ),

    CONSTRAINT chk_ven_contratos_archivos_fecha_publicacion
        CHECK (
            fecha_publicacion_cliente IS NULL
            OR fecha_publicacion_cliente >= fecha_carga
        )
);
  
  -- 7. PAGOS Y FINANCIAMIENTO --
  -- TABLA PAG_PLANES_PAGO
CREATE TABLE IF NOT EXISTS pag_planes_pago (
id_plan_pago BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_venta BIGINT NOT NULL,
    id_estado_plan_pago INT NOT NULL,
    id_moneda INT NOT NULL,

    codigo VARCHAR(40) NOT NULL,

    numero_version INT NOT NULL DEFAULT 1,

    monto_venta DECIMAL(14,2) NOT NULL,
    monto_inicial DECIMAL(14,2) NOT NULL DEFAULT 0,
    capital_financiado DECIMAL(14,2) NOT NULL,

    tasa_interes_pct DECIMAL(9,6) NULL,

    monto_interes_total DECIMAL(14,2) NULL,
    monto_total_financiado DECIMAL(14,2) NULL,

    numero_cuotas INT NOT NULL,

    fecha_inicio DATE NOT NULL,
    fecha_primera_cuota DATE NOT NULL,

    descripcion_condiciones VARCHAR(500),

    es_vigente BOOLEAN NOT NULL DEFAULT TRUE,

    id_venta_vigente BIGINT
        GENERATED ALWAYS AS (
            CASE
                WHEN es_vigente = TRUE THEN id_venta
                ELSE NULL
            END
        ) STORED,

    fecha_cierre TIMESTAMPTZ(6) NULL,
    motivo_cierre VARCHAR(255),

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_pag_planes_pago_codigo
        UNIQUE (codigo),

    CONSTRAINT uk_pag_planes_pago_venta_version
        UNIQUE (id_venta, numero_version),

    CONSTRAINT uk_pag_planes_pago_plan_venta
        UNIQUE (id_plan_pago, id_venta, id_moneda),

    CONSTRAINT uk_pag_planes_pago_venta_vigente
        UNIQUE (id_venta_vigente),

    CONSTRAINT fk_pag_planes_pago_venta_moneda
        FOREIGN KEY (id_venta, id_moneda)
        REFERENCES ven_ventas(id_venta, id_moneda)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pag_planes_pago_estado
        FOREIGN KEY (id_estado_plan_pago)
        REFERENCES cfg_estados_plan_pago(id_estado_plan_pago)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pag_planes_pago_moneda
        FOREIGN KEY (id_moneda)
        REFERENCES cfg_monedas(id_moneda)
        ON DELETE RESTRICT,

    CONSTRAINT chk_pag_planes_pago_monto_venta
        CHECK (
            monto_venta > 0
        ),

    CONSTRAINT chk_pag_planes_pago_inicial
        CHECK (
            monto_inicial >= 0
            AND monto_inicial <= monto_venta
        ),

    CONSTRAINT chk_pag_planes_pago_capital
        CHECK (
            capital_financiado >= 0
        ),
	
    CONSTRAINT chk_pag_planes_pago_capital_calculado
        CHECK (
             capital_financiado = monto_venta - monto_inicial
        ), 

    CONSTRAINT chk_pag_planes_pago_tasa
        CHECK (
            tasa_interes_pct IS NULL
            OR tasa_interes_pct >= 0
        ),

    CONSTRAINT chk_pag_planes_pago_interes
        CHECK (
            monto_interes_total IS NULL
            OR monto_interes_total >= 0
        ),

    CONSTRAINT chk_pag_planes_pago_total
        CHECK (
            monto_total_financiado IS NULL
            OR monto_total_financiado >= 0
        ),
	
    CONSTRAINT chk_pag_planes_pago_total_calculado
    CHECK (
        (monto_interes_total IS NULL
            AND monto_total_financiado IS NULL)
            OR (
            monto_interes_total IS NOT NULL
            AND monto_total_financiado IS NOT NULL
            AND monto_total_financiado =
                capital_financiado + monto_interes_total)
	),

    CONSTRAINT chk_pag_planes_pago_cuotas
        CHECK (
            numero_cuotas > 0
        ),

    CONSTRAINT chk_pag_planes_pago_primera_cuota
        CHECK (
            fecha_primera_cuota >= fecha_inicio
        ),

    CONSTRAINT chk_pag_planes_pago_cierre
        CHECK (
            fecha_cierre IS NULL
            OR fecha_cierre >= fecha_inicio
        ),
	
    CONSTRAINT chk_pag_planes_pago_vigencia_cierre
    CHECK (
        (
            es_vigente = TRUE
            AND fecha_cierre IS NULL
            AND motivo_cierre IS NULL
        )
        OR
        (
            es_vigente = FALSE
            AND fecha_cierre IS NOT NULL
            AND motivo_cierre IS NOT NULL
            AND CHAR_LENGTH(TRIM(motivo_cierre)) > 0
        )
    )
);

-- TABLA PAG_CUOTAS --
CREATE TABLE IF NOT EXISTS pag_cuotas (
id_cuota BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_plan_pago BIGINT NOT NULL,
    id_estado_cuota INT NOT NULL,

    numero_cuota INT NOT NULL,

    fecha_vencimiento DATE NOT NULL,

    monto_capital DECIMAL(14,2) NOT NULL DEFAULT 0,
    monto_interes DECIMAL(14,2) NOT NULL DEFAULT 0,
    monto_cuota DECIMAL(14,2) NOT NULL,

    fecha_pago_completo TIMESTAMPTZ(6) NULL,

    observaciones VARCHAR(255),

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_pag_cuotas_plan_numero
        UNIQUE (
            id_plan_pago,
            numero_cuota
        ),

    CONSTRAINT uk_pag_cuotas_cuota_plan
        UNIQUE (
            id_cuota,
            id_plan_pago
        ),

    CONSTRAINT fk_pag_cuotas_plan
        FOREIGN KEY (id_plan_pago)
        REFERENCES pag_planes_pago(id_plan_pago)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pag_cuotas_estado
        FOREIGN KEY (id_estado_cuota)
        REFERENCES cfg_estados_cuota(id_estado_cuota)
        ON DELETE RESTRICT,

    CONSTRAINT chk_pag_cuotas_numero
        CHECK (
            numero_cuota > 0
        ),

    CONSTRAINT chk_pag_cuotas_capital
        CHECK (
            monto_capital >= 0
        ),

    CONSTRAINT chk_pag_cuotas_interes
        CHECK (
            monto_interes >= 0
        ),

    CONSTRAINT chk_pag_cuotas_monto
        CHECK (
            monto_cuota > 0
        ),
	
    CONSTRAINT chk_pag_cuotas_total
		CHECK (
           monto_cuota = monto_capital + monto_interes
        )
);

  -- TABLA PAG_PAGOS --
CREATE TABLE IF NOT EXISTS pag_pagos (
id_pago BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_reserva BIGINT NULL,
    id_venta BIGINT NULL,
    id_plan_pago BIGINT NULL,

    id_estado_pago INT NOT NULL,
    id_metodo_pago INT NOT NULL,
    id_moneda INT NOT NULL,

    codigo VARCHAR(40) NOT NULL,

    monto DECIMAL(14,2) NOT NULL,

    fecha_operacion TIMESTAMPTZ(6) NOT NULL,

    numero_operacion VARCHAR(100),

    observaciones VARCHAR(500),

    id_usuario_registro BIGINT NULL,

    id_usuario_confirmacion BIGINT NULL,
    fecha_confirmacion TIMESTAMPTZ(6) NULL,

    id_usuario_anulacion BIGINT NULL,
    fecha_anulacion TIMESTAMPTZ(6) NULL,
    motivo_anulacion VARCHAR(255),

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_pag_pagos_codigo
        UNIQUE (codigo),

    CONSTRAINT uk_pag_pagos_pago_plan
        UNIQUE (id_pago, id_plan_pago),

    CONSTRAINT fk_pag_pagos_reserva
        FOREIGN KEY (id_reserva, id_moneda)
        REFERENCES ven_reservas(id_reserva, id_moneda)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pag_pagos_venta
        FOREIGN KEY (id_venta, id_moneda)
        REFERENCES ven_ventas(id_venta, id_moneda)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pag_pagos_plan_venta_moneda
        FOREIGN KEY (id_plan_pago, id_venta, id_moneda)
        REFERENCES pag_planes_pago(id_plan_pago, id_venta, id_moneda)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pag_pagos_estado
        FOREIGN KEY (id_estado_pago)
        REFERENCES cfg_estados_pago(id_estado_pago)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pag_pagos_metodo
        FOREIGN KEY (id_metodo_pago)
        REFERENCES cfg_metodos_pago(id_metodo_pago)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pag_pagos_moneda
        FOREIGN KEY (id_moneda)
        REFERENCES cfg_monedas(id_moneda)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pag_pagos_usuario_registro
        FOREIGN KEY (id_usuario_registro)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pag_pagos_usuario_confirmacion
        FOREIGN KEY (id_usuario_confirmacion)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pag_pagos_usuario_anulacion
        FOREIGN KEY (id_usuario_anulacion)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_pag_pagos_monto
        CHECK (
            monto > 0
        ),

    CONSTRAINT chk_pag_pagos_contexto
        CHECK (
            id_reserva IS NOT NULL
            OR id_venta IS NOT NULL
        ),

    CONSTRAINT chk_pag_pagos_plan_requiere_venta
        CHECK (
            id_plan_pago IS NULL
            OR id_venta IS NOT NULL
        ),

    CONSTRAINT chk_pag_pagos_confirmacion_usuario
        CHECK (
            (
                fecha_confirmacion IS NULL
                AND id_usuario_confirmacion IS NULL
            )
            OR
            (
                fecha_confirmacion IS NOT NULL
                AND id_usuario_confirmacion IS NOT NULL
            )
        ),

    CONSTRAINT chk_pag_pagos_confirmacion_fecha
        CHECK (
            fecha_confirmacion IS NULL
            OR fecha_confirmacion >= fecha_creacion
        ),

  CONSTRAINT chk_pag_pagos_anulacion_datos
    CHECK (
        (
            fecha_anulacion IS NULL
            AND id_usuario_anulacion IS NULL
            AND motivo_anulacion IS NULL
        )
        OR
        (
            fecha_anulacion IS NOT NULL
            AND id_usuario_anulacion IS NOT NULL
            AND motivo_anulacion IS NOT NULL
            AND CHAR_LENGTH(TRIM(motivo_anulacion)) > 0
        )
    ),

    CONSTRAINT chk_pag_pagos_anulacion_fecha
        CHECK (
            fecha_anulacion IS NULL
            OR fecha_anulacion >= fecha_creacion
        )
);
  
  -- tabla pag_aplicaciones_pago --
  CREATE TABLE IF NOT EXISTS pag_aplicaciones_pago (
id_aplicacion_pago BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_pago BIGINT NOT NULL,
    id_tipo_aplicacion_pago INT NOT NULL,

    id_plan_pago BIGINT NULL,
    id_cuota BIGINT NULL,

    monto_aplicado DECIMAL(14,2) NOT NULL,

    fecha_aplicacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    observaciones VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    id_usuario_aplicacion BIGINT NULL,

    fecha_anulacion TIMESTAMPTZ(6) NULL,
    id_usuario_anulacion BIGINT NULL,
    motivo_anulacion VARCHAR(255),

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT fk_pag_aplicaciones_pago_pago
        FOREIGN KEY (id_pago)
        REFERENCES pag_pagos(id_pago)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pag_aplicaciones_pago_tipo
        FOREIGN KEY (id_tipo_aplicacion_pago)
        REFERENCES cfg_tipos_aplicacion_pago(id_tipo_aplicacion_pago)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pag_aplicaciones_pago_pago_plan
        FOREIGN KEY (id_pago, id_plan_pago)
        REFERENCES pag_pagos(id_pago, id_plan_pago)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pag_aplicaciones_pago_cuota_plan
        FOREIGN KEY (id_cuota, id_plan_pago)
        REFERENCES pag_cuotas(id_cuota, id_plan_pago)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pag_aplicaciones_pago_usuario
        FOREIGN KEY (id_usuario_aplicacion)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pag_aplicaciones_pago_usuario_anulacion
        FOREIGN KEY (id_usuario_anulacion)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_pag_aplicaciones_pago_monto
        CHECK (
            monto_aplicado > 0
        ),

    CONSTRAINT chk_pag_aplicaciones_pago_cuota_plan
        CHECK (
            id_cuota IS NULL
            OR id_plan_pago IS NOT NULL
        ),

    CONSTRAINT chk_pag_aplicaciones_pago_anulacion_datos
        CHECK (
            (
                activo = TRUE
                AND fecha_anulacion IS NULL
                AND id_usuario_anulacion IS NULL
                AND motivo_anulacion IS NULL
            )
            OR
            (
                activo = FALSE
                AND fecha_anulacion IS NOT NULL
                AND id_usuario_anulacion IS NOT NULL
                AND motivo_anulacion IS NOT NULL
                AND CHAR_LENGTH(TRIM(motivo_anulacion)) > 0
            )
        ),

    CONSTRAINT chk_pag_aplicaciones_pago_anulacion_fecha
        CHECK (
            fecha_anulacion IS NULL
            OR fecha_anulacion >= fecha_aplicacion
        )
);
  
  -- tabla pag_vouchers --
  CREATE TABLE IF NOT EXISTS pag_vouchers (
id_voucher BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_pago BIGINT NOT NULL,
    id_estado_voucher INT NOT NULL,

    codigo VARCHAR(40) NOT NULL,
    numero_version INT NOT NULL DEFAULT 1,

    nombre_archivo_original VARCHAR(255) NOT NULL,
    clave_archivo VARCHAR(500) NOT NULL,

    tipo_mime VARCHAR(100),
    tamanio_bytes BIGINT,
    hash_sha256 CHAR(64),

    fecha_carga TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    id_usuario_carga BIGINT NULL,

    fecha_validacion TIMESTAMPTZ(6) NULL,
    id_usuario_validacion BIGINT NULL,

    motivo_rechazo VARCHAR(255),
    observaciones_validacion VARCHAR(500),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_pag_vouchers_codigo
        UNIQUE (codigo),

    CONSTRAINT uk_pag_vouchers_pago_version
        UNIQUE (id_pago, numero_version),

    CONSTRAINT fk_pag_vouchers_pago
        FOREIGN KEY (id_pago)
        REFERENCES pag_pagos(id_pago)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pag_vouchers_estado
        FOREIGN KEY (id_estado_voucher)
        REFERENCES cfg_estados_voucher(id_estado_voucher)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pag_vouchers_usuario_carga
        FOREIGN KEY (id_usuario_carga)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pag_vouchers_usuario_validacion
        FOREIGN KEY (id_usuario_validacion)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_pag_vouchers_version
        CHECK (numero_version > 0),

    CONSTRAINT chk_pag_vouchers_tamanio
        CHECK (
            tamanio_bytes IS NULL
            OR tamanio_bytes > 0
        ),

    CONSTRAINT chk_pag_vouchers_validacion
        CHECK (
            fecha_validacion IS NULL
            OR fecha_validacion >= fecha_carga
        ),
	
    CONSTRAINT chk_pag_vouchers_validacion_usuario
    CHECK (
        (
            fecha_validacion IS NULL
            AND id_usuario_validacion IS NULL
        )
        OR
        (
            fecha_validacion IS NOT NULL
            AND id_usuario_validacion IS NOT NULL
        )
    )
);
  
  -- tabla pag_planes_pago_historial_estado
  CREATE TABLE IF NOT EXISTS pag_planes_pago_historial_estado (
id_historial_estado BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_plan_pago BIGINT NOT NULL,

    id_estado_anterior INT NULL,
    id_estado_nuevo INT NOT NULL,

    fecha_cambio TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    motivo VARCHAR(255),

    id_usuario_cambio BIGINT NULL,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT fk_pag_plan_historial_plan
        FOREIGN KEY (id_plan_pago)
        REFERENCES pag_planes_pago(id_plan_pago)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pag_plan_historial_estado_anterior
        FOREIGN KEY (id_estado_anterior)
        REFERENCES cfg_estados_plan_pago(id_estado_plan_pago)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pag_plan_historial_estado_nuevo
        FOREIGN KEY (id_estado_nuevo)
        REFERENCES cfg_estados_plan_pago(id_estado_plan_pago)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pag_plan_historial_usuario
        FOREIGN KEY (id_usuario_cambio)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_pag_plan_historial_estados
        CHECK (
            id_estado_anterior IS NULL
            OR id_estado_anterior <> id_estado_nuevo
        )
);
  
  
  -- ----------- 8. ASESORES Y COMISIONES (comercial) -----------
  
  -- TABLA COM_ ASESORES 
  -- =====================================================
-- 08. COMERCIAL / ASESORES Y COMISIONES
-- =====================================================

-- 08.01 COM_ASESORES
CREATE TABLE IF NOT EXISTS com_asesores (
id_asesor BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_persona BIGINT NOT NULL,
    id_tipo_asesor INT NOT NULL,
    id_estado_asesor INT NOT NULL,

    codigo VARCHAR(30) NOT NULL,

    fecha_inicio DATE NOT NULL,

    fecha_fin DATE NULL,

    observaciones VARCHAR(500),

    id_usuario_registro BIGINT NULL,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_com_asesores_persona
        UNIQUE (id_persona),

    CONSTRAINT uk_com_asesores_codigo
        UNIQUE (codigo),

    CONSTRAINT fk_com_asesores_persona
        FOREIGN KEY (id_persona)
        REFERENCES core_personas(id_persona)
        ON DELETE RESTRICT,

    CONSTRAINT fk_com_asesores_tipo
        FOREIGN KEY (id_tipo_asesor)
        REFERENCES cfg_tipos_asesor(id_tipo_asesor)
        ON DELETE RESTRICT,

    CONSTRAINT fk_com_asesores_estado
        FOREIGN KEY (id_estado_asesor)
        REFERENCES cfg_estados_asesor(id_estado_asesor)
        ON DELETE RESTRICT,

    CONSTRAINT fk_com_asesores_usuario_registro
        FOREIGN KEY (id_usuario_registro)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_com_asesores_fechas
        CHECK (
            fecha_fin IS NULL
            OR fecha_fin >= fecha_inicio
        )
);
  
  -- TABLA COM_ASIGNACIONES_PROSPECTO
  CREATE TABLE IF NOT EXISTS com_asignaciones_prospecto (
id_asignacion_prospecto BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_prospecto BIGINT NOT NULL,
    id_asesor BIGINT NOT NULL,

    fecha_asignacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_fin TIMESTAMPTZ(6) NULL,

    motivo_asignacion VARCHAR(255),
    motivo_cierre VARCHAR(255),

    id_usuario_asignacion BIGINT NULL,
    id_usuario_cierre BIGINT NULL,

    id_prospecto_vigente BIGINT
        GENERATED ALWAYS AS (
            CASE
                WHEN fecha_fin IS NULL THEN id_prospecto
                ELSE NULL
            END
        ) STORED,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_com_asignaciones_prospecto_vigente
        UNIQUE (id_prospecto_vigente),

    CONSTRAINT fk_com_asignaciones_prospecto_prospecto
        FOREIGN KEY (id_prospecto)
        REFERENCES crm_prospectos(id_prospecto)
        ON DELETE RESTRICT,

    CONSTRAINT fk_com_asignaciones_prospecto_asesor
        FOREIGN KEY (id_asesor)
        REFERENCES com_asesores(id_asesor)
        ON DELETE RESTRICT,

    CONSTRAINT fk_com_asignaciones_prospecto_usuario_asignacion
        FOREIGN KEY (id_usuario_asignacion)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_com_asignaciones_prospecto_usuario_cierre
        FOREIGN KEY (id_usuario_cierre)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_com_asignaciones_prospecto_fechas
        CHECK (
            fecha_fin IS NULL
            OR fecha_fin >= fecha_asignacion
        ),

    CONSTRAINT chk_com_asignaciones_prospecto_cierre
    CHECK (
        (
            fecha_fin IS NULL
            AND id_usuario_cierre IS NULL
            AND motivo_cierre IS NULL
        )
        OR
        (
            fecha_fin IS NOT NULL
            AND id_usuario_cierre IS NOT NULL
            AND motivo_cierre IS NOT NULL
            AND CHAR_LENGTH(TRIM(motivo_cierre)) > 0
        )
    )
);
  
  -- TABLA COM_VENTAS_ASESORES
  CREATE TABLE IF NOT EXISTS com_ventas_asesores (
id_venta_asesor BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_venta BIGINT NOT NULL,
    id_asesor BIGINT NOT NULL,

    es_principal BOOLEAN NOT NULL DEFAULT FALSE,

    porcentaje_participacion DECIMAL(5,2) NOT NULL DEFAULT 100.00,

    fecha_asignacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    id_usuario_registro BIGINT NULL,

    id_venta_principal BIGINT
        GENERATED ALWAYS AS (
            CASE
                WHEN es_principal = TRUE THEN id_venta
                ELSE NULL
            END
        ) STORED,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_com_ventas_asesores
        UNIQUE (
            id_venta,
            id_asesor
        ),

    CONSTRAINT uk_com_ventas_asesores_principal
        UNIQUE (
            id_venta_principal
        ),

    CONSTRAINT fk_com_ventas_asesores_venta
        FOREIGN KEY (id_venta)
        REFERENCES ven_ventas(id_venta)
        ON DELETE RESTRICT,

    CONSTRAINT fk_com_ventas_asesores_asesor
        FOREIGN KEY (id_asesor)
        REFERENCES com_asesores(id_asesor)
        ON DELETE RESTRICT,

    CONSTRAINT fk_com_ventas_asesores_usuario
        FOREIGN KEY (id_usuario_registro)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_com_ventas_asesores_participacion
        CHECK (
            porcentaje_participacion > 0
            AND porcentaje_participacion <= 100
        )
);
  
  -- TABLA COM_REGLAS_COMISION
  CREATE TABLE IF NOT EXISTS com_reglas_comision (
id_regla_comision BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_proyecto BIGINT NULL,
    id_tipo_asesor INT NULL,
    id_modalidad_venta INT NULL,

    id_tipo_calculo_comision INT NOT NULL,
    id_moneda INT NULL,

    codigo VARCHAR(40) NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    descripcion VARCHAR(500),

    valor DECIMAL(14,4) NOT NULL,

    prioridad INT NOT NULL DEFAULT 100,

    fecha_desde TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_hasta TIMESTAMPTZ(6) NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_com_reglas_comision_codigo
        UNIQUE (codigo),

    CONSTRAINT fk_com_reglas_comision_proyecto
        FOREIGN KEY (id_proyecto)
        REFERENCES inm_proyectos(id_proyecto)
        ON DELETE RESTRICT,

    CONSTRAINT fk_com_reglas_comision_tipo_asesor
        FOREIGN KEY (id_tipo_asesor)
        REFERENCES cfg_tipos_asesor(id_tipo_asesor)
        ON DELETE RESTRICT,

    CONSTRAINT fk_com_reglas_comision_modalidad
        FOREIGN KEY (id_modalidad_venta)
        REFERENCES cfg_modalidades_venta(id_modalidad_venta)
        ON DELETE RESTRICT,

    CONSTRAINT fk_com_reglas_comision_tipo_calculo
        FOREIGN KEY (id_tipo_calculo_comision)
        REFERENCES cfg_tipos_calculo_comision(id_tipo_calculo_comision)
        ON DELETE RESTRICT,

    CONSTRAINT fk_com_reglas_comision_moneda
        FOREIGN KEY (id_moneda)
        REFERENCES cfg_monedas(id_moneda)
        ON DELETE RESTRICT,

    CONSTRAINT chk_com_reglas_comision_valor
        CHECK (
            valor > 0
        ),

    CONSTRAINT chk_com_reglas_comision_fechas
        CHECK (
            fecha_hasta IS NULL
            OR fecha_hasta >= fecha_desde
        )
);
  
  -- TABLA COM_COMISIONES
  CREATE TABLE IF NOT EXISTS com_comisiones (
id_comision BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_venta_asesor BIGINT NOT NULL,
    id_regla_comision BIGINT NOT NULL,
    id_estado_comision INT NOT NULL,
    id_moneda INT NOT NULL,

    codigo VARCHAR(40) NOT NULL,

    monto_base DECIMAL(14,2) NOT NULL,
    valor_regla_aplicado DECIMAL(14,4) NOT NULL,
    porcentaje_participacion_aplicado DECIMAL(5,2) NOT NULL,

    monto_comision_calculada DECIMAL(14,2) NOT NULL,
    monto_comision_final DECIMAL(14,2) NOT NULL,

    fecha_generacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_aprobacion TIMESTAMPTZ(6) NULL,
    id_usuario_aprobacion BIGINT NULL,

    fecha_pago TIMESTAMPTZ(6) NULL,
    id_usuario_pago BIGINT NULL,

    fecha_anulacion TIMESTAMPTZ(6) NULL,
    id_usuario_anulacion BIGINT NULL,
    motivo_anulacion VARCHAR(255),

    observaciones VARCHAR(500),

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_com_comisiones_codigo
        UNIQUE (codigo),

    CONSTRAINT uk_com_comisiones_venta_asesor
        UNIQUE (id_venta_asesor),

    CONSTRAINT fk_com_comisiones_venta_asesor
        FOREIGN KEY (id_venta_asesor)
        REFERENCES com_ventas_asesores(id_venta_asesor)
        ON DELETE RESTRICT,

    CONSTRAINT fk_com_comisiones_regla
        FOREIGN KEY (id_regla_comision)
        REFERENCES com_reglas_comision(id_regla_comision)
        ON DELETE RESTRICT,

    CONSTRAINT fk_com_comisiones_estado
        FOREIGN KEY (id_estado_comision)
        REFERENCES cfg_estados_comision(id_estado_comision)
        ON DELETE RESTRICT,

    CONSTRAINT fk_com_comisiones_moneda
        FOREIGN KEY (id_moneda)
        REFERENCES cfg_monedas(id_moneda)
        ON DELETE RESTRICT,

    CONSTRAINT fk_com_comisiones_usuario_aprobacion
        FOREIGN KEY (id_usuario_aprobacion)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_com_comisiones_usuario_pago
        FOREIGN KEY (id_usuario_pago)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_com_comisiones_usuario_anulacion
        FOREIGN KEY (id_usuario_anulacion)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_com_comisiones_monto_base
        CHECK (
            monto_base > 0
        ),

    CONSTRAINT chk_com_comisiones_valor_regla
        CHECK (
            valor_regla_aplicado > 0
        ),

    CONSTRAINT chk_com_comisiones_participacion
        CHECK (
            porcentaje_participacion_aplicado > 0
            AND porcentaje_participacion_aplicado <= 100
        ),

    CONSTRAINT chk_com_comisiones_calculada
        CHECK (
            monto_comision_calculada >= 0
        ),

    CONSTRAINT chk_com_comisiones_final
        CHECK (
            monto_comision_final >= 0
        ),

    CONSTRAINT chk_com_comisiones_aprobacion
        CHECK (
            (
                fecha_aprobacion IS NULL
                AND id_usuario_aprobacion IS NULL
            )
            OR
            (
                fecha_aprobacion IS NOT NULL
                AND id_usuario_aprobacion IS NOT NULL
            )
        ),

    CONSTRAINT chk_com_comisiones_pago
        CHECK (
            (
                fecha_pago IS NULL
                AND id_usuario_pago IS NULL
            )
            OR
            (
                fecha_pago IS NOT NULL
                AND id_usuario_pago IS NOT NULL
            )
        ),

    CONSTRAINT chk_com_comisiones_anulacion
        CHECK (
            (
                fecha_anulacion IS NULL
                AND id_usuario_anulacion IS NULL
                AND motivo_anulacion IS NULL
            )
            OR
            (
                fecha_anulacion IS NOT NULL
                AND id_usuario_anulacion IS NOT NULL
                AND motivo_anulacion IS NOT NULL
                AND CHAR_LENGTH(TRIM(motivo_anulacion)) > 0
            )
        ),

    CONSTRAINT chk_com_comisiones_fecha_aprobacion
        CHECK (
            fecha_aprobacion IS NULL
            OR fecha_aprobacion >= fecha_generacion
        ),

    CONSTRAINT chk_com_comisiones_fecha_pago
        CHECK (
            fecha_pago IS NULL
            OR fecha_pago >= fecha_generacion
        ),
        
	CONSTRAINT chk_com_comisiones_pago_aprobacion
    CHECK (
        fecha_pago IS NULL
        OR (
            fecha_aprobacion IS NOT NULL
            AND fecha_pago >= fecha_aprobacion
        )
    ),

    CONSTRAINT chk_com_comisiones_fecha_anulacion
        CHECK (
            fecha_anulacion IS NULL
            OR fecha_anulacion >= fecha_generacion
        )
);
  
  -- --- 9. CMS (ADMINISTRACION DE LA PAGINA WEB ----------
  
  -- TABLA CMS_PAGINAS --
  CREATE TABLE IF NOT EXISTS cms_paginas (
id_pagina BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_estado_publicacion INT NOT NULL,

    codigo VARCHAR(40) NOT NULL,
    slug VARCHAR(150) NOT NULL,

    titulo VARCHAR(180) NOT NULL,
    descripcion VARCHAR(500),

    titulo_seo VARCHAR(180),
    descripcion_seo VARCHAR(320),

    orden INT NOT NULL DEFAULT 0,

    mostrar_menu BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_publicacion TIMESTAMPTZ(6) NULL,

    id_usuario_registro BIGINT NULL,
    id_usuario_publicacion BIGINT NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cms_paginas_codigo
        UNIQUE (codigo),

    CONSTRAINT uk_cms_paginas_slug
        UNIQUE (slug),

    CONSTRAINT fk_cms_paginas_estado
        FOREIGN KEY (id_estado_publicacion)
        REFERENCES cfg_estados_publicacion(id_estado_publicacion)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cms_paginas_usuario_registro
        FOREIGN KEY (id_usuario_registro)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cms_paginas_usuario_publicacion
        FOREIGN KEY (id_usuario_publicacion)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_cms_paginas_slug
        CHECK (
            CHAR_LENGTH(TRIM(slug)) > 0
        ),

    CONSTRAINT chk_cms_paginas_publicacion
        CHECK (
            (
                fecha_publicacion IS NULL
                AND id_usuario_publicacion IS NULL
            )
            OR
            (
                fecha_publicacion IS NOT NULL
                AND id_usuario_publicacion IS NOT NULL
            )
        )
);

-- TABLA CFG_SECCIONES --
CREATE TABLE IF NOT EXISTS cms_secciones (
id_seccion BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_pagina BIGINT NOT NULL,
    id_tipo_seccion INT NOT NULL,

    codigo VARCHAR(50) NOT NULL,

    titulo VARCHAR(180),
    subtitulo VARCHAR(255),

    contenido TEXT,

    configuracion JSONB,

    orden INT NOT NULL DEFAULT 0,

    visible BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_desde TIMESTAMPTZ(6) NULL,
    fecha_hasta TIMESTAMPTZ(6) NULL,

    id_usuario_registro BIGINT NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cms_secciones_pagina_codigo
        UNIQUE (
            id_pagina,
            codigo
        ),

    CONSTRAINT fk_cms_secciones_pagina
        FOREIGN KEY (id_pagina)
        REFERENCES cms_paginas(id_pagina)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cms_secciones_tipo
        FOREIGN KEY (id_tipo_seccion)
        REFERENCES cfg_tipos_seccion(id_tipo_seccion)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cms_secciones_usuario
        FOREIGN KEY (id_usuario_registro)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_cms_secciones_fechas
        CHECK (
            fecha_hasta IS NULL
            OR fecha_desde IS NULL
            OR fecha_hasta >= fecha_desde
        )
);
  
  -- TABLA CMS_SECCION_ITEMS --
  CREATE TABLE IF NOT EXISTS cms_seccion_items (
id_seccion_item BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_seccion BIGINT NOT NULL,

    codigo VARCHAR(60) NOT NULL,

    titulo VARCHAR(180),
    subtitulo VARCHAR(255),

    contenido TEXT,

    texto_enlace VARCHAR(120),
    url_enlace VARCHAR(500),

    configuracion JSONB,

    orden INT NOT NULL DEFAULT 0,

    visible BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_desde TIMESTAMPTZ(6) NULL,
    fecha_hasta TIMESTAMPTZ(6) NULL,

    id_usuario_registro BIGINT NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cms_seccion_items_seccion_codigo
        UNIQUE (
            id_seccion,
            codigo
        ),

    CONSTRAINT fk_cms_seccion_items_seccion
        FOREIGN KEY (id_seccion)
        REFERENCES cms_secciones(id_seccion)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cms_seccion_items_usuario
        FOREIGN KEY (id_usuario_registro)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_cms_seccion_items_fechas
        CHECK (
            fecha_hasta IS NULL
            OR fecha_desde IS NULL
            OR fecha_hasta >= fecha_desde
        ),

    CONSTRAINT chk_cms_seccion_items_enlace
        CHECK (
            url_enlace IS NULL
            OR CHAR_LENGTH(TRIM(url_enlace)) > 0
        )
);
  
  -- TABLA CMS_MULTIMEDIA --
  CREATE TABLE IF NOT EXISTS cms_multimedia (
id_multimedia BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_tipo_multimedia INT NOT NULL,

    codigo VARCHAR(50) NOT NULL,

    nombre VARCHAR(180) NOT NULL,
    descripcion VARCHAR(500),

    nombre_archivo_original VARCHAR(255),

    clave_archivo VARCHAR(500),
    url_externa VARCHAR(1000),

    tipo_mime VARCHAR(100),

    tamanio_bytes BIGINT,

    hash_sha256 CHAR(64),

    texto_alternativo VARCHAR(255),

    ancho_px BIGINT,
    alto_px BIGINT,

    duracion_segundos BIGINT,

    id_usuario_registro BIGINT NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cms_multimedia_codigo
        UNIQUE (codigo),

    CONSTRAINT fk_cms_multimedia_tipo
        FOREIGN KEY (id_tipo_multimedia)
        REFERENCES cfg_tipos_multimedia(id_tipo_multimedia)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cms_multimedia_usuario
        FOREIGN KEY (id_usuario_registro)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_cms_multimedia_origen
        CHECK (
            (
                clave_archivo IS NOT NULL
                AND url_externa IS NULL
            )
            OR
            (
                clave_archivo IS NULL
                AND url_externa IS NOT NULL
            )
        ),

    CONSTRAINT chk_cms_multimedia_tamanio
        CHECK (
            tamanio_bytes IS NULL
            OR tamanio_bytes > 0
        ),

    CONSTRAINT chk_cms_multimedia_ancho
        CHECK (
            ancho_px IS NULL
            OR ancho_px > 0
        ),

    CONSTRAINT chk_cms_multimedia_alto
        CHECK (
            alto_px IS NULL
            OR alto_px > 0
        ),

    CONSTRAINT chk_cms_multimedia_duracion
        CHECK (
            duracion_segundos IS NULL
            OR duracion_segundos > 0
        )
);
  
  -- TABLA CMS_MULTIMEDIA_ASIGNACIONES -- 
  CREATE TABLE IF NOT EXISTS cms_multimedia_asignaciones (
id_multimedia_asignacion BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_multimedia BIGINT NOT NULL,
    id_uso_multimedia INT NOT NULL,

    id_pagina BIGINT NULL,
    id_seccion BIGINT NULL,
    id_seccion_item BIGINT NULL,

    orden INT NOT NULL DEFAULT 0,

    visible BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_desde TIMESTAMPTZ(6) NULL,
    fecha_hasta TIMESTAMPTZ(6) NULL,

    id_usuario_registro BIGINT NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cms_multimedia_asig_pagina
        UNIQUE (
            id_pagina,
            id_multimedia,
            id_uso_multimedia
        ),

    CONSTRAINT uk_cms_multimedia_asig_seccion
        UNIQUE (
            id_seccion,
            id_multimedia,
            id_uso_multimedia
        ),

    CONSTRAINT uk_cms_multimedia_asig_item
        UNIQUE (
            id_seccion_item,
            id_multimedia,
            id_uso_multimedia
        ),

    CONSTRAINT fk_cms_multimedia_asig_multimedia
        FOREIGN KEY (id_multimedia)
        REFERENCES cms_multimedia(id_multimedia)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cms_multimedia_asig_uso
        FOREIGN KEY (id_uso_multimedia)
        REFERENCES cfg_usos_multimedia(id_uso_multimedia)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cms_multimedia_asig_pagina
        FOREIGN KEY (id_pagina)
        REFERENCES cms_paginas(id_pagina)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cms_multimedia_asig_seccion
        FOREIGN KEY (id_seccion)
        REFERENCES cms_secciones(id_seccion)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cms_multimedia_asig_item
        FOREIGN KEY (id_seccion_item)
        REFERENCES cms_seccion_items(id_seccion_item)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cms_multimedia_asig_usuario
        FOREIGN KEY (id_usuario_registro)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_cms_multimedia_asig_destino
        CHECK (
            num_nonnulls(id_pagina, id_seccion, id_seccion_item) = 1
        ),

    CONSTRAINT chk_cms_multimedia_asig_fechas
        CHECK (
            fecha_hasta IS NULL
            OR fecha_desde IS NULL
            OR fecha_hasta >= fecha_desde
        )
);
  
  -- TABLA CMS_PROYECTOS 
  CREATE TABLE IF NOT EXISTS cms_proyectos (
id_cms_proyecto BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_proyecto BIGINT NOT NULL,
    id_pagina BIGINT NOT NULL,

    nombre_comercial VARCHAR(180) NULL,
    resumen_comercial VARCHAR(500) NULL,
    descripcion_comercial TEXT NULL,

    destacado BOOLEAN NOT NULL DEFAULT FALSE,
    orden INT NOT NULL DEFAULT 0,

    texto_cta VARCHAR(120) NULL,
    url_cta VARCHAR(500) NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    id_usuario_registro BIGINT NULL,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cms_proyectos_proyecto
        UNIQUE (id_proyecto),

    CONSTRAINT uk_cms_proyectos_pagina
        UNIQUE (id_pagina),

    CONSTRAINT fk_cms_proyectos_proyecto
        FOREIGN KEY (id_proyecto)
        REFERENCES inm_proyectos(id_proyecto)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cms_proyectos_pagina
        FOREIGN KEY (id_pagina)
        REFERENCES cms_paginas(id_pagina)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cms_proyectos_usuario
        FOREIGN KEY (id_usuario_registro)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_cms_proyectos_cta
        CHECK (
            url_cta IS NULL
            OR CHAR_LENGTH(TRIM(url_cta)) > 0
        )
);
  
  -- TABLA CMS_CONSULTAS_WEB -- 
  CREATE TABLE IF NOT EXISTS cms_consultas_web (
id_consulta_web BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_estado_consulta_web INT NOT NULL,

    id_pagina BIGINT NULL,
    id_proyecto BIGINT NULL,

    id_prospecto BIGINT NULL,

    codigo VARCHAR(40) NOT NULL,

    nombres VARCHAR(150) NOT NULL,
    correo VARCHAR(180) NULL,
    telefono VARCHAR(40) NULL,

    asunto VARCHAR(150) NULL,
    mensaje TEXT NULL,

    acepta_privacidad BOOLEAN NOT NULL DEFAULT FALSE,

    utm_source VARCHAR(100) NULL,
    utm_medium VARCHAR(100) NULL,
    utm_campaign VARCHAR(150) NULL,

    fecha_recepcion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    id_usuario_atencion BIGINT NULL,
    fecha_atencion TIMESTAMPTZ(6) NULL,

    fecha_cierre TIMESTAMPTZ(6) NULL,
    motivo_cierre VARCHAR(255) NULL,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_cms_consultas_web_codigo
        UNIQUE (codigo),

    CONSTRAINT fk_cms_consultas_web_estado
        FOREIGN KEY (id_estado_consulta_web)
        REFERENCES cfg_estados_consulta_web(id_estado_consulta_web)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cms_consultas_web_pagina
        FOREIGN KEY (id_pagina)
        REFERENCES cms_paginas(id_pagina)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cms_consultas_web_proyecto
        FOREIGN KEY (id_proyecto)
        REFERENCES inm_proyectos(id_proyecto)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cms_consultas_web_prospecto
        FOREIGN KEY (id_prospecto)
        REFERENCES crm_prospectos(id_prospecto)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cms_consultas_web_usuario_atencion
        FOREIGN KEY (id_usuario_atencion)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_cms_consultas_web_contacto
        CHECK (
            (
                correo IS NOT NULL
                AND CHAR_LENGTH(TRIM(correo)) > 0
            )
            OR
            (
                telefono IS NOT NULL
                AND CHAR_LENGTH(TRIM(telefono)) > 0
            )
        ),

    CONSTRAINT chk_cms_consultas_web_atencion
        CHECK (
            (
                fecha_atencion IS NULL
                AND id_usuario_atencion IS NULL
            )
            OR
            (
                fecha_atencion IS NOT NULL
                AND id_usuario_atencion IS NOT NULL
            )
        ),

    CONSTRAINT chk_cms_consultas_web_fecha_atencion
        CHECK (
            fecha_atencion IS NULL
            OR fecha_atencion >= fecha_recepcion
        ),

    CONSTRAINT chk_cms_consultas_web_fecha_cierre
        CHECK (
            fecha_cierre IS NULL
            OR fecha_cierre >= fecha_recepcion
        )
);

-- ----- 10. NOTIFICACIONES ----------

-- TABLA NOT_NOTIFICACIONES --
CREATE TABLE IF NOT EXISTS not_notificaciones (
id_notificacion BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_persona BIGINT NOT NULL,
    id_tipo_notificacion INT NOT NULL,

    titulo VARCHAR(180) NOT NULL,
    mensaje VARCHAR(1000) NOT NULL,

    url_destino VARCHAR(500) NULL,

    referencia_modulo VARCHAR(50) NULL,
    referencia_entidad VARCHAR(80) NULL,
    referencia_id VARCHAR(80) NULL,

    datos_contexto JSONB NULL,

    clave_deduplicacion VARCHAR(150) NULL,

    fecha_generacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_lectura TIMESTAMPTZ(6) NULL,

    fecha_expiracion TIMESTAMPTZ(6) NULL,

    id_usuario_generacion BIGINT NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_not_notificaciones_deduplicacion
        UNIQUE (clave_deduplicacion),

    CONSTRAINT fk_not_notificaciones_persona
        FOREIGN KEY (id_persona)
        REFERENCES core_personas(id_persona)
        ON DELETE RESTRICT,

    CONSTRAINT fk_not_notificaciones_tipo
        FOREIGN KEY (id_tipo_notificacion)
        REFERENCES cfg_tipos_notificacion(id_tipo_notificacion)
        ON DELETE RESTRICT,

    CONSTRAINT fk_not_notificaciones_usuario_generacion
        FOREIGN KEY (id_usuario_generacion)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_not_notificaciones_lectura
        CHECK (
            fecha_lectura IS NULL
            OR fecha_lectura >= fecha_generacion
        ),

    CONSTRAINT chk_not_notificaciones_expiracion
        CHECK (
            fecha_expiracion IS NULL
            OR fecha_expiracion >= fecha_generacion
        )
);
  
  -- NOT_ENVIOS --
  CREATE TABLE IF NOT EXISTS not_envios (
id_envio BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_notificacion BIGINT NOT NULL,
    id_canal_notificacion INT NOT NULL,
    id_estado_envio_notificacion INT NOT NULL,

    destinatario VARCHAR(255) NULL,

    fecha_programada TIMESTAMPTZ(6) NULL,

    numero_intentos INT NOT NULL DEFAULT 0,

    fecha_ultimo_intento TIMESTAMPTZ(6) NULL,
    fecha_envio TIMESTAMPTZ(6) NULL,

    identificador_proveedor VARCHAR(150) NULL,

    ultimo_error VARCHAR(1000) NULL,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_not_envios_notificacion_canal
        UNIQUE (
            id_notificacion,
            id_canal_notificacion
        ),

    CONSTRAINT fk_not_envios_notificacion
        FOREIGN KEY (id_notificacion)
        REFERENCES not_notificaciones(id_notificacion)
        ON DELETE RESTRICT,

    CONSTRAINT fk_not_envios_canal
        FOREIGN KEY (id_canal_notificacion)
        REFERENCES cfg_canales_notificacion(id_canal_notificacion)
        ON DELETE RESTRICT,

    CONSTRAINT fk_not_envios_estado
        FOREIGN KEY (id_estado_envio_notificacion)
        REFERENCES cfg_estados_envio_notificacion(id_estado_envio_notificacion)
        ON DELETE RESTRICT,

    CONSTRAINT chk_not_envios_intentos
        CHECK (
            numero_intentos >= 0
        ),

    CONSTRAINT chk_not_envios_ultimo_intento
        CHECK (
            (
                numero_intentos = 0
                AND fecha_ultimo_intento IS NULL
            )
            OR
            (
                numero_intentos > 0
                AND fecha_ultimo_intento IS NOT NULL
            )
        ),

    CONSTRAINT chk_not_envios_fecha_envio
        CHECK (
            fecha_envio IS NULL
            OR fecha_envio >= fecha_creacion
        )
);
  
  -- NOT_PLANTILLAS --
  CREATE TABLE IF NOT EXISTS not_plantillas (
id_plantilla BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_tipo_notificacion INT NOT NULL,
    id_canal_notificacion INT NOT NULL,

    codigo VARCHAR(50) NOT NULL,
    nombre VARCHAR(120) NOT NULL,

    asunto VARCHAR(180) NULL,
    contenido TEXT NOT NULL,

    numero_version INT NOT NULL DEFAULT 1,

    fecha_desde TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_hasta TIMESTAMPTZ(6) NULL,

    vigente BOOLEAN NOT NULL DEFAULT TRUE,

    clave_vigente VARCHAR(80)
        GENERATED ALWAYS AS (
            CASE
                WHEN vigente = TRUE
                THEN ((id_tipo_notificacion)::text || ('-')::text || (id_canal_notificacion)::text)
                ELSE NULL
            END
        ) STORED,

    id_usuario_registro BIGINT NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_not_plantillas_codigo
        UNIQUE (codigo),

    CONSTRAINT uk_not_plantillas_tipo_canal_version
        UNIQUE (
            id_tipo_notificacion,
            id_canal_notificacion,
            numero_version
        ),

    CONSTRAINT uk_not_plantillas_vigente
        UNIQUE (
            clave_vigente
        ),

    CONSTRAINT fk_not_plantillas_tipo
        FOREIGN KEY (id_tipo_notificacion)
        REFERENCES cfg_tipos_notificacion(id_tipo_notificacion)
        ON DELETE RESTRICT,

    CONSTRAINT fk_not_plantillas_canal
        FOREIGN KEY (id_canal_notificacion)
        REFERENCES cfg_canales_notificacion(id_canal_notificacion)
        ON DELETE RESTRICT,

    CONSTRAINT fk_not_plantillas_usuario
        FOREIGN KEY (id_usuario_registro)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_not_plantillas_version
        CHECK (
            numero_version > 0
        ),

    CONSTRAINT chk_not_plantillas_contenido
        CHECK (
            CHAR_LENGTH(TRIM(contenido)) > 0
        ),

    CONSTRAINT chk_not_plantillas_fechas
        CHECK (
            fecha_hasta IS NULL
            OR fecha_hasta >= fecha_desde
        ),
	
    CONSTRAINT chk_not_plantillas_vigencia
    CHECK (
        vigente = FALSE
        OR (vigente = TRUE
            AND activo = TRUE
            AND fecha_hasta IS NULL
        )
    )
);
  
  -- TABLA NOT_PREFERENCIAS --
  CREATE TABLE IF NOT EXISTS not_preferencias (
id_preferencia BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_persona BIGINT NOT NULL,
    id_tipo_notificacion INT NOT NULL,
    id_canal_notificacion INT NOT NULL,

    habilitado BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_modificacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    id_usuario_modificacion BIGINT NULL,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_not_preferencias_persona_tipo_canal
        UNIQUE (
            id_persona,
            id_tipo_notificacion,
            id_canal_notificacion
        ),

    CONSTRAINT fk_not_preferencias_persona
        FOREIGN KEY (id_persona)
        REFERENCES core_personas(id_persona)
        ON DELETE RESTRICT,

    CONSTRAINT fk_not_preferencias_tipo
        FOREIGN KEY (id_tipo_notificacion)
        REFERENCES cfg_tipos_notificacion(id_tipo_notificacion)
        ON DELETE RESTRICT,

    CONSTRAINT fk_not_preferencias_canal
        FOREIGN KEY (id_canal_notificacion)
        REFERENCES cfg_canales_notificacion(id_canal_notificacion)
        ON DELETE RESTRICT,

    CONSTRAINT fk_not_preferencias_usuario
        FOREIGN KEY (id_usuario_modificacion)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT
);
  
  -- -------- 11. FINANZAS -----------
  
  -- TABLA FIN_CATEGORIAS --
  CREATE TABLE IF NOT EXISTS fin_categorias (
id_categoria BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_tipo_movimiento_financiero INT NOT NULL,

    id_categoria_padre BIGINT NULL,

    codigo VARCHAR(40) NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    descripcion VARCHAR(255),

    orden INT NOT NULL DEFAULT 0,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_fin_categorias_codigo
        UNIQUE (codigo),
        
	CONSTRAINT uk_fin_categorias_categoria_tipo
        UNIQUE (id_categoria, id_tipo_movimiento_financiero),

    CONSTRAINT fk_fin_categorias_tipo_movimiento
        FOREIGN KEY (id_tipo_movimiento_financiero)
        REFERENCES cfg_tipos_movimiento_financiero(id_tipo_movimiento_financiero)
        ON DELETE RESTRICT,

    CONSTRAINT fk_fin_categorias_padre_tipo
        FOREIGN KEY (id_categoria_padre, id_tipo_movimiento_financiero)
        REFERENCES fin_categorias(id_categoria, id_tipo_movimiento_financiero)
        ON DELETE RESTRICT
);
  
  -- TABLA FIN_CUENTAS_FINANCIERAS --
  CREATE TABLE IF NOT EXISTS fin_cuentas_financieras (
id_cuenta_financiera BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_tipo_cuenta_financiera INT NOT NULL,
    id_moneda INT NOT NULL,

    codigo VARCHAR(40) NOT NULL,
    nombre VARCHAR(120) NOT NULL,

    entidad_financiera VARCHAR(120) NULL,

    numero_cuenta VARCHAR(80) NULL,
    cci VARCHAR(40) NULL,

    titular VARCHAR(180) NULL,

    permite_ingresos BOOLEAN NOT NULL DEFAULT TRUE,
    permite_egresos BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_apertura DATE NULL,
    fecha_cierre DATE NULL,

    observaciones VARCHAR(500),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    id_usuario_registro BIGINT NULL,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_fin_cuentas_financieras_codigo
        UNIQUE (codigo),

    CONSTRAINT fk_fin_cuentas_financieras_tipo
        FOREIGN KEY (id_tipo_cuenta_financiera)
        REFERENCES cfg_tipos_cuenta_financiera(id_tipo_cuenta_financiera)
        ON DELETE RESTRICT,

    CONSTRAINT fk_fin_cuentas_financieras_moneda
        FOREIGN KEY (id_moneda)
        REFERENCES cfg_monedas(id_moneda)
        ON DELETE RESTRICT,

    CONSTRAINT fk_fin_cuentas_financieras_usuario
        FOREIGN KEY (id_usuario_registro)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_fin_cuentas_financieras_fechas
        CHECK (
            fecha_cierre IS NULL
            OR fecha_apertura IS NULL
            OR fecha_cierre >= fecha_apertura
        )
);
  
  -- TABLA FIN_MOVIMIENTOS --
  CREATE TABLE IF NOT EXISTS fin_movimientos (
id_movimiento BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_categoria BIGINT NOT NULL,
    id_cuenta_financiera BIGINT NOT NULL,
    id_estado_movimiento_financiero INT NOT NULL,

    id_pago BIGINT NULL,
    id_comision BIGINT NULL,

    codigo VARCHAR(40) NOT NULL,

    monto DECIMAL(14,2) NOT NULL,

    fecha_movimiento TIMESTAMPTZ(6) NOT NULL,

    numero_operacion VARCHAR(100) NULL,

    concepto VARCHAR(180) NOT NULL,
    descripcion VARCHAR(500) NULL,

    id_usuario_registro BIGINT NULL,

    id_usuario_confirmacion BIGINT NULL,
    fecha_confirmacion TIMESTAMPTZ(6) NULL,

    id_usuario_anulacion BIGINT NULL,
    fecha_anulacion TIMESTAMPTZ(6) NULL,
    motivo_anulacion VARCHAR(255) NULL,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_fin_movimientos_codigo
        UNIQUE (codigo),

    CONSTRAINT uk_fin_movimientos_pago
        UNIQUE (id_pago),

    CONSTRAINT uk_fin_movimientos_comision
        UNIQUE (id_comision),

    CONSTRAINT fk_fin_movimientos_categoria
        FOREIGN KEY (id_categoria)
        REFERENCES fin_categorias(id_categoria)
        ON DELETE RESTRICT,

    CONSTRAINT fk_fin_movimientos_cuenta
        FOREIGN KEY (id_cuenta_financiera)
        REFERENCES fin_cuentas_financieras(id_cuenta_financiera)
        ON DELETE RESTRICT,

    CONSTRAINT fk_fin_movimientos_estado
        FOREIGN KEY (id_estado_movimiento_financiero)
        REFERENCES cfg_estados_movimiento_financiero(id_estado_movimiento_financiero)
        ON DELETE RESTRICT,

    CONSTRAINT fk_fin_movimientos_pago
        FOREIGN KEY (id_pago)
        REFERENCES pag_pagos(id_pago)
        ON DELETE RESTRICT,

    CONSTRAINT fk_fin_movimientos_comision
        FOREIGN KEY (id_comision)
        REFERENCES com_comisiones(id_comision)
        ON DELETE RESTRICT,

    CONSTRAINT fk_fin_movimientos_usuario_registro
        FOREIGN KEY (id_usuario_registro)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_fin_movimientos_usuario_confirmacion
        FOREIGN KEY (id_usuario_confirmacion)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_fin_movimientos_usuario_anulacion
        FOREIGN KEY (id_usuario_anulacion)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_fin_movimientos_monto
        CHECK (
            monto > 0
        ),

    CONSTRAINT chk_fin_movimientos_origen
        CHECK (
            NOT (
                id_pago IS NOT NULL
                AND id_comision IS NOT NULL
            )
        ),

    CONSTRAINT chk_fin_movimientos_confirmacion
        CHECK (
            (
                fecha_confirmacion IS NULL
                AND id_usuario_confirmacion IS NULL
            )
            OR
            (
                fecha_confirmacion IS NOT NULL
                AND id_usuario_confirmacion IS NOT NULL
            )
        ),

    CONSTRAINT chk_fin_movimientos_fecha_confirmacion
        CHECK (
            fecha_confirmacion IS NULL
            OR fecha_confirmacion >= fecha_creacion
        ),

    CONSTRAINT chk_fin_movimientos_anulacion
        CHECK (
            (
                fecha_anulacion IS NULL
                AND id_usuario_anulacion IS NULL
                AND motivo_anulacion IS NULL
            )
            OR
            (
                fecha_anulacion IS NOT NULL
                AND id_usuario_anulacion IS NOT NULL
                AND motivo_anulacion IS NOT NULL
                AND CHAR_LENGTH(TRIM(motivo_anulacion)) > 0
            )
        ),

    CONSTRAINT chk_fin_movimientos_fecha_anulacion
        CHECK (
            fecha_anulacion IS NULL
            OR fecha_anulacion >= fecha_creacion
        )
);
  
  -- TABLA FIN_TRANSFERENCIAS --
  CREATE TABLE IF NOT EXISTS fin_transferencias (
id_transferencia BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_cuenta_origen BIGINT NOT NULL,
    id_cuenta_destino BIGINT NOT NULL,

    id_estado_movimiento_financiero INT NOT NULL,

    codigo VARCHAR(40) NOT NULL,

    monto_origen DECIMAL(14,2) NOT NULL,
    monto_destino DECIMAL(14,2) NOT NULL,

    tipo_cambio DECIMAL(14,6) NULL,

    fecha_transferencia TIMESTAMPTZ(6) NOT NULL,

    numero_operacion VARCHAR(100) NULL,

    concepto VARCHAR(180) NOT NULL,
    observaciones VARCHAR(500) NULL,

    id_usuario_registro BIGINT NULL,

    id_usuario_confirmacion BIGINT NULL,
    fecha_confirmacion TIMESTAMPTZ(6) NULL,

    id_usuario_anulacion BIGINT NULL,
    fecha_anulacion TIMESTAMPTZ(6) NULL,
    motivo_anulacion VARCHAR(255) NULL,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_fin_transferencias_codigo
        UNIQUE (codigo),

    CONSTRAINT fk_fin_transferencias_cuenta_origen
        FOREIGN KEY (id_cuenta_origen)
        REFERENCES fin_cuentas_financieras(id_cuenta_financiera)
        ON DELETE RESTRICT,

    CONSTRAINT fk_fin_transferencias_cuenta_destino
        FOREIGN KEY (id_cuenta_destino)
        REFERENCES fin_cuentas_financieras(id_cuenta_financiera)
        ON DELETE RESTRICT,

    CONSTRAINT fk_fin_transferencias_estado
        FOREIGN KEY (id_estado_movimiento_financiero)
        REFERENCES cfg_estados_movimiento_financiero(id_estado_movimiento_financiero)
        ON DELETE RESTRICT,

    CONSTRAINT fk_fin_transferencias_usuario_registro
        FOREIGN KEY (id_usuario_registro)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_fin_transferencias_usuario_confirmacion
        FOREIGN KEY (id_usuario_confirmacion)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_fin_transferencias_usuario_anulacion
        FOREIGN KEY (id_usuario_anulacion)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_fin_transferencias_cuentas
        CHECK (
            id_cuenta_origen <> id_cuenta_destino
        ),

    CONSTRAINT chk_fin_transferencias_monto_origen
        CHECK (
            monto_origen > 0
        ),

    CONSTRAINT chk_fin_transferencias_monto_destino
        CHECK (
            monto_destino > 0
        ),

    CONSTRAINT chk_fin_transferencias_tipo_cambio
        CHECK (
            tipo_cambio IS NULL
            OR tipo_cambio > 0
        ),

    CONSTRAINT chk_fin_transferencias_confirmacion
        CHECK (
            (
                fecha_confirmacion IS NULL
                AND id_usuario_confirmacion IS NULL
            )
            OR
            (
                fecha_confirmacion IS NOT NULL
                AND id_usuario_confirmacion IS NOT NULL
            )
        ),

    CONSTRAINT chk_fin_transferencias_fecha_confirmacion
        CHECK (
            fecha_confirmacion IS NULL
            OR fecha_confirmacion >= fecha_creacion
        ),

    CONSTRAINT chk_fin_transferencias_anulacion
        CHECK (
            (
                fecha_anulacion IS NULL
                AND id_usuario_anulacion IS NULL
                AND motivo_anulacion IS NULL
            )
            OR
            (
                fecha_anulacion IS NOT NULL
                AND id_usuario_anulacion IS NOT NULL
                AND motivo_anulacion IS NOT NULL
                AND CHAR_LENGTH(TRIM(motivo_anulacion)) > 0
            )
        ),

    CONSTRAINT chk_fin_transferencias_fecha_anulacion
        CHECK (
            fecha_anulacion IS NULL
            OR fecha_anulacion >= fecha_creacion
        )
);
  
  -- TABLA FIN_SALDOS_INICIALES --
  CREATE TABLE IF NOT EXISTS fin_saldos_iniciales (
id_saldo_inicial BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_cuenta_financiera BIGINT NOT NULL,

    saldo_inicial DECIMAL(14,2) NOT NULL,

    fecha_saldo TIMESTAMPTZ(6) NOT NULL,

    observaciones VARCHAR(500) NULL,

    id_usuario_registro BIGINT NULL,

    fecha_creacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    fecha_actualizacion TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uk_fin_saldos_iniciales_cuenta
        UNIQUE (id_cuenta_financiera),

    CONSTRAINT fk_fin_saldos_iniciales_cuenta
        FOREIGN KEY (id_cuenta_financiera)
        REFERENCES fin_cuentas_financieras(id_cuenta_financiera)
        ON DELETE RESTRICT,

    CONSTRAINT fk_fin_saldos_iniciales_usuario
        FOREIGN KEY (id_usuario_registro)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT
);
 
 
-- ----- 12. AUDITORIA --------
  -- tabla aud_eventos --
 CREATE TABLE IF NOT EXISTS aud_eventos (
id_evento BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_usuario BIGINT NULL,

    modulo VARCHAR(50) NOT NULL,
    accion VARCHAR(80) NOT NULL,

    entidad VARCHAR(80) NULL,
    id_entidad VARCHAR(80) NULL,

    resultado VARCHAR(30) NOT NULL DEFAULT 'EXITOSO',

    descripcion VARCHAR(1000) NULL,

    ip_origen VARCHAR(45) NULL,
    user_agent VARCHAR(500) NULL,

    request_id VARCHAR(100) NULL,

    metodo_http VARCHAR(10) NULL,
    ruta VARCHAR(500) NULL,

    datos_antes JSONB NULL,
    datos_despues JSONB NULL,
    datos_contexto JSONB NULL,

    fecha_evento TIMESTAMPTZ(6) NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT fk_aud_eventos_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_aud_eventos_modulo
        CHECK (
            CHAR_LENGTH(TRIM(modulo)) > 0
        ),

    CONSTRAINT chk_aud_eventos_accion
        CHECK (
            CHAR_LENGTH(TRIM(accion)) > 0
        ),

    CONSTRAINT chk_aud_eventos_resultado
        CHECK (
            resultado IN (
                'EXITOSO',
                'FALLIDO',
                'DENEGADO'
            )
        ),

    CONSTRAINT chk_aud_eventos_entidad
        CHECK (
            id_entidad IS NULL
            OR (
                entidad IS NOT NULL
                AND CHAR_LENGTH(TRIM(entidad)) > 0
            )
        )
);

-- ============================================================================
-- ÍNDICES ADICIONALES (OPTIMIZACIÓN DE BÚSQUEDAS)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_core_personas_nombres ON core_personas (apellido_paterno, apellido_materno, nombres);
CREATE INDEX IF NOT EXISTS idx_core_personas_documentos_persona ON core_personas_documentos (id_persona);
CREATE INDEX IF NOT EXISTS idx_core_personas_documentos_numero ON core_personas_documentos (numero_documento);
CREATE INDEX IF NOT EXISTS idx_core_personas_contactos_persona ON core_personas_contactos (id_persona);
CREATE INDEX IF NOT EXISTS idx_core_personas_contactos_valor ON core_personas_contactos (valor);
CREATE INDEX IF NOT EXISTS idx_core_personas_direcciones_persona ON core_personas_direcciones (id_persona);
CREATE INDEX IF NOT EXISTS idx_seg_usuarios_estado ON seg_usuarios (id_estado_usuario);
CREATE INDEX IF NOT EXISTS idx_seg_usuarios_roles_rol ON seg_usuarios_roles (id_rol);
CREATE INDEX IF NOT EXISTS idx_seg_tokens_recuperacion_usuario ON seg_tokens_recuperacion (id_usuario);
CREATE INDEX IF NOT EXISTS idx_seg_tokens_recuperacion_expiracion ON seg_tokens_recuperacion (fecha_expiracion);
CREATE INDEX IF NOT EXISTS idx_seg_sesiones_usuario ON seg_sesiones (id_usuario);
CREATE INDEX IF NOT EXISTS idx_seg_sesiones_expiracion ON seg_sesiones (fecha_expiracion);
CREATE INDEX IF NOT EXISTS idx_inm_zonas_proyecto ON inm_zonas (id_proyecto);
CREATE INDEX IF NOT EXISTS idx_inm_etapas_comerciales_proyecto ON inm_etapas_comerciales (id_proyecto);
CREATE INDEX IF NOT EXISTS idx_inm_tarifas_proyecto_zona_etapa ON inm_tarifas_zona_etapa (id_proyecto, id_zona, id_etapa_comercial);
CREATE INDEX IF NOT EXISTS idx_inm_tarifas_moneda ON inm_tarifas_zona_etapa (id_moneda);
CREATE INDEX IF NOT EXISTS idx_inm_tarifas_vigencia ON inm_tarifas_zona_etapa (fecha_desde, fecha_hasta);
CREATE INDEX IF NOT EXISTS idx_inm_ajustes_tipo_proyecto ON inm_ajustes_tipo_lote (id_proyecto);
CREATE INDEX IF NOT EXISTS idx_inm_ajustes_tipo_lote ON inm_ajustes_tipo_lote (id_tipo_lote);
CREATE INDEX IF NOT EXISTS idx_inm_ajustes_tipo_vigencia ON inm_ajustes_tipo_lote (id_proyecto, id_tipo_lote, fecha_desde);
CREATE INDEX IF NOT EXISTS idx_inm_lotes_zona ON inm_lotes (id_zona);
CREATE INDEX IF NOT EXISTS idx_inm_lotes_proyecto ON inm_lotes (id_proyecto);
CREATE INDEX IF NOT EXISTS idx_inm_lotes_precios_lote_fecha ON inm_lotes_precios (id_lote, fecha_desde);
CREATE INDEX IF NOT EXISTS idx_inm_lotes_precios_moneda ON inm_lotes_precios (id_moneda);
CREATE INDEX IF NOT EXISTS idx_inm_lotes_precios_tarifa ON inm_lotes_precios (id_tarifa);
CREATE INDEX IF NOT EXISTS idx_inm_lotes_precios_ajuste_tipo ON inm_lotes_precios (id_ajuste_tipo_lote);
CREATE INDEX IF NOT EXISTS idx_inm_historial_lote_fecha ON inm_lotes_historial_estado (id_lote, fecha_cambio);
CREATE INDEX IF NOT EXISTS idx_inm_planos_interactivos_proyecto ON inm_planos_interactivos (id_proyecto);
CREATE INDEX IF NOT EXISTS idx_inm_planos_interactivos_etapa ON inm_planos_interactivos (id_etapa);
CREATE INDEX IF NOT EXISTS idx_inm_planos_interactivos_vigente ON inm_planos_interactivos (vigente);
CREATE INDEX IF NOT EXISTS idx_inm_lotes_geometrias_proyecto ON inm_lotes_geometrias (id_proyecto);
CREATE INDEX IF NOT EXISTS idx_inm_lotes_geometrias_plano ON inm_lotes_geometrias (id_plano_interactivo);
CREATE INDEX IF NOT EXISTS idx_inm_lotes_geometrias_lote ON inm_lotes_geometrias (id_lote);
CREATE INDEX IF NOT EXISTS idx_inm_lotes_geometrias_plano_visible ON inm_lotes_geometrias (id_plano_interactivo, visible);
CREATE INDEX IF NOT EXISTS idx_inm_lotes_geometrias_plano_orden ON inm_lotes_geometrias (id_plano_interactivo, orden_capa);
CREATE INDEX IF NOT EXISTS idx_crm_prospectos_estado ON crm_prospectos (id_estado_prospecto);
CREATE INDEX IF NOT EXISTS idx_crm_prospectos_origen ON crm_prospectos (id_origen_prospecto);
CREATE INDEX IF NOT EXISTS idx_crm_prospectos_fecha ON crm_prospectos (fecha_registro);
CREATE INDEX IF NOT EXISTS idx_crm_intereses_prospecto ON crm_prospectos_intereses (id_prospecto);
CREATE INDEX IF NOT EXISTS idx_crm_intereses_proyecto ON crm_prospectos_intereses (id_proyecto);
CREATE INDEX IF NOT EXISTS idx_crm_intereses_moneda ON crm_prospectos_intereses (id_moneda);
CREATE INDEX IF NOT EXISTS idx_crm_seguimientos_prospecto_fecha ON crm_seguimientos (id_prospecto, fecha_seguimiento);
CREATE INDEX IF NOT EXISTS idx_crm_seguimientos_proximo ON crm_seguimientos (fecha_proximo_seguimiento);
CREATE INDEX IF NOT EXISTS idx_crm_clientes_fecha_alta ON crm_clientes (fecha_alta);
CREATE INDEX IF NOT EXISTS idx_crm_consentimientos_persona_tipo ON crm_consentimientos (id_persona, id_tipo_consentimiento);
CREATE INDEX IF NOT EXISTS idx_ven_reservas_lote ON ven_reservas (id_lote);
CREATE INDEX IF NOT EXISTS idx_ven_reservas_persona ON ven_reservas (id_persona);
CREATE INDEX IF NOT EXISTS idx_ven_reservas_estado ON ven_reservas (id_estado_reserva);
CREATE INDEX IF NOT EXISTS idx_ven_reservas_vencimiento ON ven_reservas (fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_ven_reservas_lote_estado ON ven_reservas (id_lote, id_estado_reserva);
CREATE INDEX IF NOT EXISTS idx_ven_ventas_lote ON ven_ventas (id_lote);
CREATE INDEX IF NOT EXISTS idx_ven_ventas_reserva_lote ON ven_ventas (id_reserva, id_lote);
CREATE INDEX IF NOT EXISTS idx_ven_ventas_estado ON ven_ventas (id_estado_venta);
CREATE INDEX IF NOT EXISTS idx_ven_ventas_modalidad ON ven_ventas (id_modalidad_venta);
CREATE INDEX IF NOT EXISTS idx_ven_ventas_fecha ON ven_ventas (fecha_venta);
CREATE INDEX IF NOT EXISTS idx_ven_ventas_clientes_cliente ON ven_ventas_clientes (id_cliente);
CREATE INDEX IF NOT EXISTS idx_ven_contratos_venta ON ven_contratos (id_venta);
CREATE INDEX IF NOT EXISTS idx_ven_contratos_tipo ON ven_contratos (id_tipo_contrato);
CREATE INDEX IF NOT EXISTS idx_ven_contratos_archivos_contrato ON ven_contratos_archivos (id_contrato);
CREATE INDEX IF NOT EXISTS idx_ven_contratos_archivos_contrato_vigente ON ven_contratos_archivos (id_contrato, vigente);
CREATE INDEX IF NOT EXISTS idx_ven_contratos_archivos_visible ON ven_contratos_archivos (visible_cliente);
CREATE INDEX IF NOT EXISTS idx_ven_contratos_archivos_publicacion ON ven_contratos_archivos (fecha_publicacion_cliente);
CREATE INDEX IF NOT EXISTS idx_pag_planes_pago_venta ON pag_planes_pago (id_venta);
CREATE INDEX IF NOT EXISTS idx_pag_planes_pago_estado ON pag_planes_pago (id_estado_plan_pago);
CREATE INDEX IF NOT EXISTS idx_pag_planes_pago_vigente ON pag_planes_pago (id_venta, es_vigente);
CREATE INDEX IF NOT EXISTS idx_pag_cuotas_plan ON pag_cuotas (id_plan_pago);
CREATE INDEX IF NOT EXISTS idx_pag_cuotas_estado ON pag_cuotas (id_estado_cuota);
CREATE INDEX IF NOT EXISTS idx_pag_cuotas_vencimiento ON pag_cuotas (fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_pag_cuotas_plan_vencimiento ON pag_cuotas (id_plan_pago, fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_pag_pagos_reserva ON pag_pagos (id_reserva);
CREATE INDEX IF NOT EXISTS idx_pag_pagos_venta ON pag_pagos (id_venta);
CREATE INDEX IF NOT EXISTS idx_pag_pagos_plan ON pag_pagos (id_plan_pago);
CREATE INDEX IF NOT EXISTS idx_pag_pagos_estado ON pag_pagos (id_estado_pago);
CREATE INDEX IF NOT EXISTS idx_pag_pagos_metodo ON pag_pagos (id_metodo_pago);
CREATE INDEX IF NOT EXISTS idx_pag_pagos_fecha_operacion ON pag_pagos (fecha_operacion);
CREATE INDEX IF NOT EXISTS idx_pag_pagos_numero_operacion ON pag_pagos (numero_operacion);
CREATE INDEX IF NOT EXISTS idx_pag_aplicaciones_pago_pago_plan ON pag_aplicaciones_pago (id_pago, id_plan_pago);
CREATE INDEX IF NOT EXISTS idx_pag_aplicaciones_pago_cuota_plan ON pag_aplicaciones_pago (id_cuota, id_plan_pago);
CREATE INDEX IF NOT EXISTS idx_pag_aplicaciones_pago_plan ON pag_aplicaciones_pago (id_plan_pago);
CREATE INDEX IF NOT EXISTS idx_pag_aplicaciones_pago_tipo ON pag_aplicaciones_pago (id_tipo_aplicacion_pago);
CREATE INDEX IF NOT EXISTS idx_pag_aplicaciones_pago_fecha ON pag_aplicaciones_pago (fecha_aplicacion);
CREATE INDEX IF NOT EXISTS idx_pag_vouchers_pago ON pag_vouchers (id_pago);
CREATE INDEX IF NOT EXISTS idx_pag_vouchers_estado ON pag_vouchers (id_estado_voucher);
CREATE INDEX IF NOT EXISTS idx_pag_vouchers_fecha_carga ON pag_vouchers (fecha_carga);
CREATE INDEX IF NOT EXISTS idx_pag_vouchers_hash ON pag_vouchers (hash_sha256);
CREATE INDEX IF NOT EXISTS idx_pag_plan_historial_plan_fecha ON pag_planes_pago_historial_estado (id_plan_pago, fecha_cambio);
CREATE INDEX IF NOT EXISTS idx_pag_plan_historial_estado_nuevo ON pag_planes_pago_historial_estado (id_estado_nuevo);
CREATE INDEX IF NOT EXISTS idx_pag_plan_historial_usuario ON pag_planes_pago_historial_estado (id_usuario_cambio);
CREATE INDEX IF NOT EXISTS idx_com_asesores_tipo ON com_asesores (id_tipo_asesor);
CREATE INDEX IF NOT EXISTS idx_com_asesores_estado ON com_asesores (id_estado_asesor);
CREATE INDEX IF NOT EXISTS idx_com_asesores_tipo_estado ON com_asesores (id_tipo_asesor, id_estado_asesor);
CREATE INDEX IF NOT EXISTS idx_com_asignaciones_prospecto_prospecto_fecha ON com_asignaciones_prospecto (id_prospecto, fecha_asignacion);
CREATE INDEX IF NOT EXISTS idx_com_asignaciones_prospecto_asesor ON com_asignaciones_prospecto (id_asesor);
CREATE INDEX IF NOT EXISTS idx_com_asignaciones_prospecto_asesor_fecha ON com_asignaciones_prospecto (id_asesor, fecha_asignacion);
CREATE INDEX IF NOT EXISTS idx_com_ventas_asesores_venta ON com_ventas_asesores (id_venta);
CREATE INDEX IF NOT EXISTS idx_com_ventas_asesores_asesor ON com_ventas_asesores (id_asesor);
CREATE INDEX IF NOT EXISTS idx_com_ventas_asesores_asesor_fecha ON com_ventas_asesores (id_asesor, fecha_asignacion);
CREATE INDEX IF NOT EXISTS idx_com_reglas_comision_proyecto ON com_reglas_comision (id_proyecto);
CREATE INDEX IF NOT EXISTS idx_com_reglas_comision_tipo_asesor ON com_reglas_comision (id_tipo_asesor);
CREATE INDEX IF NOT EXISTS idx_com_reglas_comision_modalidad ON com_reglas_comision (id_modalidad_venta);
CREATE INDEX IF NOT EXISTS idx_com_reglas_comision_vigencia ON com_reglas_comision (fecha_desde, fecha_hasta);
CREATE INDEX IF NOT EXISTS idx_com_reglas_comision_busqueda ON com_reglas_comision (id_proyecto, id_tipo_asesor, id_modalidad_venta, activo);
CREATE INDEX IF NOT EXISTS idx_com_comisiones_venta_asesor ON com_comisiones (id_venta_asesor);
CREATE INDEX IF NOT EXISTS idx_com_comisiones_regla ON com_comisiones (id_regla_comision);
CREATE INDEX IF NOT EXISTS idx_com_comisiones_estado ON com_comisiones (id_estado_comision);
CREATE INDEX IF NOT EXISTS idx_com_comisiones_fecha_generacion ON com_comisiones (fecha_generacion);
CREATE INDEX IF NOT EXISTS idx_com_comisiones_estado_fecha ON com_comisiones (id_estado_comision, fecha_generacion);
CREATE INDEX IF NOT EXISTS idx_cms_paginas_estado ON cms_paginas (id_estado_publicacion);
CREATE INDEX IF NOT EXISTS idx_cms_paginas_menu ON cms_paginas (mostrar_menu, orden);
CREATE INDEX IF NOT EXISTS idx_cms_paginas_publicacion ON cms_paginas (fecha_publicacion);
CREATE INDEX IF NOT EXISTS idx_cms_secciones_pagina ON cms_secciones (id_pagina);
CREATE INDEX IF NOT EXISTS idx_cms_secciones_tipo ON cms_secciones (id_tipo_seccion);
CREATE INDEX IF NOT EXISTS idx_cms_secciones_pagina_orden ON cms_secciones (id_pagina, orden);
CREATE INDEX IF NOT EXISTS idx_cms_secciones_visible ON cms_secciones (visible, activo);
CREATE INDEX IF NOT EXISTS idx_cms_seccion_items_seccion ON cms_seccion_items (id_seccion);
CREATE INDEX IF NOT EXISTS idx_cms_seccion_items_seccion_orden ON cms_seccion_items (id_seccion, orden);
CREATE INDEX IF NOT EXISTS idx_cms_seccion_items_visible ON cms_seccion_items (visible, activo);
CREATE INDEX IF NOT EXISTS idx_cms_multimedia_tipo ON cms_multimedia (id_tipo_multimedia);
CREATE INDEX IF NOT EXISTS idx_cms_multimedia_hash ON cms_multimedia (hash_sha256);
CREATE INDEX IF NOT EXISTS idx_cms_multimedia_activo ON cms_multimedia (activo);
CREATE INDEX IF NOT EXISTS idx_cms_multimedia_fecha ON cms_multimedia (fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_cms_multimedia_asig_multimedia ON cms_multimedia_asignaciones (id_multimedia);
CREATE INDEX IF NOT EXISTS idx_cms_multimedia_asig_pagina_orden ON cms_multimedia_asignaciones (id_pagina, orden);
CREATE INDEX IF NOT EXISTS idx_cms_multimedia_asig_seccion_orden ON cms_multimedia_asignaciones (id_seccion, orden);
CREATE INDEX IF NOT EXISTS idx_cms_multimedia_asig_item_orden ON cms_multimedia_asignaciones (id_seccion_item, orden);
CREATE INDEX IF NOT EXISTS idx_cms_multimedia_asig_uso ON cms_multimedia_asignaciones (id_uso_multimedia);
CREATE INDEX IF NOT EXISTS idx_cms_proyectos_destacado ON cms_proyectos (destacado, orden);
CREATE INDEX IF NOT EXISTS idx_cms_proyectos_activo ON cms_proyectos (activo);
CREATE INDEX IF NOT EXISTS idx_cms_consultas_web_estado ON cms_consultas_web (id_estado_consulta_web);
CREATE INDEX IF NOT EXISTS idx_cms_consultas_web_proyecto ON cms_consultas_web (id_proyecto);
CREATE INDEX IF NOT EXISTS idx_cms_consultas_web_prospecto ON cms_consultas_web (id_prospecto);
CREATE INDEX IF NOT EXISTS idx_cms_consultas_web_fecha ON cms_consultas_web (fecha_recepcion);
CREATE INDEX IF NOT EXISTS idx_cms_consultas_web_estado_fecha ON cms_consultas_web (id_estado_consulta_web, fecha_recepcion);
CREATE INDEX IF NOT EXISTS idx_cms_consultas_web_correo ON cms_consultas_web (correo);
CREATE INDEX IF NOT EXISTS idx_cms_consultas_web_telefono ON cms_consultas_web (telefono);
CREATE INDEX IF NOT EXISTS idx_not_notificaciones_persona ON not_notificaciones (id_persona);
CREATE INDEX IF NOT EXISTS idx_not_notificaciones_persona_lectura ON not_notificaciones (id_persona, fecha_lectura);
CREATE INDEX IF NOT EXISTS idx_not_notificaciones_tipo ON not_notificaciones (id_tipo_notificacion);
CREATE INDEX IF NOT EXISTS idx_not_notificaciones_fecha ON not_notificaciones (fecha_generacion);
CREATE INDEX IF NOT EXISTS idx_not_notificaciones_activo ON not_notificaciones (activo);
CREATE INDEX IF NOT EXISTS idx_not_envios_notificacion ON not_envios (id_notificacion);
CREATE INDEX IF NOT EXISTS idx_not_envios_estado ON not_envios (id_estado_envio_notificacion);
CREATE INDEX IF NOT EXISTS idx_not_envios_canal ON not_envios (id_canal_notificacion);
CREATE INDEX IF NOT EXISTS idx_not_envios_programados ON not_envios (id_estado_envio_notificacion, fecha_programada);
CREATE INDEX IF NOT EXISTS idx_not_envios_ultimo_intento ON not_envios (fecha_ultimo_intento);
CREATE INDEX IF NOT EXISTS idx_not_plantillas_tipo ON not_plantillas (id_tipo_notificacion);
CREATE INDEX IF NOT EXISTS idx_not_plantillas_canal ON not_plantillas (id_canal_notificacion);
CREATE INDEX IF NOT EXISTS idx_not_plantillas_tipo_canal ON not_plantillas (id_tipo_notificacion, id_canal_notificacion);
CREATE INDEX IF NOT EXISTS idx_not_plantillas_vigencia ON not_plantillas (fecha_desde, fecha_hasta);
CREATE INDEX IF NOT EXISTS idx_not_preferencias_persona ON not_preferencias (id_persona);
CREATE INDEX IF NOT EXISTS idx_not_preferencias_tipo ON not_preferencias (id_tipo_notificacion);
CREATE INDEX IF NOT EXISTS idx_not_preferencias_canal ON not_preferencias (id_canal_notificacion);
CREATE INDEX IF NOT EXISTS idx_not_preferencias_persona_habilitado ON not_preferencias (id_persona, habilitado);
CREATE INDEX IF NOT EXISTS idx_fin_categorias_tipo ON fin_categorias (id_tipo_movimiento_financiero);
CREATE INDEX IF NOT EXISTS idx_fin_categorias_padre ON fin_categorias (id_categoria_padre);
CREATE INDEX IF NOT EXISTS idx_fin_categorias_tipo_activo ON fin_categorias (id_tipo_movimiento_financiero, activo);
CREATE INDEX IF NOT EXISTS idx_fin_cuentas_financieras_tipo ON fin_cuentas_financieras (id_tipo_cuenta_financiera);
CREATE INDEX IF NOT EXISTS idx_fin_cuentas_financieras_moneda ON fin_cuentas_financieras (id_moneda);
CREATE INDEX IF NOT EXISTS idx_fin_cuentas_financieras_activo ON fin_cuentas_financieras (activo);
CREATE INDEX IF NOT EXISTS idx_fin_cuentas_financieras_tipo_activo ON fin_cuentas_financieras (id_tipo_cuenta_financiera, activo);
CREATE INDEX IF NOT EXISTS idx_fin_movimientos_categoria ON fin_movimientos (id_categoria);
CREATE INDEX IF NOT EXISTS idx_fin_movimientos_cuenta ON fin_movimientos (id_cuenta_financiera);
CREATE INDEX IF NOT EXISTS idx_fin_movimientos_estado ON fin_movimientos (id_estado_movimiento_financiero);
CREATE INDEX IF NOT EXISTS idx_fin_movimientos_fecha ON fin_movimientos (fecha_movimiento);
CREATE INDEX IF NOT EXISTS idx_fin_movimientos_cuenta_fecha ON fin_movimientos (id_cuenta_financiera, fecha_movimiento);
CREATE INDEX IF NOT EXISTS idx_fin_movimientos_categoria_fecha ON fin_movimientos (id_categoria, fecha_movimiento);
CREATE INDEX IF NOT EXISTS idx_fin_transferencias_origen ON fin_transferencias (id_cuenta_origen);
CREATE INDEX IF NOT EXISTS idx_fin_transferencias_destino ON fin_transferencias (id_cuenta_destino);
CREATE INDEX IF NOT EXISTS idx_fin_transferencias_estado ON fin_transferencias (id_estado_movimiento_financiero);
CREATE INDEX IF NOT EXISTS idx_fin_transferencias_fecha ON fin_transferencias (fecha_transferencia);
CREATE INDEX IF NOT EXISTS idx_fin_transferencias_origen_fecha ON fin_transferencias (id_cuenta_origen, fecha_transferencia);
CREATE INDEX IF NOT EXISTS idx_fin_transferencias_destino_fecha ON fin_transferencias (id_cuenta_destino, fecha_transferencia);
CREATE INDEX IF NOT EXISTS idx_fin_saldos_iniciales_fecha ON fin_saldos_iniciales (fecha_saldo);
CREATE INDEX IF NOT EXISTS idx_aud_eventos_usuario_fecha ON aud_eventos (id_usuario, fecha_evento);
CREATE INDEX IF NOT EXISTS idx_aud_eventos_modulo_fecha ON aud_eventos (modulo, fecha_evento);
CREATE INDEX IF NOT EXISTS idx_aud_eventos_modulo_accion_fecha ON aud_eventos (modulo, accion, fecha_evento);
CREATE INDEX IF NOT EXISTS idx_aud_eventos_entidad ON aud_eventos (entidad, id_entidad, fecha_evento);
CREATE INDEX IF NOT EXISTS idx_aud_eventos_resultado_fecha ON aud_eventos (resultado, fecha_evento);
CREATE INDEX IF NOT EXISTS idx_aud_eventos_request ON aud_eventos (request_id);
CREATE INDEX IF NOT EXISTS idx_aud_eventos_ip_fecha ON aud_eventos (ip_origen, fecha_evento);
CREATE INDEX IF NOT EXISTS idx_aud_eventos_fecha ON aud_eventos (fecha_evento);