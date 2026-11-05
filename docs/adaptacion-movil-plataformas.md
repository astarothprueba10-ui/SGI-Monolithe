# Adaptación móvil de las plataformas

## Alcance

Preparado sobre `main`, commit `a59c46069c3058e6842bd76901de6b326ffd9480`.

| Plataforma | Cambios de presentación |
| --- | --- |
| Backoffice | Navegación, filtros, pestañas, paginación, tablas, formularios, ventanas y avisos. |
| Página pública y CMS | Botones, acceso y bienvenida, navegación móvil y formularios del CMS. |
| Portal del cliente | Navegación, tarjetas, plano, notificaciones, perfil y confirmaciones. |

Las tablas y los planos conservan un contenedor con desplazamiento horizontal cuando sus datos necesitan más ancho. El resto de la página se ajusta al dispositivo. Los campos de texto mantienen un tamaño legible en pantallas táctiles.

## Ventanas y navegación

Los diálogos usan la API nativa del navegador. El fondo queda inactivo mientras están abiertos. Los formularios largos se desplazan dentro de la ventana y conservan visibles las acciones del pie.

La altura sigue el área visible del navegador y los cambios de orientación. Los diálogos anidados restauran el desplazamiento al cerrar el último. Los avisos de Backoffice se mantienen sobre el diálogo activo y conservan su estado al cerrarlo.

Los menús móviles se cierran al navegar, pulsar Escape, tocar el fondo o pasar al diseño de escritorio.

## Validación reproducible

La suite de `tests/responsive` recorre 51 rutas con anchos de 320, 390, 640, 768, 1024 y 1365 píxeles. También abre formularios y confirmaciones, verifica la posición de los paneles y comprueba el cierre de menús y la restauración del foco. Los formularios largos se comprueban además en 667 × 320 y en 390 × 360.

Las APIs y las identidades de usuario se simulan. Los datos de trabajadores y proyectos son ficticios. La suite bloquea las solicitudes externas; comprueba presentación e interacción, y debe complementarse con la aceptación del equipo sobre los servicios de su entorno.

Se necesitan Node.js 20 o superior y las dependencias de las tres aplicaciones:

```powershell
npm --prefix apps/backoffice ci
npm --prefix apps/pagina-web ci
npm --prefix apps/portal-cliente ci
npm --prefix tests/responsive ci
npm --prefix tests/responsive run install:browser
npm --prefix tests/responsive test
```

Para compilar las tres aplicaciones:

```powershell
npm --prefix apps/backoffice run build
npm --prefix apps/pagina-web run build
npm --prefix apps/portal-cliente run build
```

Las pruebas existentes de trabajadores y proyectos se ejecutan con:

```powershell
npm --prefix apps/backoffice run test:workers
npm --prefix apps/backoffice run test:projects
```

## Resultado de la revisión del 4 de noviembre de 2026

- 306 visitas a rutas: 51 rutas en seis anchos, sin desbordamiento de la página ni errores de ejecución de JavaScript en los recorridos.
- 111 casos de navegador aprobados; nueve verificaciones de menú móvil omitidas cuando la navegación de escritorio ya está visible.
- 86 pruebas existentes aprobadas: 24 de trabajadores, 19 de proyectos, cuatro de usuarios y 39 de sesión.
- Compilación de producción correcta en las tres aplicaciones y `git diff --check` sin incidencias.

## Aceptación en un dispositivo

Revisar el alta y la edición de trabajadores, un proyecto, CRM, las tablas de ventas y financiamiento, el contenido del CMS y el portal. En cada caso, abrir el menú, recorrer los campos, desplazarse por las tablas y girar el teléfono con una ventana abierta.

Las comprobaciones automatizadas se realizan en Chromium. El equipo debe completar la aceptación en teléfonos físicos y en Safari de iOS.

## Instalación con Docker Compose

Después de aplicar el parche y revisar `git diff --check`, reconstruir los tres frontends desde la raíz del repositorio:

```powershell
docker compose up -d --build backoffice pagina-web-frontend portal-cliente
```

Recargar las páginas para obtener los estilos nuevos. La adaptación no requiere migraciones de base de datos.
