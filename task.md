# Goal: Reestructuración y Conexión de PaginaWeb (Frontend + Backend + Supabase)

## Subtareas
- [x] 1. Reestructurar directorios en `PaginaWeb/`:
  - Mover `frontend/` a `PaginaWeb/frontend/`
  - Mover `cms-service/` a `PaginaWeb/backend/`
  - Crear `PaginaWeb/README.md` con arquitectura y guía de uso
- [x] 2. Configurar y validar scripts, Docker y variables de entorno:
  - Actualizar `.gitignore`, `docker-compose.yml` y variables `.env`
  - Crear Dockerfile para `PaginaWeb/backend` y `PaginaWeb/frontend`
- [x] 3. Validar y alinear esquema Supabase para la Web Pública y CMS:
  - Verificar tablas `pagina`, `seccion`, `consulta_web`, `proyecto` y `estado`
  - Asegurar coherencia entre entidades JPA y PostgreSQL
- [x] 4. Desarrollar y robustecer endpoints en `PaginaWeb/backend`:
  - Recepción de consultas web/leads (`POST /api/public/consultas`)
  - Listado público de proyectos para la web (`GET /api/public/proyectos`)
  - Validaciones y manejo de excepciones
- [x] 5. Conectar `PaginaWeb/frontend` con el backend:
  - Capa de servicios API HTTP conectada a `PaginaWeb/backend`
  - Enlazar formulario de contacto (`LeadForm.tsx` y `Contact.tsx`) para registrar consultas reales
  - Enlazar páginas dinámicas y catálogo
- [x] 6. Validación integral de compilación y pruebas:
  - Compilación TypeScript de `PaginaWeb/frontend`
  - Build y tests Maven de `PaginaWeb/backend` en contenedor Docker oficial
