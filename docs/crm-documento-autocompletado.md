# Documento y autocompletado en Nuevo lead

## Comportamiento

El tipo y el número de documento son los primeros campos del formulario.
Se conservan DNI, carné de extranjería, pasaporte y RUC.

Al completar un documento válido, se espera medio segundo para consultar.
Primero se buscan los nombres de una persona y un documento activos en Monolithe.
Si no existe un registro local y el tipo es DNI, se consulta el proveedor externo.

| Documento | Fuente de autocompletado |
| --- | --- |
| DNI | Monolithe y, si está configurado, Decolecta |
| CE, pasaporte y RUC | Registros existentes de Monolithe |

Se completan nombres, apellido paterno y apellido materno. Los datos escritos
manualmente se conservan. Teléfono, correo y dirección se completan manualmente;
la consulta externa de DNI utilizada no entrega esos datos.

Cambiar de documento retira los nombres que se completaron automáticamente,
conserva las correcciones manuales y descarta las respuestas de consultas anteriores.
Cerrar el formulario cancela la consulta. No se permite guardar mientras se consulta.
Si no hay coincidencia, falta la clave o falla la red, se puede continuar manualmente.

## Servidor y permisos

`POST /api/core/crm/personas/consultar` requiere autenticación y `crm.create`.
El cuerpo contiene `tipoDocumento` y `numeroDocumento`. Se valida el formato antes
de consultar y se conserva el documento como texto, incluidos los ceros iniciales.

El resultado incluye `estado`, `fuente`, `persona` y `mensaje`, junto al documento.
Los estados son `ENCONTRADO`, `NO_ENCONTRADO` y `NO_DISPONIBLE`.
La consulta no crea personas, no verifica documentos ni modifica registros.
La respuesta usa `Cache-Control: no-store`. La búsqueda SQL selecciona solo nombres,
usa parámetros y limita el resultado a una persona activa.

El cliente de Decolecta exige que el DNI devuelto coincida con el solicitado,
no sigue redirecciones y tiene límites de conexión de 3 segundos y lectura de 5.
El token viaja en Authorization desde el servidor. Las fallas no publican la
respuesta interna ni las credenciales del proveedor. Los clientes HTTP anteriores
se conservan sin añadir otro RestTemplate compartido.

## Configuración de la consulta externa de DNI

Obtener un token con acceso a consulta DNI desde el proveedor:

- https://decolecta.com/profile
- https://decolecta.gitbook.io/docs
- https://decolecta.gitbook.io/docs/servicios/integrations-2

Agregar esta variable al archivo local `.secret/supabase.env`, conservando su
contenido actual y reemplazando el marcador por la clave del proveedor:

```dotenv
CRM_DNI_API_TOKEN=TU_TOKEN_DE_DECOLECTA
```

Docker Compose carga ese archivo opcional únicamente en core-service. La carpeta
`.secret/` está excluida de Git. El token no se coloca en variables VITE, código
fuente, navegador o parámetros de URL. En Linux, usar permisos 600 para el archivo.

Reconstruir los servicios:

```powershell
docker compose up -d --build backoffice core-service
```

No se requieren consultas SQL ni migraciones. Sin token, continúan funcionando
la búsqueda local y el registro manual. No se probó una consulta externa real:
la activación y la disponibilidad del servicio dependen de la cuenta del proveedor.

## Verificaciones

```powershell
npm --prefix apps/backoffice run test:lead-identity
npm --prefix apps/backoffice run build
npm --prefix tests/responsive ci
npm --prefix tests/responsive run install:browser
npm --prefix tests/responsive test -- --config=leadIdentity.config.ts
mvn -f services/core-service/pom.xml "-Dtest=CrmPersonaConsultaServiceTest,DecolectaDniClientTest,CrmPersonaConsultaControllerTest" test
```

Pasaron 6 pruebas unitarias del cliente y 60 pruebas de navegador en anchos
320, 390, 640, 768, 1024 y 1365, usando respuestas e identidades simuladas.
Pasaron 32 pruebas del servidor, incluidas permisos, prioridad de datos locales,
credenciales ausentes, errores, timeout y rechazo de datos de otro documento.
La compilación del backoffice terminó correctamente.

Los módulos nuevos pasan la comprobación de tipos. El chequeo global conserva
8 errores previos del commit base; se comprobó que el cambio no introduce nuevos.
Las pruebas Maven y la compilación completa de fuentes se ejecutaron con Java 17
mediante opciones de comando; el POM conserva Java 21. La compilación de producción
con Java 21 queda por confirmar en el entorno Docker del proyecto.
