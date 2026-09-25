#!/usr/bin/env bash
set -e

CYAN='\033[0;36m'
VERDE='\033[0;32m'
AMARILLO='\033[1;33m'
ROJO='\033[0;31m'
RESET='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo -e "${CYAN}SGI Monolithe - Entorno de Desarrollo Local${RESET}"

# ── 0. Verificar que exista .env con credenciales reales ──────────────────────
if [ ! -f "$ROOT_DIR/.env" ]; then
    echo -e "${ROJO}ERROR: No se encontro el archivo .env en la raiz del proyecto.${RESET}"
    echo -e "${AMARILLO}Instrucciones:${RESET}"
    echo -e "  1. Copia la plantilla:  cp .env.example .env"
    echo -e "  2. Completa los valores reales que te envio el lider del equipo."
    echo -e "  3. Vuelve a ejecutar:   bash scripts/iniciar_local.sh"
    exit 1
fi

# Cargar variables del .env para uso en este script
set -a
source "$ROOT_DIR/.env"
set +a

# ── 1. Crear carpeta segura y copiar credenciales ────────────────────────────
mkdir -p "$ROOT_DIR/.secret/keys"
chmod 700 "$ROOT_DIR/.secret" "$ROOT_DIR/.secret/keys"

# Sincronizar .secret/supabase.env desde .env (Docker Compose lo necesita)
cp "$ROOT_DIR/.env" "$ROOT_DIR/.secret/supabase.env"
chmod 600 "$ROOT_DIR/.secret/supabase.env"

# ── 2. Generar par de llaves RSA si no existen ───────────────────────────────
if [ ! -f "$ROOT_DIR/.secret/keys/jwt-private.pem" ]; then
    echo -e "${AMARILLO}Generando par de llaves RSA en .secret/keys/...${RESET}"
    openssl genrsa -out "$ROOT_DIR/.secret/keys/jwt-private.pem" 2048 2>/dev/null
    openssl rsa -in "$ROOT_DIR/.secret/keys/jwt-private.pem" -pubout \
        -out "$ROOT_DIR/.secret/keys/jwt-public.pem" 2>/dev/null
    chmod 600 "$ROOT_DIR/.secret/keys/"*.pem
    echo -e "${VERDE}   Llaves RSA generadas correctamente.${RESET}"
fi

# ── 3. Levantar Backend Spring Boot ──────────────────────────────────────────
echo -e "\n${VERDE}1. Verificando Backend Spring Boot (puerto ${WEB_BACKEND_PORT:-8082})...${RESET}"
BACKEND_PORT="${WEB_BACKEND_PORT:-8082}"
if ! curl -s --max-time 2 "http://localhost:${BACKEND_PORT}/actuator/health" | grep -q "UP"; then
    echo -e "   Levantando sgi-pagina-web-backend con Docker Compose..."
    docker compose up -d pagina-web-backend
    echo -e "   Esperando inicializacion del backend..."
    sleep 5
fi

if curl -s --max-time 3 "http://localhost:${BACKEND_PORT}/actuator/health" | grep -q "UP"; then
    echo -e "${VERDE}   Backend activo en http://localhost:${BACKEND_PORT} (Conectado a Supabase)${RESET}"
fi

# ── 4. Iniciar Frontend Vite ─────────────────────────────────────────────────
echo -e "\n${VERDE}2. Iniciando Frontend Vite (Web Publica & Panel CMS)...${RESET}"
cd "$ROOT_DIR/apps/pagina-web"

if [ ! -d "node_modules" ]; then
    ln -s ../../apps/backoffice/node_modules node_modules 2>/dev/null || true
fi

echo -e "${VERDE}Servicios Disponibles en Local:${RESET}"
echo -e "   - Web Publica y CMS (Vite):   ${CYAN}http://localhost:${WEB_FRONTEND_PORT:-5175}${RESET}"
echo -e "   - Backend API (Spring Boot):   ${CYAN}http://localhost:${BACKEND_PORT}${RESET}"
echo -e "   - Health Check:                ${CYAN}http://localhost:${BACKEND_PORT}/actuator/health${RESET}"
echo -e "   - Proyectos API:               ${CYAN}http://localhost:${BACKEND_PORT}/api/public/proyectos${RESET}"
echo -e "   - Supabase Dashboard:          ${CYAN}https://supabase.com/dashboard${RESET}\n"

exec ./node_modules/.bin/vite --port "${WEB_FRONTEND_PORT:-5175}" --host
