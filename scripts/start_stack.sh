#!/usr/bin/env bash
set -e

CYAN='\033[0;36m'
VERDE='\033[0;32m'
AMARILLO='\033[1;33m'
RESET='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo -e "${CYAN}SGI Monolithe - Iniciando Stack Global${RESET}"

echo -e "${VERDE}1. Validando estructura .secret y llaves...${RESET}"
mkdir -p .secret/keys
chmod 700 .secret .secret/keys

if [ ! -f ".secret/keys/jwt-private.pem" ]; then
    echo -e "${AMARILLO}Generando par de llaves RSA en .secret/keys/...${RESET}"
    openssl genrsa -out ".secret/keys/jwt-private.pem" 2048 2>/dev/null
    openssl rsa -in ".secret/keys/jwt-private.pem" -pubout -out ".secret/keys/jwt-public.pem" 2>/dev/null
    chmod 600 .secret/keys/*.pem
fi

rm -rf services/auth-service/keys/ 2>/dev/null || true

echo -e "${VERDE}2. Vinculando variables de entorno global...${RESET}"
if [ ! -f ".secret/supabase.env" ]; then
    echo -e "${AMARILLO}No se encontró .secret/supabase.env. Copiando plantilla inicial...${RESET}"
    cp .env.example .secret/supabase.env
    chmod 600 .secret/supabase.env
fi

if [ ! -L ".env" ] && [ ! -f ".env" ]; then
    ln -s .secret/supabase.env .env
fi

echo -e "${VERDE}3. Construyendo y levantando contenedores...${RESET}"
docker compose up -d --build

echo -e "\n${VERDE}¡Stack inicializado con éxito!${RESET}"
echo -e "   - Auth Service:       http://localhost:8081"
echo -e "   - Web Backend:        http://localhost:8082"
echo -e "   - Portal Cliente:     http://localhost:5173"
echo -e "   - Backoffice (ERP):   http://localhost:5174"
echo -e "   - Web Frontend:       http://localhost:5175\n"
