# Edición de trabajadores: validaciones y gestión desde RRHH

## Base y alcance

Base: `9229c8c6b6e8cd80c1bb135cf41fe43f261617ef`. El merge `4b6478fa`
contiene el mismo árbol de archivos. Los cambios corresponden al módulo Trabajadores.

## Teléfono

El campo de edición elimina caracteres no numéricos y limita la entrada a nueve
dígitos. Si cambia, exige nueve dígitos y prefijo 9 al salir del campo y al guardar.
El servidor aplica la misma comprobación a las actualizaciones JSON y tipadas.
El teléfono conserva su carácter opcional; un valor vacío se guarda como nulo.
Un dato histórico sin modificar no se incluye en el payload de una corrección ajena.

## Fecha de ingreso

El límite inferior es el día de creación del trabajador, obtenido de `fechaCreacion`.
Las marcas con zona horaria se convierten a `America/Lima`; las fechas locales
sin zona conservan el día informado. La fecha de ingreso propuesta debe ser real
y corresponder al día de registro o a uno posterior.

El calendario muestra ese mínimo, y el formulario vuelve a validar al salir del
campo y al guardar. Una fecha histórica sin modificar se conserva al editar otros
campos. Si no está disponible la fecha de registro, se bloquea únicamente la edición
de la fecha de ingreso; los otros datos pueden corregirse.

El servidor consulta el expediente persistido antes de validar un cambio de fecha.
Los valores de creación enviados por el cliente no definen el límite.

## Estado de los permisos de RRHH

La interfaz habilita los controles de estado del Gerente General cuando el actor
tiene el rol RRHH y el permiso `hr.edit`. Las comprobaciones del servidor y de los
procedimientos siguen activas. El permiso de creación continúa siendo `hr.create`.

La migración `database/migrations/31_rrhh_gestion_integral_trabajadores.sql` completa
la autorización del servidor a partir de las definiciones exportadas el 29/10/2026.
Comprueba las versiones de siete procedimientos antes de ajustar los bloqueos de
cargo o rol. RRHH activo y con `hr.edit` puede gestionar expedientes de Gerencia,
Administración y roles operativos. La creación conserva su permiso `hr.create`.

La activación e inactivación ordinarias se realizan desde Edición. La suspensión,
el cese, los cambios de correo y la corrección documental conservan sus flujos
específicos. El reingreso tras un cese requiere una solicitud de RRHH y resolución
del Administrador con `hr.approve`, también cuando el expediente pertenece a Gerencia.

Las restricciones de Usuarios y roles permanecen separadas. Se conservan las
comprobaciones de cuenta activa, motivos, fechas, auditoría, revocación de sesiones,
restricciones manuales de acceso y protección frente al autobloqueo o autoaprobación.
El detalle y los pasos de aplicación están en `docs/permisos-rrhh-trabajadores.md`.

## Validación

Se probaron reglas de teléfono, límites de registro, fechas irreales, zonas horarias,
fechas históricas sin cambios, payloads parciales, y conservación de las denegaciones
del procedimiento. La suite SQL adicional ejecuta los procedimientos exportados
en un PostgreSQL aislado con datos de prueba. La aplicación en Supabase se verifica
con `database/verification/31_rrhh_gestion_integral_trabajadores_verificar.sql` y
una prueba funcional desde la aplicación.
