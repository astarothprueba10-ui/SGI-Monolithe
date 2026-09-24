# IA.md — Reglas Generales para Gemini y Antigravity en SGI-Monolithe

Este repositorio cuenta con reglas estrictas e inmutables:

- **Zero Emojis**: 0 emojis en todo el repositorio (código, scripts, documentación, commits).
- **Arquitectura Limpia**: Principios SOLID, funciones <= 20 líneas, Javadoc/TSDoc en métodos públicos.
- **Navegación de Código**: Usar `grep_search` obligatoriamente antes de leer archivos completos.
- **Seguridad**: Respetar aislamiento de credenciales en `.secret/`.
- **Base de Datos**: NUNCA usar `select('*')` en Supabase; especificar siempre las columnas requeridas y usar `limit()`.
