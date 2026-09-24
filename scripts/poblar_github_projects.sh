#!/usr/bin/env bash
# ============================================================
# poblar_github_projects.sh
# Puebla GitHub Projects con tareas del Gantt de SIGI MONOLITHE
# Requiere: gh auth con scope "project"
# Uso: bash scripts/poblar_github_projects.sh
# ============================================================
set -euo pipefail

OWNER="astarothprueba10-ui"

echo "🔑 Verificando autenticación..."
gh auth status || { echo "❌ Ejecuta: gh auth refresh -s project"; exit 1; }

echo "🔍 Obteniendo IDs de los proyectos..."

KANBAN_ID=$(gh api graphql -f query='
{
  user(login: "'"$OWNER"'") {
    projectsV2(first: 10) {
      nodes { id number title }
    }
  }
}' --jq '.data.user.projectsV2.nodes[] | select(.number == 1) | .id')

SPRINT_ID=$(gh api graphql -f query='
{
  user(login: "'"$OWNER"'") {
    projectsV2(first: 10) {
      nodes { id number title }
    }
  }
}' --jq '.data.user.projectsV2.nodes[] | select(.number == 2) | .id')

echo "📋 Tablero Kanban ID: $KANBAN_ID"
echo "🗓️  Planificación Sprints ID: $SPRINT_ID"

# ---- Función helper para crear un draft item ----
add_item() {
  local project_id="$1"
  local title="$2"
  gh api graphql -f query='
    mutation {
      addProjectV2DraftIssue(input: {projectId: "'"$project_id"'", title: "'"$title"'"}) {
        projectItem { id }
      }
    }' --jq '.data.addProjectV2DraftIssue.projectItem.id' 2>/dev/null || true
}

echo ""
echo "🚀 Poblando Sprint 3 (ACTIVO HOY: 21/09 – 02/10) en Kanban y Sprints..."
echo "---"

# Sprint 3 — CRM y Agenda de Visitas
SPRINT3_TASKS=(
  "[S3][CRM] Implementar seguimiento de prospectos"
  "[S3][CRM] Implementar gestión de asesores en CRM"
  "[S3][CRM] Implementar historial de interacciones"
  "[S3][Agenda] Diseñar módulo de agenda de visitas al terreno"
  "[S3][Agenda] Implementar registro de visita"
  "[S3][Agenda] Implementar validación de horarios oficiales"
  "[S3][Agenda] Implementar confirmación/cancelación de visita"
  "[S3][Agenda] Implementar notificación de visita programada"
  "[S3][DevOps] Configurar pipeline CI básico"
  "[S3][QA] Pruebas de seguridad Sprint 1-2"
  "[S3][Scrum] Sprint Review 3"
  "[S3][Scrum] Sprint Retrospective 3"
)

for task in "${SPRINT3_TASKS[@]}"; do
  echo "  ➕ $task"
  add_item "$KANBAN_ID" "$task"
  add_item "$SPRINT_ID" "$task"
done

echo ""
echo "📦 Poblando Sprint 4 (Backlog: 05/10 – 16/10)..."
echo "---"

SPRINT4_TASKS=(
  "[S4][Separaciones] Diseñar flujo de separación de lote"
  "[S4][Separaciones] Implementar registro de separación (S/ 500.00)"
  "[S4][Separaciones] Implementar control de plazo de 7 días"
  "[S4][Separaciones] Implementar caducidad automática de separación"
  "[S4][Separaciones] Implementar reversión de lote a Disponible"
  "[S4][Ventas] Implementar registro de venta al contado"
  "[S4][Ventas] Implementar registro de venta financiada"
  "[S4][Ventas] Implementar generación de contrato de compraventa"
  "[S4][Ventas] Implementar formalización de cliente comprador"
  "[S4][Ventas] Implementar entrega de documentos digitales"
  "[S4][DevOps] Preparar entorno de despliegue versión 1"
  "[S4][DevOps] Desplegar versión 1"
  "[S4][DevOps] Verificar funcionamiento de versión 1"
  "[S4][Informe] Levantar observaciones del APF1"
  "[S4][Informe] Preparar informe APF2"
  "[S4][Scrum] Sprint Review 4"
  "[S4][Scrum] Sprint Retrospective 4"
)

for task in "${SPRINT4_TASKS[@]}"; do
  echo "  ➕ $task"
  add_item "$KANBAN_ID" "$task"
  add_item "$SPRINT_ID" "$task"
done

echo ""
echo "📦 Poblando Sprint 5 (Backlog: 19/10 – 30/10)..."
echo "---"

SPRINT5_TASKS=(
  "[S5][Financiamiento] Diseñar modelo de plan de financiamiento"
  "[S5][Financiamiento] Implementar cálculo de intereses"
  "[S5][Financiamiento] Generar cronograma de cuotas (hasta 36)"
  "[S5][Financiamiento] Calcular saldo pendiente del cliente"
  "[S5][Financiamiento] Clasificar cuotas: por vencer, vencidas, pagadas"
  "[S5][Financiamiento] Implementar alerta de cuotas próximas a vencer"
  "[S5][Financiamiento] Implementar cláusula de 3 cuotas consecutivas vencidas"
  "[S5][Vouchers] Implementar carga de voucher"
  "[S5][Vouchers] Implementar estado Pendiente del voucher"
  "[S5][Vouchers] Implementar estado En validación del voucher"
  "[S5][Vouchers] Implementar validación del voucher (Tesorería)"
  "[S5][Vouchers] Implementar rechazo de voucher con motivo"
  "[S5][Vouchers] Actualizar cuota pagada tras validación"
  "[S5][Scrum] Sprint Review 5"
  "[S5][Scrum] Sprint Retrospective 5"
)

for task in "${SPRINT5_TASKS[@]}"; do
  echo "  ➕ $task"
  add_item "$KANBAN_ID" "$task"
  add_item "$SPRINT_ID" "$task"
done

echo ""
echo "📦 Poblando Sprints 6-8 (Backlog)..."
echo "---"

SPRINT6_TASKS=(
  "[S6][Portal] Diseñar pantalla de login del cliente"
  "[S6][Portal] Implementar creación del usuario comprador"
  "[S6][Portal] Implementar acceso con DNI"
  "[S6][Portal] Generar contraseña inicial para cliente"
  "[S6][Portal] Enviar credenciales iniciales por correo"
  "[S6][Portal] Implementar recuperación y cambio de contraseña"
  "[S6][Portal] Mostrar información del lote comprado"
  "[S6][Portal] Mostrar cronograma de pagos"
  "[S6][Portal] Mostrar cuotas vencidas y por vencer"
  "[S6][Portal] Mostrar alertas de pago"
  "[S6][Portal] Permitir descargar cronograma en PDF"
  "[S6][Portal] Permitir descargar contrato"
  "[S6][Portal] Permitir descargar memoria descriptiva"
  "[S6][Portal] Mostrar cuentas bancarias para pagos"
  "[S6][Portal] Mostrar nombre y teléfono del asesor asignado"
  "[S6][Portal] Integrar formulario de carga de vouchers"
  "[S6][Portal] Mostrar estado del voucher enviado"
  "[S6][Portal] Mostrar motivo de rechazo del voucher"
  "[S6][DevOps] Preparar despliegue de versión 2"
  "[S6][DevOps] Desplegar versión funcional"
)

SPRINT7_TASKS=(
  "[S7][Comisiones] Implementar comisión 3% para venta al contado"
  "[S7][Comisiones] Implementar comisión 2% para venta financiada"
  "[S7][Comisiones] No permitir comisión por simple separación"
  "[S7][Comisiones] Registrar bono para asesor contratado"
  "[S7][Comisiones] Registrar sueldo del asesor contratado"
  "[S7][Comisiones] Calcular descuentos por faltas no justificadas"
  "[S7][Comisiones] Mostrar historial de ventas por asesor"
  "[S7][Finanzas] Consolidar ventas registradas"
  "[S7][Finanzas] Consolidar pagos validados"
  "[S7][Finanzas] Calcular balance ventas - comisiones"
  "[S7][Dashboard] Implementar KPI de ventas"
  "[S7][Dashboard] Implementar KPI de lotes disponibles/separados/vendidos"
  "[S7][Dashboard] Implementar KPI de clientes por etapa comercial"
  "[S7][Dashboard] Implementar KPI de cuotas vencidas y morosidad"
  "[S7][Dashboard] Implementar gráficos y filtros del dashboard"
)

SPRINT8_TASKS=(
  "[S8][UAT] Preparar plan de pruebas UAT"
  "[S8][UAT] Ejecutar UAT con usuarios clave"
  "[S8][UAT] Registrar observaciones de UAT"
  "[S8][UAT] Corregir errores críticos detectados en UAT"
  "[S8][UAT] Ejecutar pruebas de regresión"
  "[S8][Docs] Preparar manual de usuario"
  "[S8][Docs] Preparar manual técnico"
  "[S8][DevOps] Ejecutar Go-Live / despliegue final"
  "[S8][Cierre] Registrar lecciones aprendidas"
  "[S8][Cierre] Realizar retrospectiva final del proyecto"
  "[S8][Cierre] Consolidar repositorio y entregables finales"
  "[S8][Cierre] Cierre interno del proyecto"
  "[S8][Informe] Preparar Informe de Proyecto Final"
)

for task in "${SPRINT6_TASKS[@]}" "${SPRINT7_TASKS[@]}" "${SPRINT8_TASKS[@]}"; do
  echo "  ➕ $task"
  add_item "$KANBAN_ID" "$task"
  add_item "$SPRINT_ID" "$task"
done

echo ""
echo "✅ ¡GitHub Projects poblado exitosamente!"
echo "   Tablero Kanban: https://github.com/users/$OWNER/projects/1"
echo "   Planificación Sprints: https://github.com/users/$OWNER/projects/2"
