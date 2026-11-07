# Validaciones de Nuevo proyecto

Base: `main`, commit `4873114053433bafab92c57e1795b01b322c6903`.

## Reglas del alta

- Descripción obligatoria: mínimo 15 letras Unicode. Se admiten tildes y ñ;
  espacios, signos y números se pueden escribir, pero no cuentan como letras.
- La descripción muestra el número de letras y un mensaje cuando no cumple.
- Inicio: hoy en `America/Lima` o un día posterior.
- Fin estimado: igual o posterior al inicio; cuando aún no hay inicio, desde hoy.
- Las fechas conservan su carácter opcional. Si se ingresan, deben cumplir
  las reglas y representar días reales, con años entre 0001 y 9999.
- El calendario limita la selección y el envío vuelve a comprobar los valores,
  incluidos valores escritos o pegados y el cambio de día en Perú.
- El servidor comprueba las nuevas reglas antes de crear el proyecto. La regla
  existente de orden entre inicio y fin continúa aplicándose en ambos modos.

## Compatibilidad

Las nuevas restricciones se aplican a crear proyectos. La edición conserva
las descripciones opcionales y las fechas históricas de registros existentes.
No cambia el contrato de la API ni requiere ejecutar SQL.
El contenedor mantiene una cuadrícula propia y recrea los controles al cambiar
su estado habilitado. Esto evita que el editor nativo de la descripción quede
bloqueado después de cargar los catálogos o de un rechazo del servidor, sin
perder los valores controlados del formulario.

## Comprobaciones

```powershell
cd C:\Monolithe\SGI-Monolithe
npm --prefix apps/backoffice ci
npm --prefix apps/backoffice run test:projects
npx --prefix apps/backoffice tsc --project apps/backoffice/tsconfig.json --noEmit
npm --prefix apps/backoffice run build
```

Pruebas del navegador con respuestas e identidades simuladas:

```powershell
npm --prefix tests/responsive ci
npm --prefix tests/responsive run install:browser
npm --prefix tests/responsive test -- --config=projectCreation.config.ts
```

Pruebas del servidor con Maven y JDK 21:

```powershell
mvn -f services/core-service/pom.xml "-Dtest=ValidacionAltaProyectoTest,ProyectoServiceValidationTest,ValidacionProyectoServiceTest,ValidacionNumerosProyectoTest,ProyectoDateParsingTest" test
```

El entorno de preparación solo dispone de Java 17. Se compilaron las clases
reales de la nueva política y su excepción y pasaron 16 comprobaciones directas.
La ejecución de Maven quedó bloqueada por la descarga del POM de Spring Boot;
la suite JUnit del servicio y la compilación completa con Java 21 quedan
pendientes de ejecutar en el entorno del proyecto.

## Actualizar los contenedores

Después de aplicar el parche desde la raíz del repositorio:

```powershell
docker compose up -d --build backoffice core-service
```

Probar descripción vacía, 14 y 15 letras; inicio ayer, hoy y mañana;
fin anterior, igual y posterior al inicio. Comprobar también la edición
de un proyecto anterior. La reconstrucción debe terminar sin errores antes
de validar el formulario en la aplicación.
