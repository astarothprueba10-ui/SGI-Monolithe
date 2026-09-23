-- SCRIPT DE CREACION DE TABLAS --
USE monolithe_db;

-- 01. CATALOGOS / CFG

-- TABLA cfg_estados_proyecto
CREATE TABLE cfg_estados_proyecto (
    id_estado_proyecto SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_estados_proyecto_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
-- TABLA cfg_estados_etapa
CREATE TABLE cfg_estados_etapa (
    id_estado_etapa SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_estados_etapa_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- TABLA cfg_estados_manzana
CREATE TABLE cfg_estados_manzana (
    id_estado_manzana SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_estados_manzana_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
-- TABLA cfg_estados_lote
CREATE TABLE cfg_estados_lote (
    id_estado_lote SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    permite_reserva BOOLEAN NOT NULL DEFAULT FALSE,
    permite_venta BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_estados_lote_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
-- TABLA CFG_TIPOS_LOTE
CREATE TABLE cfg_tipos_lote (
    id_tipo_lote SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_tipos_lote_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
-- TABLA CFG_MONEDAS
CREATE TABLE cfg_monedas (
    id_moneda SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo CHAR(3) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    simbolo VARCHAR(10),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_monedas_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_TIPOS_DOCUMENTO
CREATE TABLE cfg_tipos_documento (
    id_tipo_documento SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(20) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    longitud_minima SMALLINT UNSIGNED,
    longitud_maxima SMALLINT UNSIGNED,

    solo_numerico BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_tipos_documento_codigo
        UNIQUE (codigo),

    CONSTRAINT chk_cfg_tipos_documento_longitud
        CHECK (
            longitud_minima IS NULL
            OR longitud_maxima IS NULL
            OR longitud_maxima >= longitud_minima
        )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla cgf_tipos_tarifas ---
  CREATE TABLE cfg_tipos_tarifa (
    id_tipo_tarifa SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_tipos_tarifa_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla cfg_tipos_ajuste_precio --
  CREATE TABLE cfg_tipos_ajuste_precio (
    id_tipo_ajuste_precio SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_tipos_ajuste_precio_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla cfg_tipos_contacto
  CREATE TABLE cfg_tipos_contacto (
    id_tipo_contacto SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(20) NOT NULL,
    nombre VARCHAR(80) NOT NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_tipos_contacto_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
   -- TABLA CFG_ESTADOS-PROSPECTO
  CREATE TABLE cfg_estados_prospecto (
    id_estado_prospecto SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    es_estado_final BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_estados_prospecto_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_ORIGENES_PROSPECTO
  CREATE TABLE cfg_origenes_prospecto (
    id_origen_prospecto SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_origenes_prospecto_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- CFG_TIPOS_SEGUIMIENTO
CREATE TABLE cfg_tipos_seguimiento (
    id_tipo_seguimiento SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_tipos_seguimiento_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
    -- TABLA CFG_TIPOS_CONSENTIMIENTOS 
  CREATE TABLE cfg_tipos_consentimiento (
    id_tipo_consentimiento SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(40) NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_tipos_consentimiento_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
    -- TABLA CFG_ESTADOS_RESERVA
  CREATE TABLE cfg_estados_reserva (
    id_estado_reserva SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    es_final BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_estados_reserva_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_ESTADOS_VENTAS
  CREATE TABLE cfg_estados_venta (
    id_estado_venta SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    es_final BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_estados_venta_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla cfg_tipos_contrato --
  CREATE TABLE cfg_tipos_contrato (
    id_tipo_contrato SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(40) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_tipos_contrato_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_ESTADOS_CONTRATO
  CREATE TABLE cfg_estados_contrato (
    id_estado_contrato SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    es_final BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_estados_contrato_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
    -- tabla cfg_estados_usuario
  CREATE TABLE cfg_estados_usuario (
    id_estado_usuario SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    permite_acceso BOOLEAN NOT NULL DEFAULT TRUE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_estados_usuario_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla cfg_modalidades_venta
  CREATE TABLE cfg_modalidades_venta (
    id_modalidad_venta SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    requiere_plan_pago BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_modalidades_venta_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla cfg_estados_plan_pago --
  CREATE TABLE cfg_estados_plan_pago (
    id_estado_plan_pago SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    es_final BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_estados_plan_pago_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_ESTADOS_CUOTA --
  CREATE TABLE cfg_estados_cuota (
    id_estado_cuota SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    es_final BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_estados_cuota_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_METODOS_PAGO -- 
  CREATE TABLE cfg_metodos_pago (
    id_metodo_pago SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    requiere_numero_operacion BOOLEAN NOT NULL DEFAULT FALSE,
    requiere_voucher BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_metodos_pago_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_ESTADOS_VAUCHER
  CREATE TABLE cfg_estados_voucher (
    id_estado_voucher SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    es_final BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_estados_voucher_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_ESTADOS_PAGO --
  CREATE TABLE cfg_estados_pago (
    id_estado_pago SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    es_final BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_estados_pago_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
    -- CFG_TIPOS_APLICACION_PAGO --
  CREATE TABLE cfg_tipos_aplicacion_pago (
    id_tipo_aplicacion_pago SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_tipos_aplicacion_pago_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_TIPOS_ASESOR
  CREATE TABLE cfg_tipos_asesor (
    id_tipo_asesor SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_tipos_asesor_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_ESTADOS_ASESOR
  CREATE TABLE cfg_estados_asesor (
    id_estado_asesor SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    permite_operar BOOLEAN NOT NULL DEFAULT TRUE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_estados_asesor_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_TIPOS_CALCULO_COMISION
  CREATE TABLE cfg_tipos_calculo_comision (
    id_tipo_calculo_comision SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_tipos_calculo_comision_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_ESTADOS_COMISION
  CREATE TABLE cfg_estados_comision (
    id_estado_comision SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    es_final BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_estados_comision_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_ESTADOS_PUBLICACIONES 
  CREATE TABLE cfg_estados_publicacion (
    id_estado_publicacion SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    visible_publico BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_estados_publicacion_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_TIPOS DE SECCION --
CREATE TABLE cfg_tipos_seccion (
    id_tipo_seccion SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(40) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_tipos_seccion_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_TIPOS_MULTIMEDIA --
  CREATE TABLE cfg_tipos_multimedia (
    id_tipo_multimedia SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_tipos_multimedia_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_USOS_MULTIMEDIA --
  CREATE TABLE cfg_usos_multimedia (
    id_uso_multimedia SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_usos_multimedia_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- CFG_ESTADOS_CONSULTA_WEB --
  CREATE TABLE cfg_estados_consulta_web (
    id_estado_consulta_web SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    es_final BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_estados_consulta_web_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_TIPOS_NOTIFICACIÓN --
  CREATE TABLE cfg_tipos_notificacion (
    id_tipo_notificacion SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(40) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),
    permite_preferencia BOOLEAN NOT NULL DEFAULT TRUE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_tipos_notificacion_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_CANALES_NOTIFICACION --
  CREATE TABLE cfg_canales_notificacion (
    id_canal_notificacion SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_canales_notificacion_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
-- TABLA CFG_ESTADOS_ENVIO_NOTIFICACION --
CREATE TABLE cfg_estados_envio_notificacion (
    id_estado_envio_notificacion SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    es_final BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_estados_envio_notificacion_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
-- TABLA CFG_TIPOS_MOVIMIENTO_FINANCIERO --
CREATE TABLE cfg_tipos_movimiento_financiero (
    id_tipo_movimiento_financiero SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_tipos_movimiento_financiero_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_ESTADOS_MOVIMIENTO_FINANCIERO --
  CREATE TABLE cfg_estados_movimiento_financiero (
    id_estado_movimiento_financiero SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    es_final BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_estados_movimiento_financiero_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_TIPOS_CUENTA_FINANCIERA 
  CREATE TABLE cfg_tipos_cuenta_financiera (
    id_tipo_cuenta_financiera SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_cfg_tipos_cuenta_financiera_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
-- ----- 2. CORE DEL NEGOCIO --------

 -- TABLA CORE_PERSONAS 
  CREATE TABLE core_personas (
    id_persona BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    nombres VARCHAR(120) NOT NULL,
    apellido_paterno VARCHAR(80),
    apellido_materno VARCHAR(80),

    fecha_nacimiento DATE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    INDEX idx_core_personas_nombres (
        apellido_paterno,
        apellido_materno,
        nombres
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CORE_PERSONAS_DOCUMENTOS
  CREATE TABLE core_personas_documentos (
    id_persona_documento BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_persona BIGINT UNSIGNED NOT NULL,
    id_tipo_documento SMALLINT UNSIGNED NOT NULL,

    numero_documento VARCHAR(30) NOT NULL,

    pais_emision VARCHAR(100) DEFAULT 'Perú',

    fecha_emision DATE,
    fecha_vencimiento DATE,

    principal BOOLEAN NOT NULL DEFAULT FALSE,
    
    clave_documento_principal VARCHAR(100)
    GENERATED ALWAYS AS (
        CASE
            WHEN principal = TRUE
            THEN CONCAT(id_persona, '-', id_tipo_documento)
            ELSE NULL
        END
    ) STORED,
    
    verificado BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
        ),

    INDEX idx_core_personas_documentos_persona (
        id_persona
    ),

    INDEX idx_core_personas_documentos_numero (
        numero_documento
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CORE_PERSONAS_CONTACTOS
 CREATE TABLE core_personas_contactos (
    id_persona_contacto BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_persona BIGINT UNSIGNED NOT NULL,
    id_tipo_contacto SMALLINT UNSIGNED NOT NULL,

    valor VARCHAR(180) NOT NULL,

    principal BOOLEAN NOT NULL DEFAULT FALSE,
    clave_contacto_principal VARCHAR(100)
    GENERATED ALWAYS AS (
        CASE
            WHEN principal = TRUE
            THEN CONCAT(id_persona, '-', id_tipo_contacto)
            ELSE NULL
        END
    ) STORED,
    
    verificado BOOLEAN NOT NULL DEFAULT FALSE,
    permite_notificaciones BOOLEAN NOT NULL DEFAULT TRUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
        UNIQUE (clave_contacto_principal),

    INDEX idx_core_personas_contactos_persona (
        id_persona
    ),

    INDEX idx_core_personas_contactos_valor (
        valor
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  
  -- TABLA CORE_PERSONAS_DIRECCIONES
  CREATE TABLE core_personas_direcciones (
    id_persona_direccion BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_persona BIGINT UNSIGNED NOT NULL,

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
            THEN CONCAT(id_persona, '-',
                UPPER(TRIM(tipo))
            )
            ELSE NULL
        END
    ) STORED,
    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT fk_core_personas_direcciones_persona
        FOREIGN KEY (id_persona)
        REFERENCES core_personas(id_persona)
        ON DELETE RESTRICT,
	
    CONSTRAINT uk_core_personas_direcciones_principal
        UNIQUE (clave_direccion_principal),

    INDEX idx_core_personas_direcciones_persona (
        id_persona
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  
  -- ---- 3. SEGURIDAD -------------
    -- tabla seg_usuarios 
  CREATE TABLE seg_usuarios (
    id_usuario BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_persona BIGINT UNSIGNED NOT NULL,
    id_estado_usuario SMALLINT UNSIGNED NOT NULL,

    usuario_login VARCHAR(120) NOT NULL,

    password_hash VARCHAR(255) NOT NULL,

    requiere_cambio_password BOOLEAN NOT NULL DEFAULT TRUE,

    intentos_fallidos SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    bloqueado_hasta DATETIME(6),

    ultimo_acceso DATETIME(6),

    password_actualizado_en DATETIME(6),

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
        ON DELETE RESTRICT,

    INDEX idx_seg_usuarios_estado (
        id_estado_usuario
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla seg_roles --
  CREATE TABLE seg_roles (
    id_rol SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(40) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),

    es_sistema BOOLEAN NOT NULL DEFAULT FALSE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_seg_roles_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla Seg_permisos 
  CREATE TABLE seg_permisos (
    id_permiso SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(100) NOT NULL,

    modulo VARCHAR(50) NOT NULL,
    recurso VARCHAR(80) NOT NULL,
    accion VARCHAR(40) NOT NULL,

    nombre VARCHAR(150) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_seg_permisos_codigo
        UNIQUE (codigo),

    CONSTRAINT uk_seg_permisos_modulo_recurso_accion
        UNIQUE (
            modulo,
            recurso,
            accion
        )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla seg_usuarios_roles --
  CREATE TABLE seg_usuarios_roles (
    id_usuario_rol BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_usuario BIGINT UNSIGNED NOT NULL,
    id_rol SMALLINT UNSIGNED NOT NULL,

    fecha_asignacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_revocacion DATETIME(6),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    asignado_por BIGINT UNSIGNED,

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
        ),

    INDEX idx_seg_usuarios_roles_rol (
        id_rol
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla seg_roles_permisos
  CREATE TABLE seg_roles_permisos (
    id_rol_permiso BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_rol SMALLINT UNSIGNED NOT NULL,
    id_permiso SMALLINT UNSIGNED NOT NULL,

    fecha_asignacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    asignado_por BIGINT UNSIGNED,

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

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla seg_tokens_recuperación
  CREATE TABLE seg_tokens_recuperacion (
    id_token BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_usuario BIGINT UNSIGNED NOT NULL,

    token_hash CHAR(64) NOT NULL,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_expiracion DATETIME(6) NOT NULL,

    fecha_uso DATETIME(6),

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
        ),

    INDEX idx_seg_tokens_recuperacion_usuario
        (id_usuario),

    INDEX idx_seg_tokens_recuperacion_expiracion
        (fecha_expiracion)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla seg_sesiones
  CREATE TABLE seg_sesiones (
    id_sesion BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_usuario BIGINT UNSIGNED NOT NULL,

    refresh_token_hash CHAR(64) NOT NULL,

    ip_origen VARCHAR(45),
    user_agent VARCHAR(500),

    fecha_inicio DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    ultima_actividad DATETIME(6),

    fecha_expiracion DATETIME(6) NOT NULL,

    fecha_revocacion DATETIME(6),

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
        ),

    INDEX idx_seg_sesiones_usuario (
        id_usuario
    ),

    INDEX idx_seg_sesiones_expiracion (
        fecha_expiracion
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

 -- ---- 4. INMOBILIARIA ----------- 
-- TABLA inm_proyectos
CREATE TABLE inm_proyectos (
    id_proyecto BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_estado_proyecto SMALLINT UNSIGNED NOT NULL,

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

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;  
  
--  TABLA inm_etapas
CREATE TABLE inm_etapas (
    id_etapa BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_proyecto BIGINT UNSIGNED NOT NULL,
    id_estado_etapa SMALLINT UNSIGNED NOT NULL,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,

    numero_orden SMALLINT UNSIGNED NOT NULL DEFAULT 1,

    fecha_inicio DATE,
    fecha_fin_estimada DATE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
-- TABLA inm_manzanas
CREATE TABLE inm_manzanas (
    id_manzana BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_etapa BIGINT UNSIGNED NOT NULL,
	id_proyecto BIGINT UNSIGNED NOT NULL,
    id_estado_manzana SMALLINT UNSIGNED NOT NULL,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(100),

    descripcion VARCHAR(255),

    numero_orden SMALLINT UNSIGNED NOT NULL DEFAULT 1,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
-- TABLA INM_ZONAS
CREATE TABLE inm_zonas (
    id_zona BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_proyecto BIGINT UNSIGNED NOT NULL,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),

    numero_orden SMALLINT UNSIGNED NOT NULL DEFAULT 1,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
        ON DELETE RESTRICT,

    INDEX idx_inm_zonas_proyecto (
        id_proyecto
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla inm_etapas_comerciales --
  CREATE TABLE inm_etapas_comerciales (
    id_etapa_comercial BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_proyecto BIGINT UNSIGNED NOT NULL,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),

    numero_orden SMALLINT UNSIGNED NOT NULL DEFAULT 1,

    fecha_inicio DATE,
    fecha_fin DATE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
        ),

    INDEX idx_inm_etapas_comerciales_proyecto (
        id_proyecto
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla inm_tarifas_zona_etapa --
  CREATE TABLE inm_tarifas_zona_etapa (
    id_tarifa BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

	id_proyecto BIGINT UNSIGNED NOT NULL,
    id_zona BIGINT UNSIGNED NOT NULL,
    id_etapa_comercial BIGINT UNSIGNED NOT NULL,
    id_moneda SMALLINT UNSIGNED NOT NULL,
    id_tipo_tarifa SMALLINT UNSIGNED NOT NULL,

    valor DECIMAL(14,4) NOT NULL,

    fecha_desde DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_hasta DATETIME(6),

    observaciones VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    clave_tarifa_vigente VARCHAR(200)
    GENERATED ALWAYS AS (
        CASE
            WHEN activo = TRUE
                 AND fecha_hasta IS NULL
            THEN CONCAT(
                id_proyecto, '-',
                id_zona, '-',
                id_etapa_comercial, '-',
                id_moneda, '-',
                id_tipo_tarifa )
            ELSE NULL
        END
    ) STORED,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),
        
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
        ),

    INDEX idx_inm_tarifas_proyecto_zona_etapa (
    id_proyecto,
    id_zona,
    id_etapa_comercial
    ),

    INDEX idx_inm_tarifas_moneda (
        id_moneda
    ),

    INDEX idx_inm_tarifas_vigencia (
        fecha_desde,
        fecha_hasta
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA INM_AJUSTES_TIPO_LOTE
  CREATE TABLE inm_ajustes_tipo_lote (
    id_ajuste_tipo_lote BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_proyecto BIGINT UNSIGNED NOT NULL,
    id_tipo_lote SMALLINT UNSIGNED NOT NULL,
    id_tipo_ajuste_precio SMALLINT UNSIGNED NOT NULL,

    id_moneda SMALLINT UNSIGNED,

    valor DECIMAL(14,4) NOT NULL DEFAULT 0,

    fecha_desde DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_hasta DATETIME(6),

    observaciones VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    
    clave_ajuste_vigente VARCHAR(160)
    GENERATED ALWAYS AS (
        CASE
            WHEN activo = TRUE
                 AND fecha_hasta IS NULL
            THEN CONCAT(
                id_proyecto,
                '-',
                id_tipo_lote,
                '-',
                id_tipo_ajuste_precio,
                '-',
                COALESCE(id_moneda, 0)
            )
            ELSE NULL
        END
    ) STORED,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),
        
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
        ),

    INDEX idx_inm_ajustes_tipo_proyecto (
        id_proyecto
    ),

    INDEX idx_inm_ajustes_tipo_lote (
        id_tipo_lote
    ),

    INDEX idx_inm_ajustes_tipo_vigencia (
        id_proyecto,
        id_tipo_lote,
        fecha_desde
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
--  TABLA inm_lotes
CREATE TABLE inm_lotes (
    id_lote BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_manzana BIGINT UNSIGNED NOT NULL,
    id_zona BIGINT UNSIGNED NULL,
    id_proyecto BIGINT UNSIGNED NOT NULL,
    id_tipo_lote smallint UNSIGNED NULL,
    id_estado_lote SMALLINT UNSIGNED NOT NULL,

    codigo VARCHAR(40) NOT NULL,
    numero VARCHAR(20) NOT NULL,

    area_m2 DECIMAL(12,2) NOT NULL,

    frente_m DECIMAL(10,2),
    fondo_m DECIMAL(10,2),

    lateral_derecho_m DECIMAL(10,2),
    lateral_izquierdo_m DECIMAL(10,2),

    observaciones TEXT,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
        ),
	INDEX idx_inm_lotes_zona
			(id_zona),
	
    INDEX idx_inm_lotes_proyecto 
          (id_proyecto)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA inm_lotes_precios
CREATE TABLE inm_lotes_precios (
    id_lote_precio BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_lote BIGINT UNSIGNED NOT NULL,
    id_moneda SMALLINT UNSIGNED NOT NULL,

    id_tarifa BIGINT UNSIGNED NULL,
    id_ajuste_tipo_lote BIGINT UNSIGNED NULL,

    area_m2_aplicada DECIMAL(12,2) NULL,
    valor_tarifa_aplicado DECIMAL(14,4) NULL,

    precio_base DECIMAL(14,2) NULL,

    valor_ajuste_aplicado DECIMAL(14,4) NULL,
    monto_ajuste DECIMAL(14,2) NOT NULL DEFAULT 0,

    precio DECIMAL(14,2) NOT NULL,

    fecha_desde DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_hasta DATETIME(6),

    observaciones VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    
    clave_precio_vigente VARCHAR(100)
    GENERATED ALWAYS AS (
        CASE
            WHEN activo = TRUE
                 AND fecha_hasta IS NULL
            THEN CONCAT(
                id_lote,
                '-',
                id_moneda
            )
            ELSE NULL
        END
    ) STORED,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),
	
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
        ),

    INDEX idx_inm_lotes_precios_lote_fecha (
        id_lote,
        fecha_desde
    ),

    INDEX idx_inm_lotes_precios_moneda (
        id_moneda
    ),

    INDEX idx_inm_lotes_precios_tarifa (
        id_tarifa
    ),

    INDEX idx_inm_lotes_precios_ajuste_tipo (
        id_ajuste_tipo_lote
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- imn_lotes_historial_estado
  CREATE TABLE inm_lotes_historial_estado (
    id_historial BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_lote BIGINT UNSIGNED NOT NULL,

    id_estado_anterior SMALLINT UNSIGNED,
    id_estado_nuevo SMALLINT UNSIGNED NOT NULL,

    motivo VARCHAR(255),

    fecha_cambio DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    id_usuario BIGINT UNSIGNED,

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
       ON DELETE RESTRICT,

    INDEX idx_inm_historial_lote_fecha (
        id_lote,
        fecha_cambio
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA INM_PLANOS_INTERACTIVOS --
 CREATE TABLE inm_planos_interactivos (
    id_plano_interactivo BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_proyecto BIGINT UNSIGNED NOT NULL,
    id_etapa BIGINT UNSIGNED NULL,

    codigo VARCHAR(40) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion VARCHAR(500) NULL,

    numero_version SMALLINT UNSIGNED NOT NULL DEFAULT 1,

    id_etapa_version BIGINT UNSIGNED
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

    fecha_desde DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_hasta DATETIME(6) NULL,

    observaciones VARCHAR(500) NULL,

    id_usuario_registro BIGINT UNSIGNED NULL,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    id_proyecto_vigente BIGINT UNSIGNED
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
                THEN CONCAT(id_proyecto, '-', id_etapa)
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
            OR fecha_hasta IS NULL),

    INDEX idx_inm_planos_interactivos_proyecto 
		 (id_proyecto),

    INDEX idx_inm_planos_interactivos_etapa 
          (id_etapa),

    INDEX idx_inm_planos_interactivos_vigente 
           (vigente)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA INM_LOTES_GEOMETRIAS -- 
  CREATE TABLE inm_lotes_geometrias (
    id_lote_geometria BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_proyecto BIGINT UNSIGNED NOT NULL,
    id_plano_interactivo BIGINT UNSIGNED NOT NULL,
    id_lote BIGINT UNSIGNED NOT NULL,

    puntos JSON NOT NULL,

    etiqueta_x DECIMAL(12,4) NULL,
    etiqueta_y DECIMAL(12,4) NULL,

    rotacion_etiqueta DECIMAL(8,3) NOT NULL DEFAULT 0,

    orden_capa SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    visible BOOLEAN NOT NULL DEFAULT TRUE,
    interactivo BOOLEAN NOT NULL DEFAULT TRUE,

    observaciones VARCHAR(500) NULL,

    id_usuario_registro BIGINT UNSIGNED NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
            JSON_TYPE(puntos) = 'ARRAY'
            AND JSON_LENGTH(puntos) >= 3
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
        ),
        
	INDEX idx_inm_lotes_geometrias_proyecto 
	      (id_proyecto),

    INDEX idx_inm_lotes_geometrias_plano 
          (id_plano_interactivo ),

    INDEX idx_inm_lotes_geometrias_lote 
          (id_lote),

    INDEX idx_inm_lotes_geometrias_plano_visible (
        id_plano_interactivo,
        visible
    ),

    INDEX idx_inm_lotes_geometrias_plano_orden (
        id_plano_interactivo,
        orden_capa
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  

-- ------- 5. CRM -----------------------------------
  -- TABLA CRM_PROSPECTOS
  CREATE TABLE crm_prospectos (
    id_prospecto BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_persona BIGINT UNSIGNED NOT NULL,
    id_estado_prospecto SMALLINT UNSIGNED NOT NULL,
    id_origen_prospecto SMALLINT UNSIGNED NOT NULL,

    codigo VARCHAR(30) NOT NULL,

    fecha_registro DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_conversion DATETIME(6),

    observaciones TEXT,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
        ),

    INDEX idx_crm_prospectos_estado (
        id_estado_prospecto
    ),

    INDEX idx_crm_prospectos_origen (
        id_origen_prospecto
    ),

    INDEX idx_crm_prospectos_fecha (
        fecha_registro
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CRM_PROSECTOS_INTERESES 
  CREATE TABLE crm_prospectos_intereses (
    id_prospecto_interes BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_prospecto BIGINT UNSIGNED NOT NULL,
    id_proyecto BIGINT UNSIGNED NOT NULL,
    id_moneda SMALLINT UNSIGNED NULL,

    area_minima_m2 DECIMAL(12,2) NULL,
    area_maxima_m2 DECIMAL(12,2) NULL,

    presupuesto_minimo DECIMAL(14,2) NULL,
    presupuesto_maximo DECIMAL(14,2) NULL,

    requiere_financiamiento BOOLEAN NULL,

    comentario TEXT NULL,

    fecha_interes DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
        ),

    INDEX idx_crm_intereses_prospecto (
        id_prospecto
    ),

    INDEX idx_crm_intereses_proyecto (
        id_proyecto
    ),

    INDEX idx_crm_intereses_moneda (
        id_moneda
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CRM_SEGUIMIENTO
  CREATE TABLE crm_seguimientos (
    id_seguimiento BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_prospecto BIGINT UNSIGNED NOT NULL,
    id_tipo_seguimiento SMALLINT UNSIGNED NOT NULL,

    fecha_seguimiento DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    asunto VARCHAR(150),

    detalle TEXT,

    resultado VARCHAR(255),

    requiere_seguimiento BOOLEAN NOT NULL DEFAULT FALSE,

    fecha_proximo_seguimiento DATETIME(6),

    id_usuario_registro BIGINT UNSIGNED,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

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
        ),

    INDEX idx_crm_seguimientos_prospecto_fecha (
        id_prospecto,
        fecha_seguimiento
    ),

    INDEX idx_crm_seguimientos_proximo (
        fecha_proximo_seguimiento
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CRM_CLIENTES
  CREATE TABLE crm_clientes (
    id_cliente BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_persona BIGINT UNSIGNED NOT NULL,

    codigo VARCHAR(30) NOT NULL,

    fecha_alta DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    observaciones TEXT,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_crm_clientes_codigo
        UNIQUE (codigo),

    CONSTRAINT uk_crm_clientes_persona
        UNIQUE (id_persona),

    CONSTRAINT fk_crm_clientes_persona
        FOREIGN KEY (id_persona)
        REFERENCES core_personas(id_persona)
        ON DELETE RESTRICT,

    INDEX idx_crm_clientes_fecha_alta (
        fecha_alta
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  

  
  -- TABLA CRM_CONSENTIMIENTOS 
  CREATE TABLE crm_consentimientos (
    id_consentimiento BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_persona BIGINT UNSIGNED NOT NULL,
    id_tipo_consentimiento SMALLINT UNSIGNED NOT NULL,

    aceptado BOOLEAN NOT NULL,

    version_texto VARCHAR(30),

    origen VARCHAR(50),

    fecha_consentimiento DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_revocacion DATETIME(6),

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

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
        ),

    INDEX idx_crm_consentimientos_persona_tipo (
        id_persona,
        id_tipo_consentimiento
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
-- ---- 6. VENTAS ------------
  -- TABLA VEN_RESERVAS 
  CREATE TABLE ven_reservas (
    id_reserva BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_lote BIGINT UNSIGNED NOT NULL,
    id_persona BIGINT UNSIGNED NOT NULL,

    id_estado_reserva SMALLINT UNSIGNED NOT NULL,
    id_moneda SMALLINT UNSIGNED NOT NULL,

    codigo VARCHAR(30) NOT NULL,

    fecha_reserva DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_vencimiento DATETIME(6) NOT NULL,

    monto_reserva DECIMAL(14,2) NOT NULL DEFAULT 0,

    observaciones TEXT,

    id_usuario_registro BIGINT UNSIGNED NULL,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
        ),

    INDEX idx_ven_reservas_lote (
        id_lote
    ),

    INDEX idx_ven_reservas_persona (
        id_persona
    ),

    INDEX idx_ven_reservas_estado (
        id_estado_reserva
    ),

    INDEX idx_ven_reservas_vencimiento (
        fecha_vencimiento
    ),

    INDEX idx_ven_reservas_lote_estado (
        id_lote,
        id_estado_reserva
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA VEN_VENTAS 
 CREATE TABLE ven_ventas (
    id_venta BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_lote BIGINT UNSIGNED NOT NULL,
    id_reserva BIGINT UNSIGNED NULL,

    id_estado_venta SMALLINT UNSIGNED NOT NULL,
    id_modalidad_venta SMALLINT UNSIGNED NOT NULL,
    id_moneda SMALLINT UNSIGNED NOT NULL,

    codigo VARCHAR(30) NOT NULL,

    fecha_venta DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    precio_lista DECIMAL(14,2) NULL,
    descuento DECIMAL(14,2) NOT NULL DEFAULT 0,
    precio_venta DECIMAL(14,2) NOT NULL,

    observaciones TEXT,

    id_usuario_registro BIGINT UNSIGNED NULL,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
        ),

    INDEX idx_ven_ventas_lote (
        id_lote
    ),

    INDEX idx_ven_ventas_reserva_lote (
        id_reserva,
        id_lote
    ),

    INDEX idx_ven_ventas_estado (
        id_estado_venta
    ),

    INDEX idx_ven_ventas_modalidad (
        id_modalidad_venta
    ),

    INDEX idx_ven_ventas_fecha (
        fecha_venta
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA VEN_VENTAS_CLIENTES 
  CREATE TABLE ven_ventas_clientes (
    id_venta_cliente BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_venta BIGINT UNSIGNED NOT NULL,
    id_cliente BIGINT UNSIGNED NOT NULL,

    titular BOOLEAN NOT NULL DEFAULT FALSE,

    porcentaje_participacion DECIMAL(5,2) NOT NULL,
    
    id_venta_titular BIGINT UNSIGNED
    GENERATED ALWAYS AS (
        CASE
            WHEN titular = TRUE
            THEN id_venta
            ELSE NULL
        END
    ) STORED,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

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
    ),
    
    INDEX idx_ven_ventas_clientes_cliente (
        id_cliente
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA VEN_CONTRATOS 
  CREATE TABLE ven_contratos (
    id_contrato BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_venta BIGINT UNSIGNED NOT NULL,
    id_tipo_contrato SMALLINT UNSIGNED NOT NULL,
    id_estado_contrato SMALLINT UNSIGNED NOT NULL,

    codigo VARCHAR(40) NOT NULL,
    numero_contrato VARCHAR(50),

    fecha_emision DATE,
    fecha_firma DATE,

    fecha_inicio_vigencia DATE,
    fecha_fin_vigencia DATE,

    observaciones TEXT,

    id_usuario_registro BIGINT UNSIGNED,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
        ),

    INDEX idx_ven_contratos_venta (
        id_venta
    ),
    
    INDEX idx_ven_contratos_tipo (
          id_tipo_contrato
	)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA VEN_CONTRATOS_ARCHIVOS --
  CREATE TABLE ven_contratos_archivos (
    id_contrato_archivo BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_contrato BIGINT UNSIGNED NOT NULL,

    codigo VARCHAR(50) NOT NULL,

    numero_version SMALLINT UNSIGNED NOT NULL DEFAULT 1,

    nombre_documento VARCHAR(180) NOT NULL,

    nombre_archivo_original VARCHAR(255) NOT NULL,
    clave_archivo VARCHAR(500) NOT NULL,

    tipo_mime VARCHAR(120) NULL,
    tamano_bytes BIGINT UNSIGNED NULL,
    hash_archivo VARCHAR(128) NULL,

    vigente BOOLEAN NOT NULL DEFAULT TRUE,
    visible_cliente BOOLEAN NOT NULL DEFAULT FALSE,

    fecha_documento DATETIME(6) NULL,

    fecha_publicacion_cliente DATETIME(6) NULL,
    id_usuario_publicacion BIGINT UNSIGNED NULL,

    observaciones VARCHAR(500) NULL,

    id_usuario_carga BIGINT UNSIGNED NULL,

    fecha_carga DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    id_contrato_vigente BIGINT UNSIGNED
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
        ),

    INDEX idx_ven_contratos_archivos_contrato (
        id_contrato
    ),

    INDEX idx_ven_contratos_archivos_contrato_vigente (
        id_contrato,
        vigente
    ),

    INDEX idx_ven_contratos_archivos_visible (
        visible_cliente
    ),

    INDEX idx_ven_contratos_archivos_publicacion (
        fecha_publicacion_cliente
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- 7. PAGOS Y FINANCIAMIENTO --
  -- TABLA PAG_PLANES_PAGO
CREATE TABLE pag_planes_pago (
    id_plan_pago BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_venta BIGINT UNSIGNED NOT NULL,
    id_estado_plan_pago SMALLINT UNSIGNED NOT NULL,
    id_moneda SMALLINT UNSIGNED NOT NULL,

    codigo VARCHAR(40) NOT NULL,

    numero_version SMALLINT UNSIGNED NOT NULL DEFAULT 1,

    monto_venta DECIMAL(14,2) NOT NULL,
    monto_inicial DECIMAL(14,2) NOT NULL DEFAULT 0,
    capital_financiado DECIMAL(14,2) NOT NULL,

    tasa_interes_pct DECIMAL(9,6) NULL,

    monto_interes_total DECIMAL(14,2) NULL,
    monto_total_financiado DECIMAL(14,2) NULL,

    numero_cuotas SMALLINT UNSIGNED NOT NULL,

    fecha_inicio DATE NOT NULL,
    fecha_primera_cuota DATE NOT NULL,

    descripcion_condiciones VARCHAR(500),

    es_vigente BOOLEAN NOT NULL DEFAULT TRUE,

    id_venta_vigente BIGINT UNSIGNED
        GENERATED ALWAYS AS (
            CASE
                WHEN es_vigente = TRUE THEN id_venta
                ELSE NULL
            END
        ) STORED,

    fecha_cierre DATETIME(6) NULL,
    motivo_cierre VARCHAR(255),

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
    ),

    INDEX idx_pag_planes_pago_venta (
        id_venta
    ),

    INDEX idx_pag_planes_pago_estado (
        id_estado_plan_pago
    ),

    INDEX idx_pag_planes_pago_vigente (
        id_venta,
        es_vigente
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- TABLA PAG_CUOTAS --
CREATE TABLE pag_cuotas (
    id_cuota BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_plan_pago BIGINT UNSIGNED NOT NULL,
    id_estado_cuota SMALLINT UNSIGNED NOT NULL,

    numero_cuota SMALLINT UNSIGNED NOT NULL,

    fecha_vencimiento DATE NOT NULL,

    monto_capital DECIMAL(14,2) NOT NULL DEFAULT 0,
    monto_interes DECIMAL(14,2) NOT NULL DEFAULT 0,
    monto_cuota DECIMAL(14,2) NOT NULL,

    fecha_pago_completo DATETIME(6) NULL,

    observaciones VARCHAR(255),

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
        ),

    INDEX idx_pag_cuotas_plan (
        id_plan_pago
    ),

    INDEX idx_pag_cuotas_estado (
        id_estado_cuota
    ),

    INDEX idx_pag_cuotas_vencimiento (
        fecha_vencimiento
    ),

    INDEX idx_pag_cuotas_plan_vencimiento (
        id_plan_pago,
        fecha_vencimiento
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

  -- TABLA PAG_PAGOS --
CREATE TABLE pag_pagos (
    id_pago BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_reserva BIGINT UNSIGNED NULL,
    id_venta BIGINT UNSIGNED NULL,
    id_plan_pago BIGINT UNSIGNED NULL,

    id_estado_pago SMALLINT UNSIGNED NOT NULL,
    id_metodo_pago SMALLINT UNSIGNED NOT NULL,
    id_moneda SMALLINT UNSIGNED NOT NULL,

    codigo VARCHAR(40) NOT NULL,

    monto DECIMAL(14,2) NOT NULL,

    fecha_operacion DATETIME(6) NOT NULL,

    numero_operacion VARCHAR(100),

    observaciones VARCHAR(500),

    id_usuario_registro BIGINT UNSIGNED NULL,

    id_usuario_confirmacion BIGINT UNSIGNED NULL,
    fecha_confirmacion DATETIME(6) NULL,

    id_usuario_anulacion BIGINT UNSIGNED NULL,
    fecha_anulacion DATETIME(6) NULL,
    motivo_anulacion VARCHAR(255),

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
        ),

    INDEX idx_pag_pagos_reserva (
        id_reserva
    ),

    INDEX idx_pag_pagos_venta (
        id_venta
    ),

    INDEX idx_pag_pagos_plan (
        id_plan_pago
    ),

    INDEX idx_pag_pagos_estado (
        id_estado_pago
    ),

    INDEX idx_pag_pagos_metodo (
        id_metodo_pago
    ),

    INDEX idx_pag_pagos_fecha_operacion (
        fecha_operacion
    ),

    INDEX idx_pag_pagos_numero_operacion (
        numero_operacion
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla pag_aplicaciones_pago --
  CREATE TABLE pag_aplicaciones_pago (
    id_aplicacion_pago BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_pago BIGINT UNSIGNED NOT NULL,
    id_tipo_aplicacion_pago SMALLINT UNSIGNED NOT NULL,

    id_plan_pago BIGINT UNSIGNED NULL,
    id_cuota BIGINT UNSIGNED NULL,

    monto_aplicado DECIMAL(14,2) NOT NULL,

    fecha_aplicacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    observaciones VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    id_usuario_aplicacion BIGINT UNSIGNED NULL,

    fecha_anulacion DATETIME(6) NULL,
    id_usuario_anulacion BIGINT UNSIGNED NULL,
    motivo_anulacion VARCHAR(255),

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
        ),
        
    INDEX idx_pag_aplicaciones_pago_pago_plan (
        id_pago,
        id_plan_pago
    ),

    INDEX idx_pag_aplicaciones_pago_cuota_plan (
        id_cuota,
        id_plan_pago
    ),

    INDEX idx_pag_aplicaciones_pago_plan (
        id_plan_pago
    ),

    INDEX idx_pag_aplicaciones_pago_tipo (
        id_tipo_aplicacion_pago
    ),

    INDEX idx_pag_aplicaciones_pago_fecha (
        fecha_aplicacion
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla pag_vouchers --
  CREATE TABLE pag_vouchers (
    id_voucher BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_pago BIGINT UNSIGNED NOT NULL,
    id_estado_voucher SMALLINT UNSIGNED NOT NULL,

    codigo VARCHAR(40) NOT NULL,
    numero_version SMALLINT UNSIGNED NOT NULL DEFAULT 1,

    nombre_archivo_original VARCHAR(255) NOT NULL,
    clave_archivo VARCHAR(500) NOT NULL,

    tipo_mime VARCHAR(100),
    tamanio_bytes BIGINT UNSIGNED,
    hash_sha256 CHAR(64),

    fecha_carga DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    id_usuario_carga BIGINT UNSIGNED NULL,

    fecha_validacion DATETIME(6) NULL,
    id_usuario_validacion BIGINT UNSIGNED NULL,

    motivo_rechazo VARCHAR(255),
    observaciones_validacion VARCHAR(500),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
    ),

    INDEX idx_pag_vouchers_pago (
        id_pago
    ),

    INDEX idx_pag_vouchers_estado (
        id_estado_voucher
    ),

    INDEX idx_pag_vouchers_fecha_carga (
        fecha_carga
    ),

    INDEX idx_pag_vouchers_hash (
        hash_sha256
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla pag_planes_pago_historial_estado
  CREATE TABLE pag_planes_pago_historial_estado (
    id_historial_estado BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_plan_pago BIGINT UNSIGNED NOT NULL,

    id_estado_anterior SMALLINT UNSIGNED NULL,
    id_estado_nuevo SMALLINT UNSIGNED NOT NULL,

    fecha_cambio DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    motivo VARCHAR(255),

    id_usuario_cambio BIGINT UNSIGNED NULL,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

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
        ),

    INDEX idx_pag_plan_historial_plan_fecha (
        id_plan_pago,
        fecha_cambio
    ),

    INDEX idx_pag_plan_historial_estado_nuevo (
        id_estado_nuevo
    ),

    INDEX idx_pag_plan_historial_usuario (
        id_usuario_cambio
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  
  -- ----------- 8. ASESORES Y COMISIONES (comercial) -----------
  
  -- TABLA COM_ ASESORES 
  -- =====================================================
-- 08. COMERCIAL / ASESORES Y COMISIONES
-- =====================================================

-- 08.01 COM_ASESORES
CREATE TABLE com_asesores (
    id_asesor BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_persona BIGINT UNSIGNED NOT NULL,
    id_tipo_asesor SMALLINT UNSIGNED NOT NULL,
    id_estado_asesor SMALLINT UNSIGNED NOT NULL,

    codigo VARCHAR(30) NOT NULL,

    fecha_inicio DATE NOT NULL,

    fecha_fin DATE NULL,

    observaciones VARCHAR(500),

    id_usuario_registro BIGINT UNSIGNED NULL,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
        ),

    INDEX idx_com_asesores_tipo (
        id_tipo_asesor
    ),

    INDEX idx_com_asesores_estado (
        id_estado_asesor
    ),

    INDEX idx_com_asesores_tipo_estado (
        id_tipo_asesor,
        id_estado_asesor
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA COM_ASIGNACIONES_PROSPECTO
  CREATE TABLE com_asignaciones_prospecto (
    id_asignacion_prospecto BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_prospecto BIGINT UNSIGNED NOT NULL,
    id_asesor BIGINT UNSIGNED NOT NULL,

    fecha_asignacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_fin DATETIME(6) NULL,

    motivo_asignacion VARCHAR(255),
    motivo_cierre VARCHAR(255),

    id_usuario_asignacion BIGINT UNSIGNED NULL,
    id_usuario_cierre BIGINT UNSIGNED NULL,

    id_prospecto_vigente BIGINT UNSIGNED
        GENERATED ALWAYS AS (
            CASE
                WHEN fecha_fin IS NULL THEN id_prospecto
                ELSE NULL
            END
        ) STORED,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
    ),

    INDEX idx_com_asignaciones_prospecto_prospecto_fecha (
        id_prospecto,
        fecha_asignacion
    ),

    INDEX idx_com_asignaciones_prospecto_asesor (
        id_asesor
    ),

    INDEX idx_com_asignaciones_prospecto_asesor_fecha (
        id_asesor,
        fecha_asignacion
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA COM_VENTAS_ASESORES
  CREATE TABLE com_ventas_asesores (
    id_venta_asesor BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_venta BIGINT UNSIGNED NOT NULL,
    id_asesor BIGINT UNSIGNED NOT NULL,

    es_principal BOOLEAN NOT NULL DEFAULT FALSE,

    porcentaje_participacion DECIMAL(5,2) NOT NULL DEFAULT 100.00,

    fecha_asignacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    id_usuario_registro BIGINT UNSIGNED NULL,

    id_venta_principal BIGINT UNSIGNED
        GENERATED ALWAYS AS (
            CASE
                WHEN es_principal = TRUE THEN id_venta
                ELSE NULL
            END
        ) STORED,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
        ),

    INDEX idx_com_ventas_asesores_venta (
        id_venta
    ),

    INDEX idx_com_ventas_asesores_asesor (
        id_asesor
    ),

    INDEX idx_com_ventas_asesores_asesor_fecha (
        id_asesor,
        fecha_asignacion
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA COM_REGLAS_COMISION
  CREATE TABLE com_reglas_comision (
    id_regla_comision BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_proyecto BIGINT UNSIGNED NULL,
    id_tipo_asesor SMALLINT UNSIGNED NULL,
    id_modalidad_venta SMALLINT UNSIGNED NULL,

    id_tipo_calculo_comision SMALLINT UNSIGNED NOT NULL,
    id_moneda SMALLINT UNSIGNED NULL,

    codigo VARCHAR(40) NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    descripcion VARCHAR(500),

    valor DECIMAL(14,4) NOT NULL,

    prioridad SMALLINT UNSIGNED NOT NULL DEFAULT 100,

    fecha_desde DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_hasta DATETIME(6) NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
        ),

    INDEX idx_com_reglas_comision_proyecto (
        id_proyecto
    ),

    INDEX idx_com_reglas_comision_tipo_asesor (
        id_tipo_asesor
    ),

    INDEX idx_com_reglas_comision_modalidad (
        id_modalidad_venta
    ),

    INDEX idx_com_reglas_comision_vigencia (
        fecha_desde,
        fecha_hasta
    ),

    INDEX idx_com_reglas_comision_busqueda (
        id_proyecto,
        id_tipo_asesor,
        id_modalidad_venta,
        activo
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA COM_COMISIONES
  CREATE TABLE com_comisiones (
    id_comision BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_venta_asesor BIGINT UNSIGNED NOT NULL,
    id_regla_comision BIGINT UNSIGNED NOT NULL,
    id_estado_comision SMALLINT UNSIGNED NOT NULL,
    id_moneda SMALLINT UNSIGNED NOT NULL,

    codigo VARCHAR(40) NOT NULL,

    monto_base DECIMAL(14,2) NOT NULL,
    valor_regla_aplicado DECIMAL(14,4) NOT NULL,
    porcentaje_participacion_aplicado DECIMAL(5,2) NOT NULL,

    monto_comision_calculada DECIMAL(14,2) NOT NULL,
    monto_comision_final DECIMAL(14,2) NOT NULL,

    fecha_generacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_aprobacion DATETIME(6) NULL,
    id_usuario_aprobacion BIGINT UNSIGNED NULL,

    fecha_pago DATETIME(6) NULL,
    id_usuario_pago BIGINT UNSIGNED NULL,

    fecha_anulacion DATETIME(6) NULL,
    id_usuario_anulacion BIGINT UNSIGNED NULL,
    motivo_anulacion VARCHAR(255),

    observaciones VARCHAR(500),

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
        ),

    INDEX idx_com_comisiones_venta_asesor (
        id_venta_asesor
    ),

    INDEX idx_com_comisiones_regla (
        id_regla_comision
    ),

    INDEX idx_com_comisiones_estado (
        id_estado_comision
    ),

    INDEX idx_com_comisiones_fecha_generacion (
        fecha_generacion
    ),

    INDEX idx_com_comisiones_estado_fecha (
        id_estado_comision,
        fecha_generacion
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- --- 9. CMS (ADMINISTRACION DE LA PAGINA WEB ----------
  
  -- TABLA CMS_PAGINAS --
  CREATE TABLE cms_paginas (
    id_pagina BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_estado_publicacion SMALLINT UNSIGNED NOT NULL,

    codigo VARCHAR(40) NOT NULL,
    slug VARCHAR(150) NOT NULL,

    titulo VARCHAR(180) NOT NULL,
    descripcion VARCHAR(500),

    titulo_seo VARCHAR(180),
    descripcion_seo VARCHAR(320),

    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    mostrar_menu BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_publicacion DATETIME(6) NULL,

    id_usuario_registro BIGINT UNSIGNED NULL,
    id_usuario_publicacion BIGINT UNSIGNED NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
        ),

    INDEX idx_cms_paginas_estado (
        id_estado_publicacion
    ),

    INDEX idx_cms_paginas_menu (
        mostrar_menu,
        orden
    ),

    INDEX idx_cms_paginas_publicacion (
        fecha_publicacion
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- TABLA CFG_SECCIONES --
CREATE TABLE cms_secciones (
    id_seccion BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_pagina BIGINT UNSIGNED NOT NULL,
    id_tipo_seccion SMALLINT UNSIGNED NOT NULL,

    codigo VARCHAR(50) NOT NULL,

    titulo VARCHAR(180),
    subtitulo VARCHAR(255),

    contenido TEXT,

    configuracion JSON,

    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    visible BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_desde DATETIME(6) NULL,
    fecha_hasta DATETIME(6) NULL,

    id_usuario_registro BIGINT UNSIGNED NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
        ),

    INDEX idx_cms_secciones_pagina (
        id_pagina
    ),

    INDEX idx_cms_secciones_tipo (
        id_tipo_seccion
    ),

    INDEX idx_cms_secciones_pagina_orden (
        id_pagina,
        orden
    ),

    INDEX idx_cms_secciones_visible (
        visible,
        activo
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CMS_SECCION_ITEMS --
  CREATE TABLE cms_seccion_items (
    id_seccion_item BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_seccion BIGINT UNSIGNED NOT NULL,

    codigo VARCHAR(60) NOT NULL,

    titulo VARCHAR(180),
    subtitulo VARCHAR(255),

    contenido TEXT,

    texto_enlace VARCHAR(120),
    url_enlace VARCHAR(500),

    configuracion JSON,

    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    visible BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_desde DATETIME(6) NULL,
    fecha_hasta DATETIME(6) NULL,

    id_usuario_registro BIGINT UNSIGNED NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
        ),

    INDEX idx_cms_seccion_items_seccion (
        id_seccion
    ),

    INDEX idx_cms_seccion_items_seccion_orden (
        id_seccion,
        orden
    ),

    INDEX idx_cms_seccion_items_visible (
        visible,
        activo
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CMS_MULTIMEDIA --
  CREATE TABLE cms_multimedia (
    id_multimedia BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_tipo_multimedia SMALLINT UNSIGNED NOT NULL,

    codigo VARCHAR(50) NOT NULL,

    nombre VARCHAR(180) NOT NULL,
    descripcion VARCHAR(500),

    nombre_archivo_original VARCHAR(255),

    clave_archivo VARCHAR(500),
    url_externa VARCHAR(1000),

    tipo_mime VARCHAR(100),

    tamanio_bytes BIGINT UNSIGNED,

    hash_sha256 CHAR(64),

    texto_alternativo VARCHAR(255),

    ancho_px INT UNSIGNED,
    alto_px INT UNSIGNED,

    duracion_segundos INT UNSIGNED,

    id_usuario_registro BIGINT UNSIGNED NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
        ),

    INDEX idx_cms_multimedia_tipo (
        id_tipo_multimedia
    ),

    INDEX idx_cms_multimedia_hash (
        hash_sha256
    ),

    INDEX idx_cms_multimedia_activo (
        activo
    ),

    INDEX idx_cms_multimedia_fecha (
        fecha_creacion
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CMS_MULTIMEDIA_ASIGNACIONES -- 
  CREATE TABLE cms_multimedia_asignaciones (
    id_multimedia_asignacion BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_multimedia BIGINT UNSIGNED NOT NULL,
    id_uso_multimedia SMALLINT UNSIGNED NOT NULL,

    id_pagina BIGINT UNSIGNED NULL,
    id_seccion BIGINT UNSIGNED NULL,
    id_seccion_item BIGINT UNSIGNED NULL,

    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    visible BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_desde DATETIME(6) NULL,
    fecha_hasta DATETIME(6) NULL,

    id_usuario_registro BIGINT UNSIGNED NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
            (
                (id_pagina IS NOT NULL)
                +
                (id_seccion IS NOT NULL)
                +
                (id_seccion_item IS NOT NULL)
            ) = 1
        ),

    CONSTRAINT chk_cms_multimedia_asig_fechas
        CHECK (
            fecha_hasta IS NULL
            OR fecha_desde IS NULL
            OR fecha_hasta >= fecha_desde
        ),

    INDEX idx_cms_multimedia_asig_multimedia (
        id_multimedia
    ),

    INDEX idx_cms_multimedia_asig_pagina_orden (
        id_pagina,
        orden
    ),

    INDEX idx_cms_multimedia_asig_seccion_orden (
        id_seccion,
        orden
    ),

    INDEX idx_cms_multimedia_asig_item_orden (
        id_seccion_item,
        orden
    ),

    INDEX idx_cms_multimedia_asig_uso (
        id_uso_multimedia
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CMS_PROYECTOS 
  CREATE TABLE cms_proyectos (
    id_cms_proyecto BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_proyecto BIGINT UNSIGNED NOT NULL,
    id_pagina BIGINT UNSIGNED NOT NULL,

    nombre_comercial VARCHAR(180) NULL,
    resumen_comercial VARCHAR(500) NULL,
    descripcion_comercial TEXT NULL,

    destacado BOOLEAN NOT NULL DEFAULT FALSE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    texto_cta VARCHAR(120) NULL,
    url_cta VARCHAR(500) NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    id_usuario_registro BIGINT UNSIGNED NULL,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
        ),

    INDEX idx_cms_proyectos_destacado (
        destacado,
        orden
    ),

    INDEX idx_cms_proyectos_activo (
        activo
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CMS_CONSULTAS_WEB -- 
  CREATE TABLE cms_consultas_web (
    id_consulta_web BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_estado_consulta_web SMALLINT UNSIGNED NOT NULL,

    id_pagina BIGINT UNSIGNED NULL,
    id_proyecto BIGINT UNSIGNED NULL,

    id_prospecto BIGINT UNSIGNED NULL,

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

    fecha_recepcion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    id_usuario_atencion BIGINT UNSIGNED NULL,
    fecha_atencion DATETIME(6) NULL,

    fecha_cierre DATETIME(6) NULL,
    motivo_cierre VARCHAR(255) NULL,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
        ),

    INDEX idx_cms_consultas_web_estado (
        id_estado_consulta_web
    ),

    INDEX idx_cms_consultas_web_proyecto (
        id_proyecto
    ),

    INDEX idx_cms_consultas_web_prospecto (
        id_prospecto
    ),

    INDEX idx_cms_consultas_web_fecha (
        fecha_recepcion
    ),

    INDEX idx_cms_consultas_web_estado_fecha (
        id_estado_consulta_web,
        fecha_recepcion
    ),

    INDEX idx_cms_consultas_web_correo (
        correo
    ),

    INDEX idx_cms_consultas_web_telefono (
        telefono
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- ----- 10. NOTIFICACIONES ----------

-- TABLA NOT_NOTIFICACIONES --
CREATE TABLE not_notificaciones (
    id_notificacion BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_persona BIGINT UNSIGNED NOT NULL,
    id_tipo_notificacion SMALLINT UNSIGNED NOT NULL,

    titulo VARCHAR(180) NOT NULL,
    mensaje VARCHAR(1000) NOT NULL,

    url_destino VARCHAR(500) NULL,

    referencia_modulo VARCHAR(50) NULL,
    referencia_entidad VARCHAR(80) NULL,
    referencia_id VARCHAR(80) NULL,

    datos_contexto JSON NULL,

    clave_deduplicacion VARCHAR(150) NULL,

    fecha_generacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_lectura DATETIME(6) NULL,

    fecha_expiracion DATETIME(6) NULL,

    id_usuario_generacion BIGINT UNSIGNED NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
        ),

    INDEX idx_not_notificaciones_persona (
        id_persona
    ),

    INDEX idx_not_notificaciones_persona_lectura (
        id_persona,
        fecha_lectura
    ),

    INDEX idx_not_notificaciones_tipo (
        id_tipo_notificacion
    ),

    INDEX idx_not_notificaciones_fecha (
        fecha_generacion
    ),

    INDEX idx_not_notificaciones_activo (
        activo
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- NOT_ENVIOS --
  CREATE TABLE not_envios (
    id_envio BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_notificacion BIGINT UNSIGNED NOT NULL,
    id_canal_notificacion SMALLINT UNSIGNED NOT NULL,
    id_estado_envio_notificacion SMALLINT UNSIGNED NOT NULL,

    destinatario VARCHAR(255) NULL,

    fecha_programada DATETIME(6) NULL,

    numero_intentos SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_ultimo_intento DATETIME(6) NULL,
    fecha_envio DATETIME(6) NULL,

    identificador_proveedor VARCHAR(150) NULL,

    ultimo_error VARCHAR(1000) NULL,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
        ),

    INDEX idx_not_envios_notificacion (
        id_notificacion
    ),

    INDEX idx_not_envios_estado (
        id_estado_envio_notificacion
    ),

    INDEX idx_not_envios_canal (
        id_canal_notificacion
    ),

    INDEX idx_not_envios_programados (
        id_estado_envio_notificacion,
        fecha_programada
    ),

    INDEX idx_not_envios_ultimo_intento (
        fecha_ultimo_intento
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- NOT_PLANTILLAS --
  CREATE TABLE not_plantillas (
    id_plantilla BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_tipo_notificacion SMALLINT UNSIGNED NOT NULL,
    id_canal_notificacion SMALLINT UNSIGNED NOT NULL,

    codigo VARCHAR(50) NOT NULL,
    nombre VARCHAR(120) NOT NULL,

    asunto VARCHAR(180) NULL,
    contenido TEXT NOT NULL,

    numero_version SMALLINT UNSIGNED NOT NULL DEFAULT 1,

    fecha_desde DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_hasta DATETIME(6) NULL,

    vigente BOOLEAN NOT NULL DEFAULT TRUE,

    clave_vigente VARCHAR(80)
        GENERATED ALWAYS AS (
            CASE
                WHEN vigente = TRUE
                THEN CONCAT(
                    id_tipo_notificacion,
                    '-',
                    id_canal_notificacion
                )
                ELSE NULL
            END
        ) STORED,

    id_usuario_registro BIGINT UNSIGNED NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
    ),

    INDEX idx_not_plantillas_tipo (
        id_tipo_notificacion
    ),

    INDEX idx_not_plantillas_canal (
        id_canal_notificacion
    ),

    INDEX idx_not_plantillas_tipo_canal (
        id_tipo_notificacion,
        id_canal_notificacion
    ),

    INDEX idx_not_plantillas_vigencia (
        fecha_desde,
        fecha_hasta
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA NOT_PREFERENCIAS --
  CREATE TABLE not_preferencias (
    id_preferencia BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_persona BIGINT UNSIGNED NOT NULL,
    id_tipo_notificacion SMALLINT UNSIGNED NOT NULL,
    id_canal_notificacion SMALLINT UNSIGNED NOT NULL,

    habilitado BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_modificacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    id_usuario_modificacion BIGINT UNSIGNED NULL,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
        ON DELETE RESTRICT,

    INDEX idx_not_preferencias_persona (
        id_persona
    ),

    INDEX idx_not_preferencias_tipo (
        id_tipo_notificacion
    ),

    INDEX idx_not_preferencias_canal (
        id_canal_notificacion
    ),

    INDEX idx_not_preferencias_persona_habilitado (
        id_persona,
        habilitado
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- -------- 11. FINANZAS -----------
  
  -- TABLA FIN_CATEGORIAS --
  CREATE TABLE fin_categorias (
    id_categoria BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_tipo_movimiento_financiero SMALLINT UNSIGNED NOT NULL,

    id_categoria_padre BIGINT UNSIGNED NULL,

    codigo VARCHAR(40) NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    descripcion VARCHAR(255),

    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
        ON DELETE RESTRICT,

    INDEX idx_fin_categorias_tipo (
        id_tipo_movimiento_financiero
    ),

    INDEX idx_fin_categorias_padre (
        id_categoria_padre
    ),

    INDEX idx_fin_categorias_tipo_activo (
        id_tipo_movimiento_financiero,
        activo
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA FIN_CUENTAS_FINANCIERAS --
  CREATE TABLE fin_cuentas_financieras (
    id_cuenta_financiera BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_tipo_cuenta_financiera SMALLINT UNSIGNED NOT NULL,
    id_moneda SMALLINT UNSIGNED NOT NULL,

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

    id_usuario_registro BIGINT UNSIGNED NULL,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
        ),

    INDEX idx_fin_cuentas_financieras_tipo (
        id_tipo_cuenta_financiera
    ),

    INDEX idx_fin_cuentas_financieras_moneda (
        id_moneda
    ),

    INDEX idx_fin_cuentas_financieras_activo (
        activo
    ),

    INDEX idx_fin_cuentas_financieras_tipo_activo (
        id_tipo_cuenta_financiera,
        activo
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA FIN_MOVIMIENTOS --
  CREATE TABLE fin_movimientos (
    id_movimiento BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_categoria BIGINT UNSIGNED NOT NULL,
    id_cuenta_financiera BIGINT UNSIGNED NOT NULL,
    id_estado_movimiento_financiero SMALLINT UNSIGNED NOT NULL,

    id_pago BIGINT UNSIGNED NULL,
    id_comision BIGINT UNSIGNED NULL,

    codigo VARCHAR(40) NOT NULL,

    monto DECIMAL(14,2) NOT NULL,

    fecha_movimiento DATETIME(6) NOT NULL,

    numero_operacion VARCHAR(100) NULL,

    concepto VARCHAR(180) NOT NULL,
    descripcion VARCHAR(500) NULL,

    id_usuario_registro BIGINT UNSIGNED NULL,

    id_usuario_confirmacion BIGINT UNSIGNED NULL,
    fecha_confirmacion DATETIME(6) NULL,

    id_usuario_anulacion BIGINT UNSIGNED NULL,
    fecha_anulacion DATETIME(6) NULL,
    motivo_anulacion VARCHAR(255) NULL,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
        ),

    INDEX idx_fin_movimientos_categoria (
        id_categoria
    ),

    INDEX idx_fin_movimientos_cuenta (
        id_cuenta_financiera
    ),

    INDEX idx_fin_movimientos_estado (
        id_estado_movimiento_financiero
    ),

    INDEX idx_fin_movimientos_fecha (
        fecha_movimiento
    ),

    INDEX idx_fin_movimientos_cuenta_fecha (
        id_cuenta_financiera,
        fecha_movimiento
    ),

    INDEX idx_fin_movimientos_categoria_fecha (
        id_categoria,
        fecha_movimiento
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA FIN_TRANSFERENCIAS --
  CREATE TABLE fin_transferencias (
    id_transferencia BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_cuenta_origen BIGINT UNSIGNED NOT NULL,
    id_cuenta_destino BIGINT UNSIGNED NOT NULL,

    id_estado_movimiento_financiero SMALLINT UNSIGNED NOT NULL,

    codigo VARCHAR(40) NOT NULL,

    monto_origen DECIMAL(14,2) NOT NULL,
    monto_destino DECIMAL(14,2) NOT NULL,

    tipo_cambio DECIMAL(14,6) NULL,

    fecha_transferencia DATETIME(6) NOT NULL,

    numero_operacion VARCHAR(100) NULL,

    concepto VARCHAR(180) NOT NULL,
    observaciones VARCHAR(500) NULL,

    id_usuario_registro BIGINT UNSIGNED NULL,

    id_usuario_confirmacion BIGINT UNSIGNED NULL,
    fecha_confirmacion DATETIME(6) NULL,

    id_usuario_anulacion BIGINT UNSIGNED NULL,
    fecha_anulacion DATETIME(6) NULL,
    motivo_anulacion VARCHAR(255) NULL,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

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
        ),

    INDEX idx_fin_transferencias_origen (
        id_cuenta_origen
    ),

    INDEX idx_fin_transferencias_destino (
        id_cuenta_destino
    ),

    INDEX idx_fin_transferencias_estado (
        id_estado_movimiento_financiero
    ),

    INDEX idx_fin_transferencias_fecha (
        fecha_transferencia
    ),

    INDEX idx_fin_transferencias_origen_fecha (
        id_cuenta_origen,
        fecha_transferencia
    ),

    INDEX idx_fin_transferencias_destino_fecha (
        id_cuenta_destino,
        fecha_transferencia
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA FIN_SALDOS_INICIALES --
  CREATE TABLE fin_saldos_iniciales (
    id_saldo_inicial BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_cuenta_financiera BIGINT UNSIGNED NOT NULL,

    saldo_inicial DECIMAL(14,2) NOT NULL,

    fecha_saldo DATETIME(6) NOT NULL,

    observaciones VARCHAR(500) NULL,

    id_usuario_registro BIGINT UNSIGNED NULL,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uk_fin_saldos_iniciales_cuenta
        UNIQUE (id_cuenta_financiera),

    CONSTRAINT fk_fin_saldos_iniciales_cuenta
        FOREIGN KEY (id_cuenta_financiera)
        REFERENCES fin_cuentas_financieras(id_cuenta_financiera)
        ON DELETE RESTRICT,

    CONSTRAINT fk_fin_saldos_iniciales_usuario
        FOREIGN KEY (id_usuario_registro)
        REFERENCES seg_usuarios(id_usuario)
        ON DELETE RESTRICT,

    INDEX idx_fin_saldos_iniciales_fecha (
        fecha_saldo
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
 
 
-- ----- 12. AUDITORIA --------
  -- tabla aud_eventos --
 CREATE TABLE aud_eventos (
    id_evento BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_usuario BIGINT UNSIGNED NULL,

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

    datos_antes JSON NULL,
    datos_despues JSON NULL,
    datos_contexto JSON NULL,

    fecha_evento DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

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
        ),

    INDEX idx_aud_eventos_usuario_fecha (
        id_usuario,
        fecha_evento
    ),

    INDEX idx_aud_eventos_modulo_fecha (
        modulo,
        fecha_evento
    ),

    INDEX idx_aud_eventos_modulo_accion_fecha (
        modulo,
        accion,
        fecha_evento
    ),

    INDEX idx_aud_eventos_entidad (
        entidad,
        id_entidad,
        fecha_evento
    ),

    INDEX idx_aud_eventos_resultado_fecha (
        resultado,
        fecha_evento
    ),

    INDEX idx_aud_eventos_request (
        request_id
    ),

    INDEX idx_aud_eventos_ip_fecha (
        ip_origen,
        fecha_evento
    ),

    INDEX idx_aud_eventos_fecha (
        fecha_evento
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;