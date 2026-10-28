# Edición administrativa del correo de contacto

## Comportamiento

Usuarios y roles → Editar usuario permite modificar el correo electrónico y
guardarlo con el botón Guardar cambios. Al reabrir la ventana se carga el valor
guardado. Cancelar descarta la edición.

El nuevo correo se normaliza y valida en el formulario y en el servidor. Se
admiten distintos proveedores, alias con `+` y dominios internacionales. Se
aplica el máximo de 180 caracteres del contacto administrativo. No se permite
borrar un correo existente ni asignar un correo activo de otra persona.

El contrato anterior de edición sigue admitido: si una petición no incluye
`correoElectronico`, se conserva el correo actual.

## Autorización y persistencia

La operación exige Administrador o Gerencia y `users.edit`. Se mantienen la
protección de la cuenta propia y la función de base de datos que determina si el
actor puede gestionar la cuenta objetivo. El identificador del actor se obtiene
del JWT; la persona vinculada se obtiene en el servidor a partir de la cuenta.

El correo se guarda en el contacto EMAIL principal de esa persona, dentro de
`core_personas_contactos`. No se depende de identificadores fijos del catálogo.
Se bloquean la cuenta y la persona durante la operación. Un bloqueo transaccional
por dirección y la comprobación de duplicados coordinan las modificaciones
administrativas concurrentes.

El cambio de login y correo de una petición se realiza en una única transacción.
Si falla la actualización del correo o su auditoría, se revierte la petición.
Los cambios de rol siguen utilizando la operación separada que ya usa el modal.

Esta ventana realiza una corrección administrativa inmediata, sin un enlace de
confirmación. El nuevo contacto se considera verificado administrativamente,
siguiendo la política ya descrita para el registro administrativo en la migración
25. El flujo de confirmación de cambios de correo del módulo de Trabajadores
continúa disponible y no se modifica.

Los contactos anteriores se conservan como no principales. Si la dirección ya
figuraba en el historial de la misma persona, se reactiva ese contacto y se
conserva su preferencia de notificaciones.

La auditoría registra la acción, el actor y la cuenta objetivo, sin registrar
direcciones completas, cuerpos de mensajes ni credenciales.

## Uso del nuevo correo

La edición del correo no envía por sí sola una nueva contraseña. Las siguientes
operaciones de credenciales o recuperación usarán el contacto principal conforme
al flujo existente del sistema. La entrega SMTP continúa dependiendo de la
configuración del entorno y de la aceptación del mensaje por el proveedor.

## Aplicación

Este parche es adicional al paquete `Monolithe-trabajadores-validaciones-correo`.
Se aplica sobre esa misma rama, después de haber aplicado aquel paquete.
No requiere una migración SQL nueva. Utiliza las tablas y funciones de seguridad
que ya emplea el proyecto.

Después de aplicarlo, reconstruir `auth-service` y `backoffice`, y recargar con
Ctrl + F5. Comprobar con una cuenta de prueba que el correo persista al cerrar y
reabrir Editar usuario.

## Verificación

Se ejecutaron 210 pruebas de `auth-service`, cuatro pruebas de la política del
formulario y el build del backoffice. En navegador se verificaron escritorio y
móvil: edición, validación, guardado, recarga, cancelación y conflicto de correo.

Las consultas del repositorio se ejecutaron también en un PostgreSQL embebido
aislado para comprobar permisos, duplicados, reutilización del contacto, un único
principal, auditoría y reversión conjunta de login y correo ante un fallo.

TypeScript mantiene los 59 errores que ya presenta la base, sin errores nuevos.
Las pruebas no se conectaron al Supabase ni al SMTP de producción del usuario.
