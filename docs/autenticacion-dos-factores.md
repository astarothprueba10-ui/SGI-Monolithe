# Autenticación en dos pasos de Monolithe

El Backoffice y el Portal Cliente usan la contraseña actual y un código TOTP de seis dígitos. La aplicación autenticadora puede generar los códigos sin conexión y el servidor los verifica localmente. La configuración admite Google Authenticator y otras aplicaciones compatibles con TOTP.

## Inicio de sesión y recuperación

En la primera conexión, Monolithe entrega al usuario un código de activación válido por 24 horas. Tras ingresar su documento y contraseña, el usuario usa ese código para ver el QR. Puede ingresar la clave manual si usa el navegador y el autenticador en el mismo teléfono. Para completar la vinculación, guarda su código de recuperación e ingresa el primer código de la aplicación.

En los siguientes ingresos, el usuario presenta su documento, contraseña y el código del autenticador. El factor pertenece a la cuenta. Si la cuenta tiene permisos para los dos portales, utiliza el mismo autenticador en ambos.

Si pierde acceso al autenticador, el usuario puede ingresar con su contraseña y elegir **Usar código de recuperación**. La opción abre la vinculación de un dispositivo nuevo. Después de validar el nuevo autenticador, se desactiva el anterior, se sustituye el código de recuperación y se cierran las sesiones previas de esa cuenta.

Si el usuario también pierde su código de recuperación, soporte debe verificar su identidad por el canal autorizado de Monolithe. Un administrador de la base de datos puede ejecutar `database/operations/restablecer_factor_mfa.sql` para esa cuenta y emitir otro código de activación. El restablecimiento de contraseña sigue siendo independiente del segundo factor.

## Despliegue y administración

1. Prepara una clave AES de 32 bytes aleatorios en Base64. Compose usa `.secret/keys/auth-mfa.key` y la monta en el servicio de autenticación en modo de solo lectura. En otros despliegues, monta el archivo privado y configura `AUTH_MFA_KEY_PATH` con su ruta.
2. Conserva una copia segura de la clave. Las instancias que usen la misma base deben leer la misma clave. Sustituirla sin volver a cifrar las semillas impide verificar los autenticadores anteriores.
3. Usa una base de pruebas antes de producción. Detén las instancias de `auth-service` que usen la base elegida y aplica una vez `database/migrations/106_auth_totp_dos_factores.sql` con el rol administrador de la base. La migración invalida los JWT y los tokens de renovación de sesiones existentes.
4. En el editor SQL, abre `database/operations/emitir_codigo_activacion_mfa.sql`. Cambia el marcador por el `usuario_login` exacto de una cuenta y ejecuta la consulta. Entrega el código resultante solo al titular verificado por un canal privado. Ejecuta la consulta por cada cuenta que deba activar el factor. Una nueva emisión reemplaza la anterior antes de la vinculación.
5. Despliega juntos `auth-service`, `backoffice` y `portal-cliente`. Usa HTTPS fuera del entorno local. Prueba con una cuenta interna y otra de cliente.

En despliegues con usuario de base de datos `sgi_backend_user`, la migración otorga acceso al esquema privado. Los operadores que utilicen un rol de backend diferente deben configurar permisos equivalentes solo para ese rol. Mantén el esquema `auth_mfa` fuera de los esquemas expuestos por la API de Supabase.

## Comportamiento del servicio

| Solicitud | Validación | Respuesta |
| --- | --- | --- |
| `POST /api/auth/login` | Contraseña, estado de cuenta y permiso del portal indicado | HTTP 202 con el paso siguiente y un reto de cinco minutos |
| `POST /api/auth/mfa/preparar` | Reto y prueba de activación o recuperación | QR, clave manual, recuperación y reto nuevo |
| `POST /api/auth/mfa/verificar` | Reto y código TOTP | JWT, token de renovación y datos de la sesión |

El servidor guarda únicamente las huellas de los retos, invitaciones y códigos de recuperación. Las semillas se cifran con AES-256-GCM. El esquema tiene permisos explícitos y RLS. Los retos se ligan a la versión de la sesión y a la contraseña que se verificó. Después de cinco fallos se bloquea la verificación de la cuenta por cinco minutos. Se acepta el paso actual de TOTP o el anterior, una sola vez. Al consumir el reto, la verificación y la creación de la sesión comparten una transacción.

Una aplicación autenticadora reduce el riesgo si se filtra una contraseña. El usuario debe introducir el código solo en el portal legítimo, porque un sitio falso puede capturar un TOTP vigente.

- [RFC 6238, algoritmo TOTP](https://www.rfc-editor.org/rfc/rfc6238)
- [NIST SP 800-63B-4, autenticadores y verificadores](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/)
- [Ayuda oficial de Google Authenticator](https://support.google.com/accounts/answer/1066447)
