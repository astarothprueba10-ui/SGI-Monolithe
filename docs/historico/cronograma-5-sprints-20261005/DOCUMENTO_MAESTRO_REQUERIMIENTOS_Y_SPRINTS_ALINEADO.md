# DOCUMENTO MAESTRO DE REQUERIMIENTOS, REGLAS DE NEGOCIO Y SPRINTS
## SIGI MONOLITHE – Sistema Integral de Gestión Inmobiliaria
**Versión:** 2.0 (Alineación Oficial con Diagrama de Gantt XML y Base de Datos Supabase)  
**Estado:** Documento Oficial de Referencia (Única Fuente de la Verdad / SSOT)  
**Fecha de Publicación:** 4 de Septiembre de 2026  

---

## 1. Visión General y Alcance Tecnológico

**SIGI MONOLITHE** es la plataforma tecnológica centralizada para la gestión de proyectos de habilitación urbana e inmobiliaria, diseñada para optimizar el ciclo completo de negocio: desde la prospección de clientes y visualización de planos, hasta la formalización de ventas, financiamiento directo en cuotas y liquidación de comisiones.

### Stack Tecnológico Oficial
* **Frontend Backoffice:** React 18 + TypeScript + Vite + CSS (`apps/backoffice`).
* **Frontend Web Publica:** React 18 + TypeScript + Vite + CSS (`apps/pagina-web`).
* **Frontend Portal Cliente:** React 18 + TypeScript + Vite + CSS (`apps/portal-cliente`).
* **Backend & Base de Datos:** Supabase (PostgreSQL 17.6) en región `us-west-2` con Row Level Security (RLS) y extensiones `uuid-ossp` y `pgcrypto`.
* **Diseño UI/UX:** Prototipado en Figma y componentes con Framer Motion y Lucide Icons.
* **Modelo de Datos:** 102 tablas normalizadas y 181 índices de alto rendimiento.

---

## 2. Alineación Oficial de Sprints (Cronograma Gantt Maestro — 5 Sprints)

Este cronograma sincroniza el **Diagrama de Gantt Oficial** ([Diagrama de Gantt - 5 sprints.pdf](file:///home/jhonataningesis/Documentos/Proyectos/Inmobiliaria/SGI-Monolithe/docs/Diagrama%20de%20Gantt%20-%205%20sprints.pdf) y [diagrama_gantt_sigi_monolithe.xml](file:///home/jhonataningesis/Documentos/Proyectos/Inmobiliaria/SGI-Monolithe/docs/01_gestion_proyecto/diagrama_gantt_sigi_monolithe.xml)) con la realidad del desarrollo y la base de datos Supabase ya desplegada:

```mermaid
flowchart LR
    S0["Sprint 0: Fundamentos & Arquitectura\n(17/08 - 28/08)"] --> S1["Sprint 1: Seguridad, Web & CMS\n(04/09 - 18/09)"]
    S1 --> S2["Sprint 2: Lotes & Plano SVG\n(18/09 - 06/10)"]
    S2 --> S3["Sprint 3: CRM, Clientes & Ventas\n(09/10 - 28/10)"]
    S3 --> S4["Sprint 4: Financiamiento, Vouchers & Portal\n(30/10 - 25/11)"]
    S4 --> S5["Sprint 5: Asesores, Comisiones & KPIs\n(27/11 - 11/12)"]
    S5 --> Cierre["Cierre Final & Entrega Académica\n(11/12 - 16/12)"]
```

| Sprint | Fechas Oficiales | Objetivo Central y Entregables | Estado al 05/10/2026 |
|---|---|---|---|
| **Sprint 0** | **17/08/2026 – 28/08/2026** | **Fundamentos, Base de Datos y UX/UI:** Modelo entidad-relación en Supabase, scripts de migración, catálogos iniciales y wireframes Figma. | **100% COMPLETADO** |
| **Sprint 1** | **04/09/2026 – 18/09/2026** | **Seguridad, Web Pública y CMS:** Autenticación JWT administrativa, auditoría y módulo CMS: CMS público (8%), CMS administrativo (7%), CRUD del CMS (10%) y validación completa CMS (5%). | **100% Code / 36% Base** |
| **Sprint 2** | **18/09/2026 – 06/10/2026** | **Inventario Inmobiliario, Lotes y Plano SVG:** Gestión de proyectos, manzanas y los **70 lotes**. Cálculo de precio, plano interactivo SVG con filtros por estado (`Disponible`, `Separado`, `Vendido`) y buscador. | **En Cierre (Finaliza 06/10)** |
| **Sprint 3** | **09/10/2026 – 28/10/2026** | **CRM, Clientes, Ventas y Separaciones:** Captura y conversión de prospectos (leads), módulo de separaciones preventivas (**S/ 500.00** a 7 días), ventas al contado y financiadas. | **Próximo (Inicia 09/10)** |
| **Sprint 4** | **30/10/2026 – 25/11/2026** | **Financiamiento, Vouchers y Portal del Cliente:** Cronograma a **36 cuotas (TEA 0%)**, validación de vouchers con hash SHA-256, cláusula resolutoria y portal autoservicio para el comprador. | **Planificado** |
| **Sprint 5** | **27/11/2026 – 11/12/2026** | **Asesores, Comisiones y Dashboard:** Comisiones (3% contado, 2% financiado), liquidaciones, gestión de servicios TI y métricas gerenciales (KPIs). | **Planificado** |
| **Cierre** | **11/12/2026 – 16/12/2026** | **Cierre del Proyecto y Entrega Académica:** Verificación post-despliegue, retrospectiva final y consolidación del repositorio. | **Planificado** |

---

## 3. Reglas de Negocio Oficiales (No Negociables)

### A. Inventario y Lotes
1. **Universo de Lotes:** El proyecto base comprende exactamente **70 lotes**.
2. **Determinación del Precio:** El precio base por $m^2$ y precio final varían por ubicación estratégica (esquina, frente a parque, acceso vehicular y área total).
3. **Ciclo de Vida del Lote:**
   $$\text{Disponible} \longrightarrow \text{Separado} \longrightarrow \text{Vendido}$$
   *(El estado `Bloqueado` se reserva para contingencias administrativas o legales).*

### B. Proceso de Separación y Venta
1. **Monto de Separación:** **S/ 500.00** exactos.
2. **Plazo de Vigencia:** **7 días calendario** a partir del registro del pago para cancelar la cuota inicial pactada.
3. **Cláusula de No Reembolso:** Si el comprador no completa la cuota inicial en el plazo de 7 días, la separación caduca automáticamente, el lote retorna al estado `Disponible` y el monto de S/ 500.00 **no es reembolsable**.

### C. Modalidades de Pago y Financiamiento
1. **Venta al Contado:**
   - Pago íntegro del lote.
   - Entrega: Contrato de Bien Futuro, copia de lotización marcada, memoria descriptiva y minuta para Escritura Pública.
2. **Venta Financiada Directa:**
   - Cuota inicial pactada + saldo financiado en hasta **36 cuotas mensuales (3 años)**.
   - Entrega: Contrato de Bien Futuro, memoria descriptiva y Cronograma Oficial de Pagos.
3. **Causal Resolutoria por Morosidad:**
   - La acumulación de **3 cuotas mensuales consecutivas impagas** faculta a la empresa a resolver el contrato de pleno derecho, revirtiendo la propiedad del lote a la inmobiliaria.

### D. Esquema de Liquidación de Comisiones
1. **Asesores Comisionistas (Externos):**
   - Venta al Contado: **3%** sobre el valor total de venta.
   - Venta Financiada: **2%** sobre el valor total de venta.
   - **Regla de Oro:** La comisión se devenga y liquida **únicamente cuando se firma el contrato formal de compraventa con inicial cancelada**, nunca con la simple separación preventiva.
2. **Asesores en Planilla (Fijos):**
   - Sueldo base mensual + bonos por metas comerciales de volumen.

### E. Operación de Visitas al Terreno
1. **Días Autorizados:** Lunes, Miércoles, Viernes y Sábados.
2. **Horarios Fijos:** 11:00 AM y 03:00 PM.
3. **Logística:** Ningún asesor puede agendar visitas fuera de estas franjas para garantizar transporte y seguridad en campo.

### F. Portal del Cliente (Extranet)
1. **Acceso Simplificado:** Autenticación directa mediante **número de DNI** y contraseña temporal asignada en la venta.
2. **Funcionalidades:**
   - Visualización de la ficha técnica de su lote.
   - Estado de cuenta y descarga del cronograma oficial de pagos.
   - Carga directa de vouchers o transferencias bancarias (estados: `Pendiente`, `Aprobado`, `Rechazado`).

---

## 4. Resolución Definitiva de Incoherencias y Módulos Descartados

Para garantizar que el equipo no trabaje en tareas redundantes ni sea evaluado sobre alcance irreal, se establecen las siguientes resoluciones:

| Incoherencia Previa en Documentos / Gantt | Decisión Arquitectónica y Alcance Real | Justificación Técnica |
|---|---|---|
| **Módulo de Gestión Documental Masiva (Sprint 7 antiguo)** | **DESCARTADO.** Se sustituye por almacenamiento simple de comprobantes (vouchers en imagen/PDF) y contratos en Supabase Storage. | Desarrollar un ECM masivo con OCR y versionado complejo ponía en riesgo la entrega del MVP y fue desaconsejado por el evaluador. |
| **Control Biométrico y Asistencia de RRHH (Gantt XML tareas 1.8.2.9 a 1.8.2.12)** | **ELIMINADO.** El sistema es un SIGI Inmobiliario, no un software de asistencia laboral. | Scope creep severo que inflaba el cronograma en el penúltimo sprint. |
| **Motor de CAD / Procesamiento OCR de Planos** | **SIMPLIFICADO A SVG INTERACTIVO.** El plano de los 70 lotes opera sobre un gráfico SVG con polígonos mapeados a la tabla `inm_lotes`. | Garantiza carga instantánea en web y móviles sin sobreingeniería de rendering pesado. |
| **Desfase de fechas en Sprint Planning 2 (`2026-10-07`)** | **CORREGIDO AL `2026-09-07`.** | Error tipográfico en el XML original corregido para mantener continuidad con el Sprint 1. |
| **Ramas duplicadas de Cierre en Gantt** | **UNIFICADO.** Se mantiene una única fase de UAT y Hardening en el Sprint 8. | Eliminación de redundancia de gestión. |

---

## 5. Mapeo del Sistema con las Aplicaciones en el Repositorio

| Modulo del Gantt | Vistas Implementadas en `apps/backoffice` | Vistas en `apps/pagina-web` | Vistas en `apps/portal-cliente` | Tablas Principales Supabase |
|---|---|---|---|
| **Seguridad** | `src/pages/Login.tsx`, `UsersAndRoles.tsx` | `src/pages/Login.tsx` | `seg_usuarios`, `seg_roles`, `core_personas` |
| **Lotes y Planos** | `src/pages/Projects.tsx`, `LotMap.tsx` | `src/pages/portal/MiLote.tsx`, `PlanoProyecto.tsx` | `inm_proyectos`, `inm_lotes`, `inm_planos_interactivos` |
| **CRM & Leads** | `src/pages/Crm.tsx` | — | `crm_prospectos`, `crm_seguimientos` |
| **Ventas** | `src/pages/Sales.tsx` | — | `ven_reservas`, `ven_ventas`, `ven_contratos` |
| **Financiamiento** | `src/pages/Financing.tsx`, `Finance.tsx` | `src/pages/portal/Cronograma.tsx`, `Pagos.tsx` | `pag_planes_pago`, `pag_cuotas`, `pag_vouchers` |
| **Comisiones** | `src/pages/Advisors.tsx` | — | `com_asesores`, `com_comisiones` |
| **Dashboard** | `src/pages/Dashboard.tsx` | `src/pages/portal/Inicio.tsx` | `aud_eventos`, `fin_movimientos` |
