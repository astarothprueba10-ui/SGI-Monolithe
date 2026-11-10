# Navegación, tablas y contadores de cartera

## Ubicación actual

Backoffice muestra el módulo, el registro abierto y la pestaña activa. En el
detalle de proyectos se incluye el nombre real del proyecto. Los niveles
anteriores son enlaces; el último segmento usa aria-current="page". Las
etiquetas se aíslan por ruta para no conservar nombres de la pantalla anterior.

Tabs publica la sección seleccionada para todos los módulos que utilizan el
componente compartido: proyectos, CRM, trabajadores, usuarios, ventas y demás
pantallas con pestañas. La ubicación se mantiene en la cabecera de escritorio
y tiene una fila propia en móvil. Las pestañas admiten flechas, Inicio y Fin;
la seleccionada se hace visible mediante desplazamiento horizontal local.
Se elimina el margen negativo que generaba desbordamiento vertical en la barra.

## Tablas legibles

El componente Table calcula un ancho mínimo según sus columnas. La tabla se
desplaza dentro de su contenedor, sin ensanchar la página, y muestra una ayuda
cuando existen columnas fuera del área visible. Se conserva la semántica de
table, th y td y el acceso al contenedor mediante teclado.

Las tres aplicaciones dejan de heredar overflow-wrap:anywhere dentro de las
tablas. Los saltos entre palabras permanecen disponibles. En el CRM, nombres,
contactos y asesores tienen espacio mínimo y los correos y etiquetas de origen
se conservan completos en su línea. Cuando falta espacio, se pueden alcanzar
las columnas restantes desplazando la tabla. En escritorio se amplía el área
máxima del contenido a 1536 píxeles para aprovechar mejor la pantalla.

Los estilos están incluidos en cada aplicación para conservar los contextos
independientes de sus imágenes Docker. El portal mantiene su tabla de cuotas
en PC y las tarjetas existentes en móvil.

## Contadores del CRM

Las pestañas ya no toman sus cifras de resumenPeriodo: ese endpoint corresponde
al resumen comercial del período global, mientras las tablas tienen filtros
independientes y pueden mostrar todo el historial.

Leads y potenciales consultan el total del mismo endpoint y filtros de sus
tablas: búsqueda, etapa, origen, asesor, cartera sin asignar, proyecto y fechas
propias. Compradores utiliza su búsqueda y endpoint. Se consulta una fila por
categoría, pero se muestra total del servidor, nunca items.length de la página.
Los ceros confirmados se conservan. Mientras se consulta aparece una indicación
de carga; un fallo no se presenta como cero y no invalida otras categorías.

Los conteos se actualizan después de recargar el listado y se descartan las
respuestas anteriores al cambiar filtros. También se descartan listados
obsoletos. Se separan los efectos de cada listado y se elimina la dependencia
del número de filas que provocaba una segunda carga y parpadeo al abrir CRM.
El período global conserva su significado en tarjetas, gráfico y fuentes.

## Comprobación

Se incluyen pruebas unitarias de navegación y consultas de conteo, y pruebas de
navegador para detalle de proyecto, pestañas de otros módulos, cuatro leads con
resumen global cero, filtros, paginación, fallos, respuestas fuera de orden,
tablas de trabajadores y presentación del cronograma del portal. Los anchos
son 320, 390, 640, 768, 1024, 1365 y 1920 píxeles. Las APIs se simulan; no se
modifican datos reales ni se necesitan cambios SQL o variables de entorno.

La validación global TypeScript mantiene los ocho diagnósticos anteriores de
la base 06e8fce. La comparación contra esa base no añade errores. El resumen de
ejecuciones y las huellas de los archivos se entregan en validacion.json.

```powershell
npm --prefix apps/backoffice run test:navigation
npm --prefix apps/backoffice run build
npm --prefix apps/pagina-web run build
npm --prefix apps/portal-cliente run build
```
