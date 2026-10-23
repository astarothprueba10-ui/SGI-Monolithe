# Validación de ubicación y fechas de proyectos

## Contrato y reglas

El formulario de creación y edición presenta Dirección, Referencia de ubicación,
País, Departamento, Provincia y Distrito, en ese orden. País se muestra como Perú
y no se puede editar. Los tres niveles subnacionales utilizan listas dependientes.
Cambiar departamento elimina provincia y distrito; cambiar provincia elimina
distrito. Provincia y distrito permanecen deshabilitados hasta seleccionar su padre.

Se conserva el carácter opcional de la ubicación existente: puede omitirse
completamente. Si se informa algún nivel, los tres deben formar una combinación
del catálogo. Los valores anteriores que difieran solamente por tildes,
mayúsculas o espacios se reconocen y guardan con su nombre oficial. Un valor
anterior desconocido se muestra para que el usuario lo corrija antes de guardar.

Las fechas conservan su carácter opcional. Cuando se informan ambas, inicio debe
ser menor o igual a fin estimada. Se permiten fechas iguales, fechas históricas
y días bisiestos válidos. Se rechazan fechas inexistentes, valores ajenos al
formato ISO de la API y años fuera de 0001 a 9999. Los calendarios establecen
límites recíprocos y los mensajes se actualizan al cambiar cualquiera de las fechas.

## Dimensiones y coordenadas

Área total, latitud y longitud admiten un máximo de 10 cifras por campo, contando
la parte entera y decimal; signo y separador no cuentan. Se rechazan letras,
notación científica, espacios y símbolos adicionales al escribir, pegar o
arrastrar texto. La entrada utiliza controles de texto con validación del valor
completo; las teclas de edición y los atajos del navegador permanecen disponibles.
Los valores rechazados no sustituyen ni truncan el valor anterior.

Se permiten punto o coma como separador decimal, sin separadores de miles; la coma
se convierte a punto. El área debe ser positiva y admite hasta 2 decimales.
Las coordenadas admiten signo negativo al inicio y hasta 7 decimales, con los
rangos existentes: latitud de -90 a 90, longitud de -180 a 180. Su teclado de texto
permite introducir el signo negativo también desde dispositivos móviles.

Un valor parcial, como un signo o separador aislado, se permite durante la edición
y debe completarse antes de guardar. Los campos siguen siendo opcionales. Un
valor anterior con más cifras se conserva visible y puede borrarse o corregirse;
no se trunca automáticamente al abrir la edición.

`projectNumberValidation` aplica formato, precisión, límites y rangos en ambos
modos del formulario. `ValidacionProyectoService` comprueba también la cantidad
total de cifras de cada `BigDecimal`, sin contar signo ni separador y sin expandir
exponentes a cadenas extensas. El DTO mantiene las validaciones de tipo, rango
y precisión que ya utiliza el servicio. No se cambia el esquema de base de datos.

## Implementación

`GET /api/core/ubigeos` devuelve las filas con `codigo`, `departamento`, `provincia`
y `distrito`. Requiere autenticación y uno de los permisos `projects.view`,
`projects.create` o `projects.edit`. El código UBIGEO es texto de seis dígitos.
El navegador carga y reutiliza el catálogo; los filtros se calculan localmente.
Una carga fallida bloquea el envío y permite reintentar sin cerrar el formulario.

`UbigeoService` carga el recurso del servidor al iniciar y construye un índice
inmutable de ubicaciones. `ValidacionProyectoService` aplica las reglas de país,
jerarquía y fechas antes de que `ProyectoService` guarde una creación o edición.
Una petición manipulada recibe HTTP 400. La deserialización de `LocalDate` rechaza
fechas inexistentes antes de invocar el servicio.

La API de proyectos mantiene sus campos y almacena nombres oficiales en las
columnas existentes. No se modifica el esquema ni se necesita ejecutar SQL.
Se conserva el país por defecto para clientes que omitan ese atributo.

## Procedencia del catálogo

- Organismo: Instituto Nacional de Estadística e Informática del Perú, INEI.
- Servicio: [Sistema de consulta de códigos estandarizados](https://www.gob.pe/15028-consultar-codigos-estandarizados-del-inei).
- Consulta: 22 de octubre de 2026; versión solicitada 2026, categoría `9-1`.
- Fuente directa: [consulta nacional por ubicación geográfica](https://webapp.inei.gob.pe:8443/sisconcode/ubigeo/listaBusquedaUbigeoPorUbicacionGeografica.htm?versionCategoriaPK=9-1&nivel=1&strVersion=2026&strDpto=TODOS&strProv=TODOS&strDist=TODOS&flagDpto=&flagProv=&flagDist=).
- Resultado: 25 ámbitos departamentales, 196 provincias y 1893 distritos.
- Recurso versionado: `services/core-service/src/main/resources/catalogos/ubigeo-peru.tsv`.
- Codificación: UTF-8; separador tabulación; una fila por distrito.
- SHA-256 de la respuesta HTML original: `422573a63db17fc077ee5c1c0e9f9a6d6b6d3481f66b81e6400511359b882ebb`.

El catálogo está incluido en el servicio; registrar proyectos no requiere
conectarse al INEI. Para actualizarlo se debe consultar nuevamente la fuente,
conservar los códigos y comprobar unicidad, relaciones y cobertura con las pruebas.

## Validación reproducible

En `apps/backoffice`:

```sh
npm ci
npm run test:projects
npm run build
```

En `services/core-service`, con JDK 21 y Maven:

```sh
mvn test
```

Las pruebas cubren todas las filas del catálogo, jerarquías mezcladas,
normalización de datos anteriores, país fijo, ubicaciones incompletas, años
límite, días inexistentes, bisiestos, fechas iguales y el bloqueo de persistencia
en altas y ediciones inválidas. Mockito utiliza dobles por subclase para estas
clases e interfaces, sin requerir adjuntar un agente a la JVM.

La comprobación global `npx tsc --noEmit` conserva los 57 diagnósticos que ya
presenta la base `3f4a8ac`; la comparación antes y después no añade diagnósticos.
El build de Vite y el lint de los archivos de este cambio se comprueban por separado.

La validación en Chromium ejercita los controles reales del modal con respuestas
de API simuladas: creación, edición, error de red y reintento, límites de fechas,
envío de nombres oficiales y anchuras de 320, 375, 768 y 1280 píxeles. Las pruebas
del servidor no requieren conexión a una base de datos.

## Activación en Docker

Desde la raíz del repositorio:

```sh
docker compose up -d --build core-service backoffice
```

Es necesario reconstruir `core-service` para incorporar el endpoint y el recurso
UBIGEO. Los archivos de configuración privada existentes se mantienen fuera del cambio.
