-- =============================================================================
-- DATOS INICIALES SGI MONOLITHE PARA SUPABASE / POSTGRESQL
-- Fuente de verdad: Database/Inserts.sql
-- =============================================================================

SET search_path TO public;

-- INSERTS


-- =====================================================
-- CATALOGO UNIFICADO DE ESTADOS
-- =====================================================
INSERT INTO estado (
    entidad,
    codigo,
    nombre,
    descripcion,
    es_final,
    permite_reserva,
    permite_venta,
    permite_acceso,
    visible_publico,
    activo,
    orden
)
VALUES

-- PROYECTO
('PROYECTO', 'PLANIFICACION', 'Planificación', 'Proyecto en fase de planificación', FALSE, NULL, NULL, NULL, NULL, TRUE, 1),
('PROYECTO', 'PREVENTA', 'Preventa', 'Proyecto habilitado para ventas anticipadas', FALSE, NULL, NULL, NULL, NULL, TRUE, 2),
('PROYECTO', 'ACTIVO', 'Activo', 'Proyecto actualmente en ejecución y comercialización', FALSE, NULL, NULL, NULL, NULL, TRUE, 3),
('PROYECTO', 'FINALIZADO', 'Finalizado', 'Proyecto concluido', FALSE, NULL, NULL, NULL, NULL, TRUE, 4),
('PROYECTO', 'SUSPENDIDO', 'Suspendido', 'Proyecto temporalmente suspendido', FALSE, NULL, NULL, NULL, NULL, TRUE, 5),
('PROYECTO', 'CANCELADO', 'Cancelado', 'Proyecto cancelado', FALSE, NULL, NULL, NULL, NULL, TRUE, 6),

-- ETAPA
('ETAPA', 'PLANIFICADA', 'Planificada', 'Etapa definida pero todavía no iniciada', FALSE, NULL, NULL, NULL, NULL, TRUE, 1),
('ETAPA', 'ACTIVA', 'Activa', 'Etapa actualmente activa', FALSE, NULL, NULL, NULL, NULL, TRUE, 2),
('ETAPA', 'FINALIZADA', 'Finalizada', 'Etapa concluida', FALSE, NULL, NULL, NULL, NULL, TRUE, 3),
('ETAPA', 'SUSPENDIDA', 'Suspendida', 'Etapa temporalmente suspendida', FALSE, NULL, NULL, NULL, NULL, TRUE, 4),
('ETAPA', 'CANCELADA', 'Cancelada', 'Etapa cancelada', FALSE, NULL, NULL, NULL, NULL, TRUE, 5),

-- MANZANA
('MANZANA', 'PLANIFICADA', 'Planificada', 'Manzana definida dentro del proyecto', FALSE, NULL, NULL, NULL, NULL, TRUE, 1),
('MANZANA', 'ACTIVA', 'Activa', 'Manzana habilitada', FALSE, NULL, NULL, NULL, NULL, TRUE, 2),
('MANZANA', 'INACTIVA', 'Inactiva', 'Manzana temporalmente inhabilitada', FALSE, NULL, NULL, NULL, NULL, TRUE, 3),
('MANZANA', 'CERRADA', 'Cerrada', 'Manzana sin operaciones disponibles', FALSE, NULL, NULL, NULL, NULL, TRUE, 4),

-- LOTE
('LOTE', 'DISPONIBLE', 'Disponible', 'Lote disponible para comercialización', FALSE, TRUE, TRUE, NULL, NULL, TRUE, 1),
('LOTE', 'RESERVADO', 'Reservado', 'Lote reservado temporalmente por un cliente', FALSE, FALSE, FALSE, NULL, NULL, TRUE, 2),
('LOTE', 'VENDIDO', 'Vendido', 'Lote asociado a una venta confirmada', FALSE, FALSE, FALSE, NULL, NULL, TRUE, 3),
('LOTE', 'BLOQUEADO', 'Bloqueado', 'Lote bloqueado administrativamente', FALSE, FALSE, FALSE, NULL, NULL, TRUE, 4),
('LOTE', 'NO_DISPONIBLE', 'No disponible', 'Lote fuera de comercialización', FALSE, FALSE, FALSE, NULL, NULL, TRUE, 5),

-- INTERES_COMERCIAL
('INTERES_COMERCIAL', 'NUEVO', 'Nuevo', 'Prospecto recién registrado', FALSE, NULL, NULL, NULL, NULL, TRUE, 1),
('INTERES_COMERCIAL', 'CONTACTADO', 'Contactado', 'Se realizó el primer contacto', FALSE, NULL, NULL, NULL, NULL, TRUE, 2),
('INTERES_COMERCIAL', 'EN_SEGUIMIENTO', 'En seguimiento', 'Prospecto actualmente atendido por el equipo comercial', FALSE, NULL, NULL, NULL, NULL, TRUE, 3),
('INTERES_COMERCIAL', 'INTERESADO', 'Interesado', 'Ha manifestado intención clara de compra', FALSE, NULL, NULL, NULL, NULL, TRUE, 4),
('INTERES_COMERCIAL', 'NEGOCIACION', 'En negociación', 'Se encuentra evaluando condiciones comerciales', FALSE, NULL, NULL, NULL, NULL, TRUE, 5),
('INTERES_COMERCIAL', 'CONVERTIDO', 'Convertido', 'El prospecto se convirtió en cliente', TRUE, NULL, NULL, NULL, NULL, TRUE, 6),
('INTERES_COMERCIAL', 'NO_INTERESADO', 'No interesado', 'No desea continuar con el proceso comercial', TRUE, NULL, NULL, NULL, NULL, TRUE, 7),
('INTERES_COMERCIAL', 'DESCARTADO', 'Descartado', 'Prospecto descartado por criterios comerciales', TRUE, NULL, NULL, NULL, NULL, TRUE, 8),

-- RESERVA
('RESERVA', 'PENDIENTE', 'Pendiente', 'Reserva registrada pendiente de confirmación', FALSE, NULL, NULL, NULL, NULL, TRUE, 1),
('RESERVA', 'VIGENTE', 'Vigente', 'Reserva actualmente vigente', FALSE, NULL, NULL, NULL, NULL, TRUE, 2),
('RESERVA', 'CONVERTIDA', 'Convertida', 'Reserva convertida en venta', TRUE, NULL, NULL, NULL, NULL, TRUE, 3),
('RESERVA', 'VENCIDA', 'Vencida', 'Reserva vencida por expiración del plazo', TRUE, NULL, NULL, NULL, NULL, TRUE, 4),
('RESERVA', 'CANCELADA', 'Cancelada', 'Reserva cancelada', TRUE, NULL, NULL, NULL, NULL, TRUE, 5),

-- VENTA
('VENTA', 'PENDIENTE', 'Pendiente', 'Venta iniciada pero todavía no confirmada', FALSE, NULL, NULL, NULL, NULL, TRUE, 1),
('VENTA', 'CONFIRMADA', 'Confirmada', 'Venta comercialmente confirmada', FALSE, NULL, NULL, NULL, NULL, TRUE, 2),
('VENTA', 'CONTRATADA', 'Contratada', 'Venta asociada a contrato formalizado', FALSE, NULL, NULL, NULL, NULL, TRUE, 3),
('VENTA', 'COMPLETADA', 'Completada', 'Venta totalmente finalizada', TRUE, NULL, NULL, NULL, NULL, TRUE, 4),
('VENTA', 'ANULADA', 'Anulada', 'Venta anulada', TRUE, NULL, NULL, NULL, NULL, TRUE, 5),

-- CONTRATO
('CONTRATO', 'BORRADOR', 'Borrador', 'Contrato en preparación', FALSE, NULL, NULL, NULL, NULL, TRUE, 1),
('CONTRATO', 'PENDIENTE_FIRMA', 'Pendiente de firma', 'Contrato preparado pendiente de firma', FALSE, NULL, NULL, NULL, NULL, TRUE, 2),
('CONTRATO', 'VIGENTE', 'Vigente', 'Contrato formalizado y vigente', FALSE, NULL, NULL, NULL, NULL, TRUE, 3),
('CONTRATO', 'FINALIZADO', 'Finalizado', 'Contrato concluido', TRUE, NULL, NULL, NULL, NULL, TRUE, 4),
('CONTRATO', 'RESUELTO', 'Resuelto', 'Contrato resuelto anticipadamente', TRUE, NULL, NULL, NULL, NULL, TRUE, 5),
('CONTRATO', 'ANULADO', 'Anulado', 'Contrato anulado', TRUE, NULL, NULL, NULL, NULL, TRUE, 6),

-- USUARIO
('USUARIO', 'ACTIVO', 'Activo', 'Usuario habilitado para acceder al sistema', FALSE, NULL, NULL, TRUE, NULL, TRUE, 1),
('USUARIO', 'BLOQUEADO', 'Bloqueado', 'Usuario bloqueado por motivos de seguridad', FALSE, NULL, NULL, FALSE, NULL, TRUE, 2),
('USUARIO', 'SUSPENDIDO', 'Suspendido', 'Usuario temporalmente suspendido', FALSE, NULL, NULL, FALSE, NULL, TRUE, 3),
('USUARIO', 'INACTIVO', 'Inactivo', 'Usuario sin acceso al sistema', FALSE, NULL, NULL, FALSE, NULL, TRUE, 4),

-- PLAN_PAGO
('PLAN_PAGO', 'PENDIENTE', 'Pendiente', 'Plan creado pendiente de activación', FALSE, NULL, NULL, NULL, NULL, TRUE, 1),
('PLAN_PAGO', 'ACTIVO', 'Activo', 'Plan de financiamiento actualmente vigente', FALSE, NULL, NULL, NULL, NULL, TRUE, 2),
('PLAN_PAGO', 'COMPLETADO', 'Completado', 'Todas las obligaciones del plan han sido pagadas', TRUE, NULL, NULL, NULL, NULL, TRUE, 3),
('PLAN_PAGO', 'RESUELTO', 'Resuelto', 'Plan terminado por aplicación de una condición contractual', TRUE, NULL, NULL, NULL, NULL, TRUE, 4),
('PLAN_PAGO', 'ANULADO', 'Anulado', 'Plan anulado administrativamente', TRUE, NULL, NULL, NULL, NULL, TRUE, 5),

-- CUOTA
('CUOTA', 'PENDIENTE', 'Pendiente', 'Cuota aún no vencida y sin pago completo', FALSE, NULL, NULL, NULL, NULL, TRUE, 1),
('CUOTA', 'PARCIAL', 'Pago parcial', 'Cuota con uno o más abonos pero aún con importe pendiente', FALSE, NULL, NULL, NULL, NULL, TRUE, 2),
('CUOTA', 'PAGADA', 'Pagada', 'Cuota pagada completamente', TRUE, NULL, NULL, NULL, NULL, TRUE, 3),
('CUOTA', 'VENCIDA', 'Vencida', 'Cuota cuya fecha de vencimiento transcurrió sin pago completo', FALSE, NULL, NULL, NULL, NULL, TRUE, 4),
('CUOTA', 'ANULADA', 'Anulada', 'Cuota anulada por una modificación válida del plan', TRUE, NULL, NULL, NULL, NULL, TRUE, 5),

-- VOUCHER
('VOUCHER', 'PENDIENTE', 'Pendiente de validación', 'Voucher recibido pendiente de revisión por cobranzas o finanzas', FALSE, NULL, NULL, NULL, NULL, TRUE, 1),
('VOUCHER', 'APROBADO', 'Aprobado', 'Voucher validado correctamente', TRUE, NULL, NULL, NULL, NULL, TRUE, 2),
('VOUCHER', 'RECHAZADO', 'Rechazado', 'Voucher rechazado durante la validación', TRUE, NULL, NULL, NULL, NULL, TRUE, 3),

-- PAGO
('PAGO', 'REGISTRADO', 'Registrado', 'Pago registrado en el sistema', FALSE, NULL, NULL, NULL, NULL, TRUE, 1),
('PAGO', 'CONFIRMADO', 'Confirmado', 'Pago validado y confirmado', TRUE, NULL, NULL, NULL, NULL, TRUE, 2),
('PAGO', 'ANULADO', 'Anulado', 'Pago anulado mediante una operación autorizada', TRUE, NULL, NULL, NULL, NULL, TRUE, 3),

-- COMISION
('COMISION', 'PENDIENTE', 'Pendiente', 'Comisión generada pendiente de revisión o aprobación', FALSE, NULL, NULL, NULL, NULL, TRUE, 1),
('COMISION', 'APROBADA', 'Aprobada', 'Comisión revisada y aprobada para su posterior pago', FALSE, NULL, NULL, NULL, NULL, TRUE, 2),
('COMISION', 'PAGADA', 'Pagada', 'Comisión cuyo pago al asesor ya fue realizado', TRUE, NULL, NULL, NULL, NULL, TRUE, 3),
('COMISION', 'ANULADA', 'Anulada', 'Comisión anulada mediante una operación autorizada', TRUE, NULL, NULL, NULL, NULL, TRUE, 4),

-- PUBLICACION
('PUBLICACION', 'BORRADOR', 'Borrador', 'Contenido en edición y no visible públicamente', FALSE, NULL, NULL, NULL, FALSE, TRUE, 1),
('PUBLICACION', 'PUBLICADO', 'Publicado', 'Contenido disponible públicamente', FALSE, NULL, NULL, NULL, TRUE, TRUE, 2),
('PUBLICACION', 'ARCHIVADO', 'Archivado', 'Contenido retirado de publicación pero conservado históricamente', FALSE, NULL, NULL, NULL, FALSE, TRUE, 3),

-- CONSULTA_WEB
('CONSULTA_WEB', 'NUEVA', 'Nueva', 'Consulta recibida pendiente de atención', FALSE, NULL, NULL, NULL, NULL, TRUE, 1),
('CONSULTA_WEB', 'EN_ATENCION', 'En atención', 'Consulta actualmente atendida por el equipo comercial', FALSE, NULL, NULL, NULL, NULL, TRUE, 2),
('CONSULTA_WEB', 'CONVERTIDA', 'Convertida', 'Consulta convertida en prospecto del CRM', TRUE, NULL, NULL, NULL, NULL, TRUE, 3),
('CONSULTA_WEB', 'DESCARTADA', 'Descartada', 'Consulta descartada por no corresponder a una oportunidad comercial válida', TRUE, NULL, NULL, NULL, NULL, TRUE, 4),
('CONSULTA_WEB', 'CERRADA', 'Cerrada', 'Consulta atendida y cerrada sin conversión comercial', TRUE, NULL, NULL, NULL, NULL, TRUE, 5),

-- ENVIO
('ENVIO', 'PENDIENTE', 'Pendiente', 'Envío pendiente de procesamiento', FALSE, NULL, NULL, NULL, NULL, TRUE, 1),
('ENVIO', 'ENVIADO', 'Enviado', 'Notificación enviada correctamente', TRUE, NULL, NULL, NULL, NULL, TRUE, 2),
('ENVIO', 'FALLIDO', 'Fallido', 'El envío no pudo completarse correctamente', FALSE, NULL, NULL, NULL, NULL, TRUE, 3),
('ENVIO', 'CANCELADO', 'Cancelado', 'Envío cancelado antes de completarse', TRUE, NULL, NULL, NULL, NULL, TRUE, 4),

-- MOVIMIENTO
('MOVIMIENTO', 'PENDIENTE', 'Pendiente', 'Movimiento registrado pendiente de confirmación', FALSE, NULL, NULL, NULL, NULL, TRUE, 1),
('MOVIMIENTO', 'CONFIRMADO', 'Confirmado', 'Movimiento financiero confirmado', TRUE, NULL, NULL, NULL, NULL, TRUE, 2),
('MOVIMIENTO', 'ANULADO', 'Anulado', 'Movimiento financiero anulado conservando su trazabilidad', TRUE, NULL, NULL, NULL, NULL, TRUE, 3)
ON CONFLICT DO NOTHING;

-- INSERTAR TIPOS DE DOCUMENTO
INSERT INTO tipo_documento
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
('RUC', 'RUC', 'Registro Único de Contribuyentes', 11, 11, TRUE, 4)
ON CONFLICT DO NOTHING;

-- INSERTAR TIPOS DE CONTACTO
INSERT INTO tipo_contacto
(codigo, nombre, orden)
VALUES
('EMAIL', 'Correo electrónico', 1),
('CELULAR', 'Celular', 2),
('TELEFONO', 'Teléfono', 3),
('WHATSAPP', 'WhatsApp', 4)
ON CONFLICT DO NOTHING;

-- INSERTAR ORIGENES DE PROSPECTO
INSERT INTO origen_prospecto
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
('OTRO', 'Otro', 10)
ON CONFLICT DO NOTHING;

-- INSERTAR TIPOS DE SEGUIMIENTO
INSERT INTO tipo_seguimiento
(codigo, nombre, orden)
VALUES
('LLAMADA', 'Llamada', 1),
('WHATSAPP', 'WhatsApp', 2),
('EMAIL', 'Correo electrónico', 3),
('REUNION', 'Reunión', 4),
('VISITA_PROYECTO', 'Visita al proyecto', 5),
('VISITA_OFICINA', 'Visita a oficina', 6),
('OTRO', 'Otro', 7)
ON CONFLICT DO NOTHING;

-- INSERTAR TIPOS DE CONSENTIMIENTO
INSERT INTO tipo_consentimiento
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
)
ON CONFLICT DO NOTHING;

-- INSERTAR MONEDAS
INSERT INTO moneda
(codigo, nombre, simbolo)
VALUES
('PEN', 'Sol peruano', 'S/'),
('USD', 'Dólar estadounidense', '$')
ON CONFLICT DO NOTHING;

-- INSERTAR ROLES INICIALES
INSERT INTO rol
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
)
ON CONFLICT DO NOTHING;

-- INSERTAR TIPOS DE TARIFA
INSERT INTO tipo_tarifa
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
)
ON CONFLICT DO NOTHING;

-- INSERTAR TIPOS DE AJUSTE DE PRECIO
INSERT INTO tipo_ajuste_precio
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
)
ON CONFLICT DO NOTHING;

-- INSERTAR MODALIDADES DE VENTA
INSERT INTO modalidad_venta
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
)
ON CONFLICT DO NOTHING;

-- INSERTAR TIPOS DE CONTRATO
INSERT INTO tipo_contrato
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
)
ON CONFLICT DO NOTHING;

-- INSERTAR METODOS DE PAGO
INSERT INTO metodo_pago
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
)
ON CONFLICT DO NOTHING;

-- INSERTAR TIPOS DE APLICACION DE PAGO
INSERT INTO tipo_aplicacion_pago
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
)
ON CONFLICT DO NOTHING;

-- INSERTAR TIPOS DE ASESOR
INSERT INTO tipo_asesor
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
)
ON CONFLICT DO NOTHING;

-- INSERTAR TIPOS DE CALCULO DE COMISION
INSERT INTO tipo_calculo_comision
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
)
ON CONFLICT DO NOTHING;

-- INSERTAR TIPOS DE SECCION
INSERT INTO tipo_seccion
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
)
ON CONFLICT DO NOTHING;

-- INSERTAR TIPOS DE MULTIMEDIA
INSERT INTO tipo_multimedia
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
)
ON CONFLICT DO NOTHING;

-- INSERTAR USOS DE MULTIMEDIA
INSERT INTO uso_multimedia
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
)
ON CONFLICT DO NOTHING;

-- INSERTAR TIPOS DE NOTIFICACION
INSERT INTO tipo_notificacion
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
)
ON CONFLICT DO NOTHING;

-- INSERTAR CANALES DE NOTIFICACION
INSERT INTO canal_notificacion
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
)
ON CONFLICT DO NOTHING;

-- INSERTAR TIPOS DE MOVIMIENTO
INSERT INTO tipo_movimiento
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
)
ON CONFLICT DO NOTHING;

-- INSERTAR TIPOS DE CUENTA
INSERT INTO tipo_cuenta
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
)
ON CONFLICT DO NOTHING;

-- INSERTAR PERMISOS
INSERT INTO permiso
(
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
    TRUE
),
(
    'SEGURIDAD_USUARIO_CREAR',
    'SEGURIDAD',
    'USUARIO',
    'CREAR',
    'Crear usuarios',
    'Permite registrar nuevos usuarios',
    TRUE
),
(
    'SEGURIDAD_USUARIO_EDITAR',
    'SEGURIDAD',
    'USUARIO',
    'EDITAR',
    'Editar usuarios',
    'Permite modificar información y configuración de usuarios',
    TRUE
),
(
    'SEGURIDAD_ROL_VER',
    'SEGURIDAD',
    'ROL',
    'VER',
    'Ver roles',
    'Permite consultar los roles disponibles',
    TRUE
),
(
    'SEGURIDAD_ROL_GESTIONAR',
    'SEGURIDAD',
    'ROL',
    'GESTIONAR',
    'Gestionar roles',
    'Permite crear, editar y asignar roles',
    TRUE
),
(
    'SEGURIDAD_PERMISO_VER',
    'SEGURIDAD',
    'PERMISO',
    'VER',
    'Ver permisos',
    'Permite consultar permisos del sistema',
    TRUE
),
(
    'SEGURIDAD_PERMISO_GESTIONAR',
    'SEGURIDAD',
    'PERMISO',
    'GESTIONAR',
    'Gestionar permisos',
    'Permite asignar y administrar permisos de los roles',
    TRUE
),
(
    'SEGURIDAD_AUDITORIA_VER',
    'SEGURIDAD',
    'AUDITORIA',
    'VER',
    'Ver auditoría',
    'Permite consultar eventos de auditoría y seguridad',
    TRUE
)
ON CONFLICT DO NOTHING;

-- ASIGNAR PERMISOS AL ROL ADMINISTRADOR
INSERT INTO asignacion_permiso
(
    id_rol,
    id_permiso,
    activo
)
SELECT
    r.id_rol,
    p.id_permiso,
    TRUE
FROM rol r
JOIN permiso p
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
  AND r.activo = TRUE
  AND p.activo = TRUE
  AND NOT EXISTS (
      SELECT 1
      FROM asignacion_permiso ap
      WHERE ap.id_rol = r.id_rol
        AND ap.id_permiso = p.id_permiso
  );