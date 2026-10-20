#!/usr/bin/env bash
set -euo pipefail

# SGI-Monolithe Oracle Cloud Deployment Script
PROJECT_DIR="${HOME}/SGI-Monolithe"

cd "${PROJECT_DIR}"

echo "Fetching latest changes from origin main..."
git fetch origin main
git reset --hard origin/main

echo "Securing secrets permissions..."
chmod 600 "${PROJECT_DIR}/.env" || true
chmod -R 600 "${PROJECT_DIR}/.secret" 2>/dev/null || true

echo "Rebuilding and starting docker containers..."
docker compose down || true
docker rm -f sgi-auth-service sgi-core-service sgi-portal-cliente sgi-backoffice sgi-pagina-web-backend sgi-pagina-web-frontend 2>/dev/null || true
docker compose up -d --remove-orphans

echo "Pruning dangling images to save disk space..."
docker image prune -f

echo "Verifying running services..."
docker compose ps
