# Auditoría RBAC — primera corrección transversal

## Hallazgos
- El catálogo central sí existe; la matriz recibía los permisos del servidor, pero ocultaba acciones fuera de una lista local y mostraba solo un permiso por módulo/acción.
- El frontend comercial decidía alcance y acciones por nombre de rol; las funciones SQL repetían esa política.
- La migración 163 crea capacidades explícitas y migra las asignaciones de los roles históricos. Verifica la equivalencia del acceso a prospectos, ventas, vouchers y anulaciones de las cuentas existentes dentro de la transacción. No reemplaza las restricciones de propiedad, estado ni separación de funciones.
- La comprobación central de permisos exige que la asignación no esté revocada. Las nuevas capacidades solo se delegan por un actor que las posee. Gerencia conserva el mecanismo de permisos automáticos.

## Pendiente de auditoría y corrección
- Migración 165: aprovisionamiento de asesor mediante crm.operate_advisor, conservando requisitos de trabajador activo. No se asigna automáticamente a Gerencia porque designa una función laboral. Roles esenciales, administración de cuentas y jerarquía: pendientes de revisión específica.
- Migración 165: decisión y dictámenes de anulaciones mediante permisos existentes, incompatibilidad entre decisión y revisión, alcance de solicitud global independiente. Se preservan los requisitos de evidencia, propiedad y separación de usuarios. Migración 164 invalida tokens al modificar roles, permisos y asignaciones.
- Las rutas de retroceso del Core Service también se migraron a capacidades del catálogo. Las políticas RLS de public no contienen nombres de roles comerciales en sus expresiones (búsqueda estática). Revisar las versiones anteriores de funciones, llamadas Java efectivas, sesiones, menús y componentes restantes. No asumir que toda aparición de ROLE_* es una autorización (puede ser presentación o separación de portal).
- Prueba integral en navegador creando un rol nuevo y asignándole alcances distintos, revocando permisos y comprobando el acceso directo a API.
