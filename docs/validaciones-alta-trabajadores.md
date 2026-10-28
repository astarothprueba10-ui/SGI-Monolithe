# Validaciones del alta de trabajadores y correo de credenciales

## Alcance

Base revisada: `10f83dcd5797c3a84785877116f4cd13c7f5a448` de `main`, que ya
contiene el commit `7678b24` de ubicación, fechas y números de proyectos.

El alta conserva los contratos JSON existentes y los procedimientos de Supabase.
No modifica datos de producción ni crea usuarios o asigna roles automáticamente.

## Documentos personales

El desplegable de Nuevo trabajador excluye RUC por su código (`RUC`, `06`, `6`)
o su denominación. Los identificadores se obtienen del catálogo vigente; no se
asumen identificadores fijos. DNI, carné de extranjería y pasaporte permanecen
disponibles según el catálogo.

El servidor vuelve a consultar el catálogo y rechaza RUC y tipos inexistentes
antes de ejecutar el procedimiento de registro. Los catálogos generales y los
trabajadores históricos conservan sus datos.

## Fecha de ingreso

La fecha mínima de un nuevo trabajador es el día actual en `America/Lima`.
Se admiten hoy y fechas posteriores. Se rechazan fechas anteriores, fechas
inexistentes y valores con formato diferente de `YYYY-MM-DD`.

El calendario usa `min`, y el formulario valida al escribir, al salir del campo
y al guardar. El límite se actualiza al abrir, recuperar el foco y cada 30
segundos mientras el formulario está abierto. La comprobación al guardar calcula
el día nuevamente. El servidor aplica la misma regla independientemente de la
zona horaria de su sistema operativo.

La regla corresponde al alta. La edición conserva las fechas históricas para
que modificar un trabajador existente no obligue a cambiar su fecha de ingreso.

## Validación del correo

No existe una lista de proveedores permitidos. Se admiten direcciones
convencionales de Gmail, Outlook, Hotmail, Yahoo, iCloud, dominios de empresas,
instituciones y subdominios. Se incluyen alias con `+`, apóstrofos en la parte
local y dominios con extensiones largas.

Los espacios exteriores se eliminan, el dominio se convierte a minúsculas y
los dominios internacionales se convierten a su representación ASCII (IDNA).
La parte local conserva sus mayúsculas. Se rechazan listas de destinatarios,
saltos de línea, etiquetas de dominio inválidas y direcciones mal formadas.

Se mantiene el carácter opcional del campo del expediente. Para activar una
cuenta y enviar credenciales, sí se exige un correo principal válido.
No se habilitan partes locales Unicode que requieran SMTPUTF8, direcciones
entre comillas ni literales IP; requieren un soporte de transporte adicional.

La normalización se aplica al alta en el formulario y en el servidor. La creación
de cuentas y el envío de credenciales utilizan la misma política de direcciones.

## Cuándo se envían las credenciales

En el código revisado, registrar un trabajador guarda su expediente.
El correo se emite desde `UserManagementService.activarUsuario` después de que
el procedimiento de activación devuelve `ACTIVADO`.

Flujo actual:

1. Registrar al trabajador y su correo principal.
2. En Usuarios y roles, crear su cuenta y asignar los roles autorizados.
3. Activar la cuenta. Se genera una contraseña temporal con vigencia de 24 horas
   y se envía el mensaje a su correo principal.

Este parche no añade la activación automática al guardar al trabajador.
Para hacer ese envío automático es necesario definir cómo se elige su rol y
quién está autorizado a crear y activar la cuenta. Tampoco se presupone el
contenido de procedimientos remotos que no están versionados en este repositorio.

## Transporte y diagnóstico

Las credenciales se envían con alternativas de texto y HTML en UTF-8.
La plantilla distingue el usuario de acceso del número de documento oficial.
No se incluyen credenciales en enlaces ni registros.

Los errores de SMTP muestran mensajes seguros en la API para distinguir:

- Autenticación del remitente rechazada.
- Rechazo temporal (códigos SMTP 4xx).
- Rechazo del envío o destinatario (códigos SMTP 5xx).
- Fallos de conexión o preparación del mensaje.

Los eventos de diagnóstico contienen el dominio del destinatario y, al fallar,
el código SMTP y el tipo de error. Excluyen la dirección completa, contraseña,
cuerpo del mensaje y texto original de errores del proveedor.

```powershell
docker compose logs --since 10m auth-service | Select-String "CREDENCIALES_SMTP"
```

`CREDENCIALES_SMTP_ACEPTADO` significa que el servidor SMTP aceptó el mensaje.
No confirma la entrega a la bandeja de entrada. El proveedor puede informar un
rebote posterior, ponerlo en spam o aplicar filtros del destinatario.

Si no aparece ningún evento al guardar un trabajador, comprobar primero el flujo
de creación y activación de su cuenta. Si aparece un fallo, revisar el código
SMTP. Si aparece aceptación, consultar la trazabilidad y los rebotes del
proveedor, además de la carpeta de spam y las políticas del dominio receptor.

## Configuración SMTP

Se conservan las variables privadas `MAIL_FROM`, `MAIL_HOST`, `MAIL_PORT`,
`MAIL_USERNAME` y `MAIL_PASSWORD`. No se incluyen valores reales en el paquete.
Las opciones nuevas son opcionales; sus valores predeterminados mantienen
autenticación y STARTTLS con validación del certificado:

| Variable | Predeterminado | Uso |
| --- | --- | --- |
| `MAIL_AUTH` | `true` | Autenticación SMTP |
| `MAIL_STARTTLS_ENABLE` | `true` | STARTTLS, habitualmente puerto 587 |
| `MAIL_STARTTLS_REQUIRED` | `true` | Exigir STARTTLS |
| `MAIL_SSL_ENABLE` | `false` | TLS implícito, habitualmente puerto 465 |
| `MAIL_CONNECTION_TIMEOUT` | `15000` | Tiempo de conexión en milisegundos |
| `MAIL_READ_TIMEOUT` | `30000` | Tiempo de lectura en milisegundos |
| `MAIL_WRITE_TIMEOUT` | `30000` | Tiempo de escritura en milisegundos |

Para un proveedor que exige TLS implícito, configurar su puerto indicado,
`MAIL_SSL_ENABLE=true`, `MAIL_STARTTLS_ENABLE=false` y
`MAIL_STARTTLS_REQUIRED=false`. No cambiarlo si el proveedor usa STARTTLS.
La validación de identidad del certificado permanece activada.

Un servicio local de pruebas sin autenticación ni TLS requiere configurar esas
opciones solo en ese entorno. Los valores de ejemplo de Mailpit/localhost no
constituyen un servidor que entregue mensajes a buzones de Internet.

El dominio del remitente debe estar autorizado por el proveedor. La configuración
de SPF, DKIM y DMARC se realiza en el proveedor/DNS; no se corrige cambiando el
desplegable o la expresión de validación del destinatario. Si el servicio limita
destinatarios durante pruebas, su cuenta debe habilitar el envío de producción.

Fuentes técnicas:

- [Requisitos para remitentes de Google](https://support.google.com/mail/answer/81126?hl=es).
- [Diagnóstico de fallos SMTP en Angus Mail](https://eclipse-ee4j.github.io/angus-mail/docs/api/org.eclipse.angus.mail/org/eclipse/angus/mail/smtp/package-summary.html).

## Verificación

Se verificaron el build del backoffice, las pruebas de trabajadores y proyectos,
las suites de ambos servicios y el formulario en navegador a 1365 y 400 px.
Las pruebas de correo simulan aceptación, autenticación fallida y respuestas
SMTP 450, 550 y 554; no envían correos reales.

El chequeo global de TypeScript presenta 59 errores que también aparecen en la
base sin cambios. No se detectaron errores nuevos con esta actualización.

La entrega real y posibles restricciones de procedimientos remotos todavía
requieren comprobar el entorno del usuario, el proveedor SMTP y sus registros.
