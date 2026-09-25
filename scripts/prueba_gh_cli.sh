#!/usr/bin/env bash
set -e

REPO="astarothprueba10-ui/SGI-Monolithe"
PROJECT_NUM=2
OWNER="astarothprueba10-ui"

declare -a TASKS=(
  "[S3][CRM] Implementar seguimiento de prospectos|2026-09-21|2026-09-22"
  "[S3][CRM] Implementar gestión de asesores en CRM|2026-09-22|2026-09-23"
  "[S3][CRM] Implementar historial de interacciones|2026-09-23|2026-09-24"
)

echo "Iniciando carga de prueba (3 tareas)..."

for task_data in "${TASKS[@]}"; do
  TITLE=$(echo "$task_data" | cut -d'|' -f1)
  START_DATE=$(echo "$task_data" | cut -d'|' -f2)
  TARGET_DATE=$(echo "$task_data" | cut -d'|' -f3)

  echo "--------------------------------------------------"
  echo "1. Creando Issue: $TITLE"
  # gh issue create outputs the URL on the last line
  ISSUE_URL=$(gh issue create -R "$REPO" --title "$TITLE" --body "Generado por script automático" | grep "https://github.com")
  echo "   Issue URL: $ISSUE_URL"

  echo "2. Agregando Issue al Proyecto $PROJECT_NUM..."
  gh project item-add "$PROJECT_NUM" --owner "$OWNER" --url "$ISSUE_URL"

  echo "3. Actualizando fechas (Start date: $START_DATE, Target date: $TARGET_DATE)..."
  gh project item-edit "$PROJECT_NUM" --owner "$OWNER" --url "$ISSUE_URL" --field "Start date" --date "$START_DATE"
  gh project item-edit "$PROJECT_NUM" --owner "$OWNER" --url "$ISSUE_URL" --field "Target date" --date "$TARGET_DATE"
  
  sleep 2
done

echo "¡Prueba de 3 tareas finalizada!"
