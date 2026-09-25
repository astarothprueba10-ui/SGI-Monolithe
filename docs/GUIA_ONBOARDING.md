# GUIA DE ONBOARDING -- SGI-Monolithe

## Requisitos previos

| Herramienta   | Version minima | Verificar con             |
|---------------|----------------|---------------------------|
| Git           | 2.30+          | `git --version`           |
| Docker        | 24+            | `docker --version`        |
| Docker Compose| v2             | `docker compose version`  |
| Node.js       | 18+            | `node --version`          |
| OpenSSL       | 1.1+           | `openssl version`         |
| Java (JDK)    | 17+            | `java --version`          |

---

## Paso 1 -- Clonar el repositorio

```bash
git clone https://github.com/astarothprueba10-ui/SGI-Monolithe.git
cd SGI-Monolithe
git checkout main
```

---

## Paso 2 -- Configurar credenciales

> [!CAUTION]
> Este repositorio es PUBLICO. **Jamas** subas archivos `.env`, `.secret/`, ni claves `.pem` a Git.

### 2.1 Copiar la plantilla

```bash
cp .env.example .env
```

### 2.2 Completar con valores reales

El lider del equipo te enviara las credenciales por **canal privado** (WhatsApp/Discord/Telegram).
Recibiras algo como esto:

```
SUPABASE_PROJECT_REF=cjwnn...
SUPABASE_URL=https://cjwnn....supabase.co
SUPABASE_ANON_KEY=eyJhbG...
...
```

Abre el archivo `.env` con tu editor y reemplaza cada `<placeholder>` con el valor real correspondiente.

### 2.3 Verificar que .env esta ignorado por Git

```bash
git status
```

El archivo `.env` **NO debe aparecer** en la lista de cambios. Si aparece, algo esta mal con `.gitignore`.

---

## Paso 3 -- Arranque automatico

```bash
bash scripts/iniciar_local.sh
```

El script hace lo siguiente de forma automatica:
1. Valida que exista tu `.env` con credenciales
2. Crea la carpeta `.secret/keys/` con permisos restringidos (chmod 700)
3. Genera el par de llaves RSA (`jwt-private.pem` / `jwt-public.pem`) con chmod 600
4. Sincroniza las credenciales a `.secret/supabase.env` (para Docker Compose)
5. Levanta el backend Spring Boot via Docker
6. Inicia el servidor frontend Vite

---

## Paso 4 -- Verificar servicios

| Servicio                  | URL                          |
|---------------------------|------------------------------|
| Web Publica y CMS (Vite)  | http://localhost:5175         |
| Portal Cliente (Vite)     | http://localhost:5173         |
| Backoffice ERP/CRM (Vite) | http://localhost:5174         |
| Auth Service (Spring Boot)| http://localhost:8081         |
| Web Backend (Spring Boot) | http://localhost:8082         |
| Health Check              | http://localhost:8082/actuator/health |

---

## Reglas de seguridad (obligatorias)

1. **`.env`** y **`.secret/`** estan en `.gitignore`. Si Git te pide trackearlos, **detente y avisa**.
2. Las llaves RSA son unicas por maquina. Cada desarrollador genera las suyas localmente.
3. Las credenciales de Supabase son compartidas por el equipo, pero se distribuyen **solo por canal privado**.
4. Si necesitas rotar las claves RSA: borra `.secret/keys/` y vuelve a ejecutar el script.
5. Convenciones de commit: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`.

---

## Estructura de archivos sensibles

```
SGI-Monolithe/
  .env.example       <-- Plantilla SIN claves (versionada en Git)
  .env               <-- Claves REALES (ignorada por Git)
  .secret/
    supabase.env     <-- Copia de .env para Docker (ignorada por Git)
    keys/
      jwt-private.pem  <-- Generada localmente (ignorada por Git)
      jwt-public.pem   <-- Generada localmente (ignorada por Git)
```

---

## Problemas frecuentes

### "ERROR: No se encontro el archivo .env"
Ejecutaste el script sin configurar credenciales. Sigue el Paso 2.

### "Permission denied" en archivos .pem
```bash
chmod 600 .secret/keys/*.pem
```

### Docker no levanta el backend
```bash
docker compose logs pagina-web-backend
```
Revisa que las variables `SUPABASE_DB_URL`, `SUPABASE_DB_USERNAME` y `SUPABASE_DB_PASSWORD` esten correctas en tu `.env`.
