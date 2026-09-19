# SGI-Monolithe — Sistema de Gestión Inmobiliaria

Proyecto integral de gestión inmobiliaria compuesto por backend en Spring Boot, frontends en React + Vite y base de datos relacional alojada en **Supabase** (PostgreSQL).

---

## Arquitectura del Proyecto

```
SGI-Monolithe/
├── docker-compose.yml             # Orquestador Docker Compose para todo el equipo
├── .env.example                   # Plantilla de variables de entorno compartidas
├── auth-service/                  # Backend Java 21 + Spring Boot 4 (Auth, JWT, JPA)
│   ├── Dockerfile                 # Imagen multi-stage (Temurin 21)
│   └── keys/                      # Claves RSA para firma de tokens JWT
├── apps/
│   ├── admin-dashboard/           # Panel Administrativo (React + Vite + Tailwind)
│   └── portal-cliente/            # Portal de Clientes (React + Vite + Tailwind)
└── Database/
    ├── Supabase_Script_Tablas.sql # DDL de tablas e índices para Supabase (102 tablas, 146 índices)
    ├── Supabase_Inserts.sql       # Datos semilla iniciales (roles, permisos, estados)
    └── Script - Tablas.sql        # Script relacional original MySQL
```

---

## Requisitos Previos

- [Docker Desktop](https://www.docker.com/) (o Docker Engine + Docker Compose v2+)
- [Git](https://git-scm.com/)

---

## Guía Rápida para el Equipo

### 1. Clonar el repositorio
```bash
git clone https://github.com/Adrianny16/SGI-Monolithe.git
cd SGI-Monolithe
```

### 2. Configurar Variables de Entorno
Copia el archivo `.env.example` a `.env`:
```bash
cp .env.example .env
```
*(Las credenciales de Supabase ya vienen preconfiguradas con el proyecto activo de desarrollo).*

### 3. Levantar Todo con Docker Compose
```bash
docker compose up --build
```

---

## Servicios Disponibles

| Servicio | URL Local | Descripción |
|---|---|---|
| **Portal Cliente** | [http://localhost:5173](http://localhost:5173) | Vista para clientes: inicio de sesión, lotes, cronogramas y pagos. |
| **Admin Dashboard** | [http://localhost:5174](http://localhost:5174) | Panel administrativo: CRM, ventas, proyectos, usuarios y finanzas. |
| **Backend Auth** | [http://localhost:8081](http://localhost:8081) | API REST Spring Boot: `/api/auth/login`, `/api/auth/refresh`, auditoría. |

---

## Base de Datos (Supabase)

La base de datos está centralizada en Supabase (PostgreSQL). Todos los servicios leen y escriben sobre las mismas tablas estandarizadas:
- `usuario`, `rol`, `permiso`, `asignacion_rol`, `sesion`
- `proyecto`, `etapa`, `manzana`, `lote`, `tarifa`
- `cliente`, `prospecto`, `venta`, `pago`, `cuota`
