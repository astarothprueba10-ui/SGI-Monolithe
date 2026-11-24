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

## Validaciones ejecutadas sobre Supabase compartido (rollback)
- Creación de rol personalizado, asignación a un asesor, acceso a cartera no propia, retiro del permiso y revocación del rol. Los tokens previos quedan invalidados en cada transición.
- Nuevo rol con crm.operate_advisor asignado a trabajador activo previamente no asesor: se incorpora al listado de asesores; al retirar el rol deja de aparecer. No se conservan roles de prueba.
- Las migraciones 163 y 165 incluyen comparaciones de alcances y catálogo de asesores antes y después.
- Los avisos generales de Supabase (RLS sin políticas, funciones con search_path mutable y funciones security definer ejecutables por roles públicos) requieren revisión separada de la migración comercial; no se ampliaron permisos públicos ni se desactivó RLS.

## Endurecimiento de exposición SQL (166)
- Se fijó search_path en las 19 rutinas que carecían de configuración explícita y se restringieron cinco rutinas privilegiadas internas (incluida la actualización de acceso exitoso). Los permisos de backend permanecen.
- Las tres funciones booleanas de visibilidad CMS son deliberadamente ejecutables por anon/authenticated porque se utilizan en políticas RLS públicas. No contienen datos privados ni mutaciones.
- Las 171 tablas de public tienen RLS; 87 sin políticas deniegan el acceso directo a filas por defecto. No agregar políticas de acceso general para silenciar avisos informativos.

## Delegación administrativa (167)
- Los endpoints de usuarios y roles usan permisos efectivos, sin lista de roles ordinarios. ADMINISTRADOR y GERENCIA conservan la jerarquía raíz, la protección de cuentas críticas y la asignación privilegiada; los demás roles son delegados.
- Un delegado no edita permisos de roles de sistema, de roles propios ni de roles con privilegios de seguridad. Solo puede conceder permisos que posee y nunca delegar administración de seguridad. Las asignaciones a cuentas con privilegios de seguridad superiores se rechazan. Las relaciones laborales y CRM se mantienen.

## RRHH y configuración financiera (168)
- El alcance integral de expedientes protegidos, la aprobación de reincorporaciones y la revisión documental de jefatura se expresan mediante capacidades `hr.*`. Las tres rutinas que dependían del ID físico 25 ya no lo utilizan. Se mantienen la jefatura laboral vigente para revisión documental, los controles de autoaprobación, y la protección de contactos de recuperación.
- La autorización financiera exclusiva de Gerencia y el TOTP son una regla de seguridad explícita en docs/financiamiento_mfa_bloque3.md y docs/financiamiento_publicacion_bloque4.md. Se impide conceder `financing.configure` a roles distintos de Gerencia; no se amplía esa regla ni se altera la publicación o las políticas pactadas.
