# Auditoría RBAC — primera corrección transversal

## Hallazgos
- El catálogo central sí existe; la matriz recibía los permisos del servidor, pero ocultaba acciones fuera de una lista local y mostraba solo un permiso por módulo/acción.
- El frontend comercial decidía alcance y acciones por nombre de rol; las funciones SQL repetían esa política.
- La migración 163 crea capacidades explícitas y migra las asignaciones de los roles históricos. Verifica la equivalencia del acceso a prospectos, ventas, vouchers y anulaciones de las cuentas existentes dentro de la transacción. No reemplaza las restricciones de propiedad, estado ni separación de funciones.
- La comprobación central de permisos exige que la asignación no esté revocada. Las nuevas capacidades solo se delegan por un actor que las posee. Gerencia conserva el mecanismo de permisos automáticos.

## Pendiente de auditoría y corrección
- Aprovisionamiento del asesor (triggers de RRHH) y roles de sistema, administración de cuentas, reglas de protección de jerarquía y delegación: no convertir a permisos genéricos sin preservar restricciones anti-escalamiento.
- Anulaciones: decisión gerencial, dictámenes legales/financieros y separación de funciones. No se cambian esas autorizaciones en esta migración.
- Revisar las versiones anteriores de funciones, llamadas Java efectivas, políticas RLS, sesiones, menús y componentes restantes. No asumir que toda aparición de ROLE_* es una autorización (puede ser presentación o separación de portal).
- Prueba integral en navegador creando un rol nuevo y asignándole alcances distintos, revocando permisos y comprobando el acceso directo a API.
