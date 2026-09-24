#!/usr/bin/env bash
set -e

CYAN='\033[0;36m'
VERDE='\033[0;32m'
AMARILLO='\033[1;33m'
RESET='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo -e "${CYAN}SGI Monolithe - Entorno de Desarrollo Local${RESET}"

mkdir -p "$ROOT_DIR/.secret/keys"
chmod 700 "$ROOT_DIR/.secret" "$ROOT_DIR/.secret/keys"

if [ ! -f "$ROOT_DIR/.secret/supabase.env" ]; then
    echo -e "${AMARILLO}No se encontró .secret/supabase.env. Copiando desde plantilla...${RESET}"
    cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.secret/supabase.env"
    chmod 600 "$ROOT_DIR/.secret/supabase.env"
fi

if [ ! -f "$ROOT_DIR/.secret/keys/jwt-private.pem" ]; then
    echo -e "${AMARILLO}Generando par de llaves RSA en .secret/keys/...${RESET}"
    openssl genrsa -out "$ROOT_DIR/.secret/keys/jwt-private.pem" 2048 2>/dev/null
    openssl rsa -in "$ROOT_DIR/.secret/keys/jwt-private.pem" -pubout -out "$ROOT_DIR/.secret/keys/jwt-public.pem" 2>/dev/null
    chmod 600 "$ROOT_DIR/.secret/keys/"*.pem
fi

echo -e "\n${VERDE}1. Verificando Backend Spring Boot (puerto 8082)...${RESET}"
if ! curl -s --max-time 2 http://localhost:8082/actuator/health | grep -q "UP"; then
    echo -e "   Levantando sgi-pagina-web-backend con Docker Compose..."
    docker compose up -d pagina-web-backend
    echo -e "   Esperando inicialización del backend..."
    sleep 5
fi

if curl -s --max-time 3 http://localhost:8082/actuator/health | grep -q "UP"; then
    echo -e "${VERDE}   Backend activo en http://localhost:8082 (Conectado a Supabase)${RESET}"
fi

echo -e "\n${VERDE}2. Iniciando Frontend Vite (Web Pública & Panel CMS)...${RESET}"
cd "$ROOT_DIR/apps/pagina-web"

if [ ! -d "node_modules" ]; then
    ln -s ../../apps/backoffice/node_modules node_modules 2>/dev/null || true
fi

echo -e "${VERDE}Servicios Disponibles en Local:${RESET}"
echo -e "   - Web Pública y CMS (Vite):   ${CYAN}http://localhost:5175${RESET}"
echo -e "   - Backend API (Spring Boot):  ${CYAN}http://localhost:8082${RESET}"
echo -e "   - Health Check:               ${CYAN}http://localhost:8082/actuator/health${RESET}"
echo -e "   - Proyectos API:              ${CYAN}http://localhost:8082/api/public/proyectos${RESET}"
echo -e "   - Supabase BaaS:              ${CYAN}https://REDACTED_PROJECT_REF.supabase.co${RESET}\n"

exec ./node_modules/.bin/vite --port 5175 --host
