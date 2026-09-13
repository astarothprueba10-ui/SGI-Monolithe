-- INSERTS

-- INSERTAMOS CFG_ESTADOS_PROYECTO
INSERT INTO cfg_estados_proyecto
(codigo, nombre, descripcion, orden)
VALUES
('PLANIFICACION', 'Planificación',
 'Proyecto en fase de planificación', 1),

('PREVENTA', 'Preventa',
 'Proyecto habilitado para ventas anticipadas', 2),

('ACTIVO', 'Activo',
 'Proyecto actualmente en ejecución y comercialización', 3),

('FINALIZADO', 'Finalizado',
 'Proyecto concluido', 4),

('SUSPENDIDO', 'Suspendido',
 'Proyecto temporalmente suspendido', 5),

('CANCELADO', 'Cancelado',
 'Proyecto cancelado', 6);
 
 -- INSERT CFG_ESTADOS_ETAPA 
 INSERT INTO cfg_estados_etapa
(codigo, nombre, descripcion, orden)
VALUES
('PLANIFICADA', 'Planificada',
 'Etapa definida pero todavía no iniciada', 1),

('ACTIVA', 'Activa',
 'Etapa actualmente activa', 2),

('FINALIZADA', 'Finalizada',
 'Etapa concluida', 3),

('SUSPENDIDA', 'Suspendida',
 'Etapa temporalmente suspendida', 4),

('CANCELADA', 'Cancelada',
 'Etapa cancelada', 5);
 
 -- INSERT CFG_ESTADOS_MANZANA
 INSERT INTO cfg_estados_manzana
(codigo, nombre, descripcion, orden)
VALUES
('PLANIFICADA', 'Planificada',
 'Manzana definida dentro del proyecto', 1),

('ACTIVA', 'Activa',
 'Manzana habilitada', 2),

('INACTIVA', 'Inactiva',
 'Manzana temporalmente inhabilitada', 3),

('CERRADA', 'Cerrada',
 'Manzana sin operaciones disponibles', 4);
 
 -- INSERT CFG_ESTADOS_LOTES
 INSERT INTO cfg_estados_lote
(
    codigo,
    nombre,
    descripcion,
    permite_reserva,
    permite_venta,
    orden
)
VALUES
(
    'DISPONIBLE',
    'Disponible',
    'Lote disponible para comercialización',
    TRUE,
    TRUE,
    1
),
(
    'RESERVADO',
    'Reservado',
    'Lote reservado temporalmente por un cliente',
    FALSE,
    FALSE,
    2
),
(
    'VENDIDO',
    'Vendido',
    'Lote asociado a una venta confirmada',
    FALSE,
    FALSE,
    3
),
(
    'BLOQUEADO',
    'Bloqueado',
    'Lote bloqueado administrativamente',
    FALSE,
    FALSE,
    4
),
(
    'NO_DISPONIBLE',
    'No disponible',
    'Lote fuera de comercialización',
    FALSE,
    FALSE,
    5
);

-- INSERTAR TIPOS DE DOCUMENTOS 
INSERT INTO cfg_tipos_documento
(
    codigo,
    nombre,
    descripcion,
    longitud_minima,
    longitud_maxima,
    solo_numerico,
    orden
)
VALUES
('DNI', 'DNI', 'Documento Nacional de Identidad', 8, 8, TRUE, 1),
('CE', 'Carné de extranjería', 'Carné de extranjería', 8, 12, FALSE, 2),
('PASAPORTE', 'Pasaporte', 'Documento de viaje internacional', 6, 20, FALSE, 3),
('RUC', 'RUC', 'Registro Único de Contribuyentes', 11, 11, TRUE, 4);

-- INSERTAR TIPOS DE CONTACTO 
INSERT INTO cfg_tipos_contacto
(codigo, nombre, orden)
VALUES
('EMAIL', 'Correo electrónico', 1),
('CELULAR', 'Celular', 2),
('TELEFONO', 'Teléfono', 3),
('WHATSAPP', 'WhatsApp', 4);

-- INSERTAR ESTADOS DE PROSPECTOS 
INSERT INTO cfg_estados_prospecto
(codigo, nombre, descripcion, es_estado_final, orden)
VALUES
('NUEVO', 'Nuevo',
 'Prospecto recién registrado', FALSE, 1),

('CONTACTADO', 'Contactado',
 'Se realizó el primer contacto', FALSE, 2),

('EN_SEGUIMIENTO', 'En seguimiento',
 'Prospecto actualmente atendido por el equipo comercial', FALSE, 3),

('INTERESADO', 'Interesado',
 'Ha manifestado intención clara de compra', FALSE, 4),

('NEGOCIACION', 'En negociación',
 'Se encuentra evaluando condiciones comerciales', FALSE, 5),

('CONVERTIDO', 'Convertido',
 'El prospecto se convirtió en cliente', TRUE, 6),

('NO_INTERESADO', 'No interesado',
 'No desea continuar con el proceso comercial', TRUE, 7),

('DESCARTADO', 'Descartado',
 'Prospecto descartado por criterios comerciales', TRUE, 8);
 
 -- INSERTAR ORIGENES PROSPECTOS
 INSERT INTO cfg_origenes_prospecto
(codigo, nombre, orden)
VALUES
('WEB', 'Página web', 1),
('FACEBOOK', 'Facebook', 2),
('INSTAGRAM', 'Instagram', 3),
('WHATSAPP', 'WhatsApp', 4),
('TIKTOK', 'TikTok', 5),
('REFERIDO', 'Referido', 6),
('FERIA', 'Feria o evento', 7),
('VISITA_OFICINA', 'Visita a oficina', 8),
('LLAMADA', 'Llamada telefónica', 9),
('OTRO', 'Otro', 10);

  
  -- CFG_TIPOS_SEGUIMIENTO
  INSERT INTO cfg_tipos_seguimiento
(codigo, nombre, orden)
VALUES
('LLAMADA', 'Llamada', 1),
('WHATSAPP', 'WhatsApp', 2),
('EMAIL', 'Correo electrónico', 3),
('REUNION', 'Reunión', 4),
('VISITA_PROYECTO', 'Visita al proyecto', 5),
('VISITA_OFICINA', 'Visita a oficina', 6),
('OTRO', 'Otro', 7);

-- INSERTAR TIPOS DE CONSENTIMIENTOS 
INSERT INTO cfg_tipos_consentimiento
(codigo, nombre, descripcion)
VALUES
(
    'TRATAMIENTO_DATOS',
    'Tratamiento de datos personales',
    'Consentimiento para tratamiento de datos personales'
),
(
    'COMUNICACIONES_COMERCIALES',
    'Comunicaciones comerciales',
    'Consentimiento para recibir información comercial'
);

-- INSERTAR MONEDAS 
INSERT INTO cfg_monedas
(codigo, nombre, simbolo)
VALUES
('PEN', 'Sol peruano', 'S/'),
('USD', 'Dólar estadounidense', '$');

-- INSERTAR ESTADOS DE RESERVA 
INSERT INTO cfg_estados_reserva
(codigo, nombre, descripcion, es_final, orden)
VALUES
('PENDIENTE', 'Pendiente',
 'Reserva registrada pendiente de confirmación', FALSE, 1),

('VIGENTE', 'Vigente',
 'Reserva actualmente vigente', FALSE, 2),

('CONVERTIDA', 'Convertida',
 'Reserva convertida en venta', TRUE, 3),

('VENCIDA', 'Vencida',
 'Reserva vencida por expiración del plazo', TRUE, 4),

('CANCELADA', 'Cancelada',
 'Reserva cancelada', TRUE, 5);
 
 -- INSERTAR ESTADOS DE VENTA 
 INSERT INTO cfg_estados_venta
(codigo, nombre, descripcion, es_final, orden)
VALUES
('PENDIENTE', 'Pendiente',
 'Venta iniciada pero todavía no confirmada', FALSE, 1),

('CONFIRMADA', 'Confirmada',
 'Venta comercialmente confirmada', FALSE, 2),

('CONTRATADA', 'Contratada',
 'Venta asociada a contrato formalizado', FALSE, 3),

('COMPLETADA', 'Completada',
 'Venta totalmente finalizada', TRUE, 4),

('ANULADA', 'Anulada',
 'Venta anulada', TRUE, 5);
 
 -- INSERTAR ESTADOS DE PREPARACION 
 INSERT INTO cfg_estados_contrato
(codigo, nombre, descripcion, es_final, orden)
VALUES
('BORRADOR', 'Borrador',
 'Contrato en preparación', FALSE, 1),

('PENDIENTE_FIRMA', 'Pendiente de firma',
 'Contrato preparado pendiente de firma', FALSE, 2),

('VIGENTE', 'Vigente',
 'Contrato formalizado y vigente', FALSE, 3),

('FINALIZADO', 'Finalizado',
 'Contrato concluido', TRUE, 4),

('RESUELTO', 'Resuelto',
 'Contrato resuelto anticipadamente', TRUE, 5),

('ANULADO', 'Anulado',
 'Contrato anulado', TRUE, 6);
 
 -- INSERTAR ESTADOS DE USUARIOS 
 INSERT INTO cfg_estados_usuario
(codigo, nombre, descripcion, permite_acceso, orden)
VALUES
(
    'ACTIVO',
    'Activo',
    'Usuario habilitado para acceder al sistema',
    TRUE,
    1
),
(
    'BLOQUEADO',
    'Bloqueado',
    'Usuario bloqueado por motivos de seguridad',
    FALSE,
    2
),
(
    'SUSPENDIDO',
    'Suspendido',
    'Usuario temporalmente suspendido',
    FALSE,
    3
),
(
    'INACTIVO',
    'Inactivo',
    'Usuario sin acceso al sistema',
    FALSE,
    4
);

-- INSERTAR ROLES INICIALES 
INSERT INTO seg_roles
(codigo, nombre, descripcion, es_sistema)
VALUES
(
    'ADMINISTRADOR',
    'Administrador',
    'Administración general del SIGI MONOLITHE',
    TRUE
),
(
    'GERENCIA',
    'Gerencia',
    'Acceso gerencial e indicadores del sistema',
    TRUE
),
(
    'MARKETING',
    'Marketing',
    'Gestión de contenidos web, campañas y prospectos',
    TRUE
),
(
    'ASESOR',
    'Asesor',
    'Gestión comercial de prospectos, lotes y ventas',
    TRUE
),
(
    'FINANZAS',
    'Finanzas',
    'Gestión de financiamientos, pagos y cobranza',
    TRUE
),
(
    'CLIENTE',
    'Cliente',
    'Acceso al portal de autogestión del comprador',
    TRUE
);

-- INSERTAR TIPOS DE TARIFAS 
INSERT INTO cfg_tipos_tarifa
(codigo, nombre, descripcion, orden)
VALUES
(
    'POR_M2',
    'Precio por metro cuadrado',
    'El precio base se calcula multiplicando el valor de la tarifa por el área del lote',
    1
),
(
    'MONTO_FIJO',
    'Monto fijo',
    'La tarifa representa directamente el precio base del lote',
    2
);

-- INSERTAR TIPOS DE AJUSTES DE PRECIO 
INSERT INTO cfg_tipos_ajuste_precio
(codigo, nombre, descripcion, orden)
VALUES
(
    'PORCENTAJE',
    'Porcentaje',
    'El ajuste se calcula como porcentaje sobre el precio base',
    1
),
(
    'MONTO_FIJO',
    'Monto fijo',
    'El ajuste corresponde a un importe monetario fijo',
    2
);

-- INSERTAR MODALIDADES DE VENTA --
INSERT INTO cfg_modalidades_venta
(
    codigo,
    nombre,
    descripcion,
    requiere_plan_pago,
    orden
)
VALUES
(
    'CONTADO',
    'Contado',
    'Venta cuyo importe se cancela sin financiamiento',
    FALSE,
    1
),
(
    'FINANCIADA',
    'Financiada',
    'Venta que genera un plan de financiamiento y cronograma de cuotas',
    TRUE,
    2
);

-- INSERTAR TIPOS DE CONTRATOS
INSERT INTO cfg_tipos_contrato
(
    codigo,
    nombre,
    descripcion,
    orden
)
VALUES
(
    'PRECONTRATO',
    'Precontrato',
    'Documento contractual utilizado durante una operación financiada antes de la formalización definitiva',
    1
),
(
    'COMPRAVENTA',
    'Contrato de compraventa',
    'Contrato formal de compraventa asociado a la operación inmobiliaria',
    2
);

-- INSERTAR ESTADOS DE PLAN DE PAGO --
INSERT INTO cfg_estados_plan_pago
(codigo, nombre, descripcion, es_final, orden)
VALUES
(
    'PENDIENTE',
    'Pendiente',
    'Plan creado pendiente de activación',
    FALSE,
    1
),
(
    'ACTIVO',
    'Activo',
    'Plan de financiamiento actualmente vigente',
    FALSE,
    2
),
(
    'COMPLETADO',
    'Completado',
    'Todas las obligaciones del plan han sido pagadas',
    TRUE,
    3
),
(
    'RESUELTO',
    'Resuelto',
    'Plan terminado por aplicación de una condición contractual',
    TRUE,
    4
),
(
    'ANULADO',
    'Anulado',
    'Plan anulado administrativamente',
    TRUE,
    5
);

-- INSERTAR CFG_ESTADOS_CUOTA --
INSERT INTO cfg_estados_cuota
(codigo, nombre, descripcion, es_final, orden)
VALUES
(
    'PENDIENTE',
    'Pendiente',
    'Cuota aún no vencida y sin pago completo',
    FALSE,
    1
),
(
    'PARCIAL',
    'Pago parcial',
    'Cuota con uno o más abonos pero aún con importe pendiente',
    FALSE,
    2
),
(
    'PAGADA',
    'Pagada',
    'Cuota pagada completamente',
    TRUE,
    3
),
(
    'VENCIDA',
    'Vencida',
    'Cuota cuya fecha de vencimiento transcurrió sin pago completo',
    FALSE,
    4
),
(
    'ANULADA',
    'Anulada',
    'Cuota anulada por una modificación válida del plan',
    TRUE,
    5
);

-- INSERTAR METODOS DE PAGO 
INSERT INTO cfg_metodos_pago
(
    codigo,
    nombre,
    descripcion,
    requiere_numero_operacion,
    requiere_voucher,
    orden
)
VALUES
(
    'TRANSFERENCIA',
    'Transferencia bancaria',
    'Pago realizado mediante transferencia bancaria',
    TRUE,
    TRUE,
    1
),
(
    'DEPOSITO',
    'Depósito bancario',
    'Pago realizado mediante depósito bancario',
    TRUE,
    TRUE,
    2
),
(
    'YAPE_PLIN',
    'Yape / Plin',
    'Pago mediante billetera digital',
    TRUE,
    TRUE,
    3
),
(
    'EFECTIVO',
    'Efectivo',
    'Pago recibido en efectivo',
    FALSE,
    FALSE,
    4
),
(
    'OTRO',
    'Otro',
    'Otro método de pago autorizado',
    FALSE,
    FALSE,
    5
);

-- INSERTAR ESTADOS DE VOUCHER 
INSERT INTO cfg_estados_voucher
(codigo, nombre, descripcion, es_final, orden)
VALUES
(
    'PENDIENTE',
    'Pendiente de validación',
    'Voucher recibido pendiente de revisión por cobranzas o finanzas',
    FALSE,
    1
),
(
    'APROBADO',
    'Aprobado',
    'Voucher validado correctamente',
    TRUE,
    2
),
(
    'RECHAZADO',
    'Rechazado',
    'Voucher rechazado durante la validación',
    TRUE,
    3
);

-- INSERTAR ESTADOS DE PAGO 
INSERT INTO cfg_estados_pago
(codigo, nombre, descripcion, es_final, orden)
VALUES
(
    'REGISTRADO',
    'Registrado',
    'Pago registrado en el sistema',
    FALSE,
    1
),
(
    'CONFIRMADO',
    'Confirmado',
    'Pago validado y confirmado',
    TRUE,
    2
),
(
    'ANULADO',
    'Anulado',
    'Pago anulado mediante una operación autorizada',
    TRUE,
    3
);

-- INSERTAR TIPOS DE APLICACION DE PAGO 
INSERT INTO cfg_tipos_aplicacion_pago
(
    codigo,
    nombre,
    descripcion,
    orden
)
VALUES
(
    'SEPARACION',
    'Separación',
    'Monto aplicado al pago de una reserva o separación de lote',
    1
),
(
    'INICIAL',
    'Inicial',
    'Monto aplicado a la cuota inicial de una venta financiada',
    2
),
(
    'CUOTA',
    'Cuota',
    'Monto aplicado a una cuota del cronograma de financiamiento',
    3
),
(
    'VENTA_CONTADO',
    'Venta al contado',
    'Monto aplicado al pago de una venta realizada al contado',
    4
);

-- INSEERTAR TIPOS DE ASESOR 
INSERT INTO cfg_tipos_asesor
(
    codigo,
    nombre,
    descripcion,
    orden
)
VALUES
(
    'INTERNO',
    'Asesor interno',
    'Asesor que forma parte del equipo interno de la empresa',
    1
),
(
    'EXTERNO',
    'Asesor externo',
    'Asesor comercial externo o independiente',
    2
);

-- INSERTAR ESTADOS DE ASESOR 
INSERT INTO cfg_estados_asesor
(
    codigo,
    nombre,
    descripcion,
    permite_operar,
    orden
)
VALUES
(
    'ACTIVO',
    'Activo',
    'Asesor habilitado para realizar actividades comerciales',
    TRUE,
    1
),
(
    'SUSPENDIDO',
    'Suspendido',
    'Asesor temporalmente inhabilitado para operar',
    FALSE,
    2
),
(
    'INACTIVO',
    'Inactivo',
    'Asesor que ya no se encuentra operativo',
    FALSE,
    3
);

-- INSERTAR CFG_TIPOS_CALCULO_COMISION
INSERT INTO cfg_tipos_calculo_comision
(
    codigo,
    nombre,
    descripcion,
    orden
)
VALUES
(
    'PORCENTAJE',
    'Porcentaje',
    'Comisión calculada como porcentaje de una base económica',
    1
),
(
    'MONTO_FIJO',
    'Monto fijo',
    'Comisión definida mediante un importe monetario fijo',
    2
);

-- INSERTAR ESTADOS DE COMISION 
INSERT INTO cfg_estados_comision
(
    codigo,
    nombre,
    descripcion,
    es_final,
    orden
)
VALUES
(
    'PENDIENTE',
    'Pendiente',
    'Comisión generada pendiente de revisión o aprobación',
    FALSE,
    1
),
(
    'APROBADA',
    'Aprobada',
    'Comisión revisada y aprobada para su posterior pago',
    FALSE,
    2
),
(
    'PAGADA',
    'Pagada',
    'Comisión cuyo pago al asesor ya fue realizado',
    TRUE,
    3
),
(
    'ANULADA',
    'Anulada',
    'Comisión anulada mediante una operación autorizada',
    TRUE,
    4
);

-- INSERATR ESTADOS DE PUBLICACION 
INSERT INTO cfg_estados_publicacion
(
    codigo,
    nombre,
    descripcion,
    visible_publico,
    orden
)
VALUES
(
    'BORRADOR',
    'Borrador',
    'Contenido en edición y no visible públicamente',
    FALSE,
    1
),
(
    'PUBLICADO',
    'Publicado',
    'Contenido disponible públicamente',
    TRUE,
    2
),
(
    'ARCHIVADO',
    'Archivado',
    'Contenido retirado de publicación pero conservado históricamente',
    FALSE,
    3
);

-- INSERTAR TIPOS DE SECCION 
INSERT INTO cfg_tipos_seccion
(
    codigo,
    nombre,
    descripcion,
    orden
)
VALUES
(
    'HERO',
    'Hero',
    'Sección principal o banner destacado de una página',
    1
),
(
    'TEXTO',
    'Texto',
    'Sección de contenido textual',
    2
),
(
    'CARACTERISTICAS',
    'Características',
    'Sección de beneficios, servicios o características',
    3
),
(
    'GALERIA',
    'Galería',
    'Sección destinada a contenido multimedia',
    4
),
(
    'PROYECTOS',
    'Proyectos',
    'Sección vinculada a proyectos inmobiliarios',
    5
),
(
    'CTA',
    'Llamado a la acción',
    'Sección con mensaje y acción destacada',
    6
),
(
    'CONTACTO',
    'Contacto',
    'Sección destinada a información o formulario de contacto',
    7
);


-- INSERTAR TIPOS DE MULTIMEDIA --
INSERT INTO cfg_tipos_multimedia
(
    codigo,
    nombre,
    descripcion,
    orden
)
VALUES
(
    'IMAGEN',
    'Imagen',
    'Imagen utilizada en páginas, secciones, galerías o elementos del sitio web',
    1
),
(
    'VIDEO',
    'Video',
    'Contenido audiovisual almacenado o enlazado desde una fuente externa',
    2
),
(
    'DOCUMENTO',
    'Documento',
    'Archivo descargable publicado desde el sitio web',
    3
);

-- INSERTAR USOS MULTIMEDIA --
INSERT INTO cfg_usos_multimedia
(
    codigo,
    nombre,
    descripcion,
    orden
)
VALUES
(
    'PRINCIPAL',
    'Principal',
    'Recurso multimedia principal del contenido',
    1
),
(
    'FONDO',
    'Fondo',
    'Recurso utilizado como fondo visual',
    2
),
(
    'GALERIA',
    'Galería',
    'Recurso que forma parte de una galería',
    3
),
(
    'ICONO',
    'Ícono',
    'Recurso utilizado como ícono o elemento gráfico',
    4
),
(
    'ADJUNTO',
    'Adjunto',
    'Recurso multimedia complementario',
    5
);

-- INSERTAR ESTADOS_CONSULTA_WEB --
INSERT INTO cfg_estados_consulta_web
(
    codigo,
    nombre,
    descripcion,
    es_final,
    orden
)
VALUES
(
    'NUEVA',
    'Nueva',
    'Consulta recibida pendiente de atención',
    FALSE,
    1
),
(
    'EN_ATENCION',
    'En atención',
    'Consulta actualmente atendida por el equipo comercial',
    FALSE,
    2
),
(
    'CONVERTIDA',
    'Convertida',
    'Consulta convertida en prospecto del CRM',
    TRUE,
    3
),
(
    'DESCARTADA',
    'Descartada',
    'Consulta descartada por no corresponder a una oportunidad comercial válida',
    TRUE,
    4
),
(
    'CERRADA',
    'Cerrada',
    'Consulta atendida y cerrada sin conversión comercial',
    TRUE,
    5
);

-- INSERTAR TIPOS DE NOTIFICACION --
INSERT INTO cfg_tipos_notificacion
(
    codigo,
    nombre,
    descripcion,
    permite_preferencia,
    orden
)
VALUES
(
    'GENERAL',
    'General',
    'Notificación informativa general',
    TRUE,
    1
),
(
    'RESERVA_POR_VENCER',
    'Reserva por vencer',
    'Alerta relacionada con una reserva próxima a vencer',
    FALSE,
    2
),
(
    'RESERVA_VENCIDA',
    'Reserva vencida',
    'Notificación relacionada con una reserva vencida',
    FALSE,
    3
),
(
    'CUOTA_PROXIMA',
    'Cuota próxima',
    'Recordatorio de una cuota próxima a vencer',
    FALSE,
    4
),
(
    'CUOTA_VENCIDA',
    'Cuota vencida',
    'Alerta relacionada con una cuota vencida',
    FALSE,
    5
),
(
    'PAGO_CONFIRMADO',
    'Pago confirmado',
    'Notificación de confirmación de un pago',
    FALSE,
    6
),
(
    'PAGO_RECHAZADO',
    'Pago rechazado',
    'Notificación relacionada con un pago o voucher rechazado',
    FALSE,
    7
),
(
    'CONTRATO_DISPONIBLE',
    'Contrato disponible',
    'Notificación relacionada con la disponibilidad de un contrato',
    FALSE,
    8
);

INSERT INTO cfg_canales_notificacion
(
    codigo,
    nombre,
    descripcion,
    orden
)
VALUES
(
    'PORTAL',
    'Portal',
    'Notificación visible dentro del portal del usuario',
    1
),
(
    'EMAIL',
    'Correo electrónico',
    'Notificación enviada mediante correo electrónico',
    2
);


-- INSERTAR ESTADOS DE ENVIO DE NOTIFICACION --
INSERT INTO cfg_estados_envio_notificacion
(
    codigo,
    nombre,
    descripcion,
    es_final,
    orden
)
VALUES
(
    'PENDIENTE',
    'Pendiente',
    'Envío pendiente de procesamiento',
    FALSE,
    1
),
(
    'ENVIADO',
    'Enviado',
    'Notificación enviada correctamente',
    TRUE,
    2
),
(
    'FALLIDO',
    'Fallido',
    'El envío no pudo completarse correctamente',
    FALSE,
    3
),
(
    'CANCELADO',
    'Cancelado',
    'Envío cancelado antes de completarse',
    TRUE,
    4
);

-- INSERTAR TIPO DE MOVIMIENTO FINANCIERO --
INSERT INTO cfg_tipos_movimiento_financiero
(
    codigo,
    nombre,
    descripcion,
    orden
)
VALUES
(
    'INGRESO',
    'Ingreso',
    'Entrada de dinero registrada en la operación financiera',
    1
),
(
    'EGRESO',
    'Egreso',
    'Salida de dinero registrada en la operación financiera',
    2
);

-- INSERTAR ESTADOS DE MOVIMIENTO FINANCIERO -- 
INSERT INTO cfg_estados_movimiento_financiero
(
    codigo,
    nombre,
    descripcion,
    es_final,
    orden
)
VALUES
(
    'PENDIENTE',
    'Pendiente',
    'Movimiento registrado pendiente de confirmación',
    FALSE,
    1
),
(
    'CONFIRMADO',
    'Confirmado',
    'Movimiento financiero confirmado',
    TRUE,
    2
),
(
    'ANULADO',
    'Anulado',
    'Movimiento financiero anulado conservando su trazabilidad',
    TRUE,
    3
);

-- INSERTAR TIPOS DE CUENTAS FINANCIERAS --
INSERT INTO cfg_tipos_cuenta_financiera
(
    codigo,
    nombre,
    descripcion,
    orden
)
VALUES
(
    'BANCO',
    'Cuenta bancaria',
    'Cuenta bancaria utilizada para ingresos o egresos operativos',
    1
),
(
    'CAJA',
    'Caja',
    'Caja física utilizada para operaciones en efectivo',
    2
),
(
    'BILLETERA_DIGITAL',
    'Billetera digital',
    'Cuenta asociada a un medio de pago digital',
    3
);

-- INSERTAR PERMISOS --
INSERT INTO seg_permisos (
    codigo,
    modulo,
    recurso,
    accion,
    nombre,
    descripcion,
    activo
)
VALUES
(
    'SEGURIDAD_USUARIO_VER',
    'SEGURIDAD',
    'USUARIO',
    'VER',
    'Ver usuarios',
    'Permite consultar usuarios del sistema',
    1
),
(
    'SEGURIDAD_USUARIO_CREAR',
    'SEGURIDAD',
    'USUARIO',
    'CREAR',
    'Crear usuarios',
    'Permite registrar nuevos usuarios',
    1
),
(
    'SEGURIDAD_USUARIO_EDITAR',
    'SEGURIDAD',
    'USUARIO',
    'EDITAR',
    'Editar usuarios',
    'Permite modificar información y configuración de usuarios',
    1
),
(
    'SEGURIDAD_ROL_VER',
    'SEGURIDAD',
    'ROL',
    'VER',
    'Ver roles',
    'Permite consultar los roles disponibles',
    1
),
(
    'SEGURIDAD_ROL_GESTIONAR',
    'SEGURIDAD',
    'ROL',
    'GESTIONAR',
    'Gestionar roles',
    'Permite crear, editar y asignar roles',
    1
),
(
    'SEGURIDAD_PERMISO_VER',
    'SEGURIDAD',
    'PERMISO',
    'VER',
    'Ver permisos',
    'Permite consultar permisos del sistema',
    1
),
(
    'SEGURIDAD_PERMISO_GESTIONAR',
    'SEGURIDAD',
    'PERMISO',
    'GESTIONAR',
    'Gestionar permisos',
    'Permite asignar y administrar permisos de los roles',
    1
),
(
    'SEGURIDAD_AUDITORIA_VER',
    'SEGURIDAD',
    'AUDITORIA',
    'VER',
    'Ver auditoría',
    'Permite consultar eventos de auditoría y seguridad',
    1
);

-- INSERTAR ROLES A LOS PERMISOS 
INSERT INTO seg_roles_permisos (
    id_rol,
    id_permiso,
    asignado_por,
    activo
)
SELECT
    r.id_rol,
    p.id_permiso,
    1,
    1
FROM seg_roles r
JOIN seg_permisos p
    ON p.codigo IN (
        'SEGURIDAD_USUARIO_VER',
        'SEGURIDAD_USUARIO_CREAR',
        'SEGURIDAD_USUARIO_EDITAR',
        'SEGURIDAD_ROL_VER',
        'SEGURIDAD_ROL_GESTIONAR',
        'SEGURIDAD_PERMISO_VER',
        'SEGURIDAD_PERMISO_GESTIONAR',
        'SEGURIDAD_AUDITORIA_VER'
    )
WHERE r.codigo = 'ADMINISTRADOR'
  AND r.activo = 1
  AND p.activo = 1
  AND NOT EXISTS (
      SELECT 1
      FROM seg_roles_permisos rp
      WHERE rp.id_rol = r.id_rol
        AND rp.id_permiso = p.id_permiso
  );