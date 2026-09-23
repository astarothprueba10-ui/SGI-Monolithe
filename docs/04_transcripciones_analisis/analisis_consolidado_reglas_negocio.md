# Análisis Consolidado y Reglas de Negocio — SIGI MONOLITHE

## 1. Detección y Resolución de Duplicados
Durante el análisis de hashes SHA-256 y comparación de texto se identificó:
- **`Documento_Maestro_SIGI_MONOLITHE_Requerimientos_Scrum.pdf`**: Se encontraba duplicado en la raíz y dentro de la carpeta descargada de OneDrive con contenido textual 100% idéntico (31,715 caracteres).
- Se conservó una copia oficial en `02_Requerimientos_y_Especificaciones/` junto con su versión editable `.docx`.
- Las carpetas descargadas originales de OneDrive se trasladaron a `_backup_descargas_onedrive/` para evitar redundancia en el espacio de trabajo.

---

## 2. Reglas de Negocio Clave (Extraídas de las Transcripciones)

### A. Inventario y Lotes
1. **Total de Lotes**: Proyecto base de **70 lotes**.
2. **Factores de Precio**: El valor por m² y precio final depende de la ubicación estratégica (esquina, frente a parque, cerca a estacionamiento, área total).
3. **Estados del Lote**: `Disponible`, `Separado` (bloqueo preventivo), `Vendido`, `Bloqueado`.

### B. Proceso Comercial y Visitas al Terreno
1. **Agenda de Visitas**: Restringidas por optimización de movilidad/combustible a:
   - **Días**: Lunes, Miércoles, Viernes y Sábados.
   - **Horarios**: 11:00 AM y 03:00 PM.
2. **Asignación**: Coordinadas con un encargado logístico de visitas.

### C. Esquema de Asesores y Comisiones
1. **Asesores en Planilla / Fijos**: Sueldo mínimo + bono por cumplimiento de metas. Modalidad Full-Time o Part-Time. Pago: Mensual.
2. **Asesores Comisionistas (Externos)**: Sin sueldo fijo ni horario obligatorio. Pago: Semanal.
   - **Venta al Contado**: **3%** sobre el valor total del lote.
   - **Venta Financiada (con inicial)**: **2%** sobre el valor total del lote.
   - **Condición de Liquidación**: La comisión se desembolsa **únicamente cuando el cliente firma el contrato formal**, no al momento de la simple separación.

### D. Reserva / Separación de Lote
1. **Monto de Separación**: **S/ 500.00**.
2. **Plazo de Validez**: **1 semana (7 días calendario)** para completar el pago de la cuota inicial.
3. **Penalidad / No Reembolso**: Si vence el plazo sin completar la inicial, el lote vuelve a estar `Disponible` y el monto de separación **no es reembolsable**.

### E. Modalidades de Pago y Financiamiento
1. **Venta al Contado**:
   - Entrega: Contrato de Bien Futuro, copia de lotización con lote marcado, memoria descriptiva y **Escritura Pública** para posesión/uso inmediato.
2. **Venta Financiada**:
   - Plazo de financiamiento de hasta **3 años (36 meses)** con tasa de interés pactada.
   - Entrega inicial: Contrato de Bien Futuro, lote marcado, memoria descriptiva y **Cronograma Oficial de Pagos**.
3. **Cláusula Resolutoria por Incumplimiento**:
   - El impago de **3 cuotas consecutivas (3 meses seguidos)** faculta la resolución de contrato con pérdida del lote y de los aportes realizados.

### F. Portal / Vista del Cliente Comprador
- Acceso web para el cliente final donde puede:
  - Consultar datos de su lote y estado actual.
  - Visualizar el cronograma de pagos y fechas de vencimiento.
  - Subir comprobantes / vouchers de pago para su posterior validación por el área de tesorería/administración.

---

## 3. Acuerdos de Alcance y Metodología (Reunión del Equipo)
- **Priorización recomendada por el docente**: Enfocarse en los flujos críticos (Autenticación, Gestión de Lotes/Plano base, CRM/Ventas, Financiamiento/Cronograma de Pagos).
- **Prototipado UI**: El equipo diseñará primero las pantallas clave en **Figma** (Login, Dashboard, Catálogo de Lotes, Formulario de Venta/Separación) antes de iniciar la codificación visual.
- **Plano Interactivo**: Se acordó implementar una solución estructurada basada en coordenadas/SVG interactivo sobre grilla para visualizar y cambiar dinámicamente los estados de los 70 lotes.
