# Cierre de sesión por inactividad en el Backoffice

El Backoffice cierra la sesión al cumplirse 10 minutos desde la última interacción
del usuario. Limpia las credenciales, solicita la revocación mediante el endpoint
de logout existente y redirige a `/login?motivo=inactividad`. El login muestra
"Pasaron 10 minutos sin actividad. Inicia sesión nuevamente."

## Actividad y plazo

- Cuentan el movimiento del puntero, los clics, la escritura, el desplazamiento y los gestos táctiles.
- Los eventos sintéticos y los eventos de una pestaña oculta no prolongan el plazo.
- Las consultas automáticas y la renovación de tokens no cuentan como interacción.
- Recargar la página conserva la última actividad guardada.
- Al volver a una pestaña o reanudar el navegador, se comprueba la hora transcurrida antes de aceptar actividad nueva.
- El control también se aplica a las cuentas que deben cambiar su contraseña y a las que marcaron Recordarme.

Las pestañas que comparten la misma sesión comparten actividad y cierre. Las
sesiones independientes conservan plazos independientes. Un cambio de cuenta en
otra pestaña recarga el contexto sin borrar las credenciales de la cuenta nueva.

## Implementación

`inactivityTimer.ts` controla el plazo con marcas de tiempo, sin sumar intervalos.
`inactivitySession.ts` persiste solo un identificador aleatorio, la última actividad
y el indicador de cierre; los tokens siguen en el almacenamiento de autenticación
elegido en el login. `SessionInactivity` registra y retira los observadores de la
aplicación, incluido el desmontaje y montaje de React StrictMode.

El cliente de API comprueba el vencimiento antes de nuevas peticiones autenticadas.
Una renovación que termina después del cierre no restaura las credenciales, y se
solicita la revocación del refresh token que haya generado. La renovación tampoco
puede sobrescribir los tokens de una sesión distinta.

La redirección se inicia después de limpiar el navegador, sin esperar una respuesta
del logout. La solicitud usa `keepalive`. Si no hay conexión, el cierre local se
mantiene y se registra un aviso sin credenciales. El control de inactividad se
aplica en el Backoffice y reutiliza el cierre manual del servidor; no cambia las
políticas de expiración de JWT de los microservicios. Un navegador suspendido
realiza la comprobación cuando vuelve a ejecutar la página.

Las sesiones creadas antes de aplicar este cambio reciben un identificador y
comienzan su primer plazo de inactividad al cargar la versión actualizada.

## Instalación

Aplicar `cierre-inactividad.patch` desde la raíz del repositorio y reconstruir:

```powershell
docker compose up -d --build backoffice
```

Recargar con Ctrl + F5. Este cambio no requiere consultas en Supabase ni una
migración de datos. Las validaciones y permisos de Trabajadores se conservan.

## Validación

```bash
cd apps/backoffice
npm run test:session
npm run test:workers
npm run test:users
npm run build
```

Las pruebas usan reloj controlado para comprobar el límite exacto, interacción,
recarga, pestañas, recuperación tras suspensión, almacenamiento limitado, limpieza
de credenciales y respuestas tardías. No usan cuentas ni servicios reales.

## Referencias

- https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
- https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event
- https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
