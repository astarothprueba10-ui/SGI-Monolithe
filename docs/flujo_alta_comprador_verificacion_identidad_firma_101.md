# SGI MONOLITHE — Flujo de verificación documental y alta de comprador (migración 101)

## Regla de negocio aprobada

1. El asesor registra el lead y avanza el prospecto por las etapas comerciales.
2. En Ventas, durante la revisión de datos del comprador, el operador **coteja su documento** y marca **Verificar identidad del comprador**. La casilla no está preseleccionada y vuelve a desmarcarse si cambian nombres, apellidos o documento.
3. Al **confirmar la venta pendiente**, `sp_crm_registrar_venta_pendiente_v14` exige `datosComprador.identidadVerificada === true` (booleano real), valida el documento principal activo y único, comprueba que no pertenezca a otra persona, lo actualiza a `core_personas_documentos.verificado = true` **dentro de la misma transacción**, y registra la acción auditada `VERIFICAR_IDENTIDAD_COMPRADOR` sin incluir el número documental en el evento.
4. La venta y el contrato quedan **pendientes de firma**. El comprador **NO** está todavía habilitado para crear usuario CLIENTE, aunque el documento esté verificado.
5. Gerencia revisa la evidencia contractual y aprueba la firma mediante el flujo vigente. Se registra `ven_contratos_aprobaciones.firma_revisada = true`, la fecha de firma y el contrato `VIGENTE`. El cliente queda convertido a comprador, según la lógica comercial existente.
6. `fn_seguridad_cliente_contrato_aprobado_v1(persona)` exige: CRM activo, titularidad de venta, venta `CONTRATADA/CONFIRMADA/COMPLETADA`, contrato `VIGENTE/FINALIZADO`, fecha de firma, fila de aprobación y `firma_revisada = true`. Este resultado se usa en `sp_listar_personas_sin_usuario`, `sp_crear_usuario_seguridad`, `sp_activar_usuario_seguridad` y `sp_asignar_rol_usuario`.
7. La persona estará habilitada en Nuevo usuario **solo si** además cuenta con documento principal único, activo, vigente, formalmente verificado y conforme a formatos; correo principal activo y válido; relación CRM activa, permisos del operador y ausencia de cuenta preexistente. Se le asigna el rol CLIENTE, login = documento, y credenciales temporales tras activación.

## Seguridad y alcance

- El checkbox es una declaración **expresa de cotejo documental del asesor**; no se marca automáticamente por revisar la ficha o firmar el contrato. No sustituye revisar realmente la evidencia del documento.
- El frontend NO puede cambiar el documento mediante un acceso directo; el SQL SECURITY DEFINER existente exige `sales.create` y cartera autorizada, y la actualización es transaccional y auditada.
- El servidor Core también rechaza solicitudes de venta que omitan la confirmación.
- No se crean cuentas ni se marcan como verificados documentos de expedientes existentes por esta migración. No modifica permisos de usuarios existentes ni su inicio de sesión.
- La confirmación de la firma **no crea la cuenta**; solo la habilita para alta administrativa posterior.
- Las cuentas existentes o expedientes históricos sin registro de aprobación formal deben revisarse por un proceso aparte; no falsificar la firma o la identidad para superar la validación.
- El procedimiento nuevo solo es ejecutable desde el rol del backend; `anon` y `authenticated` no pueden llamar la función de elegibilidad directamente.
- No abrir PR, fusionar a main ni desplegar sin autorización.

## Pruebas funcionales en localhost (con venta de TEST)

1. Crear un prospecto ficticio elegible y abrir **Ventas → Nueva operación → Venta**.
2. Completar el formulario contractual, **sin** marcar Verificar identidad. Confirmar que bloquea **Guardar datos verificados**.
3. Marcar la casilla tras comprobar el documento. Cambiar el número documental y confirmar que se desmarca. Volver a cotejar y marcar.
4. Guardar y confirmar el registro de la venta. En Supabase TEST, verificar `core_personas_documentos.verificado = true`, el registro en `crm_ventas_datos_comprador` y la auditoría.
5. Antes de la firma, abrir **Usuarios y roles → Nuevo usuario** y verificar que el comprador **NO** es elegible: contrato pendiente.
6. Usar el usuario de Gerencia para aprobar la firma del contrato con evidencia contractual válida.
7. Volver a Nuevo usuario: la persona debe figurar como elegible si sus otros datos y requisitos son válidos. Crear/activar la cuenta CLIENTE y confirmar que aparece en Usuarios, sin duplicados.
8. Iniciar sesión en Portal Cliente y comprobar que solo ve sus propias compras.
9. Probar denegación de venta sin `identidadVerificada` usando llamada validada al backend (400); el SQL también rechaza un valor distinto de `true`.
10. Conservar evidencias del control de permisos, del estado previo a la firma y del registro de firma aprobado.

## Datos históricos detectados en Supabase TEST

Al auditar los compradores existentes, se encontró que hay contratos marcados `VIGENTE` y con fecha de firma sin evidencia completa de aprobación `ven_contratos_aprobaciones`; algunas cuentas ya existían con reglas antiguas. La migración 101 no reinterpreta ni corrige esa historia. Es necesario un flujo de **regularización documental histórica** para probar altas con compradores anteriores a este cambio.

## CI

Compilación de Core/Auth, build y typecheck de Backoffice/Portal, prueba Java de omisión de identidad y linter de migraciones. SQL de migración 101 aplicado en Supabase TEST. Las pruebas reales de interfaz local con un nuevo comprador son responsabilidad de QA funcional.
