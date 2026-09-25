# AGENTS.md — Reglas Generales y Guía Operativa para Agentes IA en SGI-Monolithe

Este documento define las directrices maestras, arquitectura y el protocolo de ciclo de vida de desarrollo para todas las herramientas y agentes IA que operan en este repositorio.

---

## 1. Directrices Maestras

1. **Zero Emojis**: Totalmente prohibido incluir emojis en código, scripts, commits, documentación o salidas de terminal.
2. **Clean Architecture y SOLID**: Métodos y funciones con responsabilidad única (SRP) y `<= 20 líneas` de código. Separación estricta de capas en Java/Spring Boot (Controller -> Service -> Repository -> Entity/DTO) y React/TypeScript (components, pages, lib, types).
3. **Flujo de Herramientas Estricto**: Antes de cualquier lectura o edición:
   `grep_search` -> `list_dir` (solo si grep no basta) -> `view_file` (rango máximo 80 líneas).
4. **Supabase y Postgres**: Consultas obligatorias con `.select('col1, col2')` (prohibido `select('*')`), aplicar `.limit()` en listas y verificar Row Level Security (RLS) en tablas relacionales.
5. **Aislamiento de Secretos**: Credenciales únicamente en `.secret/supabase.env` (`chmod 600`) y llaves RSA en `.secret/keys/`. Prohibido exponer secretos en clientes frontend o repositorios.
6. **Respuestas Concisas**: Citar líneas relevantes mediante enlaces con esquema `file:///`, sin relleno ni re-resúmenes.

---

## 2. Protocolo de Gestión de Tareas y Sprints (Gantt y Proyectos)

Para que el avance del software refleje un ciclo de vida de ingeniería real:

### Inicio de Tarea
Antes de comenzar a desarrollar una funcionalidad del Sprint activo:
1. Localizar el Issue o ítem correspondiente en el tablero de GitHub.
2. Mover su estado a `In progress` y asignar el responsable correspondiente:
   ```bash
   gh issue edit <NUMERO_ISSUE> --add-label "in-progress"
   ```

### Cierre de Tarea (Definition of Done - DoD)
Una tarea solo se marca como terminada (`Done` o cerrada) cuando cumple:
1. Código implementado bajo Clean Architecture y métodos `<= 20 líneas`.
2. Verificación estática sin errores (`mvn test`, `npm run build` o pruebas pertinentes).
3. Commit asociado con referencia explícita al número de tarea:
   ```bash
   git commit -m "feat(crm): implementar logica de seguimiento (#21)"
   gh issue close 21 --comment "Completado y validado en backend y base de datos"
   ```
4. El workflow de GitHub Projects moverá la tarjeta automáticamente a la columna `Done`.

### Desvíos, Retrasos o Ajustes de Alcance
Si una tarea se retrasa o requiere extensión de plazo:
1. Modificar el campo `Target date` reflejando el impacto real en el diagrama de Gantt:
   ```bash
   gh project item-edit --id "<ITEM_ID>" --project-id "PVT_kwHOE2BQ5s4BkfML" --field-id "PVTF_lAHOE2BQ5s4BkfMLzhjPnK8" --date "YYYY-MM-DD"
   ```
2. Registrar un comentario formal en el Issue documentando la causa técnica del ajuste para mantener trazabilidad histórica.

---

## 3. Estructura de Documentación y Fuentes

Toda la documentación técnica, arquitectónica y de gestión de proyecto reside organizadamente dentro del directorio `docs/`:
- `docs/01_gestion_proyecto/`: Diagrama de Gantt maestro (`GANTT_SIGI_MONOLITHE.md`, `diagrama_gantt_sigi_monolithe.xml`).
- `docs/02_requerimientos_especificaciones/`: Especificación técnica y requerimientos alineados.
- `docs/05_base_de_datos/`: Modelos, esquemas DDL y guías de Supabase.
- `.agents/rules/reglas_proyecto.md`: Reglas complementarias de auto-validación para agentes.
