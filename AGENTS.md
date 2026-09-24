# AGENTS.md — Reglas Generales para Agentes IA en SGI-Monolithe

Este archivo define las directrices maestras de desarrollo para todas las herramientas y agentes IA que operan en este repositorio.

## Directrices Clave:
1. **Zero Emojis**: Totalmente prohibido incluir emojis en código, scripts, commits o documentos.
2. **Clean Architecture & SOLID**: Métodos <= 20 líneas, separación estricta de capas en Java/Spring Boot y React/TypeScript.
3. **Flujo de Herramientas Estricto**: `grep_search` -> `list_dir` -> `view_file` (rango máximo 80 líneas).
4. **Supabase & Postgres**: `select('col1, col2')` obligatorio, `limit()` en listas, RLS en todas las tablas relacionales.
5. **Aislamiento de Secretos**: Credenciales únicamente en `.secret/supabase.env` (chmod 600).
6. **Respuestas Concisas**: Citar solo líneas relevantes con enlaces `file:///`, sin relleno ni re-resúmenes.
