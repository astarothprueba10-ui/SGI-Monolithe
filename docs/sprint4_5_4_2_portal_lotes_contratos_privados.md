# SGI-MONOLITHE — Sprint 4 / Bloque 5.4.2
## Mi lote, proyecto y contratos

### Alcance
Sustituir el prototipo estático del Portal Cliente por información
real del expediente de cada comprador. El desarrollo se mantiene en
`feature/pagosy-financiamiento-sprint-4`; **sin PR, merge ni despliegue**.
Las pruebas funcionales manuales y end-to-end de Backoffice + Portal
quedan para el final del Sprint 4.

### Backend y Supabase

**Migración:** `96_portal_cliente_lotes_contratos_privados_v1.sql`.

**Función:** `sp_portal_cliente_lotes_contratos_v1(p_actor bigint)`.

**Endpoint:** `GET /api/core/portal-cliente/lotes-contratos`.
Exige JWT de Core Service, `ROLE_CLIENTE` mediante
`@PreAuthorize` y `Cache-Control: no-store`. El actor procede
exclusivamente del sujeto del JWT validado por Spring.
El endpoint **no recibe IDs de comprador, cliente, venta, lote ni contrato**.

La función SQL valida nuevamente:
- Usuario con rol CLIENTE vigente y activo
- Estado de usuario que permita acceso
- Persona activa y usuario no bloqueado
- Asociación de `seg_usuarios.id_persona` con `crm_clientes`
  activos, luego `ven_ventas_clientes` y `ven_ventas`

Una venta puede aparecer una sola vez por identidad, aun si existen
varias relaciones de compra, y se conserva `esTitular` del expediente.
El resultado admite varias compras, una o ninguna.

**Campos exclusivos del expediente:**
- Venta: código, estado comercial, precio pactado, participación
- Proyecto: nombre, distrito, provincia, departamento, país,
  área general, inicio y fin **estimado**; dirección/referencia solo
  cuando estén registrados
- Lote: manzana, etapa, código y número, área oficial, cuatro
  medidas si existen, estado y tipo registrado
- Contratos: código y número, tipo, estado, fechas de emisión,
  firma y vigencia

Los archivos/anexos contractuales se cuentan únicamente si poseen
`vigente=true`, `visible_cliente=true` y
`fecha_publicacion_cliente IS NOT NULL`. No se devuelven
`clave_archivo`, URL, hash, notas internas ni archivos aún ocultos.
La **descarga autenticada de documentos** se integrará en 5.4.5;
ningún enlace público se genera en 5.4.2.

Seguridad SQL: `SECURITY DEFINER` con `search_path` fijado y
`EXECUTE` revocado a `PUBLIC`, `anon`, `authenticated`,
permitido solamente al backend `sigi_app_user`.
No se habilitan políticas RLS basadas en `user_metadata`.

### Portal Cliente

- `Mi lote` muestra ficha comercial, ficha inmobiliaria,
  proyecto, estimaciones y estado de todos los contratos.
- Si hay varias compras del mismo cliente, permite elegir entre
  **sus** operaciones; no realiza consultas por IDs externos.
- Los contratos sin fecha de firma no aparecen como firmados.
- La inexistencia de un archivo publicado se informa claramente,
  sin enlaces inoperativos ni exposición de evidencia interna.
- No se reutiliza el `PlanoProyecto.tsx` ficticio (manzana D,
  etapa II, lotes artificiales) ni hitos de avance de obra
  precargados. El visor de plano oficial y la lectura privada se
  atenderán al disponer de una fuente/documentación certificada.
- Si no hay compras vinculadas devuelve estado vacío real; si el
  JWT caduca se redirige a login, y ante fallo del backend no se
  muestran datos de ejemplo.

### Auditoría de Supabase — 11/11/2026
- Migración 96 aplicada a Supabase de testeo.
- Cuenta CLIENTE autorizada obtuvo venta 2, proyecto
  **Residencial Campestre Los Cocos**, Picsi/Chiclayo/Lambayeque,
  lote MZ-A-L01 de 450 m², precio contractual S/108,000 y
  contrato `CON-FIN-2026-0001` VIGENTE firmado.
- La misma operación tiene **0** documentos y **0** anexos
  contractuales publicados actualmente. No corresponde mostrar
  un botón de descarga antes de habilitar documentos autorizados.
- Una cuenta CLIENTE sin ventas obtuvo lista `[]`.
- Un usuario sin rol CLIENTE fue rechazado.
- Permisos de ejecución de la función: anon=false,
  authenticated=false, sigi_app_user=true.
- La base no se alteró: consulta solo lectura; no se
  modificaron estados, lotes, contratos ni objetos de Storage.

### Pruebas automatizadas
- Suite PostgreSQL 17 usa fixtures **100% sintéticas** para
  crear actores cliente distintos, compras separadas, contrato
  firmado, documentos publicados y ocultos. Prueba ventas ajenas,
  actor interno, relación de coparticipante y reversión de
  inserciones de prueba, además de la migración 95.
- Pruebas Java de PortalClienteService validan JWT, ausencia de
  consultas SQL por IDs externos y acceso rechazado.
- Compilación TypeScript/React del Portal Cliente.
- Integración funcional completa, documentos y plano certificado:
  pospuestos para actividades 5.4.5–5.4.6 y aceptación final.

### Pendientes del bloque 5.4
**5.4.3:** Cronograma, estados, saldos y alertas de cuotas reales.
**5.4.4:** Registro de vouchers propios y seguimiento.
**5.4.5:** Descarga privada documental y notificaciones reales.
**5.4.6:** Integración y preparación de prueba final de Sprint 4.
