# MFA de inicio de sesión — Guía operativa SGI MONOLITHE

## Ámbito y requisitos
- Aplicable al Backoffice y Portal Cliente. No modifica la autenticación financiera TOTP de Gerencia.
- Se exige documento y contraseña; el JWT solo se entrega después de confirmar el TOTP.
- La clave secreta auth-mfa.key debe permanecer consistente en las instancias del mismo entorno; no rotarla sin migrar los factores cifrados.
- La migración 118_mfa_login_invitaciones_autogestionadas_v1.sql debe aplicarse antes de desplegar el Auth Service que usa nuevas columnas.

## Alta autónoma
1. La persona introduce documento y contraseña.
2. Si todavía no ha vinculado un autenticador, selecciona Enviar código a mi correo.
3. El backend valida el reto asociado a esa contraseña y selecciona exclusivamente el EMAIL activo, principal y verificado registrado en PostgreSQL, nunca un correo proporcionado por el navegador.
4. El código de activación dura 24 horas; solo su hash SHA-256 se almacena en auth_mfa.estado, nunca el texto en claro.
5. El usuario introduce el código, escanea el QR, guarda el código de recuperación y verifica el TOTP de seis dígitos.
6. La sesión se emite solo después de comprobar TOTP; el código inicial se invalida al finalizar.
Se aplica un límite de 5 invitaciones por cuenta cada 24 horas, con 60 segundos entre envíos. El reto de contraseña caduca en 5 minutos, pero una invitación ya recibida sigue vigente hasta su vencimiento de 24 horas.

## Activación asistida para cuentas sin correo verificado
1. Un Administrador con sesión MFA y users.edit abre Usuarios, roles y permisos → Invitar MFA sobre otra cuenta gestionable.
2. Comprueba la identidad del titular según el procedimiento oficial, confirma el documento y registra un motivo de al menos 12 caracteres.
3. El servidor emite y registra únicamente el hash del código; aplica las mismas restricciones de frecuencia y registra auditoría sin secretos.
4. Se muestra el código una sola vez al administrador. Debe comunicarlo únicamente al titular verificado mediante canal privado autorizado.
5. El titular entra con su propia contraseña, código de activación y aplicativo TOTP. No existe acceso alternativo sin segundo factor.
Este flujo sustituye el uso habitual de scripts SQL de soporte para cuentas sin correo.

## Recuperación
- Si conserva el código de recuperación: usarlo después de introducir la contraseña y vincular un dispositivo nuevo.
- Si perdió dispositivo y código de recuperación: un Administrador verifica identidad y abre Restablecer MFA, confirma documento y motivo, y autoriza la operación en otra cuenta gestionable.
- El backend revoca factor y sesiones anteriores, incrementa version_sesiones y registra auditoría.
- Se notifica por correo si el titular tiene uno principal verificado; de lo contrario se exige entrega presencial/asistida y comunicación directa.
- El usuario vuelve al login, solicita invitación por correo verificado o recibe la invitación asistida. No se permite bypass por pérdida de dispositivo.

## Continuidad y seguridad
- Verificar el correo principal antes de activar nuevas cuentas. La ausencia de correo nunca permite omitir MFA.
- El acceso de emergencia cuando no existe ningún administrador disponible debe realizarlo el responsable de seguridad mediante el procedimiento auditado y los scripts de database/operations. No repartir credenciales de Supabase al personal.
- No compartir códigos en capturas, tickets ni mensajes públicos. Una invitación expuesta debe sustituirse por otra.
- El aviso de restablecimiento no incluye códigos. El MFA financiero utiliza claves distintas, que no deben reemplazarse.
- SMTP/Brevo debe estar realmente configurado para entregar invitaciones. La ausencia de proveedor devuelve error controlado; debe usarse activación asistida.

## Pruebas y despliegue
- CI: builds del Backoffice y Portal Cliente, Maven de Auth Service y Playwright con respuestas simuladas en ambos portales.
- Pruebas reales controladas: entrega de correo, código vigente/vencido, rechazo de TOTP erróneo, reenvío 60 s, límite 5/día, cuenta sin email, pérdida de dispositivo y recuperación administrativa.
- Comprobar la migración en la base de datos y la entrega de un correo real antes de dar por completado un despliegue; los tests no envían correo real.
- No ejecutar una operación administrativa de MFA ni borrar factores de cuentas reales como prueba.
