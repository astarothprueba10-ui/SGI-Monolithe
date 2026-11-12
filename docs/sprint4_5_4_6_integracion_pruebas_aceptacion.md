# Sprint 4 · 5.4.6 — Integración y pruebas finales del Portal Cliente

**Proyecto:** SGI MONOLITHE  
**Rama:** `feature/pagosy-financiamiento-sprint-4`  
**Alcance:** integración de 5.4.1–5.4.5; no equivale a publicación en producción.  
**Fecha de evaluación:** 2026-11-12 (America/Lima).

## 1. Criterios de aceptación y evidencia

| ID | Recorrido | Evidencia automática | Estado |
|---|---|---|---|
| AC-01 | Cuenta CLIENTE -> resumen de compras propias | SQL 95 + consulta real de testeo + Java JWT | APROBADO |
| AC-02 | Una compra coincide en resumen, lote, contrato, cronograma y vouchers | `database/tests/portal_integracion_end_to_end_546_pg_test.sql` | APROBADO |
| AC-03 | Cliente A no consulta la venta, cuota o contrato del cliente B | fixtures actores 9 y 10, SQL 95–99 | APROBADO |
| AC-04 | Preparación de voucher ligada a una cuota propia | SQL 98 y test integral | APROBADO |
| AC-05 | Archivo ausente o inexistente en Storage no puede registrarse | SQL 98 + Storage sintético | APROBADO |
| AC-06 | Registro crea pago REGISTRADO y voucher PENDIENTE sin descuento | SQL 98 + saldo motor 76 | APROBADO |
| AC-07 | Reintento del mismo ID de carga no duplica pago | SQL 98 + test integral | APROBADO |
| AC-08 | Comprador distinto no finaliza la carga del propietario | SQL 98 + test integral | APROBADO |
| AC-09 | Finanzas no imputa voucher sin aprobación | SQL 87 + test integral | APROBADO |
| AC-10 | Revisor financiero independiente aprueba; saldo permanece intacto | SQL 86 + test integral | APROBADO |
| AC-11 | Finanzas imputa pago confirmado: saldo y cronograma cambian exactamente lo aplicado | SQL 87, 97 y test integral | APROBADO |
| AC-12 | Repetir aplicación con misma solicitud es idempotente | SQL 87 + test integral | APROBADO |
| AC-13 | Rechazo motivado de voucher no modifica saldo y aparece en alertas | SQL 86, 99 + test integral | APROBADO |
| AC-14 | Inicial adicional se registra y aplica en el circuito de Finanzas si existe saldo | SQL 92–93 + test condicional | APROBADO CONDICIONAL |
| AC-15 | Documento PDF publicado y existente es visible solo al propietario | SQL 99, fixture aislado | APROBADO |
| AC-16 | Ocultar documento revoca autorización de generar NUEVOS enlaces | SQL 99 + test integral | APROBADO |
| AC-17 | Endpoints usan JWT, ROLE_CLIENTE, no-store y URLs firmadas de duración limitada | `PortalClienteControllerSeguridadTest.java` y tests 5.4.5 | APROBADO |
| AC-18 | Aplicación Portal compila bajo reglas TypeScript estrictas ES2020 | `tsc --noEmit` en GitHub Actions | APROBADO |
| AC-19 | Docker/Vite resuelve Core Service a través de proxy same-origin | `portalIntegrationWiring.test.mjs` + revisión de Docker Compose | APROBADO EN CÓDIGO |
| AC-20 | Carga REAL desde navegador -> Supabase Storage -> revisión -> imputación | Sin credenciales de prueba segregadas ni navegador integrado ejecutado | **PENDIENTE DE QA MANUAL** |
| AC-21 | Descarga REAL de PDF publicado -> URL firmada 120 s -> visualización | Sin documentos publicados en base de testeo | **PENDIENTE DE QA MANUAL** |
| AC-22 | Sesión real autenticada y navegación en Vercel/Oracle con CORS y variables públicas | No se desplegó (decisión explícita) | **PENDIENTE DE QA PRE-DESPLIEGUE** |

> El test integrado SQL simula solo los metadatos del objeto de Storage, no efectúa una subida HTTP ni firma real. Sus escrituras se revierten mediante una subtransacción. Nunca se debe tratar esa prueba como un recorrido real por navegador.

## 2. Cambios realizados en 5.4.6

- `database/tests/portal_integracion_end_to_end_546_pg_test.sql`: recorrido integral, dos compradores, aprobación independiente, imputación, rechazo, alertas, documentos, idempotencia y rollback.
- `.github/workflows/ci.yml`: ejecutar el test integral bajo PostgreSQL 17 y `npx --no-install tsc --noEmit -p tsconfig.json` para Portal Cliente. Vite build por sí solo no ejecuta comprobación de tipos.
- `services/core-service/src/test/java/monolithe/core_service/controller/PortalClienteControllerSeguridadTest.java`: rol CLAIM `authorities`, cobertura de nueve endpoints protegidos, actor del JWT, rechazo de identidad inválida y cabeceras `no-store`.
- `apps/portal-cliente/src/pages/portal/Cronograma.tsx` y `MiLote.tsx`: compatibilidad TS ES2020 y prevención de referencias a objeto nulo.
- `apps/portal-cliente/vite.config.ts`, `apps/portal-cliente/src/lib/portalCoreApi.ts`, `docker-compose.yml`: `VITE_CORE_API_URL=/api/core`, proxy `/api/core -> http://core-service:8083`, dependencia Docker correcta. Ya no se recurre automáticamente a `http://localhost:8083` desde el navegador.
- `apps/portal-cliente/tests/portalIntegrationWiring.test.mjs`: prueba de rutas reales, separación de demo-data, proxy Docker y referencias de seguridad sin secretos.

## 3. Diagnóstico de datos de testeo (solo lectura)

Consulta Supabase de **2026-11-12**: la cuenta CLIENTE autorizada de testeo tiene **1 compra**, **1 lote**, **1 cronograma de 36 cuotas**, **1 movimiento confirmado**, **0 vouchers de este flujo**, **0 documentos publicados** y **0 alertas activas**. Los dos buckets de documentos firmados y vouchers de venta están configurados como **privados**.

Las respuestas de los módulos 95–99 no incluyen claves de Storage ni URL de lectura firmada en sus LISTADOS. El estado del portal deriva de aplicaciones financieras confirmadas. No se publicaron contratos o archivos ficticios en la base de testeo y no se efectuaron operaciones de pago de prueba persistentes.

**Seguridad:** no usar usuario ni clave de cliente real para pruebas automatizadas. Las funciones de acceso privado de las migraciones 95–99 requieren el rol de base de datos de la aplicación y verifican al actor; los clientes no obtienen ese rol de DB en el navegador. El backend sigue validando JWT y ROLE_CLIENTE.

## 4. Manual de aceptación: pruebas todavía necesarias

**Entorno:** staging aislado o testeo controlado; usuarios sintéticos comprador A y comprador B, operador de Finanzas distinto de ambos; dos compras y cuotas disponibles; un PDF contractual de prueba que el área responsable publique explícitamente.

1. Configurar `VITE_AUTH_API_URL`, `VITE_CORE_API_URL` (URL HTTPS pública en producción/staging), `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en el cliente. En local con Docker, Core usa proxy `/api/core`. Validar CORS para los orígenes explícitos y los endpoints firmados del servidor. **No colocar `SUPABASE_SECRET_KEY` en Vite**.
2. Iniciar sesión como comprador A. Validar Inicio, Mi lote, Cronograma, Pagos, Documentos y Alertas. No debe verse ninguna operación de B.
3. Subir un archivo PDF/JPG/PNG/WebP válido (máximo 5 MiB) desde Pagos, confirmar físicamente la carga y verificar que aparezca `PENDIENTE` sin reducir saldo.
4. Revisar desde Finanzas con operador distinto; aprobar. Verificar el estado `APROBADO`, todavía sin reducir saldos hasta realizar la aplicación del pago.
5. Imputar desde Finanzas. Actualizar cronograma y comprobar el descenso exacto del saldo de la cuota; comprobar voucher con `montoAplicado` correcto.
6. Presentar un segundo voucher y rechazarlo con motivo. Comprobar estado `RECHAZADO`, detalle y alerta sin imputación.
7. Publicar un PDF documental sintético para comprador A desde el proceso autorizado. Confirmar que aparece en Documentos y que Ver/Descargar funcionan. Comprobar que comprador B no puede obtener ese archivo por ID.
8. Retirar publicación; comprobar que no pueden solicitarse nuevos enlaces. Tener en cuenta que una URL ya firmada dura hasta su vencimiento y **no se revoca inmediatamente** al ocultar.
9. Repetir con sesión expirada y usuario sin rol; deben responder 401/403. Validar ausencia de rutas privadas, secretos y documentos ocultos en el navegador.
10. Registrar resultados con fecha, dispositivo/navegador, HTTP status, capturas sin datos personales, expediente sintético, revisor y aprobación responsable. Solo después considerar listo para despliegue.

## 5. Resultado de cierre

- **Desarrollo e integración automatizada de 5.4.1–5.4.6:** terminados; todos los cambios de esta etapa en la rama Sprint 4, no fusionados ni desplegados.
- **Aprobación funcional end-to-end en navegador, HTTP Storage y lectura PDF real:** **pendiente**; no se ha certificado para producción.
- **Pendientes ajenos al alcance de 5.4:** pantallas Mi asesor, Soporte y Mi perfil aún tienen `PortalFeaturePending`. Completar el bloque de pagos no significa que todo el Portal Cliente esté listo para comercializar.
- **Puerta de salida a producción:** CI verde de la rama + pruebas manuales AC-20–22 + revisión de variables/CORS + aprobación del responsable. Sin cumplir esto, **NO hacer merge ni despliegue**.
