# Validación local — CRM cartera por proyecto y riesgo externo (127–129)

**Estado:** cambios en `fix/correccion-flujo-negocio`, sin migraciones aplicadas en Supabase principal, sin PR ni despliegue.

## Preparación

1. Usar exclusivamente una base de datos de desarrollo/restauración local con esquema actualizado hasta migración 126. No ejecutar sobre producción.
2. Aplicar por orden `127_crm_cartera_filtros_riesgo_crediticio_v1.sql`, `128_crm_resumen_proyecto_v1.sql` y `129_crm_avisos_alerta_crediticia_v1.sql`.
3. Ejecutar el backend Core y Backoffice de esta rama contra la misma base de desarrollo. No mezclar backend nuevo con BD anterior.
4. Ejecutar las pruebas de compilación y regresión del repositorio. La revisión SQL de los procedimientos requiere PostgreSQL 17 de pruebas: el linter por sí solo no valida la ejecución.

## Casos mínimos para pruebas funcionales

| ID | Acción | Resultado esperado |
| --- | --- | --- |
| CRM-01 | Consultar compradores sin filtros | Muestra operaciones de contrato vigentes/finalizadas, no una sola fila por persona |
| CRM-02 | Cliente con dos lotes comprados | Dos filas con venta/lote y expediente correspondiente, sin duplicar contratos |
| CRM-03 | Buscar por código de contrato completo o parcial | Regresa las operaciones autorizadas que coincidan |
| CRM-04 | Comparar fecha de firma y fecha de venta distintas | Tabla y filtro usan fecha de firma; si no existe, fecha de creación contractual |
| CRM-05 | Proyecto «Todos» | Mantiene cartera histórica y datos agregados sin filtro extra |
| CRM-06 | Seleccionar un proyecto | Leads, potenciales, compradores, resumen, gráfico, fuentes y asignaciones del período se acotan al proyecto |
| CRM-07 | Asesor entra con proyecto seleccionado | Solo lee clientes y prospectos autorizados en su cartera; filtros no amplían permisos |
| CRM-08 | Filtrar por financiado / contado | Separa modalidades de la venta; no usa modalidad prevista de reserva |
| CRM-09 | Financiado sin evaluación vigente | «Pendiente» (ámbar), nunca «No» |
| CRM-10 | Contado | «No aplica» (gris), sin consultar central de riesgo |
| CRM-11 | Evaluación externa simulada en BD de pruebas con referencia legal acreditada y resultado ALERTA | «Sí» (rojo) para venta financiada; notificación deduplicada al asesor principal y a Gerencia |
| CRM-12 | Evaluación SIN_ALERTA vigente en BD de pruebas | «No» (verde) sin alterar estados de contratos |
| CRM-13 | Evaluación vencida | «Pendiente» y conserva su historial de auditoría |
| CRM-14 | Rango de fechas en compradores | Fecha desde/hasta inclusivas; paginación y totales consistentes |
| CRM-15 | Exportar Excel con proyecto | Solo operaciones del proyecto elegido, filas por venta/contrato y fecha de formalización correcta |
| CRM-16 | Consulta errónea del proveedor, sin respuesta o token caducado | Nunca convertir en «No»; conservar Pendiente/Sin datos |
| CRM-17 | Revisar alertas con contrato financiado | Aviso informativo, no aprueba/rechaza venta ni ejecuta anulaciones |
| CRM-18 | Cambiar entre proyectos y pestañas | Actualiza consultas y restablece paginaciones sin mezclar resultados |

## Integración real SBS / Experian-Sentinel pendiente de contratación

El presente desarrollo **no llama a un proveedor crediticio real**. Antes de habilitarlo se necesitan:
- Contrato empresarial, método de autenticación, especificación de endpoints, tarifas, límites, SLA y entorno sandbox del proveedor.
- Confirmación del marco de uso de información crediticia y textos de información/consentimiento o base legal aplicable, con tratamiento autorizado de datos personales.
- Criterios de «Alerta»/«Sin alerta» aprobados por Gerencia (considerar mora, calificación y capacidad de pago; no usar únicamente cantidad de entidades financieras).
- Definición de períodos de vigencia, rectificación, trazabilidad, retención y quién podrá consultar reportes.
- Almacenamiento de credenciales exclusivamente en backend, nunca en React ni en Git; sin payload completo ni datos ajenos en `crm_evaluaciones_crediticias`.
- Servicio backend transaccional, con autorización, idempotencia y auditoría que registre evaluaciones verificadas; actualmente la tabla no permite inserciones desde navegador ni existe endpoint de emisión.
- Pruebas contra sandbox del proveedor y aprobación antes de habilitar avisos reales.

**No ejecutar consultas ni introducir resultados crediticios reales en la base compartida de producción durante las pruebas locales.**
