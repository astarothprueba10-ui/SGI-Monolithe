# SGI-MONOLITHE — Sprint 4 — 5.3.4
## Imputaciones de pagos confirmados, abonos parciales y reversiones

**Estado:** código, migraciones, frontend y pruebas técnicas implementados
en `feature/pagosy-financiamiento-sprint-4`.
No fusionar con `main` ni desplegar las aplicaciones todavía.

### Reglas contables conservadas

- `pag_pagos.CONFIRMADO` + `pag_vouchers.APROBADO` **NO**
  reduce deuda por sí solo. Solo lo hace una
  `pag_aplicaciones_pago` activa del tipo pertinente.
- **Cuotas:** aplicaciones `CUOTA` a la misma venta,
  plan y cuota preautorizados en 5.3.2.
  Las clasificaciones PENDIENTE/PARCIAL/PAGADA/VENCIDA se
  calculan dinámicamente por la migración 79 del 5.2.5.
- **Inicial adicional:** aplicaciones `INICIAL` sin `id_cuota`
  y solo a pagos aprobados NO asociados a una cuota ni a reserva.
  Máximo: `pag_planes_pago.monto_inicial` menos aplicaciones
  INICIAL activas de pagos confirmados.
  **La reserva S/ 500 jamás se vuelve a descontar ni aplicar.**
- **Abonos parciales:** pueden registrarse varias aplicaciones
  del mismo pago, siempre que la suma activa no supere
  el dinero confirmado ni el saldo real del destino.
- **Reversión lógica:** `activo=false`, `fecha_anulacion`,
  `id_usuario_anulacion`, `motivo_anulacion`. No se borra
  el asiento ni se cambia el estado CONFIRMADO del pago.
  Requiere un revisor distinto del actor que realizó
  la aplicación; motivo mínimo 5 caracteres.
- No se modifican `pag_cuotas`, `pag_planes_pago`,
  contratos, precios históricos, tasas ni cronogramas
  para reflejar aplicaciones/reversiones.
- No se procesan vouchers de separaciones desde la
  bandeja de cuotas.
- **Se conserva la diferencia histórica de S/ 0.04**
  del plan 3 sin recalcular cuotas ni alterar contratos.

### Migraciones aplicadas a Supabase TESTEO

- `87_finanzas_aplicacion_y_reversion_confirmados_v1.sql`:
  `pag_imputaciones_operaciones_v1` (RLS habilitado);
  `sp_fin_imputaciones_v1` (bandeja + historial),
  `sp_fin_aplicar_pago_confirmado_v1` (idempotencia UUID),
  `sp_fin_revertir_aplicacion_v1` (reversión auditada).
- `88_finanzas_imputaciones_identity_auto_v1.sql`:
  respeta la columna real `GENERATED ALWAYS AS IDENTITY`
  de `pag_aplicaciones_pago.id_aplicacion_pago`.
  Se detectó y corrigió mediante una prueba reversible
  en Supabase sin cambiar datos de clientes.
- `89_fin_aplicaciones_evidencia_privada_v1.sql`:
  revalida que exista el voucher APROBADO y el objeto
  correspondiente en Storage privado, con MIME,
  ruta canónica, tamaño (1–5 MiB) y objeto no eliminado
  ni archivado. El helper es interno; el backend
  solo ejecuta los procedimientos con permisos.

**Seguridad:** doble permiso `finance.view` y `finance.edit`
para aplicar y revertir; `finance.view` para consultar.
Los permisos se comprueban en Core (JWT) y nuevamente
en PostgreSQL. No se exponen tablas de auditoría ni
las funciones de SQL al navegador. RLS activado y
EXECUTE de procedimientos limitado a `sigi_app_user`.

### API y UI

Core Service:
- `GET /api/core/crm/finanzas/imputaciones`
- `POST /api/core/crm/finanzas/imputaciones`
- `PUT /api/core/crm/finanzas/imputaciones/{idAplicacion}/reversion`

Backoffice:
- **Finanzas → Aplicación de pagos.**
- Muestra los pagos confirmados con importe y destino
  autorizado (cuota concreta o inicial adicional),
  saldo del pago y saldo restante del destino.
- Importe editable para abonos parciales, confirmación
  explícita antes de imputar y UUID por petición para
  reintentos sin duplicación.
- Historial de imputaciones, fecha, responsable, estado
  activo/revertido y motivo; formulario de reversión
  con validación de 5–255 caracteres.
- La aplicación se materializa inmediatamente en
  `pag_aplicaciones_pago`. Los saldos de 5.2.4 y
  estados calculados de 5.2.5 leen esa misma fuente.

**Limitación funcional conocida:** los nuevos vouchers
creados desde el formulario de 5.3.2 están vinculados
a una cuota y no pueden redirigirse a inicial.
La imputación a inicial funciona con pagos
previamente confirmados, aprobados y con evidencia
privada verificable cuyo origen NO esté ligado a cuota
ni separación. Para registrar *nuevos* vouchers
específicamente destinados a inicial, debe ampliarse
el formulario de origen en un subflujo posterior;
no se reclasificarán vouchers de cuota para simular
dichos pagos.

### Pruebas

- **GitHub Actions:** PostgreSQL 17 con fixtures
  sintéticas: abonos 25 + 35, no exceso de pago,
  destino de cuota fijo, idempotencia, inicial,
  reversión auditada por segunda persona,
  bloqueo de pago REGISTRADO, permisos y
  no modificación de cuotas.
- **Supabase de testeo:** pruebas SQL reversibles
  con venta 4, plan 3, cuota 73:
  - Abonos parciales 40 + 60; saldo disminuye 100.
  - Sobreaplicación bloqueada; el registrador
    no puede revertir su propio abono.
  - Reversión de 40 por segundo actor; saldo
    aumenta de nuevo en 40.
  - Pago confirmado de inicial S/ 75,
    evidencia privada verificada; sin evidencia
    se bloquea. Reversión de inicial probada.
  - Todos los registros ficticios fueron
    revertidos mediante subtransacciones.
- **Verificación posterior:** la base conserva
  6 pagos, 6 vouchers, 3 aplicaciones, 84 cuotas,
  0 operaciones de imputación Sprint 4,
  0 cargas nuevas persistidas y 2 archivos
  en bucket de ventas. Saldo de cuota 73:
  **S/ 2,111.11**, sin cambios.
- GitHub CI de la rama debe aprobar el commit
  final antes de anunciar un cierre definitivo.
- Se consultaron asesores de seguridad Supabase:
  sin hallazgos de nivel ERROR para este cambio;
  el INFO de RLS sin policies es intencionado
  en las tablas accesibles exclusivamente por
  procedimientos del backend.

### Pendiente

**5.3.5:** conciliación operativa, tratamiento
de cargos huérfanos, pruebas integrales reales
en navegador con usuarios de Finanzas,
habilitación del circuito documental de
nuevas iniciales y evaluación de producción.

No se publica rama mediante PR ni se hace merge
ni despliegue desde esta actividad.
