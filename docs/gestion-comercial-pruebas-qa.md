# Validación de gestión comercial (rama correccion_proyectos)

## Precondiciones
- Usar exclusivamente una base QA aislada, copia sin datos sensibles o fixtures. Los entornos Docker locales pueden compartir la base remota: no ejecutar pruebas de escritura contra producción.
- Aplicar 170_inm_gestion_comercial_independiente.sql después de verificar permisos y respaldo. El nuevo Core no habilita el flujo si falta la migración.
- El flujo de precios de venta usa PEN. Las tarifas nuevas deben estar vigentes hoy. No se programan cambios futuros.
- Los borradores y publicaciones previas se conservan. Las importaciones previas a la migración sin evidencia persistida no se identifican retroactivamente.

## Casos integrales a ejecutar en QA

| Caso | Pasos | Resultado esperado |
|---|---|---|
| Nuevo 1 | Crear proyecto vacío, importar Excel con 4 lotes, salir y volver | Excel bloqueado por marcador persistente; 4 lotes, sin publicación |
| Nuevo 2 | Corregir asignaciones, dejar una tarifa faltante y avanzar | Incidencia en matriz; no se avanza a disponibilidad |
| Nuevo 3 | Completar tarifas, seleccionar etapa 1 abierta y 2 cerrada, finalizar | Una publicación, precios preparados de ambas etapas, solo etapa 1 abierta |
| Nuevo 4 | Abrir etapa 2 y cerrar etapa 1, recargar | Checks persistidos, plano e inventario coherentes, mismas referencias de precio y número de publicaciones |
| Nuevo 5 | Editar tarifa de una combinación | Solo lotes de esa zona/etapa sin operación se actualizan; no cambia selección |
| Existente 1 | Proyecto con 10+ lotes no publicado | Excel bloqueado, inventario conservado |
| Existente 2 | Proyecto publicado antes de la migración | Selección histórica identificada como propuesta; validar precios faltantes antes de confirmar |
| Existente 3 | Proteger un vendido y un reservado; cerrar/reabrir etapa y editar tarifa | Identificadores, precios de operaciones y estados permanecen intactos |
| Concurrencia | Dos usuarios cargan misma revisión; uno guarda y otro intenta guardar | Segundo recibe conflicto 409, sin cambios |
| Seguridad | Rol distinto de Gerencia o falta lots.edit intenta modificar | 403, sin cambios |
| Auditoría | Consultar historial tras importación, finalización, cierre/reapertura, tarifa | Usuario autenticado, fecha y valores anteriores/nuevos registrados |
| Fallo | Abrir una etapa con precio vencido o ausente | Mensaje con lote afectado; ninguna modificación parcial |
| Integración | Verificar selector de CRM, plano, nueva reserva y venta de lotes libres vs cerrados | Solo lotes comercialmente habilitados, disponibles y con precio vigente permiten nuevas operaciones |

No publicar Los Cocos como parte de pruebas sobre base compartida. Los lotes con regla histórica PROTEGIDA permanecen protegidos; si una operación posteriormente se anula, reconciliar su asignación y precio antes de ofrecerlos nuevamente. La incorporación de nuevos lotes a una publicación existente requiere un flujo de alta individual posterior.

## Ejecución automatizada
- Backoffice: npm ci; npx tsc --noEmit -p tsconfig.json; npm run test:projects; npm run build
- Core: mvn -B -ntp -f services/core-service/pom.xml test
- PostgreSQL desechable: ejecutar en orden database/tests/fixtures/gestion_comercial_170_fixture.sql, database/migrations/170_inm_gestion_comercial_independiente.sql y database/tests/gestion_comercial_170_pg_test.sql con psql -v ON_ERROR_STOP=1.
- El fixture SQL verifica restricciones, compatibilidad con registros antiguos, unicidad y permisos; no sustituye las pruebas integrales de API y navegador.
