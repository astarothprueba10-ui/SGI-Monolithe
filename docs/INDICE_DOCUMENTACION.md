# 📁 Índice de Documentación — SIGI MONOLITHE

> Última actualización: 23/09/2026

---

## Estructura de Carpetas

```
docs/
├── 00_archivos_fuente/              # Archivos originales no procesados
│   ├── contexto_base_original/      # ZIP descomprimido (respaldo)
│   │   └── Integrador II/           # Entregables académicos originales
│   └── documentos_obsoletos_historicos/
│
├── 01_gestion_proyecto/             # Planificación y Gantt
│   ├── GANTT_SIGI_MONOLITHE.md      # ⭐ Gantt en Markdown (referencia rápida)
│   ├── diagrama_gantt_sigi_monolithe.xml  # Fuente XML (importable en GanttPRO)
│   ├── cronograma_sprints.xlsx      # Vista Excel del cronograma
│   └── acta_constitucion_sigi_monolithe.docx
│
├── 02_requerimientos_especificaciones/
│   └── DOCUMENTO_MAESTRO_REQUERIMIENTOS_Y_SPRINTS_ALINEADO.md  # ⭐ SSOT
│
├── 04_transcripciones_analisis/
│   ├── analisis_consolidado_reglas_negocio.md
│   ├── analisis_profundo_gantt_xml_y_requerimientos_reales.md
│   ├── informe_analisis_exhaustivo_e_incoherencias.md
│   ├── transcripcion_explicacion_reglas_negocio.txt
│   └── transcripcion_reunion_coordinacion_equipo.txt
│
└── 05_base_de_datos/
    ├── 01_supabase_schema.sql       # ⭐ Schema principal (102 tablas)
    ├── 02_supabase_seed.sql         # Datos iniciales / catálogos
    ├── 03_supabase_rls_y_auth.sql   # Políticas RLS y autenticación
    ├── 04_funciones_rpc_core.sql    # Funciones y RPCs Supabase
    ├── guia_supabase_setup.md       # Guía de configuración
    └── Guia_Base_Datos_SIGI_MONOLITHE.docx
```

---

## 📌 Documentos Clave

| Documento | Descripción | Ubicación |
|---|---|---|
| **GANTT_SIGI_MONOLITHE.md** | Gantt completo en Markdown con Mermaid | `01_gestion_proyecto/` |
| **diagrama_gantt_sigi_monolithe.xml** | Fuente XML importable en GanttPRO | `01_gestion_proyecto/` |
| **DOCUMENTO_MAESTRO_REQUERIMIENTOS...md** | SSOT de requerimientos y sprints | `02_requerimientos_especificaciones/` |
| **01_supabase_schema.sql** | Esquema completo de 102 tablas | `05_base_de_datos/` |

---

## 🔗 GitHub Projects (Tableros)

| Proyecto | URL | Propósito |
|---|---|---|
| **Tablero Kanban** | [/projects/1](https://github.com/users/astarothprueba10-ui/projects/1) | Flujo diario: Backlog → Ready → In Progress → In Review → Done |
| **Planificación sprints** | [/projects/2](https://github.com/users/astarothprueba10-ui/projects/2) | Sprints por iteración con fechas, estimados e iteraciones |

---

## 📦 Respaldo del Contexto Base

El archivo `Contexto base.zip` se conserva en `docs/` como respaldo del entregable académico original.
El contenido está descomprimido y organizado en `docs/00_archivos_fuente/contexto_base_original/`.
