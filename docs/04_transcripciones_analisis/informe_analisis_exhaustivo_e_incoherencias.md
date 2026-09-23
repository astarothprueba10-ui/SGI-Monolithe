# INFORME TÉCNICO EXHAUSTIVO: ANÁLISIS DE INFORMACIÓN, INCOHERENCIAS Y PUNTO DE VISTA DE ARQUITECTURA

**Proyecto:** SIGI MONOLITHE – Sistema Integral de Gestión Inmobiliaria  
**Código del Proyecto:** PRY-SGE-2026-001  
**Autor del Análisis:** Antigravity / Senior Software Engineer  
**Fecha:** 25 de Agosto de 2026  

---

## 1. Confirmación de Fuentes Analizadas

Se ha auditado y analizado minuciosamente el 100% de la documentación, grabaciones y archivos del proyecto:

1. **Gestión de Proyecto:**
   - `acta_constitucion_sigi_monolithe.docx` (Project Charter, alcance, objetivos, gobernanza híbrida).
   - `cronograma_sprints.xlsx` (Planificación temporal: Sprint 0 a Sprint 8, QA y Go-Live).
2. **Requerimientos y Especificaciones:**
   - `documento_maestro_requerimientos_scrum.docx` y `.pdf` (Definición funcional, épicas, Product Backlog).
   - `especificacion_requerimientos_software_ieee830.docx` (Plantilla estándar SRS IEEE 830).
   - `guia_ejemplo_requerimientos.pdf` (Referencia de casos de uso y especificaciones formales).
3. **Multimedia y Grabaciones (Audio transcrito al 100%):**
   - `video_explicacion_reglas_negocio.mp4` (11:29 min): Audio de explicación de las reglas comerciales y operativas reales de la empresa.
   - `video_reunion_coordinacion_equipo.mp4` (50:14 min): Audio de la sesión de trabajo y toma de decisiones del equipo respecto a alcance y UI.

---

## 2. ¿De qué trata el Sistema SIGI MONOLITHE?

El proyecto consiste en el diseño, desarrollo e implantación de un **Sistema Web Integral de Gestión Inmobiliaria** para centralizar la operativa comercial, financiera y administrativa de la empresa **MONOLITHE Company**, eliminando la dispersión de datos en Excel, WhatsApp y carpetas compartidas.

### Componentes y Módulos Fundamentales:
1. **Seguridad y Auditoría:** Autenticación, RBAC (Roles: Administrador, Gerencia, Asesor Comercial, Cajero/Tesorería, Cliente) y registro inmutable de logs.
2. **Inventario de Inmuebles:** Gestión jerárquica de Proyecto -> Etapas -> Manzanas -> Lotes (70 lotes parametrizados por m², precio y atributos de valor).
3. **Plano Interactivo:** Visualización gráfica en tiempo real de la disponibilidad de lotes (Disponible, Separado, Vendido, Bloqueado).
4. **CRM Comercial & Visitas:** Gestión de prospectos (leads), cartera de asesores y agenda de visitas al terreno.
5. **Cotizaciones y Ventas:** Módulo de separación preventiva (S/ 500) y formalización de contratos de compraventa.
6. **Financiamiento y Cobranzas:** Motor de cálculo de cronogramas de pago (hasta 3 años), tablas de amortización, intereses y control de moras.
7. **Portal del Cliente Comprador:** Extranet para que el comprador consulte su estado de cuenta, cronograma y cargue comprobantes (vouchers) de pago.
8. **Dashboard Gerencial:** Reportes ejecutivos de colocación de lotes, recaudación y comisiones.

---

## 3. Matriz de Incoherencias, Contradicciones y Brechas de Alcance

Al cruzar los documentos teóricos con las grabaciones reales del equipo y la empresa, se han detectado **incoherencias críticas** que deben resolverse formalmente:

| # | Área / Tema | Lo que dicen los Documentos (Maestro / Cronograma / SRS) | Lo que revelan las Grabaciones (Videos / Reunión) | Incoherencia y Riesgo Técnico |
|---|---|---|---|---|
| **1** | **Módulo de Gestión Documental (Sprint 7)** | El cronograma y el Doc. Maestro definen un Sprint completo (Sprint 7) para un repositorio documental avanzado con versionado y subida masiva de minutas/expedientes. | En la reunión del equipo acordaron **descartar/reducir drásticamente** este módulo por falta de tiempo y recomendación del docente. Solo se mantendrá la subida simple de vouchers. | **Desfase de Compromiso:** Si el cronograma y el SRS siguen mostrando el Sprint 7 completo, el evaluador/docente exigirá un módulo que el equipo ya acordó no desarrollar. |
| **2** | **Complejidad del Plano Interactivo (Sprint 3)** | El documento plantea un visor interactivo que asume capacidad de actualización gráfica de proyectos. | En la reunión, el equipo discutió el dilema de cómo "procesar automáticamente planos en PDF/imagen". El video explicativo aclara que la empresa trabaja sobre un proyecto base de **70 lotes**. | **Sobreingeniería:** Intentar crear un motor OCR/CAD de planos dinámicos pondrá en riesgo el proyecto. Debe acotarse a un **SVG interactivo parametrizado** para los 70 lotes. |
| **3** | **Modelo de Comisiones de Asesores** | Los documentos mencionan el cálculo de comisiones de forma abstracta y general. | El video de negocio define reglas matemáticas y operativas exactas: <br>- Asesor Comisionista: **3% al contado**, **2% financiado**.<br>- Asesor Planilla: Sueldo fijo + bono.<br>- **Regla estricta:** Solo se liquida la comisión tras la **firma notarial del contrato**, nunca por la separación. | **Subespecificación en BD:** El modelo de base de datos debe incluir campos como `tipo_asesor`, `tipo_venta`, `porcentaje_comision` y el disparador condicionado al estado `CONTRATO_FIRMADO`. |
| **4** | **Reglas de Separación vs Pérdida de Reserva** | Los documentos tratan la reserva como un estado comercial genérico. | El video de negocio fija una penalidad económica: Monto **S/ 500**, vigencia **7 días calendario**, **no reembolsable** si no se abona la inicial. | **Falta de Automatización:** Se requiere una tarea programada (cron job) que libere los lotes automáticamente pasados los 7 días sin confirmación de inicial. |
| **5** | **Cláusula Resolutoria por Mora** | No está especificada cuantitativamente en el Documento Maestro. | En el video de negocio se establece que el retraso en **3 cuotas mensuales consecutivas** causa la rescisión automática del contrato y pérdida del lote y lo pagado. | **Lógica de Alerta:** El sistema financiero debe calcular `cuotas_vencidas_consecutivas` y disparar un estado de `Mora Crítica / Rescisión`. |
| **6** | **Agenda de Visitas al Terreno** | En los documentos se indica como un calendario abierto. | El video establece restricciones logísticas estrictas de movilidad: solo **Lunes, Miércoles, Viernes y Sábados** a las **11:00 AM y 03:00 PM**. | **Restricción de UI:** El selector de fechas/horas de visitas debe validar estos rangos para evitar agendamientos fuera de horario. |

---

## 4. Punto de Vista de Arquitectura y Recomendaciones de Ingeniería

Como Ingeniero de Software Senior, recomiendo estructurar el desarrollo bajo las siguientes directrices técnicas para garantizar el éxito del proyecto sin sobrecargar al equipo:

### 1. Arquitectura de Base de Datos y Backend (Limpia y Normalizada)
- **Motor Recomendado:** PostgreSQL / Supabase o Node.js + Express/NestJS con TypeScript.
- **Entidades Clave:**
  - `usuarios` & `roles_permisos` (RBAC) + `auditoria_logs`.
  - `proyectos`, `etapas`, `manzanas`, `lotes` (con coordenadas de polígono SVG, estado y precio).
  - `clientes`, `leads`, `visitas_agendadas`.
  - `asesores` (con atributos: planilla vs comisionista).
  - `separaciones` (monto, fecha_limite, estado: 'VIGENTE' | 'EXPIRADA' | 'CONVERTIDA').
  - `ventas_contratos` (tipo: 'CONTADO' | 'FINANCIADO', precio_final, inicial, comision_asesor).
  - `cronograma_cuotas` (numero_cuota, fecha_vencimiento, monto_capital, interes, estado: 'PENDIENTE' | 'PAGADO' | 'MORA').
  - `comprobantes_pago` (voucher_url, monto_declarado, estado_validacion: 'EN_REVISION' | 'APROBADO' | 'RECHAZADO').

### 2. Solución al Plano Interactivo (Sprint 3)
- Evitar librerías pesadas de CAD o renderizado complejo.
- Utilizar un gráfico vectorial **SVG optimizado** donde cada uno de los 70 lotes sea un elemento `<polygon id="lote-A01" class="status-disponible" />`.
- Mediante React/Vue/Flutter, enlazar el evento `onClick` de cada polígono al modal de detalle del lote y reflejar las clases de color según el estado en base de datos.

### 3. Ajuste al Alcance del MVP y Sprints
Para alinearse con la recomendación del docente y el acuerdo del equipo:
- **Sprint 0:** Arquitectura, BD y Repositorio.
- **Sprint 1:** Seguridad, Roles y Auditoría.
- **Sprint 2:** Gestión de Lotes y Datos Maestros.
- **Sprint 3:** Plano Interactivo SVG.
- **Sprint 4:** CRM Comercial, Leads y Agenda de Visitas.
- **Sprint 5:** Separaciones (S/ 500) y Formalización de Venta.
- **Sprint 6:** Financiamiento, Cronograma de Cuotas y Portal de Cliente (Subida de Voucher).
- **Sprint 7 (Reenfocado):** Liquidación de Comisiones y Módulo de Validación de Pagos.
- **Sprint 8:** Dashboard de Indicadores Gerenciales (KPIs).

---

## 5. Próximos Pasos Inmediatos Sugeridos

1. **Ajustar el Backlog Formal:** Sincronizar el `documento_maestro_requerimientos_scrum.docx` con las reducciones acordadas en la reunión para evitar discrepancias ante el docente.
2. **Definir el Diagrama Entidad-Relación (DER):** Modelar las tablas con las reglas de comisiones, separaciones de S/ 500 y cuotas de financiamiento.
3. **Validación de Figma:** Alinear los prototipos que diseñará el equipo con los flujos de negocio ya transcritos.
