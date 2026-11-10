# Teléfono internacional en el registro de leads

## Comportamiento

En CRM y clientes, el formulario Registrar nuevo lead abre con Perú (+51). El
selector permite buscar por nombre del país, código ISO o prefijo telefónico,
incluidas búsquedas sin tildes. El número se escribe por separado, sin prefijo.

El campo acepta únicamente dígitos y adapta su longitud máxima al país. Perú
requiere exactamente nueve dígitos y comenzar por 9. Los demás países utilizan
sus longitudes y prefijos móviles reconocidos; no se aplica una longitud global
arbitraria. Algunos países admiten más de una longitud.

La búsqueda funciona con ratón, pantalla táctil y teclado. Flechas y Enter
seleccionan un resultado; Escape cierra la búsqueda sin cerrar el formulario.
La lista se despliega dentro del contenido desplazable del modal para evitar
recortes en pantallas pequeñas. Cambiar de país limpia el número; volver a
seleccionar el mismo país conserva el valor. Al reabrir el formulario se
restablecen Perú y el teléfono vacío.

El pegado admite números con espacios, guiones, paréntesis o prefijo completo.
Un número internacional debe corresponder al país seleccionado. Los números
demasiado largos no se recortan silenciosamente. Un pegado rechazado bloquea
el guardado hasta corregirlo, aunque hubiera un número válido antes del pegado.

## Reglas y almacenamiento

Se utiliza libphonenumber-js 1.13.15 con metadatos móviles en el cliente y
Google libphonenumber 9.0.43 en core-service. La validación es local y no
necesita una API de pago, token o conexión a un proveedor telefónico.

El catálogo contiene 245 países y territorios; 244 tienen reglas móviles
disponibles. Tristán de Acuña (TA) no tiene un plan móvil en estos metadatos:
el formulario muestra la limitación y no permite guardar un celular sin regla.
Los países que comparten prefijo se validan con el patrón móvil del país
seleccionado, sin asumir que el prefijo identifica un único territorio.

El contrato RegistrarProspectoRequest conserva su estructura. Perú se envía
como nueve dígitos nacionales, igual que antes, para conservar la coincidencia
de contactos existentes. Otros países se envían como +prefijo y número nacional
(E.164). El servidor acepta también Perú con +51 y verifica longitud, prefijos
y tipo móvil antes de llamar al repositorio. No modifica el número recibido.
Los planes que no distinguen fijo de móvil, como el norteamericano, se aceptan
como FIXED_LINE_OR_MOBILE. La validación no confirma la titularidad, existencia
de una línea activa ni la disponibilidad de WhatsApp.

No hay cambios de base de datos ni variables de entorno nuevas. Se conserva
la consulta por documento y el autocompletado de identidad de la entrega anterior.

## Validación ejecutada

- Diez pruebas unitarias del cliente: reglas, búsqueda, pegado, serialización,
  territorios con prefijo compartido y los 244 ejemplos móviles del catálogo.
- 304 pruebas JUnit: validación telefónica, DTO, servicio de captación y regresión
  de la consulta de identidad. Incluyen los mismos 244 ejemplos móviles.
- 48 pruebas de navegador del teléfono: ocho escenarios en anchos de 320, 390,
  640, 768, 1024 y 1365 píxeles.
- Veinte pruebas de regresión del autocompletado por documento en móvil y
  escritorio, además de sus seis pruebas unitarias del cliente.
- Compilación de producción de Backoffice con Vite.
- Comprobación TypeScript estricta de los archivos nuevos sin errores. La
  comprobación global conserva los ocho diagnósticos anteriores, verificados
  contra la versión previa a este cambio; no se incorporan diagnósticos nuevos.

El entorno de comprobación dispone de Java 17. Las pruebas Maven compilan los
fuentes principales y de prueba con java.version=17 y maven.compiler.release=17,
sin modificar la versión Java 21 declarada en el proyecto. La compilación con
Java 21 debe verificarse al reconstruir el contenedor del proyecto. Las pruebas
de navegador simulan respuestas de API; no registran leads reales.

Los ejemplos telefónicos son datos de la biblioteca, no contactos reales.
Las reglas de numeración pueden cambiar: futuras actualizaciones deben
coordinar ambas dependencias y volver a ejecutar las pruebas compartidas.

## Aplicación

Este parche es incremental sobre la entrega CRM de documento y autocompletado.
Primero debe estar aplicada esa entrega. Aplicar con git apply --check y luego
git apply, siguiendo LEEME.md del ZIP. Actualizar ambos contenedores:

```powershell
docker compose up -d --build backoffice core-service
```

Para ejecutar las pruebas del cliente localmente después de npm ci:

```powershell
npm --prefix apps/backoffice run test:lead-phone
npm --prefix apps/backoffice run test:lead-identity
npm --prefix apps/backoffice run build
```
