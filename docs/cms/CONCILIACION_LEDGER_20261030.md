# SGI-Monolithe — Conciliación del historial de migraciones Supabase / CMS

**Fuente:** archivo CSV de consulta de solo lectura sobre `supabase_migrations.schema_migrations`, proporcionado por el usuario el 30/10/2026.
**Estado:** evidencia para revisión del PR. **No implica aprobación ni ejecución de migraciones.**

## Hallazgos verificados

- La consulta devolvió **53 versiones**, todas con un nombre no vacío.
- Identificadores registrados desde `20261022062708` hasta `20261029030837`.
- **25** nombres comienzan por `rrhh_`, **14** por `crm_` y **14** por `seguridad_`.
- **Ningún nombre comienza por `cms_`** ni contiene referencias explícitas a visibilidad, publicación web, Marketing o Storage.
- El directorio Git `database/migrations` contiene archivos con prefijos numéricos `01`–`31` y dos archivos históricos `30`. No hay correspondencia directa documentada entre esos prefijos y las 53 versiones de fecha/hora.

**Interpretación acotada:** el historial no aporta evidencia de que las migraciones CMS estén registradas mediante sus nombres. No demuestra que NO se hayan aplicado: las consultas previas a Supabase confirmaron múltiples objetos CMS ya existentes que pudieron crearse desde SQL Editor u otro procedimiento sin relación explícita con estas 53 filas.

## Estado de integración CMS observado en diagnósticos anteriores

| Elemento | Estado observado | Acción pendiente |
|---|---|---|
| Tablas de borradores, publicación, visibilidad y multimedia principales | Presentes en Supabase | Reconciliar DDL con fuentes versionadas; **no reejecutar** las migraciones antiguas |
| `cms_visibilidad_historial` | Ausente | Revisar y ensayar el correctivo 41 sobre QA representativo; luego aprobación del DBA |
| Rol PostgreSQL `sigi_cms_user` | Ausente | Aprovisionamiento por DBA y canal seguro antes de ensayar 40–42 sobre esquema real |
| Políticas `cms_backend_*` | No detectadas | Aprobar permisos 40 y extensiones 41–42 y verificar efectos de RLS |
| Storage CMS | Buckets privado y público existentes | Verificar políticas de objetos y operaciones reales, no solo SQL de catálogos |
| Migraciones 32–39 propuestas | Aún no homologadas | Reconstruir DDL incompleto y mapear lo ya aplicado; no instalar por el número |
| QA local PostgreSQL 17 para 40 y 41 | Aprobado con fixture reducido | No reemplaza ensayo sobre esquema real ni QA JWT/Storage |

## Decisión para registro / despliegue

1. Mantener intactas las migraciones 01–31 del equipo; no renombrar los dos `30` ya versionados.
2. Mantener los SQL 32–42 como **candidatos** hasta completar revisión de dependencias y DDL. Aun cuando se apruebe una migración correctiva, registrar explícitamente su ejecución real y su revisión; no insertar filas ficticias en `schema_migrations`.
3. Solicitar al DBA una instancia QA representativa, con estructura y políticas reales pero sin datos personales, y la creación segura del rol técnico en esa instancia.
4. Ensayar de forma ordenada identidad/grants/RLS (40), historial de visibilidad (41), multimedia (42); comprobar `ddl-auto=validate`, auditoría append-only, proyectos sin fila ocultos, JWT y Storage. Repetir posteriormente el preflight y postflight sobre el entorno de destino autorizado.
5. No activar flags CMS ni fusionar el PR hasta superar estas verificaciones y clasificar los ocho fallos generales del Backoffice.

## Registro de las 53 versiones (para trazabilidad)

| Versión | Nombre registrado |
|---|---|
| `20261029030837` | `crm_visitas_periodo_v6` |
| `20261029025138` | `crm_asesores_periodo_v6` |
| `20261028043235` | `crm_bloque7_autorizar_lectura_pdf_v6` |
| `20261027203858` | `crm_bloque7_aprobar_firma_y_conversion_v6` |
| `20261027193544` | `crm_bloque7_listar_contratos_pendientes_v6` |
| `20261027175820` | `crm_bloque7_autorizar_carga_pdf_contrato_v6` |
| `20261027171824` | `crm_bloque7_registrar_evidencia_contrato_v6` |
| `20261027062128` | `crm_bloque7_cancelacion_segura_pendientes_v6` |
| `20261027054544` | `crm_bloque7_validacion_snapshot_concurrencia_v6` |
| `20261027054429` | `crm_bloque7_registro_venta_pendiente_v6` |
| `20261027053611` | `crm_bloque7_bloquear_separaciones_legacy_directas` |
| `20261027053425` | `crm_bloque7_bloquear_formalizacion_legacy_directa` |
| `20261027050332` | `crm_sprint3_bloque7_verificacion_comprador_v6` |
| `20261027045953` | `crm_sprint3_bloque7_validacion_formalizacion_v6` |
| `20261023220824` | `rrhh_historial_laboral_consulta_20261023` |
| `20261023220756` | `rrhh_metricas_verificables_20261023` |
| `20261023201853` | `rrhh_consulta_segura_reincorporaciones_20261023` |
| `20261023185934` | `seguridad_desactivacion_manual_cuenta_ya_inactiva_20261023` |
| `20261023185818` | `rrhh_resolver_reincorporacion_validar_decision_nula_20261023` |
| `20261023185750` | `rrhh_resolver_reincorporacion_solo_administrador_20261023` |
| `20261023185704` | `rrhh_solicitar_reincorporacion_notificar_admin_20261023` |
| `20261023185621` | `rrhh_cese_con_notificacion_administrativa_20261023` |
| `20261023185249` | `rrhh_suspensiones_programadas_procedimientos_20261023` |
| `20261023185134` | `rrhh_habilitar_pg_cron_suspensiones_20261023` |
| `20261023184708` | `rrhh_resguardar_ceses_hasta_flujo_notificacion_20261023` |
| `20261023184520` | `rrhh_sincronizacion_unidireccional_estados_usuarios_20261023` |
| `20261023184423` | `seguridad_preservar_origen_desactivacion_manual_20261023` |
| `20261023184349` | `rrhh_proteger_gerencia_y_estados_controlados_20261023` |
| `20261023183832` | `rrhh_control_estados_laborales_base_20261023` |
| `20261023090325` | `rrhh_detalle_listado_fechas_ubicaciones_20261023` |
| `20261023090222` | `rrhh_guardado_parcial_preservar_campos_20261023` |
| `20261023071622` | `rrhh_ampliar_listado_correcciones_pendientes_20261023` |
| `20261023040637` | `seguridad_recuperacion_correo_inicial_no_verificado_318` |
| `20261023015824` | `seguridad_resolver_login_documento_trabajador_no_verificado` |
| `20261023012623` | `seguridad_contar_usuarios_activos_por_rol_y_desactivacion` |
| `20261022222321` | `seguridad_rrhh_sin_permisos_gestion_usuarios` |
| `20261022214646` | `seguridad_correo_inicial_sin_verificacion_y_bloqueo_asociacion_directa` |
| `20261022210545` | `seguridad_catalogo_roles_incluir_cliente_automatico` |
| `20261022210524` | `seguridad_preservar_rol_cliente_por_vinculacion` |
| `20261022210328` | `seguridad_activar_usuario_documento_segun_vinculacion` |
| `20261022210225` | `seguridad_asignar_rol_por_vinculacion_real` |
| `20261022210140` | `seguridad_usuarios_cliente_rol_obligatorio_al_crear` |
| `20261022205830` | `seguridad_personas_disponibles_relaciones_multiples` |
| `20261022195901` | `seguridad_usuarios_trabajadores_documento_inicial` |
| `20261022064813` | `rrhh_actualizar_login_tras_documento_aprobado` |
| `20261022064728` | `rrhh_corregir_resolucion_documental_existente` |
| `20261022064553` | `rrhh_aceptar_edicion_solo_personal` |
| `20261022063224` | `rrhh_guardia_evidencia_aprobacion` |
| `20261022063037` | `rrhh_procedimiento_nueva_solicitud_documental` |
| `20261022063007` | `rrhh_solicitudes_documento_tipo_y_estado_previo` |
| `20261022062901` | `rrhh_verificacion_correo_por_token` |
| `20261022062812` | `rrhh_integrar_actualizacion_personal_y_laboral` |
| `20261022062708` | `rrhh_procedimiento_edicion_datos_personales` |

**Nota:** los nombres anteriores proceden exclusivamente del CSV; no se recuperaron sentencias de migraciones ni se consultaron datos de negocio.
