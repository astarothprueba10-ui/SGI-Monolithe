# Consulta de DNI y formato de nombres en Trabajadores

El alta de trabajadores reutiliza el proveedor de DNI configurado para el CRM.
Al completar un DNI válido de ocho dígitos, el formulario inicia la consulta
automática después de 500 ms. El botón «Buscar persona» permite reintentar.
Los ceros iniciales se conservan: el documento siempre se trata como texto.

## Consulta y confirmación

| Situación | Comportamiento |
| --- | --- |
| Persona existente en Monolithe | Muestra sus datos y exige confirmación antes de asociar su identidad. |
| DNI nuevo con coincidencia externa | Completa nombres y apellidos; no inventa un `idPersona`. |
| Carné de extranjería | Consulta únicamente los registros existentes en Monolithe. |
| Sin coincidencia o proveedor no disponible | Permite completar los datos manualmente. |
| Documento inválido, identidad rechazada o trabajador duplicado | Mantiene el bloqueo del registro y muestra el error. |

La consulta no crea personas ni trabajadores. No completa teléfono, correo ni
fecha de nacimiento a partir del proveedor externo. La información de una
persona local se aplica únicamente después de confirmarla.

Las respuestas de documentos anteriores se descartan. Si se cambia el documento,
se retiran solo los valores automáticos que el usuario no haya corregido.
Cerrar el formulario cancela la consulta. Durante la búsqueda se bloquea el guardado.

Se mantienen las opciones DNI y carné de extranjería, las reglas de longitud de
documento, el teléfono de nueve dígitos que empieza por 9, los correos de cualquier
dominio válido, la fecha de ingreso desde hoy en Perú y los campos laborales y
geográficos requeridos.

## Formato de nombres

| Entrada | Resultado |
| --- | --- |
| `CESAR JAVIER ROJAS` | `Cesar Javier Rojas` |
| `césar jAvIeR` | `César Javier` |
| `MARÍA ÁNGELA MUÑOZ` | `María Ángela Muñoz` |
| `de la cruz` | `De La Cruz` |

Se conservan tildes y ñ, se unifican espacios y se escribe cada palabra con inicial
mayúscula. La función de formato no elimina números para convertir una entrada
inválida en válida; se conservan las validaciones existentes de nombres.

El formulario de alta muestra el formato al salir de cada campo y antes de enviar.
El servidor lo aplica antes de persistir altas y ediciones de trabajadores, altas
de leads y correcciones personales del CRM. Las respuestas de identidad del CRM
también devuelven los nombres normalizados.

Las tablas de Trabajadores, Usuarios y leads presentan los nombres históricos
con el mismo formato. No se ejecuta una modificación masiva de datos históricos.
Los documentos, usuarios de acceso y correos conservan sus reglas actuales.

## Contrato y configuración

`POST /api/core/trabajadores/personas/consultar` recibe
`{ "idTipoDocumento": 1, "numeroDocumento": "00000001" }`.
El identificador de tipo se obtiene del catálogo; `1` es solo un ejemplo.

El endpoint exige `hr.create`, toma el actor del JWT y devuelve `Cache-Control:
no-store`. No exige `crm.create`. Se conservan la autorización y las comprobaciones
de identidad y duplicidad del procedimiento de identificación existente.

Se reutilizan `ConsultaDniClient`, Decolecta y `CRM_DNI_API_TOKEN`, exclusivamente
en el servidor. No hay claves nuevas en el frontend ni migraciones SQL.
Si la consulta del CRM ya funciona, se utiliza esa configuración.

Después de aplicar el parche, reconstruir desde la raíz del proyecto:

```powershell
docker compose up -d --build backoffice core-service
```

## Validación

Pruebas reproducibles del frontend, desde `apps/backoffice`:

```powershell
npm ci
npm run test:worker-identity
npm run test:workers
npm run test:lead-identity
npm run test:lead-phone
npm run test:users
npm run test:session
npm run test:navigation
```

Pruebas de navegador, desde `tests/responsive`:

```powershell
npm ci
npx playwright install chromium
npx playwright test --config=workerIdentity.config.ts
npx playwright test --config=leadIdentity.config.ts
```

La configuración de Trabajadores incluye anchos de 320, 390, 640, 768, 1024,
1365 y 1920 px. Se comprueban alta real contra un servidor simulado, confirmación
local, permisos de RRHH sin CRM, respuestas tardías, cancelación, errores,
correcciones manuales y conservación de teléfono y fecha.

Las pruebas del proveedor usan respuestas simuladas; no consumen consultas de una
cuenta real. El informe `validacion.json` del paquete detalla resultados y las
limitaciones preexistentes de la comprobación global de TypeScript.
