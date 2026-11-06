# Gestión de contenido web — estado de integración (2026-11-05)

**Rama de trabajo:** `feature/cms-gestion-contenido-integracion`. No fusionar todavía con `main`.

## Avances verificados
- Los borradores #11 (slides 1,3) y #12 (slides 1,2) se seleccionan, navegan y previsualizan en Backoffice según capturas del responsable; Docker y Vite compilaron en su PC.
- Pruebas de copia local: Backoffice **58/58**, carrusel público **27/27**, comprobador HTTP simulado **3/3**.
- Migración Supabase `cms_lectura_publica_rls_20261105` aplicada y verificada bajo `anon` y `authenticated`: solamente `HERO_PRINCIPAL` aparece antes de publicar los otros dos slides.
- El rol `sigi_cms_user` cuenta con permisos específicos por columna y secuencias de CMS para la publicación.
- El carrusel lee exclusivamente GET de contenido publicado; los subtítulos/fondos editables no reemplazan títulos ni descripciones comerciales oficiales.

**Pendiente:** smoke real de API, prueba de publicación con JWT y `revisionBase`, QA de Storage con compensación y compilación posterior de ambos frontends. Las pruebas Java PostgreSQL opt-in no fueron ejecutadas aquí.

## Smoke GET público
```powershell
node scripts/cms-public-smoke.mjs http://localhost:8082 --expect-hidden-promos
node --test scripts/tests/cms-public-smoke.test.mjs
```
Después de publicar un slide promocional, repetir el primer comando **sin** `--expect-hidden-promos`. Nunca realiza POST/PUT/PATCH/DELETE ni necesita JWT.

## Primera publicación controlada
1. Crear borrador **nuevo solo de slide 2**. No publicar los #11 ni #12: incluyen cambios en slide 1.
2. Confirmar el efecto del guardado en borrador, previsualización y que no se modifica la web pública.
3. Validar que el usuario sin `web_content.publish` es rechazado por el backend.
4. Activar temporalmente solo `VITE_CMS_PUBLICACION_TEXTOS_HABILITADA=true` en Backoffice QA y recompilar. Publicar con un rol autorizado, comprobando `revisionNueva`, historial y el endpoint público.
5. En una prueba separada, cargar JPEG/PNG/WebP al bucket privado, recuperar, validar hash y confirmar compensación ante error antes de habilitar `CMS_PUBLICACION_IMAGENES_HABILITADA=true` en backend y `VITE_CMS_PUBLICACION_IMAGENES_HABILITADA=true` en Backoffice.
6. Si hay error o timeout en publicación, consultar historial/revisión antes de reintentar.

## Variables para el despliegue posterior (responsable de Vercel)
Página pública: `VITE_API_URL=https://<backend-cms>` (sin sufijo `/api`), `VITE_CMS_HERO_PUBLICADO_ENABLED=true` y `VITE_CMS_HERO_PROMO_SLIDES_ENABLED=true`. Activar solo cuando API y publicación estén validadas.
Backoffice: `VITE_CMS_API_URL=https://<backend-cms>/api` y los dos flags de publicación, inicialmente `false`.
Nunca configurar claves privadas `sb_secret_`, `service_role` o JWT en variables `VITE_*`.

## Gate para merge en main
Primero conciliar cambios locales con esta rama, ejecutar builds Vite, Maven y PostgreSQL IT aislada, comprobar publicación y GET públicos, revisar diff contra `main` y solo después abrir PR de integración. No ejecutar despliegues ni publicación real sin verificación del entorno.

## Confirmación: primera publicación de textos

- 2026-11-06 04:44 UTC: Borrador **#13** publicado exitosamente por Backoffice autenticado.
- Sección única actualizada: `HERO_SLIDE_2_PROMO` (id 2); subtítulo `Descubre nuestros proyectos inmobiliarios`.
- Revisión pública INICIO: **0 → 1**; historial **#1**; borrador pasó a **PUBLICADO**.
- Supabase verificado en solo lectura: slide 1 sin cambios, slide 2 visible, slide 3 aún oculto.
- Prueba HTTP ejecutada desde Windows/Docker por el usuario: `node scripts/cms-public-smoke.mjs http://localhost:8082` → `PASS: INICIO (2 secciones), proyectos (2)` y `PASS: solo endpoints GET públicos; sin token, sin borradores ni escritura`.
- El fallo previo `permission denied for table cms_paginas` se corrigió con la migración `cms_permiso_bloqueo_publicacion_20261106`, versionada en `database/migrations/44_cms_permiso_bloqueo_publicacion.sql`. El rol `sigi_cms_user` solo recibió permiso UPDATE sobre `fecha_actualizacion` con política limitada a página INICIO.
- Pendiente comprobar la presentación visual del carrusel React con ambos flags de lectura CMS habilitados en Docker QA; aún **no** está validada la publicación de imágenes.
