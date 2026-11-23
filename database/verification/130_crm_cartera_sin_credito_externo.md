# CRM: cartera contractual sin evaluación externa (migración 130)

## Decisión del negocio
MONOLITHE requiere consulta de riesgo crediticio **automática**, no carga manual.
No existe proveedor gratuito, oficial y verificado habilitado para consultar a terceros desde el CRM.
Hasta contratar/acceder a un proveedor real, **se retira por completo** el indicador de riesgo externo.

## Cambios
- La migración 130 crea `sp_crm_compradores_filtros_v2` con filtros de búsqueda, proyecto, modalidad y fechas de formalización.
- Retira el procedimiento anterior con alerta, el trigger y función de notificaciones crediticias, y la tabla `crm_evaluaciones_crediticias`.
- La migración bloquea el borrado si detecta cualquier evaluación registrada. No borra ventas, compradores, contratos, cuotas ni notificaciones históricas de otros módulos.
- El Backoffice retira la columna y el filtro de alerta financiera, el bloque de riesgo del expediente y el campo del Excel.
- Se conserva el seguimiento **interno** de pagos, cronogramas y avisos de cuotas vencidas o próximas a vencer.

## Validación
1. Ejecutar los tests del workflow `CRM cartera y riesgo - PostgreSQL 17 aislado`. Verifica 127-129 con fixture histórica, trunca únicamente los datos **sintéticos** del test, ejecuta 130 y confirma que se conserven operaciones y filtros.
2. Verificar la compilación de Backoffice y Core.
3. En Supabase real, comprobar ausencia de `crm_evaluaciones_crediticias` y presencia de `sp_crm_compradores_filtros_v2`. Comparar número de ventas/contratos previos y posteriores.
4. En local, reconstruir `core-service` y `backoffice` desde la rama `fix/correccion-flujo-negocio`, y revisar búsqueda por contrato, multipropiedad, modalidad y fechas.
5. Validar scroll horizontal y contrato en una sola línea con estado debajo, manteniendo expediente y cronograma.

**Nota:** Los archivos 127-129 se conservan como historial de migraciones ya aplicadas, pero su evaluación externa queda desactivada por la migración 130. No reactivar las evaluaciones sin un servicio contratado, autorización para tratar datos crediticios y un nuevo desarrollo.
