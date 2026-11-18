# SGI MONOLITHE — Bloque 4: publicación versionada y auditada

Rama: feature/configuracion-financiamiento
Base de datos: Supabase TEST cjwnnroqjltoaqzpxlmh
Estado: implementado en rama; publicación bloqueada hasta verificar operativamente TOTP del Bloque 3.

## Arquitectura

Migración 113: crea cfg_fin_publicacion_control, deshabilitado por defecto. Solo un administrador puede abrir el control tras pruebas y aprobación documentada. Implementa validación de 12 campos, normalización de importes, modalidades MINIMA/RANGO/FIJA, TNA, cuotas, moneda PEN, sistema FRANCES y justificación. Calcula SHA-256 sobre versión vigente y JSONB canónico, y ofrece vista previa de la versión siguiente.

Migraciones 114 y **116**: operación transaccional sp_fin_publicar_politica_v1 con rol Gerencia, permiso financiero, sesión JWT vigente, correo principal registrado, activo y verificado, TOTP activo, control habilitado, versión actual bloqueada y recibo vinculado a usuario/JTI/versión/hash/nonce, no consumido y de máximo 120 segundos. Consume recibo, inserta versión inmutable, cambia el puntero y registra auditoría dentro de la MISMA transacción. Cualquier fallo revierte todo.

Migración 115: actualiza la consulta protegida para reflejar el valor real del interruptor.

Auth Service: FinancingPolicyPublicationService y FinancingPolicyController implementan previsualización y publicación sin aceptar actor externo ni hash aportado por frontend. FinancingTotpService vuelve a calcular el hash en SQL antes de emitir una autorización. El aviso por correo se intenta solo después del commit.

Backoffice: PublicarPoliticaFinancieraPanel permite preparar una nueva versión, revisar los cambios, confirmar explícitamente con una casilla, escribir PUBLICAR Vn y aportar un TOTP. Mientras el control SQL permanezca apagado, permite previsualizar pero no solicitar el TOTP ni publicar.

## Endpoints JWT con permiso financing.configure

- POST /api/auth/financing-policies/preview: versionEsperada, borrador; devuelve versión siguiente, condiciones, hash canónico y estado del guard.
- POST /api/auth/financing-mfa/authorize: versionEsperada, borrador, codigo TOTP, nonce UUID; genera autorización de uso único.
- POST /api/auth/financing-policies/publish: versionEsperada, borrador, autorizacionId, nonce y confirmacionExplicita=true; publica y devuelve id/version/eventoAuditoria.

Los endpoints y procedimientos revalidan permisos. La Data API para anon y authenticated no tiene EXECUTE de publicación. El backend no tiene UPDATE sobre el control de habilitación. Las respuestas tienen no-store.

## Seguridad y preservación contractual

El puntero vigente se bloquea FOR UPDATE y se comprueba la versión esperada. El recibo TOTP se bloquea y consume una sola vez después de comprobar el hash del mismo borrador canónico, la sesión/JTI, el actor y el nonce. El evento de auditoría incluye las condiciones anteriores y nuevas, versiones, razón y autorización. Si falla la auditoría, se revierte la publicación.

Las migraciones del Bloque 4 no actualizan ven_reservas, ven_ventas ni pag_planes_pago. Los snapshots pactados en el Bloque 2 preservan las condiciones de operaciones históricas. Nunca se editan ni eliminan versiones financieras publicadas; una corrección requiere una nueva versión.

## Pruebas ejecutadas y pendientes

En Supabase TEST se ejecutaron las migraciones 113-115, se validó la vista previa sobre la política v1 y se verificó un rechazo PUBLICACION_BLOQUEADA ante intento de publicación con guard cerrado. La verificación SQL database/verification/financiamiento_bloque4_readonly.sql comprobó guard, permisos, hash, versión, y conservación del número de ventas y planes. La política vigente continúa en v1.

Antes de habilitar el control faltan: completar el enrolamiento real de Gerencia en un entorno aislado con correo principal registrado y verificado (personal o corporativo), clave de cifrado y SMTP; aprobar CI completo; probar publicación v2, replay, actor distinto, nonce/hash manipulado, versión obsoleta, concurrencia y rollback de auditoría en fixture aislado sin operaciones reales; verificar un nuevo snapshot de venta/reserva y un contrato de prueba fuera de datos de clientes existentes; aprobación de Seguridad y Gerencia con evidencia. El cambio de habilitación corresponde únicamente a un administrador de BD mediante procedimiento auditado.

No modificar main, no crear PR, no desplegar producción mientras no exista aceptación formal.
