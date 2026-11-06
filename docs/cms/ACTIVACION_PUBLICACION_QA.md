# CMS — habilitación controlada de la publicación (QA y despliegue manual)

Este documento corresponde a la issue de gestión administrable de contenido visual de la página pública. **Desde el ajuste para pruebas de publicación, el botón de textos está habilitado por defecto en `main`; imágenes y visibilidad de proyectos permanecen desactivadas.** El backend conserva la verificación de permisos, revisiones y contenido. No pulsar «Confirmar publicación» contra una base compartida sin autorización específica.

## Condiciones previas verificadas el 06-11-2026
- Migrations `cms_lectura_publica_rls_20261105` (43) y `cms_permiso_bloqueo_publicacion_20261106` (44) registradas en la base de datos compartida. No repetirlas.
- Políticas de lectura de `cms_paginas`, `cms_secciones` y `cms_seccion_items` con `cms43_*` **RESTRICTIVE**; las políticas permisivas anteriores no eluden estas restricciones.
- Storage incluye `cms-drafts-private` (privado) y `cms-public` (público).
- Pruebas: 943 automáticas en la integración base y GitHub Actions exitoso en rama de integración. Las 13 pruebas PostgreSQL opt-in **no se repitieron en el merge final**.
- Estos controles **no garantizan** la configuración del backend desplegado: validar usuario de BD, JWT, CORS y Storage con QA antes de permitir publicación real.

## Flags soportados por docker-compose.yml

Configurar en el `.env` **privado** del servidor, nunca en Git.

| Función | Variables que deben ser `true` |
|---|---|
| Publicar textos desde Backoffice | `VITE_CMS_PUBLICACION_TEXTOS_HABILITADA` (por defecto `true` en `main`; usar `false` para deshabilitar) |
| Publicar textos e imágenes | `VITE_CMS_PUBLICACION_IMAGENES_HABILITADA` y `CMS_PUBLICACION_IMAGENES_HABILITADA` |
| Mostrar contenido CMS en portada pública | `VITE_CMS_HERO_PUBLICADO_ENABLED` |
| Mostrar subtítulos/fondos CMS en slides 2–3 | `VITE_CMS_HERO_PROMO_SLIDES_ENABLED` |
| Publicar visibilidad de proyectos | `VITE_CMS_PUBLICACION_VISIBILIDAD_HABILITADA` y `CMS_PUBLICACION_VISIBILIDAD_ENABLED` |

**Únicamente la publicación de textos está habilitada por defecto** en el Backoffice de `main`. Las imágenes y la visibilidad de proyectos siguen en **`false`**. `VITE_CMS_PUBLICACION_TEXTOS_HABILITADA=false` permite desactivar textos en el despliegue. Los flags del navegador **no sustituyen** los permisos ni las validaciones del backend.

### Aislamiento y claves
- En el backend CMS se deben configurar `CMS_DB_URL`, `CMS_DB_USERNAME` y `CMS_DB_PASSWORD` con la cuenta restringida `sigi_cms_user`; revisar antes de aceptar el fallback al usuario general Supabase.
- Para imágenes se requiere `SUPABASE_SECRET_KEY` **solo en el contenedor CMS** (compatible por ahora con `SUPABASE_SERVICE_ROLE_KEY`). No usar variables `VITE_*` ni mostrar esa clave al navegador.
- La cuenta de Marketing debe tener `web_content.view`, `web_content.edit` y, si publica, `web_content.publish`. Visibilidad requiere adicionalmente `web_content.projects_visibility`.
- La página web utiliza URLs públicas solo de contenido ya publicado; el navegador no debe poder recuperar imágenes privadas.

## Secuencia de aceptación — sin escribir en la base compartida por accidente

1. En un ambiente **QA aislado**, arrancar Auth, Core, CMS, Backoffice y página pública con las credenciales apropiadas.
2. Iniciar sesión con Marketing. Guardar una modificación de prueba; verificar que la web pública **no cambia**.
3. Abrir la vista previa, comprobar imágenes JPG/PNG/WebP válidas (máx. 5 MB), errores de archivo y validación.
4. Verificar que el despliegue Backoffice tenga textos habilitados (valor predeterminado `true`; una variable de entorno `false` los desactiva) y publicar un borrador de QA expresamente autorizado; revisar que la revisión aumente una vez y que otro usuario sin permiso obtenga 403.
5. Activar lectura pública controlada, reiniciar página pública, comprobar que visitantes ven únicamente la revisión publicada (no borradores).
6. Tras verificar Storage y pruebas PostgreSQL opt-in, habilitar los dos flags de publicación de imágenes, publicar una foto de QA y comprobar que el bucket privado nunca se exponga.
7. Finalmente habilitar ambos flags de visibilidad, revisar mostrar/ocultar proyecto de QA y su historial.
8. Si se encuentra un fallo, establecer `VITE_CMS_PUBLICACION_TEXTOS_HABILITADA=false` y mantener los demás flags en `false`; reconstruir o reiniciar los servicios afectados según el tipo de despliegue. No revertir datos publicados mediante SQL manual.

## Desarrollo local — habilitar exclusivamente publicación de textos
Si se utiliza una base **QA aislada** y el backend CMS está conectado a ella, en PowerShell y dentro de `apps/backoffice`:

```powershell
$env:VITE_CMS_PUBLICACION_TEXTOS_HABILITADA = "true"
$env:VITE_CMS_PUBLICACION_IMAGENES_HABILITADA = "false"
& ".\node_modules\.bin\vite.cmd" --host 127.0.0.1 --port 5190 --strictPort
```

Esta configuración solo afecta al proceso local. **Si el backend apunta a la base compartida, hacer clic en Publicar modificará contenido real; no usarlo como prueba sin autorización.**

## Despliegue
El workflow `.github/workflows/ci.yml` fue modificado: el job Oracle requiere `workflow_dispatch` en `main`. Un merge/push a `main` ejecuta las validaciones, pero **ya no inicia ese job de despliegue automáticamente**. La actualización del entorno sigue siendo una tarea manual del equipo de infraestructura.

## Criterio de cierre
No declarar publicación real 100% validada hasta completar las pruebas HTTP con JWT y rol correcto, una publicación de QA para cada modalidad, las 13 pruebas PostgreSQL opt-in después de integrar y revisión de permisos de Storage. El frontend puede estar terminado y fusionado con flags apagados mientras se prepara el despliegue.
