# Goal: Reestructuración y Conexión de PaginaWeb (Frontend + Backend + Supabase)

## Subtareas
- [x] 1. Reestructurar directorios en `PaginaWeb/`:
  - Mover `frontend/` a `PaginaWeb/frontend/`
  - Mover `cms-service/` a `PaginaWeb/backend/`
  - Crear `PaginaWeb/README.md` con arquitectura y guía de uso
- [x] 2. Configurar y validar scripts, Docker y variables de entorno:
  - Centralizar y proteger credenciales en `.secret/supabase.env` con permisos 600
  - Actualizar `docker-compose.yml` con `env_file: .secret/supabase.env`
  - Crear Dockerfiles para `PaginaWeb/backend` y `PaginaWeb/frontend`
- [x] 3. Validar y alinear esquema Supabase para la Web Pública y CMS:
  - Validar tablas `cms_consultas_web`, `inm_proyectos`, `cms_paginas`, `cms_secciones` y `cfg_estados_*`
  - Integrar soporte dual de backend: Supabase BaaS directo (@supabase/supabase-js) + Spring Boot API
- [x] 4. Desarrollar y robustecer endpoints en `PaginaWeb/backend`:
  - Recepción de consultas web/leads (`POST /api/public/consultas`)
  - Listado público de proyectos para la web (`GET /api/public/proyectos`)
  - Validación Hibernate `ddl-auto=validate` contra Supabase PostgreSQL 17 exitosa
- [x] 5. Conectar `PaginaWeb/frontend` (Vite + React 18 + TS):
  - Configurar `vite.config.ts` para carga segura desde `.secret/`
  - Implementar cliente oficial Supabase en `PaginaWeb/frontend/src/lib/supabase.ts`
  - Conectar formularios y catálogo en `Projects.tsx` con fallback inteligente
- [x] 6. Suite de verificación automatizada:
  - Creado script ejecutable `scripts/probar_pagina_web.sh`
  - Ejecución integral y prueba de persistencia en vivo con resultado 100% exitoso
