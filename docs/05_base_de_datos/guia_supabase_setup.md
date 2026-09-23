# Guía de Puesta en Marcha: Supabase para SIGI MONOLITHE

Esta guía detalla los pasos exactos para configurar la base de datos en Supabase y conectar los módulos frontend (`apps/admin-dashboard` y `apps/portal-cliente`).

---

## 1. Creación del Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com) e inicia sesión o regístrate.
2. Haz clic en **"New Project"**.
3. Completa los datos del proyecto:
   - **Name:** `SIGI-MONOLITHE` (o el nombre de tu inmobiliaria).
   - **Database Password:** Guarda una contraseña segura.
   - **Region:** Selecciona la más cercana (ej. `South America (São Paulo)` o `US East`).
   - **Pricing Plan:** Free tier.
4. Espera 1-2 minutos a que el proyecto termine de aprovisionarse.

---

## 2. Ejecución de Scripts SQL (En orden estricto)

En el panel lateral izquierdo de Supabase, ingresa a **SQL Editor** y ejecuta los siguientes scripts ubicados en `docs/05_base_de_datos/`:

### Paso 2.1: Crear Tablas y Estructura
- Abre el archivo [`01_supabase_schema.sql`](file:///home/jhonataningesis/Documentos/Proyectos/Inmobiliaria/docs/05_base_de_datos/01_supabase_schema.sql).
- Copia todo su contenido y pégalo en una nueva consulta del **SQL Editor**.
- Haz clic en **Run**. Se crearán las **102 tablas** con claves primarias generadas, foreign keys, tipos `JSONB`, `TIMESTAMPTZ` y funciones actualizadoras.

### Paso 2.2: Cargar Catálogos y Datos Iniciales (Seed)
- Abre el archivo [`02_supabase_seed.sql`](file:///home/jhonataningesis/Documentos/Proyectos/Inmobiliaria/docs/05_base_de_datos/02_supabase_seed.sql).
- Copia el contenido, pégalo en el **SQL Editor** y presiona **Run**.
- Se poblarán todos los catálogos (`cfg_*`), estados de lotes, tipos de documentos, monedas (PEN, USD), etc.

### Paso 2.3: Configurar Seguridad y RLS (Opcional para MVP, obligatorio para producción)
- Abre [`03_supabase_rls_y_auth.sql`](file:///home/jhonataningesis/Documentos/Proyectos/Inmobiliaria/docs/05_base_de_datos/03_supabase_rls_y_auth.sql).
- Pégalo y ejecútalo para habilitar Row Level Security en catálogos, proyectos y portal cliente.

---

## 3. Obtención de Credenciales de Conexión

En Supabase ve a **Project Settings (ícono de engranaje) -> API**:
1. Copia la **Project URL** (`https://xyzcompany.supabase.co`).
2. Copia la **anon key** (Public Key).

---

## 4. Conexión con las Aplicaciones Frontend

Crea un archivo `.env` en cada aplicación:

### En `apps/admin-dashboard/.env`:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

### En `apps/portal-cliente/.env`:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```
