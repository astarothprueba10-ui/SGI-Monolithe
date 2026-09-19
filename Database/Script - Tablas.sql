-- SCRIPT DE CREACION DE TABLAS --
USE MONOLITHE;

-- 01. CATALOGOS / CFG

-- TABLA estados_proyecto
CREATE TABLE estado_proyecto (
    id_estado_proyecto SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_estado_proyecto
        PRIMARY KEY (id_estado_proyecto),

    CONSTRAINT unq_estado_proyecto_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
-- TABLA estado_etapa
CREATE TABLE estado_etapa (
    id_estado_etapa SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_estado_etapa
        PRIMARY KEY (id_estado_etapa),

    CONSTRAINT unq_estado_etapa_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- TABLA estado_manzana
CREATE TABLE estado_manzana (
    id_estado_manzana SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_estado_manzana
        PRIMARY KEY (id_estado_manzana),

    CONSTRAINT unq_estado_manzana_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
-- TABLA estado_lote
CREATE TABLE estado_lote (
    id_estado_lote SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_estado_lote
        PRIMARY KEY (id_estado_lote),

    CONSTRAINT unq_estado_lote_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
-- TABLA TIPO_LOTE
CREATE TABLE tipo_lote (
    id_tipo_lote SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_tipo_lote
        PRIMARY KEY (id_tipo_lote),

    CONSTRAINT unq_tipo_lote_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
-- TABLA MONEDA
CREATE TABLE moneda (
    id_moneda SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

    codigo CHAR(3) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    simbolo VARCHAR(10),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_moneda
        PRIMARY KEY (id_moneda),

    CONSTRAINT unq_moneda_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_TIPOS_DOCUMENTO
CREATE TABLE tipo_documento (
    id_tipo_documento SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_tipo_documento
        PRIMARY KEY (id_tipo_documento),

    CONSTRAINT unq_tipo_documento_codigo
        UNIQUE (codigo),

    CONSTRAINT chk_tipo_documento_longitud
        CHECK (
            longitud_minima IS NULL
            OR longitud_maxima IS NULL
            OR longitud_maxima >= longitud_minima
        )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla tipo_tarifas ---
  CREATE TABLE tipo_tarifa (
    id_tipo_tarifa SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_tipo_tarifa
        PRIMARY KEY (id_tipo_tarifa),

    CONSTRAINT unq_tipo_tarifa_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla tipo_ajuste_precio --
 CREATE TABLE tipo_ajuste_precio (
    id_tipo_ajuste_precio SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_tipo_ajuste_precio
        PRIMARY KEY (id_tipo_ajuste_precio),

    CONSTRAINT unq_tipo_ajuste_precio_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla tipo_contacto
CREATE TABLE tipo_contacto (
    id_tipo_contacto SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

    codigo VARCHAR(20) NOT NULL,
    nombre VARCHAR(80) NOT NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_tipo_contacto
        PRIMARY KEY (id_tipo_contacto),

    CONSTRAINT unq_tipo_contacto_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
   -- TABLA ESTADO_PROSPECTO
  CREATE TABLE estado_prospecto (
    id_estado_prospecto SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_estado_prospecto
        PRIMARY KEY (id_estado_prospecto),

    CONSTRAINT unq_estado_prospecto_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA ORIGEN_PROSPECTO
  CREATE TABLE origen_prospecto (
    id_origen_prospecto SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_origen_prospecto
        PRIMARY KEY (id_origen_prospecto),

    CONSTRAINT unq_origen_prospecto_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TIPO_SEGUIMIENTO
CREATE TABLE tipo_seguimiento (
    id_tipo_seguimiento SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_tipo_seguimiento
        PRIMARY KEY (id_tipo_seguimiento),

    CONSTRAINT unq_tipo_seguimiento_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
    -- TABLA TIPO_CONSENTIMIENTO
 CREATE TABLE tipo_consentimiento (
    id_tipo_consentimiento SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

    codigo VARCHAR(40) NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_tipo_consentimiento
        PRIMARY KEY (id_tipo_consentimiento),

    CONSTRAINT unq_tipo_consentimiento_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
    -- TABLA ESTADO_RESERVA
  CREATE TABLE estado_reserva (
    id_estado_reserva SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_estado_reserva
        PRIMARY KEY (id_estado_reserva),

    CONSTRAINT unq_estado_reserva_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA ESTADO_VENTAS
  CREATE TABLE estado_venta (
    id_estado_venta SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_estado_venta
        PRIMARY KEY (id_estado_venta),

    CONSTRAINT unq_estado_venta_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla tipo_contrato --
  CREATE TABLE tipo_contrato (
    id_tipo_contrato SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_tipo_contrato
        PRIMARY KEY (id_tipo_contrato),

    CONSTRAINT unq_tipo_contrato_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA ESTADO_CONTRATO
  CREATE TABLE estado_contrato (
    id_estado_contrato SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_estado_contrato
        PRIMARY KEY (id_estado_contrato),

    CONSTRAINT unq_estado_contrato_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
    -- tabla estado_usuario
  CREATE TABLE estado_usuario (
    id_estado_usuario SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_estado_usuario
        PRIMARY KEY (id_estado_usuario),

    CONSTRAINT unq_estado_usuario_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla cfg_modalidades_venta
  CREATE TABLE modalidad_venta (
    id_modalidad_venta SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_modalidad_venta
        PRIMARY KEY (id_modalidad_venta),

    CONSTRAINT unq_modalidad_venta_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla estado_plan_pago --
  CREATE TABLE estado_plan_pago (
    id_estado_plan_pago SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_estado_plan_pago
        PRIMARY KEY (id_estado_plan_pago),

    CONSTRAINT unq_estado_plan_pago_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA ESTADO_CUOTA --
  CREATE TABLE estado_cuota (
    id_estado_cuota SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_estado_cuota
        PRIMARY KEY (id_estado_cuota),

    CONSTRAINT unq_estado_cuota_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA METODOS_PAGO -- 
  CREATE TABLE metodo_pago (
    id_metodo_pago SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_metodo_pago
        PRIMARY KEY (id_metodo_pago),

    CONSTRAINT unq_metodo_pago_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA ESTADO_VAUCHER
 CREATE TABLE estado_voucher (
    id_estado_voucher SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_estado_voucher
        PRIMARY KEY (id_estado_voucher),

    CONSTRAINT unq_estado_voucher_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_ESTADOS_PAGO --
  CREATE TABLE estado_pago (
    id_estado_pago SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_estado_pago
        PRIMARY KEY (id_estado_pago),

    CONSTRAINT unq_estado_pago_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
    -- CFG_TIPOS_APLICACION_PAGO --
  CREATE TABLE tipo_aplicacion_pago (
    id_tipo_aplicacion_pago SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_tipo_aplicacion_pago
        PRIMARY KEY (id_tipo_aplicacion_pago),

    CONSTRAINT unq_tipo_aplicacion_pago_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_TIPOS_ASESOR
  CREATE TABLE tipo_asesor (
    id_tipo_asesor SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_tipo_asesor
        PRIMARY KEY (id_tipo_asesor),

    CONSTRAINT unq_tipo_asesor_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_ESTADOS_ASESOR
  CREATE TABLE estado_asesor (
    id_estado_asesor SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_estado_asesor
        PRIMARY KEY (id_estado_asesor),

    CONSTRAINT unq_estado_asesor_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_TIPOS_CALCULO_COMISION
  CREATE TABLE tipo_calculo_comision (
    id_tipo_calculo_comision SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_tipo_calculo_comision
        PRIMARY KEY (id_tipo_calculo_comision),

    CONSTRAINT unq_tipo_calculo_comision_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_ESTADOS_COMISION
CREATE TABLE estado_comision (
    id_estado_comision SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_estado_comision
        PRIMARY KEY (id_estado_comision),

    CONSTRAINT unq_estado_comision_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_ESTADOS_PUBLICACIONES 
  CREATE TABLE estado_publicacion (
    id_estado_publicacion SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_estado_publicacion
        PRIMARY KEY (id_estado_publicacion),

    CONSTRAINT unq_estado_publicacion_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_TIPOS DE SECCION --
CREATE TABLE tipo_seccion (
    id_tipo_seccion SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_tipo_seccion
        PRIMARY KEY (id_tipo_seccion),

    CONSTRAINT unq_tipo_seccion_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_TIPOS_MULTIMEDIA --
  CREATE TABLE tipo_multimedia (
    id_tipo_multimedia SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_tipo_multimedia
        PRIMARY KEY (id_tipo_multimedia),

    CONSTRAINT unq_tipo_multimedia_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_USOS_MULTIMEDIA --
 CREATE TABLE uso_multimedia (
    id_uso_multimedia SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_uso_multimedia
        PRIMARY KEY (id_uso_multimedia),

    CONSTRAINT unq_uso_multimedia_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- CFG_ESTADOS_CONSULTA_WEB --
  CREATE TABLE estado_consulta_web (
    id_estado_consulta_web SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_estado_consulta_web
        PRIMARY KEY (id_estado_consulta_web),

    CONSTRAINT unq_estado_consulta_web_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_TIPOS_NOTIFICACIÓN --
  CREATE TABLE tipo_notificacion (
    id_tipo_notificacion SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_tipo_notificacion
        PRIMARY KEY (id_tipo_notificacion),

    CONSTRAINT unq_tipo_notificacion_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_CANALES_NOTIFICACION --
  CREATE TABLE canal_notificacion (
    id_canal_notificacion SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_canal_notificacion
        PRIMARY KEY (id_canal_notificacion),

    CONSTRAINT unq_canal_notificacion_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
-- TABLA CFG_ESTADOS_ENVIO_NOTIFICACION --
CREATE TABLE estado_envio (
    id_estado_envio SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_estado_envio
        PRIMARY KEY (id_estado_envio),

    CONSTRAINT unq_estado_envio_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
-- TABLA CFG_TIPOS_MOVIMIENTO_FINANCIERO --
CREATE TABLE tipo_movimiento (
    id_tipo_movimiento SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_tipo_movimiento
        PRIMARY KEY (id_tipo_movimiento),

    CONSTRAINT unq_tipo_movimiento_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_ESTADOS_MOVIMIENTO_FINANCIERO --
  CREATE TABLE estado_movimiento (
    id_estado_movimiento SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_estado_movimiento
        PRIMARY KEY (id_estado_movimiento),

    CONSTRAINT unq_estado_movimiento_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CFG_TIPOS_CUENTA_FINANCIERA 
  CREATE TABLE tipo_cuenta (
    id_tipo_cuenta SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_tipo_cuenta
        PRIMARY KEY (id_tipo_cuenta),

    CONSTRAINT unq_tipo_cuenta_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
-- ----- 2. CORE DEL NEGOCIO --------

 -- TABLA CORE_PERSONAS 
  CREATE TABLE persona (
    id_persona BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    nombre VARCHAR(120) NOT NULL,
    apellido_paterno VARCHAR(80),
    apellido_materno VARCHAR(80),
    fecha_nacimiento DATE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_persona
        PRIMARY KEY (id_persona),

    INDEX idx_persona_nombre (
        apellido_paterno,
        apellido_materno,
        nombre
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CORE PERSONAS DOCUMENTO DE IDENTIDAD 
  CREATE TABLE documento_identidad (
    id_documento BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_persona BIGINT UNSIGNED NOT NULL,
    id_tipo_documento SMALLINT UNSIGNED NOT NULL,

    numero VARCHAR(30) NOT NULL,
    pais_emision VARCHAR(100) NOT NULL DEFAULT 'Perú',

    fecha_emision DATE,
    fecha_vencimiento DATE,

    principal BOOLEAN NOT NULL DEFAULT FALSE,
    verificado BOOLEAN NOT NULL DEFAULT FALSE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,

    clave_principal VARCHAR(100)
        GENERATED ALWAYS AS (
            CASE
                WHEN principal = TRUE
                     AND activo = TRUE
                THEN CONCAT(id_persona, '-', id_tipo_documento)
                ELSE NULL
            END
        ) STORED,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_documento
        PRIMARY KEY (id_documento),

    CONSTRAINT unq_doc_numero
        UNIQUE (id_tipo_documento, pais_emision, numero),

    CONSTRAINT unq_doc_principal
        UNIQUE (clave_principal),

    CONSTRAINT fk_doc_persona
        FOREIGN KEY (id_persona)
        REFERENCES persona(id_persona)
        ON DELETE RESTRICT,

    CONSTRAINT fk_doc_tipo
        FOREIGN KEY (id_tipo_documento)
        REFERENCES tipo_documento(id_tipo_documento)
        ON DELETE RESTRICT,

    CONSTRAINT chk_doc_fecha
        CHECK (
            fecha_vencimiento IS NULL
            OR fecha_emision IS NULL
            OR fecha_vencimiento >= fecha_emision
        ),

    INDEX idx_doc_persona (id_persona),

    INDEX idx_doc_numero (numero)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CORE_PERSONAS_CONTACTOS
 CREATE TABLE contacto (
    id_contacto BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_persona BIGINT UNSIGNED NOT NULL,
    id_tipo_contacto SMALLINT UNSIGNED NOT NULL,

    valor VARCHAR(180) NOT NULL,

    principal BOOLEAN NOT NULL DEFAULT FALSE,
    verificado BOOLEAN NOT NULL DEFAULT FALSE,
    recibe_notificacion BOOLEAN NOT NULL DEFAULT TRUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,

    clave_principal VARCHAR(100)
        GENERATED ALWAYS AS (
            CASE
                WHEN principal = TRUE
                     AND activo = TRUE
                THEN CONCAT(id_persona, '-', id_tipo_contacto)
                ELSE NULL
            END
        ) STORED,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_contacto
        PRIMARY KEY (id_contacto),

    CONSTRAINT fk_contacto_persona
        FOREIGN KEY (id_persona)
        REFERENCES persona(id_persona)
        ON DELETE RESTRICT,

    CONSTRAINT fk_contacto_tipo
        FOREIGN KEY (id_tipo_contacto)
        REFERENCES tipo_contacto(id_tipo_contacto)
        ON DELETE RESTRICT,

    CONSTRAINT unq_contacto_valor
        UNIQUE (id_persona, id_tipo_contacto, valor),

    CONSTRAINT unq_contacto_princ
        UNIQUE (clave_principal),

    INDEX idx_contacto_persona (id_persona),

    INDEX idx_contacto_valor (valor)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  
  -- TABLA CORE_PERSONAS_DIRECCIONES
 CREATE TABLE direccion (
    id_direccion BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_persona BIGINT UNSIGNED NOT NULL,

    tipo VARCHAR(30) NOT NULL DEFAULT 'DOMICILIO',

    ubicacion VARCHAR(255) NOT NULL,
    referencia VARCHAR(255),

    distrito VARCHAR(100),
    provincia VARCHAR(100),
    departamento VARCHAR(100),
    pais VARCHAR(100) NOT NULL DEFAULT 'Perú',

    codigo_postal VARCHAR(20),

    principal BOOLEAN NOT NULL DEFAULT FALSE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,

    clave_principal VARCHAR(150)
        GENERATED ALWAYS AS (
            CASE
                WHEN principal = TRUE
                     AND activo = TRUE
                THEN CONCAT(
                    id_persona,
                    '-',
                    UPPER(TRIM(tipo))
                )
                ELSE NULL
            END
        ) STORED,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_direccion
        PRIMARY KEY (id_direccion),

    CONSTRAINT fk_direccion_persona
        FOREIGN KEY (id_persona)
        REFERENCES persona(id_persona)
        ON DELETE RESTRICT,

    CONSTRAINT unq_direccion_princ
        UNIQUE (clave_principal),

    INDEX idx_dir_persona (id_persona)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  
  -- ---- 3. SEGURIDAD -------------
    -- tabla seg_usuarios 
 CREATE TABLE usuario (
    id_usuario BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_persona BIGINT UNSIGNED NOT NULL,
    id_estado_usuario SMALLINT UNSIGNED NOT NULL,

    login VARCHAR(120) NOT NULL,
    clave_hash VARCHAR(255) NOT NULL,

    cambio_requerido BOOLEAN NOT NULL DEFAULT TRUE,
    intentos_fallidos SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    bloqueado_hasta DATETIME(6),
    ultimo_acceso DATETIME(6),
    fecha_cambio_clave DATETIME(6),

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_usuario
        PRIMARY KEY (id_usuario),

    CONSTRAINT unq_usuario_persona
        UNIQUE (id_persona),

    CONSTRAINT unq_usuario_login
        UNIQUE (login),

    CONSTRAINT fk_usuario_persona
        FOREIGN KEY (id_persona)
        REFERENCES persona(id_persona)
        ON DELETE RESTRICT,

    CONSTRAINT fk_usuario_estado
        FOREIGN KEY (id_estado_usuario)
        REFERENCES estado_usuario(id_estado_usuario)
        ON DELETE RESTRICT,

    INDEX idx_usuario_estado (id_estado_usuario)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla seg_roles --
  CREATE TABLE rol (
    id_rol SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_rol
        PRIMARY KEY (id_rol),

    CONSTRAINT unq_rol_codigo
        UNIQUE (codigo)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla Seg_permisos 
 CREATE TABLE permiso (
    id_permiso SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_permiso
        PRIMARY KEY (id_permiso),

    CONSTRAINT unq_permiso_codigo
        UNIQUE (codigo),

    CONSTRAINT unq_permiso_accion
        UNIQUE (modulo, recurso, accion)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla seg_usuarios_roles --
  CREATE TABLE asignacion_rol (
    id_asignacion BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_usuario BIGINT UNSIGNED NOT NULL,
    id_rol SMALLINT UNSIGNED NOT NULL,
    id_usuario_asigna BIGINT UNSIGNED,

    fecha_asignacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_revocacion DATETIME(6),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    clave_vigente VARCHAR(100)
        GENERATED ALWAYS AS (
            CASE
                WHEN activo = TRUE
                THEN CONCAT(id_usuario, '-', id_rol)
                ELSE NULL
            END
        ) STORED,

    CONSTRAINT pk_asignacion_rol
        PRIMARY KEY (id_asignacion),

    CONSTRAINT unq_asig_rol_vigente
        UNIQUE (clave_vigente),

    CONSTRAINT fk_asig_rol_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_asig_rol_rol
        FOREIGN KEY (id_rol)
        REFERENCES rol(id_rol)
        ON DELETE RESTRICT,

    CONSTRAINT fk_asig_rol_asigna
        FOREIGN KEY (id_usuario_asigna)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_asig_rol_fecha
        CHECK (
            fecha_revocacion IS NULL
            OR fecha_revocacion >= fecha_asignacion
        ),

    CONSTRAINT chk_asig_rol_estado
        CHECK (
            (activo = TRUE AND fecha_revocacion IS NULL)
            OR
            (activo = FALSE AND fecha_revocacion IS NOT NULL)
        ),

    INDEX idx_asig_rol_usuario (id_usuario),

    INDEX idx_asig_rol_rol (id_rol)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla seg_roles_permisos
  CREATE TABLE asignacion_permiso (
    id_asignacion BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_rol SMALLINT UNSIGNED NOT NULL,
    id_permiso SMALLINT UNSIGNED NOT NULL,
    id_usuario_asigna BIGINT UNSIGNED,

    fecha_asignacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT pk_asignacion_permiso
        PRIMARY KEY (id_asignacion),

    CONSTRAINT unq_asig_permiso
        UNIQUE (id_rol, id_permiso),

    CONSTRAINT fk_asig_permiso_rol
        FOREIGN KEY (id_rol)
        REFERENCES rol(id_rol)
        ON DELETE RESTRICT,

    CONSTRAINT fk_asig_permiso_perm
        FOREIGN KEY (id_permiso)
        REFERENCES permiso(id_permiso)
        ON DELETE RESTRICT,

    CONSTRAINT fk_asig_permiso_usuario
        FOREIGN KEY (id_usuario_asigna)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla seg_tokens_recuperación
  CREATE TABLE token_recuperacion (
    id_token BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_usuario BIGINT UNSIGNED NOT NULL,

    hash_token CHAR(64) NOT NULL,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_expiracion DATETIME(6) NOT NULL,
    fecha_uso DATETIME(6),

    ip_solicitud VARCHAR(45),
    agente_usuario VARCHAR(500),

    CONSTRAINT pk_token_recuperacion
        PRIMARY KEY (id_token),

    CONSTRAINT unq_token_hash
        UNIQUE (hash_token),

    CONSTRAINT fk_token_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_token_expiracion
        CHECK (
            fecha_expiracion > fecha_creacion
        ),

    CONSTRAINT chk_token_uso
        CHECK (
            fecha_uso IS NULL
            OR (
                fecha_uso >= fecha_creacion
                AND fecha_uso <= fecha_expiracion
            )
        ),

    INDEX idx_token_usuario (id_usuario),

    INDEX idx_token_expiracion (fecha_expiracion)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla seg_sesiones
 CREATE TABLE sesion (
    id_sesion BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_usuario BIGINT UNSIGNED NOT NULL,

    hash_token_refresco CHAR(64) NOT NULL,

    ip_origen VARCHAR(45),
    agente_usuario VARCHAR(500),

    fecha_inicio DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    ultima_actividad DATETIME(6),

    fecha_expiracion DATETIME(6) NOT NULL,
    fecha_revocacion DATETIME(6),

    motivo_revocacion VARCHAR(255),

    CONSTRAINT pk_sesion
        PRIMARY KEY (id_sesion),

    CONSTRAINT unq_sesion_token
        UNIQUE (hash_token_refresco),

    CONSTRAINT fk_sesion_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_sesion_expira
        CHECK (
            fecha_expiracion > fecha_inicio
        ),

    CONSTRAINT chk_sesion_actividad
        CHECK (
            ultima_actividad IS NULL
            OR (
                ultima_actividad >= fecha_inicio
                AND ultima_actividad <= fecha_expiracion
            )
        ),

    CONSTRAINT chk_sesion_revoca
        CHECK (
            fecha_revocacion IS NULL
            OR fecha_revocacion >= fecha_inicio
        ),

    INDEX idx_sesion_usuario (id_usuario),

    INDEX idx_sesion_expiracion (fecha_expiracion)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

 -- ---- 4. INMOBILIARIA ----------- 
-- TABLA inm_proyectos
CREATE TABLE proyecto (
    id_proyecto BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    area_total DECIMAL(14,2),

    fecha_inicio DATE,
    fecha_fin_estimada DATE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_proyecto
        PRIMARY KEY (id_proyecto),

    CONSTRAINT unq_proyecto_codigo
        UNIQUE (codigo),

    CONSTRAINT fk_proyecto_estado
        FOREIGN KEY (id_estado_proyecto)
        REFERENCES estado_proyecto(id_estado_proyecto)
        ON DELETE RESTRICT,

    CONSTRAINT chk_proyecto_area
        CHECK (
            area_total IS NULL
            OR area_total > 0
        ),

    CONSTRAINT chk_proyecto_latitud
        CHECK (
            latitud IS NULL
            OR latitud BETWEEN -90 AND 90
        ),

    CONSTRAINT chk_proyecto_longitud
        CHECK (
            longitud IS NULL
            OR longitud BETWEEN -180 AND 180
        ),

    CONSTRAINT chk_proyecto_fecha
        CHECK (
            fecha_fin_estimada IS NULL
            OR fecha_inicio IS NULL
            OR fecha_fin_estimada >= fecha_inicio
        )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
--  TABLA inm_etapas
CREATE TABLE etapa (
    id_etapa BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_proyecto BIGINT UNSIGNED NOT NULL,
    id_estado_etapa SMALLINT UNSIGNED NOT NULL,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,

    orden SMALLINT UNSIGNED NOT NULL DEFAULT 1,

    fecha_inicio DATE,
    fecha_fin_estimada DATE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_etapa
        PRIMARY KEY (id_etapa),

    CONSTRAINT unq_etapa_codigo
        UNIQUE (id_proyecto, codigo),

    CONSTRAINT unq_etapa_proyecto
        UNIQUE (id_etapa, id_proyecto),

    CONSTRAINT fk_etapa_proyecto
        FOREIGN KEY (id_proyecto)
        REFERENCES proyecto(id_proyecto)
        ON DELETE RESTRICT,

    CONSTRAINT fk_etapa_estado
        FOREIGN KEY (id_estado_etapa)
        REFERENCES estado_etapa(id_estado_etapa)
        ON DELETE RESTRICT,

    CONSTRAINT chk_etapa_orden
        CHECK (orden > 0),

    CONSTRAINT chk_etapa_fecha
        CHECK (
            fecha_fin_estimada IS NULL
            OR fecha_inicio IS NULL
            OR fecha_fin_estimada >= fecha_inicio
        )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
-- TABLA inm_manzanas
CREATE TABLE manzana (
    id_manzana BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_etapa BIGINT UNSIGNED NOT NULL,
    id_proyecto BIGINT UNSIGNED NOT NULL,
    id_estado_manzana SMALLINT UNSIGNED NOT NULL,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(100),
    descripcion VARCHAR(255),

    orden SMALLINT UNSIGNED NOT NULL DEFAULT 1,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_manzana
        PRIMARY KEY (id_manzana),

    CONSTRAINT unq_manzana_codigo
        UNIQUE (id_etapa, codigo),

    CONSTRAINT unq_manzana_proyecto
        UNIQUE (id_manzana, id_proyecto),

    CONSTRAINT fk_manzana_etapa
        FOREIGN KEY (id_etapa, id_proyecto)
        REFERENCES etapa(id_etapa, id_proyecto)
        ON DELETE RESTRICT,

    CONSTRAINT fk_manzana_estado
        FOREIGN KEY (id_estado_manzana)
        REFERENCES estado_manzana(id_estado_manzana)
        ON DELETE RESTRICT,

    CONSTRAINT chk_manzana_orden
        CHECK (orden > 0)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
-- TABLA INM_ZONAS
CREATE TABLE zona (
    id_zona BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_proyecto BIGINT UNSIGNED NOT NULL,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),

    orden SMALLINT UNSIGNED NOT NULL DEFAULT 1,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_zona
        PRIMARY KEY (id_zona),

    CONSTRAINT unq_zona_codigo
        UNIQUE (id_proyecto, codigo),

    CONSTRAINT unq_zona_proyecto
        UNIQUE (id_zona, id_proyecto),

    CONSTRAINT fk_zona_proyecto
        FOREIGN KEY (id_proyecto)
        REFERENCES proyecto(id_proyecto)
        ON DELETE RESTRICT,

    CONSTRAINT chk_zona_orden
        CHECK (orden > 0)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla inm_etapas_comerciales --
 CREATE TABLE etapa_comercial (
    id_etapa_comercial BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_proyecto BIGINT UNSIGNED NOT NULL,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),

    orden SMALLINT UNSIGNED NOT NULL DEFAULT 1,

    fecha_inicio DATE,
    fecha_fin DATE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_etapa_comercial
        PRIMARY KEY (id_etapa_comercial),

    CONSTRAINT unq_etapa_com_codigo
        UNIQUE (id_proyecto, codigo),

    CONSTRAINT unq_etapa_com_proy
        UNIQUE (id_etapa_comercial, id_proyecto),

    CONSTRAINT fk_etapa_com_proyecto
        FOREIGN KEY (id_proyecto)
        REFERENCES proyecto(id_proyecto)
        ON DELETE RESTRICT,

    CONSTRAINT chk_etapa_com_orden
        CHECK (orden > 0),

    CONSTRAINT chk_etapa_com_fecha
        CHECK (
            fecha_fin IS NULL
            OR fecha_inicio IS NULL
            OR fecha_fin >= fecha_inicio
        )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla inm_tarifas_zona_etapa --
  CREATE TABLE tarifa (
    id_tarifa BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_proyecto BIGINT UNSIGNED NOT NULL,
    id_zona BIGINT UNSIGNED NOT NULL,
    id_etapa_comercial BIGINT UNSIGNED NOT NULL,
    id_moneda SMALLINT UNSIGNED NOT NULL,
    id_tipo_tarifa SMALLINT UNSIGNED NOT NULL,

    valor DECIMAL(14,4) NOT NULL,

    fecha_desde DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_hasta DATETIME(6),

    observacion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    clave_vigente VARCHAR(200)
        GENERATED ALWAYS AS (
            CASE
                WHEN activo = TRUE
                     AND fecha_hasta IS NULL
                THEN CONCAT(
                    id_proyecto, '-',
                    id_zona, '-',
                    id_etapa_comercial, '-',
                    id_moneda, '-',
                    id_tipo_tarifa
                )
                ELSE NULL
            END
        ) STORED,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_tarifa
        PRIMARY KEY (id_tarifa),

    CONSTRAINT unq_tarifa_vigente
        UNIQUE (clave_vigente),

    CONSTRAINT fk_tarifa_zona
        FOREIGN KEY (id_zona, id_proyecto)
        REFERENCES zona(id_zona, id_proyecto)
        ON DELETE RESTRICT,

    CONSTRAINT fk_tarifa_etapa
        FOREIGN KEY (id_etapa_comercial, id_proyecto)
        REFERENCES etapa_comercial(
            id_etapa_comercial,
            id_proyecto
        )
        ON DELETE RESTRICT,

    CONSTRAINT fk_tarifa_moneda
        FOREIGN KEY (id_moneda)
        REFERENCES moneda(id_moneda)
        ON DELETE RESTRICT,

    CONSTRAINT fk_tarifa_tipo
        FOREIGN KEY (id_tipo_tarifa)
        REFERENCES tipo_tarifa(id_tipo_tarifa)
        ON DELETE RESTRICT,

    CONSTRAINT chk_tarifa_valor
        CHECK (valor > 0),

    CONSTRAINT chk_tarifa_fecha
        CHECK (
            fecha_hasta IS NULL
            OR fecha_hasta >= fecha_desde
        ),

    INDEX idx_tarifa_busqueda (
        id_proyecto,
        id_zona,
        id_etapa_comercial
    ),

    INDEX idx_tarifa_vigencia (
        fecha_desde,
        fecha_hasta
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA INM_AJUSTES_TIPO_LOTE
  CREATE TABLE ajuste_precio (
    id_ajuste BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_proyecto BIGINT UNSIGNED NOT NULL,
    id_tipo_lote SMALLINT UNSIGNED NOT NULL,
    id_tipo_ajuste_precio SMALLINT UNSIGNED NOT NULL,
    id_moneda SMALLINT UNSIGNED,

    valor DECIMAL(14,4) NOT NULL DEFAULT 0,

    fecha_desde DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_hasta DATETIME(6),

    observacion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    clave_vigente VARCHAR(160)
        GENERATED ALWAYS AS (
            CASE
                WHEN activo = TRUE
                     AND fecha_hasta IS NULL
                THEN CONCAT(
                    id_proyecto, '-',
                    id_tipo_lote, '-',
                    id_tipo_ajuste_precio, '-',
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

    CONSTRAINT pk_ajuste_precio
        PRIMARY KEY (id_ajuste),

    CONSTRAINT unq_ajuste_vigente
        UNIQUE (clave_vigente),

    CONSTRAINT fk_ajuste_proyecto
        FOREIGN KEY (id_proyecto)
        REFERENCES proyecto(id_proyecto)
        ON DELETE RESTRICT,

    CONSTRAINT fk_ajuste_lote
        FOREIGN KEY (id_tipo_lote)
        REFERENCES tipo_lote(id_tipo_lote)
        ON DELETE RESTRICT,

    CONSTRAINT fk_ajuste_tipo
        FOREIGN KEY (id_tipo_ajuste_precio)
        REFERENCES tipo_ajuste_precio(id_tipo_ajuste_precio)
        ON DELETE RESTRICT,

    CONSTRAINT fk_ajuste_moneda
        FOREIGN KEY (id_moneda)
        REFERENCES moneda(id_moneda)
        ON DELETE RESTRICT,

    CONSTRAINT chk_ajuste_valor
        CHECK (valor >= 0),

    CONSTRAINT chk_ajuste_fecha
        CHECK (
            fecha_hasta IS NULL
            OR fecha_hasta >= fecha_desde
        ),

    INDEX idx_ajuste_busqueda (
        id_proyecto,
        id_tipo_lote,
        fecha_desde
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
--  TABLA inm_lotes
CREATE TABLE lote (
    id_lote BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_manzana BIGINT UNSIGNED NOT NULL,
    id_zona BIGINT UNSIGNED,
    id_proyecto BIGINT UNSIGNED NOT NULL,
    id_tipo_lote SMALLINT UNSIGNED,
    id_estado_lote SMALLINT UNSIGNED NOT NULL,

    codigo VARCHAR(40) NOT NULL,
    numero VARCHAR(20) NOT NULL,

    area DECIMAL(12,2) NOT NULL,

    frente DECIMAL(10,2),
    fondo DECIMAL(10,2),
    lateral_derecho DECIMAL(10,2),
    lateral_izquierdo DECIMAL(10,2),

    observacion TEXT,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_lote
        PRIMARY KEY (id_lote),

    CONSTRAINT unq_lote_codigo
        UNIQUE (id_proyecto, codigo),

    CONSTRAINT unq_lote_numero
        UNIQUE (id_manzana, numero),

    CONSTRAINT unq_lote_proyecto
        UNIQUE (id_lote, id_proyecto),

    CONSTRAINT fk_lote_manzana
        FOREIGN KEY (id_manzana, id_proyecto)
        REFERENCES manzana(id_manzana, id_proyecto)
        ON DELETE RESTRICT,

    CONSTRAINT fk_lote_zona
        FOREIGN KEY (id_zona, id_proyecto)
        REFERENCES zona(id_zona, id_proyecto)
        ON DELETE RESTRICT,

    CONSTRAINT fk_lote_tipo
        FOREIGN KEY (id_tipo_lote)
        REFERENCES tipo_lote(id_tipo_lote)
        ON DELETE RESTRICT,

    CONSTRAINT fk_lote_estado
        FOREIGN KEY (id_estado_lote)
        REFERENCES estado_lote(id_estado_lote)
        ON DELETE RESTRICT,

    CONSTRAINT chk_lote_area
        CHECK (area > 0),

    CONSTRAINT chk_lote_frente
        CHECK (
            frente IS NULL
            OR frente > 0
        ),

    CONSTRAINT chk_lote_fondo
        CHECK (
            fondo IS NULL
            OR fondo > 0
        ),

    CONSTRAINT chk_lote_lateral_der
        CHECK (
            lateral_derecho IS NULL
            OR lateral_derecho > 0
        ),

    CONSTRAINT chk_lote_lateral_izq
        CHECK (
            lateral_izquierdo IS NULL
            OR lateral_izquierdo > 0
        ),

    INDEX idx_lote_zona (id_zona)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA inm_lotes_precios
CREATE TABLE precio_lote (
    id_precio BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_lote BIGINT UNSIGNED NOT NULL,
    id_moneda SMALLINT UNSIGNED NOT NULL,
    id_tarifa BIGINT UNSIGNED,
    id_ajuste BIGINT UNSIGNED,

    area_aplicada DECIMAL(12,2),
    valor_tarifa DECIMAL(14,4),

    precio_base DECIMAL(14,2),

    valor_ajuste DECIMAL(14,4),
    monto_ajuste DECIMAL(14,2) NOT NULL DEFAULT 0,

    precio DECIMAL(14,2) NOT NULL,

    fecha_desde DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_hasta DATETIME(6),

    observacion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    clave_vigente VARCHAR(100)
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

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_precio_lote
        PRIMARY KEY (id_precio),

    CONSTRAINT unq_precio_vigente
        UNIQUE (clave_vigente),

    CONSTRAINT fk_precio_lote
        FOREIGN KEY (id_lote)
        REFERENCES lote(id_lote)
        ON DELETE RESTRICT,

    CONSTRAINT fk_precio_moneda
        FOREIGN KEY (id_moneda)
        REFERENCES moneda(id_moneda)
        ON DELETE RESTRICT,

    CONSTRAINT fk_precio_tarifa
        FOREIGN KEY (id_tarifa)
        REFERENCES tarifa(id_tarifa)
        ON DELETE RESTRICT,

    CONSTRAINT fk_precio_ajuste
        FOREIGN KEY (id_ajuste)
        REFERENCES ajuste_precio(id_ajuste)
        ON DELETE RESTRICT,

    CONSTRAINT chk_precio_area
        CHECK (
            area_aplicada IS NULL
            OR area_aplicada > 0
        ),

    CONSTRAINT chk_precio_tarifa
        CHECK (
            valor_tarifa IS NULL
            OR valor_tarifa > 0
        ),

    CONSTRAINT chk_precio_base
        CHECK (
            precio_base IS NULL
            OR precio_base >= 0
        ),

    CONSTRAINT chk_precio_ajuste
        CHECK (
            valor_ajuste IS NULL
            OR valor_ajuste >= 0
        ),

    CONSTRAINT chk_precio_monto
        CHECK (monto_ajuste >= 0),

    CONSTRAINT chk_precio_final
        CHECK (precio >= 0),

    CONSTRAINT chk_precio_fecha
        CHECK (
            fecha_hasta IS NULL
            OR fecha_hasta >= fecha_desde
        ),

    INDEX idx_precio_historial (
        id_lote,
        fecha_desde
    ),

    INDEX idx_precio_tarifa (id_tarifa),

    INDEX idx_precio_ajuste (id_ajuste)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- imn_lotes_historial_estado
  CREATE TABLE historial_lote (
    id_historial BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_lote BIGINT UNSIGNED NOT NULL,
    id_estado_anterior SMALLINT UNSIGNED,
    id_estado_nuevo SMALLINT UNSIGNED NOT NULL,
    id_usuario BIGINT UNSIGNED,

    motivo VARCHAR(255),

    fecha_cambio DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_historial_lote
        PRIMARY KEY (id_historial),

    CONSTRAINT fk_historial_lote
        FOREIGN KEY (id_lote)
        REFERENCES lote(id_lote)
        ON DELETE RESTRICT,

    CONSTRAINT fk_historial_anterior
        FOREIGN KEY (id_estado_anterior)
        REFERENCES estado_lote(id_estado_lote)
        ON DELETE RESTRICT,

    CONSTRAINT fk_historial_nuevo
        FOREIGN KEY (id_estado_nuevo)
        REFERENCES estado_lote(id_estado_lote)
        ON DELETE RESTRICT,

    CONSTRAINT fk_historial_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_historial_estado
        CHECK (
            id_estado_anterior IS NULL
            OR id_estado_anterior <> id_estado_nuevo
        ),

    INDEX idx_historial_lote (
        id_lote,
        fecha_cambio
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA INM_PLANOS_INTERACTIVOS --
 CREATE TABLE plano_interactivo (
    id_plano BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_proyecto BIGINT UNSIGNED NOT NULL,
    id_etapa BIGINT UNSIGNED,
    id_usuario BIGINT UNSIGNED,

    codigo VARCHAR(40) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion VARCHAR(500),

    version SMALLINT UNSIGNED NOT NULL DEFAULT 1,

    etapa_version BIGINT UNSIGNED
        GENERATED ALWAYS AS (
            COALESCE(id_etapa, 0)
        ) STORED,

    clave_archivo VARCHAR(500) NOT NULL,
    nombre_archivo VARCHAR(255),
    tipo_mime VARCHAR(120),
    hash_archivo VARCHAR(128),

    ancho_referencia DECIMAL(12,4) NOT NULL,
    alto_referencia DECIMAL(12,4) NOT NULL,

    vigente BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_desde DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_hasta DATETIME(6),

    observacion VARCHAR(500),

    proyecto_vigente BIGINT UNSIGNED
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

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_plano_interactivo
        PRIMARY KEY (id_plano),

    CONSTRAINT unq_plano_codigo
        UNIQUE (id_proyecto, codigo),

    CONSTRAINT unq_plano_proyecto
        UNIQUE (id_plano, id_proyecto),

    CONSTRAINT unq_plano_version
        UNIQUE (
            id_proyecto,
            etapa_version,
            version
        ),

    CONSTRAINT unq_plano_proy_vig
        UNIQUE (proyecto_vigente),

    CONSTRAINT unq_plano_etapa_vig
        UNIQUE (clave_etapa_vigente),

    CONSTRAINT fk_plano_proyecto
        FOREIGN KEY (id_proyecto)
        REFERENCES proyecto(id_proyecto)
        ON DELETE RESTRICT,

    CONSTRAINT fk_plano_etapa
        FOREIGN KEY (id_etapa, id_proyecto)
        REFERENCES etapa(id_etapa, id_proyecto)
        ON DELETE RESTRICT,

    CONSTRAINT fk_plano_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_plano_version
        CHECK (version > 0),

    CONSTRAINT chk_plano_archivo
        CHECK (
            CHAR_LENGTH(TRIM(clave_archivo)) > 0
        ),

    CONSTRAINT chk_plano_dimension
        CHECK (
            ancho_referencia > 0
            AND alto_referencia > 0
        ),

    CONSTRAINT chk_plano_fecha
        CHECK (
            fecha_hasta IS NULL
            OR fecha_hasta >= fecha_desde
        ),

    CONSTRAINT chk_plano_vigencia
        CHECK (
            vigente = FALSE
            OR fecha_hasta IS NULL
        ),

    INDEX idx_plano_etapa (id_etapa)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA INM_LOTES_GEOMETRIAS -- 
  CREATE TABLE geometria_lote (
    id_geometria BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_proyecto BIGINT UNSIGNED NOT NULL,
    id_plano BIGINT UNSIGNED NOT NULL,
    id_lote BIGINT UNSIGNED NOT NULL,
    id_usuario BIGINT UNSIGNED,

    puntos JSON NOT NULL,

    etiqueta_x DECIMAL(12,4),
    etiqueta_y DECIMAL(12,4),

    rotacion_etiqueta DECIMAL(8,3) NOT NULL DEFAULT 0,

    orden_capa SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    visible BOOLEAN NOT NULL DEFAULT TRUE,
    interactivo BOOLEAN NOT NULL DEFAULT TRUE,

    observacion VARCHAR(500),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_geometria_lote
        PRIMARY KEY (id_geometria),

    CONSTRAINT unq_geo_plano_lote
        UNIQUE (id_plano, id_lote),

    CONSTRAINT fk_geo_plano
        FOREIGN KEY (id_plano, id_proyecto)
        REFERENCES plano_interactivo(
            id_plano,
            id_proyecto
        )
        ON DELETE RESTRICT,

    CONSTRAINT fk_geo_lote
        FOREIGN KEY (id_lote, id_proyecto)
        REFERENCES lote(
            id_lote,
            id_proyecto
        )
        ON DELETE RESTRICT,

    CONSTRAINT fk_geo_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_geo_puntos
        CHECK (
            JSON_TYPE(puntos) = 'ARRAY'
            AND JSON_LENGTH(puntos) >= 3
        ),

    CONSTRAINT chk_geo_etiqueta
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

    INDEX idx_geo_proyecto (
        id_proyecto
    ),

    INDEX idx_geo_plano_proy (
        id_plano,
        id_proyecto
    ),

    INDEX idx_geo_lote_proy (
        id_lote,
        id_proyecto
    ),

    INDEX idx_geo_visible (
        id_plano,
        visible
    ),

    INDEX idx_geo_orden (
        id_plano,
        orden_capa
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  

-- ------- 5. CRM -----------------------------------
  -- TABLA CRM_INTERES_COMERCIAL
  CREATE TABLE interes_comercial (
    id_interes BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_persona BIGINT UNSIGNED NOT NULL,
    id_proyecto BIGINT UNSIGNED NOT NULL,
    id_estado_prospecto SMALLINT UNSIGNED NOT NULL,
    id_origen_prospecto SMALLINT UNSIGNED NOT NULL,
    id_moneda SMALLINT UNSIGNED,

    codigo VARCHAR(30) NOT NULL,

    area_minima DECIMAL(12,2),
    area_maxima DECIMAL(12,2),

    presupuesto_minimo DECIMAL(14,2),
    presupuesto_maximo DECIMAL(14,2),

    financiamiento BOOLEAN,

    comentario TEXT,

    fecha_interes DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_conversion DATETIME(6),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_interes_comercial
        PRIMARY KEY (id_interes),

    CONSTRAINT unq_interes_codigo
        UNIQUE (codigo),

    CONSTRAINT fk_interes_persona
        FOREIGN KEY (id_persona)
        REFERENCES persona(id_persona)
        ON DELETE RESTRICT,

    CONSTRAINT fk_interes_proyecto
        FOREIGN KEY (id_proyecto)
        REFERENCES proyecto(id_proyecto)
        ON DELETE RESTRICT,

    CONSTRAINT fk_interes_estado
        FOREIGN KEY (id_estado_prospecto)
        REFERENCES estado_prospecto(id_estado_prospecto)
        ON DELETE RESTRICT,

    CONSTRAINT fk_interes_origen
        FOREIGN KEY (id_origen_prospecto)
        REFERENCES origen_prospecto(id_origen_prospecto)
        ON DELETE RESTRICT,

    CONSTRAINT fk_interes_moneda
        FOREIGN KEY (id_moneda)
        REFERENCES moneda(id_moneda)
        ON DELETE RESTRICT,

    CONSTRAINT chk_interes_area_min
        CHECK (
            area_minima IS NULL
            OR area_minima > 0
        ),

    CONSTRAINT chk_interes_area_max
        CHECK (
            area_maxima IS NULL
            OR area_maxima > 0
        ),

    CONSTRAINT chk_interes_area
        CHECK (
            area_minima IS NULL
            OR area_maxima IS NULL
            OR area_maxima >= area_minima
        ),

    CONSTRAINT chk_interes_pres_min
        CHECK (
            presupuesto_minimo IS NULL
            OR presupuesto_minimo >= 0
        ),

    CONSTRAINT chk_interes_pres_max
        CHECK (
            presupuesto_maximo IS NULL
            OR presupuesto_maximo >= 0
        ),

    CONSTRAINT chk_interes_presupuesto
        CHECK (
            presupuesto_minimo IS NULL
            OR presupuesto_maximo IS NULL
            OR presupuesto_maximo >= presupuesto_minimo
        ),

    CONSTRAINT chk_interes_moneda
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

    CONSTRAINT chk_interes_conversion
        CHECK (
            fecha_conversion IS NULL
            OR fecha_conversion >= fecha_interes
        ),

    INDEX idx_interes_persona (id_persona),

    INDEX idx_interes_estado (id_estado_prospecto),

    INDEX idx_interes_origen (id_origen_prospecto),

    INDEX idx_interes_proyecto (id_proyecto),

    INDEX idx_interes_moneda (id_moneda),

    INDEX idx_interes_fecha (fecha_interes)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CRM_SEGUIMIENTO
  CREATE TABLE seguimiento (
    id_seguimiento BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_interes BIGINT UNSIGNED NOT NULL,
    id_tipo_seguimiento SMALLINT UNSIGNED NOT NULL,
    id_usuario BIGINT UNSIGNED,

    fecha_seguimiento DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    asunto VARCHAR(150),
    detalle TEXT,
    resultado VARCHAR(255),

    requiere_seguimiento BOOLEAN NOT NULL DEFAULT FALSE,

    fecha_proximo DATETIME(6),

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_seguimiento
        PRIMARY KEY (id_seguimiento),

    CONSTRAINT fk_seguimiento_interes
        FOREIGN KEY (id_interes)
        REFERENCES interes_comercial(id_interes)
        ON DELETE RESTRICT,

    CONSTRAINT fk_seguimiento_tipo
        FOREIGN KEY (id_tipo_seguimiento)
        REFERENCES tipo_seguimiento(id_tipo_seguimiento)
        ON DELETE RESTRICT,

    CONSTRAINT fk_seguimiento_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_seguimiento_fecha
        CHECK (
            fecha_proximo IS NULL
            OR fecha_proximo >= fecha_seguimiento
        ),

    CONSTRAINT chk_seguimiento_proximo
        CHECK (
            (
                requiere_seguimiento = TRUE
                AND fecha_proximo IS NOT NULL
            )
            OR
            (
                requiere_seguimiento = FALSE
                AND fecha_proximo IS NULL
            )
        ),

    INDEX idx_seguimiento_interes (
        id_interes,
        fecha_seguimiento
    ),

    INDEX idx_seguimiento_proximo (
        fecha_proximo
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CRM_CONSENTIMIENTOS 
 CREATE TABLE consentimiento (
    id_consentimiento BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

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

    CONSTRAINT pk_consentimiento
        PRIMARY KEY (id_consentimiento),

    CONSTRAINT fk_consent_persona
        FOREIGN KEY (id_persona)
        REFERENCES persona(id_persona)
        ON DELETE RESTRICT,

    CONSTRAINT fk_consent_tipo
        FOREIGN KEY (id_tipo_consentimiento)
        REFERENCES tipo_consentimiento(id_tipo_consentimiento)
        ON DELETE RESTRICT,

    CONSTRAINT chk_consent_revoca
        CHECK (
            fecha_revocacion IS NULL
            OR (
                aceptado = TRUE
                AND fecha_revocacion >= fecha_consentimiento
            )
        ),

    INDEX idx_consent_persona (
        id_persona,
        id_tipo_consentimiento
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
-- ---- 6. VENTAS ------------
  -- TABLA VEN_RESERVAS 
  CREATE TABLE reserva (
    id_reserva BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_lote BIGINT UNSIGNED NOT NULL,
    id_persona BIGINT UNSIGNED NOT NULL,
    id_estado_reserva SMALLINT UNSIGNED NOT NULL,
    id_moneda SMALLINT UNSIGNED NOT NULL,
    id_usuario BIGINT UNSIGNED,

    codigo VARCHAR(30) NOT NULL,

    fecha_reserva DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_vencimiento DATETIME(6) NOT NULL,

    monto_reserva DECIMAL(14,2) NOT NULL DEFAULT 0,

    observacion TEXT,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_reserva
        PRIMARY KEY (id_reserva),

    CONSTRAINT unq_reserva_codigo
        UNIQUE (codigo),

    CONSTRAINT unq_reserva_lote
        UNIQUE (id_reserva, id_lote),

    CONSTRAINT unq_reserva_moneda
        UNIQUE (id_reserva, id_moneda),

    CONSTRAINT fk_reserva_lote
        FOREIGN KEY (id_lote)
        REFERENCES lote(id_lote)
        ON DELETE RESTRICT,

    CONSTRAINT fk_reserva_persona
        FOREIGN KEY (id_persona)
        REFERENCES persona(id_persona)
        ON DELETE RESTRICT,

    CONSTRAINT fk_reserva_estado
        FOREIGN KEY (id_estado_reserva)
        REFERENCES estado_reserva(id_estado_reserva)
        ON DELETE RESTRICT,

    CONSTRAINT fk_reserva_moneda
        FOREIGN KEY (id_moneda)
        REFERENCES moneda(id_moneda)
        ON DELETE RESTRICT,

    CONSTRAINT fk_reserva_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_reserva_monto
        CHECK (
            monto_reserva >= 0
        ),

    CONSTRAINT chk_reserva_fecha
        CHECK (
            fecha_vencimiento > fecha_reserva
        ),

    INDEX idx_reserva_lote_estado (
        id_lote,
        id_estado_reserva
    ),

    INDEX idx_reserva_persona (
        id_persona
    ),

    INDEX idx_reserva_estado (
        id_estado_reserva
    ),

    INDEX idx_reserva_vencimiento (
        fecha_vencimiento
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA VEN_VENTAS 
 CREATE TABLE venta (
    id_venta BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_lote BIGINT UNSIGNED NOT NULL,
    id_reserva BIGINT UNSIGNED,
    id_estado_venta SMALLINT UNSIGNED NOT NULL,
    id_modalidad_venta SMALLINT UNSIGNED NOT NULL,
    id_moneda SMALLINT UNSIGNED NOT NULL,
    id_usuario BIGINT UNSIGNED,

    codigo VARCHAR(30) NOT NULL,

    fecha_venta DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    precio_lista DECIMAL(14,2),
    descuento DECIMAL(14,2) NOT NULL DEFAULT 0,
    precio_venta DECIMAL(14,2) NOT NULL,

    observacion TEXT,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_venta
        PRIMARY KEY (id_venta),

    CONSTRAINT unq_venta_codigo
        UNIQUE (codigo),

    CONSTRAINT unq_venta_reserva
        UNIQUE (id_reserva),

    CONSTRAINT unq_venta_moneda
        UNIQUE (
            id_venta,
            id_moneda
        ),

    CONSTRAINT unq_venta_res_mon
        UNIQUE (
            id_venta,
            id_reserva,
            id_moneda
        ),

    CONSTRAINT fk_venta_lote
        FOREIGN KEY (id_lote)
        REFERENCES lote(id_lote)
        ON DELETE RESTRICT,

    CONSTRAINT fk_venta_res_lote
        FOREIGN KEY (
            id_reserva,
            id_lote
        )
        REFERENCES reserva(
            id_reserva,
            id_lote
        )
        ON DELETE RESTRICT,

    CONSTRAINT fk_venta_res_moneda
        FOREIGN KEY (
            id_reserva,
            id_moneda
        )
        REFERENCES reserva(
            id_reserva,
            id_moneda
        )
        ON DELETE RESTRICT,

    CONSTRAINT fk_venta_estado
        FOREIGN KEY (id_estado_venta)
        REFERENCES estado_venta(id_estado_venta)
        ON DELETE RESTRICT,

    CONSTRAINT fk_venta_modalidad
        FOREIGN KEY (id_modalidad_venta)
        REFERENCES modalidad_venta(id_modalidad_venta)
        ON DELETE RESTRICT,

    CONSTRAINT fk_venta_moneda
        FOREIGN KEY (id_moneda)
        REFERENCES moneda(id_moneda)
        ON DELETE RESTRICT,

    CONSTRAINT fk_venta_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_venta_precio_lista
        CHECK (
            precio_lista IS NULL
            OR precio_lista >= 0
        ),

    CONSTRAINT chk_venta_descuento
        CHECK (
            descuento >= 0
        ),

    CONSTRAINT chk_venta_desc_lista
        CHECK (
            precio_lista IS NULL
            OR descuento <= precio_lista
        ),

    CONSTRAINT chk_venta_precio
        CHECK (
            precio_venta > 0
        ),

    INDEX idx_venta_lote (
        id_lote
    ),

    INDEX idx_venta_res_lote (
        id_reserva,
        id_lote
    ),

    INDEX idx_venta_res_moneda (
        id_reserva,
        id_moneda
    ),

    INDEX idx_venta_estado (
        id_estado_venta
    ),

    INDEX idx_venta_modalidad (
        id_modalidad_venta
    ),

    INDEX idx_venta_fecha (
        fecha_venta
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA PARTICIPACION_VENTA
  CREATE TABLE participacion_venta (
    id_participacion BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_venta BIGINT UNSIGNED NOT NULL,
    id_persona BIGINT UNSIGNED NOT NULL,

    titular BOOLEAN NOT NULL DEFAULT FALSE,

    participacion DECIMAL(5,2) NOT NULL,

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

    CONSTRAINT pk_participacion_venta
        PRIMARY KEY (id_participacion),

    CONSTRAINT unq_part_venta_persona
        UNIQUE (id_venta, id_persona),

    CONSTRAINT unq_part_venta_titular
        UNIQUE (id_venta_titular),

    CONSTRAINT fk_part_venta
        FOREIGN KEY (id_venta)
        REFERENCES venta(id_venta)
        ON DELETE RESTRICT,

    CONSTRAINT fk_part_persona
        FOREIGN KEY (id_persona)
        REFERENCES persona(id_persona)
        ON DELETE RESTRICT,

    CONSTRAINT chk_part_porcentaje
        CHECK (
            participacion > 0
            AND participacion <= 100
        ),

    INDEX idx_part_persona (
        id_persona
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA VEN_CONTRATOS 
  CREATE TABLE contrato (
    id_contrato BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_venta BIGINT UNSIGNED NOT NULL,
    id_tipo_contrato SMALLINT UNSIGNED NOT NULL,
    id_estado_contrato SMALLINT UNSIGNED NOT NULL,
    id_usuario BIGINT UNSIGNED,

    codigo VARCHAR(40) NOT NULL,
    numero VARCHAR(50),

    fecha_emision DATE,
    fecha_firma DATE,

    inicio_vigencia DATE,
    fin_vigencia DATE,

    observacion TEXT,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_contrato
        PRIMARY KEY (id_contrato),

    CONSTRAINT unq_contrato_codigo
        UNIQUE (codigo),

    CONSTRAINT unq_contrato_numero
        UNIQUE (numero),

    CONSTRAINT fk_contrato_venta
        FOREIGN KEY (id_venta)
        REFERENCES venta(id_venta)
        ON DELETE RESTRICT,

    CONSTRAINT fk_contrato_tipo
        FOREIGN KEY (id_tipo_contrato)
        REFERENCES tipo_contrato(id_tipo_contrato)
        ON DELETE RESTRICT,

    CONSTRAINT fk_contrato_estado
        FOREIGN KEY (id_estado_contrato)
        REFERENCES estado_contrato(id_estado_contrato)
        ON DELETE RESTRICT,

    CONSTRAINT fk_contrato_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_contrato_firma
        CHECK (
            fecha_firma IS NULL
            OR fecha_emision IS NULL
            OR fecha_firma >= fecha_emision
        ),

    CONSTRAINT chk_contrato_vigencia
        CHECK (
            fin_vigencia IS NULL
            OR inicio_vigencia IS NULL
            OR fin_vigencia >= inicio_vigencia
        ),

    INDEX idx_contrato_venta (
        id_venta
    ),

    INDEX idx_contrato_tipo (
        id_tipo_contrato
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA VEN_CONTRATOS_ARCHIVOS --
  CREATE TABLE documento_contractual (
    id_documento BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_contrato BIGINT UNSIGNED NOT NULL,
    id_usuario_carga BIGINT UNSIGNED,
    id_usuario_publica BIGINT UNSIGNED,

    codigo VARCHAR(50) NOT NULL,

    version SMALLINT UNSIGNED NOT NULL DEFAULT 1,

    nombre VARCHAR(180) NOT NULL,

    nombre_archivo VARCHAR(255) NOT NULL,
    clave_archivo VARCHAR(500) NOT NULL,

    tipo_mime VARCHAR(120),
    tamano_archivo BIGINT UNSIGNED,
    hash_archivo VARCHAR(128),

    vigente BOOLEAN NOT NULL DEFAULT TRUE,
    visible_cliente BOOLEAN NOT NULL DEFAULT FALSE,

    fecha_emision DATETIME(6),
    fecha_publicacion DATETIME(6),

    observacion VARCHAR(500),

    fecha_carga DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    id_contrato_vigente BIGINT UNSIGNED
        GENERATED ALWAYS AS (
            CASE
                WHEN vigente = TRUE
                THEN id_contrato
                ELSE NULL
            END
        ) STORED,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_documento_contract
        PRIMARY KEY (id_documento),

    CONSTRAINT unq_doc_contract_codigo
        UNIQUE (codigo),

    CONSTRAINT unq_doc_contract_version
        UNIQUE (
            id_contrato,
            version
        ),

    CONSTRAINT unq_doc_contract_vigente
        UNIQUE (id_contrato_vigente),

    CONSTRAINT fk_doc_contract_contrato
        FOREIGN KEY (id_contrato)
        REFERENCES contrato(id_contrato)
        ON DELETE RESTRICT,

    CONSTRAINT fk_doc_contract_carga
        FOREIGN KEY (id_usuario_carga)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_doc_contract_publica
        FOREIGN KEY (id_usuario_publica)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_doc_contract_version
        CHECK (
            version > 0
        ),

    CONSTRAINT chk_doc_contract_nombre
        CHECK (
            CHAR_LENGTH(TRIM(nombre)) > 0
        ),

    CONSTRAINT chk_doc_contract_clave
        CHECK (
            CHAR_LENGTH(TRIM(clave_archivo)) > 0
        ),

    CONSTRAINT chk_doc_contract_tamano
        CHECK (
            tamano_archivo IS NULL
            OR tamano_archivo > 0
        ),

    CONSTRAINT chk_doc_contract_publica
        CHECK (
            (
                fecha_publicacion IS NULL
                AND id_usuario_publica IS NULL
            )
            OR
            (
                fecha_publicacion IS NOT NULL
                AND id_usuario_publica IS NOT NULL
            )
        ),

    CONSTRAINT chk_doc_contract_visible
        CHECK (
            visible_cliente = FALSE
            OR fecha_publicacion IS NOT NULL
        ),

    CONSTRAINT chk_doc_contract_fecha
        CHECK (
            fecha_publicacion IS NULL
            OR fecha_publicacion >= fecha_carga
        ),

    INDEX idx_doc_contract (
        id_contrato,
        vigente
    ),

    INDEX idx_doc_visible (
        visible_cliente
    ),

    INDEX idx_doc_publicacion (
        fecha_publicacion
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- 7. PAGOS Y FINANCIAMIENTO --
  -- TABLA PAG_PLANES_PAGO
CREATE TABLE plan_pago (
    id_plan_pago BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_venta BIGINT UNSIGNED NOT NULL,
    id_estado_plan_pago SMALLINT UNSIGNED NOT NULL,
    id_moneda SMALLINT UNSIGNED NOT NULL,

    codigo VARCHAR(40) NOT NULL,

    version SMALLINT UNSIGNED NOT NULL DEFAULT 1,

    monto_venta DECIMAL(14,2) NOT NULL,
    monto_inicial DECIMAL(14,2) NOT NULL DEFAULT 0,
    capital_financiado DECIMAL(14,2) NOT NULL,

    tasa_interes DECIMAL(9,6),

    interes_total DECIMAL(14,2),
    total_financiado DECIMAL(14,2),

    num_cuotas SMALLINT UNSIGNED NOT NULL,

    fecha_inicio DATE NOT NULL,
    fecha_primera_cuota DATE NOT NULL,

    condiciones VARCHAR(500),

    vigente BOOLEAN NOT NULL DEFAULT TRUE,

    id_venta_vigente BIGINT UNSIGNED
        GENERATED ALWAYS AS (
            CASE
                WHEN vigente = TRUE
                THEN id_venta
                ELSE NULL
            END
        ) STORED,

    fecha_cierre DATETIME(6),
    motivo_cierre VARCHAR(255),

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_plan_pago
        PRIMARY KEY (id_plan_pago),

    CONSTRAINT unq_plan_codigo
        UNIQUE (codigo),

    CONSTRAINT unq_plan_version
        UNIQUE (id_venta, version),

    CONSTRAINT unq_plan_venta
        UNIQUE (
            id_plan_pago,
            id_venta,
            id_moneda
        ),

    CONSTRAINT unq_plan_vigente
        UNIQUE (id_venta_vigente),

    CONSTRAINT fk_plan_venta
        FOREIGN KEY (id_venta, id_moneda)
        REFERENCES venta(id_venta, id_moneda)
        ON DELETE RESTRICT,

    CONSTRAINT fk_plan_estado
        FOREIGN KEY (id_estado_plan_pago)
        REFERENCES estado_plan_pago(id_estado_plan_pago)
        ON DELETE RESTRICT,

    CONSTRAINT fk_plan_moneda
        FOREIGN KEY (id_moneda)
        REFERENCES moneda(id_moneda)
        ON DELETE RESTRICT,

    CONSTRAINT chk_plan_venta
        CHECK (
            monto_venta > 0
        ),

    CONSTRAINT chk_plan_inicial
        CHECK (
            monto_inicial >= 0
            AND monto_inicial <= monto_venta
        ),

    CONSTRAINT chk_plan_capital
        CHECK (
            capital_financiado =
                monto_venta - monto_inicial
        ),

    CONSTRAINT chk_plan_tasa
        CHECK (
            tasa_interes IS NULL
            OR tasa_interes >= 0
        ),

    CONSTRAINT chk_plan_interes
        CHECK (
            interes_total IS NULL
            OR interes_total >= 0
        ),

    CONSTRAINT chk_plan_total
        CHECK (
            (
                interes_total IS NULL
                AND total_financiado IS NULL
            )
            OR
            (
                interes_total IS NOT NULL
                AND total_financiado IS NOT NULL
                AND total_financiado =
                    capital_financiado + interes_total
            )
        ),

    CONSTRAINT chk_plan_cuotas
        CHECK (
            num_cuotas > 0
        ),

    CONSTRAINT chk_plan_primera
        CHECK (
            fecha_primera_cuota >= fecha_inicio
        ),

    CONSTRAINT chk_plan_cierre
        CHECK (
            fecha_cierre IS NULL
            OR fecha_cierre >= fecha_inicio
        ),

    CONSTRAINT chk_plan_vigencia
        CHECK (
            (
                vigente = TRUE
                AND fecha_cierre IS NULL
                AND motivo_cierre IS NULL
            )
            OR
            (
                vigente = FALSE
                AND fecha_cierre IS NOT NULL
                AND motivo_cierre IS NOT NULL
                AND CHAR_LENGTH(TRIM(motivo_cierre)) > 0
            )
        ),

    INDEX idx_plan_estado (
        id_estado_plan_pago
    ),

    INDEX idx_plan_vigente (
        id_venta,
        vigente
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- TABLA PAG_CUOTAS --
CREATE TABLE cuota (
    id_cuota BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_plan_pago BIGINT UNSIGNED NOT NULL,
    id_estado_cuota SMALLINT UNSIGNED NOT NULL,

    numero SMALLINT UNSIGNED NOT NULL,

    fecha_vencimiento DATE NOT NULL,

    monto_capital DECIMAL(14,2) NOT NULL DEFAULT 0,
    monto_interes DECIMAL(14,2) NOT NULL DEFAULT 0,
    monto DECIMAL(14,2) NOT NULL,

    fecha_pago DATETIME(6),

    observacion VARCHAR(255),

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_cuota
        PRIMARY KEY (id_cuota),

    CONSTRAINT unq_cuota_numero
        UNIQUE (
            id_plan_pago,
            numero
        ),

    CONSTRAINT unq_cuota_plan
        UNIQUE (
            id_cuota,
            id_plan_pago
        ),

    CONSTRAINT fk_cuota_plan
        FOREIGN KEY (id_plan_pago)
        REFERENCES plan_pago(id_plan_pago)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cuota_estado
        FOREIGN KEY (id_estado_cuota)
        REFERENCES estado_cuota(id_estado_cuota)
        ON DELETE RESTRICT,

    CONSTRAINT chk_cuota_numero
        CHECK (
            numero > 0
        ),

    CONSTRAINT chk_cuota_capital
        CHECK (
            monto_capital >= 0
        ),

    CONSTRAINT chk_cuota_interes
        CHECK (
            monto_interes >= 0
        ),

    CONSTRAINT chk_cuota_monto
        CHECK (
            monto > 0
        ),

    CONSTRAINT chk_cuota_total
        CHECK (
            monto = monto_capital + monto_interes
        ),

    INDEX idx_cuota_estado (
        id_estado_cuota
    ),

    INDEX idx_cuota_vencimiento (
        fecha_vencimiento
    ),

    INDEX idx_cuota_plan_fecha (
        id_plan_pago,
        fecha_vencimiento
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

  -- TABLA PAG_PAGOS --
CREATE TABLE pago (
    id_pago BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_reserva BIGINT UNSIGNED,
    id_venta BIGINT UNSIGNED,
    id_plan_pago BIGINT UNSIGNED,

    id_estado_pago SMALLINT UNSIGNED NOT NULL,
    id_metodo_pago SMALLINT UNSIGNED NOT NULL,
    id_moneda SMALLINT UNSIGNED NOT NULL,

    id_usuario_registra BIGINT UNSIGNED,
    id_usuario_confirma BIGINT UNSIGNED,
    id_usuario_anula BIGINT UNSIGNED,

    codigo VARCHAR(40) NOT NULL,

    monto DECIMAL(14,2) NOT NULL,

    fecha_operacion DATETIME(6) NOT NULL,

    numero_operacion VARCHAR(100),

    observacion VARCHAR(500),

    fecha_confirmacion DATETIME(6),

    fecha_anulacion DATETIME(6),
    motivo_anulacion VARCHAR(255),

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_pago
        PRIMARY KEY (id_pago),

    CONSTRAINT unq_pago_codigo
        UNIQUE (codigo),

    CONSTRAINT unq_pago_plan
        UNIQUE (
            id_pago,
            id_plan_pago
        ),

    CONSTRAINT fk_pago_reserva
        FOREIGN KEY (id_reserva, id_moneda)
        REFERENCES reserva(id_reserva, id_moneda)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pago_venta
        FOREIGN KEY (id_venta, id_moneda)
        REFERENCES venta(id_venta, id_moneda)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pago_venta_res
        FOREIGN KEY (
            id_venta,
            id_reserva,
            id_moneda
        )
        REFERENCES venta(
            id_venta,
            id_reserva,
            id_moneda
        )
        ON DELETE RESTRICT,

    CONSTRAINT fk_pago_plan
        FOREIGN KEY (
            id_plan_pago,
            id_venta,
            id_moneda
        )
        REFERENCES plan_pago(
            id_plan_pago,
            id_venta,
            id_moneda
        )
        ON DELETE RESTRICT,

    CONSTRAINT fk_pago_estado
        FOREIGN KEY (id_estado_pago)
        REFERENCES estado_pago(id_estado_pago)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pago_metodo
        FOREIGN KEY (id_metodo_pago)
        REFERENCES metodo_pago(id_metodo_pago)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pago_registra
        FOREIGN KEY (id_usuario_registra)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pago_confirma
        FOREIGN KEY (id_usuario_confirma)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pago_anula
        FOREIGN KEY (id_usuario_anula)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_pago_monto
        CHECK (
            monto > 0
        ),

    CONSTRAINT chk_pago_contexto
        CHECK (
            id_reserva IS NOT NULL
            OR id_venta IS NOT NULL
        ),

    CONSTRAINT chk_pago_plan
        CHECK (
            id_plan_pago IS NULL
            OR id_venta IS NOT NULL
        ),

    CONSTRAINT chk_pago_confirma
        CHECK (
            (
                fecha_confirmacion IS NULL
                AND id_usuario_confirma IS NULL
            )
            OR
            (
                fecha_confirmacion IS NOT NULL
                AND id_usuario_confirma IS NOT NULL
            )
        ),

    CONSTRAINT chk_pago_fecha_conf
        CHECK (
            fecha_confirmacion IS NULL
            OR fecha_confirmacion >= fecha_operacion
        ),

    CONSTRAINT chk_pago_anula
        CHECK (
            (
                fecha_anulacion IS NULL
                AND id_usuario_anula IS NULL
                AND motivo_anulacion IS NULL
            )
            OR
            (
                fecha_anulacion IS NOT NULL
                AND id_usuario_anula IS NOT NULL
                AND motivo_anulacion IS NOT NULL
                AND CHAR_LENGTH(TRIM(motivo_anulacion)) > 0
            )
        ),

    CONSTRAINT chk_pago_fecha_anula
        CHECK (
            fecha_anulacion IS NULL
            OR fecha_anulacion >= fecha_operacion
        ),

    CONSTRAINT chk_pago_orden_anula
        CHECK (
            fecha_anulacion IS NULL
            OR fecha_confirmacion IS NULL
            OR fecha_anulacion >= fecha_confirmacion
        ),

    INDEX idx_pago_reserva (
        id_reserva
    ),

    INDEX idx_pago_venta (
        id_venta
    ),

    INDEX idx_pago_plan (
        id_plan_pago
    ),

    INDEX idx_pago_estado (
        id_estado_pago
    ),

    INDEX idx_pago_metodo (
        id_metodo_pago
    ),

    INDEX idx_pago_fecha (
        fecha_operacion
    ),

    INDEX idx_pago_operacion (
        numero_operacion
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla pag_aplicaciones_pago --
  CREATE TABLE aplicacion_pago (
    id_aplicacion BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_pago BIGINT UNSIGNED NOT NULL,
    id_tipo_aplicacion_pago SMALLINT UNSIGNED NOT NULL,
    id_plan_pago BIGINT UNSIGNED,
    id_cuota BIGINT UNSIGNED,

    id_usuario_aplica BIGINT UNSIGNED,
    id_usuario_anula BIGINT UNSIGNED,

    monto DECIMAL(14,2) NOT NULL,

    fecha_aplicacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    observacion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_anulacion DATETIME(6),
    motivo_anulacion VARCHAR(255),

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_aplicacion_pago
        PRIMARY KEY (id_aplicacion),

    CONSTRAINT fk_aplicacion_pago
        FOREIGN KEY (id_pago)
        REFERENCES pago(id_pago)
        ON DELETE RESTRICT,

    CONSTRAINT fk_aplicacion_tipo
        FOREIGN KEY (id_tipo_aplicacion_pago)
        REFERENCES tipo_aplicacion_pago(id_tipo_aplicacion_pago)
        ON DELETE RESTRICT,

    CONSTRAINT fk_aplicacion_plan
        FOREIGN KEY (id_pago, id_plan_pago)
        REFERENCES pago(id_pago, id_plan_pago)
        ON DELETE RESTRICT,

    CONSTRAINT fk_aplicacion_cuota
        FOREIGN KEY (id_cuota, id_plan_pago)
        REFERENCES cuota(id_cuota, id_plan_pago)
        ON DELETE RESTRICT,

    CONSTRAINT fk_aplicacion_usuario
        FOREIGN KEY (id_usuario_aplica)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_aplicacion_anula
        FOREIGN KEY (id_usuario_anula)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_aplicacion_monto
        CHECK (
            monto > 0
        ),

    CONSTRAINT chk_aplicacion_cuota
        CHECK (
            id_cuota IS NULL
            OR id_plan_pago IS NOT NULL
        ),

    CONSTRAINT chk_aplicacion_anula
        CHECK (
            (
                activo = TRUE
                AND fecha_anulacion IS NULL
                AND id_usuario_anula IS NULL
                AND motivo_anulacion IS NULL
            )
            OR
            (
                activo = FALSE
                AND fecha_anulacion IS NOT NULL
                AND id_usuario_anula IS NOT NULL
                AND motivo_anulacion IS NOT NULL
                AND CHAR_LENGTH(TRIM(motivo_anulacion)) > 0
            )
        ),

    CONSTRAINT chk_aplicacion_fecha
        CHECK (
            fecha_anulacion IS NULL
            OR fecha_anulacion >= fecha_aplicacion
        ),

    INDEX idx_aplicacion_pago_plan (
        id_pago,
        id_plan_pago
    ),

    INDEX idx_aplicacion_cuota (
        id_cuota,
        id_plan_pago
    ),

    INDEX idx_aplicacion_plan (
        id_plan_pago
    ),

    INDEX idx_aplicacion_tipo (
        id_tipo_aplicacion_pago
    ),

    INDEX idx_aplicacion_fecha (
        fecha_aplicacion
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla pag_vouchers --
  CREATE TABLE voucher (
    id_voucher BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_pago BIGINT UNSIGNED NOT NULL,
    id_estado_voucher SMALLINT UNSIGNED NOT NULL,

    id_usuario_carga BIGINT UNSIGNED,
    id_usuario_valida BIGINT UNSIGNED,

    codigo VARCHAR(40) NOT NULL,

    version SMALLINT UNSIGNED NOT NULL DEFAULT 1,

    nombre_archivo VARCHAR(255) NOT NULL,
    clave_archivo VARCHAR(500) NOT NULL,

    tipo_mime VARCHAR(100),
    tamano_archivo BIGINT UNSIGNED,
    hash_archivo CHAR(64),

    fecha_carga DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_validacion DATETIME(6),

    motivo_rechazo VARCHAR(255),
    observacion VARCHAR(500),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_voucher
        PRIMARY KEY (id_voucher),

    CONSTRAINT unq_voucher_codigo
        UNIQUE (codigo),

    CONSTRAINT unq_voucher_version
        UNIQUE (
            id_pago,
            version
        ),

    CONSTRAINT fk_voucher_pago
        FOREIGN KEY (id_pago)
        REFERENCES pago(id_pago)
        ON DELETE RESTRICT,

    CONSTRAINT fk_voucher_estado
        FOREIGN KEY (id_estado_voucher)
        REFERENCES estado_voucher(id_estado_voucher)
        ON DELETE RESTRICT,

    CONSTRAINT fk_voucher_carga
        FOREIGN KEY (id_usuario_carga)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_voucher_valida
        FOREIGN KEY (id_usuario_valida)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_voucher_version
        CHECK (
            version > 0
        ),

    CONSTRAINT chk_voucher_archivo
        CHECK (
            CHAR_LENGTH(TRIM(clave_archivo)) > 0
        ),

    CONSTRAINT chk_voucher_tamano
        CHECK (
            tamano_archivo IS NULL
            OR tamano_archivo > 0
        ),

    CONSTRAINT chk_voucher_validacion
        CHECK (
            fecha_validacion IS NULL
            OR fecha_validacion >= fecha_carga
        ),

    CONSTRAINT chk_voucher_usuario
        CHECK (
            (
                fecha_validacion IS NULL
                AND id_usuario_valida IS NULL
            )
            OR
            (
                fecha_validacion IS NOT NULL
                AND id_usuario_valida IS NOT NULL
            )
        ),

    INDEX idx_voucher_pago (
        id_pago
    ),

    INDEX idx_voucher_estado (
        id_estado_voucher
    ),

    INDEX idx_voucher_fecha (
        fecha_carga
    ),

    INDEX idx_voucher_hash (
        hash_archivo
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- tabla pag_planes_pago_historial_estado
 CREATE TABLE historial_plan (
    id_historial BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_plan_pago BIGINT UNSIGNED NOT NULL,
    id_estado_anterior SMALLINT UNSIGNED,
    id_estado_nuevo SMALLINT UNSIGNED NOT NULL,
    id_usuario BIGINT UNSIGNED,

    fecha_cambio DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    motivo VARCHAR(255),

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_historial_plan
        PRIMARY KEY (id_historial),

    CONSTRAINT fk_historial_plan
        FOREIGN KEY (id_plan_pago)
        REFERENCES plan_pago(id_plan_pago)
        ON DELETE RESTRICT,

    CONSTRAINT fk_hist_plan_anterior
        FOREIGN KEY (id_estado_anterior)
        REFERENCES estado_plan_pago(id_estado_plan_pago)
        ON DELETE RESTRICT,

    CONSTRAINT fk_hist_plan_nuevo
        FOREIGN KEY (id_estado_nuevo)
        REFERENCES estado_plan_pago(id_estado_plan_pago)
        ON DELETE RESTRICT,

    CONSTRAINT fk_hist_plan_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_hist_plan_estado
        CHECK (
            id_estado_anterior IS NULL
            OR id_estado_anterior <> id_estado_nuevo
        ),

    INDEX idx_hist_plan_fecha (
        id_plan_pago,
        fecha_cambio
    ),

    INDEX idx_hist_plan_estado (
        id_estado_nuevo
    ),

    INDEX idx_hist_plan_usuario (
        id_usuario
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
CREATE TABLE asesor (
    id_asesor BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_persona BIGINT UNSIGNED NOT NULL,
    id_tipo_asesor SMALLINT UNSIGNED NOT NULL,
    id_estado_asesor SMALLINT UNSIGNED NOT NULL,
    id_usuario BIGINT UNSIGNED,

    codigo VARCHAR(30) NOT NULL,

    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,

    observacion VARCHAR(500),

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_asesor
        PRIMARY KEY (id_asesor),

    CONSTRAINT unq_asesor_persona
        UNIQUE (id_persona),

    CONSTRAINT unq_asesor_codigo
        UNIQUE (codigo),

    CONSTRAINT fk_asesor_persona
        FOREIGN KEY (id_persona)
        REFERENCES persona(id_persona)
        ON DELETE RESTRICT,

    CONSTRAINT fk_asesor_tipo
        FOREIGN KEY (id_tipo_asesor)
        REFERENCES tipo_asesor(id_tipo_asesor)
        ON DELETE RESTRICT,

    CONSTRAINT fk_asesor_estado
        FOREIGN KEY (id_estado_asesor)
        REFERENCES estado_asesor(id_estado_asesor)
        ON DELETE RESTRICT,

    CONSTRAINT fk_asesor_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_asesor_fecha
        CHECK (
            fecha_fin IS NULL
            OR fecha_fin >= fecha_inicio
        ),

    INDEX idx_asesor_estado (
        id_estado_asesor
    ),

    INDEX idx_asesor_tipo_estado (
        id_tipo_asesor,
        id_estado_asesor
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA COM_ASIGNACIONES_PROSPECTO
  CREATE TABLE asignacion_prospecto (
    id_asignacion BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_interes BIGINT UNSIGNED NOT NULL,
    id_asesor BIGINT UNSIGNED NOT NULL,

    id_usuario_asigna BIGINT UNSIGNED,
    id_usuario_cierra BIGINT UNSIGNED,

    fecha_asignacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_fin DATETIME(6),

    motivo_asignacion VARCHAR(255),
    motivo_cierre VARCHAR(255),

    interes_vigente BIGINT UNSIGNED
        GENERATED ALWAYS AS (
            CASE
                WHEN fecha_fin IS NULL
                THEN id_interes
                ELSE NULL
            END
        ) STORED,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_asignacion_prosp
        PRIMARY KEY (id_asignacion),

    CONSTRAINT unq_asig_interes_vig
        UNIQUE (interes_vigente),

    CONSTRAINT fk_asig_prosp_interes
        FOREIGN KEY (id_interes)
        REFERENCES interes_comercial(id_interes)
        ON DELETE RESTRICT,

    CONSTRAINT fk_asig_prosp_asesor
        FOREIGN KEY (id_asesor)
        REFERENCES asesor(id_asesor)
        ON DELETE RESTRICT,

    CONSTRAINT fk_asig_prosp_asigna
        FOREIGN KEY (id_usuario_asigna)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_asig_prosp_cierra
        FOREIGN KEY (id_usuario_cierra)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_asig_prosp_fecha
        CHECK (
            fecha_fin IS NULL
            OR fecha_fin >= fecha_asignacion
        ),

    CONSTRAINT chk_asig_prosp_cierre
        CHECK (
            (
                fecha_fin IS NULL
                AND id_usuario_cierra IS NULL
                AND motivo_cierre IS NULL
            )
            OR
            (
                fecha_fin IS NOT NULL
                AND id_usuario_cierra IS NOT NULL
                AND motivo_cierre IS NOT NULL
                AND CHAR_LENGTH(TRIM(motivo_cierre)) > 0
            )
        ),

    INDEX idx_asig_interes_fecha (
        id_interes,
        fecha_asignacion
    ),

    INDEX idx_asig_asesor_fecha (
        id_asesor,
        fecha_asignacion
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA COM_VENTAS_ASESORES
  CREATE TABLE asignacion_venta (
    id_asignacion BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_venta BIGINT UNSIGNED NOT NULL,
    id_asesor BIGINT UNSIGNED NOT NULL,
    id_usuario BIGINT UNSIGNED,

    principal BOOLEAN NOT NULL DEFAULT FALSE,

    participacion DECIMAL(5,2) NOT NULL,

    fecha_asignacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    id_venta_principal BIGINT UNSIGNED
        GENERATED ALWAYS AS (
            CASE
                WHEN principal = TRUE
                THEN id_venta
                ELSE NULL
            END
        ) STORED,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_asignacion_venta
        PRIMARY KEY (id_asignacion),

    CONSTRAINT unq_asig_venta_asesor
        UNIQUE (
            id_venta,
            id_asesor
        ),

    CONSTRAINT unq_asig_venta_princ
        UNIQUE (id_venta_principal),

    CONSTRAINT fk_asig_venta
        FOREIGN KEY (id_venta)
        REFERENCES venta(id_venta)
        ON DELETE RESTRICT,

    CONSTRAINT fk_asig_venta_asesor
        FOREIGN KEY (id_asesor)
        REFERENCES asesor(id_asesor)
        ON DELETE RESTRICT,

    CONSTRAINT fk_asig_venta_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_asig_venta_part
        CHECK (
            participacion > 0
            AND participacion <= 100
        ),

    INDEX idx_asig_venta_asesor (
        id_asesor,
        fecha_asignacion
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA COM_REGLAS_COMISION
  CREATE TABLE regla_comision (
    id_regla_comision BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_proyecto BIGINT UNSIGNED,
    id_tipo_asesor SMALLINT UNSIGNED,
    id_modalidad_venta SMALLINT UNSIGNED,

    id_tipo_calculo_comision SMALLINT UNSIGNED NOT NULL,
    id_moneda SMALLINT UNSIGNED,

    codigo VARCHAR(40) NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    descripcion VARCHAR(500),

    valor DECIMAL(14,4) NOT NULL,

    prioridad SMALLINT UNSIGNED NOT NULL DEFAULT 100,

    fecha_desde DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_hasta DATETIME(6),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    clave_vigente VARCHAR(180)
        GENERATED ALWAYS AS (
            CASE
                WHEN activo = TRUE
                     AND fecha_hasta IS NULL
                THEN CONCAT(
                    COALESCE(id_proyecto, 0), '-',
                    COALESCE(id_tipo_asesor, 0), '-',
                    COALESCE(id_modalidad_venta, 0), '-',
                    id_tipo_calculo_comision, '-',
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

    CONSTRAINT pk_regla_comision
        PRIMARY KEY (id_regla_comision),

    CONSTRAINT unq_regla_codigo
        UNIQUE (codigo),

    CONSTRAINT unq_regla_vigente
        UNIQUE (clave_vigente),

    CONSTRAINT fk_regla_proyecto
        FOREIGN KEY (id_proyecto)
        REFERENCES proyecto(id_proyecto)
        ON DELETE RESTRICT,

    CONSTRAINT fk_regla_asesor
        FOREIGN KEY (id_tipo_asesor)
        REFERENCES tipo_asesor(id_tipo_asesor)
        ON DELETE RESTRICT,

    CONSTRAINT fk_regla_modalidad
        FOREIGN KEY (id_modalidad_venta)
        REFERENCES modalidad_venta(id_modalidad_venta)
        ON DELETE RESTRICT,

    CONSTRAINT fk_regla_calculo
        FOREIGN KEY (id_tipo_calculo_comision)
        REFERENCES tipo_calculo_comision(id_tipo_calculo_comision)
        ON DELETE RESTRICT,

    CONSTRAINT fk_regla_moneda
        FOREIGN KEY (id_moneda)
        REFERENCES moneda(id_moneda)
        ON DELETE RESTRICT,

    CONSTRAINT chk_regla_valor
        CHECK (
            valor > 0
        ),

    CONSTRAINT chk_regla_prioridad
        CHECK (
            prioridad > 0
        ),

    CONSTRAINT chk_regla_fecha
        CHECK (
            fecha_hasta IS NULL
            OR fecha_hasta >= fecha_desde
        ),

    INDEX idx_regla_busqueda (
        id_proyecto,
        id_tipo_asesor,
        id_modalidad_venta,
        activo
    ),

    INDEX idx_regla_vigencia (
        fecha_desde,
        fecha_hasta
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA COM_COMISIONES
  CREATE TABLE comision (
    id_comision BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_asignacion BIGINT UNSIGNED NOT NULL,
    id_regla_comision BIGINT UNSIGNED NOT NULL,
    id_estado_comision SMALLINT UNSIGNED NOT NULL,
    id_moneda SMALLINT UNSIGNED NOT NULL,

    id_usuario_aprueba BIGINT UNSIGNED,
    id_usuario_paga BIGINT UNSIGNED,
    id_usuario_anula BIGINT UNSIGNED,

    codigo VARCHAR(40) NOT NULL,

    monto_base DECIMAL(14,2) NOT NULL,
    valor_regla DECIMAL(14,4) NOT NULL,
    participacion DECIMAL(5,2) NOT NULL,

    monto_calculado DECIMAL(14,2) NOT NULL,
    monto_final DECIMAL(14,2) NOT NULL,

    fecha_generacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_aprobacion DATETIME(6),

    fecha_pago DATETIME(6),

    fecha_anulacion DATETIME(6),
    motivo_anulacion VARCHAR(255),

    observacion VARCHAR(500),

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_comision
        PRIMARY KEY (id_comision),

    CONSTRAINT unq_comision_codigo
        UNIQUE (codigo),

    CONSTRAINT unq_comision_asig
        UNIQUE (id_asignacion),

    CONSTRAINT fk_comision_asig
        FOREIGN KEY (id_asignacion)
        REFERENCES asignacion_venta(id_asignacion)
        ON DELETE RESTRICT,

    CONSTRAINT fk_comision_regla
        FOREIGN KEY (id_regla_comision)
        REFERENCES regla_comision(id_regla_comision)
        ON DELETE RESTRICT,

    CONSTRAINT fk_comision_estado
        FOREIGN KEY (id_estado_comision)
        REFERENCES estado_comision(id_estado_comision)
        ON DELETE RESTRICT,

    CONSTRAINT fk_comision_moneda
        FOREIGN KEY (id_moneda)
        REFERENCES moneda(id_moneda)
        ON DELETE RESTRICT,

    CONSTRAINT fk_comision_aprueba
        FOREIGN KEY (id_usuario_aprueba)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_comision_paga
        FOREIGN KEY (id_usuario_paga)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_comision_anula
        FOREIGN KEY (id_usuario_anula)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_comision_base
        CHECK (
            monto_base > 0
        ),

    CONSTRAINT chk_comision_regla
        CHECK (
            valor_regla > 0
        ),

    CONSTRAINT chk_comision_part
        CHECK (
            participacion > 0
            AND participacion <= 100
        ),

    CONSTRAINT chk_comision_calc
        CHECK (
            monto_calculado >= 0
        ),

    CONSTRAINT chk_comision_final
        CHECK (
            monto_final >= 0
        ),

    CONSTRAINT chk_comision_aprueba
        CHECK (
            (
                fecha_aprobacion IS NULL
                AND id_usuario_aprueba IS NULL
            )
            OR
            (
                fecha_aprobacion IS NOT NULL
                AND id_usuario_aprueba IS NOT NULL
            )
        ),

    CONSTRAINT chk_comision_pago
        CHECK (
            (
                fecha_pago IS NULL
                AND id_usuario_paga IS NULL
            )
            OR
            (
                fecha_pago IS NOT NULL
                AND id_usuario_paga IS NOT NULL
            )
        ),

    CONSTRAINT chk_comision_anula
        CHECK (
            (
                fecha_anulacion IS NULL
                AND id_usuario_anula IS NULL
                AND motivo_anulacion IS NULL
            )
            OR
            (
                fecha_anulacion IS NOT NULL
                AND id_usuario_anula IS NOT NULL
                AND motivo_anulacion IS NOT NULL
                AND CHAR_LENGTH(TRIM(motivo_anulacion)) > 0
            )
        ),

    CONSTRAINT chk_comision_fec_apr
        CHECK (
            fecha_aprobacion IS NULL
            OR fecha_aprobacion >= fecha_generacion
        ),

    CONSTRAINT chk_comision_fec_pago
        CHECK (
            fecha_pago IS NULL
            OR (
                fecha_aprobacion IS NOT NULL
                AND fecha_pago >= fecha_aprobacion
            )
        ),

    CONSTRAINT chk_comision_fec_anul
        CHECK (
            fecha_anulacion IS NULL
            OR fecha_anulacion >= fecha_generacion
        ),

    CONSTRAINT chk_comision_orden
        CHECK (
            fecha_anulacion IS NULL
            OR fecha_pago IS NULL
            OR fecha_anulacion >= fecha_pago
        ),

    INDEX idx_comision_regla (
        id_regla_comision
    ),

    INDEX idx_comision_estado (
        id_estado_comision,
        fecha_generacion
    ),

    INDEX idx_comision_fecha (
        fecha_generacion
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- --- 9. CMS (ADMINISTRACION DE LA PAGINA WEB ----------
  
  -- TABLA CMS_PAGINAS --
  CREATE TABLE pagina (
    id_pagina BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_estado_publicacion SMALLINT UNSIGNED NOT NULL,

    id_usuario_registra BIGINT UNSIGNED,
    id_usuario_publica BIGINT UNSIGNED,

    codigo VARCHAR(40) NOT NULL,
    ruta VARCHAR(150) NOT NULL,

    titulo VARCHAR(180) NOT NULL,
    descripcion VARCHAR(500),

    titulo_seo VARCHAR(180),
    descripcion_seo VARCHAR(320),

    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    mostrar_menu BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_publicacion DATETIME(6),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_pagina
        PRIMARY KEY (id_pagina),

    CONSTRAINT unq_pagina_codigo
        UNIQUE (codigo),

    CONSTRAINT unq_pagina_ruta
        UNIQUE (ruta),

    CONSTRAINT fk_pagina_estado
        FOREIGN KEY (id_estado_publicacion)
        REFERENCES estado_publicacion(id_estado_publicacion)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pagina_registra
        FOREIGN KEY (id_usuario_registra)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pagina_publica
        FOREIGN KEY (id_usuario_publica)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_pagina_ruta
        CHECK (
            CHAR_LENGTH(TRIM(ruta)) > 0
        ),

    CONSTRAINT chk_pagina_publica
        CHECK (
            (
                fecha_publicacion IS NULL
                AND id_usuario_publica IS NULL
            )
            OR
            (
                fecha_publicacion IS NOT NULL
                AND id_usuario_publica IS NOT NULL
            )
        ),

    INDEX idx_pagina_estado (
        id_estado_publicacion
    ),

    INDEX idx_pagina_menu (
        mostrar_menu,
        orden
    ),

    INDEX idx_pagina_publica (
        fecha_publicacion
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- TABLA CFG_SECCIONES --
CREATE TABLE seccion (
    id_seccion BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_pagina BIGINT UNSIGNED NOT NULL,
    id_tipo_seccion SMALLINT UNSIGNED NOT NULL,
    id_usuario BIGINT UNSIGNED,

    codigo VARCHAR(50) NOT NULL,

    titulo VARCHAR(180),
    subtitulo VARCHAR(255),

    contenido TEXT,

    configuracion JSON,

    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    visible BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_desde DATETIME(6),
    fecha_hasta DATETIME(6),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_seccion
        PRIMARY KEY (id_seccion),

    CONSTRAINT unq_seccion_codigo
        UNIQUE (
            id_pagina,
            codigo
        ),

    CONSTRAINT fk_seccion_pagina
        FOREIGN KEY (id_pagina)
        REFERENCES pagina(id_pagina)
        ON DELETE RESTRICT,

    CONSTRAINT fk_seccion_tipo
        FOREIGN KEY (id_tipo_seccion)
        REFERENCES tipo_seccion(id_tipo_seccion)
        ON DELETE RESTRICT,

    CONSTRAINT fk_seccion_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_seccion_fecha
        CHECK (
            fecha_hasta IS NULL
            OR fecha_desde IS NULL
            OR fecha_hasta >= fecha_desde
        ),

    INDEX idx_seccion_tipo (
        id_tipo_seccion
    ),

    INDEX idx_seccion_orden (
        id_pagina,
        orden
    ),

    INDEX idx_seccion_visible (
        visible,
        activo
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CMS_SECCION_ITEMS --
  CREATE TABLE elemento_seccion (
    id_elemento BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_seccion BIGINT UNSIGNED NOT NULL,
    id_usuario BIGINT UNSIGNED,

    codigo VARCHAR(60) NOT NULL,

    titulo VARCHAR(180),
    subtitulo VARCHAR(255),

    contenido TEXT,

    texto_enlace VARCHAR(120),
    url_enlace VARCHAR(500),

    configuracion JSON,

    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    visible BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_desde DATETIME(6),
    fecha_hasta DATETIME(6),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_elemento_seccion
        PRIMARY KEY (id_elemento),

    CONSTRAINT unq_elemento_codigo
        UNIQUE (
            id_seccion,
            codigo
        ),

    CONSTRAINT fk_elemento_seccion
        FOREIGN KEY (id_seccion)
        REFERENCES seccion(id_seccion)
        ON DELETE RESTRICT,

    CONSTRAINT fk_elemento_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_elemento_fecha
        CHECK (
            fecha_hasta IS NULL
            OR fecha_desde IS NULL
            OR fecha_hasta >= fecha_desde
        ),

    CONSTRAINT chk_elemento_url
        CHECK (
            url_enlace IS NULL
            OR CHAR_LENGTH(TRIM(url_enlace)) > 0
        ),

    CONSTRAINT chk_elemento_enlace
        CHECK (
            texto_enlace IS NULL
            OR url_enlace IS NOT NULL
        ),

    INDEX idx_elemento_orden (
        id_seccion,
        orden
    ),

    INDEX idx_elemento_visible (
        visible,
        activo
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CMS_MULTIMEDIA --
  CREATE TABLE multimedia (
    id_multimedia BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_tipo_multimedia SMALLINT UNSIGNED NOT NULL,
    id_usuario BIGINT UNSIGNED,

    codigo VARCHAR(50) NOT NULL,

    nombre VARCHAR(180) NOT NULL,
    descripcion VARCHAR(500),

    nombre_archivo VARCHAR(255),

    clave_archivo VARCHAR(500),
    url_externa VARCHAR(1000),

    tipo_mime VARCHAR(100),

    tamano_archivo BIGINT UNSIGNED,

    hash_archivo CHAR(64),

    texto_alternativo VARCHAR(255),

    ancho INT UNSIGNED,
    alto INT UNSIGNED,

    duracion INT UNSIGNED,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_multimedia
        PRIMARY KEY (id_multimedia),

    CONSTRAINT unq_multimedia_codigo
        UNIQUE (codigo),

    CONSTRAINT fk_multimedia_tipo
        FOREIGN KEY (id_tipo_multimedia)
        REFERENCES tipo_multimedia(id_tipo_multimedia)
        ON DELETE RESTRICT,

    CONSTRAINT fk_multimedia_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_multimedia_origen
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

    CONSTRAINT chk_multimedia_clave
        CHECK (
            clave_archivo IS NULL
            OR CHAR_LENGTH(TRIM(clave_archivo)) > 0
        ),

    CONSTRAINT chk_multimedia_url
        CHECK (
            url_externa IS NULL
            OR CHAR_LENGTH(TRIM(url_externa)) > 0
        ),

    CONSTRAINT chk_multimedia_tamano
        CHECK (
            tamano_archivo IS NULL
            OR tamano_archivo > 0
        ),

    CONSTRAINT chk_multimedia_dimension
        CHECK (
            (
                ancho IS NULL
                AND alto IS NULL
            )
            OR
            (
                ancho IS NOT NULL
                AND ancho > 0
                AND alto IS NOT NULL
                AND alto > 0
            )
        ),

    CONSTRAINT chk_multimedia_duracion
        CHECK (
            duracion IS NULL
            OR duracion > 0
        ),

    INDEX idx_multimedia_tipo (
        id_tipo_multimedia
    ),

    INDEX idx_multimedia_hash (
        hash_archivo
    ),

    INDEX idx_multimedia_activo (
        activo
    ),

    INDEX idx_multimedia_fecha (
        fecha_creacion
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CMS_MULTIMEDIA_ASIGNACIONES -- 
  CREATE TABLE vinculo_multimedia (
    id_vinculo BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_multimedia BIGINT UNSIGNED NOT NULL,
    id_uso_multimedia SMALLINT UNSIGNED NOT NULL,

    id_pagina BIGINT UNSIGNED,
    id_seccion BIGINT UNSIGNED,
    id_elemento BIGINT UNSIGNED,

    id_usuario BIGINT UNSIGNED,

    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    visible BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_desde DATETIME(6),
    fecha_hasta DATETIME(6),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_vinculo_multimedia
        PRIMARY KEY (id_vinculo),

    CONSTRAINT unq_vinculo_pagina
        UNIQUE (
            id_pagina,
            id_multimedia,
            id_uso_multimedia
        ),

    CONSTRAINT unq_vinculo_seccion
        UNIQUE (
            id_seccion,
            id_multimedia,
            id_uso_multimedia
        ),

    CONSTRAINT unq_vinculo_elemento
        UNIQUE (
            id_elemento,
            id_multimedia,
            id_uso_multimedia
        ),

    CONSTRAINT fk_vinculo_multimedia
        FOREIGN KEY (id_multimedia)
        REFERENCES multimedia(id_multimedia)
        ON DELETE RESTRICT,

    CONSTRAINT fk_vinculo_uso
        FOREIGN KEY (id_uso_multimedia)
        REFERENCES uso_multimedia(id_uso_multimedia)
        ON DELETE RESTRICT,

    CONSTRAINT fk_vinculo_pagina
        FOREIGN KEY (id_pagina)
        REFERENCES pagina(id_pagina)
        ON DELETE RESTRICT,

    CONSTRAINT fk_vinculo_seccion
        FOREIGN KEY (id_seccion)
        REFERENCES seccion(id_seccion)
        ON DELETE RESTRICT,

    CONSTRAINT fk_vinculo_elemento
        FOREIGN KEY (id_elemento)
        REFERENCES elemento_seccion(id_elemento)
        ON DELETE RESTRICT,

    CONSTRAINT fk_vinculo_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_vinculo_destino
        CHECK (
            (
                (id_pagina IS NOT NULL)
                +
                (id_seccion IS NOT NULL)
                +
                (id_elemento IS NOT NULL)
            ) = 1
        ),

    CONSTRAINT chk_vinculo_fecha
        CHECK (
            fecha_hasta IS NULL
            OR fecha_desde IS NULL
            OR fecha_hasta >= fecha_desde
        ),

    INDEX idx_vinculo_multimedia (
        id_multimedia
    ),

    INDEX idx_vinculo_pag_orden (
        id_pagina,
        orden
    ),

    INDEX idx_vinculo_sec_orden (
        id_seccion,
        orden
    ),

    INDEX idx_vinculo_elem_orden (
        id_elemento,
        orden
    ),

    INDEX idx_vinculo_uso (
        id_uso_multimedia
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CMS_PROYECTOS 
  CREATE TABLE ficha_proyecto (
    id_ficha BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_proyecto BIGINT UNSIGNED NOT NULL,
    id_pagina BIGINT UNSIGNED NOT NULL,
    id_usuario BIGINT UNSIGNED,

    nombre_comercial VARCHAR(180),
    resumen_comercial VARCHAR(500),
    descripcion_comercial TEXT,

    destacado BOOLEAN NOT NULL DEFAULT FALSE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    texto_accion VARCHAR(120),
    url_accion VARCHAR(500),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_ficha_proyecto
        PRIMARY KEY (id_ficha),

    CONSTRAINT unq_ficha_proyecto
        UNIQUE (id_proyecto),

    CONSTRAINT unq_ficha_pagina
        UNIQUE (id_pagina),

    CONSTRAINT fk_ficha_proyecto
        FOREIGN KEY (id_proyecto)
        REFERENCES proyecto(id_proyecto)
        ON DELETE RESTRICT,

    CONSTRAINT fk_ficha_pagina
        FOREIGN KEY (id_pagina)
        REFERENCES pagina(id_pagina)
        ON DELETE RESTRICT,

    CONSTRAINT fk_ficha_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_ficha_accion
        CHECK (
            (
                texto_accion IS NULL
                AND url_accion IS NULL
            )
            OR
            (
                texto_accion IS NOT NULL
                AND CHAR_LENGTH(TRIM(texto_accion)) > 0
                AND url_accion IS NOT NULL
                AND CHAR_LENGTH(TRIM(url_accion)) > 0
            )
        ),

    INDEX idx_ficha_destacado (
        destacado,
        orden
    ),

    INDEX idx_ficha_activo (
        activo
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA CMS_CONSULTAS_WEB -- 
  CREATE TABLE consulta_web (
    id_consulta BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_estado_consulta_web SMALLINT UNSIGNED NOT NULL,

    id_pagina BIGINT UNSIGNED,
    id_proyecto BIGINT UNSIGNED,
    id_persona BIGINT UNSIGNED,
    id_usuario_atiende BIGINT UNSIGNED,

    codigo VARCHAR(40) NOT NULL,

    nombre VARCHAR(150) NOT NULL,
    correo VARCHAR(180),
    telefono VARCHAR(40),

    asunto VARCHAR(150),
    mensaje TEXT,

    acepta_privacidad BOOLEAN NOT NULL DEFAULT FALSE,

    utm_origen VARCHAR(100),
    utm_medio VARCHAR(100),
    utm_campana VARCHAR(150),

    fecha_recepcion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_atencion DATETIME(6),

    fecha_cierre DATETIME(6),
    motivo_cierre VARCHAR(255),

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_consulta_web
        PRIMARY KEY (id_consulta),

    CONSTRAINT unq_consulta_codigo
        UNIQUE (codigo),

    CONSTRAINT fk_consulta_estado
        FOREIGN KEY (id_estado_consulta_web)
        REFERENCES estado_consulta_web(id_estado_consulta_web)
        ON DELETE RESTRICT,

    CONSTRAINT fk_consulta_pagina
        FOREIGN KEY (id_pagina)
        REFERENCES pagina(id_pagina)
        ON DELETE RESTRICT,

    CONSTRAINT fk_consulta_proyecto
        FOREIGN KEY (id_proyecto)
        REFERENCES proyecto(id_proyecto)
        ON DELETE RESTRICT,

    CONSTRAINT fk_consulta_persona
        FOREIGN KEY (id_persona)
        REFERENCES persona(id_persona)
        ON DELETE RESTRICT,

    CONSTRAINT fk_consulta_usuario
        FOREIGN KEY (id_usuario_atiende)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_consulta_contacto
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

    CONSTRAINT chk_consulta_atencion
        CHECK (
            (
                fecha_atencion IS NULL
                AND id_usuario_atiende IS NULL
            )
            OR
            (
                fecha_atencion IS NOT NULL
                AND id_usuario_atiende IS NOT NULL
            )
        ),

    CONSTRAINT chk_consulta_fec_at
        CHECK (
            fecha_atencion IS NULL
            OR fecha_atencion >= fecha_recepcion
        ),

    CONSTRAINT chk_consulta_cierre
        CHECK (
            (
                fecha_cierre IS NULL
                AND motivo_cierre IS NULL
            )
            OR
            (
                fecha_cierre IS NOT NULL
                AND motivo_cierre IS NOT NULL
                AND CHAR_LENGTH(TRIM(motivo_cierre)) > 0
            )
        ),

    CONSTRAINT chk_consulta_fec_cie
        CHECK (
            fecha_cierre IS NULL
            OR (
                fecha_cierre >= fecha_recepcion
                AND (
                    fecha_atencion IS NULL
                    OR fecha_cierre >= fecha_atencion
                )
            )
        ),

    INDEX idx_consulta_estado (
        id_estado_consulta_web
    ),

    INDEX idx_consulta_proyecto (
        id_proyecto
    ),

    INDEX idx_consulta_persona (
        id_persona
    ),

    INDEX idx_consulta_fecha (
        fecha_recepcion
    ),

    INDEX idx_consulta_estado_fec (
        id_estado_consulta_web,
        fecha_recepcion
    ),

    INDEX idx_consulta_correo (
        correo
    ),

    INDEX idx_consulta_telefono (
        telefono
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- ----- 10. NOTIFICACIONES ----------

-- TABLA NOT_NOTIFICACIONES --
CREATE TABLE notificacion (
    id_notificacion BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_persona BIGINT UNSIGNED NOT NULL,
    id_tipo_notificacion SMALLINT UNSIGNED NOT NULL,
    id_usuario_genera BIGINT UNSIGNED,

    titulo VARCHAR(180) NOT NULL,
    mensaje VARCHAR(1000) NOT NULL,

    url_destino VARCHAR(500),

    modulo_referencia VARCHAR(50),
    entidad_referencia VARCHAR(80),
    clave_referencia VARCHAR(80),

    datos_contexto JSON,

    clave_deduplicacion VARCHAR(150),

    fecha_generacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_lectura DATETIME(6),

    fecha_expiracion DATETIME(6),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_notificacion
        PRIMARY KEY (id_notificacion),

    CONSTRAINT unq_notif_dedup
        UNIQUE (clave_deduplicacion),

    CONSTRAINT fk_notif_persona
        FOREIGN KEY (id_persona)
        REFERENCES persona(id_persona)
        ON DELETE RESTRICT,

    CONSTRAINT fk_notif_tipo
        FOREIGN KEY (id_tipo_notificacion)
        REFERENCES tipo_notificacion(id_tipo_notificacion)
        ON DELETE RESTRICT,

    CONSTRAINT fk_notif_usuario
        FOREIGN KEY (id_usuario_genera)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_notif_titulo
        CHECK (
            CHAR_LENGTH(TRIM(titulo)) > 0
        ),

    CONSTRAINT chk_notif_mensaje
        CHECK (
            CHAR_LENGTH(TRIM(mensaje)) > 0
        ),

    CONSTRAINT chk_notif_url
        CHECK (
            url_destino IS NULL
            OR CHAR_LENGTH(TRIM(url_destino)) > 0
        ),

    CONSTRAINT chk_notif_lectura
        CHECK (
            fecha_lectura IS NULL
            OR fecha_lectura >= fecha_generacion
        ),

    CONSTRAINT chk_notif_expira
        CHECK (
            fecha_expiracion IS NULL
            OR fecha_expiracion >= fecha_generacion
        ),

    CONSTRAINT chk_notif_lect_exp
        CHECK (
            fecha_lectura IS NULL
            OR fecha_expiracion IS NULL
            OR fecha_lectura <= fecha_expiracion
        ),

    INDEX idx_notif_persona_lect (
        id_persona,
        fecha_lectura
    ),

    INDEX idx_notif_tipo (
        id_tipo_notificacion
    ),

    INDEX idx_notif_fecha (
        fecha_generacion
    ),

    INDEX idx_notif_activo (
        activo
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- NOT_ENVIOS --
  CREATE TABLE envio_notificacion (
    id_envio BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_notificacion BIGINT UNSIGNED NOT NULL,
    id_canal_notificacion SMALLINT UNSIGNED NOT NULL,
    id_estado_envio SMALLINT UNSIGNED NOT NULL,

    destinatario VARCHAR(255),

    fecha_programada DATETIME(6),

    num_intentos SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    fecha_ultimo_intento DATETIME(6),
    fecha_envio DATETIME(6),

    codigo_proveedor VARCHAR(150),

    ultimo_error VARCHAR(1000),

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_envio_notif
        PRIMARY KEY (id_envio),

    CONSTRAINT unq_envio_notif_canal
        UNIQUE (
            id_notificacion,
            id_canal_notificacion
        ),

    CONSTRAINT fk_envio_notif
        FOREIGN KEY (id_notificacion)
        REFERENCES notificacion(id_notificacion)
        ON DELETE RESTRICT,

    CONSTRAINT fk_envio_canal
        FOREIGN KEY (id_canal_notificacion)
        REFERENCES canal_notificacion(id_canal_notificacion)
        ON DELETE RESTRICT,

    CONSTRAINT fk_envio_estado
        FOREIGN KEY (id_estado_envio)
        REFERENCES estado_envio(id_estado_envio)
        ON DELETE RESTRICT,

    CONSTRAINT chk_envio_intentos
        CHECK (
            num_intentos >= 0
        ),

    CONSTRAINT chk_envio_intento
        CHECK (
            (
                num_intentos = 0
                AND fecha_ultimo_intento IS NULL
            )
            OR
            (
                num_intentos > 0
                AND fecha_ultimo_intento IS NOT NULL
            )
        ),

    CONSTRAINT chk_envio_destino
        CHECK (
            destinatario IS NULL
            OR CHAR_LENGTH(TRIM(destinatario)) > 0
        ),

    CONSTRAINT chk_envio_programa
        CHECK (
            fecha_programada IS NULL
            OR fecha_programada >= fecha_creacion
        ),

    CONSTRAINT chk_envio_fecha
        CHECK (
            fecha_envio IS NULL
            OR fecha_envio >= fecha_creacion
        ),

    CONSTRAINT chk_envio_int_fecha
        CHECK (
            fecha_ultimo_intento IS NULL
            OR fecha_ultimo_intento >= fecha_creacion
        ),

    CONSTRAINT chk_envio_env_int
        CHECK (
            fecha_envio IS NULL
            OR fecha_ultimo_intento IS NULL
            OR fecha_envio >= fecha_ultimo_intento
        ),

    INDEX idx_envio_estado_prog (
        id_estado_envio,
        fecha_programada
    ),

    INDEX idx_envio_canal (
        id_canal_notificacion
    ),

    INDEX idx_envio_intento (
        fecha_ultimo_intento
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- NOT_PLANTILLAS --
  CREATE TABLE plantilla (
    id_plantilla BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_tipo_notificacion SMALLINT UNSIGNED NOT NULL,
    id_canal_notificacion SMALLINT UNSIGNED NOT NULL,
    id_usuario BIGINT UNSIGNED,

    codigo VARCHAR(50) NOT NULL,
    nombre VARCHAR(120) NOT NULL,

    asunto VARCHAR(180),
    contenido TEXT NOT NULL,

    version SMALLINT UNSIGNED NOT NULL DEFAULT 1,

    fecha_desde DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_hasta DATETIME(6),

    vigente BOOLEAN NOT NULL DEFAULT TRUE,

    clave_vigente VARCHAR(80)
        GENERATED ALWAYS AS (
            CASE
                WHEN vigente = TRUE
                     AND activo = TRUE
                     AND fecha_hasta IS NULL
                THEN CONCAT(
                    id_tipo_notificacion,
                    '-',
                    id_canal_notificacion
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

    CONSTRAINT pk_plantilla
        PRIMARY KEY (id_plantilla),

    CONSTRAINT unq_plantilla_codigo
        UNIQUE (codigo),

    CONSTRAINT unq_plantilla_version
        UNIQUE (
            id_tipo_notificacion,
            id_canal_notificacion,
            version
        ),

    CONSTRAINT unq_plantilla_vig
        UNIQUE (clave_vigente),

    CONSTRAINT fk_plantilla_tipo
        FOREIGN KEY (id_tipo_notificacion)
        REFERENCES tipo_notificacion(id_tipo_notificacion)
        ON DELETE RESTRICT,

    CONSTRAINT fk_plantilla_canal
        FOREIGN KEY (id_canal_notificacion)
        REFERENCES canal_notificacion(id_canal_notificacion)
        ON DELETE RESTRICT,

    CONSTRAINT fk_plantilla_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_plantilla_version
        CHECK (
            version > 0
        ),

    CONSTRAINT chk_plantilla_nombre
        CHECK (
            CHAR_LENGTH(TRIM(nombre)) > 0
        ),

    CONSTRAINT chk_plantilla_contenido
        CHECK (
            CHAR_LENGTH(TRIM(contenido)) > 0
        ),

    CONSTRAINT chk_plantilla_fecha
        CHECK (
            fecha_hasta IS NULL
            OR fecha_hasta >= fecha_desde
        ),

    CONSTRAINT chk_plantilla_vig
        CHECK (
            vigente = FALSE
            OR (
                activo = TRUE
                AND fecha_hasta IS NULL
            )
        ),

    INDEX idx_plantilla_canal (
        id_canal_notificacion
    ),

    INDEX idx_plantilla_vigencia (
        fecha_desde,
        fecha_hasta
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA NOT_PREFERENCIAS --
  CREATE TABLE preferencia (
    id_preferencia BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_persona BIGINT UNSIGNED NOT NULL,
    id_tipo_notificacion SMALLINT UNSIGNED NOT NULL,
    id_canal_notificacion SMALLINT UNSIGNED NOT NULL,
    id_usuario BIGINT UNSIGNED,

    habilitado BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_modificacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_preferencia
        PRIMARY KEY (id_preferencia),

    CONSTRAINT unq_pref_persona_tipo
        UNIQUE (
            id_persona,
            id_tipo_notificacion,
            id_canal_notificacion
        ),

    CONSTRAINT fk_pref_persona
        FOREIGN KEY (id_persona)
        REFERENCES persona(id_persona)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pref_tipo
        FOREIGN KEY (id_tipo_notificacion)
        REFERENCES tipo_notificacion(id_tipo_notificacion)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pref_canal
        FOREIGN KEY (id_canal_notificacion)
        REFERENCES canal_notificacion(id_canal_notificacion)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pref_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    INDEX idx_pref_persona_hab (
        id_persona,
        habilitado
    ),

    INDEX idx_pref_tipo (
        id_tipo_notificacion
    ),

    INDEX idx_pref_canal (
        id_canal_notificacion
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- -------- 11. FINANZAS -----------
  
  -- TABLA FIN_CATEGORIAS --
  CREATE TABLE categoria_financiera (
    id_categoria BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_tipo_movimiento SMALLINT UNSIGNED NOT NULL,
    id_categoria_padre BIGINT UNSIGNED,

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

    CONSTRAINT pk_categoria_fin
        PRIMARY KEY (id_categoria),

    CONSTRAINT unq_categoria_codigo
        UNIQUE (codigo),

    CONSTRAINT unq_categoria_tipo
        UNIQUE (
            id_categoria,
            id_tipo_movimiento
        ),

    CONSTRAINT fk_categoria_tipo
        FOREIGN KEY (id_tipo_movimiento)
        REFERENCES tipo_movimiento(id_tipo_movimiento)
        ON DELETE RESTRICT,

    CONSTRAINT fk_categoria_padre
        FOREIGN KEY (
            id_categoria_padre,
            id_tipo_movimiento
        )
        REFERENCES categoria_financiera(
            id_categoria,
            id_tipo_movimiento
        )
        ON DELETE RESTRICT,

    INDEX idx_categoria_padre (
        id_categoria_padre,
        id_tipo_movimiento
    ),

    INDEX idx_categoria_tipo_act (
        id_tipo_movimiento,
        activo
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA FIN_CUENTAS_FINANCIERAS --
  CREATE TABLE cuenta_financiera (
    id_cuenta BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_tipo_cuenta SMALLINT UNSIGNED NOT NULL,
    id_moneda SMALLINT UNSIGNED NOT NULL,
    id_usuario BIGINT UNSIGNED,

    codigo VARCHAR(40) NOT NULL,
    nombre VARCHAR(120) NOT NULL,

    entidad_financiera VARCHAR(120),

    numero_cuenta VARCHAR(80),
    cci VARCHAR(40),

    titular VARCHAR(180),

    permite_ingresos BOOLEAN NOT NULL DEFAULT TRUE,
    permite_egresos BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_apertura DATE,
    fecha_cierre DATE,

    observacion VARCHAR(500),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_cuenta_fin
        PRIMARY KEY (id_cuenta),

    CONSTRAINT unq_cuenta_codigo
        UNIQUE (codigo),

    CONSTRAINT fk_cuenta_tipo
        FOREIGN KEY (id_tipo_cuenta)
        REFERENCES tipo_cuenta(id_tipo_cuenta)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cuenta_moneda
        FOREIGN KEY (id_moneda)
        REFERENCES moneda(id_moneda)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cuenta_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_cuenta_fecha
        CHECK (
            fecha_cierre IS NULL
            OR fecha_apertura IS NULL
            OR fecha_cierre >= fecha_apertura
        ),

    CONSTRAINT chk_cuenta_numero
        CHECK (
            numero_cuenta IS NULL
            OR CHAR_LENGTH(TRIM(numero_cuenta)) > 0
        ),

    CONSTRAINT chk_cuenta_cci
        CHECK (
            cci IS NULL
            OR CHAR_LENGTH(TRIM(cci)) > 0
        ),

    INDEX idx_cuenta_moneda (
        id_moneda
    ),

    INDEX idx_cuenta_tipo_act (
        id_tipo_cuenta,
        activo
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA FIN_MOVIMIENTOS --
  CREATE TABLE movimiento (
    id_movimiento BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_categoria BIGINT UNSIGNED NOT NULL,
    id_cuenta BIGINT UNSIGNED NOT NULL,
    id_estado_movimiento SMALLINT UNSIGNED NOT NULL,

    id_pago BIGINT UNSIGNED,
    id_comision BIGINT UNSIGNED,

    id_usuario_registra BIGINT UNSIGNED,
    id_usuario_confirma BIGINT UNSIGNED,
    id_usuario_anula BIGINT UNSIGNED,

    codigo VARCHAR(40) NOT NULL,

    monto DECIMAL(14,2) NOT NULL,

    fecha_movimiento DATETIME(6) NOT NULL,

    numero_operacion VARCHAR(100),

    concepto VARCHAR(180) NOT NULL,
    descripcion VARCHAR(500),

    fecha_confirmacion DATETIME(6),

    fecha_anulacion DATETIME(6),
    motivo_anulacion VARCHAR(255),

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_movimiento
        PRIMARY KEY (id_movimiento),

    CONSTRAINT unq_movimiento_codigo
        UNIQUE (codigo),

    CONSTRAINT unq_movimiento_pago
        UNIQUE (id_pago),

    CONSTRAINT unq_movimiento_comision
        UNIQUE (id_comision),

    CONSTRAINT fk_movimiento_categoria
        FOREIGN KEY (id_categoria)
        REFERENCES categoria_financiera(id_categoria)
        ON DELETE RESTRICT,

    CONSTRAINT fk_movimiento_cuenta
        FOREIGN KEY (id_cuenta)
        REFERENCES cuenta_financiera(id_cuenta)
        ON DELETE RESTRICT,

    CONSTRAINT fk_movimiento_estado
        FOREIGN KEY (id_estado_movimiento)
        REFERENCES estado_movimiento(id_estado_movimiento)
        ON DELETE RESTRICT,

    CONSTRAINT fk_movimiento_pago
        FOREIGN KEY (id_pago)
        REFERENCES pago(id_pago)
        ON DELETE RESTRICT,

    CONSTRAINT fk_movimiento_comision
        FOREIGN KEY (id_comision)
        REFERENCES comision(id_comision)
        ON DELETE RESTRICT,

    CONSTRAINT fk_movimiento_registra
        FOREIGN KEY (id_usuario_registra)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_movimiento_confirma
        FOREIGN KEY (id_usuario_confirma)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_movimiento_anula
        FOREIGN KEY (id_usuario_anula)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_movimiento_monto
        CHECK (
            monto > 0
        ),

    CONSTRAINT chk_movimiento_origen
        CHECK (
            NOT (
                id_pago IS NOT NULL
                AND id_comision IS NOT NULL
            )
        ),

    CONSTRAINT chk_movimiento_confirma
        CHECK (
            (
                fecha_confirmacion IS NULL
                AND id_usuario_confirma IS NULL
            )
            OR
            (
                fecha_confirmacion IS NOT NULL
                AND id_usuario_confirma IS NOT NULL
            )
        ),

    CONSTRAINT chk_movimiento_fec_conf
        CHECK (
            fecha_confirmacion IS NULL
            OR fecha_confirmacion >= fecha_movimiento
        ),

    CONSTRAINT chk_movimiento_anula
        CHECK (
            (
                fecha_anulacion IS NULL
                AND id_usuario_anula IS NULL
                AND motivo_anulacion IS NULL
            )
            OR
            (
                fecha_anulacion IS NOT NULL
                AND id_usuario_anula IS NOT NULL
                AND motivo_anulacion IS NOT NULL
                AND CHAR_LENGTH(TRIM(motivo_anulacion)) > 0
            )
        ),

    CONSTRAINT chk_movimiento_fec_anul
        CHECK (
            fecha_anulacion IS NULL
            OR fecha_anulacion >= fecha_movimiento
        ),

    CONSTRAINT chk_movimiento_orden
        CHECK (
            fecha_anulacion IS NULL
            OR fecha_confirmacion IS NULL
            OR fecha_anulacion >= fecha_confirmacion
        ),

    INDEX idx_movimiento_cuenta (
        id_cuenta,
        fecha_movimiento
    ),

    INDEX idx_movimiento_categoria (
        id_categoria,
        fecha_movimiento
    ),

    INDEX idx_movimiento_estado (
        id_estado_movimiento
    ),

    INDEX idx_movimiento_fecha (
        fecha_movimiento
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA FIN_TRANSFERENCIAS --
  CREATE TABLE transferencia (
    id_transferencia BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_cuenta_origen BIGINT UNSIGNED NOT NULL,
    id_cuenta_destino BIGINT UNSIGNED NOT NULL,
    id_estado_movimiento SMALLINT UNSIGNED NOT NULL,

    id_usuario_registra BIGINT UNSIGNED,
    id_usuario_confirma BIGINT UNSIGNED,
    id_usuario_anula BIGINT UNSIGNED,

    codigo VARCHAR(40) NOT NULL,

    monto_origen DECIMAL(14,2) NOT NULL,
    monto_destino DECIMAL(14,2) NOT NULL,

    tipo_cambio DECIMAL(14,6),

    fecha_transferencia DATETIME(6) NOT NULL,

    numero_operacion VARCHAR(100),

    concepto VARCHAR(180) NOT NULL,
    observacion VARCHAR(500),

    fecha_confirmacion DATETIME(6),

    fecha_anulacion DATETIME(6),
    motivo_anulacion VARCHAR(255),

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_transferencia
        PRIMARY KEY (id_transferencia),

    CONSTRAINT unq_transferencia_codigo
        UNIQUE (codigo),

    CONSTRAINT fk_transf_origen
        FOREIGN KEY (id_cuenta_origen)
        REFERENCES cuenta_financiera(id_cuenta)
        ON DELETE RESTRICT,

    CONSTRAINT fk_transf_destino
        FOREIGN KEY (id_cuenta_destino)
        REFERENCES cuenta_financiera(id_cuenta)
        ON DELETE RESTRICT,

    CONSTRAINT fk_transf_estado
        FOREIGN KEY (id_estado_movimiento)
        REFERENCES estado_movimiento(id_estado_movimiento)
        ON DELETE RESTRICT,

    CONSTRAINT fk_transf_registra
        FOREIGN KEY (id_usuario_registra)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_transf_confirma
        FOREIGN KEY (id_usuario_confirma)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_transf_anula
        FOREIGN KEY (id_usuario_anula)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_transf_cuentas
        CHECK (
            id_cuenta_origen <> id_cuenta_destino
        ),

    CONSTRAINT chk_transf_monto_ori
        CHECK (
            monto_origen > 0
        ),

    CONSTRAINT chk_transf_monto_des
        CHECK (
            monto_destino > 0
        ),

    CONSTRAINT chk_transf_cambio
        CHECK (
            tipo_cambio IS NULL
            OR tipo_cambio > 0
        ),

    CONSTRAINT chk_transf_confirma
        CHECK (
            (
                fecha_confirmacion IS NULL
                AND id_usuario_confirma IS NULL
            )
            OR
            (
                fecha_confirmacion IS NOT NULL
                AND id_usuario_confirma IS NOT NULL
            )
        ),

    CONSTRAINT chk_transf_fec_conf
        CHECK (
            fecha_confirmacion IS NULL
            OR fecha_confirmacion >= fecha_transferencia
        ),

    CONSTRAINT chk_transf_anula
        CHECK (
            (
                fecha_anulacion IS NULL
                AND id_usuario_anula IS NULL
                AND motivo_anulacion IS NULL
            )
            OR
            (
                fecha_anulacion IS NOT NULL
                AND id_usuario_anula IS NOT NULL
                AND motivo_anulacion IS NOT NULL
                AND CHAR_LENGTH(TRIM(motivo_anulacion)) > 0
            )
        ),

    CONSTRAINT chk_transf_fec_anul
        CHECK (
            fecha_anulacion IS NULL
            OR fecha_anulacion >= fecha_transferencia
        ),

    CONSTRAINT chk_transf_orden
        CHECK (
            fecha_anulacion IS NULL
            OR fecha_confirmacion IS NULL
            OR fecha_anulacion >= fecha_confirmacion
        ),

    INDEX idx_transf_origen_fecha (
        id_cuenta_origen,
        fecha_transferencia
    ),

    INDEX idx_transf_dest_fecha (
        id_cuenta_destino,
        fecha_transferencia
    ),

    INDEX idx_transf_estado (
        id_estado_movimiento
    ),

    INDEX idx_transf_fecha (
        fecha_transferencia
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  
  -- TABLA FIN_SALDOS_INICIALES --
  CREATE TABLE saldo_inicial (
    id_saldo BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_cuenta BIGINT UNSIGNED NOT NULL,
    id_usuario BIGINT UNSIGNED,

    monto DECIMAL(14,2) NOT NULL,

    fecha_saldo DATETIME(6) NOT NULL,

    observacion VARCHAR(500),

    fecha_creacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    fecha_actualizacion DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_saldo_inicial
        PRIMARY KEY (id_saldo),

    CONSTRAINT unq_saldo_cuenta
        UNIQUE (id_cuenta),

    CONSTRAINT fk_saldo_cuenta
        FOREIGN KEY (id_cuenta)
        REFERENCES cuenta_financiera(id_cuenta)
        ON DELETE RESTRICT,

    CONSTRAINT fk_saldo_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    INDEX idx_saldo_fecha (
        fecha_saldo
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
 
 
-- ----- 12. AUDITORIA --------
  -- tabla aud_eventos --
 CREATE TABLE evento_auditoria (
    id_evento BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,

    id_usuario BIGINT UNSIGNED,

    modulo VARCHAR(50) NOT NULL,
    accion VARCHAR(80) NOT NULL,

    entidad VARCHAR(80),
    clave_entidad VARCHAR(80),

    resultado VARCHAR(30) NOT NULL
        DEFAULT 'EXITOSO',

    descripcion VARCHAR(1000),

    ip_origen VARCHAR(45),
    agente_usuario VARCHAR(500),

    codigo_solicitud VARCHAR(100),

    metodo_http VARCHAR(10),
    ruta VARCHAR(500),

    datos_antes JSON,
    datos_despues JSON,
    datos_contexto JSON,

    fecha_evento DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    CONSTRAINT pk_evento_auditoria
        PRIMARY KEY (id_evento),

    CONSTRAINT fk_evento_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_evento_modulo
        CHECK (
            CHAR_LENGTH(TRIM(modulo)) > 0
        ),

    CONSTRAINT chk_evento_accion
        CHECK (
            CHAR_LENGTH(TRIM(accion)) > 0
        ),

    CONSTRAINT chk_evento_resultado
        CHECK (
            resultado IN (
                'EXITOSO',
                'FALLIDO',
                'DENEGADO'
            )
        ),

    CONSTRAINT chk_evento_entidad
        CHECK (
            clave_entidad IS NULL
            OR (
                entidad IS NOT NULL
                AND CHAR_LENGTH(TRIM(entidad)) > 0
            )
        ),

    CONSTRAINT chk_evento_ip
        CHECK (
            ip_origen IS NULL
            OR CHAR_LENGTH(TRIM(ip_origen)) > 0
        ),

    CONSTRAINT chk_evento_ruta
        CHECK (
            ruta IS NULL
            OR CHAR_LENGTH(TRIM(ruta)) > 0
        ),

    INDEX idx_evento_usuario (
        id_usuario,
        fecha_evento
    ),

    INDEX idx_evento_modulo (
        modulo,
        fecha_evento
    ),

    INDEX idx_evento_accion (
        modulo,
        accion,
        fecha_evento
    ),

    INDEX idx_evento_entidad (
        entidad,
        clave_entidad,
        fecha_evento
    ),

    INDEX idx_evento_resultado (
        resultado,
        fecha_evento
    ),

    INDEX idx_evento_solicitud (
        codigo_solicitud
    ),

    INDEX idx_evento_ip (
        ip_origen,
        fecha_evento
    ),

    INDEX idx_evento_fecha (
        fecha_evento
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
  