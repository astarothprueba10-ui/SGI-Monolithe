# REGLAS DEL PROYECTO SGI-MONOLITHE — GUÍA PARA AGENTES IA

El presente documento define las reglas obligatorias e inmutables para cualquier Inteligencia Artificial (Antigravity IDE, Gemini CLI, Claude, Cursor, GitHub Copilot o Subagentes) que trabaje en el repositorio `SGI-Monolithe`.

---

## 1. POLÍTICA ESTRICTA DE ZERO EMOJIS Y CÓDIGO LIMPIO

- **PROHIBIDO** el uso de emojis en archivos de código fuente, scripts de shell/python, documentación markdown (`README.md`, `task.md`, `docs/`), mensajes de commit y salidas de consola.
- **PROHIBIDO** banners decorativos (`// ===...`, `# ===...`, `/* --- ... --- */`) o comentarios narrativos generados por IA que describan lo obvio.
- **PERMITIDA** única y exclusivamente la documentación técnica formal (Javadoc en métodos/clases públicas de Java, JSDoc/TSDoc en funciones exportadas de TypeScript).

---

## 2. ARQUITECTURA LIMPIA Y PRINCIPIOS SOLID

- **Single Responsibility Principle (SRP)**: Funciones y métodos con una sola responsabilidad y máximo 20 líneas de código.
- **Clean Architecture**:
  - **Backend (Java 21 / Spring Boot 4)**: Capas estrictas `Controller` -> `Service` -> `Repository` -> `Entity/DTO`.
  - **Frontend (React 18 / TypeScript / Vite)**: Separación estricta entre `components/`, `pages/`, `lib/` y `types/`.
- **Error Handling**: Excepciones tipadas con mensajes claros. Prohibidos `catch` vacíos, `printStackTrace()` o `print(e)`.
- **Documentación Técnica**: Javadoc/TSDoc descriptivo en toda interfaz o método público exportado.

---

## 3. FLUJO DE HERRAMIENTAS (ORDEN ESTRICTO)

Antes de leer o editar cualquier archivo en el proyecto, la IA DEBE ejecutar en este orden:

```
grep_search  ->  list_dir (solo si grep no basta)  ->  view_file (rango de max 80 lineas)
```

- **grep_search**: Herramienta primaria para localizar símbolos, imports o verificar patrones antes de editar.
- **view_file**: Siempre especificando `StartLine` y `EndLine` (máximo 80 líneas). Prohibido abrir archivos enteros para "explorar".
- **Archivos pesados**: Archivos como `package-lock.json`, `build/`, `dist/`, `.g.dart` o SQL masivos **nunca** deben leerse completos.

---

## 4. PERSISTENCIA Y REGLAS DE SUPABASE / BASE DE DATOS

- **Consultas SQL / Client SDK**: Usar siempre `.select('col1, col2')` — **prohibido `select('*')`**.
- **Límites de consulta**: Aplicar `.limit()` en toda consulta de lista.
- **Seguridad RLS y RPC**: Validar Row Level Security (RLS) y politicas de acceso. Las funciones `SECURITY DEFINER` deben validar explícitamente la identidad y el rol del invocador mediante claims JWT.
- **Manejo de Secretos**: Todas las claves privadas (`jwt-private.pem`) y credenciales sensibles deben residir exclusivamente en `.secret/` con permisos `chmod 600`. Ningún secreto debe ser inyectado en aplicaciones frontend (`apps/`).

---

## 5. LOOPS DE AUTO-VALIDACIÓN (OBLIGATORIO)

Antes de dar por completada cualquier tarea, la IA DEBE ejecutar:

### Loop de Validación de Código
1. Escribir el cambio.
2. Verificar con `grep_search` que el patrón y los tipos son correctos.
3. Analizar efectos secundarios en imports, dependencias o contratos de API.
4. Corregir cualquier inconsistencia detectada.

### Loop de Mejora de Respuesta
1. Revisar que no se incluyeron emojis.
2. Revisar que la respuesta sea directa, concisa y sin re-resumir archivos leídos.
3. Confirmar que se citaron solo las líneas estrictamente necesarias mediante links markdown (`[basename](file:///path#L10-L20)`).
