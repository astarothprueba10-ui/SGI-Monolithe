# SGI-MONOLITHE — Sprint 4 / 5.4.5
## Portal Cliente — Documentos contractuales publicados y alertas privadas

### Alcance
Se sustituyó el módulo de documentos ficticios por consultas reales de su propio expediente, y se activó el panel de alertas en Inicio. También se corrigió `App.tsx`: las rutas `/portal/pagos` y `/portal/documentos` dejaron de apuntar a `PortalFeaturePending`.

**Rama:** `feature/pagosy-financiamiento-sprint-4`. Sin PR, merge a `main` ni despliegue.

### Migración de testeo
`database/migrations/99_portal_documentos_alertas_privadas_v1.sql`, aplicada en Supabase de testeo.

- `fn_portal_documentos_publicados_v1(actor)` (solo backend): reutiliza `sp_portal_cliente_resumen_v1` para validar rol CLIENTE vigente, actor, persona y ventas propias. Filtra documentos y anexos con `vigente=true`, `visible_cliente=true`, `fecha_publicacion_cliente IS NOT NULL`, contrato firmado y clave de archivo con ruta válida. Exige bucket privado `contratos-firmados-private`, PDF, tamaño entre 1 y 10 MiB y objeto presente en `storage.objects`, con MIME/tamaño coincidentes. Soporta contratos, planos de lote y memorias descriptivas, si están registrados y publicados. No crea planos ni certificados.
- `sp_portal_cliente_documentos_v1(actor)`: lista exclusivamente metadatos no secretos. No devuelve claves, hashes, URLs ni documentos ocultos; puede devolver `items=[]`.
- `sp_portal_cliente_autorizar_documento_v1(actor,tipo,id)`: vuelve a comprobar todas las condiciones anteriores para una solicitud individual. Solo entrega al **backend** el bucket y la clave, necesarios para firmar una URL temporal. Un ID de otro comprador, archivo oculto o inexistente se rechaza con `PORTAL_DOCUMENTO_NO_AUTORIZADO`.
- `sp_portal_cliente_alertas_v1(actor)`: consulta `sp_portal_cliente_cronograma_v1`, `sp_portal_cliente_vouchers_v1` y los documentos publicados. Emite alertas vivas de **cuotas vencidas o próximas a vencer en 7 días**, **vouchers pendientes o rechazados** y **documentos publicados en los últimos siete días**. No consulta avisos de RR. HH., no usa `src/data/portal`, no envía correos/SMS, no duplica pagos y no almacena notificaciones nuevas.
- `SECURITY DEFINER` con `search_path` fijo, autorización propia, EXECUTE revocado a PUBLIC/anon/authenticated y otorgado a `sigi_app_user` para las cuatro funciones.

### Core Service
Endpoints bajo `/api/core/portal-cliente` con `@PreAuthorize("hasAuthority('ROLE_CLIENTE')")`, JWT validado, actor derivado exclusivamente del subject, respuestas `Cache-Control: no-store`:
- `GET /documentos`: listado sin rutas ni archivos privados.
- `GET /documentos/{tipo}/{idDocumento}/url-firmada`: autorización SQL renovada y firma privada por `PortalDocumentoStorageService`, URL de **120 segundos**; nunca se expone `SUPABASE_SECRET_KEY`.
- `GET /alertas`: mensajes calculados desde datos del expediente.

El servicio valida la identidad de la ruta, el bucket, patrón de clave por contrato/anexo, MIME PDF y la respuesta exacta del API de Storage. No acepta claves, buckets ni enlaces enviados por el navegador.

### Portal Cliente
- `Documentos.tsx`: consulta real de documentos; filtros por compra y tipo, estados de carga/error/vacío, botones **Ver** y **Descargar** disponibles únicamente para documentos autorizados.
- `AlertasPanel.tsx`: consulta real; presenta criticidad y enlaces locales permitidos, no alertas generadas por arrays fijos. Se integra en `Inicio.tsx`.
- `App.tsx`: incorpora las páginas reales de Pagos y Documentos.
- `MiLote.tsx`: referencia a consulta documental real, sin prometer archivos no publicados.

### Verificaciones
**Supabase de testeo:** actualmente 0 documentos/anexos publicados, 0 alertas del actor CLIENTE probado. Cuenta sin operaciones: listas vacías. Cuenta interna no autorizada: denegada. Archivo inexistente/no publicado: rechazado. No se publicaron ni insertaron documentos reales de prueba.

**CI PostgreSQL 17:** fixture sintético `database/tests/fixtures/portal_documentos_alertas_v1_pg_fixture.sql` y test `database/tests/portal_documentos_alertas_v1_pg_test.sql` prueban documentos publicados y ocultos, anexo del lote, identidad del comprador, denegación a comprador ajeno, revocación ante objeto ausente, avisos reales, roles SQL, ausencia de fugas de Storage. Los archivos sintéticos solo existen en PostgreSQL efímero de CI. Java verifica actor JWT y que no se firmen documentos ausentes.

### Fuera de alcance
- Publicar documentación oficial real: corresponde al área autorizada de MONOLITHE; no se modifica por este bloque.
- Prueba funcional manual de descarga real en navegador, renovación de enlace y flujo completo entre Backoffice, Storage y Portal Cliente: **5.4.6**.
- No se crean notificaciones externas, emails, SMS ni un cron automático.
- No se habilitan descargas de planos ficticios, contratos no publicados o PDFs con metadatos incompatibles.

### Seguridad pendiente de seguimiento general
Las advertencias globales preexistentes del asesor Supabase (`function_search_path_mutable` y algunos ejecutables SECURITY DEFINER) deben gestionarse independientemente. Las nuevas funciones 99 mantienen search_path fijo y revocación explícita.
