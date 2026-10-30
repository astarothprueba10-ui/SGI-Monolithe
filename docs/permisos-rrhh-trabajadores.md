# Gestión de expedientes de cualquier rol por RRHH

## Cambio funcional

RRHH activo, con el permiso correspondiente, puede crear y editar expedientes
laborales de otros trabajadores, incluso con cargo Gerente General o roles
Gerencia y Administrador. También puede activar, inactivar, suspender, cesar y
solicitar la reincorporación de esos expedientes mediante los flujos del módulo.

La creación usa `hr.create`; las operaciones laborales usan `hr.edit`. Una cuenta
con otro rol no obtiene la excepción integral por disponer solo de `hr.edit`.
Las funciones auxiliares consultan los roles y permisos vigentes en la base de
datos, no un rol declarado por el formulario.

## Procedimientos ajustados

| Procedimiento | Ajuste |
| --- | --- |
| `sp_rrhh_actualizar_trabajador` | Permite a RRHH editar Gerencia y cambiar estados de otros expedientes protegidos por rol. |
| `sp_rrhh_programar_suspension` | Admite trabajadores de cualquier cargo o rol para RRHH. |
| `sp_rrhh_cesar_trabajador` | Admite el cese de esos expedientes, con historial y notificación administrativa. |
| `sp_rrhh_solicitar_reincorporacion` | Admite la solicitud para trabajadores de cualquier rol. |
| `sp_rrhh_resolver_reincorporacion` | El Administrador puede resolver también expedientes de Gerencia; mantiene `hr.approve` y las prohibiciones de autoaprobación. |
| `sp_rrhh_solicitar_cambio_correo` | Permite a RRHH iniciar el flujo de cambio de correo de Gerencia. |
| `sp_rrhh_solicitar_correccion_documento` | Permite a RRHH iniciar la corrección documental de esos expedientes. |

`sp_rrhh_registrar_trabajador` ya permitía estos cargos con `hr.create`; se probó
su comportamiento y se conserva su definición.

## Reglas conservadas

- Los estados de suspensión, cese y verificación conservan sus procedimientos específicos.
- Una reincorporación tras cese requiere aprobación administrativa y no permite autoaprobación.
- La gestión integral no concede permisos para crear roles ni cambiar sus permisos.
- Una activación laboral no elimina restricciones manuales de acceso de Seguridad.
- El cambio de estado sigue revocando sesiones y recuperaciones de contraseña pendientes.
- Se mantienen la auditoría, los motivos, las fechas, los catálogos y las notificaciones.
- Las solicitudes de correo y documento conservan su confirmación o evidencia y aprobación.
- El cambio de correo exige un contacto actual activo y con valor, según la segunda exportación del 29/10/2026.

## Migración y comprobación

1. Aplicar los archivos de la parte 1 y mantener su compilación en ejecución.
2. Ejecutar `database/migrations/31_rrhh_gestion_integral_trabajadores.sql` en SQL Editor de Supabase.
3. Ejecutar `database/verification/31_rrhh_gestion_integral_trabajadores_verificar.sql`.
   Las nueve filas deben devolver `OK`.
4. Probar en la aplicación con RRHH sobre una cuenta de prueba de Gerencia.

El script compara la definición actual con la exportada por el usuario. Una
diferencia detiene y revierte la transacción. Admite repetición cuando ya está
aplicado. No actualiza directamente los expedientes existentes durante la migración.

La revisión incorpora el segundo CSV del 29/10/2026: conserva la validación
`CONTACTO_NO_REGISTRADO` de `sp_rrhh_solicitar_cambio_correo`, incorporada en la
base después del primer CSV. La instalación y la reversión usan esta definición;
ninguna de ellas elimina esa validación. El resto de los procedimientos coincide
con la primera exportación.

La comprobación y la validación previa de los auxiliares normalizan los saltos
de línea tanto de la definición almacenada como del texto esperado. Admiten LF
y CRLF de Windows sin omitir diferencias de contenido. La consulta de verificación
incluye `detalle` para identificar una rutina ausente, un cuerpo diferente o una
declaración distinta de `STABLE` / `SECURITY INVOKER`.

Los procedimientos conservan sus firmas, propietarios, permisos SQL y opciones
de ejecución. Las dos funciones auxiliares son `SECURITY INVOKER`, y su ejecución
se habilita únicamente para los propietarios de los procedimientos afectados.
Referencia: https://www.postgresql.org/docs/current/sql-createprocedure.html

## Reversión

Para volver a las reglas exportadas, usar exclusivamente
`database/rollback/31_rrhh_gestion_integral_trabajadores_revertir.sql`.
La reversión también verifica las definiciones antes de ejecutarse.

## Pruebas

Desde `database/tests`:

```bash
npm ci
npm run test:rrhh
```

La suite usa PGlite, con PostgreSQL y los cuerpos reales de trece rutinas exportadas.
Incluye creación, edición, estados, sesión, auditoría, notificaciones, restricciones
de cuenta, otros roles, solicitudes, aprobación, preservación de metadatos,
idempotencia, cambios posteriores al CSV y reversión. Los esquemas son fixtures;
los auxiliares externos no exportados se simulan explícitamente en el fixture.
Las pruebas no ejecutan operaciones sobre el Supabase del usuario ni envían correos.
