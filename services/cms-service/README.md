# PaginaWeb (Web Pública y Panel CMS - SGI Monolithe)

Módulo monorepo para la presencia digital comercial y gestión de contenidos del Sistema de Gestión Inmobiliaria (SGI Monolithe).

## Estructura del Módulo

```
PaginaWeb/
├── backend/               # Microservicio Spring Boot (Java 21) para CMS y APIs públicas (puerto 8082)
│   ├── src/main/java/     # Controladores, Entidades JPA, Repositorios y Servicios
│   ├── src/main/resources/# application.properties (Conexión Supabase PostgreSQL)
│   ├── Dockerfile         # Imagen multi-stage (Maven 3.9 + Temurin JRE 21 Alpine)
│   └── pom.xml            # Dependencias Maven (Spring Web, Security OAuth2 JWT, JPA, Postgres)
├── frontend/              # Aplicación Web React + Vite + TailwindCSS + TypeScript (puerto 5175)
│   ├── src/pages/         # Web pública (Home, Proyectos, Contacto, Nosotros, Beneficios)
│   ├── src/pages/cms/     # Panel de administración CMS (Editor, Publicaciones, Media)
│   ├── src/components/    # Componentes reutilizables, formularios de contacto y UI
│   ├── src/services/api.ts# Cliente HTTP tipado conectado al backend y Supabase
│   ├── Dockerfile         # Imagen optimizada Node 22 Slim
│   └── package.json       # Scripts de Vite y dependencias frontend
└── README.md              # Documentación técnica del módulo
```

---

## 1. Conexión con Base de Datos (Supabase PostgreSQL)

El backend se conecta directamente a la base de datos Supabase mediante PostgreSQL Session Pooler (puerto 5432) utilizando JDBC.

### Tablas utilizadas en Supabase
- **`cms_consultas_web`**: Registro de leads y mensajes enviados desde el formulario de contacto de la web pública (con código de seguimiento `CW-yyyyMMdd-XXXX`).
- **`inm_proyectos`**: Catálogo de proyectos inmobiliarios visibles para compradores.
- **`cms_paginas`**: Almacena las páginas del portal (Home, Nosotros, Contacto, Proyectos, etc.) con sus metadatos SEO y estado de publicación.
- **`cms_secciones`**: Contenido modular de cada página (carruseles, bloques de texto, banners, configuración JSONB).
- **`cfg_estados_consulta_web`**: Catálogo fuertemente tipado de estados de consulta (`NUEVA`, `EN_ATENCION`, `CONVERTIDA`, `DESCARTADA`, `CERRADA`).
- **`cfg_estados_publicacion`**: Catálogo de estados de páginas (`BORRADOR`, `PUBLICADO`, `ARCHIVADO`).
- **`cfg_estados_proyecto`**: Catálogo de estados de proyectos (`PLANIFICACION`, `PREVENTA`, `ACTIVO`, `FINALIZADO`, `SUSPENDIDO`).

---

## 2. API Backend (`PaginaWeb/backend`)

### Endpoints Públicos
- `GET /api/public/proyectos`: Lista los proyectos inmobiliarios disponibles para el catálogo público.
- `GET /api/public/proyectos/{id}`: Obtiene el detalle de un proyecto por ID.
- `GET /api/public/proyectos/codigo/{codigo}`: Obtiene el detalle de un proyecto por código comercial.
- `POST /api/public/consultas`: Registra un nuevo lead o consulta web desde el formulario de contacto.
- `GET /api/public/paginas`: Lista todas las páginas públicas activas.
- `GET /api/public/paginas/codigo/{codigo}`: Obtiene el detalle y contenido de una página por su código.

### Endpoints CMS (Protegidos con JWT emitido por `auth-service`)
- `GET /api/cms/paginas`: Lista todas las páginas (incluyendo borradores).
- `POST /api/cms/paginas`: Crea o actualiza una página web.

---

## 3. Guía de Ejecución

### Mediante Docker Compose (Recomendado)
Desde la raíz del repositorio:
```bash
# Levantar el backend de la página web
docker compose up -d --build pagina-web-backend

# Verificar logs y estado de salud
docker compose logs -f pagina-web-backend
curl http://localhost:8082/actuator/health
```

### Probar Envío de Consulta (Lead)
```bash
curl -X POST http://localhost:8082/api/public/consultas \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Carlos Mendoza",
    "correo": "carlos@ejemplo.com",
    "telefono": "+51999888777",
    "asunto": "Interes en Lotes",
    "mensaje": "Deseo recibir cotización del proyecto.",
    "aceptaPrivacidad": true
  }'
```
