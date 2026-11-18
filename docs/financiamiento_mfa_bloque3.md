# SGI MONOLITHE — Bloque 3: TOTP financiero de Gerencia

**Rama:** `feature/configuracion-financiamiento`  
**Base de datos:** Supabase TEST `cjwnnroqjltoaqzpxlmh`  
**Migración:** `database/migrations/112_financiamiento_mfa_gerencia_v1.sql` (aplicada en TEST)  
**Estado:** implementación del flujo de enrolamiento, protección, recuperación y revocación en Auth Service y Backoffice. **No se habilitó publicación financiera**, no hay nuevos contratos ni cronogramas modificados.

## Prerrequisitos obligatorios para activar MFA

1. Configurar **solo en Auth Service** la variable `FINANCING_MFA_ENCRYPTION_KEY_BASE64` con 32 bytes aleatorios codificados en Base64. Guardarla en el gestor de secretos del entorno correspondiente, con acceso restringido. No introducirla en `.env` versionado, Pull Requests, migraciones, notas, capturas ni chat. No modificar el valor sin planificar una recodificación autenticada de todos los secretos activos.
2. Mantener `MAIL_HOST`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM` y TLS operativos. Un desafío que no llega bloquea el alta.
3. Cada gerente debe tener **correo principal de tipo EMAIL, activo, verificado y del dominio @monolithe.pe** en `core_personas_contactos`, mediante el procedimiento existente de comprobación de identidad/cambio de correo. No poner `verificado=true` manualmente para facilitar las pruebas.
4. El JWT debe incorporar `financing.configure`, `session_version` y `jti`, y el usuario debe mantener el rol `GERENCIA` activo. El cambio de contraseña pendiente, el usuario bloqueado o el rol revocado deniegan el factor.

Para generar la clave en PowerShell **local**, sin copiarla al chat:
```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```
El resultado se configura como secreto del servicio, no se copia en el código.

## Endpoints Auth Service

Todos requieren autenticación JWT, permiso `financing.configure` y revalidación del rol `GERENCIA` y versión de sesión en PostgreSQL. Las respuestas son `Cache-Control: no-store`.

| Método | Endpoint | Propósito |
|---|---|---|
| GET | `/api/auth/financing-mfa/status` | Estado no sensible y disponibilidad del cifrado |
| POST | `/api/auth/financing-mfa/start` | Reautenticación con contraseña actual y desafío al correo verificado |
| POST | `/api/auth/financing-mfa/enroll` | Consumo del OTP del correo, emisión **una única vez** de secreto y URI `otpauth://` |
| POST | `/api/auth/financing-mfa/confirm` | Validación del primer TOTP y activación; devuelve **10 códigos de recuperación una sola vez** |
| POST | `/api/auth/financing-mfa/authorize` | TOTP y emisión de recibo para versión, borrador validado y hash SHA-256 calculado en SQL, JWT `jti`, nonce y 120 s |
| POST | `/api/auth/financing-mfa/revoke` | Requiere contraseña de `start`, OTP de correo y TOTP; invalida el factor y todas las sesiones |
| POST | `/api/auth/financing-mfa/recover` | Requiere contraseña de `start`, OTP de correo y código de respaldo; reinicia el enrolamiento, invalida sesiones |

**El endpoint `authorize` NO publica cambios.** El Bloque 4 ya incorporó la operación SQL que recalcula el hash del borrador aprobado y compara actor, JTI, versión, hash, nonce y recibo sin usar; inserción inmutable, cambio de puntero y auditoría comparten una transacción. El interruptor SQL permanece DESHABILITADO hasta validar TOTP funcional. El recibo caduca a los 120 segundos. Los códigos de recuperación jamás autorizan publicaciones.

## Reglas implementadas

- TOTP RFC 6238: HMAC-SHA1, secreto de 160 bits aleatorios, 6 dígitos, 30 segundos, ventana de `-1, 0, +1` y `ultimo_paso_totp` monotónico bajo `SELECT FOR UPDATE` para rechazar replays.
- Secretos cifrados **AES-256-GCM** con IV de 96 bits aleatorio y AAD vinculado al ID de usuario. La clave no existe en Git; el servidor falla cerrado sin ella. Los secretos solo se muestran en el enrolamiento tras verificar contraseña y correo independiente.
- Los OTP de correo se guardan con BCrypt, duran 5 minutos y están ligados al `jti` del JWT; no se pueden reutilizar para dos enrolamientos. Máximo 5 envíos por hora, separación de al menos 60 segundos.
- Intentos de contraseña, correo y TOTP limitados a 5 antes de bloqueo de 15 minutos. Hay auditoría de intentos, bloqueos y cambios, más aviso al correo verificado **después del commit**. No se registran códigos ni secretos.
- Los 10 códigos de respaldo contienen 128 bits aleatorios cada uno y se conservan como hashes SHA-256. La operación de recuperación consume uno bajo bloqueo de fila, revoca el factor y elimina los restantes; no lo usa para autorizar una política.
- Tras revocar o recuperar se revocan refresh sessions y aumenta `version_sesiones` para invalidar JWT antiguos dentro del verificador MFA. La interfaz también borra sesión local.
- Las tablas tienen RLS y privilegios revocados para `anon`, `authenticated` y `service_role`. Solo el rol backend `sigi_app_user` puede manipular filas. El Bloque 4 incorpora una función de publicación exclusiva del backend, condicionada al interruptor de seguridad y al recibo MFA.

## Diagnóstico de activación confirmado (17/11/2026)

- Supabase TEST: **5 usuarios con rol Gerencia**, 5 con algún correo principal, **0 con correo corporativo principal @monolithe.pe**, y por tanto 0 con correo corporativo principal verificado. No se debe cambiar `verificado` manualmente.
- Railway: solo se observó entorno `production`; el servicio `auth-service` consume `main`. **No se ha modificado ni desplegado ese entorno**. La variable `FINANCING_MFA_ENCRYPTION_KEY_BASE64` no figura entre las variables del servicio de producción. Antes de realizar una prueba funcional, usar un despliegue aislado que consuma la rama y Supabase TEST; no sustituir el código de producción.
- El endpoint `GET /status` devuelve `correoCorporativoVerificado` como booleano para la cuenta autenticada y `configurado` para la clave. Backoffice muestra ambos impedimentos sin filtrar direcciones ni secretos.
- Hasta poder verificar correo real en el flujo oficial, la prueba de enrolamiento y recuperación debe permanecer **pendiente**, aunque las funciones, SQL y UI estén implementadas.

## Pruebas y activación segura

- Hay pruebas unitarias en `FinancingTotpCryptoTest.java` con vector RFC 6238, replay, AES-GCM/AAD e IV distintos.
- `apps/backoffice/tests/financiamientoMfa.test.mjs` verifica invariantes de seguridad y se ejecuta desde CI.
- Prueba funcional pendiente en entorno controlado: con cuenta Gerencia cuyo correo esté realmente verificado y Auth Service con clave y SMTP configurados, completar `start → enroll → confirm`, intentar replay, probar bloqueo, consumir recuperación y verificar que todos los JWT anteriores queden invalidados.
- Al configurar MFA en TEST, comprobar antes y después que `ven_ventas` y `pag_planes_pago` siguen intactas. **No registrar ventas reales para probar MFA**.
- Sin correo verificado, sin la clave AES-GCM o sin SMTP, el enrolamiento debe permanecer bloqueado y **no se deben alterar datos oficiales para desbloquearlo**.
- Si no se conserva ningún código de recuperación y se pierde el dispositivo, **no existe bypass automático**. Se requiere un procedimiento administrativo documentado, revisión presencial o por canal independiente y aprobación segregada; no se debe reactivar solo con contraseña ni con el correo de una cuenta comprometida.

## Límite del Bloque 3

Este bloque aporta la autenticación reforzada. El **Bloque 4** implementó el formulario, hash canónico, doble confirmación, consumo atómico de recibo, nueva versión inmutable, auditoría y avisos; consulte docs/financiamiento_publicacion_bloque4.md. La publicación sigue bloqueada: falta probar enrolamiento TOTP real y autorizar el despliegue en entorno aislado.
